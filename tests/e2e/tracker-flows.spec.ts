import { expect, type Page } from "@playwright/test";
import {
  addPokemon,
  onRpc,
  readState,
  saveState,
  signIn,
  teamAddButton,
  test,
  trackerCard,
  configureEnglish,
} from "./support";

const openSettings = async (
  page: Page,
  tracker: { title: string; path: string },
) => {
  const toolbar = page.locator("header").filter({
    has: page.getByRole("heading", {
      level: 1,
      name: tracker.title,
      exact: true,
    }),
  });
  await toolbar
    .getByRole("button", { name: "Settings", exact: true })
    .press("Enter");
  await expect(page).toHaveURL(tracker.path + "?panel=settings");
};

const overview = (page: Page) =>
  page.getByRole("button", { name: "Back to overview", exact: true }).click();

const invite = async (page: Page, email: string, role: "editor" | "guest") => {
  const field = page.getByPlaceholder("trainer@example.com");
  const form = page.locator("form").filter({ has: field });
  await field.fill(email);
  await form.getByRole("combobox").selectOption(role);
  const [response] = await Promise.all([
    page.waitForResponse((result) => onRpc(result, "invite_tracker_member")),
    form.getByRole("button", { name: "Add", exact: true }).click(),
  ]);
  expect(response.status()).toBe(200);
  await expect(page.getByText(email, { exact: true })).toBeVisible();
};

test("creates, opens, edits, resets, and deletes a tracker and refreshes the list summary", async ({
  page,
  tracker,
}) => {
  await overview(page);
  const card = trackerCard(page, tracker.title);
  await expect(card.getByText("Run 1", { exact: true })).toBeVisible();
  await card.click();
  await addPokemon(page, "Pidgey", "Wing");
  await page.reload();
  await expect(page.getByText("Wing", { exact: true })).toBeVisible();

  await overview(page);
  await expect(
    card
      .getByText("Active", { exact: true })
      .locator("..")
      .getByText("1", { exact: true }),
  ).toBeVisible();
  await card.click();
  await page.getByRole("button", { name: "Reset run", exact: true }).click();
  await saveState(page, () =>
    page.getByRole("dialog").getByRole("button", { name: "Reset run" }).click(),
  );
  await expect(page.getByText("Wing", { exact: true })).toHaveCount(0);

  await overview(page);
  await expect(card.getByText("Run 2", { exact: true })).toBeVisible();
  await card.click();
  await openSettings(page, tracker);
  await page.getByTitle("Delete tracker", { exact: true }).click();
  await page
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  await expect(page).toHaveURL("/");
  await expect(card).toHaveCount(0);
  const { data, error } = await tracker.owner
    .from("trackers")
    .select("id")
    .eq("id", tracker.id)
    .maybeSingle();
  expect(error).toBeNull();
  expect(data).toBeNull();
});

test("enforces invited roles, removal, and anonymous visibility", async ({
  page,
  browser,
  tracker,
}) => {
  const memberContext = await browser.newContext();
  const anonymousContext = await browser.newContext();
  try {
    await openSettings(page, tracker);
    await invite(page, "editor@example.com", "editor");
    await invite(page, "guest@example.com", "guest");

    const member = await memberContext.newPage();
    await configureEnglish(member);
    const editor = await signIn(member, "editor@example.com");
    await trackerCard(member, tracker.title).click();
    await addPokemon(member, "Pidgey", "Wing");
    const { error: visibilityError } = await editor.rpc(
      "set_tracker_visibility",
      {
        p_tracker_id: tracker.id,
        p_is_public: true,
      },
    );
    expect(visibilityError).toMatchObject({
      code: "42501",
      message: "tracker_owner_required",
    });

    const editorRow = page
      .getByRole("listitem")
      .filter({ hasText: "editor@example.com" });
    await editorRow.getByRole("button", { name: /^Remove / }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    await expect(editorRow).toHaveCount(0);
    await member.reload();
    await expect(
      member.getByText("Tracker not found.", { exact: true }),
    ).toBeVisible();

    await invite(page, "editor@example.com", "guest");
    await member.reload();
    await expect(member.getByText(/You were invited as a guest/)).toBeVisible();
    await expect(teamAddButton(member)).toHaveCount(0);
    const { state, revision } = await readState(editor, tracker.id);
    const { error: guestWriteError } = await editor.rpc(
      "update_tracker_state",
      {
        p_tracker_id: tracker.id,
        p_expected_revision: revision,
        p_state: state,
      },
    );
    expect(guestWriteError).toMatchObject({ code: "42501" });

    const anonymous = await anonymousContext.newPage();
    await configureEnglish(anonymous);
    await anonymous.goto(tracker.path);
    await expect(anonymous).toHaveURL("/");
    await expect(
      anonymous.getByRole("button", { name: "Sign in", exact: true }),
    ).toBeVisible();
    const visibility = page.getByRole("checkbox", {
      name: "Public tracker",
      exact: true,
    });
    for (const isPublic of [true, false]) {
      const [response] = await Promise.all([
        page.waitForResponse((result) =>
          onRpc(result, "set_tracker_visibility"),
        ),
        visibility.press("Space"),
      ]);
      expect(response.status()).toBe(200);
      await expect(visibility).toHaveJSProperty("checked", isPublic);
      await anonymous.goto(tracker.path);
      if (isPublic) {
        await expect(
          anonymous.getByText(/Public tracker: editing is disabled/),
        ).toBeVisible();
      } else {
        await expect(anonymous).toHaveURL("/");
        await expect(
          anonymous.getByRole("button", { name: "Sign in", exact: true }),
        ).toBeVisible();
      }
    }
  } finally {
    await Promise.all([memberContext.close(), anonymousContext.close()]);
  }
});
