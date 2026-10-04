/* =====================================================================
   MAGIA · vitrine com vapor, cartões com cor, voo para o carrinho,
   revelação dos títulos e rolagem suave
   (depende de core.js, shop.js e script.js, carregados antes)
   ===================================================================== */
(function magia() {
  const hasHover = matchMedia('(hover: hover)').matches;

  // ---------------------------------------------------------------
  // 1 · Cartões: tom de cor por categoria + botão redondo de adicionar
  // ---------------------------------------------------------------
  // Famílias de cor (OKLCH): quentes = âmbar/terracota, gelados = azul-petróleo,
  // comer = dourado/pêssego, grãos = oliva/musgo, casa = ardósia/ameixa.
  const FAM = {
    quentes: [[0.80, 0.085, 55], [0.78, 0.075, 25], [0.82, 0.07, 70], [0.84, 0.06, 80], [0.80, 0.06, 45], [0.80, 0.07, 62], [0.78, 0.055, 230], [0.78, 0.07, 35], [0.80, 0.055, 150]],
    gelados: [[0.80, 0.07, 225], [0.82, 0.06, 205]],
    comer: [[0.84, 0.085, 78], [0.85, 0.08, 92], [0.82, 0.075, 60], [0.78, 0.06, 40], [0.84, 0.08, 100], [0.80, 0.06, 20], [0.82, 0.08, 68]],
    levar: [[0.80, 0.06, 130], [0.78, 0.05, 110], [0.82, 0.05, 145], [0.80, 0.06, 95], [0.76, 0.045, 60], [0.82, 0.05, 160], [0.79, 0.055, 120]],
    casa: [[0.80, 0.05, 260], [0.80, 0.055, 320], [0.80, 0.045, 200], [0.82, 0.06, 285], [0.84, 0.04, 70]],
  };
  const seen = {};
  const toneOf = (cat) => {
    const list = FAM[cat] || FAM.quentes; const k = seen[cat] = (seen[cat] || 0);
    seen[cat]++; const [l, c, h] = list[k % list.length];
    return `oklch(${l} ${c} ${h})`;
  };
  // cor sólida aproximada (para a janela de opções e o PDF, que não leem oklch em todos os navegadores)
  const okSupport = CSS.supports('color', 'oklch(0.8 0.1 60)');
  $$('#grid .card').forEach((card) => {
    const tone = toneOf(card.dataset.cat);
    const img = card.querySelector('.card-img');
    if (img && okSupport) {
      img.style.setProperty('--tone', tone);
      if (CATALOG[card.dataset.id]) CATALOG[card.dataset.id].bg = tone;
    }
    const add = card.querySelector('.add');
    if (add && !add.querySelector('.plus')) {
      const txt = add.textContent.replace(/\s*\+\s*$/, '').trim() || 'Adicionar';
      add.innerHTML = `<span class="lbl">${txt}</span><span class="plus" aria-hidden="true"></span>`;
      if (!add.getAttribute('aria-label')) add.setAttribute('aria-label', `${txt} ${card.querySelector('h3').textContent.trim()}`);
    }
  });

  // ---------------------------------------------------------------
  // 2 · Voo para o carrinho (arco, gira e encolhe dentro da sacola)
  // ---------------------------------------------------------------
  window.flyFrom = function flyFrom(el, src) {
    if (!el || !src || calm) return;
    const cart = $('#cartBtn'); if (!cart) return;
    const a = el.getBoundingClientRect(), b = cart.getBoundingClientRect();
    if (!a.width || !b.width) return;
    const size = Math.min(150, Math.max(70, Math.min(a.width, a.height) * 0.7));
    const f = document.createElement('img'); f.src = src; f.alt = ''; f.className = 'fly2';
    f.style.width = f.style.height = size + 'px';
    document.body.appendChild(f);
    const x0 = a.left + a.width / 2 - size / 2, y0 = a.top + a.height / 2 - size / 2;
    const x1 = b.left + b.width / 2 - size / 2, y1 = b.top + b.height / 2 - size / 2;
    const cx = (x0 + x1) / 2 + (x1 > x0 ? -60 : 60), cy = Math.min(y0, y1) - 160;
    const frames = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, u = 1 - t;
      const x = u * u * x0 + 2 * u * t * cx + t * t * x1, y = u * u * y0 + 2 * u * t * cy + t * t * y1;
      const s = 1 - 0.84 * Math.pow(t, 1.6);
      frames.push({ transform: `translate(${x}px, ${y}px) scale(${s}) rotate(${t * -28}deg)`, opacity: t > 0.9 ? (1 - t) * 10 : 1, offset: t });
    }
    f.animate(frames, { duration: 900, easing: 'cubic-bezier(.45,.05,.55,.95)', fill: 'forwards' }).onfinish = () => {
      f.remove(); cart.classList.remove('pop'); void cart.offsetWidth; cart.classList.add('pop');
      if (typeof soundOn !== 'undefined' && soundOn) clink();
    };
  };

  // tilintar de xícara (sintetizado, só com o som ligado)
  let actx = null;
  function clink() {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime, out = actx.createGain(); out.gain.value = 0.09; out.connect(actx.destination);
      [[2093, 1, 0.5], [3322, 0.55, 0.35], [4699, 0.35, 0.22], [6272, 0.2, 0.14]].forEach(([f, a, d]) => {
        const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.value = f * (0.995 + Math.random() * 0.01);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(out); o.start(t); o.stop(t + d + 0.05);
      });
    } catch (e) { /* sem áudio, sem problema */ }
  }

  // ---------------------------------------------------------------
  // 3 · Revelação dos títulos de seção (uma vez, palavra por palavra)
  // ---------------------------------------------------------------
  const heads = $$('.section h2, .about-box h2').filter((h) => !h.closest('.vitrine'));
  heads.forEach((h) => {
    if (h.dataset.rv) return; h.dataset.rv = '1';
    const words = h.textContent.trim().split(/\s+/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = words.map((w, i) => `<span class="rw" aria-hidden="true"><span style="--i:${i}">${w.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span></span>`).join(' ');
    h.classList.add('rv');
    h.classList.remove('reveal');
  });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('rv-on'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
    heads.forEach((h) => io.observe(h));
  } else heads.forEach((h) => h.classList.add('rv-on'));

  // ---------------------------------------------------------------
  // 4 · Vitrine
  // ---------------------------------------------------------------
  const vit = $('#vitrine');
  if (vit) {
    let data = [];
    try { data = JSON.parse($('#vitrineData').textContent); } catch (e) { data = []; }
    data = data.filter((d) => CATALOG[d.id]);
    const el = { img: $('#vtImg'), name: $('#vtName'), desc: $('#vtDesc'), notes: $('#vtNotes'), price: $('#vtPrice'), count: $('#vtCount'), add: $('#vtAdd'), thumbs: $('#vtThumbs'), fx: $('#vtFx'), stage: $('.vt-stage', vit) };
    let idx = 0, busy = false, inView = false, hovering = false, prog = 0, lastT = 0;
    const AUTO = 7000;

    // pré-carrega as imagens
    const cache = {};
    const load = (src) => cache[src] || (cache[src] = new Promise((ok) => { const im = new Image(); im.decoding = 'async'; im.onload = im.onerror = () => ok(im); im.src = src; }));

    el.thumbs.innerHTML = data.map((d, i) => `<button type="button" class="vt-thumb" style="--c:${d.luz}" aria-label="${CATALOG[d.id].name}" aria-current="${i === 0}" data-i="${i}"><img src="${d.img}" alt="" decoding="async"></button>`).join('');
    const thumbs = $$('.vt-thumb', el.thumbs);

    function letters(text) {
      let n = 0;
      return text.split(' ').map((w) => `<span class="w">${[...w].map((c) => `<span class="ch" style="--i:${n++}">${c}</span>`).join('')}</span>`).join(' ');
    }
    function paint(i) {
      const d = data[i], p = CATALOG[d.id];
      vit.style.setProperty('--vt', d.luz);
      el.img.src = d.img; el.img.alt = p.name;
      el.name.innerHTML = letters(p.name); el.name.setAttribute('aria-label', p.name);
      el.desc.textContent = d.texto || p.desc;
      el.notes.innerHTML = Object.entries(d.notas || {}).map(([k, v]) => `<div><dt>${k}</dt><dd aria-label="${v} de 5">${[1, 2, 3, 4, 5].map((n) => `<i class="${n <= v ? 'on' : ''}"></i>`).join('')}</dd></div>`).join('');
      el.price.textContent = money(p.price);
      el.count.textContent = `${i + 1} de ${data.length}`;
      el.add.firstChild.textContent = optsOf(p).length ? 'Escolher' : 'Adicionar';
      el.add.setAttribute('aria-label', `${optsOf(p).length ? 'Escolher' : 'Adicionar'} ${p.name}`);
      thumbs.forEach((t, k) => { t.setAttribute('aria-current', k === i); t.style.setProperty('--p', 0); });
      fx.set(d);
      if (!calm && inView) requestAnimationFrame(() => fx.warm());
    }
    async function go(i, dir = 1) {
      if (busy || !data.length) return;
      i = (i + data.length) % data.length;
      if (i === idx && el.img.getAttribute('src') === data[i].img) return;
      busy = true; prog = 0;
      const next = data[i];
      vit.style.setProperty('--vt-dx', dir > 0 ? '-46px' : '46px');
      vit.style.setProperty('--vt-r', dir > 0 ? '-5deg' : '5deg');
      if (calm) { idx = i; paint(i); busy = false; return; }
      vit.classList.remove('vt-in-anim');
      vit.classList.add('vt-out');
      await Promise.all([load(next.img), new Promise((r) => setTimeout(r, 380))]);
      idx = i;
      vit.classList.add('vt-pre');
      paint(i);
      void el.img.offsetWidth;
      vit.classList.remove('vt-out', 'vt-pre');
      vit.classList.add('vt-in-anim');
      setTimeout(() => { busy = false; }, 520);
    }
    el.thumbs.addEventListener('click', (e) => { const b = e.target.closest('.vt-thumb'); if (b) go(+b.dataset.i, +b.dataset.i >= idx ? 1 : -1); });
    $('#vtPrev').addEventListener('click', () => go(idx - 1, -1));
    $('#vtNext').addEventListener('click', () => go(idx + 1, 1));
    el.add.addEventListener('click', () => addToCart(data[idx].id, el.img));
    vit.addEventListener('keydown', (e) => {
      if (e.target.closest('input, textarea, select')) return;
      if (e.key === 'ArrowRight') { go(idx + 1, 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(idx - 1, -1); e.preventDefault(); }
    });
    // deslizar no celular
    let sx = null, sy = null;
    el.stage.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
    el.stage.addEventListener('pointerup', (e) => {
      if (sx === null) return; const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (Math.abs(dx) > 46 && Math.abs(dx) > Math.abs(dy) * 1.3) go(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    vit.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovering = true; });
    vit.addEventListener('pointerleave', () => { hovering = false; });
    vit.addEventListener('focusin', () => { hovering = true; });
    vit.addEventListener('focusout', () => { hovering = false; });

    // -------- efeitos: vapor, gelo, aroma (canvas 2D) --------
    // O vapor é um campo de vento compartilhado: partículas emitidas do mesmo
    // ponto seguem o mesmo campo e formam fitas que sobem ondulando, como na vida real.
    const fx = (() => {
      const cv = el.fx, ctx = cv.getContext('2d');
      let W = 0, H = 0, dpr = 1, mode = 'vapor', origin = [0.5, 0.2], parts = [], acc = 0, T = 0;
      const ptr = { x: -9999, y: -9999, vx: 0 };
      // textura macia (com leve ruído) para o vapor, gerada uma vez
      const puff = (() => {
        const c = document.createElement('canvas'); c.width = c.height = 96; const g = c.getContext('2d');
        const im = g.createImageData(96, 96); const r = rng(4242);
        const grid = 6, val = []; for (let k = 0; k < (grid + 1) * (grid + 1); k++) val.push(r());
        const vn = (x, y) => {
          const gx = x / 96 * grid, gy = y / 96 * grid, ix = Math.floor(gx), iy = Math.floor(gy), fx2 = smooth(gx - ix), fy2 = smooth(gy - iy);
          const v = (a, b) => val[Math.min(grid, b) * (grid + 1) + Math.min(grid, a)];
          return (v(ix, iy) * (1 - fx2) + v(ix + 1, iy) * fx2) * (1 - fy2) + (v(ix, iy + 1) * (1 - fx2) + v(ix + 1, iy + 1) * fx2) * fy2;
        };
        for (let y = 0; y < 96; y++) for (let x = 0; x < 96; x++) {
          const dx = (x - 48) / 48, dy = (y - 48) / 48, d = Math.sqrt(dx * dx + dy * dy);
          const a = Math.pow(Math.max(0, 1 - d), 2.2) * (0.75 + 0.25 * vn(x, y));
          const o = (y * 96 + x) * 4; im.data[o] = 255; im.data[o + 1] = 247; im.data[o + 2] = 238; im.data[o + 3] = Math.round(a * 255);
        }
        g.putImageData(im, 0, 0); return c;
      })();
      function size() {
        const r = cv.getBoundingClientRect(); dpr = Math.min(devicePixelRatio || 1, 1.5);
        W = r.width; H = r.height; cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
      }
      size(); addEventListener('resize', size);
      // onde a imagem está desenhada dentro do canvas (object-fit: contain)
      function imgBox() {
        const c = cv.getBoundingClientRect(), r = el.img.getBoundingClientRect();
        const nw = el.img.naturalWidth || 1, nh = el.img.naturalHeight || 1;
        const s = Math.min(r.width / nw, r.height / nh), w = nw * s, h = nh * s;
        return { x: r.left - c.left + (r.width - w) / 2, y: r.top - c.top + (r.height - h) / 2, w, h };
      }
      vit.addEventListener('pointermove', (e) => {
        const c = cv.getBoundingClientRect(); const x = e.clientX - c.left;
        ptr.vx = ptr.vx * 0.7 + (x - (ptr.x < -999 ? x : ptr.x)) * 0.3; ptr.x = x; ptr.y = e.clientY - c.top;
      });
      vit.addEventListener('pointerleave', () => { ptr.x = ptr.y = -9999; ptr.vx = 0; });

      function spawn(b) {
        const r = Math.random;
        if (mode === 'vapor') {
          const e = (r() * 3) | 0; // três fitas que se entrelaçam
          parts.push({ k: 'v', e, x: b.x + (origin[0] + (e - 1) * 0.045 + (r() - 0.5) * 0.03) * b.w, y: b.y + origin[1] * b.h + (r() - 0.5) * 4,
            ox: b.x + origin[0] * b.w, oy: b.y + origin[1] * b.h, age: 0, life: 3.8 + r() * 2.2, s0: b.w * (0.018 + r() * 0.012), s1: b.w * (0.1 + r() * 0.06), j: r() * 6.28, vx: 0 });
          if (r() < 0.06) parts.push({ k: 'h', x: b.x + origin[0] * b.w + (r() - 0.5) * b.w * 0.1, y: b.y + origin[1] * b.h - b.h * 0.05, age: 0, life: 4 + r() * 2, s: b.w * (0.22 + r() * 0.1), j: r() * 6.28 });
        } else if (mode === 'gelo') {
          if (r() < 0.8) parts.push({ k: 'g', x: b.x + b.w * (0.2 + r() * 0.6), y: b.y + b.h * (0.06 + r() * 0.88), age: 0, life: 1.2 + r() * 1.8, s: 0.8 + r() * 2, j: r() * 10 });
          else parts.push({ k: 'h', x: b.x + b.w * (0.15 + r() * 0.7), y: b.y + b.h * (0.9 + r() * 0.06), age: 0, life: 5 + r() * 3, s: b.w * (0.5 + r() * 0.3), j: r() * 6.28, cold: 1 });
        } else {
          parts.push({ k: 'a', x: b.x + b.w * (0.3 + r() * 0.4), y: b.y + b.h * (origin[1] + r() * 0.08), vx: (r() - 0.5) * 8, vy: -(16 + r() * 20), age: 0, life: 3 + r() * 3, s: 0.6 + r() * 1.6, j: r() * 100 });
        }
      }
      function step(dt, t) {
        T += dt;
        const b = imgBox(), sc = Math.max(0.6, b.h / 420);
        const rate = mode === 'vapor' ? 46 : mode === 'gelo' ? 10 : 14, max = mode === 'vapor' ? 240 : 90;
        acc += dt * rate;
        while (acc > 1) { acc--; if (parts.length < max) spawn(b); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'screen';
        parts = parts.filter((p) => (p.age += dt) < p.life);
        for (const p of parts) {
          const u = p.age / p.life;
          if (p.k === 'v') {
            // altura acima da xícara (0 = boca da xícara)
            const hgt = Math.max(0, (p.oy - p.y) / b.h), grow = Math.min(1, hgt * 2.4);
            // campo de vento: depende da altura e do tempo, igual para todas as partículas da mesma fita
            const wave = Math.sin(hgt * 7.5 - T * 1.15 + p.e * 2.1) * 34 + Math.sin(hgt * 15 + T * 1.7 + p.e) * 12;
            let push = 0; const dx = p.x - ptr.x, dy = p.y - ptr.y, d2 = dx * dx + dy * dy, R = 120;
            if (d2 < R * R) { const f = 1 - Math.sqrt(d2) / R; push = (dx > 0 ? 1 : -1) * f * 90 + ptr.vx * f * 5; }
            p.vx += ((wave * grow + push) * sc - p.vx) * Math.min(1, dt * 3);
            p.x += (p.vx + Math.sin(T * 0.9 + p.j) * 6 * grow) * dt;
            p.y -= (34 + 18 * hgt) * sc * dt;
            const s = p.s0 + (p.s1 - p.s0) * Math.pow(u, 0.75);
            const a = 0.12 * Math.min(1, u * 8) * Math.pow(1 - u, 1.5);
            ctx.globalAlpha = a; ctx.drawImage(puff, p.x - s / 2, p.y - s * 0.6, s, s * 1.2);
          } else if (p.k === 'h') {
            // névoa larga e quase invisível que dá volume
            p.x += Math.sin(T * 0.4 + p.j) * 6 * dt; p.y -= (p.cold ? 2 : 14) * sc * dt;
            const a = (p.cold ? 0.05 : 0.035) * Math.sin(Math.PI * u);
            ctx.globalAlpha = a; ctx.drawImage(puff, p.x - p.s / 2, p.y - p.s * 0.35, p.s, p.s * (p.cold ? 0.45 : 0.8));
          } else if (p.k === 'g') {
            // brilho de gelo: estrela fininha que pisca
            const a = Math.pow(Math.sin(Math.PI * u), 2) * 0.85; const s = p.s * (1 + Math.sin(t * 3 + p.j) * 0.2);
            ctx.globalAlpha = a; ctx.fillStyle = '#e9f7ff';
            ctx.beginPath(); ctx.arc(p.x, p.y, s * 0.55, 0, 6.283); ctx.fill();
            ctx.globalAlpha = a * 0.5; ctx.fillRect(p.x - s * 3, p.y - 0.35, s * 6, 0.7); ctx.fillRect(p.x - 0.35, p.y - s * 3, 0.7, s * 6);
          } else {
            // aroma: pontinhos dourados em espiral
            p.x += (p.vx + Math.sin(p.age * 1.6 + p.j) * 18) * dt; p.y += p.vy * dt;
            const a = Math.sin(Math.PI * u) * (0.55 + 0.45 * Math.sin(t * 5 + p.j));
            ctx.globalAlpha = a; ctx.fillStyle = '#f3cf86'; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, 6.283); ctx.fill();
          }
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      // começa já "fumegando" (pré-aquece alguns segundos sem desenhar na tela)
      function warm() { for (let i = 0; i < 90; i++) step(1 / 30, i / 30); }
      return {
        set(d) { mode = d.efeito || 'vapor'; origin = d.origem || [0.5, 0.2]; parts = []; acc = 0; },
        step, warm, clear() { ctx.clearRect(0, 0, cv.width, cv.height); parts = []; }, size,
      };
    })();

    function tick(now) {
      requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - (lastT || now)) / 1000); lastT = now;
      if (!inView || document.hidden) return;
      if (!calm) fx.step(dt, now / 1000);
      // passa sozinho a cada 7 s (para no mouse, no foco e nos efeitos reduzidos)
      if (!calm && !hovering && !busy && data.length > 1) {
        prog += (dt * 1000) / AUTO;
        const t = thumbs[idx]; if (t) t.style.setProperty('--p', Math.min(1, prog).toFixed(3));
        if (prog >= 1) go(idx + 1, 1);
      }
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach((e) => { inView = e.isIntersecting; if (!inView) fx.clear(); else { fx.size(); if (!calm) fx.warm(); } }), { threshold: 0.25 }).observe(vit);
    } else inView = true;
    paint(0);
    requestAnimationFrame(tick);
    // depois que a página assentar, adianta as outras imagens da vitrine
    setTimeout(() => data.forEach((d) => load(d.img)), 2500);
  }

  // ---------------------------------------------------------------
  // 4b · Menu do topo escurece sobre seções escuras
  // (olha o que está de fato atrás do menu, então cantos arredondados
  //  e seções sobrepostas não confundem a cor)
  // ---------------------------------------------------------------
  const navEl = $('#nav');
  let navTick = false;
  const navCheck = () => {
    navTick = false;
    const y = Math.min(innerHeight - 1, navEl.offsetHeight + 6);
    let dark = false;
    const stack = document.elementsFromPoint(innerWidth / 2, y);
    for (const el of stack) {
      if (navEl.contains(el) || el.closest('.toast, .mmenu, .cart, .cart-veil, .dots')) continue;
      dark = !!el.closest('[data-dark]');
      break;
    }
    navEl.classList.toggle('nav-dark', dark);
  };
  addEventListener('scroll', () => { if (!navTick) { navTick = true; requestAnimationFrame(navCheck); } }, { passive: true });
  navCheck();

  // ---------------------------------------------------------------
  // 5 · Rolagem suave (Lenis) no computador; o toque do celular fica nativo
  // ---------------------------------------------------------------
  if (window.Lenis && !calm && hasHover) {
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true, anchors: { offset: -70 } });
    window.lenis = lenis;
    function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    // janelas abertas (carrinho, opções, menu, paleta) travam a rolagem do fundo
    const sync = () => { if (document.body.classList.contains('noscroll')) lenis.stop(); else lenis.start(); };
    new MutationObserver(sync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    $$('.cart-scroll, .opt, .cmd-list, .mmenu-in, #cmd').forEach((n) => n.setAttribute('data-lenis-prevent', ''));
  }
  // ---------------------------------------------------------------
  // 7 · Janelas (carrinho, opções, paleta, menu): o foco do teclado
  //     fica dentro enquanto estão abertas e volta ao botão de origem
  // ---------------------------------------------------------------
  (function focusTrap() {
    const SEL = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const visible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length) && !el.closest('[hidden]') && getComputedStyle(el).visibility !== 'hidden';
    const focusables = (box) => [...box.querySelectorAll(SEL)].filter(visible);
    const stack = [];
    ['#cart', '#opt', '#cmd'].forEach((sel) => {
      const box = $(sel); if (!box) return;
      let was = box.classList.contains('open');
      new MutationObserver(() => {
        const on = box.classList.contains('open');
        if (on === was) return; was = on;
        if (on) {
          const back = document.activeElement;
          stack.push({ box, back });
          // espera a janela aparecer; se ninguém colocou o foco lá dentro, coloca no primeiro controle
          setTimeout(() => { if (!box.contains(document.activeElement)) { const f = focusables(box)[0]; if (f) f.focus({ preventScroll: true }); } }, 120);
        } else {
          const i = stack.findIndex((s) => s.box === box); if (i < 0) return;
          const { back } = stack.splice(i, 1)[0];
          const top = stack[stack.length - 1];
          if (top) { if (!top.box.contains(document.activeElement)) { const f = focusables(top.box)[0]; if (f) f.focus({ preventScroll: true }); } }
          else if (back && document.contains(back) && visible(back) && !back.closest('#cart, #opt, #cmd')) back.focus({ preventScroll: true });
        }
      }).observe(box, { attributes: true, attributeFilter: ['class'] });
    });
    addEventListener('keydown', (ev) => {
      if (ev.key !== 'Tab' || !stack.length) return;
      const box = stack[stack.length - 1].box;
      const f = focusables(box); if (!f.length) return;
      const first = f[0], last = f[f.length - 1], a = document.activeElement;
      if (ev.shiftKey && (a === first || !box.contains(a))) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && (a === last || !box.contains(a))) { ev.preventDefault(); first.focus(); }
    }, true);
  })();
  // ---------------------------------------------------------------
  // 6 · Grão de filme sobre os vídeos: textura fina e viva, gerada aqui
  //     (zero bytes de download), deixa a imagem com cara de câmera real
  // ---------------------------------------------------------------
  (function grain() {
    const pin = $('.pin');
    if (!pin || lite) return;
    const S = 180, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const ctx = cv.getContext('2d'), img = ctx.createImageData(S, S), d = img.data;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < d.length; i += 4) {
      // soma de 3 aleatórios ≈ distribuição suave (grão de filme, não "chuvisco")
      const v = 128 + ((rnd() + rnd() + rnd()) / 3 - 0.5) * 210;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    const g = document.createElement('div');
    g.className = 'film-grain'; g.setAttribute('aria-hidden', 'true');
    g.style.backgroundImage = `url(${cv.toDataURL('image/png')})`;
    pin.appendChild(g);
  })();
})();
