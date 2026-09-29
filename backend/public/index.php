<?php

declare(strict_types=1);

/**
 * Punto de entrada único de la API.
 * Todas las peticiones a /api/... llegan a este archivo.
 */

use App\Core\Env;
use App\Core\Request;
use App\Core\Response;
use App\Core\Router;
use App\Exceptions\HttpException;

require __DIR__ . '/../vendor/autoload.php';

ini_set('display_errors', '0');
error_reporting(E_ALL);

// Los warnings de PHP se convierten en excepciones para responder siempre JSON
set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
    throw new ErrorException($message, 0, $severity, $file, $line);
});

$debug = false;

try {
    Env::load(__DIR__ . '/../.env');
    $debug = Env::get('APP_DEBUG', false) === true;
    date_default_timezone_set(Env::get('APP_TIMEZONE', 'America/La_Paz'));

    session_set_cookie_params([
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => !empty($_SERVER['HTTPS']),
    ]);
    session_start();

    $router = new Router();
    require __DIR__ . '/../src/Routes/api.php';

    $router->dispatch(Request::fromGlobals(Env::get('API_PREFIX', '/api')));
} catch (HttpException $e) {
    Response::error($e->getMessage(), $e->status, $e->errores);
} catch (Throwable $e) {
    error_log(
        sprintf("[%s] %s en %s:%d\n%s\n\n", date('Y-m-d H:i:s'), $e->getMessage(), $e->getFile(), $e->getLine(), $e->getTraceAsString()),
        3,
        __DIR__ . '/../storage/logs/app.log'
    );
    Response::error($debug ? $e->getMessage() : 'Error interno del servidor', 500);
}
