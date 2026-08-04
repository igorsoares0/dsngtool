// Service worker for Modo PWA.
// The editor is offline-first (state persists to IndexedDB), so this worker
// only needs to keep the app shell available without a network connection.
// Bump on any change to what this worker caches: `activate` deletes every cache
// whose name isn't the current one, which is the only way to evict entries an
// older worker wrote under different rules. v1 cached /api responses.
const CACHE = "dsgntool-v2";
const APP_SHELL = ["/", "/manifest.webmanifest"];

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

  // Never the API. Those responses belong to one session (identity, projects,
  // quota) and a cached copy outlives the sign-in that produced it — the next
  // person on this browser would be served the last person's account. They also
  // must never be stale: sync reconciles against what the server says now.
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
