-- =============================================================================
--  Cancha Satélite Norte · Instalación de la base de datos
--  Generado el 2026-10-02
--
--  Cómo usarlo: en phpMyAdmin (http://localhost/phpmyadmin), SIN elegir ninguna
--  base de datos, abre la pestaña "Importar", elige este archivo y pulsa "Importar".
--
--  Crea:
--    · la base de datos `cancha_satelite` con todas sus tablas
--    · el usuario de MySQL que usa el sistema: cancha_app
--    · el administrador del sistema: admin123 (contraseña admin123)
--    · un horario, precios y reglas de ejemplo (se cambian desde Configuración)
--
--  Si la base ya existe, no borra nada: solo crea lo que falte.
-- =============================================================================

SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `cancha_satelite`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `cancha_satelite`;

-- ---------------------------------------------------------------------------
-- Usuarios (clientes y administradores)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL,
  telefono       VARCHAR(8)   NOT NULL COMMENT 'Celular boliviano de 8 dígitos',
  password_hash  VARCHAR(255) NOT NULL,
  rol            ENUM('cliente','admin') NOT NULL DEFAULT 'cliente',
  activo         TINYINT(1) NOT NULL DEFAULT 1,
  creado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_email (email),
  UNIQUE KEY uq_usuarios_nombre (nombre) COMMENT 'El nombre de usuario también sirve para iniciar sesión'
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Canchas (hoy hay una; la tabla permite sumar más canchas en el futuro)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS canchas (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre           VARCHAR(100) NOT NULL,
  descripcion      VARCHAR(255) NULL,
  duracion_turno   SMALLINT UNSIGNED NOT NULL DEFAULT 60 COMMENT 'Minutos por turno',
  activa           TINYINT(1) NOT NULL DEFAULT 1,
  creado_en        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Horario de apertura por día de la semana (1 = lunes ... 7 = domingo)
CREATE TABLE IF NOT EXISTS horarios_apertura (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cancha_id     INT UNSIGNED NOT NULL,
  dia_semana    TINYINT UNSIGNED NOT NULL,
  hora_apertura TIME NOT NULL,
  hora_cierre   TIME NOT NULL,
  cerrado       TINYINT(1) NOT NULL DEFAULT 0,
  UNIQUE KEY uq_horario_dia (cancha_id, dia_semana),
  CONSTRAINT fk_horarios_cancha FOREIGN KEY (cancha_id) REFERENCES canchas(id) ON DELETE CASCADE,
  CONSTRAINT chk_horario_dia CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT chk_horario_rango CHECK (hora_cierre > hora_apertura)
) ENGINE=InnoDB;

-- Tarifas por franja horaria y días. Si varias coinciden, se cobra la más alta.
CREATE TABLE IF NOT EXISTS tarifas (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cancha_id   INT UNSIGNED NOT NULL,
  nombre      VARCHAR(60) NOT NULL,
  dias        SET('1','2','3','4','5','6','7') NOT NULL COMMENT '1 = lunes ... 7 = domingo',
  hora_desde  TIME NOT NULL,
  hora_hasta  TIME NOT NULL,
  precio      DECIMAL(8,2) NOT NULL,
  activa      TINYINT(1) NOT NULL DEFAULT 1,
  creado_en   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tarifas_cancha FOREIGN KEY (cancha_id) REFERENCES canchas(id) ON DELETE CASCADE,
  CONSTRAINT chk_tarifa_rango CHECK (hora_hasta > hora_desde),
  CONSTRAINT chk_tarifa_precio CHECK (precio > 0)
) ENGINE=InnoDB;

-- Días en que la cancha no atiende (feriados, mantenimiento, eventos)
CREATE TABLE IF NOT EXISTS dias_bloqueados (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cancha_id  INT UNSIGNED NOT NULL,
  fecha      DATE NOT NULL,
  motivo     VARCHAR(150) NOT NULL,
  creado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_bloqueo_fecha (cancha_id, fecha),
  CONSTRAINT fk_bloqueos_cancha FOREIGN KEY (cancha_id) REFERENCES canchas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Configuración general en formato clave/valor (datos del negocio, reglas, medios de pago)
CREATE TABLE IF NOT EXISTS configuracion (
  clave          VARCHAR(60) PRIMARY KEY,
  valor          TEXT NULL,
  actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Reservas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reservas (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  cancha_id           INT UNSIGNED NOT NULL,
  usuario_id          INT UNSIGNED NULL COMMENT 'NULL en reservas presenciales sin cuenta',
  cliente_nombre      VARCHAR(100) NOT NULL,
  cliente_telefono    VARCHAR(8)   NOT NULL,
  cliente_email       VARCHAR(150) NULL,
  fecha               DATE NOT NULL,
  hora_inicio         TIME NOT NULL,
  hora_fin            TIME NOT NULL,
  precio              DECIMAL(8,2) NOT NULL COMMENT 'Precio al momento de reservar',
  estado              ENUM('pendiente_pago','en_revision','confirmada','cancelada','expirada') NOT NULL DEFAULT 'pendiente_pago',
  origen              ENUM('web','presencial') NOT NULL DEFAULT 'web',
  expira_en           DATETIME NULL COMMENT 'Límite para pagar; NULL = no vence',
  cancelada_en        DATETIME NULL,
  cancelada_por       ENUM('cliente','admin') NULL,
  motivo_cancelacion  VARCHAR(255) NULL,
  creado_por          INT UNSIGNED NULL COMMENT 'Administrador que registró una reserva presencial',
  creado_en           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- 1 mientras la reserva ocupa el horario; NULL si se canceló o venció.
  -- Como UNIQUE admite varios NULL, un horario liberado se puede volver a reservar,
  -- pero NUNCA puede haber dos reservas activas en el mismo turno (regla principal del sistema).
  ocupa_horario       TINYINT GENERATED ALWAYS AS (IF(estado IN ('cancelada','expirada'), NULL, 1)) STORED,

  UNIQUE KEY uq_reserva_turno (cancha_id, fecha, hora_inicio, ocupa_horario),
  KEY idx_reservas_fecha (cancha_id, fecha),
  KEY idx_reservas_usuario (usuario_id),
  KEY idx_reservas_estado (estado, expira_en),
  CONSTRAINT fk_reservas_cancha  FOREIGN KEY (cancha_id)  REFERENCES canchas(id),
  CONSTRAINT fk_reservas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_reservas_admin   FOREIGN KEY (creado_por) REFERENCES usuarios(id),
  CONSTRAINT chk_reserva_rango CHECK (hora_fin > hora_inicio)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Pagos (comprobantes digitales y cobros en efectivo)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pagos (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reserva_id      INT UNSIGNED NOT NULL,
  metodo          ENUM('qr','tigo_money','transferencia','efectivo') NOT NULL,
  monto           DECIMAL(8,2) NOT NULL,
  referencia      VARCHAR(60)  NULL COMMENT 'Número de transacción que informa el cliente',
  comprobante     VARCHAR(255) NULL COMMENT 'Archivo en backend/storage/uploads/comprobantes',
  estado          ENUM('pendiente','aprobado','rechazado') NOT NULL DEFAULT 'pendiente',
  observacion     VARCHAR(255) NULL COMMENT 'Motivo de rechazo u otra nota del administrador',
  registrado_por  INT UNSIGNED NULL COMMENT 'Administrador que registró un cobro en efectivo',
  revisado_por    INT UNSIGNED NULL,
  revisado_en     DATETIME NULL,
  creado_en       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pagos_reserva (reserva_id),
  KEY idx_pagos_estado (estado),
  CONSTRAINT fk_pagos_reserva   FOREIGN KEY (reserva_id)     REFERENCES reservas(id),
  CONSTRAINT fk_pagos_registro  FOREIGN KEY (registrado_por) REFERENCES usuarios(id),
  CONSTRAINT fk_pagos_revisor   FOREIGN KEY (revisado_por)   REFERENCES usuarios(id),
  CONSTRAINT chk_pago_monto CHECK (monto > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Registro de notificaciones enviadas (correo) para auditoría
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificaciones (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  reserva_id    INT UNSIGNED NULL,
  canal         ENUM('email','whatsapp') NOT NULL,
  tipo          VARCHAR(40)  NOT NULL,
  destinatario  VARCHAR(150) NOT NULL,
  asunto        VARCHAR(200) NULL,
  estado        ENUM('enviada','fallida') NOT NULL,
  error         VARCHAR(255) NULL,
  creado_en     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notificaciones_reserva (reserva_id),
  CONSTRAINT fk_notificaciones_reserva FOREIGN KEY (reserva_id) REFERENCES reservas(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Datos iniciales (editables desde el panel: Configuración)
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO canchas (id, nombre, descripcion, duracion_turno)
VALUES (1, 'Cancha Satélite Norte', 'Cancha de césped sintético', 60);

-- Horario: todos los días de 08:00 a 23:00 (1 = lunes ... 7 = domingo)
INSERT IGNORE INTO horarios_apertura (cancha_id, dia_semana, hora_apertura, hora_cierre, cerrado) VALUES
  (1, 1, '08:00', '23:00', 0), (1, 2, '08:00', '23:00', 0), (1, 3, '08:00', '23:00', 0),
  (1, 4, '08:00', '23:00', 0), (1, 5, '08:00', '23:00', 0), (1, 6, '08:00', '23:00', 0),
  (1, 7, '08:00', '23:00', 0);

-- Precios por turno (si varias tarifas coinciden, se cobra la más alta)
INSERT INTO tarifas (cancha_id, nombre, dias, hora_desde, hora_hasta, precio)
SELECT * FROM (
  SELECT 1 AS cancha_id, 'Día (lunes a viernes)' AS nombre, '1,2,3,4,5' AS dias, '08:00' AS desde, '18:00' AS hasta, 100.00 AS precio UNION ALL
  SELECT 1, 'Noche (lunes a viernes)', '1,2,3,4,5', '18:00', '23:00', 150.00 UNION ALL
  SELECT 1, 'Fin de semana', '6,7', '08:00', '23:00', 160.00
) AS t
WHERE NOT EXISTS (SELECT 1 FROM tarifas);

-- Datos del negocio y reglas. Los medios de pago quedan vacíos: se completan en Configuración.
-- Los avisos por correo empiezan desactivados (hace falta configurar un correo en backend/.env).
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
  ('notificar_email',           '0');

-- Administrador del sistema: usuario admin123, contraseña admin123 (cámbiala después)
INSERT IGNORE INTO usuarios (nombre, email, telefono, password_hash, rol)
VALUES ('Administrador', 'admin123', '70000000', '$2y$10$lcKVHyWKqF2bD5A4OvVMTeABw9SWUTKc.CCei72LRGHnuFqzx6GYi', 'admin');

-- ---------------------------------------------------------------------------
-- Usuario de MySQL que usa el sistema (su contraseña está en backend/.env)
-- ---------------------------------------------------------------------------
CREATE USER IF NOT EXISTS 'cancha_app'@'localhost' IDENTIFIED BY 'CanchaSatelite2026';
CREATE USER IF NOT EXISTS 'cancha_app'@'127.0.0.1' IDENTIFIED BY 'CanchaSatelite2026';
GRANT SELECT, INSERT, UPDATE, DELETE ON `cancha_satelite`.* TO 'cancha_app'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON `cancha_satelite`.* TO 'cancha_app'@'127.0.0.1';
FLUSH PRIVILEGES;
