# Cancha Satélite Norte: plataforma de reservas y pagos

Plataforma web para reservar y pagar en línea la cancha deportiva de Satélite Norte.
Proyecto de innovación tecnológica · U.E. Bolivariana Juancito Pinto · 2026.

## Funciones

**Clientes**
- Crear cuenta con **nombre de usuario** (único), celular, correo y contraseña.
- Iniciar sesión con el **correo o el nombre de usuario**.
- Portada con la disponibilidad del día en vivo ("Hoy en la cancha"), precios, horario de atención y reglas.
- Reservar: **calendario del mes** (días con horarios libres marcados) y los **horarios del día agrupados
  en Mañana / Tarde / Noche** con su precio; al elegir uno se ve el resumen y se confirma.
- Pago por **QR Simple**, **Tigo Money** o **transferencia**, subiendo la foto del comprobante.
  Solo se muestran los medios que la cancha configuró.
- Mis reservas: próximas e historial, con cancelación según las reglas.
- Avisos por **correo** en cada cambio y enlace de **WhatsApp** a la cancha.

**Administración**
- Cronograma de la semana (reservas de cada día y hora), resumen del día elegido y su agenda.
- Reservas: búsqueda y filtros, registro de **reservas presenciales**, **cobro en efectivo** y cancelación con motivo.
- Pagos: revisar el comprobante y **aprobarlo o rechazarlo** con motivo.
- Configuración: horario de apertura y duración del turno, **precios** por franja y día
  (si varias tarifas coinciden, se cobra la más alta) con vista previa, días bloqueados,
  medios de pago (QR, Tigo Money, banco) y reglas del negocio.
- Reportes: ingresos por día y por mes, ocupación, medios de pago y horarios más usados,
  exportables a **Excel** y **PDF**.
- **Nunca dos reservas activas en el mismo horario** (regla principal, ver más abajo).

## Tecnologías

| Parte | Tecnología |
|---|---|
| Frontend | HTML5, CSS3 propio y JavaScript con módulos ES (sin framework) |
| Backend | API REST en PHP 8.1 o superior, sin framework (autoload PSR-4 con Composer, sin dependencias) |
| Base de datos | MySQL 8 o MariaDB 10.4 o superior |
| Librerías del navegador (CDN) | Lucide (iconos), Chart.js (gráficos), SheetJS (Excel), jsPDF (PDF) |
| Entorno local | XAMPP o Laragon (Apache + MySQL/MariaDB) |

## Estructura

```
cancha-satelite/
├── .htaccess          ← /api/* va al backend, todo lo demás al frontend; protege archivos internos
├── frontend/
│   ├── index.html                 ← portada pública con la disponibilidad del día
│   ├── pages/
│   │   ├── reservar.html          ← calendario, horarios del día y confirmación
│   │   ├── auth/                  ← iniciar sesión y crear cuenta
│   │   ├── usuario/               ← pagar y mis reservas
│   │   └── admin/                 ← cronograma, reservas, pagos, configuración y reportes
│   ├── assets/css/                ← app.css (estilos generales), admin.css, inicio.css
│   └── js/
│       ├── config.js              ← URL de la API y rutas de las páginas
│       ├── api/                   ← ÚNICO lugar que llama al backend (fetch)
│       ├── components/            ← calendario, horarios, marcador de la portada, ticket, cabecera,
│       │                            diálogo, avisos (toast), formularios e ilustración de la cancha
│       ├── core/                  ← arranque de páginas públicas y de administración
│       ├── guards/                ← protección de páginas por sesión y rol
│       ├── pages/                 ← lógica de cada página
│       └── utils/                 ← formatos, DOM seguro, WhatsApp
├── backend/
│   ├── public/index.php           ← punto de entrada único de la API
│   ├── bin/crear-admin.php        ← crea administradores
│   ├── src/
│   │   ├── Config/     Core/      ← conexión, transacciones, router, request, response, sesión
│   │   ├── Routes/api.php         ← todas las rutas
│   │   ├── Middleware/            ← sesión y rol admin
│   │   ├── Controllers/ (+Admin/) ← reciben la petición y responden JSON
│   │   ├── Services/              ← reglas de negocio
│   │   ├── Repositories/          ← consultas SQL (siempre preparadas)
│   │   ├── Validators/  Helpers/  Exceptions/
│   └── storage/
│       ├── logs/                  ← registro de errores
│       └── uploads/               ← comprobantes/ y config/ (QR); no accesibles desde la web
├── database/                      ← scripts SQL numerados (01 a 04)
├── tests/                         ← pruebas de API (*.sh) y de interfaz (ui/*.mjs)
├── docs/diseno/                   ← dirección visual
└── .claude/skills/                ← skills de diseño usadas (ui-ux-pro-max, impeccable)
```

Flujo de una petición: `pages/*.js → js/api/*.js → http.js (fetch) → /api/... → public/index.php → Router → Middleware → Controller → Service → Repository → MySQL`.
Cada capa solo habla con la de abajo: el Controller no escribe SQL y el Repository no decide reglas de negocio.

