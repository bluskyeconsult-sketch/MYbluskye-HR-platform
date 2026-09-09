// public/service-worker.js
// NEW (2026-09-09): confirmed via real, live console logs that a
// service worker from this project's original Horizons build is still
// actively intercepting every request in browsers that visited the
// site while it was registered - serving an entirely old app bundle
// (querying tables like job_board_sources, tiers, products that don't
// exist in the real, current codebase) instead of ever reaching the
// real, current Vercel deployment. This is the standard, proven
// pattern for forcibly removing an unwanted legacy service worker:
// when a browser checks for an update to its currently-registered
// worker and finds this file instead, it installs THIS one, which
// immediately unregisters itself and deletes every cache the old one
// created - after which the browser goes back to making normal,
// direct network requests with no service worker involved at all.

self.addEventListener('install', () => {
    // Activate immediately, without waiting for old tabs to close.
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            // Delete every cache this origin's service worker(s) ever
            // created - the old Horizons worker's cached bundle is
            // exactly what's been serving stale content.
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map((name) => caches.delete(name)));

            // Take control of any currently-open tabs immediately,
            // rather than waiting for a fresh navigation.
            await self.clients.claim();

            // Unregister this worker itself - once this runs, the
            // browser goes back to plain, direct network requests with
            // no service worker intercepting anything at all.
            await self.registration.unregister();

            // Force every currently-open tab to reload, so users get
            // the real, current site immediately rather than needing
            // to manually refresh.
            const clientsList = await self.clients.matchAll({ type: 'window' });
            clientsList.forEach((client) => client.navigate(client.url));
        })()
    );
});
