const WORKER_PATH = "/pokeapi-js-wrapper-sw.js";
const CACHE_NAME = "pokeapi-js-wrapper-images-1";
let desiredPermission = false;
let pending = Promise.resolve();

if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "GET_IMAGE_CONSENT") {
      event.ports[0]?.postMessage(desiredPermission);
    }
  });
}

/** Serialize cache changes so a late registration cannot undo withdrawal. */
export const setImageCachingAllowed = (allowed: boolean): Promise<void> => {
  desiredPermission = allowed;
  pending = pending
    .catch(() => {})
    .then(async () => {
      if (!("serviceWorker" in navigator)) {
        if (!desiredPermission && "caches" in window)
          await caches.delete(CACHE_NAME);
        return;
      }
      if (desiredPermission) {
        await navigator.serviceWorker.register(WORKER_PATH, { scope: "/" });
      } else {
        navigator.serviceWorker.controller?.postMessage({
          type: "IMAGE_CONSENT",
          allowed: false,
        });
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          if (
            [
              registration.active,
              registration.waiting,
              registration.installing,
            ].some(
              (worker) =>
                worker && new URL(worker.scriptURL).pathname === WORKER_PATH,
            )
          ) {
            registration.active?.postMessage({
              type: "IMAGE_CONSENT",
              allowed: false,
            });
            await registration.unregister();
          }
        }
        if ("caches" in window) await caches.delete(CACHE_NAME);
      }
    });
  return pending;
};
