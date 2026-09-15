/* ==========================================================================
   sw.js — العمل بدون إنترنت
   - ملفات التطبيق: الكاش أولاً مع تحديث صامت بالخلفية
   - التنقل: الشبكة أولاً ثم الكاش (حتى يوصل آخر إصدار)
   - الخطوط الخارجية: تُخزَّن بعد أول تحميل
   ========================================================================== */
const VERSION = 'jadwali-v1.0.0';
const SHELL = VERSION + '-shell';
const RUNTIME = VERSION + '-runtime';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/base.css',
  './css/components.css',
  './css/layout.css',
  './css/views.css',
  './js/icons.js',
  './js/utils.js',
  './js/store.js',
  './js/catalog.js',
  './js/adhkar.js',
  './js/ucs.js',
  './js/ui.js',
  './js/views.js',
  './js/app.js',
  './assets/icons/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.allSettled(ASSETS.map(url => cache.add(new Request(url, { cache: 'reload' }))));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k)));
    if (self.registration.navigationPreload) {
      try { await self.registration.navigationPreload.enable(); } catch (e) { /* تجاهل */ }
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  /* 1) التنقل */
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preload = await event.preloadResponse;
        if (preload) {
          (await caches.open(SHELL)).put('./index.html', preload.clone());
          return preload;
        }
        const fresh = await fetch(req);
        (await caches.open(SHELL)).put('./index.html', fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(SHELL);
        return (await cache.match('./index.html')) || (await cache.match('./')) || offlinePage();
      }
    })());
    return;
  }

  /* 2) ملفات التطبيق نفسه */
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(SHELL);
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then(res => {
        if (res && res.status === 200) cache.put(req, res.clone());
        return res;
      }).catch(() => null);
      return hit || (await net) || offlinePage();
    })());
    return;
  }

  /* 3) موارد خارجية (الخطوط) */
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME);
    const hit = await cache.match(req);
    const net = fetch(req).then(res => {
      if (res && (res.status === 200 || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return hit || (await net) || new Response('', { status: 504 });
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

function offlinePage() {
  return new Response(
    '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>بدون اتصال</title>' +
    '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#faf5ea;color:#241f1a;' +
    'font-family:system-ui,sans-serif;text-align:center;padding:24px}h1{font-size:19px;margin:0 0 8px}' +
    'p{color:#6b6055;font-size:14px;margin:0}</style></head><body><div>' +
    '<h1>ما قدرنا نفتح التطبيق</h1><p>افتحه مرة وأنت متصل، وبعدها بيشتغل بدون إنترنت.</p>' +
    '</div></body></html>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}
