// Service worker for Modo PWA.
// Everything the user makes lives in IndexedDB and the license is verified on
// the device, so this worker only needs to keep the app shell available
// without a network connection.
// Bump on any change to what this worker caches: `activate` deletes every cache
// whose name isn't the current one, which is the only way to evict entries an
// older worker wrote under different rules. v1 cached /api responses; v2 was
// the account era, whose cached pages could redirect to /login.
const CACHE = "modo-v3";
const APP_SHELL = ["/", "/dashboard", "/activate", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

// Stale-while-revalidate: serve from cache instantly, refresh in the
// background. Falls back to whatever is cached when the network is down.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never the API. License status and delivery must reflect the server now; a
  // cached "active" would hide a refund, a cached "not ready" would stall a
  // checkout.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
