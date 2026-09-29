-- Datos iniciales. Los horarios, precios y datos de pago son DE EJEMPLO:
-- el administrador debe reemplazarlos desde el panel (Configuración).

SET NAMES utf8mb4;
USE cancha_satelite;

INSERT IGNORE INTO canchas (id, nombre, descripcion, duracion_turno)
VALUES (1, 'Cancha Satélite Norte', 'Cancha de césped sintético', 60);

-- Horario de apertura de ejemplo: todos los días de 08:00 a 23:00
INSERT IGNORE INTO horarios_apertura (cancha_id, dia_semana, hora_apertura, hora_cierre, cerrado) VALUES
  (1, 1, '08:00', '23:00', 0),
  (1, 2, '08:00', '23:00', 0),
  (1, 3, '08:00', '23:00', 0),
  (1, 4, '08:00', '23:00', 0),
  (1, 5, '08:00', '23:00', 0),
  (1, 6, '08:00', '23:00', 0),
  (1, 7, '08:00', '23:00', 0);

-- Tarifas de ejemplo (se cobra la más alta que corresponda al turno)
INSERT INTO tarifas (cancha_id, nombre, dias, hora_desde, hora_hasta, precio)
SELECT * FROM (
  SELECT 1 AS cancha_id, 'Diurno (ejemplo)'        AS nombre, '1,2,3,4,5,6,7' AS dias, '08:00' AS desde, '18:00' AS hasta, 100.00 AS precio UNION ALL
  SELECT 1, 'Nocturno (ejemplo)',       '1,2,3,4,5,6,7', '18:00', '23:00', 150.00 UNION ALL
  SELECT 1, 'Fin de semana (ejemplo)',  '6,7',           '08:00', '23:00', 160.00
) AS t
WHERE NOT EXISTS (SELECT 1 FROM tarifas);

-- Configuración general y reglas
INSERT IGNORE INTO configuracion (clave, valor) VALUES
  ('negocio_nombre',            'Cancha Satélite Norte'),
  ('negocio_direccion',         'Satélite Norte'),
  ('negocio_whatsapp',          ''),
  ('negocio_email',             ''),
  ('reserva_dias_anticipacion', '14'),
  ('reserva_minutos_pago',      '30'),
  ('reserva_horas_cancelacion', '3'),
  ('pago_qr_imagen',            ''),
  ('pago_qr_titular',           ''),
  ('pago_tigo_numero',          ''),
  ('pago_tigo_titular',         ''),
  ('pago_banco_nombre',         ''),
  ('pago_banco_cuenta',         ''),
  ('pago_banco_titular',        ''),
  ('notificar_email',           '1');
