const CACHE = 'schokoladenfabrik-v25';
const FILES = ['./', './index.html', './style.css?v=25', './app.js?v=25', './content.js?v=25', './finale.js?v=25', './assets/factory.png', './assets/paper.png', './assets/favicon.svg', './assets/tonakte-c-dialog.mp3'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('schokoladenfabrik-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if(event.request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if(event.request.mode === 'navigate') event.respondWith(fetch(event.request).catch(() => caches.match('./index.html')));
  else event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
