// sw.js

const CACHE_NAME = "estudo-biblico v 0.12.6";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./db.js",
  "./seed.js",
  "./entityService.js",
  "./timeSpanService.js",
  "./relationService.js",
  "./backupService.js",
  "./fileBackup.js",
  "./manifest.json"
];

// Instala e tenta cachear arquivos essenciais
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const file of FILES_TO_CACHE) {
        try {
          await cache.add(file);
        } catch (error) {
          console.warn("Falha ao cachear:", file, error);
        }
      }
    })
  );

  self.skipWaiting();
});

// Remove caches antigos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// Cache first para arquivos locais
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((response) => {
          return response;
        })
      );
    })
  );
});