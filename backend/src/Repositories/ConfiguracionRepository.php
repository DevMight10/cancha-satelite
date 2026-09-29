<?php

declare(strict_types=1);

namespace App\Repositories;

/**
 * Configuración clave/valor (datos del negocio, reglas de reserva, medios de pago).
 */
final class ConfiguracionRepository extends Repository
{
    private static ?array $cache = null;

    /** @return array<string, string> */
    public function todas(): array
    {
        if (self::$cache === null) {
            $filas = $this->fetchAll('SELECT clave, valor FROM configuracion');
            self::$cache = array_column($filas, 'valor', 'clave');
        }
        return self::$cache;
    }

    public function obtener(string $clave, string $porDefecto = ''): string
    {
        return (string) ($this->todas()[$clave] ?? $porDefecto);
    }

    public function entero(string $clave, int $porDefecto): int
    {
        $valor = $this->obtener($clave);
        return ctype_digit($valor) ? (int) $valor : $porDefecto;
    }

    /** @param array<string, string> $valores */
    public function guardar(array $valores): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO configuracion (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)'
        );
        foreach ($valores as $clave => $valor) {
            $stmt->execute([$clave, $valor]);
        }
        self::$cache = null;
    }

    // Reglas de reserva con sus valores por defecto
    public function diasAnticipacion(): int { return $this->entero('reserva_dias_anticipacion', 14); }
    public function minutosParaPagar(): int { return $this->entero('reserva_minutos_pago', 30); }
    public function horasMinimasCancelacion(): int { return $this->entero('reserva_horas_cancelacion', 3); }
}
