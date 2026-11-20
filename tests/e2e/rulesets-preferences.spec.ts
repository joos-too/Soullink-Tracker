import { expect } from "@playwright/test";
import {
  addPokemon,
  draftPokemon,
  saveState,
  signIn,
  test,
  unique,
  configureEnglish,
} from "./support";

test("creates, edits, and deletes a custom ruleset across reloads", async ({
  page,
}) => {
  const client = await signIn(page, "test@example.com");
  const name = unique("Browser rules");
  const edited = name + " edited";
  const nameField = page.getByPlaceholder("Name your ruleset");
  const ruleset = (title: string) =>
    page.getByRole("button", { name: new RegExp(title) });
  try {
    await page
      .getByRole("button", { name: "Edit rulesets", exact: true })
      .click();
    await page
      .getByRole("button", { name: "New ruleset", exact: true })
      .click();
    await nameField.fill(name);
    await page
      .getByPlaceholder("Rule 1", { exact: true })
      .fill("One encounter per route");
    await page
      .getByRole("button", { name: "Save ruleset", exact: true })
      .click();
    await expect(ruleset(name)).toBeVisible();

    await page.reload();
    await ruleset(name).click();
    await expect(page.getByPlaceholder("Rule 1", { exact: true })).toHaveValue(
      "One encounter per route",
    );
    await nameField.fill(edited);
    await page
      .getByRole("button", { name: "Save ruleset", exact: true })
      .click();
    await expect(ruleset(edited)).toBeVisible();

    await page.reload();
    await ruleset(edited).click();
    await expect(nameField).toHaveValue(edited);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await page
      .getByRole("dialog", { name: "Delete ruleset?" })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await expect(ruleset(edited)).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Ruleset Editor" }),
    ).toBeVisible();
    await expect(ruleset(edited)).toHaveCount(0);
    const { data, error } = await client
      .from("rulesets")
      .select("id")
      .in("name", [name, edited]);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  } finally {
    const { error } = await client
      .from("rulesets")
      .delete()
      .in("name", [name, edited]);
    expect(error, "Clean up browser test rulesets").toBeNull();
  }
});

test("persists account search and display preferences and tracker nickname settings", async ({
  page,
  browser,
  tracker,
}) => {
  const { data: profile, error } = await tracker.owner
    .from("profiles")
    .select(
      "id, display_name, display_name_requires_update, multi_locale_search",
    )
    .single();
  if (error)
    throw new Error(
      "Could not read the test account preferences: " + error.message,
    );
  const freshContext = await browser.newContext();
  try {
    const savedPreferences = async () => {
      const { data, error } = await tracker.owner
        .from("profiles")
        .select("display_name, multi_locale_search")
        .single();
      return error ?? data;
    };
    await page.goto("/account");
    const displayName = unique("Browser Trainer");
    await page.getByLabel("Display name", { exact: true }).fill(displayName);
    await page.getByRole("button", { name: "Save display name" }).click();
    const search = page.getByRole("checkbox", {
      name: "Multi-language search",
    });
    await expect(search).toHaveJSProperty(
      "checked",
      profile.multi_locale_search,
    );
    if (profile.multi_locale_search) await search.press("Space");
    await expect
      .poll(savedPreferences)
      .toEqual({ display_name: displayName, multi_locale_search: false });
    await search.press("Space");
    await expect
      .poll(savedPreferences)
      .toEqual({ display_name: displayName, multi_locale_search: true });

    const fresh = await freshContext.newPage();
    await configureEnglish(fresh);
    await signIn(fresh, "test@example.com");
    await fresh.goto("/account");
    await expect(fresh.getByLabel("Display name", { exact: true })).toHaveValue(
      displayName,
    );
    await expect(
      fresh.getByRole("checkbox", { name: "Multi-language search" }),
    ).toBeChecked();

    await fresh.goto(tracker.path);
    await fresh.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(fresh.getByText(displayName, { exact: true })).toBeVisible();
    await fresh.getByRole("button", { name: "Back", exact: true }).click();
    const submit = await draftPokemon(
      fresh,
      { query: "Taubsi", name: "Pidgey" },
      "Original Wing",
    );
    await saveState(fresh, () => submit.click());

    const pidgey = fresh.getByRole("row").filter({
      has: fresh.getByRole("link", { name: "Pidgey", exact: true }),
    });
    await pidgey.getByTitle("Edit", { exact: true }).click();
    const edit = fresh.getByRole("dialog", { name: "Edit Pokémon" });
    await edit.getByPlaceholder("Nickname").fill("Edited Wing");
    await saveState(fresh, () =>
      edit.getByRole("button", { name: "Save", exact: true }).click(),
    );
    await expect(
      pidgey.getByText("Edited Wing", { exact: true }),
    ).toBeVisible();

    await fresh.getByRole("button", { name: "Settings", exact: true }).click();
    await saveState(fresh, () =>
      fresh.getByRole("checkbox", { name: "Disable nicknames" }).press("Space"),
    );
    await fresh.goto(tracker.path);
    await expect(
      pidgey.getByRole("link", { name: "Pidgey", exact: true }),
    ).toBeVisible();
    await expect(pidgey.getByText("Edited Wing", { exact: true })).toHaveCount(
      0,
    );
    await addPokemon(fresh, "Rattata");
    await expect(
      fresh.getByRole("link", { name: "Rattata", exact: true }),
    ).toBeVisible();
  } finally {
    await freshContext.close();
    const { id, ...preferences } = profile;
    const { error } = await tracker.owner
      .from("profiles")
      .update(preferences)
      .eq("id", id);
    expect(error, "Restore browser test account preferences").toBeNull();
  }
});
