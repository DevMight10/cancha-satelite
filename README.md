# Cancha Satélite Norte: plataforma de reservas y pagos

Plataforma web para reservar y pagar en línea la cancha deportiva de Satélite Norte.

## Tecnologías

| Parte | Tecnología |
|---|---|
| Frontend | HTML5, CSS3 (Bootstrap 5), JavaScript (módulos ES) |
| Backend | API REST en PHP 8 (sin framework, autoload con Composer) |
| Base de datos | MySQL 8 |
| Entorno local | Laragon |

## Estructura

```
cancha-satelite/
├── .htaccess          ← /api/* va al backend, todo lo demás al frontend
├── frontend/          ← HTML, CSS y JS (lo que ve el usuario)
│   ├── index.html
│   ├── pages/         ← páginas por sección (auth, usuario, admin)
│   ├── assets/        ← css, imágenes
│   └── js/
│       ├── config.js
│       ├── api/       ← ÚNICO lugar que llama al backend (fetch)
│       ├── components/← piezas reutilizables (navbar, alertas…)
│       ├── guards/    ← protección de páginas por sesión/rol
│       ├── pages/     ← lógica de cada página
│       └── utils/     ← funciones de apoyo (formatos, validaciones)
├── backend/           ← API en PHP
│   ├── public/        ← punto de entrada (index.php), única carpeta pública
│   ├── src/
│   │   ├── Config/        ← conexión a la base de datos
│   │   ├── Core/          ← Router, Request, Response, Env
│   │   ├── Routes/        ← definición de rutas de la API
│   │   ├── Middleware/    ← validaciones antes del controlador (sesión, rol)
│   │   ├── Controllers/   ← reciben la petición y responden JSON
│   │   ├── Services/      ← reglas de negocio
│   │   ├── Repositories/  ← consultas SQL
│   │   ├── Validators/    ← validación de datos de entrada
│   │   └── Exceptions/    ← errores HTTP controlados
│   ├── storage/       ← logs y archivos subidos
│   └── .env           ← credenciales (no se sube a GitHub)
├── database/          ← scripts SQL numerados
└── docs/              ← documentación del proyecto
```

### Flujo de una petición

```
frontend/js/pages/*.js → js/api/*.js → http.js (fetch)
      → /api/... → backend/public/index.php → Router → Middleware
      → Controller → Service → Repository → MySQL
```

Regla: cada capa solo habla con la de abajo. El Controller no escribe SQL; el Repository no decide reglas de negocio.

## Puesta en marcha (Laragon)

1. En Laragon presiona **Iniciar todo** (Apache + MySQL). Laragon crea el dominio `http://cancha-satelite.test`.
2. Crea la base de datos ejecutando los scripts de `database/` en orden (con HeidiSQL, desde el botón **Base de datos** de Laragon).
3. Crea el usuario de MySQL exclusivo del proyecto (no se usa `root`), cambiando `TU_CONTRASEÑA`:
   ```sql
   CREATE USER 'cancha_app'@'localhost' IDENTIFIED BY 'TU_CONTRASEÑA';
   CREATE USER 'cancha_app'@'127.0.0.1' IDENTIFIED BY 'TU_CONTRASEÑA';
   GRANT ALL PRIVILEGES ON cancha_satelite.* TO 'cancha_app'@'localhost', 'cancha_app'@'127.0.0.1';
   ```
   Copia `backend/.env.example` como `backend/.env` y pon esa contraseña en `DB_PASSWORD`.
   Con el mismo usuario y contraseña puedes entrar a la base de datos desde el navegador en `http://localhost/adminer`.
4. Si agregas clases nuevas, regenera el autoload desde `backend/`:
   ```
   composer dump-autoload
   ```
5. Abre `http://cancha-satelite.test`. La tarjeta "Estado del sistema" debe mostrar la API y la base de datos en verde.

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/salud` | Estado de la API y de la base de datos |

Formato de respuesta:
- Éxito: `{ "data": ... }`
- Error: `{ "error": "mensaje", "errores": { "campo": "mensaje" } }`

## Cómo agregar un módulo nuevo (ejemplo: reservas)

1. `database/0X_reservas.sql`: tabla.
2. `backend/src/Repositories/ReservaRepository.php`: consultas SQL.
3. `backend/src/Services/ReservaService.php`: reglas de negocio.
4. `backend/src/Validators/ReservaValidator.php`: validación de datos.
5. `backend/src/Controllers/ReservaController.php`: recibe la petición y responde.
6. `backend/src/Routes/api.php`: registrar las rutas.
7. `frontend/js/api/reservasApi.js`: funciones que llaman a la API.
8. `frontend/pages/...html` + `frontend/js/pages/...js`: la pantalla.
