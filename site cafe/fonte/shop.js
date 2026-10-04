/* =====================================================================
   LOJA · catálogo, opções dos itens, carrinho em 3 passos, frete por CEP,
   Pix com QR Code, fidelidade, assinatura, kit presente, FAQ, mapa, PDF
   ===================================================================== */
const cents = (v) => Math.round((+v || 0) * 100);
const brl = (c) => money(c / 100);
const DRINK = new Set(['quentes', 'gelados']);

// ---------- Catálogo (lido dos cartões do HTML) ----------
const CATALOG = {};
$$('#grid .card').forEach((card) => {
  const id = card.dataset.id;
  const img = card.querySelector('img');
  CATALOG[id] = {
    id, name: card.querySelector('h3').textContent.trim(), desc: card.querySelector('p').textContent.trim(),
    price: +card.dataset.price, cat: card.dataset.cat, catName: card.dataset.catName, opt: card.dataset.opt,
    allerg: (card.dataset.allerg || '').split(',').filter(Boolean), diet: card.dataset.diet || '',
    img: img ? img.getAttribute('src') : '', bg: card.querySelector('.card-img').style.getPropertyValue('--bg') || '#f3d9b8',
  };
});
const ALLERG = { leite: 'leite', gluten: 'glúten', ovos: 'ovos', soja: 'soja' };
const DIET = { 'sem-gluten': 'sem glúten', vegano: 'vegano', 'vegano-opc': 'opção vegana' };

// ---------- Opções de cada tipo de item ----------
const SUGAR = { k: 'acucar', label: 'Açúcar', items: [['Sem açúcar', 0], ['Pouco açúcar', 0], ['Açúcar normal', 0]] };
const OPTS = {
  espresso: [
    { k: 'dose', label: 'Dose', items: [['Simples', 0], ['Dupla', 4]] },
    SUGAR,
    { k: 'agua', label: 'Acompanha', items: [['Só o café', 0], ['Água com gás', 2.5]] },
  ],
  milk: [
    { k: 'tam', label: 'Tamanho', items: [['P · 180 ml', 0], ['M · 300 ml', 3], ['G · 400 ml', 5]] },
    { k: 'leite', label: 'Leite', items: [['Integral', 0], ['Sem lactose', 1.5], ['Aveia', 3], ['Amêndoas', 3.5]] },
    SUGAR,
    { k: 'extra', label: 'Extras', many: true, items: [['Shot extra', 4], ['Canela', 0], ['Calda de caramelo', 2.5]] },
  ],
  filter: [
    SUGAR,
    { k: 'temp', label: 'Servir', items: [['Quente', 0], ['Com gelo', 0]] },
  ],
  cold: [
    { k: 'tam', label: 'Tamanho', items: [['M · 350 ml', 0], ['G · 500 ml', 4]] },
    { k: 'leite', label: 'Leite', items: [['Sem leite', 0], ['Integral', 2], ['Aveia', 4]] },
    { k: 'xarope', label: 'Xarope', items: [['Nenhum', 0], ['Baunilha', 2.5], ['Caramelo', 2.5], ['Avelã', 3]] },
    SUGAR,
  ],
  'food-warm': [{ k: 'aquecer', label: 'Como prefere', items: [['Aquecido', 0], ['Temperatura ambiente', 0]] }],
  bag: [{ k: 'moagem', label: 'Moagem', items: [['Em grãos', 0], ['Coador / filtro', 0], ['Espresso', 0], ['Prensa francesa', 0], ['Moka', 0]] }],
  'bag-ground': [{ k: 'moagem', label: 'Moagem', items: [['Coador / filtro', 0], ['Espresso', 0], ['Prensa francesa', 0], ['Moka', 0]] }],
};
const optsOf = (p) => OPTS[p.opt] || [];
function optExtra(p, sel) {
  let s = 0;
  optsOf(p).forEach((g) => g.items.forEach(([v, d]) => {
    const on = g.many ? (sel[g.k] || []).includes(v) : sel[g.k] === v;
    if (on) s += cents(d);
  }));
  return s;
}
function optLabel(p, sel) {
  const out = [];
  optsOf(p).forEach((g) => {
    const v = sel[g.k];
    if (g.many) { if (v && v.length) out.push(v.join(' + ')); }
    else if (v) out.push(v);
  });
  return out.join(' · ');
}
function defaults(p) { const s = {}; optsOf(p).forEach((g) => { s[g.k] = g.many ? [] : g.items[0][0]; }); return s; }

// ---------- Estado ----------
let lines = store.get('lines', []);
let coupon = store.get('coupon', null);
let stamps = store.get('stamps', 0);
const NEED = CONFIG.fidelidade.selos;
const ck = { mode: 'entrega', quote: null, useReward: false, pay: 'pix', view: 'cart' };
lines = lines.filter((l) => l.custom || CATALOG[l.id]);
const save = () => { store.set('lines', lines); store.set('coupon', coupon); };
const unit = (l) => (l.custom ? l.custom.price : cents(CATALOG[l.id].price)) + (l.extra || 0);
const lineName = (l) => (l.custom ? l.custom.name : CATALOG[l.id].name);
const lineImg = (l) => (l.custom ? l.custom.img : CATALOG[l.id].img);
const lineBg = (l) => (l.custom ? l.custom.bg : CATALOG[l.id].bg);

