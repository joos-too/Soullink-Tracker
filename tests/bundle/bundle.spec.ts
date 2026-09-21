import { expect, test } from "@playwright/test";

const trackerId = "30000000-0000-0000-0000-000000000001";
const ownerId = "10000000-0000-0000-0000-000000000001";
const tracker = {
  id: trackerId,
  title: "Bundle smoke tracker",
  player_names: ["Red", "Blue"],
  game_version_id: "gen1_rb",
  created_by: ownerId,
  created_at: "2026-01-01T00:00:00Z",
  is_public: true,
  all_pokemon_and_items: false,
  ruleset_id: null,
};

test("production tracker creation and settings need no extra JavaScript", async ({
  page,
}) => {
  const errors: string[] = [];
  const requested: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requested.push(request.url()));
  await page.addInitScript(() =>
    localStorage.setItem("soullink:language", "en"),
  );
  const user = {
    id: ownerId,
    email: "bundle@example.com",
    aud: "authenticated",
    role: "authenticated",
    user_metadata: { language: "en" },
    app_metadata: { provider: "email" },
  };
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: ownerId, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.test-signature`;
  await page.route("**/auth/v1/**", (route) =>
    route.fulfill({
      json: {
        access_token: token,
        token_type: "bearer",
        refresh_token: "test-refresh",
        expires_in: 3600,
        user,
      },
    }),
  );
  await page.route("**/rest/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const membership = {
      tracker_id: trackerId,
      user_id: ownerId,
      role: "owner",
      added_at: tracker.created_at,
      settings: {},
    };
    const body = url.pathname.endsWith("/profiles")
      ? {
          id: ownerId,
          display_name: "Bundle Tester",
          display_name_requires_update: false,
        }
      : url.pathname.endsWith("/trackers")
        ? tracker
        : url.pathname.endsWith("/tracker_states")
          ? {
              tracker_id: trackerId,
              state: { runStartedAt: 1 },
              revision: 1,
              schema_version: 2,
              updated_at: tracker.created_at,
            }
          : url.pathname.endsWith("/tracker_members")
            ? [
                {
                  ...membership,
                  trackers: { ...tracker, tracker_states: { summary: {} } },
                },
              ]
            : url.pathname.endsWith("/list_tracker_members")
              ? [
                  {
                    ...membership,
                    display_name: "Bundle Tester",
                    email: user.email,
                  },
                ]
              : [];
    await route.fulfill({ json: body });
  });
  await page.goto("/");
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText(tracker.title, { exact: true })).toBeVisible();
  expect(
    requested.some((url) =>
      /(?:pokemon|item|location)-data|CreateTrackerModal-/.test(url),
    ),
  ).toBe(false);
  const scriptsBeforeCreation = requested.filter((url) =>
    /\.js(?:\?|$)/.test(url),
  );
  await page.getByRole("button", { name: "New tracker", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(requested.filter((url) => /\.js(?:\?|$)/.test(url))).toEqual(
    scriptsBeforeCreation,
  );
  await page.goto(`/tracker/${trackerId}`);
  await expect(page.getByText(tracker.title, { exact: true })).toBeVisible();
  const scriptsBeforeSettings = requested.filter((url) =>
    /\.js(?:\?|$)/.test(url),
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: "Public tracker" }),
  ).toBeVisible();
  expect(requested.filter((url) => /\.js(?:\?|$)/.test(url))).toEqual(
    scriptsBeforeSettings,
  );
  expect(errors).toEqual([]);
});

test("production login includes registration but defers tracker datasets", async ({
  page,
}) => {
  const errors: string[] = [];
  const requested: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requested.push(request.url()));
  await page.addInitScript(() =>
    localStorage.setItem("soullink:language", "en"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  expect(
    requested.some((url) =>
      /(?:pokemon|item|location)-data|RegisterPage|TrackerRoute/.test(url),
    ),
  ).toBe(false);
  const scriptsBeforeRegistration = requested.filter((url) =>
    /\.js(?:\?|$)/.test(url),
  );
  await page.getByRole("button", { name: "Register here" }).click();
  await expect(page.locator('input[type="password"]')).toHaveCount(2);
  expect(requested.filter((url) => /\.js(?:\?|$)/.test(url))).toEqual(
    scriptsBeforeRegistration,
  );
  expect(errors).toEqual([]);
});

test("production tracker includes search without another JavaScript download", async ({
  page,
}) => {
  const errors: string[] = [];
  const requested: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requested.push(request.url()));
  await page.addInitScript(() =>
    localStorage.setItem("soullink:language", "en"),
  );
  // Stub the backend only; all UI and chunks are the actual production build.
  await page.route("**/rest/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const body = pathname.endsWith("/trackers")
      ? tracker
      : pathname.endsWith("/tracker_states")
        ? {
            tracker_id: trackerId,
            state: {},
            revision: 1,
            schema_version: 2,
            updated_at: "2026-01-01T00:00:00Z",
          }
        : [];
    await route.fulfill({ json: body });
  });
  await page.goto(`/tracker/${trackerId}`);
  await expect(page.getByText(tracker.title, { exact: true })).toBeVisible();
  for (const name of ["pokemon-data", "item-data", "location-data"]) {
    expect(requested.some((url) => url.includes(name))).toBe(true);
  }
  expect(
    requested.some((url) => /TrackerSearchModal-|SettingsPage-/.test(url)),
  ).toBe(false);
  const scriptsBeforeSearch = requested.filter((url) =>
    /\.js(?:\?|$)/.test(url),
  );
  await page.keyboard.press("Control+f");
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(requested.filter((url) => /\.js(?:\?|$)/.test(url))).toEqual(
    scriptsBeforeSearch,
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await expect(page.getByText(tracker.title, { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
