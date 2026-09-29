<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Sesión del usuario (cookie httpOnly de PHP). Solo guarda el id;
 * los datos del usuario se leen de la base en cada petición.
 */
final class Sesion
{
    public static function iniciar(int $usuarioId): void
    {
        // Nuevo id de sesión al iniciar sesión: evita la fijación de sesión
        session_regenerate_id(true);
        $_SESSION['usuario_id'] = $usuarioId;
    }

    public static function usuarioId(): ?int
    {
        $id = $_SESSION['usuario_id'] ?? null;
        return is_int($id) ? $id : null;
    }

    public static function cerrar(): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $p = session_get_cookie_params();
            setcookie(session_name(), '', [
                'expires' => time() - 3600,
                'path' => $p['path'],
                'httponly' => true,
                'samesite' => 'Lax',
                'secure' => $p['secure'],
            ]);
        }
        session_destroy();
    }
}
