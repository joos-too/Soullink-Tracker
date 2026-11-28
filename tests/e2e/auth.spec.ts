import { randomUUID } from "node:crypto";
import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { PASSWORD, signIn, test, configureEnglish } from "./support";

const inbox = "http://127.0.0.1:54324/api/v1";

async function readMail(
  request: APIRequestContext,
  email: string,
  kind: "signup" | "recovery" | "email_change",
) {
  const seen = new Map<string, string>();
  let matchingHtml = "";
  await expect
    .poll(
      async () => {
        const response = await request.get(inbox + "/search", {
          params: { query: "to:" + email },
        });
        if (!response.ok()) return false;
        const { messages } = (await response.json()) as {
          messages: { ID: string }[];
        };
        for (const { ID } of messages) {
          if (!seen.has(ID)) {
            const message = await request.get(inbox + "/message/" + ID);
            if (!message.ok()) continue;
            const { HTML } = (await message.json()) as { HTML: string };
            seen.set(ID, HTML);
          }
          const html = seen.get(ID) ?? "";
          if (html.includes("type=" + kind)) {
            matchingHtml = html;
            return true;
          }
        }
        return false;
      },
      { message: "Wait for local " + kind + " email" },
    )
    .toBe(true);
  return matchingHtml;
}

const logout = async (page: Page) => {
  await page.goto("/account");
  await page.getByRole("button", { name: "Logout", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
};

test("confirms signup, personalizes, recovers the account, and changes the sign-in email", async ({
  page,
  request,
  browser,
}) => {
  const email = "auth-" + randomUUID() + "@example.com";
  const newPassword = "testpassword456";
  await page.goto("/");
  await page.getByText("Register here", { exact: true }).click();
  await page.getByLabel("Display name", { exact: true }).fill("New Trainer");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Register", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Check your email" }),
  ).toBeVisible();

  const signup = await readMail(request, email, "signup");
  const code = signup.match(/>\s*(\d{6})\s*</)?.[1];
  if (!code)
    throw new Error("Confirmation email did not contain a six-digit code.");
  await page.getByLabel("Confirmation code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page).toHaveURL("/personalize");
  await expect(
    page.getByRole("heading", { name: "Personalize your experience" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue to the tracker" }).click();
  await page
    .getByRole("button", { name: "Continue without external images" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your trackers" }),
  ).toBeVisible();

  await logout(page);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Forgot your password?" }).click();
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send reset email" }).click();
  await expect(page.getByText("Email sent", { exact: true })).toBeVisible();

  const recovery = await readMail(request, email, "recovery");
  const href = recovery.match(/href="([^"]*type=recovery[^"]*)"/)?.[1];
  if (!href) throw new Error("Recovery email did not contain a reset link.");
  const resetUrl = new URL(href.replaceAll("&amp;", "&"));
  expect(resetUrl.origin).toBe("http://127.0.0.1:54321");
  await page.goto(resetUrl.href);
  await page.getByLabel("New password", { exact: true }).fill(newPassword);
  await page.getByLabel("Confirm password", { exact: true }).fill(newPassword);
  await page.getByRole("button", { name: "Set password", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Password updated!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to login" }).click();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await signIn(page, email, newPassword);

  const freshContext = await browser.newContext();
  try {
    const fresh = await freshContext.newPage();
    await configureEnglish(fresh);
    await fresh.goto(resetUrl.href);
    await expect(
      fresh.getByText("Link invalid", { exact: true }),
    ).toBeVisible();
    await expect(fresh.getByLabel("New password", { exact: true })).toHaveCount(
      0,
    );
  } finally {
    await freshContext.close();
  }

  const newEmail = "changed-" + randomUUID() + "@example.com";
  await page.goto("/account");
  const currentEmailInput = page.getByLabel("Email", { exact: true });
  await expect(currentEmailInput).toBeDisabled();
  await page.getByRole("button", { name: "Edit email" }).click();
  const sendConfirmation = page.getByRole("button", {
    name: "Send confirmation link",
  });
  await currentEmailInput.fill(newEmail);
  await sendConfirmation.click();
  await expect(page.getByRole("status")).toHaveText(
    `We sent a confirmation link to ${newEmail}.`,
  );
  await expect(currentEmailInput).toHaveValue(email);

  const emailChange = await readMail(request, newEmail, "email_change");
  const changeHref = emailChange.match(
    /href="([^"]*type=email_change[^"]*)"/,
  )?.[1];
  if (!changeHref) throw new Error("Email change link was missing.");
  await page.goto(changeHref.replaceAll("&amp;", "&"));
  await expect(currentEmailInput).toHaveValue(newEmail);
  await expect(page).toHaveURL(
    (url) => url.pathname === "/account" && !url.hash,
  );
  await expect(page.getByLabel("Display name", { exact: true })).toHaveValue(
    "New Trainer",
  );

  await logout(page);
  await signIn(page, newEmail, newPassword);
});
