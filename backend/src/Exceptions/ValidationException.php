<?php

declare(strict_types=1);

namespace App\Exceptions;

/** Datos de entrada inválidos (422). $errores = ['campo' => 'mensaje']. */
class ValidationException extends HttpException
{
    public function __construct(array $errores, string $message = 'Revisa los datos marcados')
    {
        parent::__construct(422, $message, $errores);
    }

    /** Error de un solo campo. */
    public static function campo(string $campo, string $mensaje): self
    {
        return new self([$campo => $mensaje], $mensaje);
    }
}
