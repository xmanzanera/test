'use strict';

const TYPE_LABELS = {
  piso: 'Piso',
  atico: 'Ático',
  duplex: 'Dúplex',
  chalet: 'Chalet',
  casa: 'Casa',
  local: 'Local comercial',
  garaje: 'Garaje',
  terreno: 'Terreno',
};
const CONDITION_LABELS = {
  obra_nueva: 'Obra nueva',
  segunda_mano: 'Segunda mano',
  reformado: 'Reformado',
  a_reformar: 'A reformar',
};

const HOUSE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9.5a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>`;

async function fetchJson(path, options) {
  const res = await fetch(path, options);
  const text = await res.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = null; }
  }
  if (!res.ok) {
    throw new Error((data && data.error) || `Error ${res.status}`);
  }
  return data;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function formatPrice(value, operation) {
  const formatted = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value);
  return operation === 'alquiler' ? `${formatted} €/mes` : `${formatted} €`;
}

function renderHeader(active) {
  const el = document.getElementById('site-header');
  if (!el) return;
  const links = [
    { href: '/index.html', label: 'Inicio', key: 'inicio' },
    { href: '/propiedades.html?operation=venta', label: 'Comprar', key: 'comprar' },
    { href: '/propiedades.html?operation=alquiler', label: 'Alquilar', key: 'alquilar' },
    { href: '/nosotros.html', label: 'Nosotros', key: 'nosotros' },
    { href: '/contacto.html', label: 'Contacto', key: 'contacto' },
  ];
  el.innerHTML = `
    <div class="bar">
      <a class="logo" href="/index.html"><span class="dot"></span>Horizonte Inmobiliaria</a>
      <button class="nav-toggle" id="navToggle" aria-label="Abrir menu">&#9776;</button>
      <nav class="nav-links" id="navLinks">
        ${links.map((l) => `<a href="${l.href}" class="${l.key === active ? 'active' : ''}">${l.label}</a>`).join('')}
      </nav>
    </div>
  `;
  document.getElementById('navToggle').addEventListener('click', () => {
    document.getElementById('navLinks').classList.toggle('open');
  });
}

function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  el.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <h4>Horizonte Inmobiliaria</h4>
          <p>Te acompañamos en cada paso de la compra, venta o alquiler de tu próxima vivienda, con un trato cercano y profesional.</p>
        </div>
        <div>
          <h4>Enlaces</h4>
          <ul>
            <li><a href="/propiedades.html?operation=venta">Comprar</a></li>
            <li><a href="/propiedades.html?operation=alquiler">Alquilar</a></li>
            <li><a href="/nosotros.html">Nosotros</a></li>
            <li><a href="/contacto.html">Contacto</a></li>
          </ul>
        </div>
        <div>
          <h4>Contacto</h4>
          <ul>
            <li>Calle Colón, 25 · Valencia</li>
            <li>+34 960 000 000</li>
            <li>hola@horizonteinmobiliaria.test</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">© ${new Date().getFullYear()} Horizonte Inmobiliaria. Sitio de demostración con fines educativos.</div>
    </div>
  `;
}

function propertyCardHtml(p) {
  const photo = p.images && p.images[0]
    ? `<img src="${p.images[0].url}" alt="${escapeHtml(p.title)}">`
    : HOUSE_ICON;
  return `
    <a class="property-card" href="/propiedad.html?slug=${encodeURIComponent(p.slug)}">
      <div class="property-photo">
        <span class="tag ${p.operation}">${p.operation === 'alquiler' ? 'Alquiler' : 'Venta'}</span>
        ${photo}
      </div>
      <div class="property-body">
        <div class="property-price">${formatPrice(p.price, p.operation)}</div>
        <h3 class="property-title">${escapeHtml(p.title)}</h3>
        <div class="property-location">${escapeHtml(p.neighborhood ? `${p.neighborhood}, ${p.city}` : p.city)}</div>
        <div class="property-specs">
          <span>${p.rooms} hab.</span>
          <span>${p.bathrooms} baños</span>
          <span>${p.area_m2} m²</span>
        </div>
      </div>
    </a>
  `;
}

function initContactForm(formEl, { propertyId } = {}) {
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgBox = formEl.querySelector('[data-msg-box]') || formEl;
    const existing = formEl.parentElement.querySelector('.msg');
    if (existing) existing.remove();

    const submitBtn = formEl.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const payload = {
      name: formEl.name.value.trim(),
      email: formEl.email.value.trim(),
      phone: formEl.phone ? formEl.phone.value.trim() : '',
      message: formEl.message.value.trim(),
    };
    if (propertyId) payload.property_id = propertyId;

    try {
      await fetchJson('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const div = document.createElement('div');
      div.className = 'msg success';
      div.textContent = 'Gracias por tu mensaje. Nuestro equipo te contactará muy pronto.';
      formEl.parentElement.insertBefore(div, formEl);
      formEl.reset();
    } catch (err) {
      const div = document.createElement('div');
      div.className = 'msg error';
      div.textContent = err.message;
      formEl.parentElement.insertBefore(div, formEl);
    } finally {
      submitBtn.disabled = false;
    }
  });
}
