<?php

declare(strict_types=1);

namespace App\Config;

use App\Core\Env;
use PDO;

/**
 * Conexión única (singleton) a MySQL mediante PDO.
 */
final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection === null) {
            $dsn = sprintf(
                'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
                Env::get('DB_HOST', '127.0.0.1'),
                Env::get('DB_PORT', '3306'),
                Env::get('DB_DATABASE')
            );

            self::$connection = new PDO($dsn, Env::get('DB_USERNAME'), (string) Env::get('DB_PASSWORD', ''), [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]);

            // MySQL usa la misma zona horaria que PHP (America/La_Paz = -04:00)
            self::$connection->exec("SET time_zone = '" . date('P') . "'");
        }

        return self::$connection;
    }
}
