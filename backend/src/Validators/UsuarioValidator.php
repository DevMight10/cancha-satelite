<?php

declare(strict_types=1);

namespace App\Validators;

final class UsuarioValidator
{
    // El nombre de usuario sirve para iniciar sesión: sin "@" nunca se confunde con un correo
    private const SIN_ARROBA = 'El nombre de usuario no puede llevar "@"';

    public static function registro(array $datos): void
    {
        Validator::make($datos)
            ->requerido('nombre', 'El nombre de usuario')
            ->texto('nombre', 100, 3, 'El nombre de usuario')
            ->sinCaracter('nombre', '@', self::SIN_ARROBA)
            ->requerido('email', 'El correo')
            ->email('email')
            ->texto('email', 150, 3, 'El correo')
            ->requerido('telefono', 'El celular')
            ->telefono('telefono')
            ->requerido('password', 'La contraseña')
            ->texto('password', 72, 8, 'La contraseña')
            ->validar();
    }

    public static function login(array $datos): void
    {
        Validator::make($datos)
            ->requerido('email', 'El correo o usuario')
            ->requerido('password', 'La contraseña')
            ->validar();
    }

    public static function perfil(array $datos): void
    {
        Validator::make($datos)
            ->requerido('nombre', 'El nombre de usuario')
            ->texto('nombre', 100, 3, 'El nombre de usuario')
            ->sinCaracter('nombre', '@', self::SIN_ARROBA)
            ->requerido('telefono', 'El celular')
            ->telefono('telefono')
            ->validar();
    }
}
