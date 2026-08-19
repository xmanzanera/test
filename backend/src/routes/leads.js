'use strict';

const { db } = require('../db');
const { sendJson, readJsonBody } = require('../utils');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function create(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendJson(res, err.statusCode || 400, { error: 'Solicitud invalida' });
  }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const phone = String(body.phone || '').trim();
  const message = String(body.message || '').trim();
  const propertyId = body.property_id ? Number(body.property_id) : null;

  const errors = [];
  if (name.length < 2) errors.push('El nombre es obligatorio');
  if (!EMAIL_RE.test(email)) errors.push('El email no es valido');
  if (message.length < 5) errors.push('El mensaje es demasiado corto');
  if (errors.length) return sendJson(res, 400, { error: errors.join('. ') });

  if (propertyId) {
    const prop = db.prepare('SELECT id FROM properties WHERE id = ?').get(propertyId);
    if (!prop) return sendJson(res, 400, { error: 'El inmueble indicado no existe' });
  }

  const result = db
    .prepare('INSERT INTO leads (property_id, name, email, phone, message) VALUES (?, ?, ?, ?, ?)')
    .run(propertyId, name, email, phone, message);

  sendJson(res, 201, { id: result.lastInsertRowid, ok: true });
}

function list(req, res, query) {
  const status = query.get('status');
  let rows;
  if (status) {
    rows = db
      .prepare(
        `SELECT leads.*, properties.title AS property_title, properties.slug AS property_slug
         FROM leads LEFT JOIN properties ON properties.id = leads.property_id
         WHERE leads.status = ? ORDER BY leads.created_at DESC`
      )
      .all(status);
  } else {
    rows = db
      .prepare(
        `SELECT leads.*, properties.title AS property_title, properties.slug AS property_slug
         FROM leads LEFT JOIN properties ON properties.id = leads.property_id
         ORDER BY leads.created_at DESC`
      )
      .all();
  }
  sendJson(res, 200, { items: rows });
}

async function updateStatus(req, res, id) {
  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (!existing) return sendJson(res, 404, { error: 'Mensaje no encontrado' });

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendJson(res, err.statusCode || 400, { error: 'Solicitud invalida' });
  }

  const status = String(body.status || '').trim();
  if (!['nuevo', 'contactado', 'cerrado'].includes(status)) {
    return sendJson(res, 400, { error: 'Estado invalido' });
  }

  db.prepare('UPDATE leads SET status = ? WHERE id = ?').run(status, id);
  sendJson(res, 200, { ok: true });
}

function remove(req, res, id) {
  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (!existing) return sendJson(res, 404, { error: 'Mensaje no encontrado' });
  db.prepare('DELETE FROM leads WHERE id = ?').run(id);
  sendJson(res, 200, { ok: true });
}

module.exports = { create, list, updateStatus, remove };
