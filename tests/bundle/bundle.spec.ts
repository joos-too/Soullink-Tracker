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

for (const staySignedIn of [false, true]) {
  test(`production tracker creation and settings need no extra JavaScript (stay signed in: ${staySignedIn})`, async ({
    page,
  }) => {
    const errors: string[] = [];
    const requested: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("request", (request) => requested.push(request.url()));
    await page.addInitScript(() =>
      localStorage.setItem("soullink:language", "en"),
    );
    let imageConsent: boolean | null = null;
    const savedImageChoices: boolean[] = [];
    await page.route("https://raw.githubusercontent.com/**", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
          "base64",
        ),
      }),
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
      if (
        url.pathname.endsWith("/profiles") &&
        route.request().method() === "PATCH"
      ) {
        const patch = route.request().postDataJSON();
        if (typeof patch.allow_image_loading === "boolean") {
          imageConsent = patch.allow_image_loading;
          savedImageChoices.push(imageConsent);
        }
      }
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
            display_name_requires_update: !staySignedIn,
            allow_image_loading: imageConsent,
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
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.locator('input[type="email"]').fill(user.email);
    await page.locator('input[type="password"]').fill("test-password");
    const staySignedInCheckbox = page.getByRole("checkbox", {
      name: "Stay signed in",
    });
    await expect(staySignedInCheckbox).not.toBeChecked();
    if (staySignedIn) await staySignedInCheckbox.check();
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText(tracker.title, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Choose your display name" }),
    ).toHaveCount(0);
    expect(
      requested.some((url) =>
        url.startsWith("https://raw.githubusercontent.com/"),
      ),
    ).toBe(false);
    await page
      .getByRole("button", {
        name: staySignedIn
          ? "Allow external images"
          : "Continue without external images",
        exact: true,
      })
      .click();
    expect(savedImageChoices).toEqual([staySignedIn]);
    if (!staySignedIn) {
      const displayName = page.getByRole("dialog", {
        name: "Choose your display name",
      });
      await expect(displayName).toBeVisible();
      await displayName
        .getByRole("button", { name: "Later", exact: true })
        .click();
    }
    const authCookies = (await page.context().cookies()).filter((cookie) =>
      cookie.name.includes("-auth-token"),
    );
    expect(authCookies.length).toBeGreaterThan(0);
    expect(
      authCookies.every(
        (cookie) =>
          (staySignedIn
            ? cookie.expires > Date.now() / 1000
            : cookie.expires === -1) && cookie.sameSite === "Lax",
      ),
    ).toBe(true);
    expect(
      await page.evaluate(() =>
        Object.keys(localStorage).filter((key) => key.includes("-auth-token")),
      ),
    ).toEqual([]);
    expect(
      requested.some((url) =>
        /(?:pokemon|item|location)-data|CreateTrackerModal-/.test(url),
      ),
    ).toBe(false);
    const scriptsBeforeCreation = requested.filter((url) =>
      /\.js(?:\?|$)/.test(url),
    );
    await page
      .getByRole("button", { name: "New tracker", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(requested.filter((url) => /\.js(?:\?|$)/.test(url))).toEqual(
      scriptsBeforeCreation,
    );
    await page.goto(`/tracker/${trackerId}`);
    await expect(page.getByText(tracker.title, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Continue without external images",
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Privacy settings", exact: true }),
    ).toHaveCount(0);
    if (!staySignedIn) {
      await page
        .getByRole("button", { name: "Add Pokémon", exact: true })
        .first()
        .click();
      const edit = page.getByRole("dialog", {
        name: "Add Pokémon",
        exact: true,
      });
      const pokemon = edit.getByRole("textbox", { name: /Red - Pokémon/ });
      await pokemon.fill("Pikachu");
      const nickname = edit.getByPlaceholder("Nickname").first();
      await nickname.fill("Unsaved nickname");
      await edit
        .getByRole("button", { name: "Images blocked – open settings" })
        .first()
        .click();
      const consent = page.getByRole("dialog", {
        name: "External images from GitHub",
      });
      await expect(consent).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(consent).toHaveCount(0);
      await expect(pokemon).toHaveValue("Pikachu");
      await expect(nickname).toHaveValue("Unsaved nickname");
      await edit.getByRole("button", { name: "Back", exact: true }).click();
      const legendary = page
        .getByText("Legendary encounters", { exact: true })
        .locator("..");
      const countBefore = await legendary.textContent();
      await legendary
        .getByRole("button", { name: "Images blocked – open settings" })
        .click();
      await page.keyboard.press("Escape");
      expect(await legendary.textContent()).toBe(countBefore);
      expect(savedImageChoices).toEqual([false]);
    }
    if (staySignedIn) {
      await expect
        .poll(() =>
          requested.some((url) =>
            url.startsWith("https://raw.githubusercontent.com/"),
          ),
        )
        .toBe(true);
    } else {
      expect(
        requested.some((url) =>
          url.startsWith("https://raw.githubusercontent.com/"),
        ),
      ).toBe(false);
    }
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
    await page.goto("/account");
    const imageToggle = page.getByRole("checkbox", {
      name: "External images from GitHub",
      exact: true,
    });
    await expect(imageToggle).toBeVisible();
    if (staySignedIn) {
      await expect(imageToggle).toBeChecked();
      await page.locator('label[for="allow-image-loading"]').click();
      await expect.poll(() => savedImageChoices).toEqual([true, false]);
      await page.reload();
      await expect(
        page.getByRole("checkbox", {
          name: "External images from GitHub",
          exact: true,
        }),
      ).not.toBeChecked();
    } else {
      await expect(imageToggle).not.toBeChecked();
    }
    await page.getByRole("button", { name: "Logout", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    expect(
      (await page.context().cookies()).filter((cookie) =>
        cookie.name.includes("-auth-token"),
      ),
    ).toEqual([]);
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

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
  await expect(page.getByRole("dialog")).toHaveCount(0);
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
  await page
    .getByRole("button", {
      name: "Continue without external images",
      exact: true,
    })
    .click();
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
