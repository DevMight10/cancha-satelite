<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Database;
use App\Config\Transaction;
use App\Exceptions\ConflictException;
use App\Exceptions\NotFoundException;
use App\Exceptions\ValidationException;
use App\Helpers\Fecha;
use App\Helpers\Telefono;
use App\Repositories\ConfiguracionRepository;
use App\Repositories\PagoRepository;
use App\Repositories\ReservaRepository;
use App\Validators\Validator;
use PDOException;

/**
 * Reglas de negocio de las reservas.
 * Regla principal: nunca dos reservas activas en el mismo horario.
 */
final class ReservaService
{
    public function __construct(
        private readonly ReservaRepository $reservas = new ReservaRepository(),
        private readonly PagoRepository $pagos = new PagoRepository(),
        private readonly DisponibilidadService $disponibilidad = new DisponibilidadService(),
        private readonly ConfiguracionRepository $config = new ConfiguracionRepository(),
        private readonly NotificacionService $notificaciones = new NotificacionService(),
    ) {
    }

    /** Reserva hecha por un cliente desde la web: queda pendiente de pago con plazo. */
    public function crearParaCliente(array $usuario, array $datos): array
    {
        Validator::make($datos)
            ->requerido('fecha', 'La fecha')->fecha('fecha')
            ->requerido('hora_inicio', 'La hora')->hora('hora_inicio')
            ->validar();

        $this->disponibilidad->validarRango($datos['fecha']);

        $id = $this->crear([
            'fecha' => $datos['fecha'],
            'hora_inicio' => $datos['hora_inicio'],
            'usuario_id' => $usuario['id'],
            'cliente_nombre' => $usuario['nombre'],
            'cliente_telefono' => $usuario['telefono'],
            'cliente_email' => $usuario['email'],
            'estado' => 'pendiente_pago',
            'origen' => 'web',
            'expira_en' => Fecha::sumarMinutos(Fecha::ahora(), $this->config->minutosParaPagar()),
            'creado_por' => null,
        ]);

        $reserva = $this->reservas->buscarPorId($id);
        $this->notificaciones->reservaCreada($reserva);
        return $reserva;
    }

    /**
     * Reserva presencial registrada por la administración (cliente sin cuenta).
     * Si ya pagó en efectivo queda confirmada; si no, pendiente y sin vencimiento.
     */
    public function crearPresencial(array $admin, array $datos): array
    {
        Validator::make($datos)
            ->requerido('fecha', 'La fecha')->fecha('fecha')
            ->requerido('hora_inicio', 'La hora')->hora('hora_inicio')
            ->requerido('cliente_nombre', 'El nombre del cliente')->texto('cliente_nombre', 100, 3, 'El nombre')
            ->requerido('cliente_telefono', 'El celular')->telefono('cliente_telefono')
            ->validar();

        if ($datos['fecha'] < Fecha::hoy()) {
            throw ValidationException::campo('fecha', 'No se puede reservar en una fecha pasada');
        }

        $pagado = filter_var($datos['pagado'] ?? false, FILTER_VALIDATE_BOOLEAN);

        return Transaction::run(function () use ($admin, $datos, $pagado): array {
            $id = $this->crear([
                'fecha' => $datos['fecha'],
                'hora_inicio' => $datos['hora_inicio'],
                'usuario_id' => null,
                'cliente_nombre' => trim($datos['cliente_nombre']),
                'cliente_telefono' => Telefono::normalizar($datos['cliente_telefono']),
                'cliente_email' => null,
                'estado' => $pagado ? 'confirmada' : 'pendiente_pago',
                'origen' => 'presencial',
                'expira_en' => null,
                'creado_por' => $admin['id'],
            ]);

            $reserva = $this->reservas->buscarPorId($id);
            if ($pagado) {
                $this->pagos->registrarEfectivo($id, $reserva['precio'], $admin['id']);
            }
            return $reserva;
        });
    }

    /**
     * Crea la reserva dentro de una transacción:
     * 1) valida que la hora sea un turno real del día y toma su precio,
     * 2) bloquea las reservas del día (SELECT ... FOR UPDATE) y verifica que no se solape,
     * 3) inserta. El índice único de la BD es la última barrera ante dos pedidos simultáneos.
     */
    private function crear(array $datos): int
    {
        $this->reservas->expirarVencidas();

        $turno = $this->disponibilidad->turnoValido($datos['fecha'], $datos['hora_inicio']);
        if ($turno === null) {
            throw ValidationException::campo('hora_inicio', 'Ese horario no está disponible para reservar ese día');
        }
        // En la web solo se reservan turnos que no empezaron; en la cancha se puede
        // registrar el turno en curso (alguien que llega unos minutos tarde)
        $limite = $datos['origen'] === 'presencial' ? $turno['hora_fin'] : $turno['hora_inicio'];
        if ($datos['fecha'] === Fecha::hoy() && $limite <= date('H:i:s')) {
            throw new ConflictException('Ese horario ya pasó. Elige uno más tarde.');
        }

        $guardar = function () use ($datos, $turno): int {
            $delDia = $this->reservas->activasEnFecha($turno['cancha_id'], $datos['fecha'], true);
            if ($this->disponibilidad->seSolapa($turno, $delDia)) {
                throw new ConflictException('Ese horario acaba de ser reservado por otra persona. Elige otro.');
            }

            return $this->reservas->crear([
                'cancha_id' => $turno['cancha_id'],
                'hora_inicio' => $turno['hora_inicio'],
                'hora_fin' => $turno['hora_fin'],
                'precio' => $turno['precio'],
            ] + $datos);
        };

        try {
            $db = Database::connection();
            return $db->inTransaction() ? $guardar() : Transaction::run($guardar);
        } catch (PDOException $e) {
            if (($e->errorInfo[1] ?? null) === 1062) {
                throw new ConflictException('Ese horario acaba de ser reservado por otra persona. Elige otro.');
            }
            throw $e;
        }
    }

