import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/bundle",
  timeout: 30_000,
  workers: 1,
  globalSetup: "./tests/bundle/start-preview.ts",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:4182",
    serviceWorkers: "block",
    trace: "retain-on-failure",
  },
});
