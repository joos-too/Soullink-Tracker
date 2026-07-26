import { get, onValue, ref, set, update } from "firebase/database";
import { db } from "@/src/firebaseConfig.ts";
import type { AppState, TrackerMeta, TrackerSummary } from "@/types.ts";
import { BACKEND } from "@/src/services/backend/backend.ts";
import {
  getSupabaseTrackerState,
  setSupabaseTrackerVisibility,
  subscribeToSupabaseTrackerList,
  subscribeToSupabaseTrackerMeta,
  subscribeToSupabaseTrackerState,
  subscribeToSupabaseUserTrackerIds,
  updateSupabaseTrackerMetadata,
  updateSupabaseTrackerState,
} from "@/src/services/repos/supabaseTrackerRepository.ts";

export { TrackerStateConflictError } from "@/src/services/repos/supabaseTrackerRepository.ts";

export type RepositorySubscription = () => void;

type ValueCallback<T> = (value: T | null) => void;
type ErrorCallback = (error: Error) => void;

export interface TrackerListEntry {
  meta: TrackerMeta;
  summary: TrackerSummary;
}

const stateRevisions = new Map<string, number>();

/**
 * Firebase implementation of the tracker repository.
 *
 * App components use this API rather than SDK primitives. The Supabase
 * implementation will retain these operations while using joined queries,
 * Postgres Changes, and revision-aware RPC writes.
 */
export const subscribeToUserTrackerIds = (
  userId: string,
  onValueChange: ValueCallback<string[]>,
  onError?: ErrorCallback,
): RepositorySubscription =>
  BACKEND === "supabase"
    ? subscribeToSupabaseUserTrackerIds(userId, onValueChange, onError)
    : onValue(
        ref(db, `userTrackers/${userId}`),
        (snapshot) => {
          onValueChange(snapshot.exists() ? Object.keys(snapshot.val()) : []);
        },
        (error) => onError?.(error),
      );

export const subscribeToTrackerList = (
  userId: string,
  onValueChange: ValueCallback<TrackerListEntry[]>,
  onError?: ErrorCallback,
): RepositorySubscription => {
  if (BACKEND === "supabase") {
    return subscribeToSupabaseTrackerList(userId, onValueChange, onError);
  }

  return onValue(
    ref(db, `userTrackers/${userId}`),
    async (snapshot) => {
      const trackerIds = snapshot.exists() ? Object.keys(snapshot.val()) : [];
      const entries = await Promise.all(
        trackerIds.map(async (trackerId) => {
          const [metaSnapshot, stateSnapshot] = await Promise.all([
            get(ref(db, `trackers/${trackerId}/meta`)),
            get(ref(db, `trackers/${trackerId}/state`)),
          ]);
          return {
            meta: metaSnapshot.val() as TrackerMeta,
            summary: {
              teamCount: Array.isArray(stateSnapshot.val()?.team)
                ? stateSnapshot.val().team.length
                : 0,
              boxCount: Array.isArray(stateSnapshot.val()?.box)
                ? stateSnapshot.val().box.length
                : 0,
              graveyardCount: Array.isArray(stateSnapshot.val()?.graveyard)
                ? stateSnapshot.val().graveyard.length
                : 0,
              deathCount: 0,
              runs: Number(stateSnapshot.val()?.stats?.runs ?? 0),
              championDone: false,
              doneCapsCount: 0,
              progressPct: 0,
            },
          };
        }),
      );
      onValueChange(entries);
    },
    (error) => onError?.(error),
  );
};

export const subscribeToTrackerMeta = (
  trackerId: string,
  onValueChange: ValueCallback<TrackerMeta>,
  onError?: ErrorCallback,
): RepositorySubscription =>
  BACKEND === "supabase"
    ? subscribeToSupabaseTrackerMeta(trackerId, onValueChange, onError)
    : onValue(
        ref(db, `trackers/${trackerId}/meta`),
        (snapshot) => onValueChange(snapshot.val() as TrackerMeta | null),
        (error) => onError?.(error),
      );

export const subscribeToTrackerState = (
  trackerId: string,
  onValueChange: ValueCallback<Partial<AppState>>,
  onError?: ErrorCallback,
): RepositorySubscription =>
  BACKEND === "supabase"
    ? subscribeToSupabaseTrackerState(
        trackerId,
        (snapshot) => {
          if (!snapshot) {
            stateRevisions.delete(trackerId);
            onValueChange(null);
            return;
          }
          stateRevisions.set(trackerId, snapshot.revision);
          onValueChange(snapshot.state);
        },
        onError,
      )
    : onValue(
        ref(db, `trackers/${trackerId}/state`),
        (snapshot) => onValueChange(snapshot.val() as Partial<AppState> | null),
        (error) => onError?.(error),
      );

export const getTrackerState = async (
  trackerId: string,
): Promise<Partial<AppState> | null> => {
  if (BACKEND === "supabase") {
    const snapshot = await getSupabaseTrackerState(trackerId);
    if (!snapshot) return null;
    stateRevisions.set(trackerId, snapshot.revision);
    return snapshot.state;
  }

  const snapshot = await get(ref(db, `trackers/${trackerId}/state`));
  return snapshot.val() as Partial<AppState> | null;
};

export const saveTrackerState = async (
  trackerId: string,
  state: AppState,
): Promise<void> => {
  if (BACKEND === "supabase") {
    let expectedRevision = stateRevisions.get(trackerId);
    if (expectedRevision === undefined) {
      const snapshot = await getSupabaseTrackerState(trackerId);
      if (!snapshot) throw new Error("Tracker state was not found.");
      expectedRevision = snapshot.revision;
    }
    const updatedState = await updateSupabaseTrackerState(
      trackerId,
      expectedRevision,
      state,
    );
    stateRevisions.set(trackerId, updatedState.revision);
    return;
  }

  await set(ref(db, `trackers/${trackerId}/state`), state);
};

export const updateTrackerMetadata = async (
  trackerId: string,
  changes: Partial<
    Pick<
      TrackerMeta,
      | "title"
      | "playerNames"
      | "gameVersionId"
      | "allPokemonAndItems"
      | "rulesetId"
    >
  >,
): Promise<void> => {
  if (BACKEND === "supabase") {
    await updateSupabaseTrackerMetadata(trackerId, changes);
    return;
  }

  await update(ref(db, `trackers/${trackerId}/meta`), changes);
};

export const setTrackerVisibility = async (
  trackerId: string,
  isPublic: boolean,
): Promise<void> => {
  if (BACKEND === "supabase") {
    await setSupabaseTrackerVisibility(trackerId, isPublic);
    return;
  }

  await update(ref(db, `trackers/${trackerId}/meta`), { isPublic });
};