function totals() {
  const sub = lines.reduce((t, l) => t + unit(l) * l.q, 0);
  const cp = coupon && CONFIG.cupons[coupon];
  const disc = cp ? Math.round(sub * cp.pct / 100) : 0;
  let reward = 0;
  if (ck.useReward && stamps >= NEED) {
    const drinks = lines.filter((l) => !l.custom && DRINK.has(CATALOG[l.id].cat)).map(unit);
    if (drinks.length) reward = Math.min(Math.min(...drinks), 1600);
  }
  const after = Math.max(0, sub - disc - reward);
  const E = CONFIG.entrega;
  let ship = 0, shipTxt = 'Grátis', blocked = '';
  if (ck.mode === 'retirada') { ship = 0; shipTxt = 'Retirada · grátis'; }
  else if (!ck.quote) { ship = 0; shipTxt = after >= cents(E.gratisAPartirDe) ? 'Grátis' : 'calculada pelo CEP'; }
  else if (ck.quote.out) { ship = 0; shipTxt = 'fora da área'; blocked = `Ainda não entregamos em ${ck.quote.cidade}. Escolha "Retirar na loja".`; }
  else { ship = after >= cents(E.gratisAPartirDe) ? 0 : cents(ck.quote.fee); shipTxt = ship ? brl(ship) : 'Grátis'; }
  if (ck.mode === 'entrega' && after < cents(E.pedidoMinimo)) blocked = blocked || `Pedido mínimo para entrega: ${money(E.pedidoMinimo)}. Abaixo disso, só retirada.`;
  return { sub, disc, reward, after, ship, shipTxt, total: after + ship, blocked, n: lines.reduce((a, l) => a + l.q, 0) };
}

// ---------- Elementos ----------
const cartEl = $('#cart'), veil = $('#cartVeil'), cartBtn = $('#cartBtn'), cartCount = $('#cartCount');

// ---------- Desenho do carrinho ----------
function drawCart() {
  const t = totals();
  cartCount.textContent = t.n; cartBtn.dataset.n = t.n;
  $('#cartList').innerHTML = lines.map((l, i) => `
    <li class="ci" data-i="${i}">
      <div class="ci-img" style="background:${lineBg(l)}"><img src="${lineImg(l)}" alt=""></div>
      <div><h4>${lineName(l)}</h4>${l.label ? `<small class="ci-opt">${l.label}</small>` : ''}<small>${brl(unit(l))} cada</small>
        <div class="qty"><button type="button" data-act="dec" aria-label="Diminuir">−</button><span>${l.q}</span><button type="button" data-act="inc" aria-label="Aumentar">+</button></div></div>
      <div class="ci-side"><strong>${brl(unit(l) * l.q)}</strong><button type="button" class="ci-rm" data-act="rm">remover</button></div>
    </li>`).join('');
  const has = lines.length > 0;
  $('#cartEmpty').hidden = has;
  $('#couponBox').hidden = !has;
  $('#ship').hidden = !has || ck.mode === 'retirada';
  const canReward = stamps >= NEED && lines.some((l) => !l.custom && DRINK.has(CATALOG[l.id].cat));
  $('#reward').hidden = !canReward;
  if (!canReward) ck.useReward = false;
  $('#useReward').checked = ck.useReward;
  $('#sSub').textContent = brl(t.sub);
  $('#rowDisc').hidden = !t.disc;
  if (t.disc) { $('#sDisc').textContent = '- ' + brl(t.disc); $('#discName').innerHTML = `(${coupon}) <button type="button" class="ci-rm coupon-rm" aria-label="Remover o cupom ${coupon}">remover</button>`; }
  $('#rowReward').hidden = !t.reward;
  if (t.reward) $('#sReward').textContent = '- ' + brl(t.reward);
  $('#sShip').textContent = t.shipTxt;
  $('#sTot').textContent = brl(t.total);
  const missing = cents(CONFIG.entrega.gratisAPartirDe) - t.after;
  $('#shipTxt').textContent = missing > 0 ? `Faltam ${brl(missing)} para a entrega grátis. Mais um pão de queijo não faz mal.` : 'Entrega grátis liberada! O motoboy agradece ☕';
  $('#shipFill').style.width = Math.min(100, (t.after / cents(CONFIG.entrega.gratisAPartirDe)) * 100) + '%';
  paintFoot(t);
  save();
}
function paintFoot(t = totals()) {
  const go = $('#cartGo'), back = $('#cartBack');
  $('#cartFoot').hidden = ck.view === 'done' || (ck.view === 'cart' && !lines.length);
  if (ck.view === 'cart') { go.firstChild.textContent = 'Continuar '; back.textContent = 'Esvaziar carrinho'; }
  if (ck.view === 'dados') { go.firstChild.textContent = 'Ir para pagamento '; back.textContent = '← Voltar aos itens'; }
  if (ck.view === 'pag') { go.firstChild.textContent = `Confirmar · ${brl(t.total)} `; back.textContent = '← Voltar à entrega'; }
  go.disabled = !lines.length;
}
function showView(v) {
  ck.view = v;
  const map = { cart: 'vCart', dados: 'vDados', pag: 'vPag', done: 'vDone' };
  Object.values(map).forEach((id) => { $('#' + id).hidden = true; });
  $('#' + map[v]).hidden = false;
  const idx = { cart: 0, dados: 1, pag: 2, done: 3 }[v];
  $$('#steps li').forEach((li, i) => { li.classList.toggle('on', i <= idx); });
  $('#cartTitle').textContent = { cart: 'Seu carrinho', dados: 'Entrega', pag: 'Pagamento', done: 'Pedido montado' }[v];
  $('.cart-scroll').scrollTop = 0;
  if (v === 'pag') drawResume();
  drawCart();
}
function openCart() {
  if (ck.view === 'done') showView('cart'); else drawCart();
  cartEl.classList.add('open'); veil.classList.add('open'); cartEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('noscroll');
  setTimeout(() => $('#cartClose').focus(), 300);
}
function closeCart() {
  cartEl.classList.remove('open'); veil.classList.remove('open'); cartEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('noscroll');
}

