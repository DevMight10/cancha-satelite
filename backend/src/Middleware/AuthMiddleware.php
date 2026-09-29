<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Core\Sesion;
use App\Exceptions\UnauthorizedException;
use App\Repositories\UsuarioRepository;

/**
 * Exige una sesión iniciada y deja el usuario en $request->usuario.
 */
final class AuthMiddleware implements Middleware
{
    public function handle(Request $request): void
    {
        $id = Sesion::usuarioId();
        $usuario = $id === null ? null : (new UsuarioRepository())->buscarPorId($id);

        if ($usuario === null || !$usuario['activo']) {
            throw new UnauthorizedException();
        }

        $request->usuario = $usuario;
    }
}
