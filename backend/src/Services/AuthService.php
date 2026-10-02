<?php

declare(strict_types=1);

namespace App\Services;

use App\Exceptions\UnauthorizedException;
use App\Exceptions\ValidationException;
use App\Helpers\Telefono;
use App\Repositories\UsuarioRepository;
use App\Validators\UsuarioValidator;
use PDOException;

final class AuthService
{
    private const NOMBRE_EN_USO = 'Ese nombre de usuario ya está en uso. Elige otro.';

    public function __construct(private readonly UsuarioRepository $usuarios = new UsuarioRepository())
    {
    }

    /** Crea una cuenta de cliente y devuelve sus datos públicos. */
    public function registrar(array $datos): array
    {
        UsuarioValidator::registro($datos);

        $nombre = trim($datos['nombre']);
        $email = mb_strtolower(trim($datos['email']));
        if ($this->usuarios->existeNombre($nombre)) {
            throw ValidationException::campo('nombre', self::NOMBRE_EN_USO);
        }
        if ($this->usuarios->existeEmail($email)) {
            throw ValidationException::campo('email', 'Ya existe una cuenta con este correo. Inicia sesión.');
        }

        try {
            $id = $this->usuarios->crear(
                $nombre,
                $email,
                Telefono::normalizar($datos['telefono']),
                password_hash($datos['password'], PASSWORD_DEFAULT)
            );
        } catch (PDOException $e) {
            // Dos registros simultáneos con el mismo nombre o correo: el índice único decide
            throw self::duplicado($e) ?? $e;
        }

        return $this->usuarios->buscarPorId($id);
    }

    /**
     * Verifica la cuenta (por correo o nombre de usuario) y la contraseña.
     * Mismo mensaje en ambos casos para no revelar qué falló.
     */
    public function autenticar(array $datos): array
    {
        UsuarioValidator::login($datos);

        $usuario = $this->usuarios->buscarParaLogin(mb_strtolower(trim($datos['email'])));
        if ($usuario === null || !password_verify((string) $datos['password'], $usuario['password_hash'])) {
            throw new UnauthorizedException('El correo/usuario o la contraseña no son correctos');
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

        $nombre = trim($datos['nombre']);
        if ($this->usuarios->existeNombre($nombre, $usuarioId)) {
            throw ValidationException::campo('nombre', self::NOMBRE_EN_USO);
        }
        try {
            $this->usuarios->actualizarPerfil($usuarioId, $nombre, Telefono::normalizar($datos['telefono']));
        } catch (PDOException $e) {
            throw self::duplicado($e) ?? $e;
        }
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

    /** Traduce una violación de índice único (error 1062) al error del campo correspondiente. */
    private static function duplicado(PDOException $e): ?ValidationException
    {
        if (($e->errorInfo[1] ?? null) !== 1062) {
            return null;
        }
        return str_contains($e->getMessage(), 'uq_usuarios_nombre')
            ? ValidationException::campo('nombre', self::NOMBRE_EN_USO)
            : ValidationException::campo('email', 'Ya existe una cuenta con este correo. Inicia sesión.');
    }
}