// ---------- Adicionar ----------
function pushLine(id, sel, q, custom) {
  const p = custom ? null : CATALOG[id];
  const key = custom ? 'c:' + custom.name + '|' + (custom.key || '') : id + '|' + JSON.stringify(sel || {});
  const found = lines.find((l) => l.key === key);
  if (found) found.q += q;
  else lines.push({ key, id, q, opts: sel || {}, extra: p ? optExtra(p, sel || {}) : 0, label: custom ? custom.label : (p ? optLabel(p, sel || {}) : ''), custom: custom || null });
  drawCart();
  cartBtn.classList.remove('pop'); void cartBtn.offsetWidth; cartBtn.classList.add('pop');
}
const JOKES = ['Sua segunda-feira agradece ☕', 'Boa escolha, seu paladar tem classe.', 'Mais um para a coleção de bons hábitos.', 'O barista está sorrindo.'];
function flyFrom(el, img) {
  if (!el || !img || reduceMotion) return;
  const a = el.getBoundingClientRect(), b = cartBtn.getBoundingClientRect();
  if (!a.width || !b.width) return;
  const f = document.createElement('img'); f.src = img; f.className = 'fly'; f.alt = '';
  f.style.left = a.left + a.width / 2 - 32 + 'px'; f.style.top = a.top + a.height / 2 - 32 + 'px';
  document.body.appendChild(f);
  f.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 },
    { transform: `translate(${b.left + b.width / 2 - a.left - a.width / 2}px, ${b.top + b.height / 2 - a.top - a.height / 2}px) scale(.25)`, opacity: 0.3 }],
  { duration: 750, easing: 'cubic-bezier(.5,0,.8,.4)' }).onfinish = () => f.remove();
}
function addToCart(id, fromEl, sel) {
  const p = CATALOG[id];
  if (!p) return;
  if (!sel && optsOf(p).length) { openOptions(id, fromEl); return; }
  pushLine(id, sel || {}, 1);
  showToast(`${p.name} no carrinho! ${JOKES[Math.floor(Math.random() * JOKES.length)]}`);
  flyFrom(fromEl, p.img);
}

// ---------- Janela de opções ----------
const OM = { id: null, sel: {}, q: 1, from: null };
function chipsHTML(p) {
  return [p.diet && `<i class="pchip ok">${DIET[p.diet]}</i>`, ...p.allerg.map((a) => `<i class="pchip al">${ALLERG[a]}</i>`)].filter(Boolean).join('');
}
function openOptions(id, from) {
  const p = CATALOG[id];
  OM.id = id; OM.sel = defaults(p); OM.q = 1; OM.from = from; OM.pour = true;
  const dkl = $('#drink .dk-layers'); if (dkl) dkl.innerHTML = '';
  $('#optImg').innerHTML = `<img src="${p.img}" alt="">`; $('#optImg').style.background = p.bg;
  $('#optName').textContent = p.name; $('#optDesc').textContent = p.desc; $('#optChips').innerHTML = chipsHTML(p);
  $('#optGroups').innerHTML = optsOf(p).map((g) => `
    <fieldset class="og"><legend>${g.label}${g.many ? ' <small>opcional</small>' : ''}</legend>
      <div class="og-items">${g.items.map(([v, d]) => `<button type="button" class="pill" data-k="${g.k}" data-v="${v}" data-many="${g.many ? 1 : ''}">${v}${d ? `<small>+ ${money(d)}</small>` : ''}</button>`).join('')}</div>
    </fieldset>`).join('');
  paintOptions();
  $('#opt').classList.add('open'); $('#optVeil').classList.add('open'); $('#opt').setAttribute('aria-hidden', 'false');
  document.body.classList.add('noscroll');
  setTimeout(() => $('#optAdd').focus(), 250);
}
function paintOptions() {
  const p = CATALOG[OM.id];
  $$('#optGroups .pill').forEach((b) => {
    const v = OM.sel[b.dataset.k];
    b.classList.toggle('on', b.dataset.many ? v.includes(b.dataset.v) : v === b.dataset.v);
    b.setAttribute('aria-pressed', b.classList.contains('on'));
  });
  $('#optQ').textContent = OM.q;
  const each = cents(p.price) + optExtra(p, OM.sel);
  $('#optAdd').firstChild.textContent = `Adicionar · ${brl(each * OM.q)} `;
  paintDrink();
}

