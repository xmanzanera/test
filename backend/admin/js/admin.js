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

const BRAND_MARK_SVG = `<svg viewBox="0 0 40 40" aria-hidden="true">
  <path d="M6 17 L20 6 L34 17" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="20" cy="25" r="11.5" fill="none" stroke="currentColor" stroke-width="4"/>
  <line class="bar" x1="16" y1="20" x2="16" y2="30" stroke-width="4.2" stroke-linecap="round"/>
  <line class="bar" x1="24" y1="20" x2="24" y2="30" stroke-width="4.2" stroke-linecap="round"/>
</svg>`;

function brandLogoHtml({ onDark = false } = {}) {
  return `<span class="brand-logo${onDark ? ' on-dark' : ''}">B<span class="brand-mark">${BRAND_MARK_SVG}</span>MMAIN</span>`;
}

const OPERATION_LABELS = { venta: 'Venta', alquiler: 'Alquiler' };
const LEAD_STATUS_LABELS = { nuevo: 'Nuevo', contactado: 'Contactado', cerrado: 'Cerrado' };

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options,
  });
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    const error = new Error((data && data.error) || `Error ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return data;
}

async function requireAuth() {
  try {
    return await api('/api/auth/me');
  } catch {
    window.location.href = '/admin/';
    return null;
  }
}

function formatPrice(value, operation) {
  const formatted = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value);
  return operation === 'alquiler' ? `${formatted} €/mes` : `${formatted} €`;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
}

function renderSidebar(active) {
  const el = document.getElementById('sidebar');
  if (!el) return;
  const items = [
    { key: 'dashboard', href: '/admin/dashboard.html', label: 'Panel general' },
    { key: 'propiedades', href: '/admin/propiedades.html', label: 'Inmuebles' },
    { key: 'mensajes', href: '/admin/mensajes.html', label: 'Mensajes' },
  ];
  el.innerHTML = `
    <div class="brand">${brandLogoHtml({ onDark: true })}<span class="tagline">Panel de gestión</span></div>
    <nav>
      ${items
        .map(
          (item) =>
            `<a href="${item.href}" class="${item.key === active ? 'active' : ''}">${item.label}</a>`
        )
        .join('')}
    </nav>
    <div class="logout" id="logoutBtn">Cerrar sesión</div>
  `;
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/';
  });
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
