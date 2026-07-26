import type {
  AppState,
  RivalGender,
  TrackerMeta,
  TrackerRole,
  TrackerSummary,
} from "@/types.ts";
import { getSupabaseClient } from "@/src/services/backend/supabase.ts";
import {
  toPersistedTrackerState,
  toTrackerMeta,
  toTrackerStateSnapshot,
  type TrackerStateSnapshot,
} from "@/src/services/backend/supabaseTrackerMapper.ts";
import type { Database, Json } from "@/src/types/database.ts";

type TrackerRow = Database["public"]["Tables"]["trackers"]["Row"];
type TrackerMemberRow = Database["public"]["Tables"]["tracker_members"]["Row"];
type TrackerStateRow = Database["public"]["Tables"]["tracker_states"]["Row"];
type TrackerMemberDirectoryEntry =
  Database["public"]["Functions"]["list_tracker_members"]["Returns"][number];

export type SupabaseTrackerSubscription = () => void;

export interface SupabaseTrackerListEntry {
  meta: TrackerMeta;
  summary: TrackerSummary;
}

type ValueCallback<T> = (value: T | null) => void;
type ErrorCallback = (error: Error) => void;

type TrackerListQueryRow = {
  added_at: string;
  tracker_id: string;
  role: TrackerRole;
  trackers: TrackerRow & {
    tracker_states:
      | Pick<TrackerStateRow, "summary">
      | Array<Pick<TrackerStateRow, "summary">>
      | null;
  };
};

export class TrackerStateConflictError extends Error {
  readonly code = "state-revision-conflict";

  constructor() {
    super("The tracker changed on another device. Reload before saving again.");
    this.name = "TrackerStateConflictError";
  }
}

const toError = (error: { message: string; code?: string }): Error => {
  if (error.code === "40001" || error.message === "state_revision_conflict") {
    return new TrackerStateConflictError();
  }
  return Object.assign(new Error(error.message), { code: error.code });
};

const asJsonObject = (value: Json): Record<string, Json> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value
    : {};

const toSummaryNumber = (value: Json | undefined): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toTrackerSummary = (value: Json): TrackerSummary => {
  const summary = asJsonObject(value);
  return {
    teamCount: toSummaryNumber(summary.teamCount),
    boxCount: toSummaryNumber(summary.boxCount),
    graveyardCount: toSummaryNumber(summary.graveyardCount),
    deathCount: toSummaryNumber(summary.deathCount),
    runs: toSummaryNumber(summary.runs),
    championDone: summary.championDone === true,
    doneCapsCount: toSummaryNumber(summary.doneCapsCount),
    progressPct: toSummaryNumber(summary.progressPct),
  };
};

const toTrackerListEntry = (
  row: TrackerListQueryRow,
  userId: string,
): SupabaseTrackerListEntry => {
  const trackerState = Array.isArray(row.trackers.tracker_states)
    ? row.trackers.tracker_states[0]
    : row.trackers.tracker_states;
  const currentMember = {
    uid: userId,
    displayName: "",
    role: row.role,
    addedAt: Number.isFinite(Date.parse(row.added_at))
      ? Date.parse(row.added_at)
      : Date.now(),
  };

  return {
    meta: {
      id: row.trackers.id,
      title: row.trackers.title,
      playerNames: row.trackers.player_names,
      createdAt: Date.parse(row.trackers.created_at),
      createdBy: row.trackers.created_by,
      members: row.role === "guest" ? {} : { [userId]: currentMember },
      guests: row.role === "guest" ? { [userId]: currentMember } : {},
      gameVersionId: row.trackers.game_version_id,
      ...(row.trackers.all_pokemon_and_items
        ? { allPokemonAndItems: true }
        : {}),
      ...(row.trackers.ruleset_id
        ? { rulesetId: row.trackers.ruleset_id }
        : {}),
      isPublic: row.trackers.is_public,
    },
    summary: toTrackerSummary(trackerState?.summary ?? {}),
  };
};

const loadMemberDirectory = async (
  trackerId: string,
): Promise<{
  directory: TrackerMemberDirectoryEntry[];
  memberships: TrackerMemberRow[];
}> => {
  const supabase = getSupabaseClient();
  const [directoryResult, membershipsResult] = await Promise.all([
    supabase.rpc("list_tracker_members", { p_tracker_id: trackerId }),
    supabase.from("tracker_members").select().eq("tracker_id", trackerId),
  ]);

  if (directoryResult.error) throw toError(directoryResult.error);
  if (membershipsResult.error) throw toError(membershipsResult.error);
  return {
    directory: directoryResult.data,
    memberships: membershipsResult.data,
  };
};

