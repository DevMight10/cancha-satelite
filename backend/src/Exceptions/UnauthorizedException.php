<?php

declare(strict_types=1);

namespace App\Exceptions;

/** No inició sesión o las credenciales no son válidas (401). */
class UnauthorizedException extends HttpException
{
    public function __construct(string $message = 'Debes iniciar sesión')
    {
        parent::__construct(401, $message);
    }
}
