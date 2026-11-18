const cacheName = "pokeapi-js-wrapper-images-1";
const hasConsent = async (clientId) => {
  const client = await self.clients.get(clientId);
  if (!client) return false;
  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {
      channel.port1.close();
      resolve(false);
    }, 1000);
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data === true);
    };
    client.postMessage({ type: "GET_IMAGE_CONSENT" }, [channel.port2]);
  });
};
const isSprite = (url) => {
  const parsed = new URL(url);
  return (
    parsed.origin === "https://raw.githubusercontent.com" &&
    parsed.pathname.startsWith("/PokeAPI/sprites/")
  );
};

self.addEventListener("message", (event) => {
  if (event.data?.type !== "IMAGE_CONSENT" || !event.source?.id) return;
  if (event.data.allowed !== true) {
    event.waitUntil(caches.delete(cacheName));
  }
});

self.addEventListener("fetch", (event) => {
  if (!isSprite(event.request.url)) return;
  event.respondWith(
    (async () => {
      if (!(await hasConsent(event.clientId)))
        return new Response(null, { status: 403 });
      const cached = await caches.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (
        (await hasConsent(event.clientId)) &&
        (response.ok || response.type === "opaque")
      ) {
        const cache = await caches.open(cacheName);
        if (await hasConsent(event.clientId))
          await cache.put(event.request, response.clone());
        if (!(await hasConsent(event.clientId))) await caches.delete(cacheName);
      }
      return response;
    })(),
  );
});

self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
