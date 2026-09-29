<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Services\ReservaService;

/**
 * Reservas del cliente con sesión iniciada.
 */
final class ReservaController
{
    private ReservaService $reservas;

    public function __construct()
    {
        $this->reservas = new ReservaService();
    }

    /** GET /reservas: mis reservas */
    public function index(Request $request): void
    {
        Response::json($this->reservas->misReservas($request->usuario['id']));
    }

    /** POST /reservas { fecha, hora_inicio } */
    public function store(Request $request): void
    {
        Response::created($this->reservas->crearParaCliente($request->usuario, $request->body()));
    }

    /** GET /reservas/{id} */
    public function show(Request $request): void
    {
        Response::json($this->reservas->detalleParaCliente($request->usuario, $request->paramId()));
    }

    /** POST /reservas/{id}/cancelar { motivo? } */
    public function cancelar(Request $request): void
    {
        $motivo = $request->input('motivo');
        Response::json($this->reservas->cancelarPorCliente($request->usuario, $request->paramId(), is_string($motivo) ? $motivo : null));
    }
}
