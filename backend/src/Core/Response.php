<?php

declare(strict_types=1);

namespace App\Core;

/**
 * Respuestas JSON con un formato uniforme:
 *   éxito -> { "data": ... }
 *   error -> { "error": "mensaje", "errores": { "campo": "mensaje" } }
 */
final class Response
{
    public static function json(mixed $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['data' => $data], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public static function noContent(): void
    {
        http_response_code(204);
    }

    public static function error(string $message, int $status = 400, array $errores = []): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');

        $body = ['error' => $message];
        if ($errores !== []) {
            $body['errores'] = $errores;
        }
        echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
}
