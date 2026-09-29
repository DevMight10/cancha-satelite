<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Config\Database;
use App\Core\Request;
use App\Core\Response;
use PDOException;

/**
 * Verifica que la API y la base de datos estén funcionando.
 */
final class SaludController
{
    public function index(Request $request): void
    {
        try {
            Database::connection()->query('SELECT 1');
            $baseDeDatos = 'conectada';
        } catch (PDOException) {
            $baseDeDatos = 'sin conexión';
        }

        Response::json([
            'api' => 'ok',
            'base_de_datos' => $baseDeDatos,
            'hora_servidor' => date('Y-m-d H:i:s'),
        ]);
    }
}
