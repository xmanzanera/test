'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { db } = require('../db');
const { sendJson, readJsonBody, slugify } = require('../utils');
const { getSession } = require('../auth');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

const OPERATIONS = new Set(['venta', 'alquiler']);
const TYPES = new Set(['piso', 'atico', 'duplex', 'chalet', 'casa', 'local', 'garaje', 'terreno']);
const CONDITIONS = new Set(['obra_nueva', 'segunda_mano', 'reformado', 'a_reformar']);
const STATUSES = new Set(['draft', 'published']);

const BOOL_FIELDS = ['has_elevator', 'has_garage', 'has_terrace', 'has_pool', 'featured'];
const NUMBER_FIELDS = ['price', 'area_m2', 'rooms', 'bathrooms'];
const TEXT_FIELDS = ['title', 'description', 'city', 'neighborhood', 'address', 'floor'];

function isAdmin(req) {
  return Boolean(getSession(req));
}

function serialize(row, images) {
  return {
    id: row.id,
    reference: row.reference,
    slug: row.slug,
    title: row.title,
    description: row.description,
    operation: row.operation,
    type: row.type,
    condition: row.condition,
    price: row.price,
    city: row.city,
    neighborhood: row.neighborhood,
    address: row.address,
    area_m2: row.area_m2,
    rooms: row.rooms,
    bathrooms: row.bathrooms,
    floor: row.floor,
    has_elevator: Boolean(row.has_elevator),
    has_garage: Boolean(row.has_garage),
    has_terrace: Boolean(row.has_terrace),
    has_pool: Boolean(row.has_pool),
    featured: Boolean(row.featured),
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    images: images.map((img) => ({ id: img.id, url: `/uploads/${img.filename}`, position: img.position })),
  };
}

function imagesFor(propertyId) {
  return db
    .prepare('SELECT * FROM property_images WHERE property_id = ? ORDER BY position ASC, id ASC')
    .all(propertyId);
}

