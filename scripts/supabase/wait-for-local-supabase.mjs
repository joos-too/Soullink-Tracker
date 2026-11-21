import { pathToFileURL } from "node:url";

export const waitForLocalSupabase = async (localAnonKey) => {
  if (!localAnonKey) {
    throw new Error("Set VITE_SUPABASE_ANON_KEY for the local Supabase stack.");
  }

  const url = "http://127.0.0.1:54321";
  const deadline = Date.now() + 30_000;
  let lastResult = "no response";

  while (Date.now() < deadline) {
    const controller = new AbortController();
    // Keep Node alive while the probes wait for a response or time out.
    const timeout = setTimeout(
      () => controller.abort(new Error("Health check request timed out")),
      2_000,
    );
    try {
      const [auth, rest] = await Promise.all([
        fetch(url + "/auth/v1/health", { signal: controller.signal }),
        fetch(url + "/rest/v1/trackers?select=id&limit=1", {
          headers: {
            apikey: localAnonKey,
            Authorization: "Bearer " + localAnonKey,
          },
          signal: controller.signal,
        }),
      ]);
      if (auth.ok && rest.ok) return;
      lastResult = "Auth " + auth.status + ", REST " + rest.status;
    } catch (error) {
      lastResult = error instanceof Error ? error.message : String(error);
    } finally {
      clearTimeout(timeout);
      controller.abort();
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    "Local Supabase Auth and REST did not become healthy within 30s (" +
      lastResult +
      ").",
  );
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await waitForLocalSupabase(process.env.VITE_SUPABASE_ANON_KEY);
}
