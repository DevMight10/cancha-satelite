<?php

declare(strict_types=1);

namespace App\Helpers;

use App\Exceptions\ValidationException;
use RuntimeException;

/**
 * Guarda archivos subidos validando el tipo REAL del contenido (no la extensión).
 */
final class Archivo
{
    public const IMAGENES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    public const IMAGENES_Y_PDF = self::IMAGENES + ['application/pdf' => 'pdf'];

    public static function directorio(string $subcarpeta): string
    {
        $dir = dirname(__DIR__, 2) . '/storage/uploads/' . $subcarpeta;
        if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
            throw new RuntimeException("No se pudo crear la carpeta {$dir}");
        }
        return $dir;
    }

    /**
     * @param array  $archivo    elemento de $_FILES
     * @param array  $permitidos mime => extensión
     * @return string nombre del archivo guardado (aleatorio)
     */
    public static function guardar(?array $archivo, string $subcarpeta, string $campo, array $permitidos, int $maxMb = 5): string
    {
        if ($archivo === null) {
            throw ValidationException::campo($campo, 'Adjunta el archivo');
        }
        if ($archivo['error'] === UPLOAD_ERR_INI_SIZE || $archivo['error'] === UPLOAD_ERR_FORM_SIZE || $archivo['size'] > $maxMb * 1024 * 1024) {
            throw ValidationException::campo($campo, "El archivo pesa más de {$maxMb} MB");
        }
        if ($archivo['error'] !== UPLOAD_ERR_OK || !is_uploaded_file($archivo['tmp_name'])) {
            throw ValidationException::campo($campo, 'No se pudo recibir el archivo. Intenta de nuevo.');
        }

        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($archivo['tmp_name']);
        if (!isset($permitidos[$mime])) {
            $tipos = implode(', ', array_map('strtoupper', array_unique($permitidos)));
            throw ValidationException::campo($campo, "Formato no permitido. Usa {$tipos}.");
        }

        $nombre = bin2hex(random_bytes(16)) . '.' . $permitidos[$mime];
        if (!move_uploaded_file($archivo['tmp_name'], self::directorio($subcarpeta) . '/' . $nombre)) {
            throw new RuntimeException('No se pudo guardar el archivo subido');
        }
        return $nombre;
    }

    public static function ruta(string $subcarpeta, string $nombre): ?string
    {
        $ruta = self::directorio($subcarpeta) . '/' . basename($nombre);
        return is_file($ruta) ? $ruta : null;
    }

    public static function eliminar(string $subcarpeta, string $nombre): void
    {
        $ruta = self::ruta($subcarpeta, $nombre);
        if ($ruta !== null) {
            unlink($ruta);
        }
    }
}