    public function misReservas(int $usuarioId): array
    {
        $this->reservas->expirarVencidas();
        return array_map(fn (array $r): array => $this->conPermisos($r), $this->reservas->delUsuario($usuarioId));
    }

    /** Detalle de una reserva del cliente, con sus pagos y los datos para pagar. */
    public function detalleParaCliente(array $usuario, int $id): array
    {
        $this->reservas->expirarVencidas();
        $reserva = $this->reservaDelUsuario($usuario, $id);

        return $this->conPermisos($reserva) + [
            'pagos' => $this->pagos->deReserva($id),
            'datos_pago' => $this->datosDePago(),
            'ahora' => Fecha::ahora(),
        ];
    }

    /** El cliente cancela su reserva, respetando la anticipación mínima. */
    public function cancelarPorCliente(array $usuario, int $id, ?string $motivo): array
    {
        return Transaction::run(function () use ($usuario, $id, $motivo): array {
            $reserva = $this->reservaDelUsuario($usuario, $id, true);
            $permisos = $this->conPermisos($reserva);
            if (!$permisos['puede_cancelar']) {
                throw new ConflictException($permisos['motivo_no_cancelar'] ?? 'Esta reserva ya no se puede cancelar');
            }
            $this->reservas->cancelar($id, 'cliente', $motivo !== null && trim($motivo) !== '' ? mb_substr(trim($motivo), 0, 255) : null);
            $actualizada = $this->reservas->buscarPorId($id);
            $this->notificaciones->reservaCancelada($actualizada);
            return $this->conPermisos($actualizada);
        });
    }

    /** La administración puede cancelar cualquier reserva activa, con motivo. */
    public function cancelarPorAdmin(int $id, string $motivo): array
    {
        Validator::make(['motivo' => $motivo])->requerido('motivo', 'El motivo')->texto('motivo', 255, 3, 'El motivo')->validar();

        return Transaction::run(function () use ($id, $motivo): array {
            $reserva = $this->reservas->buscarPorId($id, true) ?? throw new NotFoundException('La reserva no existe');
            if (in_array($reserva['estado'], ['cancelada', 'expirada'], true)) {
                throw new ConflictException('Esta reserva ya no está activa');
            }
            $this->reservas->cancelar($id, 'admin', trim($motivo));
            $actualizada = $this->reservas->buscarPorId($id);
            $this->notificaciones->reservaCancelada($actualizada);
            return $actualizada;
        });
    }

    /** Agrega si el cliente puede pagar o cancelar, y por qué no. */
    public function conPermisos(array $r): array
    {
        $inicio = "{$r['fecha']} {$r['hora_inicio']}";
        $ahora = Fecha::ahora();
        $horas = $this->config->horasMinimasCancelacion();
        $limiteCancelacion = date('Y-m-d H:i:s', strtotime($inicio) - $horas * 3600);

        $activa = in_array($r['estado'], ['pendiente_pago', 'en_revision', 'confirmada'], true);
        $motivo = null;
        if (!$activa) {
            $motivo = 'La reserva ya no está activa';
        } elseif ($inicio <= $ahora) {
            $motivo = 'El horario ya empezó o ya pasó';
        } elseif ($ahora > $limiteCancelacion) {
            $motivo = "Solo se puede cancelar hasta {$horas} h antes del partido. Comunícate con la cancha.";
        }

        return $r + [
            'puede_pagar' => $r['estado'] === 'pendiente_pago' && $inicio > $ahora,
            'puede_cancelar' => $motivo === null,
            'motivo_no_cancelar' => $motivo,
            'cancelable_hasta' => $limiteCancelacion,
        ];
    }

    /** Medios de pago configurados por la administración (solo los que tienen datos). */
    public function datosDePago(): array
    {
        $c = $this->config;
        return [
            'qr' => $c->obtener('pago_qr_imagen') !== '' ? ['titular' => $c->obtener('pago_qr_titular')] : null,
            'tigo_money' => $c->obtener('pago_tigo_numero') !== ''
                ? ['numero' => $c->obtener('pago_tigo_numero'), 'titular' => $c->obtener('pago_tigo_titular')] : null,
            'transferencia' => $c->obtener('pago_banco_cuenta') !== ''
                ? ['banco' => $c->obtener('pago_banco_nombre'), 'cuenta' => $c->obtener('pago_banco_cuenta'), 'titular' => $c->obtener('pago_banco_titular')] : null,
            'whatsapp' => $c->obtener('negocio_whatsapp'),
        ];
    }

    private function reservaDelUsuario(array $usuario, int $id, bool $bloquear = false): array
    {
        $reserva = $this->reservas->buscarPorId($id, $bloquear);
        if ($reserva === null) {
            throw new NotFoundException('La reserva no existe');
        }
        if ($reserva['usuario_id'] !== $usuario['id']) {
            // Se responde igual que si no existiera: no se revela información de otros clientes
            throw new NotFoundException('La reserva no existe');
        }
        return $reserva;
    }
}
