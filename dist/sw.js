/* Service worker mínimo de Pondus.
 * - Permite instalar la app en Android (pantalla de inicio, sin barra del navegador).
 * - Guarda la "carcasa" de la app para que abra rápido; los DATOS siempre vienen de tu hoja
 *   (las llamadas al servidor son de otro dominio y este script no las toca).
 */
const CACHE = 'pondus-shell-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Apps Script, Google Fonts…: no se tocan

  // Páginas: primero la red (para recibir versiones nuevas), y la copia guardada si no hay internet.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('shell', copy));
          return res;
        })
        .catch(async () => (await caches.match('shell')) || Response.error())
    );
    return;
  }

  // Archivos con nombre único (assets/…): primero la copia guardada.
  if (url.pathname.includes('/assets/') || url.pathname.includes('/icons/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
      )
    );
  }
});
