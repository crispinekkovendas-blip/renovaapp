/*
 * Renova — service worker do portal do paciente (/p/…).
 *
 * Faz só duas coisas: mostra o lembrete que chega por Web Push e abre o
 * portal quando o aviso é tocado. De propósito NÃO tem handler de `fetch`:
 * nada é cacheado, então o portal nunca fica desatualizado (a próxima
 * consulta, a confirmação e as receitas são sempre as do servidor).
 *
 * Payload esperado no evento `push` (JSON): { title, body, url, tag }
 */

const ICON = "/api/pwa/icon?size=192";
const FALLBACK_URL = "/p/app";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = typeof data.title === "string" && data.title ? data.title : "Lembrete da sua consulta";
  const url = typeof data.url === "string" && data.url ? data.url : FALLBACK_URL;
  const options = {
    body: typeof data.body === "string" ? data.body : "",
    icon: ICON,
    badge: ICON,
    data: { url },
  };
  if (typeof data.tag === "string" && data.tag) options.tag = data.tag;
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const target = new URL(typeof raw === "string" && raw ? raw : FALLBACK_URL, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Já aberto nesse link: só traz para frente.
      for (const client of windows) {
        if (client.url === target && "focus" in client) return client.focus();
      }
      // Outra página do portal aberta: navega nela em vez de abrir mais uma.
      for (const client of windows) {
        if ("navigate" in client && new URL(client.url).pathname.startsWith("/p/")) {
          await client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })()
  );
});
