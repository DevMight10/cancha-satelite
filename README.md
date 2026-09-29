# Cancha Satélite Norte: plataforma de reservas y pagos

Plataforma web para reservar y pagar en línea la cancha deportiva de Satélite Norte.
Proyecto de innovación tecnológica · U.E. Bolivariana Juancito Pinto · 2026.

## Funciones

**Clientes**
- Registro e inicio de sesión (nombre, celular y correo).
- Marcador de disponibilidad por día y hora, con turnos libres, ocupados y su precio.
- Elegir el horario, ver el precio y confirmar la reserva.
- Pago por **QR Simple**, **Tigo Money** o **transferencia**, con subida del comprobante.
- Mis reservas: próximas e historial, con cancelación según las reglas.
- Avisos por **correo** en cada cambio y enlace de **WhatsApp** a la cancha.

**Administración**
- Panel con la agenda del día (cliente de cada turno) y la ocupación de la semana.
- Configuración de horarios de apertura, duración del turno, precios por franja y día
  (se cobra la tarifa más alta que corresponda), días bloqueados, reglas y medios de pago.
- Validar pagos: aprobar o rechazar comprobantes con motivo.
- Registrar reservas presenciales y cobros en efectivo; cancelar con motivo.
- Reportes de ingresos por día y por mes, horarios más usados y medios de pago,
  exportables a **Excel** y **PDF**.
- **Nunca dos reservas activas en el mismo horario** (regla principal, ver más abajo).

## Tecnologías

| Parte | Tecnología |
|---|---|
| Frontend | HTML5, CSS3 propio (sistema de diseño "Marcador de cancha") y JavaScript con módulos ES |
| Backend | API REST en PHP 8 sin framework (autoload PSR-4 con Composer, sin dependencias) |
| Base de datos | MySQL 8 |
| Librerías del navegador (CDN) | Lucide (iconos), Chart.js (gráficos), SheetJS (Excel), jsPDF (PDF) |
| Entorno local | Laragon (Apache, MySQL, Mailpit) |

## Estructura

```
cancha-satelite/
├── .htaccess          ← /api/* va al backend, todo lo demás al frontend; protege archivos internos
├── frontend/
│   ├── index.html                 ← inicio público con el marcador en vivo
│   ├── pages/
│   │   ├── reservar.html          ← marcador de turnos y confirmación
│   │   ├── auth/                  ← login y registro
│   │   ├── usuario/               ← pagar y mis reservas
│   │   └── admin/                 ← panel, reservas, pagos, configuración y reportes
│   ├── assets/css/                ← app.css (sistema de diseño), admin.css, inicio.css
│   └── js/
│       ├── config.js              ← URL de la API y rutas de las páginas
│       ├── api/                   ← ÚNICO lugar que llama al backend (fetch)
│       ├── components/            ← cabecera, marcador, ticket, diálogo, toasts, formularios
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
│   └── storage/                   ← logs y archivos subidos (no accesibles desde la web)
├── database/                      ← scripts SQL numerados
├── tests/                         ← pruebas de API (*.sh) y de interfaz (ui/*.mjs)
├── docs/diseno/                   ← dirección visual
├── PRODUCT.md  DESIGN.md          ← definición del producto y sistema de diseño
└── .claude/skills/                ← skills de diseño usadas (ui-ux-pro-max, impeccable)
```

Flujo de una petición: `pages/*.js → js/api/*.js → http.js (fetch) → /api/... → public/index.php → Router → Middleware → Controller → Service → Repository → MySQL`.
Cada capa solo habla con la de abajo: el Controller no escribe SQL y el Repository no decide reglas de negocio.

## Puesta en marcha (Laragon)

1. En Laragon presiona **Iniciar todo**. Laragon crea el dominio `http://cancha-satelite.test`.
2. Crea la base de datos con los scripts de `database/`, en orden. Si usas la consola, indica UTF-8:
   ```
   mysql -uroot --default-character-set=utf8mb4 < database/01_crear_base.sql
   mysql -uroot --default-character-set=utf8mb4 < database/02_esquema.sql
   mysql -uroot --default-character-set=utf8mb4 < database/03_datos_iniciales.sql
   ```
