import {
  expect,
  type Locator,
  type Page,
  type Response,
  test,
} from "@playwright/test";

const PASSWORD = "testpassword123";
const PUBLIC_TRACKER_ID = "30000000-0000-0000-0000-000000000001";
const PUBLIC_TRACKER_TITLE = "Pokémon Blue Soullink";

const signIn = async (page: Page, email: string) => {
  await page.goto("/");
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByText(PUBLIC_TRACKER_TITLE, { exact: true }),
  ).toBeVisible();
};

const waitForStateSave = (page: Page): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      page.off("response", handleResponse);
      reject(new Error("Timed out waiting for the tracker state save."));
    }, 15_000);

    const handleResponse = (response: Response) => {
      if (
        !response.url().includes("/rest/v1/rpc/update_tracker_state") ||
        response.request().method() !== "POST"
      ) {
        return;
      }

      clearTimeout(timeout);
      page.off("response", handleResponse);
      if (response.ok()) {
        resolve();
      } else {
        reject(
          new Error(`Tracker state save returned HTTP ${response.status()}.`),
        );
      }
    };

    page.on("response", handleResponse);
  });

const clickAndWaitForStateSave = async (page: Page, button: Locator) => {
  const saveCompleted = waitForStateSave(page);
  await Promise.all([saveCompleted, button.click()]);
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("soullink:language", "en");
  });
});

test("restores an owner session and persists a revision-aware state update", async ({
  page,
}) => {
  await signIn(page, "test@example.com");

  await page.reload();
  await expect(
    page.getByText(PUBLIC_TRACKER_TITLE, { exact: true }),
  ).toBeVisible();

  await page.goto(`/tracker/${PUBLIC_TRACKER_ID}`);
  const pidgeyRow = page
    .getByRole("row")
    .filter({ has: page.getByRole("link", { name: "Pidgey", exact: true }) });
  const moveToBox = pidgeyRow.getByTitle("Move to box");
  const moveToTeam = pidgeyRow.getByTitle("Move to team");

  // A failed attempt may have persisted the move before Playwright retries the
  // test. Normalize the seed state so every attempt starts from the team.
  if (await moveToTeam.isVisible()) {
    await clickAndWaitForStateSave(page, moveToTeam);
    await expect(moveToBox).toBeVisible();
  }
  await expect(moveToBox).toBeVisible();

  try {
    await clickAndWaitForStateSave(page, moveToBox);
    await expect(moveToTeam).toBeVisible();

    await page.reload();
    await expect(moveToTeam).toBeVisible();
  } finally {
    if (
      await moveToTeam
        .waitFor({ state: "visible", timeout: 5_000 })
        .then(() => true)
        .catch(() => false)
    ) {
      await clickAndWaitForStateSave(page, moveToTeam);
      await expect(moveToBox).toBeVisible();
    }
  }
});

test("keeps guest tracker access read-only", async ({ page }) => {
  await signIn(page, "guest@example.com");
  await page.goto(`/tracker/${PUBLIC_TRACKER_ID}`);

  await expect(
    page.getByText(
      "You were invited as a guest. You can view everything, but changes are disabled.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByTitle("Move to box")).toHaveCount(0);
});

test("allows anonymous read-only access to a public tracker", async ({
  page,
}) => {
  await page.goto(`/tracker/${PUBLIC_TRACKER_ID}`);

  await expect(
    page.getByText(
      "Public tracker: editing is disabled unless you log in and are a member. This view is read-only.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByText(PUBLIC_TRACKER_TITLE, { exact: true }),
  ).toBeVisible();
  await expect(page.getByTitle("Move to box")).toHaveCount(0);
});
