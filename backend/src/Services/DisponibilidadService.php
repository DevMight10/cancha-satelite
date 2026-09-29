<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ValidationException;
use App\Helpers\Fecha;
use App\Repositories\CanchaRepository;
use App\Repositories\ConfiguracionRepository;
use App\Repositories\ReservaRepository;
use App\Validators\Validator;

/**
 * Calcula los turnos de un día: horario de apertura, precio según tarifas,
 * días bloqueados y turnos ya reservados.
 */
final class DisponibilidadService
{
    public function __construct(
        private readonly CanchaRepository $canchas = new CanchaRepository(),
        private readonly ReservaRepository $reservas = new ReservaRepository(),
        private readonly ConfiguracionRepository $config = new ConfiguracionRepository(),
    ) {
    }

    /**
     * Turnos de una fecha. Estados: libre | ocupado | pasado.
     * Para el público, la fecha debe estar entre hoy y el máximo de anticipación.
     */
    public function turnosDelDia(string $fecha, bool $paraAdmin = false): array
    {
        Validator::make(['fecha' => $fecha])->requerido('fecha', 'La fecha')->fecha('fecha')->validar();
        if (!$paraAdmin) {
            $this->validarRango($fecha);
        }

        $this->reservas->expirarVencidas();
        $cancha = $this->canchas->principal();

        $respuesta = [
            'fecha' => $fecha,
            'dia_semana' => Fecha::diaSemana($fecha),
            'duracion' => $cancha['duracion_turno'],
            'abierto' => true,
            'motivo' => null,
            'turnos' => [],
        ];

        $bloqueo = $this->canchas->bloqueoDelDia($cancha['id'], $fecha);
        if ($bloqueo !== null) {
            return ['abierto' => false, 'motivo' => $bloqueo['motivo']] + $respuesta;
        }

        $turnos = $this->generarTurnos($cancha, $fecha);
        if ($turnos === null) {
            return ['abierto' => false, 'motivo' => 'La cancha no atiende este día'] + $respuesta;
        }

        $ocupadas = $this->reservas->activasEnFecha($cancha['id'], $fecha);
        $ahora = Fecha::ahora();

        foreach ($turnos as &$turno) {
            $turno['estado'] = match (true) {
                $this->seSolapa($turno, $ocupadas) => 'ocupado',
                "{$fecha} {$turno['hora_inicio']}" <= $ahora => 'pasado',
                default => 'libre',
            };
        }
        unset($turno);

        $respuesta['turnos'] = $turnos;
        return $respuesta;
    }

    /** Resumen de los próximos días para el selector de fecha: abierto y cantidad de turnos libres. */
    public function resumenDias(): array
    {
        $dias = $this->config->diasAnticipacion();
        $hoy = Fecha::hoy();
        $resumen = [];
        for ($i = 0; $i <= $dias; $i++) {
            $fecha = Fecha::sumarDias($hoy, $i);
            $dia = $this->turnosDelDia($fecha);
            $resumen[] = [
                'fecha' => $fecha,
                'abierto' => $dia['abierto'],
                'libres' => count(array_filter($dia['turnos'], static fn (array $t): bool => $t['estado'] === 'libre')),
            ];
        }
        return $resumen;
    }

    /**
     * Datos de un turno que se quiere reservar (hora de fin y precio), o null si
     * esa hora no es un turno válido del día.
     */
    public function turnoValido(string $fecha, string $horaInicio): ?array
    {
        $cancha = $this->canchas->principal();
        if ($this->canchas->bloqueoDelDia($cancha['id'], $fecha) !== null) {
            return null;
        }
        foreach ($this->generarTurnos($cancha, $fecha) ?? [] as $turno) {
            if ($turno['hora_inicio'] === Fecha::hora($horaInicio)) {
                return $turno + ['cancha_id' => $cancha['id']];
            }
        }
        return null;
    }

    public function seSolapa(array $turno, array $reservas): bool
    {
        foreach ($reservas as $r) {
            if ($r['hora_inicio'] < $turno['hora_fin'] && $r['hora_fin'] > $turno['hora_inicio']) {
                return true;
            }
        }
        return false;
    }

    /** La fecha debe estar entre hoy y hoy + días de anticipación. */
    public function validarRango(string $fecha): void
    {
        $hoy = Fecha::hoy();
        $max = Fecha::sumarDias($hoy, $this->config->diasAnticipacion());
        if ($fecha < $hoy) {
            throw ValidationException::campo('fecha', 'No se puede reservar en una fecha pasada');
        }
        if ($fecha > $max) {
            throw ValidationException::campo('fecha', "Solo se puede reservar con hasta {$this->config->diasAnticipacion()} días de anticipación");
        }
    }

    /**
     * Turnos del horario de apertura con su precio. null si ese día no se atiende.
     * Un turno sin tarifa que lo cubra no se ofrece.
     */
    private function generarTurnos(array $cancha, string $fecha): ?array
    {
        $dia = Fecha::diaSemana($fecha);
        $horario = $this->canchas->horarioDelDia($cancha['id'], $dia);
        if ($horario === null || $horario['cerrado']) {
            return null;
        }

        $tarifas = $this->canchas->tarifas($cancha['id']);
        $duracion = (int) $cancha['duracion_turno'];
        $inicio = Fecha::aMinutos($horario['hora_apertura']);
        $cierre = Fecha::aMinutos($horario['hora_cierre']);

        $turnos = [];
        for ($m = $inicio; $m + $duracion <= $cierre; $m += $duracion) {
            $horaInicio = Fecha::deMinutos($m);
            $precio = self::precio($tarifas, $dia, $horaInicio);
            if ($precio !== null) {
                $turnos[] = ['hora_inicio' => $horaInicio, 'hora_fin' => Fecha::deMinutos($m + $duracion), 'precio' => $precio];
            }
        }
        return $turnos;
    }

    /** Tarifa más alta que cubre el día y la hora de inicio del turno. */
    public static function precio(array $tarifas, int $dia, string $horaInicio): ?string
    {
        $mejor = null;
        foreach ($tarifas as $t) {
            if (in_array($dia, $t['dias'], true) && $t['hora_desde'] <= $horaInicio && $horaInicio < $t['hora_hasta']) {
                if ($mejor === null || (float) $t['precio'] > (float) $mejor) {
                    $mejor = $t['precio'];
                }
            }
        }
        return $mejor;
    }
}
