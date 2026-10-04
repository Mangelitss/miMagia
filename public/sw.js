// Service worker: guarda el "cascarón" de la app para que abra sin conexión.
// (Los datos offline los gestiona Firestore con su caché persistente.)
//
// Estrategia "primero la red": si hay conexión se sirve siempre la última versión
// desplegada (y se actualiza la caché); sin conexión se usa lo guardado.
// Sube la versión de CACHE si cambias la lista de ASSETS.
const CACHE = "mimagia-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./firebase-config.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
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
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request, { ignoreSearch: true });
        // Las rutas internas (SPA) caen en index.html.
        return cached || (request.mode === "navigate" ? caches.match("./index.html") : Response.error());
      })
  );
});