// ---------- Sua bebida: copo de vidro montado ao vivo conforme as opções ----------
// Cada camada é { k: chave, t: nome, c: cor, h: altura em % do copo }. Ordem: de baixo para cima.
const MILK = { 'Integral': ['Leite integral', '#f4eadc'], 'Sem lactose': ['Leite sem lactose', '#f6eee2'], 'Aveia': ['Leite de aveia', '#ead8b8'], 'Amêndoas': ['Leite de amêndoas', '#eedcc4'] };
const SYRUP = { 'Baunilha': '#e8cf8e', 'Caramelo': '#c27a2e', 'Avelã': '#9c6438' };
const DK = { esp: '#3a1f12', crema: '#c48a4c', foam: '#fbf5ec', choc: '#5b3020', cold: '#2e190d', brew: '#5a3118', carm: '#b8742a' };
function drinkRecipe(p, s) {
  const L = [], notes = [], ex = s.extra || [];
  let size = 1, ice = false, hot = true;
  if (p.opt === 'espresso') {
    size = 0.58;
    const base = p.id.startsWith('ristretto') ? 24 : 34, dupla = s.dose === 'Dupla';
    L.push({ k: 'esp', t: dupla ? 'Espresso duplo' : 'Espresso', c: DK.esp, h: base + (dupla ? 22 : 0) });
    L.push({ k: 'crema', t: 'Crema', c: DK.crema, h: 7 });
    if (s.agua === 'Água com gás') notes.push('+ copinho de água com gás');
  } else if (p.opt === 'milk') {
    size = { P: 0.72, M: 0.86, G: 1 }[(s.tam || 'P')[0]] || 1;
    const shot = ex.includes('Shot extra'), milk = MILK[s.leite] || MILK.Integral;
    const [esp, leite, espuma] = { 'cappuccino-cremoso': [22, 34, 28], 'latte-de-baunilha': [18, 52, 10], 'flat-white': [30, 50, 6], 'chocolate-quente-na-caneca': [0, 0, 14] }[p.id] || [24, 40, 16];
    if (ex.includes('Calda de caramelo')) L.push({ k: 'carm', t: 'Calda de caramelo', c: DK.carm, h: 7 });
    if (p.id === 'latte-de-baunilha') L.push({ k: 'xar', t: 'Xarope de baunilha', c: SYRUP.Baunilha, h: 7 });
    if (p.id === 'chocolate-quente-na-caneca') L.push({ k: 'choc', t: `Chocolate 60% com ${milk[0].toLowerCase()}`, c: DK.choc, h: 66 });
    if (esp || shot) L.push({ k: 'esp', t: !esp ? 'Shot de espresso' : shot ? 'Espresso + shot extra' : 'Espresso', c: DK.esp, h: esp + (shot ? 12 : 0) });
    if (leite) L.push({ k: 'milk', t: milk[0], c: milk[1], h: leite });
    const canela = ex.includes('Canela');
    L.push({ k: 'foam', t: canela ? 'Espuma com canela' : 'Espuma de leite', c: DK.foam, h: espuma, cin: canela });
  } else if (p.opt === 'cold') {
    size = (s.tam || '').startsWith('G') ? 1 : 0.84; ice = true; hot = false;
    const shk = p.id.startsWith('shakerato');
    if (SYRUP[s.xarope]) L.push({ k: 'xar', t: `Xarope de ${s.xarope.toLowerCase()}`, c: SYRUP[s.xarope], h: 8 });
    L.push({ k: 'brew', t: shk ? 'Espresso batido com gelo' : 'Cold brew de 18 horas', c: shk ? DK.esp : DK.cold, h: shk ? 40 : 56 });
    if (MILK[s.leite]) L.push({ k: 'milk', t: MILK[s.leite][0], c: MILK[s.leite][1], h: 22 });
    if (shk) L.push({ k: 'foam', t: 'Espuma do shaker', c: '#c39a6e', h: 16 });
  } else if (p.opt === 'filter') {
    const moka = p.id.startsWith('moka'), prensa = p.id.includes('prensa');
    size = prensa ? 1 : 0.8; ice = s.temp === 'Com gelo'; hot = !ice;
    L.push({ k: 'brew', t: moka ? 'Café de moka' : prensa ? 'Café na prensa' : 'Coado na V60', c: moka ? DK.esp : DK.brew, h: ice ? 70 : 80 });
    if (moka) L.push({ k: 'crema', t: 'Crema', c: DK.crema, h: 4 });
  } else return null;
  return { L, notes, size, ice, hot };
}
function paintDrink() {
  const box = $('#drink'); if (!box || !OM.id) return;
  const r = drinkRecipe(CATALOG[OM.id], OM.sel);
  box.hidden = !r; if (!r) return;
  const wrap = box.querySelector('.dk-layers'), pour = OM.pour; OM.pour = false;
  const tot = r.L.reduce((a, l) => a + l.h, 0), k = tot > 90 ? 90 / tot : 1;
  box.style.setProperty('--s', r.size);
  box.classList.toggle('ice', r.ice); box.classList.toggle('hot', r.hot);
  const seen = new Set(); let y = 0;
  r.L.forEach((l, i) => {
    let el = wrap.querySelector(`[data-k="${l.k}"]`);
    const fresh = !el;
    if (fresh) { el = document.createElement('i'); el.className = 'dk-l'; el.dataset.k = l.k; el.style.bottom = y + '%'; wrap.appendChild(el); }
    el.classList.toggle('cin', !!l.cin);
    el.style.backgroundColor = l.c;
    const h = (l.h * k).toFixed(2) + '%', b = y.toFixed(2) + '%';
    // camada nova "escorre" para dentro do copo; ao abrir, uma depois da outra
    el.style.transitionDelay = fresh && pour ? i * 0.16 + 's' : '0s';
    if (fresh) requestAnimationFrame(() => requestAnimationFrame(() => { el.style.height = h; el.style.bottom = b; }));
    else { el.style.height = h; el.style.bottom = b; }
    y += l.h * k; seen.add(l.k);
  });
  wrap.querySelectorAll('.dk-l').forEach((el) => {
    if (seen.has(el.dataset.k)) return;
    el.dataset.k = ''; el.style.transitionDelay = '0s'; el.style.height = '0%';
    setTimeout(() => el.remove(), 700);
  });
  const leg = r.L.slice().reverse().map((l) => `<li><i style="background:${l.c}"></i>${l.t}</li>`).join('')
    + r.notes.map((n) => `<li class="note">${n}</li>`).join('');
  const ul = box.querySelector('.dk-leg');
  if (ul.dataset.v !== leg) { ul.innerHTML = leg; ul.dataset.v = leg; }
}
function closeOptions() {
  $('#opt').classList.remove('open'); $('#optVeil').classList.remove('open'); $('#opt').setAttribute('aria-hidden', 'true');
  if (!cartEl.classList.contains('open')) document.body.classList.remove('noscroll');
}
$('#optGroups').addEventListener('click', (ev) => {
  const b = ev.target.closest('.pill'); if (!b) return;
  const k = b.dataset.k, v = b.dataset.v;
  if (b.dataset.many) { const a = OM.sel[k]; OM.sel[k] = a.includes(v) ? a.filter((x) => x !== v) : [...a, v]; }
  else OM.sel[k] = v;
  paintOptions();
});
$('#optQty').addEventListener('click', (ev) => { const b = ev.target.closest('[data-q]'); if (!b) return; OM.q = Math.max(1, Math.min(20, OM.q + +b.dataset.q)); paintOptions(); });
$('#optAdd').addEventListener('click', () => {
  const p = CATALOG[OM.id];
  pushLine(OM.id, JSON.parse(JSON.stringify(OM.sel)), OM.q);
  closeOptions();
  showToast(`${OM.q > 1 ? OM.q + '× ' : ''}${p.name} no carrinho! ${JOKES[Math.floor(Math.random() * JOKES.length)]}`);
  flyFrom(OM.from, p.img);
});
$('#optClose').addEventListener('click', closeOptions);
$('#optVeil').addEventListener('click', closeOptions);

