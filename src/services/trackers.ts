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
import type {
  RivalGender,
  TrackerMember,
  TrackerMeta,
  TrackerRole,
} from "@/types.ts";
import type { AuthenticatedUser } from "@/src/services/backend/auth.ts";

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
    if (!normalized || normalized === normalizeEmail(owner.email)) return;
    if (!inviteByEmail.has(normalized)) {
      inviteByEmail.set(normalized, role === "guest" ? "guest" : "editor");
    }
  });

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

  try {
    const trackerId = await createSupabaseTracker({
      title: sanitizedTitle,
      playerNames: normalizedPlayerNames,
      gameVersionId,
      allPokemonAndItems: Boolean(allPokemonAndItems),
      rulesetId: resolvedRulesetId,
      initialState,
      invites: Array.from(inviteByEmail, ([email, role]) => ({ email, role })),
    });
    const meta = await getSupabaseTrackerMeta(trackerId);
    if (!meta) throw new Error("Created tracker could not be loaded.");
    return { trackerId, meta };
  } catch (error) {
    throw toTrackerOperationError(error);
  }
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
          ...Object.values(meta.guests ?? {}),
        ].find((entry) => entry.uid === userId)
      : undefined;
    if (!member) throw new Error("Invited tracker member could not be loaded.");
    return member;
  } catch (error) {
    throw toTrackerOperationError(error);
  }
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

  try {
    await removeSupabaseTrackerMember(trackerId, memberUid);
  } catch (error) {
    throw toTrackerOperationError(error);
  }
};

export const deleteTracker = async (trackerId: string): Promise<void> => {
  if (!trackerId) {
    throw new TrackerOperationError("Ungültiger Tracker.", "invalid-input");
  }

  try {
    await deleteSupabaseTracker(trackerId);
  } catch (error) {
    throw toTrackerOperationError(error);
  }
};

export const updateRivalPreference = async (
  trackerId: string,
  userId: string,
  rivalKey: string,
  gender: RivalGender,
): Promise<void> => {
  await updateSupabaseRivalPreference(trackerId, userId, rivalKey, gender);
};
