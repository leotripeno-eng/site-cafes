/* Utilitários ($, $$, clamp, smooth, rng, reduceMotion, showToast…) vêm do core.js */

// ---------- Entrada direta (sem tela de carregamento) ----------
// O site abre na hora; o vídeo da primeira cena começa a carregar logo em seguida.
(function boot() {
  const v0 = $('[data-vid]');
  if (!lite && v0) vidLoad(v0);
})();

// ---------- Botões magnéticos (via variáveis, para não brigar com o CSS) ----------
function magnetize(root = document) {
  if (reduceMotion) return;
  root.querySelectorAll('.btn, .add, .mini-add, .kbd-btn, .cart-btn, .chip-f, .lab-chips button').forEach((b) => {
    if (b.dataset.mag) return;
    b.dataset.mag = '1';
    b.addEventListener('pointermove', (ev) => {
      const r = b.getBoundingClientRect();
      b.style.setProperty('--tx', (((ev.clientX - r.left) / r.width - 0.5) * 8).toFixed(2) + 'px');
      b.style.setProperty('--ty', (((ev.clientY - r.top) / r.height - 0.5) * 5).toFixed(2) + 'px');
      b.style.setProperty('--gx', (((ev.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
    });
    b.addEventListener('pointerleave', () => { b.style.setProperty('--tx', '0px'); b.style.setProperty('--ty', '0px'); });
  });
}
magnetize();

// ---------- Ícones dos botões ----------
// (desligado na terceira passada: os botões não levam mais setas; o "+" virou o disco dourado)
function iconize(root = document) {
  if (!root) return;
  root.querySelectorAll('[data-ico-legacy]').forEach((b) => {
    if (b.dataset.ico || b.querySelector('.bi')) return;
    b.dataset.ico = '1';
    const i = document.createElement('span');
    i.className = 'bi';
    i.setAttribute('aria-hidden', 'true');
    i.textContent = b.classList.contains('btn') ? '→' : '＋';
    b.appendChild(i);
  });
}
iconize();

// ---------- Títulos: uma <span> por letra ----------
$$('.title').forEach((t) => {
  const text = t.dataset.text;
  t.setAttribute('aria-label', text);
  const inner = document.createElement('span');
  inner.className = 'title-in';
  inner.setAttribute('aria-hidden', 'true');
  t.style.setProperty('--len', [...text].length);
  [...text].forEach((ch, i) => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.style.setProperty('--i', i);
    s.textContent = ch === ' ' ? ' ' : ch;
    inner.appendChild(s);
  });
  t.appendChild(inner);
});

// ---------- Espalha objetos flutuantes (grãos, gelo, bolhas...) ----------
$$('.field').forEach((box, bi) => {
  const rand = rng(97 + bi * 31);
  const count = +box.dataset.n;
  const colors = box.dataset.colors.split(',');
  const big = box.dataset.big ? 1.6 : 1;
  const ar = 1;
  for (let i = 0; i < count; i++) {
    const f = document.createElement('div');
    f.className = 'f';
    f.style.cssText =
      `--x:${(rand() * 100).toFixed(1)}%;--y:${(rand() * 100).toFixed(1)}%;` +
      `--k:${((.22 + rand() * .4) * big).toFixed(2)};--s:${(rand() * 1.2 - .6).toFixed(2)};` +
      `--r:${(rand() * 240 - 120) | 0};--d:${(.3 + rand() * 1.3).toFixed(2)};--ar:${ar};` +
      `color:${colors[i % colors.length]}`;
    f.innerHTML = `<svg class="ico bob" style="animation-delay:${(-rand() * 6).toFixed(1)}s"><use href="#${box.dataset.symbol}"/></svg>`;
    box.appendChild(f);
  }
});

// ---------- Estrelas ----------
$$('.stars').forEach((box) => {
  const rand = rng(4242);
  for (let i = 0; i < 70; i++) {
    const s = document.createElement('i');
    const size = 1 + rand() * 2.4;
    s.style.cssText = `left:${rand() * 100}%;top:${rand() * 100}%;width:${size}px;height:${size}px;animation-delay:${-rand() * 3}s;animation-duration:${2 + rand() * 3}s`;
    box.appendChild(s);
  }
});

// ---------- Motor da história (rolagem → cenas) ----------
const story = $('.story');
const scenes = $$('.scene');
const N = scenes.length;
const nav = $('#nav');
const dotsBox = $('#dots');

let cur = 0, target = 0, running = false;
let mx = 0, my = 0, tmx = 0, tmy = 0;

// Bolinhas de navegação
const dots = scenes.map((_, i) => {
  const b = document.createElement('button');
  b.setAttribute('aria-label', `Ir para a cena ${i + 1}`);
  b.style.color = scenes[i].dataset.ink;
  b.addEventListener('click', () => {
    const top = story.getBoundingClientRect().top + scrollY;
    const total = story.offsetHeight - innerHeight;
    window.scrollTo({ top: top + (i / (N - 0.5)) * total, behavior: 'smooth' });
  });
  dotsBox.appendChild(b);
  return b;
});

// Borda "líquida": o café sobe pela tela revelando a próxima cena
function liquid(r) {
  const top = 105 - r * 140;
  const amp = 7 * Math.sin(Math.PI * r) + 1;
  const pts = [];
  for (let k = 0; k <= 20; k++) {
    pts.push(`${k * 5}% ${(top + amp * Math.sin(k * 0.7 + r * 9)).toFixed(2)}%`);
  }
  return `polygon(${pts.join(',')},100% 130%,0% 130%)`;
}

// Transições: cada cena entra de um jeito, sempre com borda suavizada
const TR = [null, 'pour', 'iris', 'frost', 'grain'];
const FLASH = { pour: '#ffcf8f', iris: '#fff0d8', frost: '#8fd8ff', grain: '#e8b06c' };
const flash = document.createElement('div'); flash.className = 'flash'; $('.pin').appendChild(flash);
function setMask(sc, img, size, repeat) {
  sc.style.webkitMaskImage = img; sc.style.maskImage = img;
  sc.style.webkitMaskSize = size; sc.style.maskSize = size;
  sc.style.webkitMaskRepeat = repeat; sc.style.maskRepeat = repeat;
}
function reveal(sc, i, r, nextR) {
  const t = TR[i], nt = TR[i + 1];
  let scale = 1, op = 1;
  if (t && r < 1) {
    const e = smooth(r);
    if (t === 'pour') {
      // café subindo: borda macia e levemente inclinada
      const a = (e * 128 - 14).toFixed(1);
      setMask(sc, `linear-gradient(6deg, #000 ${a}%, rgba(0,0,0,.55) ${(+a + 7).toFixed(1)}%, transparent ${(+a + 17).toFixed(1)}%)`, 'auto', 'no-repeat');
    } else if (t === 'iris') {
      // íris circular com borda difusa, abrindo a partir da xícara
      const a = (e * 118).toFixed(1);
      setMask(sc, `radial-gradient(circle at 58% 62%, #000 ${a}%, rgba(0,0,0,.5) ${(+a + 9).toFixed(1)}%, transparent ${(+a + 22).toFixed(1)}%)`, 'auto', 'no-repeat');
    } else if (t === 'frost') {
      // varredura fria na diagonal, bem suave
      const a = (e * 150 - 30).toFixed(1);
      setMask(sc, `linear-gradient(118deg, #000 ${a}%, rgba(0,0,0,.6) ${(+a + 11).toFixed(1)}%, transparent ${(+a + 28).toFixed(1)}%)`, 'auto', 'no-repeat');
    } else if (t === 'grain') {
      // dissolução granulada: grãos crescendo até cobrir a tela
      const rr = (e * 27).toFixed(2);
      setMask(sc, `radial-gradient(circle, #000 ${rr}px, rgba(0,0,0,.35) ${(+rr + 3).toFixed(2)}px, transparent ${(+rr + 7).toFixed(2)}px)`, '34px 34px', 'repeat');
    }
    scale = 1 + (1 - e) * 0.05;
    op = Math.min(1, 0.25 + e * 2.2);
  } else {
    setMask(sc, 'none', 'auto', 'no-repeat');
  }
  if (nt && nextR > 0) scale = 1 - nextR * 0.035;   // a cena que sai recua de leve
  sc.style.transform = scale === 1 ? 'none' : `scale(${scale.toFixed(4)})`;
  sc.style.opacity = op;
  sc.style.clipPath = 'none'; sc.style.filter = 'none';
}

function render() {
  let fl = 0;
  scenes.forEach((sc, i) => {
    const p = clamp(cur - i + 0.5);
    const fadeIn = i === 0 ? 1 : clamp((p - 0.1) / 0.3);
    const fadeOut = i === N - 1 ? 1 : clamp((1 - p) / 0.3);
    const e = Math.min(fadeIn, fadeOut);
    const r = i === 0 ? 1 : smooth(clamp((cur - (i - 0.75)) / 0.5));
    const nextR = i === N - 1 ? 0 : smooth(clamp((cur - (i + 0.25)) / 0.5));

    sc.style.setProperty('--p', p.toFixed(4));
    sc.style.setProperty('--e', e.toFixed(4));
    sc.style.visibility = r <= 0 || nextR >= 1 ? 'hidden' : 'visible';
    reveal(sc, i, r, nextR);
    if (i > 0 && r > 0 && r < 1 && Math.sin(Math.PI * r) > fl) { fl = Math.sin(Math.PI * r); flash.style.setProperty('--fc', FLASH[TR[i]] || '#ffcf8f'); }
  });
  flash.style.opacity = (fl * 0.42).toFixed(3);

  const active = clamp(Math.round(cur), 0, N - 1);
  dots.forEach((d, i) => d.classList.toggle('on', i === active));
  if (inStory) {
    nav.style.color = scenes[active].dataset.ink;
    dotsBox.style.color = scenes[active].dataset.ink;
    dots.forEach((d) => (d.style.color = scenes[active].dataset.ink));
  }
  root.style.setProperty('--mx', mx.toFixed(2));
  root.style.setProperty('--my', my.toFixed(2));
  // Compartilha o estado da rolagem com a camada 3D (gl.js)
  window.storyState = { cur, inStory, N };
  updateVideos();
  if (typeof updateAudio === 'function') updateAudio();
}


// ---------- Vídeo controlado pela rolagem + HUD ----------
// Cada cena só baixa o vídeo quando a rolagem chega perto dela.
// Em "modo leve" fica só a imagem de capa.
const vids = $$('[data-vid]');
function vidLoad(v) {
  if (!v || v.dataset.loaded || lite) return;
  v.dataset.loaded = '1';
  const n = v.dataset.n;
  // WebM VP9 com quadro-chave a cada 6: busca rápida na rolagem.
  // Celular recebe a versão vertical 540x960 (recortada no assunto de cada cena).
  v.innerHTML = `<source src="assets/video/c${n}${isPhone ? '-m' : ''}.webm" type="video/webm">`;
  v.preload = 'auto';
  v.addEventListener('loadedmetadata', () => kick(), { once: true });
  v.load();
}
const CH = ['Entrada', 'Espresso', 'Cappuccino', 'Cold Brew', 'Grãos'];

const tlLabels = $('#tlLabels');
if (tlLabels) CH.forEach((n, i) => {
  const li = document.createElement('li'); li.textContent = n;
  li.addEventListener('click', () => {
    const top = story.getBoundingClientRect().top + scrollY;
    const total = story.offsetHeight - innerHeight;
    window.scrollTo({ top: top + (i / (N - 0.5)) * total, behavior: 'smooth' });
  });
  tlLabels.appendChild(li);
});
const elTc = $('#tc'), elFill = $('#tlFill');
let lastMsg = -1;
function updateVideos() {
  vids.forEach((v, i) => {
    // capa de cada cena só baixa quando a rolagem chega perto
    if (v.dataset.poster && Math.abs(cur - i) < 1.6) { v.poster = v.dataset.poster; delete v.dataset.poster; }
    if (Math.abs(cur - i) < 1.35) vidLoad(v);
    const sc = scenes[i];
    if (!sc || sc.style.visibility === 'hidden') return;
    const dur = v.duration;
    if (!dur || !isFinite(dur)) return;
    const t = i === 0 ? clamp(cur / 0.75) : clamp((cur - (i - 0.75)) / (i === N - 1 ? 1.25 : 1.5));
    const want = Math.min(dur - 0.04, t * dur);
    if (!v.seeking && Math.abs(v.currentTime - want) > 0.012) v.currentTime = want;
  });
  const g = clamp(cur / (N - 1));
  if (elFill) elFill.style.width = (g * 100).toFixed(2) + '%';
  if (elTc) { const s = Math.round(g * 50); elTc.textContent = '00:' + String(s).padStart(2, '0'); }
  const k = clamp(Math.round(cur), 0, N - 1);
  const rc = $('#recCam'); if (rc) rc.textContent = String(k + 1).padStart(2, '0');
  if (k !== lastMsg) { lastMsg = k; $$('#tlLabels li').forEach((li, j) => li.classList.toggle('on', j === k)); }
}

// ---------- Som ambiente (opcional, começa desligado) ----------
const auds = vids.map((v) => { const a = new Audio(`assets/video/c${v.dataset.n}.m4a`); a.loop = true; a.preload = 'none'; a.volume = 0; return a; });
let soundOn = false;
// trilha de jazz original (2min36, repete sem emenda); só baixa quando o som é ligado
const music = new Audio(); music.loop = true; music.volume = 0; music.preload = 'none';
const MUSIC_SRC = 'assets/audio/jazz.m4a';
let musicVol = 0;
const sndBtn = $('#snd');
function setSound(on) {
  soundOn = on;
  if (sndBtn) {
    sndBtn.setAttribute('aria-pressed', on);
    $('#sndIco').textContent = on ? '🔊' : '🔇';
    $('#sndTxt').textContent = on ? 'Música ligada' : 'Som desligado';
  }
  $$('#jazzBtn').forEach((b) => { b.setAttribute('aria-pressed', on); b.classList.toggle('on', on); b.title = on ? 'Pausar a trilha de jazz' : 'Tocar a trilha de jazz da casa'; });
  if (on) {
    if (!music.src) music.src = MUSIC_SRC;
    music.play().catch(() => showToast('Toque em qualquer lugar para liberar o som'));
  }
  updateAudio();
}
if (sndBtn) sndBtn.addEventListener('click', () => {
  setSound(!soundOn);
  if (soundOn) showToast('Música ligada. Se o chefe passar, a culpa é do café ☕');
});
$$('#jazzBtn').forEach((b) => b.addEventListener('click', () => {
  setSound(!soundOn);
  if (soundOn) showToast('Jazz da casa tocando. Piano, contrabaixo e escovinha.');
}));
setInterval(() => updateAudio(), 60);
function updateAudio() {
  // música: sobe e desce suavemente
  musicVol += ((soundOn ? 0.55 : 0) - musicVol) * 0.06;
  music.volume = Math.max(0, Math.min(1, musicVol));
  if (!soundOn && musicVol < 0.01 && !music.paused) music.pause();
  auds.forEach((a, i) => {
    const w = soundOn && inStory ? clamp(1 - Math.abs(cur - i) * 1.5) : 0;
    a.volume = Math.min(1, w * 0.22);
    if (w > 0.02 && a.paused) a.play().catch(() => {});
    else if (w <= 0.02 && !a.paused) a.pause();
  });
}

let inStory = true;
function readTarget() {
  const rect = story.getBoundingClientRect();
  const total = story.offsetHeight - innerHeight;
  target = clamp(-rect.top / total) * (N - 0.5);
  inStory = rect.bottom > 90;
  nav.classList.toggle('solid', !inStory);
  if (!inStory) nav.style.color = '';
  dotsBox.classList.toggle('show', rect.top <= 0 && rect.bottom > innerHeight * 0.6);
}

function frame() {
  const k = reduceMotion ? 1 : 0.065;
  cur += (target - cur) * k;
  if (Math.abs(target - cur) < 0.0005) cur = target;
  mx += (tmx - mx) * 0.06;
  my += (tmy - my) * 0.06;
  render();
  if (cur !== target || Math.abs(tmx - mx) > 0.05 || Math.abs(tmy - my) > 0.05) {
    requestAnimationFrame(frame);
  } else {
    running = false;
  }
}

function kick() {
  readTarget();
  if (!running) { running = true; requestAnimationFrame(frame); }
}

addEventListener('scroll', kick, { passive: true });
addEventListener('resize', kick);
addEventListener('pointermove', (ev) => {
  if (reduceMotion) return;
  tmx = (ev.clientX / innerWidth - 0.5) * 40;
  tmy = (ev.clientY / innerHeight - 0.5) * 40;
  kick();
});
kick();

// ---------- Aparecer suavemente ao rolar (seções normais) ----------
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
$$('.reveal').forEach((el) => revealObserver.observe(el));

// ---------- Contadores animados ----------
const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const goal = +el.dataset.count;
    const start = performance.now();
    const duration = 1800;
    function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      el.textContent = Math.floor(goal * (1 - Math.pow(1 - p, 3))).toLocaleString('pt-BR');
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    countObserver.unobserve(el);
  });
}, { threshold: 0.6 });
$$('[data-count]').forEach((el) => countObserver.observe(el));

