<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Services\PagoService;

final class PagoController
{
    private PagoService $pagos;

    public function __construct()
    {
        $this->pagos = new PagoService();
    }

    /** POST /reservas/{id}/pagos (multipart: metodo, referencia?, comprobante) */
    public function store(Request $request): void
    {
        Response::created($this->pagos->enviarComprobante(
            $request->usuario,
            $request->paramId(),
            $request->body(),
            $request->file('comprobante')
        ));
    }

    /** GET /pagos/{id}/comprobante: dueño de la reserva o administración */
    public function comprobante(Request $request): void
    {
        $ruta = $this->pagos->archivoComprobante($request->usuario, $request->paramId());
        Response::file($ruta, (string) mime_content_type($ruta));
    }
}
