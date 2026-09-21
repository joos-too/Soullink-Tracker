import type { AppState, TrackerMeta, TrackerSummary } from "@/types.ts";
import {
  getSupabaseTrackerState,
  setSupabaseTrackerVisibility,
  subscribeToSupabaseTrackerList,
  subscribeToSupabaseTrackerMeta,
  subscribeToSupabaseTrackerState,
  updateSupabaseTrackerMetadata,
  updateSupabaseTrackerState,
} from "@/src/services/repos/supabaseTrackerRepository.ts";

export { TrackerStateConflictError } from "@/src/services/repos/supabaseTrackerRepository.ts";
export type { RealtimeConnectionStatus } from "@/src/services/repos/supabaseTrackerRepository.ts";

export type RepositorySubscription = () => void;

type ValueCallback<T> = (value: T | null) => void;
type ErrorCallback = (error: Error) => void;
type StateValueCallback = (value: Partial<AppState> | null) => boolean | void;
type ConnectionStatusCallback = (
  status: "subscribed" | "disconnected",
  error?: Error,
) => void;

export interface VersionedTrackerState {
  state: Partial<AppState>;
  revision: number;
}

export interface TrackerListEntry {
  meta: TrackerMeta;
  summary: TrackerSummary;
}

const stateRevisions = new Map<string, number>();

export const subscribeToTrackerList = (
  userId: string,
  onValueChange: ValueCallback<TrackerListEntry[]>,
  onError?: ErrorCallback,
): RepositorySubscription =>
  subscribeToSupabaseTrackerList(userId, onValueChange, onError);

export const subscribeToTrackerMeta = (
  trackerId: string,
  onValueChange: ValueCallback<TrackerMeta>,
  onError?: ErrorCallback,
): RepositorySubscription =>
  subscribeToSupabaseTrackerMeta(trackerId, onValueChange, onError);

export const subscribeToTrackerState = (
  trackerId: string,
  onValueChange: StateValueCallback,
  onError?: ErrorCallback,
  onConnectionStatusChange?: ConnectionStatusCallback,
): RepositorySubscription =>
  subscribeToSupabaseTrackerState(
    trackerId,
    (snapshot) => {
      if (!snapshot) {
        stateRevisions.delete(trackerId);
        onValueChange(null);
        return;
      }
      const accepted = onValueChange(snapshot.state);
      if (accepted !== false) stateRevisions.set(trackerId, snapshot.revision);
    },
    onError,
    onConnectionStatusChange,
  );

export const fetchTrackerStateSnapshot = async (
  trackerId: string,
): Promise<VersionedTrackerState | null> => {
  const snapshot = await getSupabaseTrackerState(trackerId);
  if (!snapshot) return null;
  return { state: snapshot.state, revision: snapshot.revision };
};

export const acceptTrackerStateSnapshot = (
  trackerId: string,
  snapshot: VersionedTrackerState,
): void => {
  stateRevisions.set(trackerId, snapshot.revision);
};

export const getTrackerState = async (
  trackerId: string,
): Promise<Partial<AppState> | null> => {
  const snapshot = await getSupabaseTrackerState(trackerId);
  if (!snapshot) return null;
  stateRevisions.set(trackerId, snapshot.revision);
  return snapshot.state;
};

export const saveTrackerState = async (
  trackerId: string,
  state: AppState,
): Promise<void> => {
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
  await updateSupabaseTrackerMetadata(trackerId, changes);
};

export const setTrackerVisibility = async (
  trackerId: string,
  isPublic: boolean,
): Promise<void> => {
  await setSupabaseTrackerVisibility(trackerId, isPublic);
};
