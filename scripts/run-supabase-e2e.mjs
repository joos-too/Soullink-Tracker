import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
const config = readFileSync(
  new URL("../supabase/config.toml", import.meta.url),
  "utf8",
);
const projectId = config.match(/^project_id\s*=\s*"([\w-]+)"/m)?.[1];
const localAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ??
  (() => {
    try {
      return readFileSync(new URL("../.env", import.meta.url), "utf8")
        .match(/^VITE_SUPABASE_ANON_KEY\s*=\s*(.+)$/m)?.[1]
        ?.trim()
        .replace(/^["']|["']$/g, "");
    } catch {
      return undefined;
    }
  })();

if (!projectId) {
  throw new Error("Could not read project_id from supabase/config.toml.");
}

if (!localAnonKey) {
  throw new Error(
    "Could not read VITE_SUPABASE_ANON_KEY from the environment.",
  );
}

const runProcess = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });

const runNpmScript = (script) =>
  runProcess(
    npmCommand,
    isWindows ? ["/d", "/s", "/c", `npm run ${script}`] : ["run", script],
  );

const fetchWithTimeout = (url, init) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timeout),
  );
};

const waitForLocalStack = async () => {
  const deadline = Date.now() + 30_000;
  let lastResult = "no response";
  while (Date.now() < deadline) {
    try {
      const [authResponse, restResponse] = await Promise.all([
        fetchWithTimeout("http://127.0.0.1:54321/auth/v1/health"),
        fetchWithTimeout(
          "http://127.0.0.1:54321/rest/v1/trackers?select=id&limit=1",
          {
            headers: {
              apikey: localAnonKey,
              Authorization: `Bearer ${localAnonKey}`,
            },
          },
        ),
      ]);
      if (authResponse.ok && restResponse.ok) return;
      lastResult = `Auth ${authResponse.status}, REST ${restResponse.status}`;
    } catch (error) {
      // The gateway, Auth, or REST API may still be restarting.
      lastResult = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `Local Supabase Auth and REST APIs did not become healthy within 30s (${lastResult}).`,
  );
};

const stabilizeLocalStack = async () => {
  // `supabase start` considers a partially running project started, so revive
  // PostgREST explicitly and refresh its database connection after each reset.
  const restStatus = await runProcess("docker", [
    "restart",
    `supabase_rest_${projectId}`,
  ]);
  if (restStatus !== 0) {
    throw new Error("Could not restart the local Supabase REST API.");
  }

  // Docker Desktop can leave Kong pointing at replaced upstream containers.
  // Restarting it refreshes the internal DNS entries.
  const gatewayStatus = await runProcess("docker", [
    "restart",
    `supabase_kong_${projectId}`,
  ]);
  if (gatewayStatus !== 0) {
    throw new Error("Could not restart the local Supabase API gateway.");
  }
  await waitForLocalStack();
};

console.log("Ensuring the complete local Supabase stack is running...");
const startStatus = await runNpmScript("supabase:start");
if (startStatus !== 0) process.exit(startStatus);

console.log("Resetting the local Supabase database before browser tests...");
const initialResetStatus = await runNpmScript("supabase:reset");
if (initialResetStatus !== 0) process.exit(initialResetStatus);
await stabilizeLocalStack();

const testStatus = await runNpmScript("test:e2e:run");

console.log("Restoring the local Supabase seed after browser tests...");
const cleanupResetStatus = await runNpmScript("supabase:reset");
if (cleanupResetStatus === 0) await stabilizeLocalStack();

process.exit(testStatus !== 0 ? testStatus : cleanupResetStatus);
