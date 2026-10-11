/* Offline-Unterstützung: Netzwerk zuerst, Cache als Rückfall. */
const CACHE = 'calcumeter-v10';
const ASSETS = ['./', 'index.html', 'style.css', 'assets/fonts/fonts.css', 'assets/fonts/geist-latin.woff2', 'assets/fonts/geist-latin-ext.woff2', 'assets/fonts/geist-mono-latin.woff2', 'native.js', 'i18n.js', 'lang/es.js', 'lang/fr.js', 'lang/it.js', 'lang/pt.js', 'lang/tr.js', 'lang/pl.js', 'lang/nl.js', 'lang/sv.js', 'lang/da.js', 'lang/ja.js', 'lang/ko.js', 'lang/zh-Hans.js', 'lang/zh-Hant.js', 'calculator.js', 'keypad.js', 'currency.js', 'units.js', 'programmer.js', 'graph.js', 'money.js', 'app.js', 'icons/icon-192.png', 'icons/apple-touch-icon.png', 'icons/favicon-48.png', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
