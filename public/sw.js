// Service worker mínimo: cachea el "cascarón" de la app para que abra sin conexión.
// (Los datos offline los gestiona Firestore con su caché persistente.)
const CACHE = "mimagia-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./firebase-config.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  // Solo gestionamos peticiones propias GET; dejamos pasar las de Firebase/Google.
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
