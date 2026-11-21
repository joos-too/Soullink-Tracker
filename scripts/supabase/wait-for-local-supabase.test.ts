import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("keeps Node alive to time out stalled health probes and retry", () => {
  // Run with no test-runner handles that could keep the event loop alive.
  const script = `
    import assert from "node:assert/strict";
    import { waitForLocalSupabase } from "./scripts/supabase/wait-for-local-supabase.mjs";

    let calls = 0;
    let aborted = 0;
    globalThis.fetch = (_url, { signal }) => {
      if (++calls > 2) return Promise.resolve({ ok: true });
      return new Promise((_, reject) => {
        signal.addEventListener("abort", () => {
          aborted++;
          reject(signal.reason);
        }, { once: true });
      });
    };

    await waitForLocalSupabase("test-key");
    assert.equal(aborted, 2);
    assert.equal(calls, 4);
  `;

  const result = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", script],
    {
      encoding: "utf8",
      timeout: 10_000,
    },
  );
  expect(result.error).toBeUndefined();
  expect(result.status, result.stderr).toBe(0);
});