// ---------- Filtros do cardápio (seletor deslizante) ----------
(function menuFilters() {
  const box = $('#filters'), cards = $$('#grid .card'), ind = $('#fInd');
  if (!box) return;
  $$('#filters .chip-f').forEach((b) => {
    const f = b.dataset.f;
    const n = f === 'todos' ? cards.length : cards.filter((c) => c.dataset.cat === f).length;
    b.innerHTML = b.textContent.trim() + `<sup>${n}</sup>`;
  });
  function slide(b) { if (ind && b) { ind.style.width = b.offsetWidth + 'px'; ind.style.transform = `translateX(${b.offsetLeft - 5}px)`; } }
  function apply(f, btn) {
    cards.forEach((c, i) => {
      const show = f === 'todos' || c.dataset.cat === f;
      c.classList.toggle('hide', !show);
      if (show) { c.classList.remove('pop-in'); void c.offsetWidth; c.style.animationDelay = Math.min(i, 10) * 28 + 'ms'; c.classList.add('pop-in', 'visible'); }
    });
    $$('#filters .chip-f').forEach((b) => b.classList.toggle('on', b.dataset.f === f));
    slide(btn || box.querySelector(`.chip-f[data-f="${f}"]`));
  }
  box.addEventListener('click', (ev) => { const b = ev.target.closest('.chip-f'); if (b) apply(b.dataset.f, b); });
  addEventListener('resize', () => slide(box.querySelector('.chip-f.on')));
  apply('todos');
  setTimeout(() => slide(box.querySelector('.chip-f.on')), 120);
})();

