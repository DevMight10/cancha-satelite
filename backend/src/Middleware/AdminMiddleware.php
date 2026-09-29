<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Exceptions\ForbiddenException;

/**
 * Exige que el usuario sea administrador. Registrar DESPUÉS de AuthMiddleware.
 */
final class AdminMiddleware implements Middleware
{
    public function handle(Request $request): void
    {
        if (($request->usuario['rol'] ?? null) !== 'admin') {
            throw new ForbiddenException('Esta sección es solo para la administración de la cancha');
        }
    }
}
