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

use App\Controllers\SaludController;

$router->get('/salud', [SaludController::class, 'index']);
