<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\ValidationException;
use App\Helpers\Fecha;
use App\Repositories\CanchaRepository;
use App\Repositories\ReporteRepository;
use App\Validators\Validator;

/**
 * Reportes de ingresos, ocupación y horarios más usados en un rango de fechas.
 */
final class ReporteService
{
    private const MAX_DIAS = 366;

    public function __construct(
        private readonly ReporteRepository $reportes = new ReporteRepository(),
        private readonly CanchaRepository $canchas = new CanchaRepository(),
    ) {
    }

    public function generar(string $desde, string $hasta): array
    {
        Validator::make(compact('desde', 'hasta'))
            ->requerido('desde', 'La fecha inicial')->fecha('desde')
            ->requerido('hasta', 'La fecha final')->fecha('hasta')
            ->validar();
        if ($hasta < $desde) {
            throw ValidationException::campo('hasta', 'La fecha final debe ser posterior a la inicial');
        }
        if ((strtotime($hasta) - strtotime($desde)) / 86400 >= self::MAX_DIAS) {
            throw ValidationException::campo('hasta', 'El rango máximo es de un año');
        }

        $cancha = $this->canchas->principal();
        $id = $cancha['id'];

        // Serie diaria completa (los días sin reservas valen cero)
        $filasDia = array_column($this->reportes->porDia($id, $desde, $hasta), null, 'fecha');
        $porDia = [];
        $porMes = [];
        for ($f = $desde; $f <= $hasta; $f = Fecha::sumarDias($f, 1)) {
            $reservas = (int) ($filasDia[$f]['reservas'] ?? 0);
            $ingresos = (float) ($filasDia[$f]['ingresos'] ?? 0);
            $porDia[] = ['fecha' => $f, 'reservas' => $reservas, 'ingresos' => $ingresos];
            $mes = substr($f, 0, 7);
            $porMes[$mes] ??= ['mes' => $mes, 'reservas' => 0, 'ingresos' => 0.0];
            $porMes[$mes]['reservas'] += $reservas;
            $porMes[$mes]['ingresos'] += $ingresos;
        }

        $estados = $this->reportes->conteoPorEstado($id, $desde, $hasta);
        $confirmadas = $estados['confirmada'] ?? 0;
        $ofrecidos = $this->turnosOfrecidos($cancha, $desde, $hasta);
        $ingresos = array_sum(array_column($porDia, 'ingresos'));

        return [
            'desde' => $desde,
            'hasta' => $hasta,
            'resumen' => [
                'ingresos' => $ingresos,
                'confirmadas' => $confirmadas,
                'canceladas' => $estados['cancelada'] ?? 0,
                'vencidas' => $estados['expirada'] ?? 0,
                'pendientes' => ($estados['pendiente_pago'] ?? 0) + ($estados['en_revision'] ?? 0),
                'turnos_ofrecidos' => $ofrecidos,
                'ocupacion' => $ofrecidos > 0 ? round($confirmadas / $ofrecidos * 100, 1) : 0,
                'promedio_por_reserva' => $confirmadas > 0 ? round($ingresos / $confirmadas, 2) : 0,
            ],
            'por_dia' => $porDia,
            'por_mes' => array_values($porMes),
            'por_horario' => array_map(static fn (array $h): array => [
                'dia_semana' => (int) $h['dia_semana'],
                'hora_inicio' => $h['hora_inicio'],
                'reservas' => (int) $h['reservas'],
            ], $this->reportes->porHorario($id, $desde, $hasta)),
            'por_metodo' => array_map(static fn (array $m): array => [
                'metodo' => $m['metodo'],
                'pagos' => (int) $m['pagos'],
                'monto' => (float) $m['monto'],
            ], $this->reportes->porMetodo($id, $desde, $hasta)),
            'detalle' => $this->reportes->detalle($id, $desde, $hasta),
        ];
    }

    /** Turnos que se ofrecieron en el rango según el horario y las tarifas actuales (para la ocupación). */
    private function turnosOfrecidos(array $cancha, string $desde, string $hasta): int
    {
        $horarios = array_column($this->canchas->horarios($cancha['id']), null, 'dia_semana');
        $tarifas = $this->canchas->tarifas($cancha['id']);
        $bloqueados = array_column($this->canchas->bloqueosDesde($cancha['id'], $desde), 'fecha');
        $duracion = (int) $cancha['duracion_turno'];

        $total = 0;
        for ($f = $desde; $f <= $hasta; $f = Fecha::sumarDias($f, 1)) {
            $dia = Fecha::diaSemana($f);
            $h = $horarios[$dia] ?? null;
            if ($h === null || $h['cerrado'] || in_array($f, $bloqueados, true)) {
                continue;
            }
            for ($m = Fecha::aMinutos($h['hora_apertura']); $m + $duracion <= Fecha::aMinutos($h['hora_cierre']); $m += $duracion) {
                if (DisponibilidadService::precio($tarifas, $dia, Fecha::deMinutos($m)) !== null) {
                    $total++;
                }
            }
        }
        return $total;
    }
}
