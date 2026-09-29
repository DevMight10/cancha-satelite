<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\UnauthorizedException;
use App\Exceptions\ValidationException;
use App\Helpers\Telefono;
use App\Repositories\UsuarioRepository;
use App\Validators\UsuarioValidator;

final class AuthService
{
    public function __construct(private readonly UsuarioRepository $usuarios = new UsuarioRepository())
    {
    }

    /** Crea una cuenta de cliente y devuelve sus datos públicos. */
    public function registrar(array $datos): array
    {
        UsuarioValidator::registro($datos);

        $email = mb_strtolower(trim($datos['email']));
        if ($this->usuarios->existeEmail($email)) {
            throw ValidationException::campo('email', 'Ya existe una cuenta con este correo. Inicia sesión.');
        }

        $id = $this->usuarios->crear(
            trim($datos['nombre']),
            $email,
            Telefono::normalizar($datos['telefono']),
            password_hash($datos['password'], PASSWORD_DEFAULT)
        );

        return $this->usuarios->buscarPorId($id);
    }

    /** Verifica correo y contraseña. Mismo mensaje en ambos casos para no revelar qué falló. */
    public function autenticar(array $datos): array
    {
        UsuarioValidator::login($datos);

        $usuario = $this->usuarios->buscarPorEmailConPassword(mb_strtolower(trim($datos['email'])));
        if ($usuario === null || !password_verify((string) $datos['password'], $usuario['password_hash'])) {
            throw new UnauthorizedException('El correo o la contraseña no son correctos');
        }
        if (!$usuario['activo']) {
            throw new UnauthorizedException('Esta cuenta está desactivada. Comunícate con la cancha.');
        }

        if (password_needs_rehash($usuario['password_hash'], PASSWORD_DEFAULT)) {
            $this->usuarios->actualizarPassword($usuario['id'], password_hash((string) $datos['password'], PASSWORD_DEFAULT));
        }

        unset($usuario['password_hash']);
        return $usuario;
    }

    public function actualizarPerfil(int $usuarioId, array $datos): array
    {
        UsuarioValidator::perfil($datos);
        $this->usuarios->actualizarPerfil($usuarioId, trim($datos['nombre']), Telefono::normalizar($datos['telefono']));
        return $this->usuarios->buscarPorId($usuarioId);
    }

    /** Datos que se pueden enviar al frontend. */
    public static function publico(array $usuario): array
    {
        return [
            'id' => $usuario['id'],
            'nombre' => $usuario['nombre'],
            'email' => $usuario['email'],
            'telefono' => $usuario['telefono'],
            'rol' => $usuario['rol'],
        ];
    }
}
