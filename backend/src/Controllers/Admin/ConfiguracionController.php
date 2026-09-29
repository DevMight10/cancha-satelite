<?php

declare(strict_types=1);

namespace App\Controllers\Admin;

use App\Core\Request;
use App\Core\Response;
use App\Services\ConfiguracionService;

final class ConfiguracionController
{
    private ConfiguracionService $config;

    public function __construct()
    {
        $this->config = new ConfiguracionService();
    }

    /** GET /admin/configuracion */
    public function index(Request $request): void
    {
        Response::json($this->config->todo());
    }

    /** PUT /admin/configuracion: datos del negocio, reglas y medios de pago */
    public function guardar(Request $request): void
    {
        Response::json($this->config->guardarGeneral($request->body()));
    }

    /** PUT /admin/horarios { horarios: [...7], duracion_turno } */
    public function horarios(Request $request): void
    {
        $horarios = $request->input('horarios', []);
        Response::json($this->config->guardarHorarios(is_array($horarios) ? $horarios : [], $request->input('duracion_turno')));
    }

    public function crearTarifa(Request $request): void
    {
        Response::created($this->config->crearTarifa($request->body()));
    }

    public function actualizarTarifa(Request $request): void
    {
        Response::json($this->config->actualizarTarifa($request->paramId(), $request->body()));
    }

    public function eliminarTarifa(Request $request): void
    {
        Response::json($this->config->eliminarTarifa($request->paramId()));
    }

    public function crearBloqueo(Request $request): void
    {
        Response::created($this->config->bloquearDia($request->body()));
    }

    public function eliminarBloqueo(Request $request): void
    {
        Response::json($this->config->desbloquearDia($request->paramId()));
    }

    /** POST /admin/configuracion/qr (multipart: qr) */
    public function subirQr(Request $request): void
    {
        Response::json($this->config->subirQr($request->file('qr')));
    }

    public function eliminarQr(Request $request): void
    {
        Response::json($this->config->eliminarQr());
    }
}
