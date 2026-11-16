import type {
  AppState,
  PersistedTrackerState,
  TrackerMember,
  TrackerMeta,
  TrackerRole,
  UserSettings,
} from "@/types.ts";
import type { Database, Json } from "@/src/types/database.ts";
import { GAME_VERSIONS } from "@/src/data/game-versions.ts";

type TrackerRow = Database["public"]["Tables"]["trackers"]["Row"];
type TrackerMemberRow = Database["public"]["Tables"]["tracker_members"]["Row"];
type TrackerStateRow = Database["public"]["Tables"]["tracker_states"]["Row"];
type TrackerMemberDirectoryEntry =
  Database["public"]["Functions"]["list_tracker_members"]["Returns"][number];

export interface TrackerStateSnapshot {
  state: AppState;
  revision: number;
  schemaVersion: number;
  updatedAt: number;
}

const toTimestamp = (value: string): number => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Date.now();
};

const isJsonObject = (value: Json): value is { [key: string]: Json } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toUserSettings = (value: Json): UserSettings | undefined => {
  if (!isJsonObject(value)) return undefined;
  const rivalPreferences = value.rivalPreferences;
  if (!isJsonObject(rivalPreferences)) return undefined;

  const parsedPreferences = Object.fromEntries(
    Object.entries(rivalPreferences).flatMap(([key, gender]) =>
      gender === "male" || gender === "female" ? [[key, gender]] : [],
    ),
  ) as UserSettings["rivalPreferences"];
  return Object.keys(parsedPreferences).length > 0
    ? { rivalPreferences: parsedPreferences }
    : undefined;
};

const toMember = (entry: TrackerMemberDirectoryEntry): TrackerMember => ({
  uid: entry.user_id,
  displayName: entry.display_name,
  ...(entry.email ? { email: entry.email } : {}),
  role: entry.role as TrackerRole,
  addedAt: toTimestamp(entry.added_at),
});

/** Maps relational tracker rows into the existing UI view model. */
export const toTrackerMeta = (
  tracker: TrackerRow,
  directory: TrackerMemberDirectoryEntry[],
  membershipRows: TrackerMemberRow[],
): TrackerMeta => {
  const settingsByUserId = new Map(
    membershipRows.map((member) => [
      member.user_id,
      toUserSettings(member.settings),
    ]),
  );
  const members: Record<string, TrackerMember> = {};
  const guests: Record<string, TrackerMember> = {};
  const userSettings: Record<string, UserSettings> = {};

  directory.forEach((entry) => {
    const member = toMember(entry);
    if (member.role === "guest") {
      guests[member.uid] = member;
    } else {
      members[member.uid] = member;
    }
    const settings = settingsByUserId.get(member.uid);
    if (settings) userSettings[member.uid] = settings;
  });

  return {
    id: tracker.id,
    title: tracker.title,
    playerNames: tracker.player_names,
    createdAt: toTimestamp(tracker.created_at),
    createdBy: tracker.created_by,
    members,
    guests,
    gameVersionId: tracker.game_version_id,
    ...(tracker.all_pokemon_and_items ? { allPokemonAndItems: true } : {}),
    ...(tracker.ruleset_id ? { rulesetId: tracker.ruleset_id } : {}),
    ...(Object.keys(userSettings).length > 0 ? { userSettings } : {}),
    isPublic: tracker.is_public,
  };
};

/** Restores UI-only relational metadata around the persisted JSON state. */
export const toTrackerStateSnapshot = (
  row: TrackerStateRow,
  tracker: Pick<TrackerRow, "player_names" | "ruleset_id" | "game_version_id">,
): TrackerStateSnapshot => {
  if (row.schema_version !== 3 || !isJsonObject(row.state)) {
    throw new Error(`Unsupported tracker state schema: ${row.schema_version}`);
  }
  // The database validates the persisted shape. Only relational composition and
  // reconciliation with evolving game templates belong on the read path.
  const state = row.state as unknown as PersistedTrackerState;
  const game = GAME_VERSIONS[tracker.game_version_id] ?? GAME_VERSIONS.gen5_bw;
  return {
    state: {
      ...state,
      playerNames: tracker.player_names,
      ...(tracker.ruleset_id ? { rulesetId: tracker.ruleset_id } : {}),
      levelCaps: game.levelCaps.map((template) => ({
        ...state.levelCaps.find((cap) => cap.id === template.id),
        ...template,
        done:
          state.levelCaps.find((cap) => cap.id === template.id)?.done ?? false,
      })),
      rivalCaps: game.rivalCaps.map((template) => {
        const saved = state.rivalCaps.find((cap) => cap.id === template.id);
        return {
          ...saved,
          ...template,
          done: saved?.done ?? false,
          revealed: saved?.revealed ?? false,
        };
      }),
    },
    revision: Number(row.revision),
    schemaVersion: row.schema_version,
    updatedAt: toTimestamp(row.updated_at),
  };
};

/** Removes fields represented by relational columns before a state RPC write. */
export const toPersistedTrackerState = (state: AppState): Json => {
  const {
    playerNames: _playerNames,
    rulesetId: _rulesetId,
    ...persisted
  } = state;
  return persisted as unknown as Json;
};
