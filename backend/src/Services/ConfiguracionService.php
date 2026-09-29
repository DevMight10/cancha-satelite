<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Transaction;
use App\Exceptions\ConflictException;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;
use App\Helpers\Archivo;
use App\Helpers\Fecha;
use App\Helpers\Telefono;
use App\Repositories\CanchaRepository;
use App\Repositories\ConfiguracionRepository;
use App\Repositories\ReservaRepository;
use App\Validators\Validator;
use PDOException;

/**
 * Configuración de la cancha: datos del negocio, reglas, medios de pago,
 * horario de apertura, tarifas y días bloqueados.
 */
final class ConfiguracionService
{
    /** Claves editables desde el panel y su regla de validación. */
    private const CLAVES = [
        'negocio_nombre', 'negocio_direccion', 'negocio_whatsapp', 'negocio_email',
        'reserva_dias_anticipacion', 'reserva_minutos_pago', 'reserva_horas_cancelacion',
        'pago_qr_titular', 'pago_tigo_numero', 'pago_tigo_titular',
        'pago_banco_nombre', 'pago_banco_cuenta', 'pago_banco_titular', 'notificar_email',
    ];

    public const DURACIONES = [30, 45, 60, 90, 120];

    public function __construct(
        private readonly ConfiguracionRepository $config = new ConfiguracionRepository(),
        private readonly CanchaRepository $canchas = new CanchaRepository(),
        private readonly ReservaRepository $reservas = new ReservaRepository(),
    ) {
    }

    public function todo(): array
    {
        $cancha = $this->canchas->principal();
        $valores = $this->config->todas();

        return [
            'valores' => array_intersect_key($valores, array_flip(self::CLAVES)),
            'tiene_qr' => ($valores['pago_qr_imagen'] ?? '') !== '',
            'duracion_turno' => $cancha['duracion_turno'],
            'duraciones' => self::DURACIONES,
            'horarios' => $this->canchas->horarios($cancha['id']),
            'tarifas' => $this->canchas->tarifas($cancha['id'], false),
            'bloqueos' => $this->canchas->bloqueosDesde($cancha['id'], Fecha::hoy()),
        ];
    }

    /** Guarda datos del negocio, reglas y medios de pago (solo las claves enviadas). */
    public function guardarGeneral(array $datos): array
    {
        $datos = array_map(static fn (mixed $v): string => is_bool($v) ? ($v ? '1' : '0') : trim((string) $v),
            array_intersect_key($datos, array_flip(self::CLAVES)));

        Validator::make($datos)
            ->texto('negocio_nombre', 100, 3, 'El nombre')
            ->texto('negocio_direccion', 150, 3, 'La dirección')
            ->telefono('negocio_whatsapp')
            ->email('negocio_email')
            ->entero('reserva_dias_anticipacion', 1, 60, 'Los días de anticipación')
            ->entero('reserva_minutos_pago', 5, 1440, 'Los minutos para pagar')
            ->entero('reserva_horas_cancelacion', 0, 72, 'Las horas para cancelar')
            ->texto('pago_qr_titular', 100, 1, 'El titular')
            ->telefono('pago_tigo_numero')
            ->texto('pago_tigo_titular', 100, 1, 'El titular')
            ->texto('pago_banco_nombre', 80, 2, 'El banco')
            ->texto('pago_banco_cuenta', 40, 4, 'La cuenta')
            ->texto('pago_banco_titular', 100, 1, 'El titular')
            ->enLista('notificar_email', ['0', '1'])
            ->validar();

        if (array_key_exists('negocio_nombre', $datos) && $datos['negocio_nombre'] === '') {
            throw ValidationException::campo('negocio_nombre', 'El nombre es obligatorio');
        }
        foreach (['negocio_whatsapp', 'pago_tigo_numero'] as $tel) {
            if (!empty($datos[$tel])) {
                $datos[$tel] = Telefono::normalizar($datos[$tel]);
            }
        }
        if (!empty($datos['negocio_email'])) {
            $datos['negocio_email'] = mb_strtolower($datos['negocio_email']);
        }

        $this->config->guardar($datos);
        return $this->todo();
    }

    /**
     * Horario de apertura de los 7 días y duración del turno.
     * @param array $horarios [{dia_semana, hora_apertura, hora_cierre, cerrado}]
     */
    public function guardarHorarios(array $horarios, mixed $duracion): array
    {
        if (!in_array((int) $duracion, self::DURACIONES, true)) {
            throw ValidationException::campo('duracion_turno', 'Elige una duración de turno válida');
        }
        $porDia = [];
        foreach ($horarios as $h) {
            $dia = (int) ($h['dia_semana'] ?? 0);
            if ($dia < 1 || $dia > 7) {
                continue;
            }
            $cerrado = filter_var($h['cerrado'] ?? false, FILTER_VALIDATE_BOOLEAN);
            $apertura = (string) ($h['hora_apertura'] ?? '');
            $cierre = (string) ($h['hora_cierre'] ?? '');
            if (!Fecha::esHora($apertura) || !Fecha::esHora($cierre)) {
                throw ValidationException::campo("dia_{$dia}", 'Revisa las horas de ' . Fecha::DIAS[$dia]);
            }
            if (!$cerrado && Fecha::aMinutos($cierre) - Fecha::aMinutos($apertura) < (int) $duracion) {
                throw ValidationException::campo("dia_{$dia}", 'El ' . Fecha::DIAS[$dia] . ' debe abrir al menos un turno completo');
            }
            $porDia[$dia] = [Fecha::hora($apertura), Fecha::hora($cierre), $cerrado];
        }
        if (count($porDia) !== 7) {
            throw ValidationException::campo('horarios', 'Envía el horario de los 7 días');
        }

        $cancha = $this->canchas->principal();
        Transaction::run(function () use ($cancha, $porDia, $duracion): void {
            foreach ($porDia as $dia => [$apertura, $cierre, $cerrado]) {
                $this->canchas->guardarHorario($cancha['id'], $dia, $apertura, $cierre, $cerrado);
            }
            $this->canchas->actualizarDuracionTurno($cancha['id'], (int) $duracion);
        });
        return $this->todo();
    }

