<?php

declare(strict_types=1);

namespace App\Config;

use Throwable;

/**
 * Ejecuta una función dentro de una transacción: confirma si todo sale bien,
 * deshace todo si ocurre cualquier error.
 */
final class Transaction
{
    public static function run(callable $fn): mixed
    {
        $db = Database::connection();
        $db->beginTransaction();
        try {
            $result = $fn();
            $db->commit();
            return $result;
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
    }
}
