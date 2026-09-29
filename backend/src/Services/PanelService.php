<?php

declare(strict_types=1);

namespace App\Services;

use App\Helpers\Fecha;
use App\Repositories\CanchaRepository;
use App\Repositories\PagoRepository;
use App\Repositories\ReservaRepository;
use App\Validators\Validator;

/**
 * Panel del administrador: agenda del día con cada cliente y ocupación de la semana.
 */
final class PanelService
{
    public function __construct(
        private readonly DisponibilidadService $disponibilidad = new DisponibilidadService(),
        private readonly ReservaRepository $reservas = new ReservaRepository(),
        private readonly PagoRepository $pagos = new PagoRepository(),
        private readonly CanchaRepository $canchas = new CanchaRepository(),
    ) {
    }

    public function panel(string $fecha): array
    {
        Validator::make(['fecha' => $fecha])->requerido('fecha', 'La fecha')->fecha('fecha')->validar();
        $cancha = $this->canchas->principal();

        // Semana de lunes a domingo que contiene la fecha
        $lunes = Fecha::sumarDias($fecha, 1 - Fecha::diaSemana($fecha));
        $domingo = Fecha::sumarDias($lunes, 6);
        $reservasSemana = $this->reservas->activasEntre($cancha['id'], $lunes, $domingo);

        $semana = [];
        for ($i = 0; $i < 7; $i++) {
            $dia = Fecha::sumarDias($lunes, $i);
            $semana[] = $this->agenda($dia, array_values(array_filter($reservasSemana, static fn (array $r): bool => $r['fecha'] === $dia)));
        }

        $hoy = $semana[Fecha::diaSemana($fecha) - 1];
        $delDia = array_filter($reservasSemana, static fn (array $r): bool => $r['fecha'] === $fecha);

        return [
            'fecha' => $fecha,
            'dia' => $hoy,
            'semana' => $semana,
            'resumen' => [
                'reservas' => count($delDia),
                'confirmadas' => count(array_filter($delDia, static fn (array $r): bool => $r['estado'] === 'confirmada')),
                'por_cobrar' => count(array_filter($delDia, static fn (array $r): bool => $r['estado'] !== 'confirmada')),
                'ingresos' => array_sum(array_map(
                    static fn (array $r): float => $r['estado'] === 'confirmada' ? (float) $r['precio'] : 0.0,
                    $delDia
                )),
                'libres' => count(array_filter($hoy['turnos'], static fn (array $t): bool => $t['estado'] === 'libre')),
                'pagos_por_revisar' => $this->pagos->contarPendientes(),
            ],
        ];
    }

    /** Turnos del día con la reserva que ocupa cada uno. */
    private function agenda(string $fecha, array $reservas): array
    {
        $dia = $this->disponibilidad->turnosDelDia($fecha, true);
        foreach ($dia['turnos'] as &$turno) {
            $turno['reserva'] = null;
            foreach ($reservas as $r) {
                if ($r['hora_inicio'] < $turno['hora_fin'] && $r['hora_fin'] > $turno['hora_inicio']) {
                    $turno['reserva'] = $r;
                    break;
                }
            }
        }
        unset($turno);
        return $dia;
    }
}
