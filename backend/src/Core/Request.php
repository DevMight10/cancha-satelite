<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\HttpException;

/**
 * Datos de la petición HTTP actual: método, ruta, cuerpo JSON y parámetros.
 */
final class Request
{
    /** Usuario autenticado (lo completa el middleware de autenticación). */
    public ?array $usuario = null;

    private array $params = [];
    private ?array $body = null;

    public function __construct(
        public readonly string $method,
        public readonly string $path,
    ) {
    }

    public static function fromGlobals(string $prefix): self
    {
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        if ($prefix !== '' && str_starts_with($path, $prefix)) {
            $path = substr($path, strlen($prefix));
        }

        return new self(
            strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            '/' . trim($path, '/')
        );
    }

    /** Cuerpo de la petición enviado como JSON. */
    public function body(): array
    {
        if ($this->body === null) {
            $raw = (string) file_get_contents('php://input');
            $data = $raw === '' ? [] : json_decode($raw, true);

            if (!is_array($data)) {
                throw new HttpException(400, 'El cuerpo de la petición no es un JSON válido');
            }
            $this->body = $data;
        }

        return $this->body;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body()[$key] ?? $default;
    }

    /** Parámetro de la URL: /api/recurso?clave=valor */
    public function query(string $key, mixed $default = null): mixed
    {
        return $_GET[$key] ?? $default;
    }

    /** Parámetro de la ruta: /api/reservas/{id} */
    public function param(string $key): ?string
    {
        return $this->params[$key] ?? null;
    }

    public function setParams(array $params): void
    {
        $this->params = $params;
    }
}
