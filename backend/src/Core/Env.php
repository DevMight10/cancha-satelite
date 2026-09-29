<?php

declare(strict_types=1);

namespace App\Core;

use RuntimeException;

/**
 * Lee la configuración del archivo .env (formato CLAVE=valor).
 */
final class Env
{
    public static function load(string $path): void
    {
        if (!is_file($path)) {
            throw new RuntimeException("No se encontró el archivo .env en: {$path}");
        }

        foreach (file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
                continue;
            }

            [$key, $value] = array_map('trim', explode('=', $line, 2));
            $_ENV[$key] = trim($value, "\"'");
        }
    }

    /**
     * Devuelve el valor de una variable. "true" y "false" se convierten a booleanos.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $value = $_ENV[$key] ?? $default;

        return match (is_string($value) ? strtolower($value) : $value) {
            'true' => true,
            'false' => false,
            default => $value,
        };
    }
}
