'use strict';

const { db } = require('../db');
const {
  verifyPassword,
  createToken,
  setSessionCookie,
  clearSessionCookie,
  getSession,
} = require('../auth');
const { sendJson, readJsonBody } = require('../utils');

async function login(req, res) {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendJson(res, err.statusCode || 400, { error: 'Solicitud invalida' });
  }
  const email = (body.email || '').toString().trim().toLowerCase();
  const password = (body.password || '').toString();
  if (!email || !password) {
    return sendJson(res, 400, { error: 'Email y contrasena son obligatorios' });
  }

  const user = db.prepare('SELECT * FROM admin_users WHERE email = ?').get(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return sendJson(res, 401, { error: 'Credenciales incorrectas' });
  }

  const token = createToken(user.id);
  setSessionCookie(res, token);
  sendJson(res, 200, { id: user.id, email: user.email, name: user.name });
}

function logout(req, res) {
  clearSessionCookie(res);
  sendJson(res, 200, { ok: true });
}

function me(req, res) {
  const session = getSession(req);
  if (!session) return sendJson(res, 401, { error: 'No autenticado' });
  const user = db.prepare('SELECT id, email, name FROM admin_users WHERE id = ?').get(session.uid);
  if (!user) return sendJson(res, 401, { error: 'No autenticado' });
  sendJson(res, 200, user);
}

module.exports = { login, logout, me };
