import { get, ref, set, update } from "firebase/database";
import { db } from "@/src/firebaseConfig.ts";
import { BACKEND } from "@/src/services/backend/backend.ts";
import {
  createInitialState,
  MIN_PLAYER_COUNT,
  sanitizePlayerNames,
  sanitizeRules,
} from "@/src/services/init.ts";
import { DEFAULT_RULESET_ID } from "@/src/data/rulesets.ts";
import {
  createSupabaseTracker,
  deleteSupabaseTracker,
  getSupabaseTrackerMeta,
  inviteSupabaseTrackerMember,
  removeSupabaseTrackerMember,
  updateSupabaseRivalPreference,
} from "@/src/services/repos/supabaseTrackerRepository.ts";
import {
  getDefaultDisplayName,
  getUserProfilePreferences,
} from "@/src/services/repos/profileRepository.ts";
import type {
  RivalGender,
  TrackerMember,
  TrackerMeta,
  TrackerRole,
} from "@/types.ts";
import { AuthenticatedUser } from "@/src/services/backend/auth.ts";

export class TrackerOperationError extends Error {
  code: "user-not-found" | "member-exists" | "invalid-input" | "unknown";
  details?: unknown;

  constructor(
    message: string,
    code: TrackerOperationError["code"],
    details?: unknown,
  ) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

const toTrackerOperationError = (error: unknown): TrackerOperationError => {
  if (error instanceof TrackerOperationError) return error;
  const message =
    error instanceof Error ? error.message : "Unknown tracker error";
  switch (message) {
    case "invite_user_not_found":
      return new TrackerOperationError(
        "Kein Account mit dieser Email gefunden.",
        "user-not-found",
      );
    case "tracker_member_exists":
      return new TrackerOperationError(
        "Nutzer ist bereits Mitglied des Trackers.",
        "member-exists",
      );
    case "invalid_tracker_input":
    case "invalid_invite_role":
    case "invalid_or_duplicate_invite":
      return new TrackerOperationError(message, "invalid-input");
    default:
      return new TrackerOperationError(message, "unknown", error);
  }
};

const normalizeEmail = (email?: string | null): string =>
  email?.trim().toLowerCase() ?? "";
const encodeEmailKey = (normalizedEmail: string): string =>
  normalizedEmail.replace(/[.#$/\[\]]/g, "_");

export const findUserByEmail = async (
  email: string,
): Promise<{ uid: string; email: string } | null> => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const emailKey = encodeEmailKey(normalized);
  const lookupRef = ref(db, `userEmails/${emailKey}`);
  const snapshot = await get(lookupRef);
  if (!snapshot.exists()) return null;
  const value = snapshot.val();
  if (!value?.uid) return null;
  return { uid: value.uid, email };
};

const resolveUsersByEmails = async (
  emails: string[],
): Promise<{
  found: Array<{ uid: string; email: string }>;
  missing: string[];
}> => {
  const unique = Array.from(
    new Set(emails.map(normalizeEmail).filter(Boolean)),
  );
  const lookups = await Promise.all(
    unique.map(async (mail) => ({
      email: mail,
      result: await findUserByEmail(mail),
    })),
  );
  const found = lookups
    .filter((entry) => entry.result)
    .map((entry) => entry.result!) as Array<{ uid: string; email: string }>;
  const missing = lookups
    .filter((entry) => !entry.result)
    .map((entry) => entry.email);
  return { found, missing };
};

const buildMember = (
  uid: string,
  email: string,
  role: TrackerRole,
  displayName = getDefaultDisplayName(email),
): TrackerMember => ({
  uid,
  email,
  displayName,
  role,
  addedAt: Date.now(),
});

type InviteRole = Exclude<TrackerRole, "owner">;

export interface InviteEntry {
  email: string;
  role: InviteRole;
}

export interface CreateTrackerPayload {
  title: string;
  playerNames: string[];
  memberInvites: InviteEntry[];
  owner: AuthenticatedUser;
  gameVersionId: string;
  allPokemonAndItems?: boolean;
  rulesetId?: string;
  rules?: string[];
}

export const createTracker = async ({
  title,
  playerNames,
  memberInvites,
  owner,
  gameVersionId,
  allPokemonAndItems,
  rulesetId,
  rules,
}: CreateTrackerPayload): Promise<{ trackerId: string; meta: TrackerMeta }> => {
  if (!owner.email) {
    throw new TrackerOperationError(
      "Owner benötigt eine gültige Email.",
      "invalid-input",
    );
  }

  const sanitizedTitle = title.trim() || "Neuer Tracker";
  const normalizedPlayerNames = sanitizePlayerNames(playerNames).map((name) =>
    name.trim(),
  );
  if (normalizedPlayerNames.length < MIN_PLAYER_COUNT) {
    throw new TrackerOperationError(
      "Ein Tracker benötigt mindestens einen Spieler.",
      "invalid-input",
    );
  }
  if (normalizedPlayerNames.some((name) => name.length === 0)) {
    throw new TrackerOperationError(
      "Bitte gib für alle Spieler einen Namen ein.",
      "invalid-input",
    );
  }
  const inviteByEmail = new Map<string, InviteRole>();
  (memberInvites ?? []).forEach(({ email, role }) => {
    const normalized = normalizeEmail(email);
    if (!normalized || normalized === normalizeEmail(owner.email!)) return;
    if (!inviteByEmail.has(normalized)) {
      inviteByEmail.set(normalized, role === "guest" ? "guest" : "editor");
    }
  });

  const filteredEmails = Array.from(inviteByEmail.keys());
  const normalizedRules = sanitizeRules(rules);
  const resolvedRulesetId =
    typeof rulesetId === "string" && rulesetId.trim().length > 0
      ? rulesetId
      : DEFAULT_RULESET_ID;
  const initialState = createInitialState(
    gameVersionId,
    normalizedPlayerNames,
    {
      id: resolvedRulesetId,
      rules: normalizedRules,
    },
  );

  if (BACKEND === "supabase") {
    try {
      const trackerId = await createSupabaseTracker({
        title: sanitizedTitle,
        playerNames: normalizedPlayerNames,
        gameVersionId,
        allPokemonAndItems: Boolean(allPokemonAndItems),
        rulesetId: resolvedRulesetId,
        initialState,
        invites: Array.from(inviteByEmail, ([email, role]) => ({
          email,
          role,
        })),
      });
      const meta = await getSupabaseTrackerMeta(trackerId);
      if (!meta) throw new Error("Created tracker could not be loaded.");
      return { trackerId, meta };
    } catch (error) {
      throw toTrackerOperationError(error);
    }
  }

  const { found, missing } = await resolveUsersByEmails(filteredEmails);
  if (missing.length > 0) {
    throw new TrackerOperationError(
      "Einige Emails wurden nicht gefunden.",
      "user-not-found",
      missing,
    );
  }

  const trackerId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const createdAt = Date.now();
  const ownerDisplayName = (
    await getUserProfilePreferences(owner.uid, owner.email)
  ).displayName;
  const members: Record<string, TrackerMember> = {
    [owner.uid]: buildMember(
      owner.uid,
      owner.email!,
      "owner",
      ownerDisplayName,
    ),
  };
  const guests: Record<string, TrackerMember> = {};

  for (const entry of found) {
    const role =
      inviteByEmail.get(normalizeEmail(entry.email)) === "guest"
        ? "guest"
        : "editor";
    if (role === "guest") {
      guests[entry.uid] = buildMember(entry.uid, entry.email, "guest");
    } else {
      members[entry.uid] = buildMember(entry.uid, entry.email, "editor");
    }
  }

  const meta: TrackerMeta = {
    id: trackerId,
    title: sanitizedTitle,
    playerNames: normalizedPlayerNames,
    createdAt,
    createdBy: owner.uid,
    members,
    guests,
    gameVersionId,
    ...(allPokemonAndItems ? { allPokemonAndItems: true } : {}),
    rulesetId: resolvedRulesetId,
    isPublic: false,
  };

  const trackerUpdates: Record<string, unknown> = {
    [`trackers/${trackerId}/meta`]: meta,
    [`trackers/${trackerId}/state`]: initialState,
  };
  trackerUpdates[`userTrackers/${owner.uid}/${trackerId}`] = true;

  await update(ref(db), trackerUpdates);

  const userTrackerUpdates: Record<string, unknown> = {};
  Object.keys(members)
    .filter((uid) => uid !== owner.uid)
    .forEach((uid) => {
      userTrackerUpdates[`userTrackers/${uid}/${trackerId}`] = true;
    });

  Object.keys(guests).forEach((uid) => {
    userTrackerUpdates[`userTrackers/${uid}/${trackerId}`] = true;
  });

  if (Object.keys(userTrackerUpdates).length > 0) {
    await update(ref(db), userTrackerUpdates);
  }
  return { trackerId, meta };
};

export const addMemberByEmail = async (
  trackerId: string,
  email: string,
  role: InviteRole = "editor",
): Promise<TrackerMember> => {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new TrackerOperationError(
      "Bitte gib eine gültige Email an.",
      "invalid-input",
    );
  }

  if (BACKEND === "supabase") {
    try {
      const targetRole: InviteRole = role === "guest" ? "guest" : "editor";
      const userId = await inviteSupabaseTrackerMember(
        trackerId,
        normalized,
        targetRole,
      );
      const meta = await getSupabaseTrackerMeta(trackerId);
      const member = meta
        ? [
            ...Object.values(meta.members),
            ...Object.values(meta.guests ?? []),
          ].find((entry) => entry.uid === userId)
        : undefined;
      if (!member)
        throw new Error("Invited tracker member could not be loaded.");
      return member;
    } catch (error) {
      throw toTrackerOperationError(error);
    }
  }

  const metaSnap = await get(ref(db, `trackers/${trackerId}/meta`));
  const existingMembers = metaSnap.child("members").exists()
    ? (metaSnap.child("members").val() as Record<string, TrackerMember>)
    : {};
  const existingGuests = metaSnap.child("guests").exists()
    ? (metaSnap.child("guests").val() as Record<string, TrackerMember>)
    : {};

  const duplicateEntry = [
    ...Object.values(existingMembers),
    ...Object.values(existingGuests),
  ].find((member) => normalizeEmail(member.email) === normalized);
  if (duplicateEntry) {
    throw new TrackerOperationError(
      "Nutzer ist bereits Mitglied des Trackers.",
      "member-exists",
    );
  }

  const lookup = await findUserByEmail(normalized);
  if (!lookup) {
    throw new TrackerOperationError(
      "Kein Account mit dieser Email gefunden.",
      "user-not-found",
    );
  }

  const targetRole: InviteRole = role === "guest" ? "guest" : "editor";
  const member = buildMember(lookup.uid, lookup.email, targetRole);
  const updates: Record<string, unknown> = {
    [`trackers/${trackerId}/meta/${targetRole === "guest" ? "guests" : "members"}/${member.uid}`]:
      member,
    [`userTrackers/${member.uid}/${trackerId}`]: true,
  };

  await update(ref(db), updates);
  return member;
};

export const removeMemberFromTracker = async (
  trackerId: string,
  memberUid: string,
): Promise<void> => {
  if (!trackerId || !memberUid) {
    throw new TrackerOperationError(
      "Ungültige Anfrage zum Entfernen.",
      "invalid-input",
    );
  }

  if (BACKEND === "supabase") {
    try {
      await removeSupabaseTrackerMember(trackerId, memberUid);
      return;
    } catch (error) {
      throw toTrackerOperationError(error);
    }
  }

  const memberRef = ref(db, `trackers/${trackerId}/meta/members/${memberUid}`);
  const guestRef = ref(db, `trackers/${trackerId}/meta/guests/${memberUid}`);
  const [memberSnap, guestSnap] = await Promise.all([
    get(memberRef),
    get(guestRef),
  ]);

  const isGuest = !memberSnap.exists() && guestSnap.exists();
  if (!memberSnap.exists() && !guestSnap.exists()) {
    throw new TrackerOperationError(
      "Mitglied wurde nicht gefunden.",
      "invalid-input",
    );
  }

  const member = (
    isGuest ? guestSnap.val() : memberSnap.val()
  ) as TrackerMember;
  if (!isGuest && member.role === "owner") {
    throw new TrackerOperationError(
      "Owner können nicht entfernt werden.",
      "invalid-input",
    );
  }

  const updates: Record<string, unknown> = {
    [`userTrackers/${memberUid}/${trackerId}`]: null,
  };

  if (isGuest) {
    updates[`trackers/${trackerId}/meta/guests/${memberUid}`] = null;
  } else {
    updates[`trackers/${trackerId}/meta/members/${memberUid}`] = null;
    updates[`trackers/${trackerId}/meta/userSettings/${memberUid}`] = null;
  }

  await update(ref(db), updates);
};

export const deleteTracker = async (trackerId: string): Promise<void> => {
  if (!trackerId) {
    throw new TrackerOperationError("Ungültiger Tracker.", "invalid-input");
  }

  if (BACKEND === "supabase") {
    try {
      await deleteSupabaseTracker(trackerId);
      return;
    } catch (error) {
      throw toTrackerOperationError(error);
    }
  }

  const trackerSnapshot = await get(ref(db, `trackers/${trackerId}`));
  if (!trackerSnapshot.exists()) {
    return;
  }

  const trackerValue = trackerSnapshot.val() as { meta?: TrackerMeta };
  const memberEntries = trackerValue?.meta?.members ?? {};
  const guestEntries = trackerValue?.meta?.guests ?? {};

  const updates: Record<string, unknown> = {
    [`trackers/${trackerId}`]: null,
  };

  Object.keys(memberEntries).forEach((uid) => {
    updates[`userTrackers/${uid}/${trackerId}`] = null;
  });

  Object.keys(guestEntries).forEach((uid) => {
    updates[`userTrackers/${uid}/${trackerId}`] = null;
  });

  await update(ref(db), updates);
};

export const updateRivalPreference = async (
  trackerId: string,
  userId: string,
  rivalKey: string,
  gender: RivalGender,
): Promise<void> => {
  if (BACKEND === "supabase") {
    await updateSupabaseRivalPreference(trackerId, userId, rivalKey, gender);
    return;
  }

  const prefPath = `trackers/${trackerId}/meta/userSettings/${userId}/rivalPreferences/${rivalKey}`;
  await set(ref(db, prefPath), gender);
};
