// sw.js

const CACHE_NAME = "estudo-biblico-v0.14.7";

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
  "./sourceService.js",
  "./backupService.js",
  "./fileBackup.js",

  "./utils/text.js",
  "./utils/html.js",
  "./utils/dates.js",

  "./manifest.json",

  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/favicon-32x32.png",

  "./familyService.js",
  "./personService.js",

  "./graphService.js",

  "./graphView.js",
  "./graphService.js",
  "./vendor/cytoscape/cytoscape.min.js",
];

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

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  if (!requestUrl.protocol.startsWith("http")) return;

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then(async (cached) => {
      if (cached) return cached;

      try {
        const response = await fetch(event.request);

        const shouldCache =
          response &&
          response.status === 200 &&
          requestUrl.origin === self.location.origin;

        if (shouldCache) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }

        return response;
      } catch (error) {
        console.warn("Falha ao buscar recurso:", event.request.url, error);

        if (event.request.mode === "navigate") {
          return caches.match("./index.html", { ignoreSearch: true });
        }

        throw error;
      }
    })
  );
});