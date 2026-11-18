import type { AuthenticatedUser } from "@/src/services/backend/auth.ts";
import { getSupabaseClient } from "@/src/services/backend/supabase.ts";
import type { TablesUpdate } from "@/src/types/database.ts";
import type { PokemonImageStyle } from "@/types.ts";

export class ProfileOperationError extends Error {
  readonly code = "invalid-input";
}

export interface UserProfilePreferences {
  displayName: string;
  displayNameRequiresUpdate: boolean;
  useGenerationSprites: boolean;
  pokemonImageStyle: PokemonImageStyle;
  wikiId: string | null;
  multiLocaleSearch: boolean;
  allowImageLoading: boolean | null;
  imageConsentUpdatedAt: string | null;
}

const normalizeEmail = (email?: string | null): string =>
  email?.trim().toLowerCase() ?? "";

export const getDefaultDisplayName = (email?: string | null): string => {
  const localPart = normalizeEmail(email).split("@", 1)[0]?.trim();
  return (localPart || "Trainer").slice(0, 50);
};

const normalizeDisplayName = (displayName: string): string => {
  const normalized = displayName.trim().replace(/\s+/g, " ");
  if (!normalized) {
    throw new ProfileOperationError("Bitte gib einen Anzeigenamen ein.");
  }
  if (normalized.length > 50) {
    throw new ProfileOperationError(
      "Der Anzeigename darf höchstens 50 Zeichen lang sein.",
    );
  }
  return normalized;
};

const getSupabaseProfile = async (userId: string) => {
  const { data, error } = await getSupabaseClient()
    .from("profiles")
    .select(
      "display_name, display_name_requires_update, use_generation_sprites, pokemon_image_style, wiki_id, multi_locale_search, allow_image_loading, image_consent_updated_at",
    )
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data;
};

export const ensureUserProfile = async (
  user: AuthenticatedUser,
): Promise<void> => {
  const { error } = await getSupabaseClient()
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", user.uid);
  if (error) throw error;
};

export const getUserProfilePreferences = async (
  userId: string,
  email?: string | null,
): Promise<UserProfilePreferences> => {
  const profile = await getSupabaseProfile(userId);
  return {
    displayName: profile.display_name || getDefaultDisplayName(email),
    displayNameRequiresUpdate: profile.display_name_requires_update,
    useGenerationSprites: profile.use_generation_sprites,
    pokemonImageStyle: profile.pokemon_image_style,
    wikiId: profile.wiki_id,
    multiLocaleSearch: profile.multi_locale_search,
    allowImageLoading: profile.allow_image_loading,
    imageConsentUpdatedAt: profile.image_consent_updated_at,
  };
};

const updateSupabaseProfile = async (
  userId: string,
  values: TablesUpdate<"profiles">,
): Promise<void> => {
  const { error } = await getSupabaseClient()
    .from("profiles")
    .update(values)
    .eq("id", userId);
  if (error) throw error;
};

export const updateUserImageLoadingPreference = async (
  userId: string,
  allowImageLoading: boolean,
): Promise<void> => {
  const { error } = await getSupabaseClient()
    .from("profiles")
    .update({ allow_image_loading: allowImageLoading })
    .eq("id", userId)
    .select("id")
    .single();
  if (error) throw error;
};

export const updateUserGenerationSpritePreference = async (
  userId: string,
  enabled: boolean,
): Promise<void> => {
  await updateSupabaseProfile(userId, { use_generation_sprites: enabled });
};

export const updateUserPokemonImageStylePreference = async (
  userId: string,
  imageStyle: PokemonImageStyle,
): Promise<void> => {
  await updateSupabaseProfile(userId, { pokemon_image_style: imageStyle });
};

export const updateUserWikiPreference = async (
  userId: string,
  wikiId: string,
): Promise<void> => {
  await updateSupabaseProfile(userId, { wiki_id: wikiId });
};

export const updateUserMultiLocaleSearchPreference = async (
  userId: string,
  enabled: boolean,
): Promise<void> => {
  await updateSupabaseProfile(userId, { multi_locale_search: enabled });
};

export const updateUserDisplayName = async (
  userId: string,
  displayName: string,
): Promise<string> => {
  const normalizedDisplayName = normalizeDisplayName(displayName);
  await updateSupabaseProfile(userId, {
    display_name: normalizedDisplayName,
    display_name_requires_update: false,
  });
  return normalizedDisplayName;
};
