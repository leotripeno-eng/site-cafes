/* Service worker: deixa o site abrir rápido e funcionar sem internet
   (cardápio, imagens e estilos). Os vídeos não entram no cache. */
const V = 'gd-v11';
const CORE = ['./', 'index.html', 'style.css', 'shop.css', 'magia.css', 'config.js', 'core.js', 'qrcode.js', 'shop.js', 'script.js', 'dust.js', 'magia.js', 'vendor/lenis.min.js', 'fonts.css',
  'manifest.webmanifest', 'assets/og.jpg', 'assets/icons/favicon.svg', 'assets/icons/icon-192.png',
  'assets/video/c1.jpg', 'assets/video/c2.jpg', 'assets/video/c3.jpg', 'assets/video/c4.jpg', 'assets/video/c5.jpg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(V).then((c) => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  if (/\.(mp4|webm)$/.test(u.pathname) || e.request.headers.has('range')) return; // vídeo: sempre da rede
  if (/\.(webp|jpg|png|svg)$/.test(u.pathname)) {
    e.respondWith(caches.open(V).then((c) => c.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok) c.put(e.request, r.clone()); return r; }))));
    return;
  }
  // páginas, CSS e JS: rede primeiro (para pegar atualizações), cache se estiver sem internet
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(V).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request).then((m) => m || caches.match('index.html'))));
});
