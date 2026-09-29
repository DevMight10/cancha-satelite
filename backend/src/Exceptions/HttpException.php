<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Error controlado que se responde al cliente con un código HTTP.
 * Lanzarla desde cualquier capa: index.php la convierte en JSON.
 */
class HttpException extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        string $message,
        public readonly array $errores = [],
    ) {
        parent::__construct($message);
    }
}
