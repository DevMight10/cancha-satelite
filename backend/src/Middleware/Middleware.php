<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;

/**
 * Se ejecuta antes del controlador. Si la petición no cumple la condición
 * (por ejemplo, no inició sesión), debe lanzar una HttpException.
 */
interface Middleware
{
    public function handle(Request $request): void;
}
