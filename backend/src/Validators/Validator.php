<?php

declare(strict_types=1);

namespace App\Validators;

use App\Exceptions\ValidationException;
use App\Helpers\Fecha;
use App\Helpers\Telefono;

/**
 * Validación fluida de datos de entrada. Guarda el primer error de cada campo.
 *
 *   Validator::make($datos)
 *       ->requerido('email', 'El correo')
 *       ->email('email')
 *       ->validar();
 *
 * Las reglas (salvo requerido) se saltan cuando el campo viene vacío,
 * así un campo opcional solo se valida si se envía.
 */
final class Validator
{
    private array $errores = [];

    private function __construct(private readonly array $data)
    {
    }

    public static function make(array $data): self
    {
        return new self($data);
    }

    public function requerido(string $campo, string $etiqueta): self
    {
        if ($this->vacio($campo)) {
            $this->error($campo, "{$etiqueta} es obligatorio");
        }
        return $this;
    }

    public function texto(string $campo, int $max, int $min = 1, string $etiqueta = 'Este campo'): self
    {
        return $this->regla($campo, function (mixed $v) use ($min, $max, $etiqueta): ?string {
            if (!is_string($v)) {
                return "{$etiqueta} no es válido";
            }
            $largo = mb_strlen(trim($v));
            if ($largo < $min) {
                return "{$etiqueta} debe tener al menos {$min} caracteres";
            }
            return $largo > $max ? "{$etiqueta} admite como máximo {$max} caracteres" : null;
        });
    }

    public function email(string $campo): self
    {
        return $this->regla($campo, fn (mixed $v): ?string =>
            is_string($v) && filter_var(trim($v), FILTER_VALIDATE_EMAIL) ? null : 'Escribe un correo válido, por ejemplo nombre@correo.com');
    }

    public function telefono(string $campo): self
    {
        return $this->regla($campo, fn (mixed $v): ?string =>
            is_string($v) && Telefono::esValido($v) ? null : 'Escribe un celular de 8 dígitos que empiece con 6 o 7');
    }

    public function fecha(string $campo): self
    {
        return $this->regla($campo, fn (mixed $v): ?string =>
            is_string($v) && Fecha::esFecha($v) ? null : 'La fecha no es válida (formato AAAA-MM-DD)');
    }

    public function hora(string $campo): self
    {
        return $this->regla($campo, fn (mixed $v): ?string =>
            is_string($v) && Fecha::esHora($v) ? null : 'La hora no es válida (formato HH:MM)');
    }

    public function entero(string $campo, int $min, int $max, string $etiqueta = 'El valor'): self
    {
        return $this->regla($campo, function (mixed $v) use ($min, $max, $etiqueta): ?string {
            if (filter_var($v, FILTER_VALIDATE_INT) === false) {
                return "{$etiqueta} debe ser un número entero";
            }
            return ((int) $v < $min || (int) $v > $max) ? "{$etiqueta} debe estar entre {$min} y {$max}" : null;
        });
    }

    public function decimal(string $campo, float $min, float $max, string $etiqueta = 'El monto'): self
    {
        return $this->regla($campo, function (mixed $v) use ($min, $max, $etiqueta): ?string {
            if (!is_numeric($v)) {
                return "{$etiqueta} debe ser un número";
            }
            return ((float) $v < $min || (float) $v > $max) ? "{$etiqueta} debe estar entre {$min} y {$max}" : null;
        });
    }

    public function enLista(string $campo, array $permitidos, string $mensaje = 'La opción elegida no es válida'): self
    {
        return $this->regla($campo, fn (mixed $v): ?string =>
            in_array($v, $permitidos, true) ? null : $mensaje);
    }

    public function sinCaracter(string $campo, string $caracter, string $mensaje): self
    {
        return $this->regla($campo, fn (mixed $v): ?string =>
            is_string($v) && !str_contains($v, $caracter) ? null : $mensaje);
    }

    public function igual(string $campo, string $otroCampo, string $mensaje): self
    {
        return $this->regla($campo, fn (mixed $v): ?string =>
            $v === ($this->data[$otroCampo] ?? null) ? null : $mensaje);
    }

    /** Lanza ValidationException si hubo errores. */
    public function validar(): void
    {
        if ($this->errores !== []) {
            throw new ValidationException($this->errores);
        }
    }

    private function regla(string $campo, callable $check): self
    {
        if (!isset($this->errores[$campo]) && !$this->vacio($campo)) {
            $mensaje = $check($this->data[$campo]);
            if ($mensaje !== null) {
                $this->error($campo, $mensaje);
            }
        }
        return $this;
    }

    private function vacio(string $campo): bool
    {
        $v = $this->data[$campo] ?? null;
        return $v === null || (is_string($v) && trim($v) === '') || $v === [];
    }

    private function error(string $campo, string $mensaje): void
    {
        $this->errores[$campo] ??= $mensaje;
    }
}
