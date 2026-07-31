import type { AuthenticatedUser } from "@/src/services/backend/auth.ts";
import { getSupabaseClient } from "@/src/services/backend/supabase.ts";
import type { TablesUpdate } from "@/src/types/database.ts";

export class ProfileOperationError extends Error {
  readonly code = "invalid-input";
}

export interface UserProfilePreferences {
  displayName: string;
  displayNameRequiresUpdate: boolean;
  useGenerationSprites: boolean;
  useSpritesInTeamTable: boolean;
  wikiId: string | null;
  multiLocaleSearch: boolean;
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
      "display_name, display_name_requires_update, use_generation_sprites, use_sprites_in_team_table, wiki_id, multi_locale_search",
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
    useSpritesInTeamTable: profile.use_sprites_in_team_table,
    wikiId: profile.wiki_id,
    multiLocaleSearch: profile.multi_locale_search,
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

export const updateUserGenerationSpritePreference = async (
  userId: string,
  enabled: boolean,
): Promise<void> => {
  await updateSupabaseProfile(userId, { use_generation_sprites: enabled });
};

export const updateUserSpritesInTeamTablePreference = async (
  userId: string,
  enabled: boolean,
): Promise<void> => {
  await updateSupabaseProfile(userId, { use_sprites_in_team_table: enabled });
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
