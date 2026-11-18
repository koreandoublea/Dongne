// Offline shell. Online, files come from the network (so updates show at once) unless it's
// slower than 1.5 s; offline or slow, the cached copy opens instantly instead.
const CACHE = "dongne-v2";
const SHELL = ["./", "index.html", "style.css", "content.js", "vocab.js", "speech.js", "app.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((p) => new Request(p, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const key = req.mode === "navigate" ? "index.html" : req;
    const fresh = fetch(req, { cache: "no-cache" }).then((res) => { if (res.ok) c.put(key, res.clone()); return res; }).catch(() => null);
    const slow = new Promise((r) => setTimeout(r, 1500, null));
    const res = await Promise.race([fresh, slow]);
    if (res) return res;
    e.waitUntil(fresh);
    return (await c.match(key, { ignoreSearch: true })) || (await fresh) || new Response("Offline", { status: 503 });
  })());
});