## Puesta en marcha

El sistema funciona tanto en la raíz de un sitio (`http://cancha-satelite.test`) como dentro de una
subcarpeta (`http://localhost/cancha-satelite/`): el frontend calcula la carpeta desde la ubicación de
`js/config.js` y el backend desde la de `backend/public/index.php`. No hay que configurar nada.

### 1. Servidor web

**Con XAMPP**
1. Copia (o clona) el proyecto en `C:\xampp\htdocs\cancha-satelite`.
2. En el panel de XAMPP inicia **Apache** y **MySQL**. El sistema queda en `http://localhost/cancha-satelite`
   y la base se ve en `http://localhost/phpmyadmin`.

**Con Laragon**: deja el proyecto en `C:\laragon\www\cancha-satelite` y presiona **Iniciar todo**;
Laragon crea `http://cancha-satelite.test`. La base se puede ver en `http://localhost/adminer`.

XAMPP y Laragon usan los mismos puertos (80 y 3306): solo uno puede estar encendido a la vez.

### 2. Base de datos

1. Ejecuta los scripts de `database/` en orden (en phpMyAdmin con **Importar**, o por consola indicando UTF-8):
   ```
   mysql -uroot --default-character-set=utf8mb4 < database/01_crear_base.sql
   mysql -uroot --default-character-set=utf8mb4 < database/02_esquema.sql
   mysql -uroot --default-character-set=utf8mb4 < database/03_datos_iniciales.sql
   mysql -uroot --default-character-set=utf8mb4 < database/04_nombre_usuario_unico.sql
   ```
   `03` carga un horario, precios y reglas **de ejemplo**. `04` solo hace falta en bases creadas
   antes de que el nombre de usuario fuera único; se puede ejecutar siempre.
2. Crea el usuario de MySQL exclusivo del proyecto (no se usa `root`), cambiando `TU_CONTRASEÑA`:
   ```sql
   CREATE USER 'cancha_app'@'localhost' IDENTIFIED BY 'TU_CONTRASEÑA';
   CREATE USER 'cancha_app'@'127.0.0.1' IDENTIFIED BY 'TU_CONTRASEÑA';
   GRANT SELECT, INSERT, UPDATE, DELETE ON cancha_satelite.* TO 'cancha_app'@'localhost', 'cancha_app'@'127.0.0.1';
   ```

### 3. Backend

1. Copia `backend/.env.example` como `backend/.env` y completa:
   `DB_PASSWORD` (la del paso anterior), `APP_URL` (`http://localhost/cancha-satelite` o `http://cancha-satelite.test`)
   y los datos de correo `MAIL_*`.
2. Genera el autoload desde `backend/`: `composer dump-autoload` (crea `backend/vendor/`).
3. Crea el primer administrador desde `backend/`:
   ```
   php bin/crear-admin.php nombre_de_usuario correo@ejemplo.com 71234567 "contraseña-segura"
   ```
4. Abre el sitio, entra con el administrador y completa **Configuración**: horarios, precios,
   QR, Tigo Money, cuenta bancaria, WhatsApp y correo del negocio (ahí llegan los avisos de comprobantes).

**Correos**: con Laragon llegan a **Mailpit** (`http://localhost:8025`). XAMPP no trae un buzón de prueba:
sin un SMTP configurado en `MAIL_*` los avisos no se envían (quedan registrados como fallidos) y el resto
del sistema funciona igual. Se pueden desactivar en Configuración → Reglas y negocio.

**Errores**: con `APP_DEBUG=true` la API muestra el detalle técnico de los errores; ponlo en `false`
antes de mostrar el sistema a otras personas.

## La regla principal: nunca dos reservas en el mismo horario

Se protege en tres niveles:
1. La hora pedida debe ser un turno real del día (horario de apertura, duración y tarifa).
2. Al crear la reserva se bloquean las reservas de ese día (`SELECT … FOR UPDATE`) y se verifica que no se solape.
3. En la base, un índice único sobre `(cancha, fecha, hora_inicio, ocupa_horario)` rechaza cualquier duplicado.
   `ocupa_horario` es una columna generada que vale `NULL` en reservas canceladas o vencidas, así ese horario se puede volver a reservar.

La prueba `tests/03_reservas.sh` envía pedidos **simultáneos** por el mismo turno y verifica que solo uno se crea.

Un turno solo se ofrece si alguna tarifa cubre esa hora: si el horario de apertura empieza antes que los precios,
esas horas no aparecen (la vista previa de Configuración → Precios muestra "—" en ellas).

## Estados de una reserva

`pendiente_pago` → (envía comprobante) → `en_revision` → (se aprueba) → `confirmada`
- Si el comprobante se rechaza, vuelve a `pendiente_pago` con un plazo nuevo para enviar otro.
- Si no paga a tiempo, pasa a `expirada` y el horario se libera solo.
- El cliente (con la anticipación mínima) o la administración (con motivo) pueden pasarla a `cancelada`.
- Las presenciales se crean `confirmada` (pagó en efectivo) o `pendiente_pago` sin vencimiento.

