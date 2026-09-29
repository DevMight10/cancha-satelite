<?php

declare(strict_types=1);

namespace App\Services;

use App\Config\Transaction;
use App\Exceptions\ConflictException;
use App\Exceptions\NotFoundException;
use App\Helpers\Archivo;
use App\Helpers\Fecha;
use App\Repositories\ConfiguracionRepository;
use App\Repositories\PagoRepository;
use App\Repositories\ReservaRepository;
use App\Validators\Validator;

/**
 * Pagos: el cliente envía su comprobante y la administración lo aprueba o rechaza.
 */
final class PagoService
{
    public const METODOS_DIGITALES = ['qr', 'tigo_money', 'transferencia'];

    public function __construct(
        private readonly PagoRepository $pagos = new PagoRepository(),
        private readonly ReservaRepository $reservas = new ReservaRepository(),
        private readonly ConfiguracionRepository $config = new ConfiguracionRepository(),
        private readonly NotificacionService $notificaciones = new NotificacionService(),
    ) {
    }

    /**
     * El cliente envía el comprobante de un pago digital.
     * La reserva pasa a "en revisión" y deja de vencer mientras se revisa.
     */
    public function enviarComprobante(array $usuario, int $reservaId, array $datos, ?array $archivo): array
    {
        Validator::make($datos)
            ->requerido('metodo', 'El medio de pago')
            ->enLista('metodo', self::METODOS_DIGITALES, 'Elige QR, Tigo Money o transferencia')
            ->texto('referencia', 60, 1, 'El número de transacción')
            ->validar();

        $this->reservas->expirarVencidas();

        // El archivo se guarda antes de la transacción; si algo falla después, se borra
        $nombre = Archivo::guardar($archivo, 'comprobantes', 'comprobante', Archivo::IMAGENES_Y_PDF);

        try {
            return Transaction::run(function () use ($usuario, $reservaId, $datos, $nombre): array {
                $reserva = $this->reservas->buscarPorId($reservaId, true);
                if ($reserva === null || $reserva['usuario_id'] !== $usuario['id']) {
                    throw new NotFoundException('La reserva no existe');
                }
                if ($reserva['estado'] === 'expirada') {
                    throw new ConflictException('El plazo para pagar venció y el horario se liberó. Haz una nueva reserva.');
                }
                if ($reserva['estado'] !== 'pendiente_pago') {
                    throw new ConflictException('Esta reserva no tiene pagos pendientes');
                }
                if ($this->pagos->tienePendiente($reservaId)) {
                    throw new ConflictException('Ya enviaste un comprobante; la cancha lo está revisando');
                }

                $referencia = trim((string) ($datos['referencia'] ?? ''));
                $pagoId = $this->pagos->crear($reservaId, $datos['metodo'], $reserva['precio'], $referencia !== '' ? $referencia : null, $nombre);
                $this->reservas->cambiarEstado($reservaId, 'en_revision', null);

                $actualizada = $this->reservas->buscarPorId($reservaId);
                $this->notificaciones->comprobanteRecibido($actualizada, $this->pagos->buscarPorId($pagoId));
                return $actualizada;
            });
        } catch (\Throwable $e) {
            Archivo::eliminar('comprobantes', $nombre);
            throw $e;
        }
    }

    /** Aprobar: el pago queda aprobado y la reserva confirmada. */
    public function aprobar(array $admin, int $pagoId): array
    {
        return Transaction::run(function () use ($admin, $pagoId): array {
            [$pago, $reserva] = $this->pagoPendiente($pagoId);
            $this->pagos->revisar($pagoId, 'aprobado', $admin['id'], null);
            $this->reservas->cambiarEstado($reserva['id'], 'confirmada', null);

            $actualizada = $this->reservas->buscarPorId($reserva['id']);
            $this->notificaciones->pagoAprobado($actualizada);
            return $actualizada;
        });
    }

    /**
     * Rechazar: el pago queda rechazado con motivo y la reserva vuelve a
     * "pendiente de pago" con un plazo nuevo para que el cliente envíe otro comprobante.
     */
    public function rechazar(array $admin, int $pagoId, string $motivo): array
    {
        Validator::make(['motivo' => $motivo])->requerido('motivo', 'El motivo')->texto('motivo', 255, 3, 'El motivo')->validar();

        return Transaction::run(function () use ($admin, $pagoId, $motivo): array {
            [, $reserva] = $this->pagoPendiente($pagoId);
            $this->pagos->revisar($pagoId, 'rechazado', $admin['id'], trim($motivo));
            $expira = $reserva['origen'] === 'web'
                ? Fecha::sumarMinutos(Fecha::ahora(), $this->config->minutosParaPagar())
                : null;
            $this->reservas->cambiarEstado($reserva['id'], 'pendiente_pago', $expira);

            $actualizada = $this->reservas->buscarPorId($reserva['id']);
            $this->notificaciones->pagoRechazado($actualizada, trim($motivo));
            return $actualizada;
        });
    }

    /** Cobro en efectivo en la cancha: confirma la reserva al instante. */
    public function cobrarEfectivo(array $admin, int $reservaId): array
    {
        return Transaction::run(function () use ($admin, $reservaId): array {
            $reserva = $this->reservas->buscarPorId($reservaId, true) ?? throw new NotFoundException('La reserva no existe');
            if (!in_array($reserva['estado'], ['pendiente_pago', 'en_revision'], true)) {
                throw new ConflictException('Esta reserva no tiene un pago pendiente');
            }
            if ($this->pagos->tienePendiente($reservaId)) {
                throw new ConflictException('Hay un comprobante por revisar: apruébalo o recházalo primero');
            }
            $this->pagos->registrarEfectivo($reservaId, $reserva['precio'], $admin['id']);
            $this->reservas->cambiarEstado($reservaId, 'confirmada', null);

            $actualizada = $this->reservas->buscarPorId($reservaId);
            $this->notificaciones->pagoAprobado($actualizada);
            return $actualizada;
        });
    }

    /** Ruta del comprobante si el usuario puede verlo (dueño de la reserva o admin). */
    public function archivoComprobante(array $usuario, int $pagoId): string
    {
        $pago = $this->pagos->buscarPorId($pagoId);
        $reserva = $pago === null ? null : $this->reservas->buscarPorId($pago['reserva_id']);
        $puedeVer = $reserva !== null && ($usuario['rol'] === 'admin' || $reserva['usuario_id'] === $usuario['id']);
        $ruta = $puedeVer && $pago['comprobante'] ? Archivo::ruta('comprobantes', $pago['comprobante']) : null;
        if ($ruta === null) {
            throw new NotFoundException('Comprobante no encontrado');
        }
        return $ruta;
    }

    /** @return array{0: array, 1: array} pago pendiente y su reserva (bloqueados) */
    private function pagoPendiente(int $pagoId): array
    {
        $pago = $this->pagos->buscarPorId($pagoId, true) ?? throw new NotFoundException('El pago no existe');
        if ($pago['estado'] !== 'pendiente') {
            throw new ConflictException('Este pago ya fue revisado');
        }
        $reserva = $this->reservas->buscarPorId($pago['reserva_id'], true);
        if (in_array($reserva['estado'], ['cancelada', 'expirada'], true)) {
            throw new ConflictException('La reserva de este pago ya no está activa');
        }
        return [$pago, $reserva];
    }
}
