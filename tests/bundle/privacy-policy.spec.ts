import { expect, test } from "@playwright/test";

for (const language of ["de", "en"]) {
  test(`German privacy draft remains public with ${language} UI settings`, async ({
    page,
  }, testInfo) => {
    const externalImageRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().startsWith("https://raw.githubusercontent.com/"))
        externalImageRequests.push(request.url());
    });
    await page.addInitScript(
      (locale) => localStorage.setItem("soullink:language", locale),
      language,
    );
    await page.goto("/privacypolicy");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Datenschutzerklärung",
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole("article")).toHaveAttribute("lang", "de");
    await expect(
      page.getByRole("heading", {
        name: "Entwurf – Betriebsangaben noch zu bestätigen",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "3. Hosting und selbst gehostete Dienste",
        exact: true,
      }),
    ).toBeAttached();
    await expect(
      page
        .getByRole("region", {
          name: "3. Hosting und selbst gehostete Dienste",
          exact: true,
        })
        .getByText("Hetzner Online GmbH", { exact: false }),
    ).toBeAttached();
    await expect(
      page.getByRole("heading", { name: "13. Ihre Rechte", exact: true }),
    ).toBeAttached();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("contentinfo")).toHaveCount(0);
    expect(externalImageRequests).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (language === "de")
      await page.screenshot({
        path: testInfo.outputPath("privacy-draft-mobile.png"),
      });
  });
}
