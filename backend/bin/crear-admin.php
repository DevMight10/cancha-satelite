<?php

declare(strict_types=1);

/**
 * Crea un administrador (o convierte en administrador una cuenta existente).
 *
 * Uso, desde la carpeta backend/:
 *   php bin/crear-admin.php "Nombre Apellido" correo@ejemplo.com 71234567 "contraseña-segura"
 */

use App\Core\Env;
use App\Helpers\Telefono;
use App\Repositories\UsuarioRepository;
use App\Validators\UsuarioValidator;

require __DIR__ . '/../vendor/autoload.php';

if (PHP_SAPI !== 'cli') {
    exit('Solo desde la línea de comandos.');
}

Env::load(__DIR__ . '/../.env');
date_default_timezone_set(Env::get('APP_TIMEZONE', 'America/La_Paz'));

[, $nombre, $email, $telefono, $password] = $argv + [null, '', '', '', ''];

try {
    UsuarioValidator::registro(compact('nombre', 'email', 'telefono', 'password'));
} catch (App\Exceptions\ValidationException $e) {
    fwrite(STDERR, "Datos inválidos:\n");
    foreach ($e->errores as $campo => $mensaje) {
        fwrite(STDERR, "  - {$campo}: {$mensaje}\n");
    }
    fwrite(STDERR, "Uso: php bin/crear-admin.php \"Nombre\" correo@ejemplo.com 71234567 \"contraseña\"\n");
    exit(1);
}

$usuarios = new UsuarioRepository();
$email = mb_strtolower(trim($email));
$existente = $usuarios->buscarPorEmailConPassword($email);

if ($existente !== null) {
    $usuarios->actualizarRol($existente['id'], 'admin');
    $usuarios->actualizarPassword($existente['id'], password_hash($password, PASSWORD_DEFAULT));
    echo "La cuenta {$email} ahora es administradora (contraseña actualizada).\n";
} else {
    $usuarios->crear(trim($nombre), $email, Telefono::normalizar($telefono), password_hash($password, PASSWORD_DEFAULT), 'admin');
    echo "Administrador {$email} creado.\n";
}