// ---------- Eventos do carrinho ----------
$$('#grid .add').forEach((btn) => btn.addEventListener('click', () => { const c = btn.closest('.card'); addToCart(c.dataset.id, c.querySelector('img') || btn); }));
$$('.mini-add').forEach((btn) => btn.addEventListener('click', () => addToCart(btn.dataset.sku, btn)));
$('#cartList').addEventListener('click', (ev) => {
  const b = ev.target.closest('button[data-act]'); if (!b) return;
  const i = +b.closest('.ci').dataset.i, act = b.dataset.act;
  if (act === 'inc') lines[i].q++;
  else if (act === 'dec') { lines[i].q--; if (lines[i].q <= 0) lines.splice(i, 1); }
  else lines.splice(i, 1);
  drawCart();
});
$('#useReward').addEventListener('change', (ev) => { ck.useReward = ev.target.checked; drawCart(); });
cartBtn.addEventListener('click', openCart);
$('#cartClose').addEventListener('click', closeCart);
veil.addEventListener('click', closeCart);
$('#goShop').addEventListener('click', closeCart);
addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { closeOptions(); closeCart(); } });
$('#couponBtn').addEventListener('click', () => {
  const code = $('#couponIn').value.trim().toUpperCase();
  if (CONFIG.cupons[code]) { coupon = code; showToast(`Cupom ${code} aplicado! Você é esperto(a).`); $('#couponIn').value = ''; }
  else showToast('Esse cupom não existe. Tente CAFEINA10 😉');
  drawCart();
});
$('#rowDisc').addEventListener('click', (ev) => {
  if (!ev.target.closest('.coupon-rm')) return;
  coupon = null; drawCart(); showToast('Cupom removido.');
});
$('#couponIn').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') $('#couponBtn').click(); });

// ---------- Passo 2: entrega ----------
const F = $('#vDados');
$('#modeSeg').addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b) return;
  ck.mode = b.dataset.v;
  $$('#modeSeg button').forEach((x) => x.classList.toggle('on', x === b));
  $('#addrBox').hidden = ck.mode !== 'entrega'; $('#pickBox').hidden = ck.mode === 'entrega';
  drawCart(); quoteText();
});
function quoteFrom(bairro, cidade) {
  const E = CONFIG.entrega;
  if (!cidade) return null;
  if (norm(cidade) !== norm(E.cidade)) return { out: true, cidade };
  const fee = E.bairros[norm(bairro)];
  return { out: false, fee: fee !== undefined ? fee : E.taxaPadrao, bairro, cidade };
}
function quoteText() {
  const el = $('#shipQuote'), t = totals();
  if (ck.mode !== 'entrega') { el.textContent = ''; return; }
  if (!ck.quote) { el.textContent = 'Digite o CEP para calcular a entrega.'; el.className = 'ship-quote'; return; }
  if (ck.quote.out) { el.textContent = `Ainda não entregamos em ${ck.quote.cidade}. Você pode retirar na loja.`; el.className = 'ship-quote bad'; return; }
  el.className = 'ship-quote ok';
  el.textContent = t.ship ? `Entrega para ${ck.quote.bairro || ck.quote.cidade}: ${brl(t.ship)} · ${CONFIG.entrega.prazo}` : `Entrega grátis para ${ck.quote.bairro || ck.quote.cidade} · ${CONFIG.entrega.prazo}`;
}
function requote() { ck.quote = quoteFrom(F.bairro.value.trim(), F.cidade.value.trim()); drawCart(); quoteText(); }
F.cep.addEventListener('input', async () => {
  let v = F.cep.value.replace(/\D/g, '').slice(0, 8);
  F.cep.value = v.length > 5 ? v.slice(0, 5) + '-' + v.slice(5) : v;
  const st = $('#cepSt');
  if (v.length !== 8) { st.textContent = ''; return; }
  st.textContent = 'buscando…'; st.className = 'cep-st';
  try {
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(`https://viacep.com.br/ws/${v}/json/`, { signal: ctrl.signal });
    clearTimeout(to);
    const d = await r.json();
    if (d.erro) { st.textContent = 'CEP não encontrado'; st.className = 'cep-st bad'; return; }
    F.rua.value = d.logradouro || F.rua.value; F.bairro.value = d.bairro || F.bairro.value; F.cidade.value = d.localidade || F.cidade.value;
    st.textContent = '✓ encontrado'; st.className = 'cep-st ok';
    requote();
    if (!F.num.value) F.num.focus();
  } catch (e) {
    st.textContent = 'sem conexão: preencha à mão'; st.className = 'cep-st bad';
  }
});
F.bairro.addEventListener('change', requote); F.cidade.addEventListener('change', requote);
F.fone.addEventListener('input', () => {
  const d = F.fone.value.replace(/\D/g, '').slice(0, 11);
  F.fone.value = d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d;
});
function validateDados() {
  const err = [];
  if (F.nome.value.trim().length < 2) err.push(F.nome);
  if (F.fone.value.replace(/\D/g, '').length < 10) err.push(F.fone);
  if (ck.mode === 'entrega') {
    if (F.cep.value.replace(/\D/g, '').length !== 8) err.push(F.cep);
    if (!F.rua.value.trim()) err.push(F.rua);
    if (!F.num.value.trim()) err.push(F.num);
    if (!F.cidade.value.trim()) err.push(F.cidade);
  }
  $$('#vDados input').forEach((i) => i.classList.toggle('err', err.includes(i)));
  if (err.length) { err[0].focus(); showToast('Faltou preencher algum campo destacado.'); return false; }
  if (ck.mode === 'entrega') { requote(); const t = totals(); if (t.blocked) { showToast(t.blocked); return false; } }
  return true;
}

// o destaque vermelho some assim que o campo é corrigido
$$('#vDados input').forEach((i) => i.addEventListener('input', () => i.classList.remove('err')));

// ---------- Passo 3: pagamento ----------
$('#payList').addEventListener('change', (ev) => { ck.pay = ev.target.value; $('#trocoBox').hidden = ck.pay !== 'dinheiro'; });
function drawResume() {
  const t = totals();
  $('#resume').innerHTML = `<h4>Resumo</h4><ul>${lines.map((l) => `<li><span>${l.q}× ${lineName(l)}${l.label ? `<small>${l.label}</small>` : ''}</span><b>${brl(unit(l) * l.q)}</b></li>`).join('')}</ul>
    <p>${ck.mode === 'entrega' ? `Entrega em ${F.rua.value}, ${F.num.value}${F.comp.value ? ' · ' + F.comp.value : ''} · ${F.bairro.value}` : 'Retirada na loja'}</p>`;
}

