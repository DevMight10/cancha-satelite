<?php

declare(strict_types=1);

namespace App\Repositories;

/**
 * Consultas agregadas para los reportes. Los ingresos cuentan los pagos
 * aprobados de reservas confirmadas, agrupados por el día del partido.
 */
final class ReporteRepository extends Repository
{
    private const INGRESOS = "SELECT COALESCE(SUM(p.monto), 0) FROM pagos p WHERE p.reserva_id = r.id AND p.estado = 'aprobado'";

    public function conteoPorEstado(int $canchaId, string $desde, string $hasta): array
    {
        $filas = $this->fetchAll(
            'SELECT estado, COUNT(*) AS total FROM reservas WHERE cancha_id = ? AND fecha BETWEEN ? AND ? GROUP BY estado',
            [$canchaId, $desde, $hasta]
        );
        return array_map('intval', array_column($filas, 'total', 'estado'));
    }

    public function porDia(int $canchaId, string $desde, string $hasta): array
    {
        return $this->fetchAll(
            "SELECT r.fecha, COUNT(*) AS reservas, SUM((" . self::INGRESOS . ")) AS ingresos
             FROM reservas r WHERE r.cancha_id = ? AND r.fecha BETWEEN ? AND ? AND r.estado = 'confirmada'
             GROUP BY r.fecha ORDER BY r.fecha",
            [$canchaId, $desde, $hasta]
        );
    }

    public function porHorario(int $canchaId, string $desde, string $hasta): array
    {
        return $this->fetchAll(
            "SELECT WEEKDAY(r.fecha) + 1 AS dia_semana, r.hora_inicio, COUNT(*) AS reservas
             FROM reservas r WHERE r.cancha_id = ? AND r.fecha BETWEEN ? AND ? AND r.estado = 'confirmada'
             GROUP BY dia_semana, r.hora_inicio ORDER BY reservas DESC, dia_semana, r.hora_inicio",
            [$canchaId, $desde, $hasta]
        );
    }

    public function porMetodo(int $canchaId, string $desde, string $hasta): array
    {
        return $this->fetchAll(
            "SELECT p.metodo, COUNT(*) AS pagos, SUM(p.monto) AS monto
             FROM pagos p JOIN reservas r ON r.id = p.reserva_id
             WHERE r.cancha_id = ? AND r.fecha BETWEEN ? AND ? AND r.estado = 'confirmada' AND p.estado = 'aprobado'
             GROUP BY p.metodo ORDER BY monto DESC",
            [$canchaId, $desde, $hasta]
        );
    }

    /** Reservas confirmadas con su pago, para exportar. */
    public function detalle(int $canchaId, string $desde, string $hasta): array
    {
        return $this->fetchAll(
            "SELECT r.id, r.fecha, r.hora_inicio, r.hora_fin, r.cliente_nombre, r.cliente_telefono, r.origen, r.precio,
                    (SELECT p.metodo FROM pagos p WHERE p.reserva_id = r.id AND p.estado = 'aprobado' ORDER BY p.id DESC LIMIT 1) AS metodo,
                    (" . self::INGRESOS . ") AS cobrado
             FROM reservas r WHERE r.cancha_id = ? AND r.fecha BETWEEN ? AND ? AND r.estado = 'confirmada'
             ORDER BY r.fecha, r.hora_inicio",
            [$canchaId, $desde, $hasta]
        );
    }
}
