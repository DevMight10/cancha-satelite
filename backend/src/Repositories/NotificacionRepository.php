<?php

declare(strict_types=1);

namespace App\Repositories;

final class NotificacionRepository extends Repository
{
    public function registrar(?int $reservaId, string $canal, string $tipo, string $destinatario, ?string $asunto, string $estado, ?string $error = null): void
    {
        $this->execute(
            'INSERT INTO notificaciones (reserva_id, canal, tipo, destinatario, asunto, estado, error) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [$reservaId, $canal, $tipo, $destinatario, $asunto, $estado, $error !== null ? mb_substr($error, 0, 255) : null]
        );
    }

    public function deReserva(int $reservaId): array
    {
        return $this->fetchAll(
            'SELECT canal, tipo, destinatario, asunto, estado, error, creado_en FROM notificaciones WHERE reserva_id = ? ORDER BY id',
            [$reservaId]
        );
    }
}
