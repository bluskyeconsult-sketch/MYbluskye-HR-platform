// public/sw.js - ODUSBABA service worker (conservative by design)
//
// What it does:
//  - Pages (navigations): ALWAYS network first, so users never see a stale
//    site. Only if the network fails does it show /offline.html.
//  - /assets/* (Vite files with hashed names, never change): cache-first.
//  - Icons and the offline page: cached at install.
// What it deliberately does NOT do:
//  - It never touches /api/*, Supabase, Stripe, OpenAI or any other
//    cross-origin request, and never caches anything that is not a GET.
//    Logins, payments, credits and job data always go straight to the network.
// To force every user onto fresh files after a change here, bump VERSION.

const VERSION = 'v1';
const STATIC_CACHE = 'odusbaba-static-' + VERSION;
const PRECACHE = [
  '/offline.html',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('odusbaba-') && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // never touch other sites
  if (url.pathname.startsWith('/api/')) return;           // never touch the API

  // Page loads: network first, offline page only if the network is down
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }

  // Hashed build files and icons: cache first
  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
  }
});
