import { beforeEach, expect, it, vi } from "vitest";
import {
  getUserProfilePreferences,
  updateUserDisplayName,
} from "./profileRepository";

const { from, select, update, eq, single } = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
}));
vi.mock("@/src/services/backend/supabase", () => ({
  getSupabaseClient: () => ({ from }),
}));

beforeEach(() => {
  from.mockReset().mockReturnValue({ select, update });
  select.mockReset().mockReturnValue({ eq });
  update.mockReset().mockReturnValue({ eq });
  eq.mockReset().mockReturnValue({ single });
  single.mockReset();
});

it("maps account preferences with an email-based fallback and preserves unknown image consent", async () => {
  single.mockResolvedValue({
    error: null,
    data: {
      display_name: "",
      display_name_requires_update: true,
      use_generation_sprites: false,
      pokemon_image_style: "mixed",
      wiki_id: null,
      multi_locale_search: true,
      allow_image_loading: null,
      image_consent_updated_at: null,
    },
  });
  await expect(
    getUserProfilePreferences("user", " Trainer@EXAMPLE.com "),
  ).resolves.toEqual({
    displayName: "trainer",
    displayNameRequiresUpdate: true,
    useGenerationSprites: false,
    pokemonImageStyle: "mixed",
    wikiId: null,
    multiLocaleSearch: true,
    allowImageLoading: null,
    imageConsentUpdatedAt: null,
  });
  expect(eq).toHaveBeenCalledWith("id", "user");
});

it("does not write blank names and propagates profile write errors", async () => {
  await expect(updateUserDisplayName("user", "  ")).rejects.toMatchObject({
    code: "invalid-input",
  });
  expect(from).not.toHaveBeenCalled();
  const error = { code: "42501", message: "permission denied" };
  eq.mockResolvedValue({ error });
  await expect(updateUserDisplayName("user", "  New   Trainer ")).rejects.toBe(
    error,
  );
  expect(update).toHaveBeenCalledWith({
    display_name: "New Trainer",
    display_name_requires_update: false,
  });
});
