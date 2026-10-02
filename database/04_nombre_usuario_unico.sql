-- El nombre de usuario pasa a ser único: también sirve para iniciar sesión.
-- Para bases creadas antes de este cambio (02_esquema.sql ya lo incluye). Se puede ejecutar varias veces.
-- Si falla con "Duplicate entry", hay dos cuentas con el mismo nombre: cambia uno antes de ejecutarlo.

SET NAMES utf8mb4;
USE cancha_satelite;

SET @existe := (SELECT COUNT(*) FROM information_schema.statistics
                WHERE table_schema = DATABASE() AND table_name = 'usuarios' AND index_name = 'uq_usuarios_nombre');
SET @sql := IF(@existe = 0, 'ALTER TABLE usuarios ADD UNIQUE KEY uq_usuarios_nombre (nombre)', 'SELECT 1');
PREPARE paso FROM @sql;
EXECUTE paso;
DEALLOCATE PREPARE paso;
