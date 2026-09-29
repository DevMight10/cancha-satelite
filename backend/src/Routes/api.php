<?php

declare(strict_types=1);

/**
 * Rutas de la API. Todas empiezan con /api (por ejemplo: GET /api/salud).
 *
 * Formato:
 *   $router->metodo('/ruta', [Controlador::class, 'metodo'], [Middleware::class, ...]);
 *
 * @var \App\Core\Router $router
 */

use App\Controllers\Admin;
use App\Controllers\AuthController;
use App\Controllers\PagoController;
use App\Controllers\PublicoController;
use App\Controllers\ReservaController;
use App\Controllers\SaludController;
use App\Middleware\AdminMiddleware;
use App\Middleware\AuthMiddleware;

$auth = [AuthMiddleware::class];
$admin = [AuthMiddleware::class, AdminMiddleware::class];

$router->get('/salud', [SaludController::class, 'index']);

// Autenticación
$router->post('/auth/registro', [AuthController::class, 'registro']);
$router->post('/auth/login', [AuthController::class, 'login']);
$router->post('/auth/logout', [AuthController::class, 'logout']);
$router->get('/auth/me', [AuthController::class, 'me']);
$router->put('/auth/perfil', [AuthController::class, 'actualizarPerfil'], $auth);

// Información pública y disponibilidad
$router->get('/publico/info', [PublicoController::class, 'info']);
$router->get('/publico/qr', [PublicoController::class, 'qr']);
$router->get('/disponibilidad', [PublicoController::class, 'disponibilidad']);
$router->get('/disponibilidad/dias', [PublicoController::class, 'dias']);

// Reservas del cliente
$router->get('/reservas', [ReservaController::class, 'index'], $auth);
$router->post('/reservas', [ReservaController::class, 'store'], $auth);
$router->get('/reservas/{id}', [ReservaController::class, 'show'], $auth);
$router->post('/reservas/{id}/cancelar', [ReservaController::class, 'cancelar'], $auth);

// Pagos del cliente
$router->post('/reservas/{id}/pagos', [PagoController::class, 'store'], $auth);
$router->get('/pagos/{id}/comprobante', [PagoController::class, 'comprobante'], $auth);

// ---------------------------------------------------------------------------
// Administración
// ---------------------------------------------------------------------------
$router->get('/admin/panel', [Admin\PanelController::class, 'index'], $admin);
$router->get('/admin/contadores', [Admin\PanelController::class, 'contadores'], $admin);

$router->get('/admin/reservas', [Admin\ReservaController::class, 'index'], $admin);
$router->post('/admin/reservas', [Admin\ReservaController::class, 'store'], $admin);
$router->post('/admin/reservas/{id}/cancelar', [Admin\ReservaController::class, 'cancelar'], $admin);
$router->post('/admin/reservas/{id}/cobrar-efectivo', [Admin\ReservaController::class, 'cobrarEfectivo'], $admin);

$router->get('/admin/configuracion', [Admin\ConfiguracionController::class, 'index'], $admin);
$router->put('/admin/configuracion', [Admin\ConfiguracionController::class, 'guardar'], $admin);
$router->post('/admin/configuracion/qr', [Admin\ConfiguracionController::class, 'subirQr'], $admin);
$router->delete('/admin/configuracion/qr', [Admin\ConfiguracionController::class, 'eliminarQr'], $admin);
$router->put('/admin/horarios', [Admin\ConfiguracionController::class, 'horarios'], $admin);
$router->post('/admin/tarifas', [Admin\ConfiguracionController::class, 'crearTarifa'], $admin);
$router->put('/admin/tarifas/{id}', [Admin\ConfiguracionController::class, 'actualizarTarifa'], $admin);
$router->delete('/admin/tarifas/{id}', [Admin\ConfiguracionController::class, 'eliminarTarifa'], $admin);
$router->post('/admin/bloqueos', [Admin\ConfiguracionController::class, 'crearBloqueo'], $admin);
$router->delete('/admin/bloqueos/{id}', [Admin\ConfiguracionController::class, 'eliminarBloqueo'], $admin);

$router->get('/admin/reportes', [Admin\ReporteController::class, 'index'], $admin);

$router->get('/admin/pagos', [Admin\PagoController::class, 'index'], $admin);
$router->post('/admin/pagos/{id}/aprobar', [Admin\PagoController::class, 'aprobar'], $admin);
$router->post('/admin/pagos/{id}/rechazar', [Admin\PagoController::class, 'rechazar'], $admin);