3. Crea el usuario de MySQL exclusivo del proyecto (no se usa `root`), cambiando `TU_CONTRASEÑA`:
   ```sql
   CREATE USER 'cancha_app'@'localhost' IDENTIFIED BY 'TU_CONTRASEÑA';
   CREATE USER 'cancha_app'@'127.0.0.1' IDENTIFIED BY 'TU_CONTRASEÑA';
   GRANT ALL PRIVILEGES ON cancha_satelite.* TO 'cancha_app'@'localhost', 'cancha_app'@'127.0.0.1';
   ```
   Copia `backend/.env.example` como `backend/.env` y pon esa contraseña en `DB_PASSWORD`.
   Con ese usuario puedes ver la base en `http://localhost/adminer`.
4. Genera el autoload desde `backend/`: `composer dump-autoload`.
5. Crea el primer administrador desde `backend/`:
   ```
   php bin/crear-admin.php "Nombre Apellido" correo@ejemplo.com 71234567 "contraseña-segura"
   ```
6. Abre `http://cancha-satelite.test`, entra con el administrador y completa **Configuración**:
   horarios, precios, QR, Tigo Money, cuenta bancaria y WhatsApp. Los datos iniciales son **de ejemplo**.

Los correos de desarrollo llegan a **Mailpit**: `http://localhost:8025`.

## La regla principal: nunca dos reservas en el mismo horario

Se protege en tres niveles:
1. La hora pedida debe ser un turno real del día (horario de apertura, duración y tarifa).
2. Al crear la reserva se bloquean las reservas de ese día (`SELECT … FOR UPDATE`) y se verifica que no se solape.
3. En la base, un índice único sobre `(cancha, fecha, hora_inicio, ocupa_horario)` rechaza cualquier duplicado.
   `ocupa_horario` es una columna generada que vale `NULL` en reservas canceladas o vencidas, así ese horario se puede volver a reservar.

La prueba `tests/03_reservas.sh` envía pedidos **simultáneos** por el mismo turno y verifica que solo uno se crea.

## Estados de una reserva

`pendiente_pago` → (envía comprobante) → `en_revision` → (se aprueba) → `confirmada`
- Si el pago se rechaza, vuelve a `pendiente_pago` con un plazo nuevo.
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
bash tests/ejecutar-todo.sh api    # solo API (135 pruebas)
bash tests/ejecutar-todo.sh ui     # solo interfaz (Chrome headless)
```

Las pruebas de interfaz no necesitan instalar nada: usan Chrome o Edge en modo invisible mediante
`tests/ui/navegador.mjs`. Para **ver** el navegador mientras prueba (PowerShell):

```
$env:VER=1; node tests/ui/02_pago.mjs
```

Las capturas quedan en `tests/ui/capturas/`. Las pruebas crean usuarios y reservas de prueba
(correos `@prueba.test`); las de configuración dejan todo como estaba.

## Publicar en un hosting (por ejemplo InfinityFree)

1. Ejecuta `composer dump-autoload` en tu computadora y sube también `backend/vendor/`.
2. Sube todo el proyecto a la carpeta pública (`htdocs`). El `.htaccess` de la raíz enruta `/api` y protege `backend/`.
3. Crea la base en el panel del hosting, importa los scripts de `database/` con phpMyAdmin y ajusta `backend/.env`
   (`DB_*`, `APP_URL`, `APP_DEBUG=false`).
4. Correo: configura `MAIL_*` con el SMTP del hosting o Gmail (`smtp.gmail.com`, 587, `tls`, contraseña de aplicación).
   Si el hosting gratuito no permite SMTP, desactiva los avisos en Configuración → Reglas.
5. Activa HTTPS (SSL) en el panel del hosting.
