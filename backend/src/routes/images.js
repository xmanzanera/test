'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db } = require('../db');
const { sendJson, readJsonBody } = require('../utils');

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');
const ALLOWED_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

async function addImage(req, res, propertyId) {
  const property = db.prepare('SELECT id FROM properties WHERE id = ?').get(propertyId);
  if (!property) return sendJson(res, 404, { error: 'Inmueble no encontrado' });

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendJson(res, err.statusCode || 400, { error: 'Solicitud invalida' });
  }

  const dataUrl = body.data;
  if (!dataUrl || typeof dataUrl !== 'string') {
    return sendJson(res, 400, { error: 'Falta la imagen (campo data en base64)' });
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!match) return sendJson(res, 400, { error: 'Formato de imagen invalido' });

  const mime = match[1].toLowerCase();
  const ext = ALLOWED_MIME[mime];
  if (!ext) return sendJson(res, 400, { error: 'Solo se admiten imagenes JPG, PNG, WEBP o GIF' });

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
    return sendJson(res, 400, { error: 'La imagen debe pesar menos de 8MB' });
  }

  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

  const { maxPos } = db
    .prepare('SELECT COALESCE(MAX(position), -1) AS maxPos FROM property_images WHERE property_id = ?')
    .get(propertyId);
  const result = db
    .prepare('INSERT INTO property_images (property_id, filename, position) VALUES (?, ?, ?)')
    .run(propertyId, filename, maxPos + 1);

  sendJson(res, 201, { id: result.lastInsertRowid, url: `/uploads/${filename}`, position: maxPos + 1 });
}

function removeImage(req, res, imageId) {
  const image = db.prepare('SELECT * FROM property_images WHERE id = ?').get(imageId);
  if (!image) return sendJson(res, 404, { error: 'Imagen no encontrada' });

  db.prepare('DELETE FROM property_images WHERE id = ?').run(imageId);
  fs.rm(path.join(UPLOADS_DIR, image.filename), { force: true }, () => {});

  sendJson(res, 200, { ok: true });
}

module.exports = { addImage, removeImage };
