<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Exceptions\NotFoundException;
use App\Helpers\Fecha;
use App\Repositories\CanchaRepository;
use App\Repositories\ConfiguracionRepository;
use App\Services\DisponibilidadService;

/**
 * Información pública: datos de la cancha, precios, reglas y disponibilidad.
 */
final class PublicoController
{
    /** GET /publico/info */
    public function info(Request $request): void
    {
        $config = new ConfiguracionRepository();
        $canchas = new CanchaRepository();
        $cancha = $canchas->principal();

        Response::json([
            'negocio' => [
                'nombre' => $config->obtener('negocio_nombre', $cancha['nombre']),
                'direccion' => $config->obtener('negocio_direccion'),
                'whatsapp' => $config->obtener('negocio_whatsapp'),
                'email' => $config->obtener('negocio_email'),
            ],
            'reglas' => [
                'dias_anticipacion' => $config->diasAnticipacion(),
                'minutos_pago' => $config->minutosParaPagar(),
                'horas_cancelacion' => $config->horasMinimasCancelacion(),
                'duracion_turno' => $cancha['duracion_turno'],
            ],
            'horarios' => $canchas->horarios($cancha['id']),
            'tarifas' => array_map(
                static fn (array $t): array => array_diff_key($t, ['activa' => 0]),
                $canchas->tarifas($cancha['id'])
            ),
            'hoy' => Fecha::hoy(),
        ]);
    }

    /** GET /disponibilidad?fecha=AAAA-MM-DD */
    public function disponibilidad(Request $request): void
    {
        Response::json((new DisponibilidadService())->turnosDelDia((string) $request->query('fecha', Fecha::hoy())));
    }

    /** GET /disponibilidad/dias: próximos días con turnos libres */
    public function dias(Request $request): void
    {
        Response::json((new DisponibilidadService())->resumenDias());
    }

    /** GET /publico/qr: imagen del QR de pago cargada por la administración */
    public function qr(Request $request): void
    {
        $archivo = (new ConfiguracionRepository())->obtener('pago_qr_imagen');
        $ruta = dirname(__DIR__, 2) . '/storage/uploads/config/' . basename($archivo);
        if ($archivo === '' || !is_file($ruta)) {
            throw new NotFoundException('Todavía no se cargó el QR de pago');
        }
        Response::file($ruta, (string) mime_content_type($ruta), true);
    }
}
