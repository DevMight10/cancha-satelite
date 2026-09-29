<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Request;
use App\Core\Response;
use App\Repositories\CanchaRepository;
use App\Repositories\ReservaRepository;
use App\Services\PagoService;
use App\Services\ReservaService;
use App\Validators\Validator;

/**
 * Gestión de reservas por la administración.
 */
final class ReservaController
{
    /** GET /admin/reservas?desde=&hasta=&estado=&buscar= */
    public function index(Request $request): void
    {
        $filtros = [
            'desde' => (string) $request->query('desde', ''),
            'hasta' => (string) $request->query('hasta', ''),
            'estado' => (string) $request->query('estado', ''),
            'buscar' => mb_substr((string) $request->query('buscar', ''), 0, 60),
        ];
        Validator::make($filtros)
            ->fecha('desde')->fecha('hasta')
            ->enLista('estado', ['pendiente_pago', 'en_revision', 'confirmada', 'cancelada', 'expirada'], 'Estado no válido')
            ->validar();

        $reservas = new ReservaRepository();
        $reservas->expirarVencidas();
        Response::json($reservas->listar((new CanchaRepository())->principal()['id'], $filtros));
    }

    /** POST /admin/reservas: reserva presencial { fecha, hora_inicio, cliente_nombre, cliente_telefono, pagado } */
    public function store(Request $request): void
    {
        Response::created((new ReservaService())->crearPresencial($request->usuario, $request->body()));
    }

    /** POST /admin/reservas/{id}/cancelar { motivo } */
    public function cancelar(Request $request): void
    {
        Response::json((new ReservaService())->cancelarPorAdmin($request->paramId(), (string) $request->input('motivo', '')));
    }

    /** POST /admin/reservas/{id}/cobrar-efectivo */
    public function cobrarEfectivo(Request $request): void
    {
        Response::json((new PagoService())->cobrarEfectivo($request->usuario, $request->paramId()));
    }
}