// ---------- Pix (BR Code oficial do Banco Central + QR Code) ----------
function crc16(s) {
  let c = 0xffff;
  for (let i = 0; i < s.length; i++) {
    c ^= s.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
  }
  return c.toString(16).toUpperCase().padStart(4, '0');
}
const ascii = (t, n) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().slice(0, n);
function pixPayload(valorCents, txid) {
  const f = (id, v) => id + String(v.length).padStart(2, '0') + v;
  const p = f('00', '01') + f('26', f('00', 'br.gov.bcb.pix') + f('01', CONFIG.pix.chave.trim()))
    + f('52', '0000') + f('53', '986') + f('54', (valorCents / 100).toFixed(2)) + f('58', 'BR')
    + f('59', ascii(CONFIG.pix.recebedor, 25)) + f('60', ascii(CONFIG.pix.cidade, 15)) + f('62', f('05', txid)) + '6304';
  return p + crc16(p);
}
// o gerador de QR só é baixado quando o cliente chega no Pix
let qrLoading;
function loadQR() {
  if (window.qrcode) return Promise.resolve();
  return qrLoading || (qrLoading = new Promise((ok, fail) => {
    const s = document.createElement('script'); s.src = 'qrcode.js'; s.onload = ok; s.onerror = () => { qrLoading = null; fail(); };
    document.head.appendChild(s);
  }));
}
function qrSVG(text) {
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
}
function paintQR(text, demo) {
  const box = $('#qr'); box.classList.toggle('demo', !!demo);
  loadQR().then(() => { box.innerHTML = qrSVG(text); }).catch(() => { box.textContent = 'Use o Pix copia e cola abaixo.'; });
}

// ---------- Botão principal do rodapé do carrinho ----------
$('#cartGo').addEventListener('click', () => {
  if (ck.view === 'cart') { if (lines.length) { showView('dados'); setTimeout(() => F.nome.focus(), 200); quoteText(); } return; }
  if (ck.view === 'dados') { if (validateDados()) showView('pag'); return; }
  if (ck.view === 'pag') finish();
});
$('#cartBack').addEventListener('click', () => {
  if (ck.view === 'cart') {
    // esvaziar pede um segundo toque (evita apagar o pedido sem querer)
    const b = $('#cartBack');
    if (!b.dataset.arm) {
      b.dataset.arm = '1'; b.textContent = 'Toque de novo para esvaziar'; b.classList.add('armed');
      clearTimeout(b._t); b._t = setTimeout(() => { delete b.dataset.arm; b.classList.remove('armed'); paintFoot(); }, 3200);
      return;
    }
    delete b.dataset.arm; b.classList.remove('armed'); clearTimeout(b._t);
    lines = []; coupon = null; drawCart(); showToast('Carrinho esvaziado. Recomeçando do zero (e da cafeína).'); return;
  }
  if (ck.view === 'dados') showView('cart');
  if (ck.view === 'pag') showView('dados');
});

