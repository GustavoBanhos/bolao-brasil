const CACHE_NAME = "bolao-administracao-v4";
const ASSETS = [
  "./",
  "index.html",
  "login.html",
  "admin.html",
  "palpite.html",
  "ranking.html",
  "jogo.html",
  "style.css",
  "app.js",
  "firebase.js",
  "database.js",
  "charts.js",
  "utils.js",
  "manifest.webmanifest",
  "assets/icons/icon.svg",
  "assets/logos/logo.svg",
  "assets/logos/stadium.svg",
  "assets/bandeiras/brasil.svg",
  "assets/bandeiras/noruega.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const destination = event.request.destination;
  const networkFirst = event.request.mode === "navigate"
    || ["document", "script", "style", "worker"].includes(destination);

  if (networkFirst) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      return response;
    }).catch(() => caches.match("index.html")))
  );
});
