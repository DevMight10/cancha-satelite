<?php

declare(strict_types=1);

namespace App\Services;

use App\Core\Env;
use App\Helpers\Fecha;
use App\Helpers\Mailer;
use App\Repositories\ConfiguracionRepository;
use App\Repositories\NotificacionRepository;
use App\Repositories\UsuarioRepository;
use Throwable;

/**
 * Avisos por correo al cliente y a la administración cuando cambia una reserva.
 * Un error al enviar NUNCA interrumpe la operación: se registra en la tabla notificaciones.
 * (WhatsApp se ofrece como enlace con mensaje prellenado desde la interfaz.)
 */
class NotificacionService
{
    public function __construct(
        private readonly Mailer $mailer = new Mailer(),
        private readonly NotificacionRepository $registro = new NotificacionRepository(),
        private readonly ConfiguracionRepository $config = new ConfiguracionRepository(),
    ) {
    }

    public function reservaCreada(array $r): void
    {
        $limite = $r['expira_en'] ? substr($r['expira_en'], 11, 5) : null;
        $this->alCliente($r, 'reserva_creada', "Reserva #{$r['id']} recibida: falta el pago", $this->plantilla(
            'Recibimos tu reserva',
            'Tu horario está apartado' . ($limite ? " hasta las <strong>{$limite}</strong>" : '') .
            '. Paga con QR, Tigo Money o transferencia y envía el comprobante para confirmarla.',
            $r,
            ['Pagar mi reserva', "/pages/usuario/pagar.html?reserva={$r['id']}"]
        ));
    }

    public function comprobanteRecibido(array $r, array $pago): void
    {
        $destinos = array_unique(array_filter([
            $this->config->obtener('negocio_email'),
            ...(new UsuarioRepository())->emailsAdministradores(),
        ]));
        $html = $this->plantilla(
            'Nuevo comprobante por revisar',
            'El cliente <strong>' . $this->e($r['cliente_nombre']) . '</strong> (' . $this->e($r['cliente_telefono']) .
            ') envió un comprobante. Revísalo y apruébalo o recházalo.',
            $r,
            ['Revisar pagos', '/pages/admin/pagos.html']
        );
        foreach ($destinos as $email) {
            $this->enviar($r['id'], 'comprobante_recibido', $email, "Comprobante por revisar · Reserva #{$r['id']}", $html);
        }
    }

    public function pagoAprobado(array $r): void
    {
        $this->alCliente($r, 'pago_aprobado', "¡Reserva #{$r['id']} confirmada!", $this->plantilla(
            '¡Reserva confirmada!',
            'Recibimos tu pago. Tu horario está asegurado. Nos vemos en la cancha.',
            $r,
            ['Ver mis reservas', '/pages/usuario/mis-reservas.html']
        ));
    }

    public function pagoRechazado(array $r, string $motivo): void
    {
        $this->alCliente($r, 'pago_rechazado', "Revisa el pago de tu reserva #{$r['id']}", $this->plantilla(
            'Tu comprobante fue rechazado',
            'Motivo: <strong>' . $this->e($motivo) . '</strong>. Tu horario sigue apartado por un tiempo: envía un comprobante nuevo.',
            $r,
            ['Enviar nuevo comprobante', "/pages/usuario/pagar.html?reserva={$r['id']}"]
        ));
    }

    public function reservaCancelada(array $r): void
    {
        $quien = $r['cancelada_por'] === 'admin' ? 'La cancha canceló tu reserva' : 'Cancelaste tu reserva';
        $motivo = $r['motivo_cancelacion'] ? ' Motivo: <strong>' . $this->e($r['motivo_cancelacion']) . '</strong>.' : '';
        $this->alCliente($r, 'reserva_cancelada', "Reserva #{$r['id']} cancelada", $this->plantilla(
            $quien,
            "El horario quedó libre.{$motivo} Si ya habías pagado, comunícate con la cancha para coordinar la devolución.",
            $r,
            ['Hacer otra reserva', '/pages/reservar.html']
        ));
    }

    private function alCliente(array $r, string $tipo, string $asunto, string $html): void
    {
        if (!empty($r['cliente_email'])) {
            $this->enviar($r['id'], $tipo, $r['cliente_email'], $asunto, $html);
        }
    }

    private function enviar(?int $reservaId, string $tipo, string $para, string $asunto, string $html): void
    {
        if ($this->config->obtener('notificar_email', '1') !== '1') {
            return;
        }
        try {
            $this->mailer->enviar($para, $asunto, $html);
            $this->registro->registrar($reservaId, 'email', $tipo, $para, $asunto, 'enviada');
        } catch (Throwable $e) {
            try {
                $this->registro->registrar($reservaId, 'email', $tipo, $para, $asunto, 'fallida', $e->getMessage());
            } catch (Throwable) {
                // Si ni siquiera se puede registrar, no se interrumpe la reserva
            }
        }
    }

    /** Correo HTML con estilos en línea (los clientes de correo no leen CSS externo). */
    private function plantilla(string $titulo, string $mensajeHtml, array $r, array $boton): string
    {
        $url = rtrim((string) Env::get('APP_URL', 'http://cancha-satelite.test'), '/') . $boton[1];
        $nombre = $this->e($this->config->obtener('negocio_nombre', 'Cancha Satélite Norte'));
        $fecha = ucfirst(Fecha::legible($r['fecha']));
        $horas = substr($r['hora_inicio'], 0, 5) . ' – ' . substr($r['hora_fin'], 0, 5);
        $monto = 'Bs ' . rtrim(rtrim(number_format((float) $r['precio'], 2, ',', '.'), '0'), ',');

        return <<<HTML
<!DOCTYPE html>
<html lang="es"><body style="margin:0;background:#f3f4ef;font-family:Arial,Helvetica,sans-serif;color:#0f1a14">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4ef;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:10px;overflow:hidden">
        <tr><td style="background:#07140d;padding:18px 24px;color:#f4f6ee;font-weight:bold;font-size:18px;letter-spacing:1px;text-transform:uppercase">
          {$nombre}
        </td></tr>
        <tr><td style="padding:24px">
          <h1 style="margin:0 0 12px;font-size:22px">{$this->e($titulo)}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#37443c">{$mensajeHtml}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#07140d;border-radius:8px;color:#f4f6ee">
            <tr><td style="padding:16px 20px">
              <div style="color:#ffb23f;font-size:12px;font-weight:bold;letter-spacing:1px">RESERVA #{$r['id']}</div>
              <div style="font-size:15px;margin-top:6px">{$fecha}</div>
              <div style="font-size:30px;font-weight:bold;color:#ffb23f;margin-top:2px">{$horas}</div>
              <div style="font-size:15px;margin-top:6px">Total: <strong>{$monto}</strong></div>
            </td></tr>
          </table>
          <p style="margin:24px 0 0"><a href="{$url}" style="display:inline-block;background:#15803d;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px">{$this->e($boton[0])}</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>
HTML;
    }

    private function e(string $texto): string
    {
        return htmlspecialchars($texto, ENT_QUOTES, 'UTF-8');
    }
}
