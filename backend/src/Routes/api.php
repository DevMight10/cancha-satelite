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
