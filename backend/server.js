'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

// Carga variables desde .env si existe, sin depender de ninguna libreria externa.
function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvFile();

const { seedIfEmpty } = require('./src/db');
const { sendJson } = require('./src/utils');
const { getSession } = require('./src/auth');
const authRoutes = require('./src/routes/auth');
const propertyRoutes = require('./src/routes/properties');
const imageRoutes = require('./src/routes/images');
const leadRoutes = require('./src/routes/leads');
const { db } = require('./src/db');

seedIfEmpty();

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

const PORT = Number(process.env.PORT) || 4000;
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const ADMIN_DIR = path.join(__dirname, 'admin');
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function requireAdmin(handler) {
  return (req, res, ...rest) => {
    const session = getSession(req);
    if (!session) return sendJson(res, 401, { error: 'No autenticado' });
    return handler(req, res, ...rest);
  };
}

function serveStaticFile(res, rootDir, urlPath) {
  const safeSuffix = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(rootDir, safeSuffix);

  if (!filePath.startsWith(rootDir)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        // SPA-like fallback para rutas sin extension dentro del sitio publico
        if (!path.extname(urlPath) && rootDir === FRONTEND_DIR) {
          return fs.readFile(path.join(FRONTEND_DIR, 'index.html'), (fallbackErr, fallbackData) => {
            if (fallbackErr) {
              res.writeHead(404);
              return res.end('Not found');
            }
            res.writeHead(200, { 'Content-Type': MIME_TYPES['.html'] });
            res.end(fallbackData);
          });
        }
        res.writeHead(404);
        return res.end('Not found');
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

function stats(req, res) {
  const totalProperties = db.prepare('SELECT COUNT(*) AS c FROM properties').get().c;
  const published = db.prepare("SELECT COUNT(*) AS c FROM properties WHERE status = 'published'").get().c;
  const drafts = db.prepare("SELECT COUNT(*) AS c FROM properties WHERE status = 'draft'").get().c;
  const totalLeads = db.prepare('SELECT COUNT(*) AS c FROM leads').get().c;
  const newLeads = db.prepare("SELECT COUNT(*) AS c FROM leads WHERE status = 'nuevo'").get().c;
  sendJson(res, 200, { totalProperties, published, drafts, totalLeads, newLeads });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;
  const query = url.searchParams;
  const method = req.method;

  try {
    // --- API ---
    if (pathname === '/api/auth/login' && method === 'POST') return await authRoutes.login(req, res);
    if (pathname === '/api/auth/logout' && method === 'POST') return authRoutes.logout(req, res);
    if (pathname === '/api/auth/me' && method === 'GET') return authRoutes.me(req, res);

    if (pathname === '/api/stats' && method === 'GET') return requireAdmin(stats)(req, res);

    if (pathname === '/api/properties' && method === 'GET') return propertyRoutes.list(req, res, query);
    if (pathname === '/api/properties' && method === 'POST') return await requireAdmin(propertyRoutes.create)(req, res);

    let m = pathname.match(/^\/api\/properties\/slug\/([^/]+)$/);
    if (m && method === 'GET') return propertyRoutes.getBySlug(req, res, decodeURIComponent(m[1]));

    m = pathname.match(/^\/api\/properties\/(\d+)$/);
    if (m && method === 'GET') return requireAdmin(propertyRoutes.getById)(req, res, Number(m[1]));
    if (m && method === 'PUT') return await requireAdmin(propertyRoutes.update)(req, res, Number(m[1]));
    if (m && method === 'DELETE') return requireAdmin(propertyRoutes.remove)(req, res, Number(m[1]));

    m = pathname.match(/^\/api\/properties\/(\d+)\/images$/);
    if (m && method === 'POST') return await requireAdmin(imageRoutes.addImage)(req, res, Number(m[1]));

    m = pathname.match(/^\/api\/images\/(\d+)$/);
    if (m && method === 'DELETE') return requireAdmin(imageRoutes.removeImage)(req, res, Number(m[1]));

    if (pathname === '/api/leads' && method === 'POST') return await leadRoutes.create(req, res);
    if (pathname === '/api/leads' && method === 'GET') return requireAdmin(leadRoutes.list)(req, res, query);

    m = pathname.match(/^\/api\/leads\/(\d+)$/);
    if (m && method === 'PUT') return await requireAdmin(leadRoutes.updateStatus)(req, res, Number(m[1]));
    if (m && method === 'DELETE') return requireAdmin(leadRoutes.remove)(req, res, Number(m[1]));

    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { error: 'Recurso no encontrado' });
    }

    // --- Archivos subidos ---
    if (pathname.startsWith('/uploads/')) {
      return serveStaticFile(res, UPLOADS_DIR, pathname.replace('/uploads', ''));
    }

    // --- Panel de administracion (backend de gestion) ---
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      return serveStaticFile(res, ADMIN_DIR, pathname.replace(/^\/admin/, '') || '/index.html');
    }

    // --- Sitio publico ---
    return serveStaticFile(res, FRONTEND_DIR, pathname === '/' ? '/index.html' : pathname);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: 'Error interno del servidor' });
  }
});

server.listen(PORT, () => {
  console.log(`Horizonte Inmobiliaria escuchando en http://localhost:${PORT}`);
  console.log(`  Sitio publico:  http://localhost:${PORT}/`);
  console.log(`  Panel admin:    http://localhost:${PORT}/admin`);
});
