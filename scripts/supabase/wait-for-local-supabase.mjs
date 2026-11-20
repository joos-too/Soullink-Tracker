import { pathToFileURL } from "node:url";

export const waitForLocalSupabase = async (localAnonKey) => {
  if (!localAnonKey) {
    throw new Error("Set VITE_SUPABASE_ANON_KEY for the local Supabase stack.");
  }

  const url = "http://127.0.0.1:54321";
  const deadline = Date.now() + 30_000;
  let lastResult = "no response";

  while (Date.now() < deadline) {
    try {
      const [auth, rest] = await Promise.all([
        fetch(url + "/auth/v1/health", { signal: AbortSignal.timeout(2_000) }),
        fetch(url + "/rest/v1/trackers?select=id&limit=1", {
          headers: {
            apikey: localAnonKey,
            Authorization: "Bearer " + localAnonKey,
          },
          signal: AbortSignal.timeout(2_000),
        }),
      ]);
      if (auth.ok && rest.ok) return;
      lastResult = "Auth " + auth.status + ", REST " + rest.status;
    } catch (error) {
      lastResult = error instanceof Error ? error.message : String(error);
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
