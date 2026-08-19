'use strict';

const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');
const { hashPassword } = require('./auth');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'app.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  operation TEXT NOT NULL DEFAULT 'venta',
  type TEXT NOT NULL DEFAULT 'piso',
  condition TEXT NOT NULL DEFAULT 'segunda_mano',
  price REAL NOT NULL DEFAULT 0,
  city TEXT NOT NULL DEFAULT '',
  neighborhood TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  area_m2 REAL NOT NULL DEFAULT 0,
  rooms INTEGER NOT NULL DEFAULT 0,
  bathrooms INTEGER NOT NULL DEFAULT 0,
  floor TEXT NOT NULL DEFAULT '',
  has_elevator INTEGER NOT NULL DEFAULT 0,
  has_garage INTEGER NOT NULL DEFAULT 0,
  has_terrace INTEGER NOT NULL DEFAULT 0,
  has_pool INTEGER NOT NULL DEFAULT 0,
  featured INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS property_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'nuevo',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_operation ON properties(operation);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(type);
CREATE INDEX IF NOT EXISTS idx_images_property ON property_images(property_id);
`);

function seedIfEmpty() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM admin_users').get();
  if (count === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@horizonte.test';
    const password = process.env.ADMIN_PASSWORD || 'admin1234';
    db.prepare(
      'INSERT INTO admin_users (email, password_hash, name) VALUES (?, ?, ?)'
    ).run(email, hashPassword(password), 'Administrador');
    console.log(`[seed] Usuario admin creado -> ${email} / ${password}`);
  }

  const { count: propCount } = db.prepare('SELECT COUNT(*) AS count FROM properties').get();
  if (propCount === 0) {
    const demo = [
      {
        reference: 'HZ-0001',
        slug: 'atico-con-terraza-en-el-centro',
        title: 'Ático con terraza en el centro',
        description:
          'Luminoso ático reformado en pleno centro de la ciudad, con terraza privada de 20 m2 orientada al sur. Cocina equipada, salón amplio y dos habitaciones dobles. A pie de todos los servicios.',
        operation: 'venta',
        type: 'atico',
        condition: 'reformado',
        price: 285000,
        city: 'Valencia',
        neighborhood: 'Ciutat Vella',
        address: 'Calle de la Paz, 12',
        area_m2: 95,
        rooms: 2,
        bathrooms: 2,
        floor: '5º',
        has_elevator: 1,
        has_garage: 0,
        has_terrace: 1,
        has_pool: 0,
        featured: 1,
        status: 'published',
      },
      {
        reference: 'HZ-0002',
        slug: 'piso-luminoso-junto-al-parque',
        title: 'Piso luminoso junto al parque',
        description:
          'Piso de tres habitaciones totalmente exterior, muy luminoso, junto a zona verde. Edificio con ascensor y portero. Ideal para familias.',
        operation: 'venta',
        type: 'piso',
        condition: 'segunda_mano',
        price: 189000,
        city: 'Valencia',
        neighborhood: 'Benimaclet',
        address: 'Avenida del Parque, 44',
        area_m2: 88,
        rooms: 3,
        bathrooms: 1,
        floor: '2º',
        has_elevator: 1,
        has_garage: 0,
        has_terrace: 0,
        has_pool: 0,
        featured: 1,
        status: 'published',
      },
      {
        reference: 'HZ-0003',
        slug: 'chalet-independiente-con-piscina',
        title: 'Chalet independiente con piscina',
        description:
          'Amplio chalet independiente en parcela de 500 m2 con piscina privada y jardín. Cuatro habitaciones, garaje para dos coches y zona de porche.',
        operation: 'venta',
        type: 'chalet',
        condition: 'segunda_mano',
        price: 495000,
        city: 'Godella',
        neighborhood: 'Centro',
        address: 'Camino de la Font, 8',
        area_m2: 240,
        rooms: 4,
        bathrooms: 3,
        floor: '',
        has_elevator: 0,
        has_garage: 1,
        has_terrace: 1,
        has_pool: 1,
        featured: 1,
        status: 'published',
      },
      {
        reference: 'HZ-0004',
        slug: 'estudio-en-alquiler-cerca-de-la-universidad',
        title: 'Estudio en alquiler cerca de la universidad',
        description:
          'Estudio reformado ideal para estudiantes o profesionales, a 5 minutos andando del campus. Totalmente amueblado y equipado.',
        operation: 'alquiler',
        type: 'piso',
        condition: 'reformado',
        price: 650,
        city: 'Valencia',
        neighborhood: 'Blasco Ibáñez',
        address: 'Calle Universitat, 3',
        area_m2: 40,
        rooms: 1,
        bathrooms: 1,
        floor: '3º',
        has_elevator: 1,
        has_garage: 0,
        has_terrace: 0,
        has_pool: 0,
        featured: 0,
        status: 'published',
      },
      {
        reference: 'HZ-0005',
        slug: 'local-comercial-en-avenida-principal',
        title: 'Local comercial en avenida principal',
        description:
          'Local comercial a pie de calle con gran escaparate, ideal para negocio de hostelería o retail. Instalación eléctrica y de agua recién renovada.',
        operation: 'alquiler',
        type: 'local',
        condition: 'segunda_mano',
        price: 1200,
        city: 'Valencia',
        neighborhood: 'Ruzafa',
        address: 'Gran Vía Marqués del Turia, 55',
        area_m2: 120,
        rooms: 0,
        bathrooms: 1,
        floor: 'Bajo',
        has_elevator: 0,
        has_garage: 0,
        has_terrace: 0,
        has_pool: 0,
        featured: 0,
        status: 'published',
      },
      {
        reference: 'HZ-0006',
        slug: 'duplex-a-reformar-con-vistas',
        title: 'Dúplex a reformar con vistas',
        description:
          'Dúplex con vistas despejadas, pendiente de reforma integral. Gran potencial de revalorización en zona muy solicitada.',
        operation: 'venta',
        type: 'duplex',
        condition: 'a_reformar',
        price: 145000,
        city: 'Paterna',
        neighborhood: 'Centro',
        address: 'Calle Mayor, 21',
        area_m2: 110,
        rooms: 3,
        bathrooms: 2,
        floor: '4º',
        has_elevator: 0,
        has_garage: 0,
        has_terrace: 1,
        has_pool: 0,
        featured: 0,
        status: 'draft',
      },
    ];

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
    for (const p of demo) insert.run(p);
    console.log(`[seed] ${demo.length} inmuebles de demostración creados`);
  }
}

module.exports = { db, seedIfEmpty };