## API

Respuestas: éxito `{ "data": ... }` · error `{ "error": "mensaje", "errores": { "campo": "mensaje" } }`.

| Método | Ruta | Acceso |
|---|---|---|
| GET | `/api/salud` | Público |
| POST | `/api/auth/registro` · `/api/auth/login` · `/api/auth/logout` | Público |
| GET · PUT | `/api/auth/me` · `/api/auth/perfil` | Público · Sesión |
| GET | `/api/publico/info` · `/api/publico/qr` | Público |
| GET | `/api/disponibilidad?fecha=` · `/api/disponibilidad/dias` | Público |
| GET · POST | `/api/reservas` | Cliente |
| GET | `/api/reservas/{id}` | Cliente (solo las suyas) |
| POST | `/api/reservas/{id}/cancelar` · `/api/reservas/{id}/pagos` | Cliente |
| GET | `/api/pagos/{id}/comprobante` | Dueño o admin |
| GET | `/api/admin/panel?fecha=` · `/api/admin/contadores` | Admin |
| GET · POST | `/api/admin/reservas` | Admin |
| POST | `/api/admin/reservas/{id}/cancelar` · `/api/admin/reservas/{id}/cobrar-efectivo` | Admin |
| GET | `/api/admin/pagos?estado=` | Admin |
| POST | `/api/admin/pagos/{id}/aprobar` · `/api/admin/pagos/{id}/rechazar` | Admin |
| GET · PUT | `/api/admin/configuracion` | Admin |
| POST · DELETE | `/api/admin/configuracion/qr` | Admin |
| PUT | `/api/admin/horarios` | Admin |
| POST · PUT · DELETE | `/api/admin/tarifas[/{id}]` | Admin |
| POST · DELETE | `/api/admin/bloqueos[/{id}]` | Admin |
| GET | `/api/admin/reportes?desde=&hasta=` | Admin |

`/api/auth/login` recibe `{ "email", "password" }`, donde `email` puede ser el correo o el nombre de usuario.

## Seguridad

- Contraseñas con `password_hash`; sesión PHP en cookie `httpOnly` y `SameSite=Lax`, regenerada al iniciar sesión.
- Protección CSRF: las peticiones que modifican datos solo se aceptan desde el mismo sitio (cabecera `Origin`).
- Consultas SQL siempre preparadas (PDO); validación de todos los datos en el backend.
- Archivos subidos validados por su contenido real, con nombre aleatorio, fuera de la carpeta pública y servidos solo a quien puede verlos.
- El frontend inserta texto del servidor siempre escapado (`html\`\`` en `utils/dom.js`).
- `backend/`, `database/`, `docs/` y archivos ocultos (`.env`, `.git`) están bloqueados desde el navegador.

## Pruebas

```
bash tests/ejecutar-todo.sh        # todo
bash tests/ejecutar-todo.sh api    # solo API
bash tests/ejecutar-todo.sh ui     # solo interfaz (Chrome headless)
```

Por defecto apuntan a `http://cancha-satelite.test` (Laragon). Para probar contra XAMPP (PowerShell):

```
$env:BASE = "http://localhost/cancha-satelite/api"; $env:BASE_UI = "http://localhost/cancha-satelite"; bash tests/ejecutar-todo.sh
```

- Necesitan que el sistema tenga horarios y precios configurados.
- `05_notificaciones.sh` revisa los correos en Mailpit, así que solo pasa con Laragon.
- Las pruebas de interfaz no necesitan instalar nada: usan Chrome o Edge en modo invisible mediante
  `tests/ui/navegador.mjs`. Para **ver** el navegador mientras prueba: `$env:VER=1; node tests/ui/02_pago.mjs`.
- Las capturas quedan en `tests/ui/capturas/`.
- **Las pruebas crean usuarios y reservas de prueba** (correos `@prueba.test`): haz un respaldo de la base
  antes de ejecutarlas sobre datos que quieras conservar.

## Publicar en un hosting (por ejemplo InfinityFree)

1. Ejecuta `composer dump-autoload` en tu computadora y sube también `backend/vendor/`.
2. Sube todo el proyecto a la carpeta pública (`htdocs`). El `.htaccess` de la raíz enruta `/api` y protege `backend/`.
3. Crea la base en el panel del hosting, importa los scripts de `database/` con phpMyAdmin y ajusta `backend/.env`
   (`DB_*`, `APP_URL`, `APP_DEBUG=false`).
4. Correo: configura `MAIL_*` con el SMTP del hosting o Gmail (`smtp.gmail.com`, 587, `tls`, contraseña de aplicación).
   Si el hosting gratuito no permite SMTP, desactiva los avisos en Configuración → Reglas y negocio.
5. Activa HTTPS (SSL) en el panel del hosting.
6. Los comprobantes y el QR subidos están en `backend/storage/uploads/`: si mudas el sistema, cópialos junto con la base.