/** Loads tracker metadata and member settings for an authenticated reader. */
export const getSupabaseTrackerMeta = async (
  trackerId: string,
): Promise<TrackerMeta | null> => {
  const supabase = getSupabaseClient();
  const { data: tracker, error } = await supabase
    .from("trackers")
    .select()
    .eq("id", trackerId)
    .maybeSingle();
  if (error) throw toError(error);
  if (!tracker) return null;

  try {
    const { directory, memberships } = await loadMemberDirectory(trackerId);
    return toTrackerMeta(tracker, directory, memberships);
  } catch (error) {
    // An anonymous visitor or an authenticated non-member may still read a
    // public tracker, but must never receive the participant directory.
    if (error instanceof Error && "code" in error && error.code === "42501") {
      return toTrackerMeta(tracker, [], []);
    }
    throw error;
  }
};

/** Loads one state document together with the relational metadata it omits. */
export const getSupabaseTrackerState = async (
  trackerId: string,
): Promise<TrackerStateSnapshot | null> => {
  const supabase = getSupabaseClient();
  const [stateResult, trackerResult] = await Promise.all([
    supabase
      .from("tracker_states")
      .select()
      .eq("tracker_id", trackerId)
      .maybeSingle(),
    supabase
      .from("trackers")
      .select("player_names, ruleset_id")
      .eq("id", trackerId)
      .maybeSingle(),
  ]);
  if (stateResult.error) throw toError(stateResult.error);
  if (trackerResult.error) throw toError(trackerResult.error);
  if (!stateResult.data || !trackerResult.data) return null;
  return toTrackerStateSnapshot(stateResult.data, trackerResult.data);
};

export const subscribeToSupabaseUserTrackerIds = (
  userId: string,
  onValueChange: ValueCallback<string[]>,
  onError?: ErrorCallback,
): SupabaseTrackerSubscription => {
  const supabase = getSupabaseClient();
  let active = true;
  const load = async () => {
    const { data, error } = await supabase
      .from("tracker_members")
      .select("tracker_id")
      .eq("user_id", userId);
    if (!active) return;
    if (error) {
      onError?.(toError(error));
      return;
    }
    onValueChange(data.map((member) => member.tracker_id));
  };

  void load();
  const channel = supabase
    .channel(`tracker-membership:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tracker_members",
        filter: `user_id=eq.${userId}`,
      },
      () => void load(),
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
};

/**
 * Loads each accessible tracker together with its server-computed list summary.
 * The channel refetches the joined list after a relevant Realtime change instead
 * of opening one metadata and one state listener for every tracker card.
 */
export const subscribeToSupabaseTrackerList = (
  userId: string,
  onValueChange: ValueCallback<SupabaseTrackerListEntry[]>,
  onError?: ErrorCallback,
): SupabaseTrackerSubscription => {
  const supabase = getSupabaseClient();
  let active = true;
  const load = async () => {
    const { data, error } = await supabase
      .from("tracker_members")
      .select(
        "tracker_id, role, added_at, trackers!inner(*, tracker_states(summary))",
      )
      .eq("user_id", userId);
    if (!active) return;
    if (error) {
      onError?.(toError(error));
      return;
    }
    onValueChange(
      (data as unknown as TrackerListQueryRow[]).map((row) =>
        toTrackerListEntry(row, userId),
      ),
    );
  };

  void load();
  const channel = supabase
    .channel(`tracker-list:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tracker_members",
        filter: `user_id=eq.${userId}`,
      },
      () => void load(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "trackers" },
      () => void load(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "tracker_states" },
      () => void load(),
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
};

