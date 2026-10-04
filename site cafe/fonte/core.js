/* =====================================================================
   NÚCLEO · utilitários, avisos, horário, tema, efeitos, menu, SEO, PWA
   ===================================================================== */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);
function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const slug = (t) => norm(t).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const money = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const store = {
  get(k, d) { try { const v = localStorage.getItem('gd_' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('gd_' + k, JSON.stringify(v)); } catch (e) {} },
};
const isPhone = matchMedia('(max-width: 820px)').matches;

// ---------- Efeitos reduzidos (preferência do sistema ou escolha do visitante) ----------
const root = document.documentElement;
const prefersCalm = matchMedia('(prefers-reduced-motion: reduce)').matches;
let calm = store.get('calm', prefersCalm);
root.classList.toggle('calm', calm);
// "reduceMotion" é lido pelo resto do site; é atualizado ao alternar
let reduceMotion = calm;
function setCalm(on) {
  calm = on; reduceMotion = on; store.set('calm', on);
  root.classList.toggle('calm', on);
  $$('[data-calm-label]').forEach((el) => { el.textContent = on ? 'Efeitos reduzidos' : 'Efeitos completos'; });
  showToast(on ? 'Efeitos reduzidos: menos movimento, mesma cafeína.' : 'Efeitos completos ligados.');
}

// ---------- Modo leve (aparelho fraco / economia de dados) ----------
const conn = navigator.connection || {};
const autoLite = !!(conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '') || (navigator.deviceMemory && navigator.deviceMemory <= 2));
let lite = store.get('lite', autoLite);
root.classList.toggle('lite', lite);

// ---------- Tema claro/escuro ----------
const ICO = (d) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICO_MOON = ICO('M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z');
const ICO_SUN = ICO('M12 8a4 4 0 1 0 0 8a4 4 0 1 0 0-8M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4');
let theme = store.get('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
root.dataset.theme = theme;
function setTheme(t) {
  theme = t; root.dataset.theme = t; store.set('theme', t);
  $$('[data-theme-ico]').forEach((el) => { el.innerHTML = t === 'dark' ? ICO_SUN : ICO_MOON; });
  const m = $('meta[name="theme-color"]'); if (m) m.content = t === 'dark' ? '#120d0a' : '#15100c';
}

// ---------- Aviso flutuante ----------
let toastTimer;
function showToast(message) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- Horário de funcionamento ao vivo ----------
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
function openStatus(now = new Date()) {
  const d = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
  const today = CONFIG.horarios[d];
  if (today && mins >= toMin(today[0]) && mins < toMin(today[1])) {
    const left = toMin(today[1]) - mins;
    return { open: true, label: left <= 45 ? `Aberto · fecha em ${left} min` : `Aberto · até ${today[1].replace(':00', 'h')}` };
  }
  for (let k = 0; k < 8; k++) {
    const dd = (d + k) % 7, h = CONFIG.horarios[dd];
    if (!h) continue;
    if (k === 0 && mins >= toMin(h[0])) continue;
    const when = k === 0 ? 'hoje' : k === 1 ? 'amanhã' : DIAS[dd];
    return { open: false, label: `Fechado · abre ${when} às ${h[0].replace(':00', 'h')}` };
  }
  return { open: false, label: 'Fechado' };
}
function paintStatus() {
  const s = openStatus();
  $$('[data-open]').forEach((el) => { el.classList.toggle('is-open', s.open); el.querySelector('span').textContent = s.label; });
}

// ---------- Textos que vêm da configuração ----------
function fillConfig() {
  const e = CONFIG.endereco;
  const map = {
    nome: CONFIG.nome, telefone: CONFIG.telefone, email: CONFIG.email, cnpj: CONFIG.cnpj,
    endereco: `${e.rua} · ${e.bairro} · ${e.cidade}/${e.uf}`, cep: e.cep, instagram: '@' + CONFIG.instagram,
    prazo: CONFIG.entrega.prazo, gratis: money(CONFIG.entrega.gratisAPartirDe),
  };
  $$('[data-cfg]').forEach((el) => { const v = map[el.dataset.cfg]; if (v) el.textContent = v; });
  $$('[data-cfg-href]').forEach((el) => {
    const k = el.dataset.cfgHref;
    if (k === 'tel') el.href = 'tel:+55' + CONFIG.telefone.replace(/\D/g, '');
    if (k === 'mail') el.href = 'mailto:' + CONFIG.email;
    if (k === 'insta') el.href = 'https://instagram.com/' + CONFIG.instagram;
    if (k === 'maps') el.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.rua}, ${e.bairro}, ${e.cidade} - ${e.uf}`)}`;
    if (k === 'review') el.href = CONFIG.linkAvaliarGoogle;
    if (k === 'wa') el.href = CONFIG.whatsapp ? `https://wa.me/${CONFIG.whatsapp}` : '#contato';
  });
}