// ---------- Laboratório de sabor ----------
(function flavorLab() {
  const box = $('#labSliders');
  if (!box) return;
  const AXES = [
    { k: 'intensidade', label: 'Intensidade', hint: 'do suave ao soco de cafeína' },
    { k: 'acidez', label: 'Acidez', hint: 'notas cítricas e frutadas' },
    { k: 'doçura', label: 'Doçura', hint: 'caramelo, chocolate, baunilha' },
    { k: 'cremosidade', label: 'Cremosidade', hint: 'corpo e textura de leite' },
  ];
  // perfil de cada produto nos 4 eixos (0–100)
  const PROFILE = {
    'espresso-intenso': [95, 45, 25, 30],
    'ristretto-curto': [99, 38, 20, 26],
    'cappuccino-cremoso': [55, 30, 65, 95],
    'latte-de-baunilha': [38, 22, 92, 86],
    'flat-white': [62, 28, 56, 88],
    'coado-do-dia-v60': [48, 80, 46, 22],
    'cafe-na-prensa-500ml': [68, 54, 44, 38],
    'moka-italiana-dupla': [86, 40, 36, 42],
    'cold-brew': [62, 18, 72, 40],
    'shakerato-gelado': [74, 34, 58, 56],
    'graos-especiais-250g': [70, 74, 50, 32],
    'blend-da-casa-500g': [78, 48, 60, 45],
    'cafe-moido-250g': [74, 52, 54, 40],
    'chocolate-quente-na-caneca': [28, 14, 96, 92],
    'kit-3-origens-300g': [72, 82, 50, 30],
    'torra-escura-250g': [93, 28, 46, 40],
    'descafeinado-250g': [44, 46, 56, 44],
    'cafe-para-espresso-250g': [89, 42, 40, 36],
  };
  const PRESETS = {
    'manhã difícil': [96, 35, 30, 35],
    'tarde tranquila': [45, 40, 72, 80],
    'verão': [55, 30, 68, 30],
    'sobremesa': [35, 20, 95, 88],
    'explorador': [72, 85, 45, 40],
  };
  let you = [70, 50, 55, 60];
  box.innerHTML = AXES.map((a, i) => `
    <div class="lab-row">
      <header><h3>${a.label}</h3><span class="val" data-v="${i}">${you[i]}</span></header>
      <input type="range" min="0" max="100" value="${you[i]}" data-i="${i}" aria-label="${a.label}">
      <p>${a.hint}</p>
    </div>`).join('');
  $('#labPresets').innerHTML = Object.keys(PRESETS).map((p) => `<button type="button" data-p="${p}">${p}</button>`).join('');

  // grade do radar
  const cx = 160, cy = 160, R = 108;
  const pt = (i, v) => { const a = (Math.PI * 2 * i) / 4 - Math.PI / 2; return [cx + Math.cos(a) * R * (v / 100), cy + Math.sin(a) * R * (v / 100)]; };
  $('#radarGrid').innerHTML = [25, 50, 75, 100].map((r) => `<polygon points="${[0, 1, 2, 3].map((i) => pt(i, r).map((n) => n.toFixed(1)).join(',')).join(' ')}"/>`).join('')
    + [0, 1, 2, 3].map((i) => { const [x, y] = pt(i, 100); return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; }).join('');
  $('#radarLabels').innerHTML = AXES.map((a, i) => { const [x, y] = pt(i, 122);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${i === 1 ? 'start' : i === 3 ? 'end' : 'middle'}" dy="${i === 0 ? -2 : i === 2 ? 9 : 3}">${a.label}</text>`; }).join('');

  const poly = (v) => v.map((n, i) => pt(i, n).map((x) => x.toFixed(1)).join(',')).join(' ');
  const score = (p) => Math.round(100 - (you.reduce((t, v, i) => t + Math.abs(v - p[i]), 0) / 4) * 0.92);

  function update() {
    AXES.forEach((a, i) => {
      const r = box.querySelector(`input[data-i="${i}"]`);
      r.style.setProperty('--f', you[i] + '%');
      box.querySelector(`[data-v="${i}"]`).textContent = you[i];
    });
    const ranked = Object.keys(PROFILE).filter((id) => CATALOG[id]).map((id) => ({ id, s: score(PROFILE[id]) })).sort((a, b) => b.s - a.s);
    $('#radarYou').setAttribute('points', poly(you));
    if (ranked[0]) $('#radarMatch').setAttribute('points', poly(PROFILE[ranked[0].id]));
    const best = ranked[0] && CATALOG[ranked[0].id];
    if (best) $('#labBest').innerHTML = `<span class="lg">Melhor compatibilidade</span><span class="pct">${ranked[0].s}%</span><span class="nm">${best.name}</span>`;
    $('#labResults').innerHTML = ranked.slice(0, 6).map((r, i) => { const p = CATALOG[r.id]; return `
      <article class="lr${i === 0 ? ' top' : ''}">
        <div class="lr-top"><div class="lr-img" style="background:${p.bg}"><img src="${p.img}" alt=""></div>
          <div><h4>${p.name}</h4><small>${money(p.price)}</small></div><span class="lr-pct">${r.s}%</span></div>
        <div class="lr-bar"><i style="width:${Math.max(4, r.s)}%"></i></div>
        <button type="button" class="add" data-lab="${r.id}" aria-label="Adicionar ${p.name} ao carrinho">Adicionar<span class="disc" aria-hidden="true"></span></button>
      </article>`; }).join('');
    $$('#labResults .add').forEach((b) => b.addEventListener('click', () => addToCart(b.dataset.lab, b)));
    magnetize($('#labResults')); iconize($('#labResults'));
    $$('#labPresets button').forEach((b) => b.classList.toggle('on', PRESETS[b.dataset.p] && PRESETS[b.dataset.p].every((v, i) => v === you[i])));
  }
  box.addEventListener('input', (ev) => { const r = ev.target.closest('input[data-i]'); if (!r) return; you[+r.dataset.i] = +r.value; update(); });
  $('#labPresets').addEventListener('click', (ev) => {
    const b = ev.target.closest('button[data-p]'); if (!b) return;
    you = PRESETS[b.dataset.p].slice();
    box.querySelectorAll('input[data-i]').forEach((r, i) => { r.value = you[i]; });
    update(); showToast(`Perfil "${b.dataset.p}" carregado. Recalculando…`);
  });
  update();
})();

// ---------- Paleta de comandos (Ctrl/⌘ + K) ----------
(function commandPalette() {
  const el = $('#cmd'), veil = $('#cmdVeil'), input = $('#cmdIn'), list = $('#cmdList');
  if (!el) return;
  const goStory = (i) => {
    const top = story.getBoundingClientRect().top + scrollY;
    const total = story.offsetHeight - innerHeight;
    scrollTo({ top: top + (i / (N - 0.5)) * total, behavior: 'smooth' });
  };
  const goSel = (sel) => { const n = $(sel); if (n) scrollTo({ top: n.getBoundingClientRect().top + scrollY - 20, behavior: 'smooth' }); };
  const CMDS = [
    { g: 'Cenas', ic: '◉', t: 'Cena · Café', d: 'entrada do salão', run: () => goStory(0) },
    { g: 'Cenas', ic: '◉', t: 'Cena · Espresso', d: 'extração a 9 bar', run: () => goStory(1) },
    { g: 'Cenas', ic: '◉', t: 'Cena · Cappuccino', d: 'microespuma e latte art', run: () => goStory(2) },
    { g: 'Cenas', ic: '◉', t: 'Cena · Cold Brew', d: 'infusão a frio 18 h', run: () => goStory(3) },
    { g: 'Cenas', ic: '◉', t: 'Cena · Grãos', d: 'torra e moagem', run: () => goStory(4) },
    { g: 'Ir para', ic: '▤', t: 'Produtos', d: 'catálogo completo', run: () => goSel('#produtos') },
    { g: 'Ir para', ic: '◫', t: 'Laboratório de sabor', d: 'descubra o seu café', run: () => goSel('#lab') },
    { g: 'Ir para', ic: '★', t: 'Clube & presentes', d: 'fidelidade, assinatura e kit', run: () => goSel('#clube') },
    { g: 'Ir para', ic: '?', t: 'Dúvidas e avaliações', d: 'entrega, pagamento, alérgenos', run: () => goSel('#ajuda') },
    { g: 'Ir para', ic: '◐', t: 'Sobre', d: 'do grão à xícara', run: () => goSel('#sobre') },
    { g: 'Ir para', ic: '✉', t: 'Contato', d: 'fale com a gente', run: () => goSel('#contato') },
    { g: 'Sistema', ic: '♪', t: 'Alternar música', d: 'liga/desliga o áudio ambiente', run: () => { setSound(!soundOn); showToast(soundOn ? 'Áudio ligado.' : 'Áudio desligado.'); } },
    { g: 'Sistema', ic: '🛒', t: 'Abrir carrinho', d: 'ver pedido atual', run: () => openCart() },
    { g: 'Sistema', ic: '☾', t: 'Alternar tema claro/escuro', d: 'muda as cores do site', run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
    { g: 'Sistema', ic: '◌', t: 'Reduzir efeitos', d: 'menos movimento na tela', run: () => setCalm(!calm) },
    { g: 'Sistema', ic: '⤓', t: 'Cardápio em PDF', d: 'imprimir ou salvar', run: () => $('#printMenu').click() },
    { g: 'Sistema', ic: '⤒', t: 'Voltar ao topo', d: 'reiniciar a jornada', run: () => scrollTo({ top: 0, behavior: 'smooth' }) },
  ];
  function all() {
    const prod = Object.values(CATALOG).map((p) => ({ g: 'Adicionar', ic: '+', t: p.name, d: money(p.price) + ' · adicionar ao carrinho', run: () => addToCart(p.id, $('#cartBtn')) }));
    return CMDS.concat(prod);
  }
  let items = [], sel = 0;
  const norm = (t) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function draw() {
    const q = norm(input.value.trim());
    const words = q.split(/\s+/).filter(Boolean);
    items = all().filter((c) => { const h = norm(c.t + ' ' + c.d + ' ' + c.g).replace(/[·•|,]/g, ' '); return words.every((w) => h.includes(w)); });
    sel = 0;
    if (!items.length) { list.innerHTML = '<li class="cmd-empty">Nada encontrado. Tente "cold", "grãos" ou "música".</li>'; return; }
    let g = '', html = '';
    items.forEach((c, i) => {
      if (c.g !== g) { g = c.g; html += `<li class="cmd-group">${g}</li>`; }
      html += `<li data-i="${i}"><span class="ic">${c.ic}</span><span>${c.t}<small>${c.d}</small></span><span class="hint">↵</span></li>`;
    });
    list.innerHTML = html;
    mark();
  }
  const rows = () => [...list.querySelectorAll('li[data-i]')];
  function mark() { rows().forEach((r) => r.classList.toggle('sel', +r.dataset.i === sel)); const r = rows().find((r) => +r.dataset.i === sel); if (r) r.scrollIntoView({ block: 'nearest' }); }
  function open() { el.classList.add('open'); veil.classList.add('open'); el.setAttribute('aria-hidden', 'false'); input.value = ''; draw();
    // a paleta aparece com transição: insiste no foco até o campo aceitar
    const tryFocus = (n = 0) => { input.focus({ preventScroll: true }); if (document.activeElement !== input && n < 12) setTimeout(() => tryFocus(n + 1), 40); };
    requestAnimationFrame(() => tryFocus()); }
  function close() { el.classList.remove('open'); veil.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); input.blur(); }
  const isOpen = () => el.classList.contains('open');
  function exec(i) { const c = items[i]; if (!c) return; close(); setTimeout(() => c.run(), 180); }
  input.addEventListener('input', draw);
  list.addEventListener('click', (ev) => { const r = ev.target.closest('li[data-i]'); if (r) exec(+r.dataset.i); });
  list.addEventListener('pointermove', (ev) => { const r = ev.target.closest('li[data-i]'); if (r && +r.dataset.i !== sel) { sel = +r.dataset.i; mark(); } });
  veil.addEventListener('click', close);
  $('#cmdBtn').addEventListener('click', open);
  if (!/Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)) { const k = $('#cmdBtn span'); if (k) k.textContent = 'Ctrl\u00a0'; }
  addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k') { ev.preventDefault(); isOpen() ? close() : open(); return; }
    if (!isOpen()) return;
    if (ev.key === 'Escape') { ev.preventDefault(); close(); }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); sel = (sel + 1) % items.length; mark(); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); sel = (sel - 1 + items.length) % items.length; mark(); }
    else if (ev.key === 'Enter') { ev.preventDefault(); exec(sel); }
  });
})();