function finish() {
  const t = totals();
  const id = 'GD' + Date.now().toString(36).toUpperCase().slice(-6);
  const payTxt = { pix: 'Pix', cartao: 'Cartão na entrega', dinheiro: 'Dinheiro' }[ck.pay];
  const troco = ck.pay === 'dinheiro' && $('#troco').value ? ` (troco para R$ ${$('#troco').value})` : '';
  const msg = [
    `Olá! Pedido ${id} no ${CONFIG.nome} ☕`, '',
    ...lines.map((l) => `• ${l.q}x ${lineName(l)}${l.label ? ` (${l.label})` : ''}: ${brl(unit(l) * l.q)}`), '',
    `Subtotal: ${brl(t.sub)}`,
    t.disc ? `Desconto (${coupon}): - ${brl(t.disc)}` : null,
    t.reward ? `Fidelidade: - ${brl(t.reward)}` : null,
    `Entrega: ${ck.mode === 'retirada' ? 'retirada na loja' : t.ship ? brl(t.ship) : 'grátis'}`,
    `*Total: ${brl(t.total)}*`,
    `Pagamento: ${payTxt}${troco}${ck.pay === 'pix' ? ' (envio o comprovante)' : ''}`, '',
    `Nome: ${F.nome.value.trim()}`, `WhatsApp: ${F.fone.value.trim()}`,
    ck.mode === 'entrega' ? `Endereço: ${F.rua.value.trim()}, ${F.num.value.trim()}${F.comp.value.trim() ? ' - ' + F.comp.value.trim() : ''}, ${F.bairro.value.trim()}, ${F.cidade.value.trim()} · CEP ${F.cep.value}` : 'Retirada na loja',
    F.obs.value.trim() ? `Obs.: ${F.obs.value.trim()}` : null,
  ].filter((x) => x !== null).join('\n');
  $('#doneMsg').textContent = msg;

  // Pix
  const pixBox = $('#pixBox');
  pixBox.hidden = ck.pay !== 'pix';
  if (ck.pay === 'pix') {
    $('#pixAmt').textContent = brl(t.total);
    if (CONFIG.pix.chave.trim()) {
      const code = pixPayload(t.total, id);
      paintQR(code, false);
      $('#pixCopy').hidden = false; $('#pixCopy').dataset.code = code;
      $('#pixNote').textContent = 'Abra o app do seu banco, escolha Pix › Ler QR Code ou Pix copia e cola.';
    } else {
      paintQR('DEMONSTRACAO - configure a chave Pix da loja em config.js', true);
      $('#pixCopy').hidden = true;
      $('#pixNote').textContent = 'Modo demonstração: coloque a chave Pix da loja em config.js para gerar o QR Code de pagamento de verdade.';
    }
  }
  // WhatsApp
  const wa = $('#doneWa');
  if (CONFIG.whatsapp) { wa.hidden = false; wa.href = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`; $('#doneTxt').textContent = ck.pay === 'pix' ? 'Pague pelo Pix e envie o pedido no WhatsApp para a gente começar a preparar.' : 'Envie o pedido no WhatsApp para a gente começar a preparar.'; }
  else { wa.hidden = true; $('#doneTxt').textContent = 'Modo teste: para receber pedidos no WhatsApp, coloque o número da loja em config.js.'; }

  // fidelidade
  const earned = lines.filter((l) => !l.custom && DRINK.has(CATALOG[l.id].cat)).reduce((a, l) => a + l.q, 0);
  stamps = Math.max(0, stamps - (t.reward ? NEED : 0)) + earned;
  store.set('stamps', stamps); paintStamps(earned);
  store.set('lastOrder', { id, at: Date.now(), total: t.total });

  lines = []; coupon = null; ck.useReward = false;
  showView('done');
}
$('#pixCopy').addEventListener('click', (ev) => copy(ev.currentTarget.dataset.code, 'Código Pix copiado!'));
$('#doneCopy').addEventListener('click', () => copy($('#doneMsg').textContent, 'Pedido copiado!'));
$('#doneClose').addEventListener('click', () => { closeCart(); showView('cart'); });
function copy(text, ok) {
  if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => showToast(ok)).catch(() => showToast('Não consegui copiar; selecione o texto.'));
  else showToast('Selecione o texto e copie.');
}

// ---------- Cartão fidelidade ----------
function paintStamps(earned = 0) {
  const box = $('#stamps'); if (!box) return;
  $$('[data-stamps-need]').forEach((e) => { e.textContent = NEED; });
  const have = stamps % NEED || (stamps >= NEED ? NEED : 0);
  box.innerHTML = Array.from({ length: NEED }, (_, i) => `<i class="${i < have ? 'on' : ''}${i >= have - earned && i < have ? ' new' : ''}" aria-hidden="true">☕</i>`).join('');
  $('#stampsTxt').textContent = stamps >= NEED
    ? `Você tem ${Math.floor(stamps / NEED)} café${stamps >= NEED * 2 ? 's' : ''} grátis! Use no carrinho em qualquer bebida.`
    : `${stamps} de ${NEED} selos. Faltam ${NEED - stamps} bebida${NEED - stamps > 1 ? 's' : ''} para o próximo café por nossa conta.`;
}

// ---------- Assinatura ----------
const SUB = { plano: '250', freq: 'mensal' };
const SUB_PRICE = { 250: 39.9, 500: 69.9, 1000: 129.9 };
function paintSub() {
  const base = cents(SUB_PRICE[SUB.plano]), price = Math.round(base * 0.85);
  $('#subOld').textContent = brl(base); $('#subPrice').textContent = brl(price);
  const per = SUB.freq === 'quinzenal' ? 2 : 1;
  $('#subNote').textContent = `${per} entrega${per > 1 ? 's' : ''} por mês · ≈ ${brl(price * per)}/mês. A primeira sai com este pedido; as próximas combinamos pelo WhatsApp.`;
}
$$('#sub .seg').forEach((seg) => seg.addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b) return;
  SUB[seg.dataset.seg] = b.dataset.v; $$('button', seg).forEach((x) => x.classList.toggle('on', x === b)); paintSub();
}));
$('#subAdd').addEventListener('click', (ev) => {
  const base = cents(SUB_PRICE[SUB.plano]), price = Math.round(base * 0.85);
  const plano = SUB.plano === '1000' ? '1 kg' : SUB.plano + ' g';
  pushLine(null, null, 1, { name: `Assinatura · ${plano} ${SUB.freq}`, price, img: 'assets/3d/coffee_bag.webp', bg: '#f0d6b6', label: `${$('#subGrind').value} · 1ª entrega · 15% off`, key: SUB.plano + SUB.freq + $('#subGrind').value });
  showToast('Assinatura no carrinho! Seus grãos nunca mais acabam no domingo.');
  flyFrom(ev.currentTarget, 'assets/3d/coffee_bag.webp');
});

// ---------- Kit presente ----------
function fillSelect(sel, cat) { sel.innerHTML = Object.values(CATALOG).filter((p) => p.cat === cat).map((p) => `<option value="${p.id}">${p.name} · ${money(p.price)}</option>`).join(''); }
function paintKit() {
  const ids = [$('#kitCafe').value, $('#kitDoce').value, $('#kitMimo').value];
  const sum = ids.reduce((t, id) => t + cents(CATALOG[id].price), 0);
  const wrap = $('#kitWrap').checked ? 800 : 0;
  $('#kitOld').textContent = brl(sum + wrap); $('#kitPrice').textContent = brl(Math.round(sum * 0.9) + wrap);
}
if ($('#kitCafe')) {
  fillSelect($('#kitCafe'), 'levar'); fillSelect($('#kitDoce'), 'comer'); fillSelect($('#kitMimo'), 'casa');
  $('#kitMimo').value = 'caneca-da-casa-350ml';
  ['kitCafe', 'kitDoce', 'kitMimo', 'kitWrap'].forEach((i) => $('#' + i).addEventListener('change', paintKit));
  $('#kitAdd').addEventListener('click', (ev) => {
    const ids = [$('#kitCafe').value, $('#kitDoce').value, $('#kitMimo').value];
    const wrap = $('#kitWrap').checked;
    const price = Math.round(ids.reduce((t, id) => t + cents(CATALOG[id].price), 0) * 0.9) + (wrap ? 800 : 0);
    pushLine(null, null, 1, { name: 'Kit presente', price, img: CATALOG[ids[0]].img, bg: '#ecd9bd', label: ids.map((i) => CATALOG[i].name).join(' + ') + (wrap ? ' · embalagem de presente' : ''), key: ids.join('+') + wrap });
    showToast('Kit presente no carrinho! Alguém vai ganhar o dia.');
    flyFrom(ev.currentTarget, CATALOG[ids[0]].img);
  });
}

// ---------- Avaliações e FAQ ----------
function paintReviews() {
  const box = $('#reviews'); if (!box) return;
  const R = CONFIG.avaliacoes || [];
  if (!R.length) {
    box.innerHTML = `<h2>Avaliações</h2><div class="rev-empty"><div class="stars-big" aria-hidden="true">★★★★★</div>
      <p>Ainda não publicamos avaliações aqui. Já provou nosso café? Conta pra gente como foi, isso ajuda muito uma cafeteria pequena.</p>
      <a class="btn" data-cfg-href="review" href="${CONFIG.linkAvaliarGoogle}" target="_blank" rel="noopener">Avaliar no Google</a></div>`;
    return;
  }
  const avg = R.reduce((t, r) => t + r.nota, 0) / R.length;
  box.innerHTML = `<h2>Avaliações</h2><div class="rev-avg"><strong>${avg.toFixed(1).replace('.', ',')}</strong><span>${'★'.repeat(Math.round(avg))}${'☆'.repeat(5 - Math.round(avg))}</span><small>${R.length} avaliaç${R.length > 1 ? 'ões' : 'ão'}</small></div>
    <div class="rev-list">${R.map((r) => `<figure class="rev"><div class="rev-st">${'★'.repeat(r.nota)}</div><blockquote>${r.texto}</blockquote><figcaption>${r.nome}${r.data ? ` · ${r.data}` : ''}</figcaption></figure>`).join('')}</div>
    <a class="ghost-btn" href="${CONFIG.linkAvaliarGoogle}" target="_blank" rel="noopener">Deixar a sua avaliação</a>`;
}
function paintFAQ() {
  const box = $('#faqList'); if (!box) return;
  const e = CONFIG.endereco;
  const rep = (t) => t.replace('{prazo}', CONFIG.entrega.prazo).replace('{cidade}', CONFIG.entrega.cidade)
    .replace('{gratis}', money(CONFIG.entrega.gratisAPartirDe)).replace('{endereco}', `${e.rua}, ${e.bairro}`);
  box.innerHTML = CONFIG.faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${rep(q)}</summary><p>${rep(a)}</p></details>`).join('');
}

