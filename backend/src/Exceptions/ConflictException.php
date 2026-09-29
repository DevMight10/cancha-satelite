<?php

declare(strict_types=1);

namespace App\Exceptions;

/** La acción choca con el estado actual (409): horario ocupado, reserva ya cancelada, etc. */
class ConflictException extends HttpException
{
    public function __construct(string $message)
    {
        parent::__construct(409, $message);
    }
}
