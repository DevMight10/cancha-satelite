<?php

declare(strict_types=1);

namespace App\Helpers;

use App\Core\Env;
use RuntimeException;

/**
 * Cliente SMTP mínimo (sin dependencias) para enviar correos HTML.
 * Local: Mailpit de Laragon (127.0.0.1:1025, sin autenticación; bandeja en http://localhost:8025).
 * Producción: el SMTP del hosting o de Gmail (MAIL_ENCRYPTION=tls y usuario/contraseña).
 */
final class Mailer
{
    /** @var resource|null */
    private $socket = null;

    public function enviar(string $para, string $asunto, string $html): void
    {
        $host = (string) Env::get('MAIL_HOST', '127.0.0.1');
        $puerto = (int) Env::get('MAIL_PORT', '1025');
        $cifrado = strtolower((string) Env::get('MAIL_ENCRYPTION', 'none'));
        $usuario = (string) Env::get('MAIL_USERNAME', '');
        $clave = (string) Env::get('MAIL_PASSWORD', '');
        $de = (string) Env::get('MAIL_FROM', 'no-responder@cancha-satelite.test');
        $nombreDe = (string) Env::get('MAIL_FROM_NAME', 'Cancha Satélite Norte');

        $destino = ($cifrado === 'ssl' ? 'ssl://' : 'tcp://') . "{$host}:{$puerto}";
        $socket = @stream_socket_client($destino, $errno, $error, 8);
        if ($socket === false) {
            throw new RuntimeException("No se pudo conectar al servidor de correo {$host}:{$puerto} ({$error})");
        }
        $this->socket = $socket;
        stream_set_timeout($socket, 8);

        try {
            $this->esperar(220);
            $this->comando('EHLO ' . (gethostname() ?: 'localhost'), 250);
            if ($cifrado === 'tls') {
                $this->comando('STARTTLS', 220);
                if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                    throw new RuntimeException('No se pudo iniciar TLS con el servidor de correo');
                }
                $this->comando('EHLO ' . (gethostname() ?: 'localhost'), 250);
            }
            if ($usuario !== '') {
                $this->comando('AUTH LOGIN', 334);
                $this->comando(base64_encode($usuario), 334);
                $this->comando(base64_encode($clave), 235);
            }
            $this->comando("MAIL FROM:<{$de}>", 250);
            $this->comando("RCPT TO:<{$para}>", [250, 251]);
            $this->comando('DATA', 354);

            $cabeceras = [
                'From: ' . $this->codificar($nombreDe) . " <{$de}>",
                "To: <{$para}>",
                'Subject: ' . $this->codificar($asunto),
                'Date: ' . date('r'),
                'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . (explode('@', $de)[1] ?? 'localhost') . '>',
                'MIME-Version: 1.0',
                'Content-Type: text/html; charset=UTF-8',
                'Content-Transfer-Encoding: base64',
            ];
            $cuerpo = implode("\r\n", $cabeceras) . "\r\n\r\n" . rtrim(chunk_split(base64_encode($html), 76, "\r\n"));
            $this->comando($cuerpo . "\r\n.", 250);
            $this->comando('QUIT', 221);
        } finally {
            fclose($socket);
            $this->socket = null;
        }
    }

    private function codificar(string $texto): string
    {
        return '=?UTF-8?B?' . base64_encode($texto) . '?=';
    }

    private function comando(string $linea, int|array $esperado): void
    {
        fwrite($this->socket, $linea . "\r\n");
        $this->esperar($esperado);
    }

    private function esperar(int|array $esperado): void
    {
        $respuesta = '';
        while (($linea = fgets($this->socket, 515)) !== false) {
            $respuesta .= $linea;
            if (isset($linea[3]) && $linea[3] === ' ') {
                break;
            }
        }
        $codigo = (int) substr($respuesta, 0, 3);
        if (!in_array($codigo, (array) $esperado, true)) {
            throw new RuntimeException('El servidor de correo respondió: ' . trim($respuesta));
        }
    }
}
