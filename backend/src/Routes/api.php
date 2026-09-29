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
