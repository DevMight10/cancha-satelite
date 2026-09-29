<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Request;
use App\Core\Response;
use App\Repositories\PagoRepository;
use App\Services\PagoService;
use App\Validators\Validator;

/**
 * Revisión de comprobantes por la administración.
 */
final class PagoController
{
    private PagoService $pagos;

    public function __construct()
    {
        $this->pagos = new PagoService();
    }

    /** GET /admin/pagos?estado=pendiente|aprobado|rechazado (vacío = todos) */
    public function index(Request $request): void
    {
        $estado = (string) $request->query('estado', 'pendiente');
        Validator::make(['estado' => $estado])
            ->enLista('estado', ['pendiente', 'aprobado', 'rechazado'], 'Estado de pago no válido')
            ->validar();
        Response::json((new PagoRepository())->listar($estado));
    }

    /** POST /admin/pagos/{id}/aprobar */
    public function aprobar(Request $request): void
    {
        Response::json($this->pagos->aprobar($request->usuario, $request->paramId()));
    }

    /** POST /admin/pagos/{id}/rechazar { motivo } */
    public function rechazar(Request $request): void
    {
        Response::json($this->pagos->rechazar($request->usuario, $request->paramId(), (string) $request->input('motivo', '')));
    }
}
