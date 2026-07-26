import { GAME_VERSIONS } from "@/src/data/game-versions.ts";
import {
  canonicalHash,
  firebaseTrackerIdToUuid,
  isRecord,
} from "./canonical.ts";
import type {
  AuthMapEntry,
  MigrationBundle,
  MigrationCounts,
  MigrationIssue,
  MigrationRows,
  TrackerRole,
} from "./types.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_ROLES = new Set<TrackerRole>(["owner", "editor", "guest"]);
const VALID_RIVAL_MODES = new Set(["off", "showLevels", "on"]);

const entries = (value: unknown): Array<[string, unknown]> =>
  isRecord(value) ? Object.entries(value) : [];

const cleanString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const cleanStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map(cleanString)
        .filter(Boolean)
        .filter((entry, index, array) => array.indexOf(entry) === index)
    : [];

const cleanTags = (value: unknown): string[] => {
  const seen = new Set<string>();
  return cleanStringArray(value).filter((tag) => {
    const key = tag.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const normalizeEmail = (value: unknown): string =>
  cleanString(value).toLowerCase();

const encodeEmailKey = (email: string): string =>
  email.replace(/[.#$/[\]]/g, "_");

const toIsoTimestamp = (value: unknown, fallback = 0): string => {
  const timestamp =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  return new Date(
    Number.isFinite(timestamp) ? timestamp : fallback,
  ).toISOString();
};

const normalizeDisplayName = (value: unknown, email: string): string => {
  const requested = cleanString(value).replace(/\s+/g, " ");
  const fallback = cleanString(email.split("@")[0]) || "Trainer";
  return (requested || fallback).slice(0, 50);
};

const normalizeNumberArray = (
  value: unknown,
  playerCount: number,
): number[] => {
  const result = Array.isArray(value)
    ? value
        .slice(0, playerCount)
        .map((entry) => (typeof entry === "number" ? entry : 0))
    : [];
  while (result.length < playerCount) result.push(0);
  return result;
};

const normalizePlayerNames = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const names = value.slice(0, 3).map(cleanString);
  return names.length >= 1 && names.every(Boolean) ? names : [];
};

const normalizeNestedArrays = (
  value: unknown,
  playerCount: number,
): unknown[][] => {
  const result = Array.isArray(value)
    ? value
        .slice(0, playerCount)
        .map((entry) => (Array.isArray(entry) ? entry : []))
    : [];
  while (result.length < playerCount) result.push([]);
  return result;
};

const normalizeState = (
  rawState: Record<string, unknown>,
  playerCount: number,
  createdAt: unknown,
): Record<string, unknown> => {
  const rawStats = isRecord(rawState.stats) ? rawState.stats : {};
  const rivalCensorMode = VALID_RIVAL_MODES.has(
    String(rawState.rivalCensorMode),
  )
    ? rawState.rivalCensorMode
    : typeof rawState.rivalCensorEnabled === "boolean"
      ? rawState.rivalCensorEnabled
        ? "on"
        : "off"
      : "on";

  const state: Record<string, unknown> = {
    ...rawState,
    team: Array.isArray(rawState.team) ? rawState.team : [],
    box: Array.isArray(rawState.box) ? rawState.box : [],
    graveyard: Array.isArray(rawState.graveyard) ? rawState.graveyard : [],
    rules: cleanStringArray(rawState.rules),
    levelCaps: Array.isArray(rawState.levelCaps) ? rawState.levelCaps : [],
    rivalCaps: Array.isArray(rawState.rivalCaps) ? rawState.rivalCaps : [],
    stats: {
      ...rawStats,
      runs: typeof rawStats.runs === "number" ? rawStats.runs : 1,
      best: typeof rawStats.best === "number" ? rawStats.best : 0,
      top4Items: normalizeNumberArray(rawStats.top4Items, playerCount),
      deaths: normalizeNumberArray(rawStats.deaths, playerCount),
      sumDeaths: normalizeNumberArray(rawStats.sumDeaths, playerCount),
      legendaryEncounters:
        typeof rawStats.legendaryEncounters === "number"
          ? rawStats.legendaryEncounters
          : 0,
    },
    legendaryTrackerEnabled:
      typeof rawState.legendaryTrackerEnabled === "boolean"
        ? rawState.legendaryTrackerEnabled
        : true,
    rivalCensorMode,
    hardcoreModeEnabled:
      typeof rawState.hardcoreModeEnabled === "boolean"
        ? rawState.hardcoreModeEnabled
        : false,
    nicknamesEnabled:
      typeof rawState.nicknamesEnabled === "boolean"
        ? rawState.nicknamesEnabled
        : true,
    infiniteFossilsEnabled:
      typeof rawState.infiniteFossilsEnabled === "boolean"
        ? rawState.infiniteFossilsEnabled
        : false,
    megaStoneSpriteStyle:
      rawState.megaStoneSpriteStyle === "pokemon" ? "pokemon" : "item",
    fossils: normalizeNestedArrays(rawState.fossils, playerCount),
    items: normalizeNestedArrays(rawState.items, playerCount),
    runStartedAt:
      typeof rawState.runStartedAt === "number"
        ? rawState.runStartedAt
        : typeof createdAt === "number"
          ? createdAt
          : 0,
  };

  delete state.playerNames;
  delete state.rulesetId;
  delete state.rivalCensorEnabled;
  return state;
};

const issue = (
  issues: MigrationIssue[],
  severity: MigrationIssue["severity"],
  code: string,
  entityType: MigrationIssue["entityType"],
  entityId: string,
  message: string,
) => issues.push({ severity, code, entityType, entityId, message });

const authMapCandidates = (input: unknown): unknown[] => {
  if (Array.isArray(input)) return input;
  if (isRecord(input) && Array.isArray(input.users)) return input.users;
  if (!isRecord(input)) return [];
  return Object.entries(input).map(([firebaseUid, value]) =>
    typeof value === "string"
      ? { firebaseUid, supabaseUserId: value }
      : isRecord(value)
        ? { firebaseUid, ...value }
        : { firebaseUid },
  );
};

export const parseAuthMap = (
  input: unknown,
  issues: MigrationIssue[] = [],
): Map<string, AuthMapEntry> => {
  const result = new Map<string, AuthMapEntry>();
  const emails = new Map<string, string>();

  authMapCandidates(input).forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      issue(
        issues,
        "quarantine",
        "invalid_auth_map_entry",
        "auth",
        String(index),
        "Auth mapping entry must be an object.",
      );
      return;
    }
    const firebaseUid = cleanString(
      candidate.firebaseUid ?? candidate.localId ?? candidate.uid,
    );
    const supabaseUserId = cleanString(
      candidate.supabaseUserId ??
        candidate.userId ??
        candidate.user_id ??
        candidate.id,
    );
    const email = normalizeEmail(candidate.email);
    const entityId = firebaseUid || String(index);

    if (!firebaseUid || !UUID_PATTERN.test(supabaseUserId) || !email) {
      issue(
        issues,
        "quarantine",
        "invalid_auth_map_entry",
        "auth",
        entityId,
        "Auth mapping requires firebaseUid, a Supabase UUID, and an email.",
      );
      return;
    }
    if (result.has(firebaseUid)) {
      issue(
        issues,
        "quarantine",
        "duplicate_firebase_uid",
        "auth",
        firebaseUid,
        "Firebase UID occurs more than once in the Auth mapping.",
      );
      return;
    }
    const existingUid = emails.get(email);
    if (existingUid && existingUid !== firebaseUid) {
      issue(
        issues,
        "quarantine",
        "duplicate_normalized_email",
        "auth",
        firebaseUid,
        "Normalized Auth email occurs for more than one Firebase UID.",
      );
      return;
    }
    emails.set(email, firebaseUid);
    result.set(firebaseUid, { firebaseUid, supabaseUserId, email });
  });

  return result;
};

const sourceCounts = (root: Record<string, unknown>): MigrationCounts => ({
  users: entries(root.users).length,
  profiles: entries(root.users).length,
  trackers: entries(root.trackers).length,
  memberships: entries(root.trackers).reduce((count, [, value]) => {
    const meta = isRecord(value) && isRecord(value.meta) ? value.meta : {};
    return count + entries(meta.members).length + entries(meta.guests).length;
  }, 0),
  states: entries(root.trackers).filter(
    ([, value]) => isRecord(value) && value.state !== undefined,
  ).length,
  rulesets: entries(root.rulesets).reduce(
    (count, [, ownerRulesets]) => count + entries(ownerRulesets).length,
    0,
  ),
});

export const transformFirebaseExport = (
  exportInput: unknown,
  authMapInput: unknown,
): MigrationBundle => {
  const issues: MigrationIssue[] = [];
  const rows: MigrationRows = {
    profiles: [],
    trackers: [],
    trackerMembers: [],
    trackerStates: [],
    rulesets: [],
  };
  const root = isRecord(exportInput) ? exportInput : {};
  if (!isRecord(exportInput)) {
    issue(
      issues,
      "quarantine",
      "invalid_export_root",
      "profile",
      "root",
      "Firebase export root must be a JSON object.",
    );
  }
  const authMap = parseAuthMap(authMapInput, issues);
  const userIdMapping = Object.fromEntries(
    [...authMap].map(([uid, entry]) => [uid, entry.supabaseUserId]),
  );
  const firebaseUsers = new Map(entries(root.users));

  for (const firebaseUid of firebaseUsers.keys()) {
    if (!authMap.has(firebaseUid)) {
      issue(
        issues,
        "quarantine",
        "unmapped_profile",
        "profile",
        firebaseUid,
        "Realtime Database profile is absent from the Auth mapping.",
      );
    }
  }

  for (const [firebaseUid, authEntry] of authMap) {
    const rawUser = firebaseUsers.get(firebaseUid);
    const user = isRecord(rawUser) ? rawUser : {};
    if (!rawUser) {
      issue(
        issues,
        "warning",
        "missing_firebase_profile",
        "profile",
        firebaseUid,
        "Auth user has no Realtime Database profile; defaults were applied.",
      );
    }
    const sourceEmail = normalizeEmail(user.email ?? user.emailLowerCase);
    if (sourceEmail && sourceEmail !== authEntry.email) {
      issue(
        issues,
        "warning",
        "profile_email_mismatch",
        "profile",
        firebaseUid,
        "Realtime Database profile email differs from the Auth mapping.",
      );
    }
    rows.profiles.push({
      id: authEntry.supabaseUserId,
      firebaseUid,
      displayName: normalizeDisplayName(user.displayName, authEntry.email),
      displayNameRequiresUpdate: cleanString(user.displayName) === "",
      createdAt: toIsoTimestamp(user.createdAt),
      lastLoginAt: toIsoTimestamp(
        user.lastLoginAt,
        Number(user.createdAt) || 0,
      ),
      useGenerationSprites: user.useGenerationSprites === true,
      useSpritesInTeamTable: user.useSpritesInTeamTable === true,
      wikiId: cleanString(user.wikiId) || null,
      multiLocaleSearch: user.multiLocaleSearch === true,
    });

    const emailLookup = isRecord(root.userEmails)
      ? root.userEmails[encodeEmailKey(authEntry.email)]
      : undefined;
    if (
      !isRecord(emailLookup) ||
      cleanString(emailLookup.uid) !== firebaseUid
    ) {
      issue(
        issues,
        "warning",
        "email_lookup_mismatch",
        "profile",
        firebaseUid,
        "userEmails does not match the Auth mapping; it will not be imported.",
      );
    }
  }

  for (const [ownerFirebaseUid, ownerRulesets] of entries(root.rulesets)) {
    const owner = authMap.get(ownerFirebaseUid);
    if (!owner) {
      issue(
        issues,
        "quarantine",
        "unmapped_ruleset_owner",
        "ruleset",
        ownerFirebaseUid,
        "Ruleset owner is absent from the Auth mapping.",
      );
      continue;
    }
    for (const [firebaseRulesetId, rawRuleset] of entries(ownerRulesets)) {
      if (!isRecord(rawRuleset)) {
        issue(
          issues,
          "quarantine",
          "malformed_ruleset",
          "ruleset",
          `${ownerFirebaseUid}:${firebaseRulesetId}`,
          "Ruleset must be an object.",
        );
        continue;
      }
      if (rawRuleset.isPreset === true) {
        issue(
          issues,
          "warning",
          "preset_ruleset_skipped",
          "ruleset",
          `${ownerFirebaseUid}:${firebaseRulesetId}`,
          "Preset rulesets remain in source control and were skipped.",
        );
        continue;
      }
      const id = cleanString(rawRuleset.id) || firebaseRulesetId;
      const name = cleanString(rawRuleset.name);
      if (!id || !name) {
        issue(
          issues,
          "quarantine",
          "invalid_ruleset_identity",
          "ruleset",
          `${ownerFirebaseUid}:${firebaseRulesetId}`,
          "Custom ruleset requires a non-empty ID and name.",
        );
        continue;
      }
      rows.rulesets.push({
        ownerId: owner.supabaseUserId,
        id,
        name,
        description: cleanString(rawRuleset.description),
        rules: cleanStringArray(rawRuleset.rules),
        tags: cleanTags(rawRuleset.tags),
        createdAt: toIsoTimestamp(rawRuleset.createdAt),
        updatedAt: toIsoTimestamp(
          rawRuleset.updatedAt,
          Number(rawRuleset.createdAt) || 0,
        ),
      });
    }
  }

  const trackerIdMapping: Record<string, string> = {};
  for (const [firebaseTrackerId, rawTracker] of entries(root.trackers)) {
    const targetTrackerId = firebaseTrackerIdToUuid(firebaseTrackerId);
    trackerIdMapping[firebaseTrackerId] = targetTrackerId;
    let quarantined = false;
    const quarantine = (code: string, message: string) => {
      quarantined = true;
      issue(issues, "quarantine", code, "tracker", firebaseTrackerId, message);
    };

    if (!isRecord(rawTracker) || !isRecord(rawTracker.meta)) {
      quarantine("malformed_tracker", "Tracker metadata must be an object.");
      continue;
    }
    const meta = rawTracker.meta;
    if (!isRecord(rawTracker.state)) {
      quarantine("malformed_state", "Tracker state must be a JSON object.");
      continue;
    }
    const rawState = rawTracker.state;
    const createdByFirebaseUid = cleanString(meta.createdBy);
    const owner = authMap.get(createdByFirebaseUid);
    if (!owner) {
      quarantine(
        "unmapped_tracker_owner",
        "Tracker owner is absent from the Auth mapping.",
      );
    }
    const gameVersionId = cleanString(meta.gameVersionId);
    if (!gameVersionId || !(gameVersionId in GAME_VERSIONS)) {
      quarantine(
        "unknown_game_version",
        "Tracker has an unknown game version.",
      );
    }
    const metaPlayerNames = normalizePlayerNames(meta.playerNames);
    const statePlayerNames = normalizePlayerNames(rawState.playerNames);
    const playerNames = metaPlayerNames.length
      ? metaPlayerNames
      : statePlayerNames;
    if (!playerNames.length) {
      quarantine("invalid_player_names", "Tracker has no valid player names.");
    }
    if (
      metaPlayerNames.length &&
      statePlayerNames.length &&
      JSON.stringify(metaPlayerNames) !== JSON.stringify(statePlayerNames)
    ) {
      issue(
        issues,
        "warning",
        "player_names_mismatch",
        "tracker",
        firebaseTrackerId,
        "Metadata player names were used instead of differing state player names.",
      );
    }
    const title = cleanString(meta.title);
    if (!title) quarantine("missing_tracker_title", "Tracker title is empty.");

    const memberRows: MigrationRows["trackerMembers"] = [];
    const rolesByUid = new Map<string, TrackerRole>();
    const memberSources: Array<[string, unknown, TrackerRole | undefined]> = [
      ...entries(meta.members).map(
        ([uid, value]) =>
          [uid, value, undefined] as [string, unknown, undefined],
      ),
      ...entries(meta.guests).map(
        ([uid, value]) =>
          [uid, value, "guest"] as [string, unknown, TrackerRole],
      ),
    ];
    for (const [firebaseUid, rawMember, forcedRole] of memberSources) {
      const member = isRecord(rawMember) ? rawMember : {};
      const rawRole = forcedRole ?? cleanString(member.role);
      if (!VALID_ROLES.has(rawRole as TrackerRole)) {
        quarantined = true;
        issue(
          issues,
          "quarantine",
          "invalid_membership_role",
          "membership",
          `${firebaseTrackerId}:${firebaseUid}`,
          "Membership role is invalid.",
        );
        continue;
      }
      const role = rawRole as TrackerRole;
      const previousRole = rolesByUid.get(firebaseUid);
      if (previousRole && previousRole !== role) {
        quarantined = true;
        issue(
          issues,
          "quarantine",
          "duplicate_membership",
          "membership",
          `${firebaseTrackerId}:${firebaseUid}`,
          "User occurs more than once with different tracker roles.",
        );
        continue;
      }
      if (previousRole) continue;
      rolesByUid.set(firebaseUid, role);
      const mappedUser = authMap.get(firebaseUid);
      if (!mappedUser) {
        quarantined = true;
        issue(
          issues,
          "quarantine",
          "unmapped_member",
          "membership",
          `${firebaseTrackerId}:${firebaseUid}`,
          "Tracker member is absent from the Auth mapping.",
        );
        continue;
      }
      const settings = isRecord(meta.userSettings)
        ? meta.userSettings[firebaseUid]
        : undefined;
      memberRows.push({
        trackerId: targetTrackerId,
        userId: mappedUser.supabaseUserId,
        role,
        addedAt: toIsoTimestamp(member.addedAt, Number(meta.createdAt) || 0),
        settings: isRecord(settings) ? settings : {},
      });
      const sourceUserTrackers = isRecord(root.userTrackers)
        ? root.userTrackers[firebaseUid]
        : undefined;
      if (
        !isRecord(sourceUserTrackers) ||
        sourceUserTrackers[firebaseTrackerId] !== true
      ) {
        issue(
          issues,
          "warning",
          "user_tracker_lookup_missing",
          "membership",
          `${firebaseTrackerId}:${firebaseUid}`,
          "userTrackers does not contain this membership; relational membership is authoritative.",
        );
      }
    }

    const owners = memberRows.filter((member) => member.role === "owner");
    if (
      owners.length !== 1 ||
      !owner ||
      owners[0]?.userId !== owner.supabaseUserId
    ) {
      quarantine(
        "owner_invariant_failed",
        "Tracker must have exactly one owner matching createdBy.",
      );
    }
    if (quarantined || !owner) continue;

    const state = normalizeState(rawState, playerNames.length, meta.createdAt);
    rows.trackers.push({
      id: targetTrackerId,
      firebaseTrackerId,
      title,
      playerNames,
      createdBy: owner.supabaseUserId,
      createdAt: toIsoTimestamp(meta.createdAt),
      gameVersionId,
      isPublic: meta.isPublic === true,
      allPokemonAndItems: meta.allPokemonAndItems === true,
      rulesetId: cleanString(meta.rulesetId ?? rawState.rulesetId) || null,
    });
    rows.trackerMembers.push(...memberRows);
    rows.trackerStates.push({
      trackerId: targetTrackerId,
      state,
      schemaVersion: 1,
      revision: 1,
      updatedBy: owner.supabaseUserId,
      canonicalHash: canonicalHash(state),
    });
  }

  const profileIds = new Set(rows.profiles.map((row) => row.id));
  const trackerIds = new Set(rows.trackers.map((row) => row.id));
  const brokenReference =
    rows.trackers.some((row) => !profileIds.has(row.createdBy)) ||
    rows.trackerMembers.some(
      (row) => !profileIds.has(row.userId) || !trackerIds.has(row.trackerId),
    ) ||
    rows.trackerStates.some(
      (row) => !profileIds.has(row.updatedBy) || !trackerIds.has(row.trackerId),
    ) ||
    rows.rulesets.some((row) => !profileIds.has(row.ownerId));
  if (brokenReference) {
    issue(
      issues,
      "quarantine",
      "referential_integrity_failed",
      "tracker",
      "transformed-output",
      "Transformed rows contain an unresolved foreign-key reference.",
    );
  }

  return {
    rows,
    sourceCounts: sourceCounts(root),
    trackerIdMapping,
    userIdMapping,
    issues,
  };
};

export const transformedCounts = (rows: MigrationRows): MigrationCounts => ({
  users: rows.profiles.length,
  profiles: rows.profiles.length,
  trackers: rows.trackers.length,
  memberships: rows.trackerMembers.length,
  states: rows.trackerStates.length,
  rulesets: rows.rulesets.length,
});
