import { get, ref, set, update } from "firebase/database";
import { db } from "@/src/firebaseConfig.ts";
import type { AuthenticatedUser } from "@/src/services/backend/auth.ts";
import { BACKEND } from "@/src/services/backend/backend.ts";
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

const encodeEmailKey = (normalizedEmail: string): string =>
  normalizedEmail.replace(/[.#$/\[\]]/g, "_");

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
  if (BACKEND === "supabase") {
    const { error } = await getSupabaseClient()
      .from("profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.uid);
    if (error) throw error;
    return;
  }

  if (!user.email) return;
  const now = Date.now();
  const profileRef = ref(db, `users/${user.uid}`);
  const snapshot = await get(profileRef);
  const payload = { uid: user.uid, lastLoginAt: now };
  const existingDisplayName = snapshot.child("displayName").val();
  const displayName =
    typeof existingDisplayName === "string" && existingDisplayName.trim()
      ? existingDisplayName.trim()
      : getDefaultDisplayName(user.email);
  if (snapshot.exists()) {
    await update(profileRef, { ...payload, displayName });
  } else {
    await set(profileRef, { ...payload, createdAt: now, displayName });
  }

  const normalizedEmail = normalizeEmail(user.email);
  await update(ref(db), {
    [`userEmails/${encodeEmailKey(normalizedEmail)}`]: {
      uid: user.uid,
      updatedAt: now,
    },
  });
};

export const getUserProfilePreferences = async (
  userId: string,
  email?: string | null,
): Promise<UserProfilePreferences> => {
  if (BACKEND === "supabase") {
    const profile = await getSupabaseProfile(userId);
    return {
      displayName: profile.display_name,
      displayNameRequiresUpdate: profile.display_name_requires_update,
      useGenerationSprites: profile.use_generation_sprites,
      useSpritesInTeamTable: profile.use_sprites_in_team_table,
      wikiId: profile.wiki_id,
      multiLocaleSearch: profile.multi_locale_search,
    };
  }

  const snapshot = await get(ref(db, `users/${userId}`));
  const value = snapshot.val() as Record<string, unknown> | null;
  const displayName = value?.displayName;
  return {
    displayName:
      typeof displayName === "string" && displayName.trim()
        ? displayName.trim().slice(0, 50)
        : getDefaultDisplayName(email),
    displayNameRequiresUpdate: false,
    useGenerationSprites: value?.useGenerationSprites === true,
    useSpritesInTeamTable: value?.useSpritesInTeamTable === true,
    wikiId: typeof value?.wikiId === "string" ? value.wikiId : null,
    multiLocaleSearch: value?.multiLocaleSearch === true,
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
  if (BACKEND === "supabase") {
    await updateSupabaseProfile(userId, { use_generation_sprites: enabled });
    return;
  }
  await set(ref(db, `users/${userId}/useGenerationSprites`), enabled);
};

export const updateUserSpritesInTeamTablePreference = async (
  userId: string,
  enabled: boolean,
): Promise<void> => {
  if (BACKEND === "supabase") {
    await updateSupabaseProfile(userId, { use_sprites_in_team_table: enabled });
    return;
  }
  await set(ref(db, `users/${userId}/useSpritesInTeamTable`), enabled);
};

export const updateUserWikiPreference = async (
  userId: string,
  wikiId: string,
): Promise<void> => {
  if (BACKEND === "supabase") {
    await updateSupabaseProfile(userId, { wiki_id: wikiId });
    return;
  }
  await set(ref(db, `users/${userId}/wikiId`), wikiId);
};

export const updateUserMultiLocaleSearchPreference = async (
  userId: string,
  enabled: boolean,
): Promise<void> => {
  if (BACKEND === "supabase") {
    await updateSupabaseProfile(userId, { multi_locale_search: enabled });
    return;
  }
  await set(ref(db, `users/${userId}/multiLocaleSearch`), enabled);
};

export const updateUserDisplayName = async (
  userId: string,
  displayName: string,
): Promise<string> => {
  const normalizedDisplayName = normalizeDisplayName(displayName);
  if (BACKEND === "supabase") {
    await updateSupabaseProfile(userId, {
      display_name: normalizedDisplayName,
      display_name_requires_update: false,
    });
    return normalizedDisplayName;
  }

  const userTrackersSnapshot = await get(ref(db, `userTrackers/${userId}`));
  const trackerIds = userTrackersSnapshot.exists()
    ? Object.keys(userTrackersSnapshot.val())
    : [];
  const trackerMetas = await Promise.all(
    trackerIds.map(async (trackerId) => ({
      trackerId,
      snapshot: await get(ref(db, `trackers/${trackerId}/meta`)),
    })),
  );

  await set(ref(db, `users/${userId}/displayName`), normalizedDisplayName);
  const memberUpdates: Record<string, unknown> = {};
  trackerMetas.forEach(({ trackerId, snapshot }) => {
    const meta = snapshot.val() as {
      members?: Record<string, unknown>;
      guests?: Record<string, unknown>;
    } | null;
    if (meta?.members?.[userId]) {
      memberUpdates[
        `trackers/${trackerId}/meta/members/${userId}/displayName`
      ] = normalizedDisplayName;
    } else if (meta?.guests?.[userId]) {
      memberUpdates[`trackers/${trackerId}/meta/guests/${userId}/displayName`] =
        normalizedDisplayName;
    }
  });

  if (Object.keys(memberUpdates).length > 0) {
    try {
      await update(ref(db), memberUpdates);
    } catch (error) {
      console.warn(
        "Could not mirror display name into Firebase tracker data",
        error,
      );
    }
  }
  return normalizedDisplayName;
};