    public function crearTarifa(array $datos): array
    {
        $cancha = $this->canchas->principal();
        $this->canchas->crearTarifa($cancha['id'], $this->validarTarifa($datos));
        return $this->todo();
    }

    public function actualizarTarifa(int $id, array $datos): array
    {
        $this->canchas->buscarTarifa($id) ?? throw new NotFoundException('La tarifa no existe');
        $this->canchas->actualizarTarifa($id, $this->validarTarifa($datos));
        return $this->todo();
    }

    public function eliminarTarifa(int $id): array
    {
        $this->canchas->buscarTarifa($id) ?? throw new NotFoundException('La tarifa no existe');
        $this->canchas->eliminarTarifa($id);
        return $this->todo();
    }

    /** Bloquea un día; devuelve cuántas reservas activas hay ese día para que la administración las gestione. */
    public function bloquearDia(array $datos): array
    {
        Validator::make($datos)
            ->requerido('fecha', 'La fecha')->fecha('fecha')
            ->requerido('motivo', 'El motivo')->texto('motivo', 150, 3, 'El motivo')
            ->validar();
        if ($datos['fecha'] < Fecha::hoy()) {
            throw ValidationException::campo('fecha', 'No se puede bloquear un día pasado');
        }

        $cancha = $this->canchas->principal();
        try {
            $this->canchas->crearBloqueo($cancha['id'], $datos['fecha'], trim($datos['motivo']));
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? null) === 1062) {
                throw new ConflictException('Ese día ya está bloqueado');
            }
            throw $e;
        }

        return $this->todo() + [
            'reservas_afectadas' => count($this->reservas->activasEnFecha($cancha['id'], $datos['fecha'])),
        ];
    }

    public function desbloquearDia(int $id): array
    {
        if ($this->canchas->eliminarBloqueo($id) === 0) {
            throw new NotFoundException('Ese bloqueo no existe');
        }
        return $this->todo();
    }

    /** Reemplaza la imagen del QR de pago. */
    public function subirQr(?array $archivo): array
    {
        $nombre = Archivo::guardar($archivo, 'config', 'qr', Archivo::IMAGENES, 3);
        $anterior = $this->config->obtener('pago_qr_imagen');
        $this->config->guardar(['pago_qr_imagen' => $nombre]);
        if ($anterior !== '' && $anterior !== $nombre) {
            Archivo::eliminar('config', $anterior);
        }
        return $this->todo();
    }

    public function eliminarQr(): array
    {
        $anterior = $this->config->obtener('pago_qr_imagen');
        $this->config->guardar(['pago_qr_imagen' => '']);
        if ($anterior !== '') {
            Archivo::eliminar('config', $anterior);
        }
        return $this->todo();
    }

    private function validarTarifa(array $d): array
    {
        $dias = array_values(array_unique(array_map('intval', is_array($d['dias'] ?? null) ? $d['dias'] : [])));
        $d['activa'] = filter_var($d['activa'] ?? true, FILTER_VALIDATE_BOOLEAN);

        Validator::make($d)
            ->requerido('nombre', 'El nombre')->texto('nombre', 60, 2, 'El nombre')
            ->requerido('hora_desde', 'La hora desde')->hora('hora_desde')
            ->requerido('hora_hasta', 'La hora hasta')->hora('hora_hasta')
            ->requerido('precio', 'El precio')->decimal('precio', 1, 10000, 'El precio')
            ->validar();

        if ($dias === [] || array_diff($dias, range(1, 7)) !== []) {
            throw ValidationException::campo('dias', 'Elige al menos un día');
        }
        if (Fecha::hora($d['hora_hasta']) <= Fecha::hora($d['hora_desde'])) {
            throw ValidationException::campo('hora_hasta', 'La hora "hasta" debe ser mayor que la hora "desde"');
        }
        sort($dias);

        return [
            'nombre' => trim($d['nombre']),
            'dias' => $dias,
            'hora_desde' => Fecha::hora($d['hora_desde']),
            'hora_hasta' => Fecha::hora($d['hora_hasta']),
            'precio' => number_format((float) $d['precio'], 2, '.', ''),
            'activa' => $d['activa'],
        ];
    }
}
