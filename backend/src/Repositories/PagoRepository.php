<?php

declare(strict_types=1);

namespace App\Repositories;

final class PagoRepository extends Repository
{
    private const COLUMNAS = 'p.id, p.reserva_id, p.metodo, p.monto, p.referencia, p.comprobante, p.estado,
        p.observacion, p.revisado_en, p.creado_en';

    public function deReserva(int $reservaId): array
    {
        return array_map([$this, 'publico'], $this->fetchAll(
            'SELECT ' . self::COLUMNAS . ' FROM pagos p WHERE p.reserva_id = ? ORDER BY p.id DESC',
            [$reservaId]
        ));
    }

    public function buscarPorId(int $id, bool $bloquear = false): ?array
    {
        return $this->fetchOne(
            'SELECT ' . self::COLUMNAS . ' FROM pagos p WHERE p.id = ?' . ($bloquear ? ' FOR UPDATE' : ''),
            [$id]
        );
    }

    public function tienePendiente(int $reservaId): bool
    {
        return $this->fetchOne("SELECT 1 FROM pagos WHERE reserva_id = ? AND estado = 'pendiente'", [$reservaId]) !== null;
    }

    public function crear(int $reservaId, string $metodo, string $monto, ?string $referencia, ?string $comprobante): int
    {
        return $this->insert(
            'INSERT INTO pagos (reserva_id, metodo, monto, referencia, comprobante) VALUES (?, ?, ?, ?, ?)',
            [$reservaId, $metodo, $monto, $referencia, $comprobante]
        );
    }

    /** Cobro en efectivo registrado por la administración: queda aprobado de inmediato. */
    public function registrarEfectivo(int $reservaId, string $monto, int $adminId): int
    {
        return $this->insert(
            "INSERT INTO pagos (reserva_id, metodo, monto, estado, registrado_por, revisado_por, revisado_en)
             VALUES (?, 'efectivo', ?, 'aprobado', ?, ?, NOW())",
            [$reservaId, $monto, $adminId, $adminId]
        );
    }

    public function revisar(int $id, string $estado, int $adminId, ?string $observacion): void
    {
        $this->execute(
            'UPDATE pagos SET estado = ?, revisado_por = ?, revisado_en = NOW(), observacion = ? WHERE id = ?',
            [$estado, $adminId, $observacion, $id]
        );
    }

    /** Pagos para la administración, con los datos de la reserva. */
    public function listar(string $estado): array
    {
        $sql = 'SELECT ' . self::COLUMNAS . ', r.fecha, r.hora_inicio, r.hora_fin, r.precio, r.cliente_nombre,
                       r.cliente_telefono, r.estado AS reserva_estado
                FROM pagos p JOIN reservas r ON r.id = p.reserva_id';
        $params = [];
        if ($estado !== '') {
            $sql .= ' WHERE p.estado = ?';
            $params[] = $estado;
        }
        $sql .= $estado === 'pendiente' ? ' ORDER BY p.creado_en' : ' ORDER BY p.creado_en DESC LIMIT 200';
        return array_map([$this, 'publico'], $this->fetchAll($sql, $params));
    }

    public function contarPendientes(): int
    {
        return (int) ($this->fetchOne("SELECT COUNT(*) AS total FROM pagos WHERE estado = 'pendiente'")['total'] ?? 0);
    }

    /** No expone el nombre interno del archivo; solo si hay comprobante. */
    private function publico(array $p): array
    {
        $p['tiene_comprobante'] = !empty($p['comprobante']);
        unset($p['comprobante']);
        return $p;
    }
}
