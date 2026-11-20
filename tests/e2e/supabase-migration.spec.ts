import { expect } from "@playwright/test";
import { signIn, test, trackerCard } from "./support";

const PUBLIC_TRACKER_ID = "30000000-0000-0000-0000-000000000001";
const PUBLIC_TRACKER_TITLE = "Pokémon Blue Soullink";

test("restores an owner session after reloading the page", async ({ page }) => {
  await signIn(page, "test@example.com");
  const card = trackerCard(page, PUBLIC_TRACKER_TITLE);
  await expect(card).toBeVisible();
  await page.reload();
  await expect(card).toBeVisible();
  await card.click();
  await expect(
    page.getByRole("heading", { name: PUBLIC_TRACKER_TITLE, exact: true }),
  ).toBeVisible();
});

test("keeps guest tracker access read-only", async ({ page }) => {
  await signIn(page, "guest@example.com");
  await page.goto(`/tracker/${PUBLIC_TRACKER_ID}`);
  await expect(page.getByText(/You were invited as a guest/)).toBeVisible();
  await expect(page.getByTitle("Move to box")).toHaveCount(0);
});

test("allows anonymous read-only access to a public tracker", async ({
  page,
}) => {
  await page.goto(`/tracker/${PUBLIC_TRACKER_ID}`);
  await expect(
    page.getByText(/Public tracker: editing is disabled/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: PUBLIC_TRACKER_TITLE, exact: true }),
  ).toBeVisible();
  await expect(page.getByTitle("Move to box")).toHaveCount(0);
});
