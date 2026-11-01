const SHELL = 'mapa-app-v1';   // a própria app
const DADOS = 'mapa-dados';    // mosaicos, estilo, letras (nunca é apagado)

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(['./', './index.html', './manifest.json']))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== DADOS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// guardado primeiro; só vai à rede se ainda não tiver
async function cacheFirst(req) {
  const c = await caches.open(DADOS);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') c.put(req, res.clone());
  return res;
}

// mostra logo o guardado e atualiza em segundo plano
async function stale(req, nome) {
  const c = await caches.open(nome);
  const hit = await c.match(req);
  const rede = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
  return hit || (await rede) || Response.error();
}

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname === 'tiles.openfreemap.org' && u.pathname.startsWith('/styles/')) {
    e.respondWith(stale(r, DADOS));
  } else if (u.hostname === 'tiles.openfreemap.org' || u.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(cacheFirst(r));
  } else if (u.origin === location.origin) {
    e.respondWith(stale(r, SHELL));
  }
});
