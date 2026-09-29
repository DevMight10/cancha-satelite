<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;
use App\Core\Response;
use App\Core\Sesion;
use App\Repositories\UsuarioRepository;
use App\Services\AuthService;

final class AuthController
{
    private AuthService $auth;

    public function __construct()
    {
        $this->auth = new AuthService();
    }

    /** POST /auth/registro: crea la cuenta e inicia sesión. */
    public function registro(Request $request): void
    {
        $usuario = $this->auth->registrar($request->body());
        Sesion::iniciar($usuario['id']);
        Response::created(AuthService::publico($usuario));
    }

    /** POST /auth/login */
    public function login(Request $request): void
    {
        $usuario = $this->auth->autenticar($request->body());
        Sesion::iniciar($usuario['id']);
        Response::json(AuthService::publico($usuario));
    }

    /** POST /auth/logout */
    public function logout(Request $request): void
    {
        Sesion::cerrar();
        Response::noContent();
    }

    /** GET /auth/me: usuario de la sesión, o null si no inició sesión. */
    public function me(Request $request): void
    {
        $id = Sesion::usuarioId();
        $usuario = $id === null ? null : (new UsuarioRepository())->buscarPorId($id);
        Response::json($usuario !== null && $usuario['activo'] ? AuthService::publico($usuario) : null);
    }

    /** PUT /auth/perfil */
    public function actualizarPerfil(Request $request): void
    {
        $usuario = $this->auth->actualizarPerfil($request->usuario['id'], $request->body());
        Response::json(AuthService::publico($usuario));
    }
}
