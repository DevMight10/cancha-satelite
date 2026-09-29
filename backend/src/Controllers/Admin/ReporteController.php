<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Request;
use App\Core\Response;
use App\Helpers\Fecha;
use App\Services\ReporteService;

final class ReporteController
{
    /** GET /admin/reportes?desde=AAAA-MM-DD&hasta=AAAA-MM-DD (por defecto, el mes actual) */
    public function index(Request $request): void
    {
        $desde = (string) $request->query('desde', date('Y-m-01'));
        $hasta = (string) $request->query('hasta', Fecha::hoy());
        Response::json((new ReporteService())->generar($desde, $hasta));
    }
}
