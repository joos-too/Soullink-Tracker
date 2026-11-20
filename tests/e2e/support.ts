import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  expect,
  test as base,
  type Page,
  type Response,
} from "@playwright/test";
import { loadEnv } from "vite";
import type { Database } from "@/src/types/database.ts";

export const PASSWORD = "testpassword123";
const supabaseUrl = "http://127.0.0.1:54321";

const localClient = (accessToken: string) => {
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY ??
    loadEnv("development", process.cwd(), "VITE_").VITE_SUPABASE_ANON_KEY;
  if (!anonKey)
    throw new Error("Set VITE_SUPABASE_ANON_KEY for local E2E tests.");
  return createClient<Database>(supabaseUrl, anonKey, {
    accessToken: async () => accessToken,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
};

export type LocalClient = SupabaseClient<Database>;
export const unique = (prefix: string) =>
  prefix + " " + randomUUID().slice(0, 8);

export const configureEnglish = (page: Page) =>
  page.addInitScript(() => {
    localStorage.setItem("soullink:language", "en");
    sessionStorage.setItem("soullink:allowImageLoading", "false");
  });

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const response = page.waitForResponse(
    (result) =>
      result.url().includes("/auth/v1/token?grant_type=password") &&
      result.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(200);
  const { access_token, user } = (await result.json()) as {
    access_token: string;
    user: { id: string };
  };
  const client = localClient(access_token);
  await expect(
    page.getByRole("heading", { name: "Your trackers" }),
  ).toBeVisible();
  const { data, error } = await client
    .from("profiles")
    .select("allow_image_loading")
    .eq("id", user.id)
    .single();
  if (error)
    throw new Error("Could not load browser test profile: " + error.message);
  if (data.allow_image_loading === null) {
    await page
      .getByRole("button", { name: "Continue without external images" })
      .click();
    await expect(
      page.getByRole("dialog", { name: "External images from GitHub" }),
    ).toHaveCount(0);
  }
  return client;
}

export const onRpc = (response: Response, name: string) =>
  new URL(response.url()).pathname === "/rest/v1/rpc/" + name &&
  response.request().method() === "POST";

export async function saveState(page: Page, change: () => Promise<void>) {
  const [response] = await Promise.all([
    page.waitForResponse((result) => onRpc(result, "update_tracker_state")),
    change(),
  ]);
  expect(response.status()).toBe(200);
}

export async function readState(client: LocalClient, trackerId: string) {
  const { data, error } = await client
    .from("tracker_states")
    .select("state, revision")
    .eq("tracker_id", trackerId)
    .single();
  if (error) throw new Error("Could not read tracker state: " + error.message);
  return data;
}

export function trackerCard(page: Page, title: string) {
  return page.getByRole("button").filter({
    has: page.getByRole("heading", { name: title, exact: true }),
  });
}

async function createTracker(page: Page, title: string) {
  await page.getByRole("button", { name: "New tracker", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Create your tracker" });
  await dialog.getByRole("button", { name: "Select game version" }).click();
  await dialog
    .getByRole("button", { name: "Pokémon Red / Blue", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Solo", exact: true }).click();
  await dialog.getByLabel("Title", { exact: true }).fill(title);
  await dialog.getByPlaceholder("Name", { exact: true }).fill("Red");
  await dialog
    .getByRole("button", { name: "Create tracker", exact: true })
    .click();
  await trackerCard(page, title).click();
  await expect(page).toHaveURL(/\/tracker\/[\da-f-]{36}$/);
  await expect(
    page.getByRole("heading", { name: title, exact: true }),
  ).toBeVisible();
  return new URL(page.url()).pathname.slice("/tracker/".length);
}

export async function draftPokemon(
  page: Page,
  pokemon: string | { query: string; name: string },
  nickname?: string,
) {
  await teamAddButton(page).click();
  const dialog = page.getByRole("dialog", { name: "Add Pokémon" });
  await dialog.getByRole("textbox", { name: /Area/ }).fill("Route 1");
  const { query, name } =
    typeof pokemon === "string" ? { query: pokemon, name: pokemon } : pokemon;
  await dialog.getByRole("textbox", { name: /Pokémon/ }).fill(query);
  await dialog.getByRole("option").getByText(name, { exact: true }).click();
  if (nickname) {
    await dialog.getByPlaceholder("Nickname").fill(nickname);
  } else {
    await expect(dialog.getByPlaceholder("Nickname")).toHaveCount(0);
  }
  return dialog.getByRole("button", { name: "Add", exact: true });
}

export const teamAddButton = (page: Page) =>
  page
    .getByRole("heading", { name: "Team", exact: true })
    .locator("..")
    .getByRole("button", { name: "Add Pokémon", exact: true });

export async function addPokemon(
  page: Page,
  pokemon: string,
  nickname?: string,
) {
  const submit = await draftPokemon(page, pokemon, nickname);
  await saveState(page, () => submit.click());
}

async function deleteTestTracker(client: LocalClient, title: string) {
  const { data, error } = await client
    .from("trackers")
    .select("id")
    .eq("title", title);
  if (error)
    throw new Error(
      "Could not find the browser test tracker: " + error.message,
    );
  for (const { id } of data) {
    const { error: deleteError } = await client.rpc("delete_tracker", {
      p_tracker_id: id,
    });
    expect(deleteError, "Clean up the browser test tracker").toBeNull();
  }
}

export const test = base.extend<{
  tracker: { owner: LocalClient; id: string; title: string; path: string };
}>({
  page: async ({ page }, provide) => {
    await configureEnglish(page);
    await provide(page);
  },
  tracker: async ({ page }, provide) => {
    const owner = await signIn(page, "test@example.com");
    const title = unique("Browser tracker");
    try {
      const id = await createTracker(page, title);
      await provide({ owner, id, title, path: "/tracker/" + id });
    } finally {
      await deleteTestTracker(owner, title);
    }
  },
});