// ---------- Horários e mapa ----------
function paintHours() {
  const tb = $('#hours'); if (!tb) return;
  const d = new Date().getDay();
  const order = [1, 2, 3, 4, 5, 6, 0];
  tb.innerHTML = '<caption>Horário</caption>' + order.map((i) => { const h = CONFIG.horarios[i];
    return `<tr class="${i === d ? 'today' : ''}"><th scope="row">${DIAS[i]}</th><td>${h ? `${h[0]} – ${h[1]}` : 'Fechado'}</td></tr>`; }).join('');
}
function loadMap() {
  const box = $('#map'); if (!box || box.dataset.loaded) return;
  box.dataset.loaded = 1;
  const { lat, lng } = CONFIG.endereco, dx = 0.006, dy = 0.004;
  box.innerHTML = `<iframe title="Mapa da loja" loading="lazy" referrerpolicy="no-referrer"
    src="https://www.openstreetmap.org/export/embed.html?bbox=${lng - dx}%2C${lat - dy}%2C${lng + dx}%2C${lat + dy}&layer=mapnik&marker=${lat}%2C${lng}"></iframe>
    <a class="map-link" data-cfg-href="maps" target="_blank" rel="noopener">Abrir no Google Maps</a>`;
  fillConfig();
}
if ($('#map')) {
  $('#mapLoad').addEventListener('click', loadMap);
  new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { loadMap(); o.disconnect(); } }), { rootMargin: '300px' }).observe($('#map'));
}

// ---------- Formulário de contato (de verdade: WhatsApp ou e-mail) ----------
$('#contactForm').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  const text = `Olá! Sou ${f.get('c_nome')} (${f.get('c_email')}).\n\n${f.get('c_msg')}`;
  if (CONFIG.whatsapp) window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(text)}`, '_blank');
  else location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent('Contato pelo site')}&body=${encodeURIComponent(text)}`;
  showToast('Abrimos a sua mensagem pronta. É só enviar!');
  ev.target.reset();
});

// ---------- Cardápio em PDF (versão para imprimir) ----------
$('#printMenu').addEventListener('click', () => {
  const e = CONFIG.endereco;
  const cats = {};
  Object.values(CATALOG).forEach((p) => { (cats[p.catName] = cats[p.catName] || []).push(p); });
  const hrs = [1, 2, 3, 4, 5, 6, 0].map((i) => { const h = CONFIG.horarios[i]; return `${DIAS[i].slice(0, 3)} ${h ? h[0] + '–' + h[1] : 'fechado'}`; }).join(' · ');
  $('#printArea').innerHTML = `<header><h1>${CONFIG.nome}</h1><p>${CONFIG.slogan}</p></header>
    <main>${Object.entries(cats).map(([n, ps]) => `<section><h2>${n}</h2>${ps.map((p) => `<div class="pi"><div class="pl"><b>${p.name}</b><i></i><strong>${money(p.price)}</strong></div><span>${p.desc}${p.allerg.length ? ` <em>Contém: ${p.allerg.map((a) => ALLERG[a]).join(', ')}.</em>` : ''}</span></div>`).join('')}</section>`).join('')}</main>
    <footer><p>${e.rua} · ${e.bairro} · ${e.cidade}/${e.uf} · ${CONFIG.telefone} · @${CONFIG.instagram}</p><p>${hrs}</p><p>Bebidas com leite podem ser feitas com leite sem lactose, aveia ou amêndoas.</p></footer>`;
  document.body.classList.add('printing');
  setTimeout(() => { window.print(); setTimeout(() => document.body.classList.remove('printing'), 400); }, 60);
});
addEventListener('afterprint', () => document.body.classList.remove('printing'));

// ---------- Modo leve (vídeos) ----------
$$('[data-lite-label]').forEach((el) => { el.textContent = lite ? 'Modo leve (sem vídeo)' : 'Vídeos ligados'; });
$$('[data-lite-toggle]').forEach((b) => b.addEventListener('click', () => { store.set('lite', !lite); location.reload(); }));

// ---------- Início ----------
paintStamps(); paintSub(); if ($('#kitCafe')) paintKit(); paintReviews(); paintFAQ(); paintHours();
showView('cart');
