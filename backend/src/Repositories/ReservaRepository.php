<?php

declare(strict_types=1);

namespace App\Repositories;

final class ReservaRepository extends Repository
{
    private const COLUMNAS = 'r.id, r.cancha_id, r.usuario_id, r.cliente_nombre, r.cliente_telefono, r.cliente_email,
        r.fecha, r.hora_inicio, r.hora_fin, r.precio, r.estado, r.origen, r.expira_en,
        r.cancelada_en, r.cancelada_por, r.motivo_cancelacion, r.creado_en';

    /**
     * Marca como vencidas las reservas no pagadas cuyo plazo terminó (libera el horario).
     * Se llama antes de consultar disponibilidad o crear reservas.
     */
    public function expirarVencidas(): int
    {
        return $this->execute(
            "UPDATE reservas SET estado = 'expirada' WHERE estado = 'pendiente_pago' AND expira_en IS NOT NULL AND expira_en <= NOW()"
        );
    }

    /** Reservas que ocupan horario en una fecha (no canceladas ni vencidas). */
    public function activasEnFecha(int $canchaId, string $fecha, bool $bloquear = false): array
    {
        return $this->fetchAll(
            "SELECT id, hora_inicio, hora_fin, estado FROM reservas
             WHERE cancha_id = ? AND fecha = ? AND estado NOT IN ('cancelada','expirada')
             ORDER BY hora_inicio" . ($bloquear ? ' FOR UPDATE' : ''),
            [$canchaId, $fecha]
        );
    }

    /** Reservas activas de un rango de fechas con los datos del cliente (agenda del administrador). */
    public function activasEntre(int $canchaId, string $desde, string $hasta): array
    {
        return $this->fetchAll(
            "SELECT r.id, r.fecha, r.hora_inicio, r.hora_fin, r.estado, r.origen, r.precio, r.cliente_nombre, r.cliente_telefono,
                    (SELECT p.estado FROM pagos p WHERE p.reserva_id = r.id ORDER BY p.id DESC LIMIT 1) AS pago_estado
             FROM reservas r
             WHERE r.cancha_id = ? AND r.fecha BETWEEN ? AND ? AND r.estado NOT IN ('cancelada','expirada')
             ORDER BY r.fecha, r.hora_inicio",
            [$canchaId, $desde, $hasta]
        );
    }

    /** Cantidad de reservas activas por fecha en un rango (para la tira de días). */
    public function conteoActivasPorFecha(int $canchaId, string $desde, string $hasta): array
    {
        $filas = $this->fetchAll(
            "SELECT fecha, COUNT(*) AS total FROM reservas
             WHERE cancha_id = ? AND fecha BETWEEN ? AND ? AND estado NOT IN ('cancelada','expirada')
             GROUP BY fecha",
            [$canchaId, $desde, $hasta]
        );
        return array_column($filas, 'total', 'fecha');
    }

    public function crear(array $r): int
    {
        return $this->insert(
            'INSERT INTO reservas (cancha_id, usuario_id, cliente_nombre, cliente_telefono, cliente_email, fecha, hora_inicio, hora_fin,
                                   precio, estado, origen, expira_en, creado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                $r['cancha_id'], $r['usuario_id'], $r['cliente_nombre'], $r['cliente_telefono'], $r['cliente_email'],
                $r['fecha'], $r['hora_inicio'], $r['hora_fin'], $r['precio'], $r['estado'], $r['origen'],
                $r['expira_en'], $r['creado_por'],
            ]
        );
    }

    public function buscarPorId(int $id, bool $bloquear = false): ?array
    {
        return $this->fetchOne('SELECT ' . self::COLUMNAS . ' FROM reservas r WHERE r.id = ?' . ($bloquear ? ' FOR UPDATE' : ''), [$id]);
    }

    public function delUsuario(int $usuarioId): array
    {
        return $this->fetchAll(
            'SELECT ' . self::COLUMNAS . ' FROM reservas r WHERE r.usuario_id = ? ORDER BY r.fecha DESC, r.hora_inicio DESC',
            [$usuarioId]
        );
    }

    public function cambiarEstado(int $id, string $estado, ?string $expiraEn = null): void
    {
        $this->execute('UPDATE reservas SET estado = ?, expira_en = ? WHERE id = ?', [$estado, $expiraEn, $id]);
    }

    public function cancelar(int $id, string $por, ?string $motivo): void
    {
        $this->execute(
            "UPDATE reservas SET estado = 'cancelada', cancelada_en = NOW(), cancelada_por = ?, motivo_cancelacion = ?, expira_en = NULL WHERE id = ?",
            [$por, $motivo, $id]
        );
    }

    /**
     * Listado para la administración con filtros opcionales:
     * desde, hasta, estado, buscar (nombre o celular del cliente).
     */
    public function listar(int $canchaId, array $filtros): array
    {
        $sql = 'SELECT ' . self::COLUMNAS . ',
                   (SELECT p.estado FROM pagos p WHERE p.reserva_id = r.id ORDER BY p.id DESC LIMIT 1) AS pago_estado,
                   (SELECT p.metodo FROM pagos p WHERE p.reserva_id = r.id ORDER BY p.id DESC LIMIT 1) AS pago_metodo
                FROM reservas r WHERE r.cancha_id = ?';
        $params = [$canchaId];

        if (!empty($filtros['desde'])) { $sql .= ' AND r.fecha >= ?'; $params[] = $filtros['desde']; }
        if (!empty($filtros['hasta'])) { $sql .= ' AND r.fecha <= ?'; $params[] = $filtros['hasta']; }
        if (!empty($filtros['estado'])) { $sql .= ' AND r.estado = ?'; $params[] = $filtros['estado']; }
        if (!empty($filtros['buscar'])) {
            $sql .= ' AND (r.cliente_nombre LIKE ? OR r.cliente_telefono LIKE ?)';
            $like = '%' . $filtros['buscar'] . '%';
            array_push($params, $like, $like);
        }

        $sql .= ' ORDER BY r.fecha, r.hora_inicio LIMIT 500';
        return $this->fetchAll($sql, $params);
    }
}
