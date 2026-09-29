<?php

declare(strict_types=1);

namespace App\Services;

/**
 * Avisos al cliente y a la administración cuando cambia una reserva.
 * Los envíos por correo se implementan en el módulo de notificaciones.
 */
class NotificacionService
{
    public function reservaCreada(array $reserva): void
    {
    }

    public function reservaCancelada(array $reserva): void
    {
    }

    public function comprobanteRecibido(array $reserva, array $pago): void
    {
    }

    public function pagoAprobado(array $reserva): void
    {
    }

    public function pagoRechazado(array $reserva, string $motivo): void
    {
    }
}
