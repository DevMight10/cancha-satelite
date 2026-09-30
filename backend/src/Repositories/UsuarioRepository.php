<?php

declare(strict_types=1);

namespace App\Repositories;

final class UsuarioRepository extends Repository
{
    private const COLUMNAS = 'id, nombre, email, telefono, rol, activo, creado_en';

    public function buscarPorId(int $id): ?array
    {
        return $this->fetchOne('SELECT ' . self::COLUMNAS . ' FROM usuarios WHERE id = ?', [$id]);
    }

    /** Incluye password_hash: usar solo para verificar credenciales. */
    public function buscarPorEmailConPassword(string $email): ?array
    {
        return $this->fetchOne('SELECT ' . self::COLUMNAS . ', password_hash FROM usuarios WHERE email = ?', [$email]);
    }

    public function existeEmail(string $email, ?int $excluirId = null): bool
    {
        return $this->fetchOne(
            'SELECT 1 FROM usuarios WHERE email = ? AND id <> ?',
            [$email, $excluirId ?? 0]
        ) !== null;
    }

    public function crear(string $nombre, string $email, string $telefono, string $passwordHash, string $rol = 'cliente'): int
    {
        return $this->insert(
            'INSERT INTO usuarios (nombre, email, telefono, password_hash, rol) VALUES (?, ?, ?, ?, ?)',
            [$nombre, $email, $telefono, $passwordHash, $rol]
        );
    }

    public function actualizarPerfil(int $id, string $nombre, string $telefono): void
    {
        $this->execute('UPDATE usuarios SET nombre = ?, telefono = ? WHERE id = ?', [$nombre, $telefono, $id]);
    }

    public function actualizarPassword(int $id, string $passwordHash): void
    {
        $this->execute('UPDATE usuarios SET password_hash = ? WHERE id = ?', [$passwordHash, $id]);
    }

    public function actualizarRol(int $id, string $rol): void
    {
        $this->execute('UPDATE usuarios SET rol = ? WHERE id = ?', [$rol, $id]);
    }

    /** Correos de los administradores activos (para avisos de pagos por revisar). */
    public function emailsAdministradores(): array
    {
        // Un administrador puede entrar con un nombre de usuario en vez de correo: solo se avisa a los correos válidos
        $emails = array_column($this->fetchAll("SELECT email FROM usuarios WHERE rol = 'admin' AND activo = 1"), 'email');
        return array_values(array_filter($emails, fn ($e) => filter_var($e, FILTER_VALIDATE_EMAIL) !== false));
    }
}
