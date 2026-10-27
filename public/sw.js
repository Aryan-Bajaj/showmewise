// Keeps the website on this computer, so it opens fast and works without internet.
// Pages: the newest from the internet when there is one, else the saved copy.
// Files in /assets/ never change (their names change instead): saved once, then served from here.
// Everything else of this site: served from the saved copy and refreshed in the background.
// Only this site's own files are saved; nothing the user makes is ever stored here.
const CACHE = "showmewise-v1"

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", "/index.html"])).then(() => self.skipWaiting()))
})
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()))
})

const save = (req, res) => { if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)) } return res }

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url)
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname === "/sw.js") return
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => save(req, res)).catch(() => caches.match(req).then((r) => r || caches.match("/index.html"))))
  } else if (url.pathname.startsWith("/assets/")) {
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => save(req, res))))
  } else {
    e.respondWith(caches.match(req).then((r) => {
      const fresh = fetch(req).then((res) => save(req, res)).catch(() => r)
      return r || fresh
    }))
  }
})
