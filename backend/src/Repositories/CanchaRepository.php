<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Exceptions\HttpException;

/**
 * Cancha, horario de apertura, tarifas y días bloqueados.
 */
final class CanchaRepository extends Repository
{
    /** La cancha principal (la primera activa). */
    public function principal(): array
    {
        $cancha = $this->fetchOne('SELECT id, nombre, descripcion, duracion_turno FROM canchas WHERE activa = 1 ORDER BY id LIMIT 1');
        if ($cancha === null) {
            throw new HttpException(503, 'La cancha no está configurada todavía');
        }
        return $cancha;
    }

    // ---- Horario de apertura -------------------------------------------------

    public function horarios(int $canchaId): array
    {
        return $this->fetchAll(
            'SELECT dia_semana, hora_apertura, hora_cierre, cerrado FROM horarios_apertura WHERE cancha_id = ? ORDER BY dia_semana',
            [$canchaId]
        );
    }

    public function horarioDelDia(int $canchaId, int $diaSemana): ?array
    {
        return $this->fetchOne(
            'SELECT dia_semana, hora_apertura, hora_cierre, cerrado FROM horarios_apertura WHERE cancha_id = ? AND dia_semana = ?',
            [$canchaId, $diaSemana]
        );
    }

    public function guardarHorario(int $canchaId, int $dia, string $apertura, string $cierre, bool $cerrado): void
    {
        $this->execute(
            'INSERT INTO horarios_apertura (cancha_id, dia_semana, hora_apertura, hora_cierre, cerrado) VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE hora_apertura = VALUES(hora_apertura), hora_cierre = VALUES(hora_cierre), cerrado = VALUES(cerrado)',
            [$canchaId, $dia, $apertura, $cierre, (int) $cerrado]
        );
    }

    public function actualizarDuracionTurno(int $canchaId, int $minutos): void
    {
        $this->execute('UPDATE canchas SET duracion_turno = ? WHERE id = ?', [$minutos, $canchaId]);
    }

    // ---- Tarifas -------------------------------------------------------------

    public function tarifas(int $canchaId, bool $soloActivas = true): array
    {
        $sql = 'SELECT id, nombre, dias, hora_desde, hora_hasta, precio, activa FROM tarifas WHERE cancha_id = ?'
            . ($soloActivas ? ' AND activa = 1' : '') . ' ORDER BY hora_desde, precio';
        return array_map(static function (array $t): array {
            $t['dias'] = array_map('intval', array_filter(explode(',', $t['dias'])));
            return $t;
        }, $this->fetchAll($sql, [$canchaId]));
    }

    public function buscarTarifa(int $id): ?array
    {
        return $this->fetchOne('SELECT id, cancha_id FROM tarifas WHERE id = ?', [$id]);
    }

    public function crearTarifa(int $canchaId, array $t): int
    {
        return $this->insert(
            'INSERT INTO tarifas (cancha_id, nombre, dias, hora_desde, hora_hasta, precio, activa) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$canchaId, $t['nombre'], implode(',', $t['dias']), $t['hora_desde'], $t['hora_hasta'], $t['precio'], (int) $t['activa']]
        );
    }

    public function actualizarTarifa(int $id, array $t): void
    {
        $this->execute(
            'UPDATE tarifas SET nombre = ?, dias = ?, hora_desde = ?, hora_hasta = ?, precio = ?, activa = ? WHERE id = ?',
            [$t['nombre'], implode(',', $t['dias']), $t['hora_desde'], $t['hora_hasta'], $t['precio'], (int) $t['activa'], $id]
        );
    }

    public function eliminarTarifa(int $id): void
    {
        $this->execute('DELETE FROM tarifas WHERE id = ?', [$id]);
    }

    // ---- Días bloqueados -----------------------------------------------------

    public function bloqueoDelDia(int $canchaId, string $fecha): ?array
    {
        return $this->fetchOne('SELECT id, fecha, motivo FROM dias_bloqueados WHERE cancha_id = ? AND fecha = ?', [$canchaId, $fecha]);
    }

    public function bloqueosDesde(int $canchaId, string $desde): array
    {
        return $this->fetchAll(
            'SELECT id, fecha, motivo FROM dias_bloqueados WHERE cancha_id = ? AND fecha >= ? ORDER BY fecha',
            [$canchaId, $desde]
        );
    }

    public function crearBloqueo(int $canchaId, string $fecha, string $motivo): int
    {
        return $this->insert('INSERT INTO dias_bloqueados (cancha_id, fecha, motivo) VALUES (?, ?, ?)', [$canchaId, $fecha, $motivo]);
    }

    public function eliminarBloqueo(int $id): int
    {
        return $this->execute('DELETE FROM dias_bloqueados WHERE id = ?', [$id]);
    }
}
