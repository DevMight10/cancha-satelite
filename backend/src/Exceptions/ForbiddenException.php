<?php

declare(strict_types=1);

namespace App\Exceptions;

/** Inició sesión pero no tiene permiso para esta acción (403). */
class ForbiddenException extends HttpException
{
    public function __construct(string $message = 'No tienes permiso para realizar esta acción')
    {
        parent::__construct(403, $message);
    }
}
