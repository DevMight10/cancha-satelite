<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\HttpException;

/**
 * Datos de la petición HTTP actual: método, ruta, cuerpo (JSON o formulario),
 * archivos y parámetros.
 */
final class Request
{
    /** Usuario autenticado (lo completa AuthMiddleware). */
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

        // Si el sistema está en una subcarpeta (http://localhost/cancha-satelite/), se quita esa carpeta.
        // index.php vive en <carpeta>/backend/public/index.php: tres niveles arriba está la carpeta.
        $carpeta = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/', 3)), '/');
        if ($carpeta !== '' && str_starts_with($path, $carpeta . '/')) {
            $path = substr($path, strlen($carpeta));
        }

        if ($prefix !== '' && str_starts_with($path, $prefix)) {
            $path = substr($path, strlen($prefix));
        }

        return new self(
            strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            '/' . trim($path, '/')
        );
    }

    /**
     * Cuerpo de la petición: JSON o, si se envió un formulario con archivos, $_POST.
     */
    public function body(): array
    {
        if ($this->body !== null) {
            return $this->body;
        }

        $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
        if (str_starts_with($contentType, 'multipart/form-data') || str_starts_with($contentType, 'application/x-www-form-urlencoded')) {
            return $this->body = $_POST;
        }

        $raw = (string) file_get_contents('php://input');
        $data = $raw === '' ? [] : json_decode($raw, true);
        if (!is_array($data)) {
            throw new HttpException(400, 'El cuerpo de la petición no es un JSON válido');
        }

        return $this->body = $data;
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body()[$key] ?? $default;
    }

    /** Parámetro de la URL: /api/recurso?clave=valor */
    public function query(string $key, mixed $default = null): mixed
    {
        $value = $_GET[$key] ?? $default;
        return is_string($value) ? trim($value) : $value;
    }

    /** Parámetro de la ruta: /api/reservas/{id} */
    public function param(string $key): ?string
    {
        return $this->params[$key] ?? null;
    }

    /** Parámetro numérico de la ruta; 404 si no es un entero positivo. */
    public function paramId(string $key = 'id'): int
    {
        $value = $this->param($key);
        if ($value === null || !ctype_digit($value) || (int) $value < 1) {
            throw new HttpException(404, 'Recurso no encontrado');
        }
        return (int) $value;
    }

    public function setParams(array $params): void
    {
        $this->params = $params;
    }

    /** Archivo subido en un formulario, o null si no se envió. */
    public function file(string $key): ?array
    {
        $file = $_FILES[$key] ?? null;
        if (!is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            return null;
        }
        return $file;
    }
}
