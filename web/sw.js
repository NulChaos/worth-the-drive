// Worth the Drive service worker: keeps the app working offline and picks up new versions from GitHub Pages.
const CACHE = "wtd-v3";
const SHELL = ["./", "./index.html", "./data.json", "./leaflet.js", "./leaflet.css", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });

// Same-origin files: try the network first (so pushes show up), fall back to the cache when offline.
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      // Skip GitHub's 10-minute CDN cache for the page and data so pushes show up right away.
      const fresh = /\/$|\.html$|\.json$|\.webmanifest$/.test(url.pathname)
        ? new URL(url.pathname + "?v=" + Date.now(), url.origin).href : e.request;
      const res = await fetch(fresh, { cache: "no-store" });
      if (res.ok) cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      return hit || (url.pathname.endsWith("/") ? cache.match("./index.html") : Response.error());
    }
  })());
});
