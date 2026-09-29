<?php

declare(strict_types=1);

namespace App\Helpers;

/**
 * Celulares de Bolivia: 8 dígitos que empiezan con 6 o 7.
 * Acepta "7123 4567", "+591 71234567", "59171234567"; se guarda "71234567".
 */
final class Telefono
{
    public static function normalizar(string $telefono): string
    {
        $digitos = preg_replace('/\D+/', '', $telefono) ?? '';
        if (strlen($digitos) === 11 && str_starts_with($digitos, '591')) {
            $digitos = substr($digitos, 3);
        }
        return $digitos;
    }

    public static function esValido(string $telefono): bool
    {
        return (bool) preg_match('/^[67]\d{7}$/', self::normalizar($telefono));
    }

    /** Número internacional para enlaces de WhatsApp (wa.me/591XXXXXXXX). */
    public static function internacional(string $telefono): string
    {
        return '591' . self::normalizar($telefono);
    }
}
