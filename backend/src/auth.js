'use strict';

const crypto = require('node:crypto');

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me-in-production';
const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 dias
const COOKIE_NAME = 'horizonte_admin_session';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(candidate, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function sign(payloadObj) {
  const payload = base64url(JSON.stringify(payloadObj));
  const signature = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function createToken(userId) {
  const payload = { uid: userId, exp: Date.now() + TOKEN_TTL_MS };
  return sign(payload);
}

function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

function parseCookies(req) {
  const header = req.headers.cookie;
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function setSessionCookie(res, token) {
  const maxAge = Math.floor(TOKEN_TTL_MS / 1000);
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function getSession(req) {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  return verifyToken(token);
}

module.exports = {
  COOKIE_NAME,
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
  getSession,
};
