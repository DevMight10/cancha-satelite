<?php

declare(strict_types=1);

namespace App\Validators;

final class UsuarioValidator
{
    public static function registro(array $datos): void
    {
        Validator::make($datos)
            ->requerido('nombre', 'El nombre')
            ->texto('nombre', 100, 3, 'El nombre')
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
            ->requerido('email', 'El correo')
            ->email('email')
            ->requerido('password', 'La contraseña')
            ->validar();
    }

    public static function perfil(array $datos): void
    {
        Validator::make($datos)
            ->requerido('nombre', 'El nombre')
            ->texto('nombre', 100, 3, 'El nombre')
            ->requerido('telefono', 'El celular')
            ->telefono('telefono')
            ->validar();
    }
}