// ---------- Dados estruturados para o Google (schema.org) ----------
function injectSchema() {
  const e = CONFIG.endereco;
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = Object.entries(CONFIG.horarios).filter(([, h]) => h).map(([d, h]) => ({
    '@type': 'OpeningHoursSpecification', dayOfWeek: days[d], opens: h[0], closes: h[1],
  }));
  const sections = {};
  $$('#grid .card').forEach((c) => {
    const cat = c.dataset.catName || 'Cardápio';
    (sections[cat] = sections[cat] || []).push({
      '@type': 'MenuItem', name: c.querySelector('h3').textContent.trim(), description: c.querySelector('p').textContent.trim(),
      offers: { '@type': 'Offer', price: (+c.dataset.price).toFixed(2), priceCurrency: 'BRL' },
    });
  });
  const data = {
    '@context': 'https://schema.org', '@type': 'CafeOrCoffeeShop', name: CONFIG.nome, description: CONFIG.slogan,
    telephone: CONFIG.telefone, email: CONFIG.email, servesCuisine: ['Café', 'Padaria', 'Doces'], priceRange: 'R$',
    address: { '@type': 'PostalAddress', streetAddress: e.rua, addressLocality: e.cidade, addressRegion: e.uf, postalCode: e.cep, addressCountry: 'BR' },
    geo: { '@type': 'GeoCoordinates', latitude: e.lat, longitude: e.lng },
    openingHoursSpecification: hours,
    hasMenu: { '@type': 'Menu', hasMenuSection: Object.entries(sections).map(([n, items]) => ({ '@type': 'MenuSection', name: n, hasMenuItem: items })) },
  };
  const s = document.createElement('script'); s.type = 'application/ld+json'; s.textContent = JSON.stringify(data);
  document.head.appendChild(s);
}

// ---------- Menu do celular ----------
function mobileMenu() {
  const btn = $('#menuBtn'), sheet = $('#mmenu');
  if (!btn || !sheet) return;
  const open = (on) => {
    sheet.classList.toggle('open', on); btn.setAttribute('aria-expanded', on);
    btn.setAttribute('aria-label', on ? 'Fechar menu' : 'Abrir menu');
    document.body.classList.toggle('noscroll', on);
  };
  btn.addEventListener('click', () => open(!sheet.classList.contains('open')));
  sheet.addEventListener('click', (ev) => { if (ev.target.closest('a') || ev.target === sheet) open(false); });
  addEventListener('keydown', (ev) => { if (ev.key === 'Escape') open(false); });
}

// ---------- App instalável (PWA) ----------
function registerSW() {
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', () => {
  fillConfig(); paintStatus(); setInterval(paintStatus, 60000);
  setTheme(theme);
  $$('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => setTheme(theme === 'dark' ? 'light' : 'dark')));
  $$('[data-calm-label]').forEach((el) => { el.textContent = calm ? 'Efeitos reduzidos' : 'Efeitos completos'; });
  $$('[data-calm-toggle]').forEach((b) => b.addEventListener('click', () => setCalm(!calm)));
  mobileMenu(); injectSchema(); registerSW();
});
