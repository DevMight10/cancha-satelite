<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Request;
use App\Core\Response;
use App\Helpers\Fecha;
use App\Repositories\PagoRepository;
use App\Services\PanelService;

final class PanelController
{
    /** GET /admin/panel?fecha=AAAA-MM-DD */
    public function index(Request $request): void
    {
        Response::json((new PanelService())->panel((string) $request->query('fecha', Fecha::hoy())));
    }

    /** GET /admin/contadores: números para la navegación del panel */
    public function contadores(Request $request): void
    {
        Response::json(['pagos_por_revisar' => (new PagoRepository())->contarPendientes()]);
    }
}