function uniqueSlug(base) {
  let slug = base || 'inmueble';
  let n = 1;
  const exists = db.prepare('SELECT id FROM properties WHERE slug = ?');
  while (exists.get(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

function nextReference() {
  const row = db.prepare("SELECT reference FROM properties ORDER BY id DESC LIMIT 1").get();
  let next = 1;
  if (row && row.reference) {
    const match = row.reference.match(/(\d+)$/);
    if (match) next = parseInt(match[1], 10) + 1;
  }
  return `HZ-${String(next).padStart(4, '0')}`;
}

function list(req, res, query) {
  const admin = isAdmin(req);
  const clauses = [];
  const params = {};

  if (admin && query.get('status') === 'all') {
    // sin filtro de estado
  } else if (admin && STATUSES.has(query.get('status'))) {
    clauses.push('status = @status');
    params.status = query.get('status');
  } else {
    clauses.push('status = @status');
    params.status = 'published';
  }

  const operation = query.get('operation');
  if (OPERATIONS.has(operation)) {
    clauses.push('operation = @operation');
    params.operation = operation;
  }

  const type = query.get('type');
  if (TYPES.has(type)) {
    clauses.push('type = @type');
    params.type = type;
  }

  const city = query.get('city');
  if (city) {
    clauses.push('city LIKE @city');
    params.city = `%${city}%`;
  }

  const minPrice = Number(query.get('minPrice'));
  if (Number.isFinite(minPrice) && minPrice > 0) {
    clauses.push('price >= @minPrice');
    params.minPrice = minPrice;
  }

  const maxPrice = Number(query.get('maxPrice'));
  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    clauses.push('price <= @maxPrice');
    params.maxPrice = maxPrice;
  }

  const minRooms = Number(query.get('rooms'));
  if (Number.isFinite(minRooms) && minRooms > 0) {
    clauses.push('rooms >= @minRooms');
    params.minRooms = minRooms;
  }

  const q = query.get('q');
  if (q) {
    clauses.push('(title LIKE @q OR city LIKE @q OR neighborhood LIKE @q OR description LIKE @q)');
    params.q = `%${q}%`;
  }

  if (query.get('featured') === '1') {
    clauses.push('featured = 1');
  }

  const page = Math.max(1, parseInt(query.get('page') || '1', 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.get('pageSize') || '12', 10) || 12));
  const offset = (page - 1) * pageSize;

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) AS count FROM properties ${where}`).get(params).count;
  const rows = db
    .prepare(
      `SELECT * FROM properties ${where} ORDER BY featured DESC, created_at DESC LIMIT ${pageSize} OFFSET ${offset}`
    )
    .all(params);

  const items = rows.map((row) => serialize(row, imagesFor(row.id)));
  sendJson(res, 200, { items, total, page, pageSize });
}

function getBySlug(req, res, slug) {
  const row = db.prepare('SELECT * FROM properties WHERE slug = ?').get(slug);
  if (!row) return sendJson(res, 404, { error: 'Inmueble no encontrado' });
  if (row.status !== 'published' && !isAdmin(req)) {
    return sendJson(res, 404, { error: 'Inmueble no encontrado' });
  }
  sendJson(res, 200, serialize(row, imagesFor(row.id)));
}

function getById(req, res, id) {
  const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
  if (!row) return sendJson(res, 404, { error: 'Inmueble no encontrado' });
  sendJson(res, 200, serialize(row, imagesFor(row.id)));
}

function validateAndNormalize(body, { partial } = { partial: false }) {
  const data = {};
  const errors = [];

  if (!partial || body.title !== undefined) {
    if (!body.title || String(body.title).trim().length < 3) errors.push('El titulo es obligatorio (min 3 caracteres)');
    data.title = String(body.title || '').trim();
  }
  if (!partial || body.operation !== undefined) {
    if (!OPERATIONS.has(body.operation)) errors.push('Operacion invalida');
    data.operation = body.operation;
  }
  if (!partial || body.type !== undefined) {
    if (!TYPES.has(body.type)) errors.push('Tipo de inmueble invalido');
    data.type = body.type;
  }
  if (!partial || body.condition !== undefined) {
    if (!CONDITIONS.has(body.condition)) errors.push('Estado del inmueble invalido');
    data.condition = body.condition;
  }
  if (!partial || body.status !== undefined) {
    if (!STATUSES.has(body.status)) errors.push('Estado de publicacion invalido');
    data.status = body.status;
  }

  for (const field of TEXT_FIELDS) {
    if (!partial || body[field] !== undefined) {
      data[field] = body[field] !== undefined ? String(body[field]).trim() : '';
    }
  }
  for (const field of NUMBER_FIELDS) {
    if (!partial || body[field] !== undefined) {
      const n = Number(body[field]);
      if (!Number.isFinite(n) || n < 0) errors.push(`El campo ${field} debe ser un numero valido`);
      data[field] = Number.isFinite(n) ? n : 0;
    }
  }
  for (const field of BOOL_FIELDS) {
    if (!partial || body[field] !== undefined) {
      data[field] = body[field] ? 1 : 0;
    }
  }

  return { data, errors };
}

async function create(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendJson(res, err.statusCode || 400, { error: 'Solicitud invalida' });
  }

  body.operation = body.operation || 'venta';
  body.type = body.type || 'piso';
  body.condition = body.condition || 'segunda_mano';
  body.status = body.status || 'draft';

  const { data, errors } = validateAndNormalize(body, { partial: false });
  if (errors.length) return sendJson(res, 400, { error: errors.join('. ') });

  const slug = uniqueSlug(slugify(data.title));
  const reference = nextReference();

  const insert = db.prepare(`
    INSERT INTO properties
      (reference, slug, title, description, operation, type, condition, price,
       city, neighborhood, address, area_m2, rooms, bathrooms, floor,
       has_elevator, has_garage, has_terrace, has_pool, featured, status)
    VALUES
      (@reference, @slug, @title, @description, @operation, @type, @condition, @price,
       @city, @neighborhood, @address, @area_m2, @rooms, @bathrooms, @floor,
       @has_elevator, @has_garage, @has_terrace, @has_pool, @featured, @status)
  `);
  const result = insert.run({ ...data, reference, slug });
  const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(result.lastInsertRowid);
  sendJson(res, 201, serialize(row, []));
}

async function update(req, res, id) {
  const existing = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
  if (!existing) return sendJson(res, 404, { error: 'Inmueble no encontrado' });

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendJson(res, err.statusCode || 400, { error: 'Solicitud invalida' });
  }

  const { data, errors } = validateAndNormalize(body, { partial: true });
  if (errors.length) return sendJson(res, 400, { error: errors.join('. ') });

  const fields = Object.keys(data);
  if (fields.length === 0) return sendJson(res, 200, serialize(existing, imagesFor(existing.id)));

  const setClause = fields.map((f) => `${f} = @${f}`).join(', ');
  db.prepare(`UPDATE properties SET ${setClause}, updated_at = datetime('now') WHERE id = @id`).run({
    ...data,
    id,
  });

  const row = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
  sendJson(res, 200, serialize(row, imagesFor(row.id)));
}

function remove(req, res, id) {
  const existing = db.prepare('SELECT * FROM properties WHERE id = ?').get(id);
  if (!existing) return sendJson(res, 404, { error: 'Inmueble no encontrado' });

  const images = imagesFor(id);
  db.prepare('DELETE FROM properties WHERE id = ?').run(id);

  for (const img of images) {
    const filePath = path.join(UPLOADS_DIR, img.filename);
    fs.rm(filePath, { force: true }, () => {});
  }

  sendJson(res, 200, { ok: true });
}

module.exports = {
  list,
  getBySlug,
  getById,
  create,
  update,
  remove,
  isAdmin,
  imagesFor,
  serialize,
};
