/* ════════════════════════════════════════════════════════════════════
   Atelier blocs — Service Worker (V1.8.0)
   Appli installable et utilisable hors ligne après la première visite.
   Stratégie "stale-while-revalidate" : le cache est servi tout de suite,
   la nouvelle version est récupérée en arrière-plan.
   → après une publication, recharger DEUX fois (ou Ctrl+F5).
   À chaque nouvelle version : changer l'en-tête ci-dessus et CACHE_NAME.
   ════════════════════════════════════════════════════════════════════ */
const CACHE_NAME = 'atelier-blocs-v1-8-0';
const ASSETS = ['./', './index.html', './app.js', './catalogue.js', './algo.js', './accueil.js', './docx.iife.js', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || url.searchParams.has('maj')) return;   // ?maj= : toujours le réseau (contrôle des mises à jour)
  e.respondWith(caches.open(CACHE_NAME).then(async cache => {
    const cached = await cache.match(req, {ignoreSearch: true});
    const net = fetch(req).then(r => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => cached);
    return cached || net;
  }));
});
