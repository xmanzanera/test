# Contexto del proyecto BÔMMAIN — para retomar en otra sesión de Claude

Este documento resume todo lo hablado y construido en esta conversación para
que puedas continuar el trabajo desde otra cuenta/sesión de Claude sin perder
contexto. Pégalo como primer mensaje en la nueva conversación, o simplemente
indica a Claude que lea `CONTEXT.md` en la raíz del repo.

## 1. Qué es este proyecto

Plataforma inmobiliaria de demostración, marca **BÔMMAIN** ("Trobem la teva
llar"), con:
- **Sitio público** (`frontend/`): home, listado con filtros, ficha de
  detalle, "Nosotros", "Contacto".
- **Panel de administración** (`backend/admin/`): login, dashboard, CRUD de
  inmuebles con subida de fotos, bandeja de mensajes de contacto.
- **Backend API** (`backend/`): servidor Node.js que sirve ambas partes y
  expone `/api/*`.

## 2. Dónde está el código

- **Repo**: `xmanzanera/test` (GitHub)
- **Rama**: `claude/pedroochoa-clone-pbnjid`
- **Últimos commits**:
  - `b7d0921` — creación inicial de la plataforma (Horizonte Inmobiliaria,
    nombre provisional de esa primera versión)
  - `be3ca33` — rediseño completo con la identidad de marca BÔMMAIN
- El árbol de trabajo está limpio (sin cambios sin commitear) a fecha de este
  documento.

## 3. Cómo empezó esto (contexto de las peticiones del usuario)

1. El usuario pidió inicialmente "una web exactamente igual a
   pedroochoa.com" (una inmobiliaria real), con backend de gestión de
   inmuebles y frontend de usuario.
2. Se le explicó que clonar literalmente el contenido/marca de un negocio
   real de terceros no es apropiado (suplantación / derechos de autor), y se
   le preguntó si el sitio era suyo o si solo quería la estructura y
   funcionalidad. **Respondió que solo quería el estilo/funcionalidad**, sin
   copiar contenido real de terceros → se construyó una plataforma
   **original**, con marca y contenido de ejemplo propios.
3. Más adelante el usuario compartió una imagen con el **manual de marca
   BÔMMAIN** (logotipo, paleta de colores, tipografías, iconografía, mockups
   de papelería/vehículo/fachada) y pidió adaptar toda la web a ese estilo.
   Se le preguntó si también quería traducir los textos al catalán (el
   manual está en catalán) o solo aplicar el rediseño visual manteniendo el
   contenido en español → **eligió mantener los textos en español**, solo
   rediseño visual.
4. Se aplicó el rediseño completo (ver sección 5) y se verificó visualmente
   con capturas de pantalla generadas arrancando el servidor localmente.
5. El usuario pidió instrucciones para probar la web él mismo, y luego pidió
   que se arrancara aquí mismo y se enviaran capturas (se hizo, con Chromium
   headless).
6. Ahora pide este archivo de contexto para continuar en otra cuenta.

## 4. Restricción técnica importante: sin dependencias npm

El entorno donde se construyó este proyecto **no tiene acceso al registro de
npm** (firewall de la sandbox devuelve 403 en `registry.npmjs.org`). Por eso
todo el backend está escrito **solo con módulos nativos de Node.js**:

- `node:http` en vez de Express.
- `node:sqlite` (API experimental de Node ≥22.5) en vez de Prisma/otro ORM.
- `node:crypto` (scrypt + HMAC) para hashing de contraseñas y sesión por
  cookie firmada, en vez de bcrypt/jsonwebtoken.
- Subida de imágenes como **base64 dentro de JSON** (no `multipart/form-data`)
  para no necesitar `multer`.
- Frontend y admin panel son HTML/CSS/JS **vanilla**, sin build step (nada de
  React/Next/Vite/Tailwind).

**Esto fue una decisión forzada por el entorno, no un requisito del
usuario.** Si la nueva sesión de Claude SÍ tiene acceso a npm, se puede
seguir así (ya funciona y es muy simple de desplegar: `node server.js` y
listo, cero `npm install`) o plantear migrar a un stack más "estándar"
(Express + Prisma, o Next.js) si el usuario lo pide — pero no asumas que hay
que migrar, el usuario no lo ha pedido y el proyecto actual es funcional.

Consulta `README.md` en la raíz del repo para instrucciones de arranque
completas.

## 5. Identidad de marca BÔMMAIN aplicada

- **Colores**: azul petróleo `#0F2436` (`--navy`) y turquesa `#20B6C1`
  (`--teal`), con variante oscura `#17939C` (`--teal-dark`). Grises
  `#E6E6E6` / `#333333`. Definidos como variables CSS en
  `frontend/css/styles.css` y `backend/admin/css/admin.css`.
- **Tipografías**: Montserrat (titulares/logotipo) + Inter (cuerpo de
  texto), cargadas vía Google Fonts (`@import` al inicio de cada CSS).
- **Logotipo**: recreado como SVG inline (constante `BRAND_MARK_SVG` +
  función `brandLogoHtml()`, duplicada en `frontend/js/app.js` y
  `backend/admin/js/admin.js` porque no hay build step ni módulos
  compartidos entre frontend y admin). Es un círculo con un tejado en la
  parte superior y dos barras verticales turquesa dentro (simula
  tejado+puerta), insertado entre la "B" y "MMAIN" para formar "BÔMMAIN".
  Tiene variante clara (`on-dark`, texto blanco) y oscura (por defecto, texto
  navy) según el fondo.
- **Franja de valores de marca**: en la home (`frontend/index.html`) hay 4
  bloques con icono ("Enfocados en viviendas", "Proximidad y confianza",
  "Encontrar casa, crecer", "Transparencia y seguridad") que replican los 4
  iconos de la esquina superior derecha del manual de marca.
- Referencias de inmuebles con prefijo `BM-000X`, emails de ejemplo
  `@bommain.com`, usuario admin `admin@bommain.test`.
- **No se tradujo nada al catalán** — el usuario pidió mantener español.

## 6. Cómo arrancar y probar

```bash
cd backend
node server.js          # requiere Node.js >= 22.5
```

- Sitio público: `http://localhost:4000/`
- Panel admin: `http://localhost:4000/admin`
- Login admin: `admin@bommain.test` / `admin1234`

Al primer arranque se crea `backend/data/app.db` (SQLite, en `.gitignore`)
con 6 inmuebles de ejemplo y el usuario admin. Se puede borrar ese archivo
para resetear los datos de demo.

## 7. Estructura del repo

```
backend/
  server.js            Servidor HTTP: enruta /api, /admin y el sitio público
  src/db.js             Esquema + semilla de datos (node:sqlite)
  src/auth.js            Hash de contraseñas + sesión por cookie firmada
  src/utils.js            Helpers (JSON, slugify)
  src/routes/            auth.js, properties.js, images.js, leads.js
  admin/                 Panel de gestión (HTML/CSS/JS estático)
  uploads/                Imágenes subidas (gitignored, con .gitkeep)
  data/                   Base de datos SQLite (gitignored, con .gitkeep)
frontend/                 Sitio público (HTML/CSS/JS estático)
README.md                 Instrucciones de instalación/arranque + API
CONTEXT.md                 Este archivo
```

## 8. Cosas que quedan pendientes / posibles próximos pasos

Nada de esto se ha pedido todavía, son solo ideas si el usuario continúa:

- Fotos reales de los inmuebles de ejemplo (ahora mismo salen sin imagen, se
  muestra un icono de casa placeholder).
- Desplegar el proyecto en algún hosting (Render, Railway, un VPS...); ahora
  mismo solo se ha probado en local/sandbox.
- Paginación/roles de usuario adicionales en el admin (por ahora solo hay un
  usuario admin único, sin gestión de varios usuarios).
- Revisar si `node:sqlite` (todavía experimental) conviene sustituirse por
  algo más estable de cara a producción real.
- El usuario puede querer, en algún momento, migrar a un stack con
  framework (React/Next, Express) si decide que quiere extender mucho el
  proyecto — pero esto NO se ha pedido, no lo propongas de oficio.

## 9. Notas de verificación ya hechas

Todo esto ya se probó y funciona (no hace falta re-verificarlo salvo que se
toque ese código):
- Flujo completo de login admin, crear inmueble, subir imagen, publicar,
  verlo en el sitio público, enviar formulario de contacto, verlo en
  "Mensajes" del admin — probado end-to-end con Chromium headless vía CDP.
- Sintaxis de todos los archivos JS del backend verificada con `node -c`.
- Capturas de pantalla de todas las páginas (público + admin) revisadas
  visualmente contra el manual de marca.