export const subscribeToSupabaseTrackerMeta = (
  trackerId: string,
  onValueChange: ValueCallback<TrackerMeta>,
  onError?: ErrorCallback,
): SupabaseTrackerSubscription => {
  const supabase = getSupabaseClient();
  let active = true;
  const load = async () => {
    try {
      const meta = await getSupabaseTrackerMeta(trackerId);
      if (active) onValueChange(meta);
    } catch (error) {
      if (active)
        onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  void load();
  const channel = supabase
    .channel(`tracker-meta:${trackerId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "trackers",
        filter: `id=eq.${trackerId}`,
      },
      () => void load(),
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tracker_members",
        filter: `tracker_id=eq.${trackerId}`,
      },
      () => void load(),
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
};

export const subscribeToSupabaseTrackerState = (
  trackerId: string,
  onValueChange: ValueCallback<TrackerStateSnapshot>,
  onError?: ErrorCallback,
): SupabaseTrackerSubscription => {
  const supabase = getSupabaseClient();
  let active = true;
  const load = async () => {
    try {
      const snapshot = await getSupabaseTrackerState(trackerId);
      if (active) onValueChange(snapshot);
    } catch (error) {
      if (active)
        onError?.(error instanceof Error ? error : new Error(String(error)));
    }
  };

  void load();
  const channel = supabase
    .channel(`tracker-state:${trackerId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tracker_states",
        filter: `tracker_id=eq.${trackerId}`,
      },
      () => void load(),
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
};

export const updateSupabaseTrackerState = async (
  trackerId: string,
  expectedRevision: number,
  state: AppState,
): Promise<TrackerStateRow> => {
  const { data, error } = await getSupabaseClient().rpc(
    "update_tracker_state",
    {
      p_tracker_id: trackerId,
      p_expected_revision: expectedRevision,
      p_state: toPersistedTrackerState(state),
    },
  );
  if (error) throw toError(error);
  return data;
};

export interface SupabaseTrackerMetadataChanges {
  title?: string;
  playerNames?: string[];
  gameVersionId?: string;
  allPokemonAndItems?: boolean;
  rulesetId?: string | null;
}

export const updateSupabaseTrackerMetadata = async (
  trackerId: string,
  changes: SupabaseTrackerMetadataChanges,
): Promise<TrackerRow> => {
  const { data, error } = await getSupabaseClient()
    .from("trackers")
    .update({
      ...(changes.title !== undefined ? { title: changes.title } : {}),
      ...(changes.playerNames !== undefined
        ? { player_names: changes.playerNames }
        : {}),
      ...(changes.gameVersionId !== undefined
        ? { game_version_id: changes.gameVersionId }
        : {}),
      ...(changes.allPokemonAndItems !== undefined
        ? { all_pokemon_and_items: changes.allPokemonAndItems }
        : {}),
      ...(changes.rulesetId !== undefined
        ? { ruleset_id: changes.rulesetId }
        : {}),
    })
    .eq("id", trackerId)
    .select()
    .single();
  if (error) throw toError(error);
  return data;
};

export const setSupabaseTrackerVisibility = async (
  trackerId: string,
  isPublic: boolean,
): Promise<TrackerRow> => {
  const { data, error } = await getSupabaseClient().rpc(
    "set_tracker_visibility",
    {
      p_tracker_id: trackerId,
      p_is_public: isPublic,
    },
  );
  if (error) throw toError(error);
  return data;
};

export interface SupabaseTrackerInvite {
  email: string;
  role: Exclude<TrackerRole, "owner">;
}

export interface CreateSupabaseTrackerInput {
  title: string;
  playerNames: string[];
  gameVersionId: string;
  allPokemonAndItems: boolean;
  rulesetId: string;
  initialState: AppState;
  invites: SupabaseTrackerInvite[];
}

export const createSupabaseTracker = async ({
  title,
  playerNames,
  gameVersionId,
  allPokemonAndItems,
  rulesetId,
  initialState,
  invites,
}: CreateSupabaseTrackerInput): Promise<string> => {
  const { data, error } = await getSupabaseClient().rpc("create_tracker", {
    p_title: title,
    p_player_names: playerNames,
    p_game_version_id: gameVersionId,
    p_all_pokemon_and_items: allPokemonAndItems,
    p_ruleset_id: rulesetId,
    p_initial_state: toPersistedTrackerState(initialState),
    p_invites: invites as unknown as Json,
  });
  if (error) throw toError(error);
  return data;
};

export const inviteSupabaseTrackerMember = async (
  trackerId: string,
  email: string,
  role: Exclude<TrackerRole, "owner">,
): Promise<string> => {
  const { data, error } = await getSupabaseClient().rpc(
    "invite_tracker_member",
    {
      p_tracker_id: trackerId,
      p_email: email,
      p_role: role,
    },
  );
  if (error) throw toError(error);
  return data.user_id;
};

export const removeSupabaseTrackerMember = async (
  trackerId: string,
  userId: string,
): Promise<void> => {
  const { error } = await getSupabaseClient().rpc("remove_tracker_member", {
    p_tracker_id: trackerId,
    p_user_id: userId,
  });
  if (error) throw toError(error);
};

export const deleteSupabaseTracker = async (
  trackerId: string,
): Promise<void> => {
  const { error } = await getSupabaseClient().rpc("delete_tracker", {
    p_tracker_id: trackerId,
  });
  if (error) throw toError(error);
};

export const updateSupabaseRivalPreference = async (
  trackerId: string,
  userId: string,
  rivalKey: string,
  gender: RivalGender,
): Promise<void> => {
  const supabase = getSupabaseClient();
  const { data: membership, error: readError } = await supabase
    .from("tracker_members")
    .select("settings")
    .eq("tracker_id", trackerId)
    .eq("user_id", userId)
    .single();
  if (readError) throw toError(readError);

  const settings = asJsonObject(membership.settings);
  const rivalPreferences = asJsonObject(settings.rivalPreferences);
  const { error: writeError } = await supabase
    .from("tracker_members")
    .update({
      settings: {
        ...settings,
        rivalPreferences: { ...rivalPreferences, [rivalKey]: gender },
      },
    })
    .eq("tracker_id", trackerId)
    .eq("user_id", userId);
  if (writeError) throw toError(writeError);
};
