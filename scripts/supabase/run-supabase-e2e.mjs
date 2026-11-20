import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { waitForLocalSupabase } from "./wait-for-local-supabase.mjs";

const isWindows = process.platform === "win32";
const npmCommand = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npm";
const config = readFileSync(
  new URL("../../supabase/config.toml", import.meta.url),
  "utf8",
);
const projectId = config.match(/^project_id\s*=\s*"([\w-]+)"/m)?.[1];
const localAnonKey =
  process.env.VITE_SUPABASE_ANON_KEY ??
  (() => {
    try {
      return readFileSync(new URL("../../.env", import.meta.url), "utf8")
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
  await waitForLocalSupabase(localAnonKey);
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
