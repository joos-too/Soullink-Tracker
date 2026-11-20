import { expect, type Page, type WebSocket } from "@playwright/test";
import {
  addPokemon,
  draftPokemon,
  onRpc,
  readState,
  signIn,
  test,
  teamAddButton,
  configureEnglish,
} from "./support";

async function openEditor(page: Page, path: string) {
  await configureEnglish(page);
  await signIn(page, "test@example.com");
  const topic = "realtime:tracker-state:" + path.split("/").at(-1);
  let subscribed = false;
  const watchSubscription = (socket: WebSocket) => {
    if (!new URL(socket.url()).pathname.startsWith("/realtime/")) return;
    socket.on("framereceived", ({ payload }) => {
      if (typeof payload !== "string") return;
      const frame = JSON.parse(payload);
      // Phoenix v2 encodes replies as [join_ref, ref, topic, event, payload].
      if (
        frame[2] === topic &&
        frame[3] === "phx_reply" &&
        frame[4]?.status === "ok"
      ) {
        subscribed = true;
      }
    });
  };
  page.on("websocket", watchSubscription);
  try {
    await page.goto(path);
    await expect(teamAddButton(page)).toBeVisible();
    await expect
      .poll(() => subscribed, {
        message: "Wait for tracker Realtime subscription",
      })
      .toBe(true);
  } finally {
    page.off("websocket", watchSubscription);
  }
}

test("applies a saved edit in a second browser context without a reload", async ({
  page,
  browser,
  tracker,
}) => {
  const context = await browser.newContext();
  try {
    const other = await context.newPage();
    await openEditor(other, tracker.path);
    await addPokemon(page, "Pidgey", "Wing");
    await expect(other.getByText("Wing", { exact: true })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("rejects a deterministically stale save and reloads the winning revision", async ({
  page,
  browser,
  tracker,
}) => {
  const context = await browser.newContext();
  try {
    const other = await context.newPage();
    await openEditor(other, tracker.path);
    const original = await readState(tracker.owner, tracker.id);
    const submit = await draftPokemon(page, "Pidgey", "Stale Wing");
    let release!: () => void;
    const hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      "**/rest/v1/rpc/update_tracker_state",
      async (route) => {
        await hold;
        await route.continue();
      },
      { times: 1 },
    );
    try {
      const [outgoing] = await Promise.all([
        page.waitForRequest(
          (request) =>
            new URL(request.url()).pathname ===
              "/rest/v1/rpc/update_tracker_state" &&
            request.method() === "POST",
        ),
        submit.click(),
      ]);
      expect(outgoing.postDataJSON()).toMatchObject({
        p_expected_revision: original.revision,
      });
      await addPokemon(other, "Rattata", "Winning Tail");
      const winning = await readState(tracker.owner, tracker.id);
      expect(winning.revision).toBe(original.revision + 1);
      const [rejected] = await Promise.all([
        page.waitForResponse((response) =>
          onRpc(response, "update_tracker_state"),
        ),
        Promise.resolve().then(release),
      ]);
      expect(rejected.status()).toBe(409);
      await expect(rejected.json()).resolves.toMatchObject({ code: "PT409" });
      await expect(
        page
          .getByRole("status")
          .filter({ hasText: "Tracker updated elsewhere" }),
      ).toBeVisible();
      expect(await readState(tracker.owner, tracker.id)).toEqual(winning);

      await page.getByRole("button", { name: "Reload tracker" }).click();
      await expect(
        page.getByText("Winning Tail", { exact: true }),
      ).toBeVisible();
      await expect(page.getByText("Stale Wing", { exact: true })).toHaveCount(
        0,
      );
      await expect(
        other.getByText("Winning Tail", { exact: true }),
      ).toBeVisible();
    } finally {
      release();
    }
  } finally {
    await context.close();
  }
});
