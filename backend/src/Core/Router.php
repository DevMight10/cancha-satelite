<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\HttpException;
use App\Exceptions\NotFoundException;

/**
 * Relaciona cada ruta (método + URL) con el método de un controlador.
 * Soporta parámetros como /reservas/{id} y middlewares por ruta.
 */
final class Router
{
    private array $routes = [];

    public function get(string $path, array $handler, array $middleware = []): void
    {
        $this->add('GET', $path, $handler, $middleware);
    }

    public function post(string $path, array $handler, array $middleware = []): void
    {
        $this->add('POST', $path, $handler, $middleware);
    }

    public function put(string $path, array $handler, array $middleware = []): void
    {
        $this->add('PUT', $path, $handler, $middleware);
    }

    public function patch(string $path, array $handler, array $middleware = []): void
    {
        $this->add('PATCH', $path, $handler, $middleware);
    }

    public function delete(string $path, array $handler, array $middleware = []): void
    {
        $this->add('DELETE', $path, $handler, $middleware);
    }

    public function dispatch(Request $request): void
    {
        $pathExists = false;

        foreach ($this->routes as $route) {
            if (!preg_match($route['pattern'], $request->path, $matches)) {
                continue;
            }
            $pathExists = true;
            if ($route['method'] !== $request->method) {
                continue;
            }

            $request->setParams(array_filter($matches, 'is_string', ARRAY_FILTER_USE_KEY));

            foreach ($route['middleware'] as $middlewareClass) {
                (new $middlewareClass())->handle($request);
            }

            [$controllerClass, $action] = $route['handler'];
            (new $controllerClass())->$action($request);
            return;
        }

        throw $pathExists
            ? new HttpException(405, 'Método no permitido')
            : new NotFoundException('Ruta no encontrada');
    }

    private function add(string $method, string $path, array $handler, array $middleware): void
    {
        $path = '/' . trim($path, '/');
        $pattern = '#^' . preg_replace('#\{(\w+)\}#', '(?P<$1>[^/]+)', $path) . '$#';

        $this->routes[] = [
            'method' => $method,
            'pattern' => $pattern,
            'handler' => $handler,
            'middleware' => $middleware,
        ];
    }
}
