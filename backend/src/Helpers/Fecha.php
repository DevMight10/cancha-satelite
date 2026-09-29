<?php

declare(strict_types=1);

namespace App\Helpers;

use DateTimeImmutable;

/**
 * Utilidades de fecha y hora (zona horaria configurada en .env, America/La_Paz).
 */
final class Fecha
{
    public const DIAS = [1 => 'lunes', 2 => 'martes', 3 => 'miércoles', 4 => 'jueves', 5 => 'viernes', 6 => 'sábado', 7 => 'domingo'];

    public static function hoy(): string
    {
        return date('Y-m-d');
    }

    public static function ahora(): string
    {
        return date('Y-m-d H:i:s');
    }

    public static function esFecha(string $valor): bool
    {
        $d = DateTimeImmutable::createFromFormat('!Y-m-d', $valor);
        return $d !== false && $d->format('Y-m-d') === $valor;
    }

    /** Acepta HH:MM o HH:MM:SS. */
    public static function esHora(string $valor): bool
    {
        return (bool) preg_match('/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/', $valor);
    }

    /** Normaliza una hora a HH:MM:SS. */
    public static function hora(string $valor): string
    {
        return strlen($valor) === 5 ? $valor . ':00' : $valor;
    }

    /** Día de la semana ISO: 1 = lunes ... 7 = domingo. */
    public static function diaSemana(string $fecha): int
    {
        return (int) (new DateTimeImmutable($fecha))->format('N');
    }

    public static function sumarDias(string $fecha, int $dias): string
    {
        return (new DateTimeImmutable($fecha))->modify(($dias >= 0 ? '+' : '') . $dias . ' days')->format('Y-m-d');
    }

    public static function sumarMinutos(string $fechaHora, int $minutos): string
    {
        return (new DateTimeImmutable($fechaHora))->modify('+' . $minutos . ' minutes')->format('Y-m-d H:i:s');
    }

    /** Minutos desde medianoche de una hora HH:MM(:SS). */
    public static function aMinutos(string $hora): int
    {
        [$h, $m] = array_map('intval', explode(':', $hora));
        return $h * 60 + $m;
    }

    public static function deMinutos(int $minutos): string
    {
        return sprintf('%02d:%02d:00', intdiv($minutos, 60), $minutos % 60);
    }

    /** "sábado 4 de octubre" */
    public static function legible(string $fecha): string
    {
        static $meses = [1 => 'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        $d = new DateTimeImmutable($fecha);
        return self::DIAS[(int) $d->format('N')] . ' ' . $d->format('j') . ' de ' . $meses[(int) $d->format('n')];
    }
}
