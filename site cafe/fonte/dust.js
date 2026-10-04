/* Poeira dourada flutuando sobre os vídeos (canvas 2D, substitui o Three.js) */
(function dust() {
  const pin = document.querySelector('.pin');
  if (!pin) return;
  const cv = document.createElement('canvas');
  cv.className = 'dust'; cv.setAttribute('aria-hidden', 'true');
  pin.appendChild(cv);
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const N = isPhone ? 34 : 70;
  const P = Array.from({ length: N }, () => ({ x: Math.random(), y: Math.random(), s: 0.4 + Math.random() * 1.6, v: 0.2 + Math.random() * 0.8, ph: Math.random() * 6.28, a: 0.25 + Math.random() * 0.55 }));
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = pin.clientWidth; H = pin.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; }
  size(); addEventListener('resize', size);
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const st = window.storyState || { inStory: true };
    if (calm || !st.inStory || document.hidden) { if (cv.style.opacity !== '0') { cv.style.opacity = '0'; } return; }
    cv.style.opacity = '1';
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const t = now / 1000;
    for (const p of P) {
      p.y -= p.v * dt * 0.018; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
      const x = (p.x + Math.sin(t * 0.3 * p.v + p.ph) * 0.012) * W, y = p.y * H;
      const tw = 0.6 + 0.4 * Math.sin(t * 1.7 + p.ph);
      ctx.beginPath(); ctx.arc(x, y, p.s, 0, 6.283);
      ctx.fillStyle = `rgba(255,226,189,${(p.a * tw).toFixed(3)})`; ctx.fill();
    }
  }
  requestAnimationFrame(frame);
})();
