<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Config\Database;
use PDO;

/**
 * Base de los repositorios: solo acceso a datos con consultas preparadas.
 */
abstract class Repository
{
    protected PDO $db;

    public function __construct(?PDO $db = null)
    {
        $this->db = $db ?? Database::connection();
    }

    protected function fetchOne(string $sql, array $params = []): ?array
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row === false ? null : $row;
    }

    protected function fetchAll(string $sql, array $params = []): array
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    protected function execute(string $sql, array $params = []): int
    {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    protected function insert(string $sql, array $params = []): int
    {
        $this->execute($sql, $params);
        return (int) $this->db->lastInsertId();
    }
}
