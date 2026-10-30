import { expect, test } from "@playwright/test";

test.use({ serviceWorkers: "allow" });

test("anonymous image consent gates requests and clears the service-worker cache on withdrawal", async ({
  page,
  context,
}) => {
  const trackerId = "30000000-0000-0000-0000-000000000001";
  let externalRequests = 0;
  await context.route("https://raw.githubusercontent.com/**", async (route) => {
    externalRequests += 1;
    await route.fulfill({
      contentType: "image/png",
      body: Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
        "base64",
      ),
    });
  });
  await page.addInitScript(() =>
    localStorage.setItem("soullink:language", "en"),
  );
  await page.route("**/rest/v1/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const body = pathname.endsWith("/trackers")
      ? {
          id: trackerId,
          title: "Consent tracker",
          player_names: ["Red", "Blue"],
          game_version_id: "gen1_rb",
          created_by: "10000000-0000-0000-0000-000000000001",
          created_at: "2026-01-01T00:00:00Z",
          is_public: true,
          all_pokemon_and_items: false,
          ruleset_id: null,
        }
      : pathname.endsWith("/tracker_states")
        ? {
            tracker_id: trackerId,
            revision: 1,
            schema_version: 2,
            updated_at: "2026-01-01T00:00:00Z",
            state: {
              team: [
                {
                  id: "40000000-0000-4000-8000-000000000001",
                  locationSlug: null,
                  members: [
                    { id: 25, nickname: "Pikachu" },
                    { id: 1, nickname: "Bulbasaur" },
                  ],
                },
              ],
            },
          }
        : [];
    await route.fulfill({ json: body });
  });
  await page.goto(`/tracker/${trackerId}`);
  await expect(
    page.getByText("Consent tracker", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Continue without external images",
      exact: true,
    }),
  ).toBeVisible();
  expect(externalRequests).toBe(0);
  const consent = page.getByRole("dialog", {
    name: "External images from GitHub",
  });
  await expect(
    consent.getByRole("button", { name: "Close", exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(consent).toBeVisible();
  expect(
    await page
      .locator('img[src^="https://raw.githubusercontent.com/"]')
      .count(),
  ).toBe(0);

  await page
    .getByRole("button", {
      name: "Continue without external images",
      exact: true,
    })
    .click();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("soullink:allowImageLoading"),
    ),
  ).toBe("false");
  await page.reload();
  await expect(
    page.getByText("Consent tracker", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Allow external images", exact: true }),
  ).toHaveCount(0);
  // Opening from a result inside another dialog preserves its query and does not select it.
  await page.keyboard.press("Control+f");
  const search = page.getByRole("dialog");
  const query = search.getByRole("textbox");
  await query.fill("Pikachu");
  const blocked = search
    .getByRole("button", { name: "Images blocked – open settings" })
    .first();
  await blocked.focus();
  await blocked.press("Enter");
  await expect(consent).toBeVisible();
  expect(externalRequests).toBe(0);
  await page.keyboard.press("Escape");
  await expect(consent).toHaveCount(0);
  await expect(query).toHaveValue("Pikachu");
  await expect(blocked).toBeFocused();
  await search.getByRole("button", { name: "Close", exact: true }).click();
  const legendary = page
    .getByText("Legendary encounters", { exact: true })
    .locator("..");
  await legendary
    .getByRole("button", { name: "Images blocked – open settings" })
    .click();
  await expect(consent).toBeVisible();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 320, height: 568 });
  await page
    .getByRole("contentinfo")
    .getByRole("navigation")
    .getByRole("button", { name: "Privacy settings", exact: true })
    .click();
  expect(externalRequests).toBe(0);
  const bounds = await consent.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  await expect(
    consent.getByRole("button", { name: "Allow external images", exact: true }),
  ).toHaveClass(/bg-green-600/);
  const allowBounds = await consent
    .getByRole("button", { name: "Allow external images", exact: true })
    .boundingBox();
  const declineBounds = await consent
    .getByRole("button", {
      name: "Continue without external images",
      exact: true,
    })
    .boundingBox();
  expect(allowBounds!.y).toBe(declineBounds!.y);
  expect(allowBounds!.x).toBeGreaterThan(declineBounds!.x);
  await page.screenshot({ path: "test-results/image-consent-mobile.png" });
  await page
    .getByRole("button", { name: "Allow external images", exact: true })
    .click();
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("soullink:allowImageLoading"),
    ),
  ).toBe("true");
  await expect.poll(() => externalRequests).toBeGreaterThan(0);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const src = await page
    .locator('img[src^="https://raw.githubusercontent.com/"]')
    .first()
    .getAttribute("src");
  await page.evaluate(async (url) => {
    await fetch(url!, { mode: "no-cors" });
  }, src);
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = await caches.open("pokeapi-js-wrapper-images-1");
        return (await cache.keys()).length;
      }),
    )
    .toBeGreaterThan(0);

  await page
    .getByRole("contentinfo")
    .getByRole("navigation")
    .getByRole("button", { name: "Privacy settings", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Continue without external images",
      exact: true,
    })
    .click();
  await expect(
    page.locator('img[src^="https://raw.githubusercontent.com/"]'),
  ).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => caches.keys()))
    .not.toContain("pokeapi-js-wrapper-images-1");
  const countAfterWithdrawal = externalRequests;
  const status = await page.evaluate(
    async (url) => (await fetch(url!, { mode: "no-cors" })).status,
    src,
  );
  expect(status).toBe(403);
  expect(externalRequests).toBe(countAfterWithdrawal);
  await page.reload();
  await expect(
    page.getByText("Consent tracker", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Allow external images", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("soullink:allowImageLoading"),
    ),
  ).toBe("false");
  expect(externalRequests).toBe(countAfterWithdrawal);
});
