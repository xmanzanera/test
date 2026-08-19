# Horizonte Inmobiliaria

Plataforma inmobiliaria de demostración con **sitio público** (frontend) y
**panel de administración** para la gestión de inmuebles (backend), inspirada
en la estructura habitual de una web inmobiliaria: listado de propiedades con
filtros, ficha de detalle, formulario de contacto y un panel privado desde el
que el equipo gestiona el catálogo.

> Proyecto original con marca, textos e imágenes ficticios, creado con fines
> educativos/demostrativos. No reproduce contenido real de terceros.

## Stack técnico

El proyecto está construido **sin dependencias externas de npm**: backend y
frontend usan únicamente módulos nativos de Node.js (`http`, `node:sqlite`,
`crypto`, etc.) y HTML/CSS/JavaScript vanilla. Esto significa que no hace
falta ejecutar `npm install` para arrancarlo — solo tener Node.js instalado.

- **Backend**: servidor HTTP nativo de Node + `node:sqlite` (base de datos
  embebida, sin instalación adicional) + autenticación por cookie firmada.
- **Frontend público**: HTML/CSS/JS estático servido por el propio backend.
- **Panel de administración**: HTML/CSS/JS estático, también servido por el
  backend, protegido con inicio de sesión.

## Requisitos

- Node.js **22.5 o superior** (usa el módulo `node:sqlite`, disponible desde
  esa versión).

## Puesta en marcha

```bash
cd backend
cp .env.example .env   # opcional, para cambiar credenciales/puerto/secreto
node server.js
```

Al arrancar por primera vez se crea automáticamente la base de datos SQLite
en `backend/data/app.db`, con un usuario administrador y 6 inmuebles de
ejemplo. Verás en la consola las credenciales generadas (o las que hayas
definido en `.env`):

```
[seed] Usuario admin creado -> admin@horizonte.test / admin1234
```

Con el servidor en marcha:

- **Sitio público**: http://localhost:4000/
- **Panel de administración**: http://localhost:4000/admin

Durante el desarrollo puedes usar `node --watch server.js` (o `npm run dev`)
para que el servidor se reinicie automáticamente al guardar cambios.

## Estructura del proyecto

```
backend/
  server.js            Servidor HTTP: enruta /api, /admin y el sitio público
  src/
    db.js              Esquema y semilla de datos (node:sqlite)
    auth.js            Hash de contraseñas y sesión firmada por cookie
    utils.js            Helpers (JSON, slugify, etc.)
    routes/            Controladores de la API (auth, properties, images, leads)
  admin/               Panel de gestión de inmuebles (HTML/CSS/JS estático)
  uploads/             Imágenes subidas de los inmuebles
  data/                Base de datos SQLite (se genera al arrancar)
frontend/               Sitio público para los usuarios (HTML/CSS/JS estático)
```

## Funcionalidades

### Sitio público (frontend)
- Home con buscador rápido e inmuebles destacados.
- Listado de inmuebles con filtros (operación, tipo, ciudad, precio,
  habitaciones, texto libre) y paginación.
- Ficha de detalle con galería, características y formulario de contacto.
- Páginas de "Nosotros" y "Contacto".

### Panel de administración (backend de gestión)
- Login protegido por sesión.
- Panel general con estadísticas (inmuebles publicados/borrador, mensajes).
- CRUD completo de inmuebles: crear, editar, publicar/despublicar, eliminar.
- Subida y borrado de fotografías por inmueble.
- Bandeja de mensajes de contacto recibidos desde la web pública, con cambio
  de estado (nuevo/contactado/cerrado).

## API

Toda la lógica pasa por una API REST en `/api/*` (ver `backend/src/routes/`):

| Método | Ruta                              | Descripción                        |
| ------ | --------------------------------- | ----------------------------------- |
| POST   | `/api/auth/login`                 | Inicia sesión (admin)              |
| POST   | `/api/auth/logout`                | Cierra sesión                      |
| GET    | `/api/auth/me`                    | Usuario autenticado actual         |
| GET    | `/api/properties`                 | Lista/filtra inmuebles publicados  |
| GET    | `/api/properties/slug/:slug`      | Detalle público de un inmueble     |
| POST   | `/api/properties`                 | Crea un inmueble (admin)           |
| PUT    | `/api/properties/:id`             | Actualiza un inmueble (admin)      |
| DELETE | `/api/properties/:id`             | Elimina un inmueble (admin)        |
| POST   | `/api/properties/:id/images`      | Sube una imagen (admin, base64)    |
| DELETE | `/api/images/:id`                 | Elimina una imagen (admin)         |
| POST   | `/api/leads`                      | Envía un mensaje de contacto       |
| GET    | `/api/leads`                      | Lista mensajes recibidos (admin)   |
| PUT    | `/api/leads/:id`                  | Cambia el estado de un mensaje     |
| DELETE | `/api/leads/:id`                  | Elimina un mensaje (admin)         |

## Notas

- `node:sqlite` es una API marcada como experimental por Node.js; para este
  proyecto de demostración es más que suficiente, pero si se lleva a
  producción conviene revisar las notas de estabilidad de cada versión de
  Node o migrar a un driver SQLite/Postgres tradicional.
- Las imágenes se suben como base64 dentro del JSON (sin `multipart/form-data`)
  para no depender de ninguna librería externa; el límite por imagen es 8MB.
