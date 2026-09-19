import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { AppState } from "@/types";
import { createInitialState } from "@/src/services/init.ts";
import {
  acceptTrackerStateSnapshot,
  fetchTrackerStateSnapshot,
  getTrackerState,
  saveTrackerState,
  subscribeToTrackerState,
  TrackerStateConflictError,
} from "@/src/services/repos/trackerRepository.ts";

export type TrackerRealtimeStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "resyncing"
  | "resync-error";

export interface UseActiveTrackerOptions {
  activeTrackerId: string | null;
  userId?: string;
  gameVersionId?: string;
  canLoad: boolean;
  canWrite: boolean;
  data: AppState;
  setData: Dispatch<SetStateAction<AppState>>;
  coerceState: (incoming: unknown, base: AppState) => AppState;
  debounceMs: number;
}

export interface ActiveTrackerController {
  dataLoaded: boolean;
  stateConflict: boolean;
  realtimeStatus: TrackerRealtimeStatus;
  reloadAfterConflict: () => Promise<void>;
  retryRealtimeSync: () => void;
  discardPendingWrites: () => void;
}

export const useActiveTracker = ({
  activeTrackerId,
  userId,
  gameVersionId,
  canLoad,
  canWrite,
  data,
  setData,
  coerceState,
  debounceMs,
}: UseActiveTrackerOptions): ActiveTrackerController => {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [stateConflict, setStateConflict] = useState(false);
  const [realtimeStatus, setRealtimeStatus] =
    useState<TrackerRealtimeStatus>("idle");
  const skipNextWriteRef = useRef(false);
  const pendingWriteRef = useRef<Promise<void>>(Promise.resolve());
  const pendingWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const writeSessionRef = useRef(0);
  const isHydratingRef = useRef(true);
  const pendingWriteTaskRef = useRef<(() => void) | null>(null);
  const dirtyRef = useRef(false);
  const editVersionRef = useRef(0);
  const stateConflictRef = useRef(false);
  const saveFailedRef = useRef(false);
  const realtimeAttemptRef = useRef(0);
  const latestDataRef = useRef(data);
  latestDataRef.current = data;
  const canWriteRef = useRef(canWrite);
  canWriteRef.current = canWrite;

  const clearPendingWriteTimer = useCallback(() => {
    if (!pendingWriteTimerRef.current) return;
    clearTimeout(pendingWriteTimerRef.current);
    pendingWriteTimerRef.current = null;
  }, []);

  const discardPendingWrites = useCallback(() => {
    clearPendingWriteTimer();
    pendingWriteTaskRef.current = null;
    dirtyRef.current = false;
  }, [clearPendingWriteTimer]);

  const flushPendingWrite = useCallback(() => {
    clearPendingWriteTimer();
    const task = pendingWriteTaskRef.current;
    pendingWriteTaskRef.current = null;
    task?.();
  }, [clearPendingWriteTimer]);

  const enqueueSave = useCallback(
    (
      trackerId: string,
      stateToPersist: AppState,
      session: number,
      editVersion: number,
    ) => {
      pendingWriteRef.current = pendingWriteRef.current
        .then(async () => {
          if (stateConflictRef.current) return;
          await saveTrackerState(trackerId, stateToPersist);
          if (
            writeSessionRef.current === session &&
            editVersionRef.current === editVersion
          ) {
            dirtyRef.current = false;
            saveFailedRef.current = false;
          }
        })
        .catch((error) => {
          if (
            error instanceof TrackerStateConflictError &&
            writeSessionRef.current === session
          ) {
            stateConflictRef.current = true;
            setStateConflict(true);
            return;
          }
          if (writeSessionRef.current === session) saveFailedRef.current = true;
          console.error("Tracker state write failed", error);
        });
    },
    [],
  );

  // Route navigation unmounts the editor. Persist its last debounced edit before
  // the subscription and autosave effects clean up. Delete/leave discard it first.
  useEffect(
    () => () => {
      flushPendingWrite();
    },
    [flushPendingWrite],
  );

  const reloadAfterConflict = useCallback(async () => {
    if (!activeTrackerId) return;
    const attempt = ++realtimeAttemptRef.current;
    try {
      await pendingWriteRef.current;
      const snapshot = await fetchTrackerStateSnapshot(activeTrackerId);
      if (attempt !== realtimeAttemptRef.current) return;
      if (snapshot) {
        acceptTrackerStateSnapshot(activeTrackerId, snapshot);
        skipNextWriteRef.current = true;
        dirtyRef.current = false;
        saveFailedRef.current = false;
        setData((previous) => coerceState(snapshot.state, previous));
      } else {
        throw new Error("Tracker state was not found.");
      }
      stateConflictRef.current = false;
      setStateConflict(false);
    } catch (error) {
      console.error("Failed to reload tracker after state conflict", error);
    }
  }, [activeTrackerId, coerceState, setData]);

  const reconcileTracker = useCallback(
    async (trackerId: string, session: number, attempt: number) => {
      setRealtimeStatus("resyncing");
      const hadPendingTask = pendingWriteTaskRef.current !== null;
      flushPendingWrite();
      await pendingWriteRef.current;
      if (
        writeSessionRef.current !== session ||
        realtimeAttemptRef.current !== attempt
      )
        return;

      // A failed offline save has already consumed its debounce task. Retry
      // the latest local state here, for both SUBSCRIBED and manual retry.
      if (
        !hadPendingTask &&
        dirtyRef.current &&
        canWriteRef.current &&
        !stateConflictRef.current
      ) {
        clearPendingWriteTimer();
        pendingWriteTaskRef.current = null;
        enqueueSave(
          trackerId,
          latestDataRef.current,
          session,
          editVersionRef.current,
        );
        await pendingWriteRef.current;
        if (
          writeSessionRef.current !== session ||
          realtimeAttemptRef.current !== attempt
        )
          return;
      }
      if (stateConflictRef.current) {
        setRealtimeStatus("connected");
        return;
      }
      if (saveFailedRef.current) {
        setRealtimeStatus("resync-error");
        return;
      }
      if (dirtyRef.current) {
        // New edits made while awaiting a save remain owned by autosave.
        setRealtimeStatus("connected");
        return;
      }

      const versionBeforeFetch = editVersionRef.current;
      try {
        const snapshot = await fetchTrackerStateSnapshot(trackerId);
        if (
          writeSessionRef.current !== session ||
          realtimeAttemptRef.current !== attempt
        )
          return;
        if (editVersionRef.current !== versionBeforeFetch || dirtyRef.current) {
          setRealtimeStatus("connected");
          return;
        }
        if (snapshot) {
          acceptTrackerStateSnapshot(trackerId, snapshot);
          skipNextWriteRef.current = true;
          setData((previous) => coerceState(snapshot.state, previous));
        }
        setRealtimeStatus("connected");
      } catch (error) {
        if (
          writeSessionRef.current !== session ||
          realtimeAttemptRef.current !== attempt
        )
          return;
        console.error("Failed to resynchronize tracker", error);
        setRealtimeStatus("resync-error");
      }
    },
    [
      coerceState,
      flushPendingWrite,
      clearPendingWriteTimer,
      enqueueSave,
      setData,
    ],
  );

  const retryRealtimeSync = useCallback(() => {
    if (!activeTrackerId) return;
    const attempt = ++realtimeAttemptRef.current;
    void reconcileTracker(activeTrackerId, writeSessionRef.current, attempt);
  }, [activeTrackerId, reconcileTracker]);

  useEffect(() => {
    isHydratingRef.current = true;

    if (!canLoad) {
      setData(createInitialState());
      setDataLoaded(false);
      isHydratingRef.current = false;
      setRealtimeStatus("idle");
      return;
    }

    if (!activeTrackerId) {
      setData(createInitialState());
      setDataLoaded(true);
      isHydratingRef.current = false;
      setRealtimeStatus("idle");
      return;
    }

    setRealtimeStatus("connecting");

    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    let initialSnapshotApplied = false;
    const markInitialSnapshot = () => {
      if (initialSnapshotApplied || cancelled) return;
      initialSnapshotApplied = true;
      isHydratingRef.current = false;
      setDataLoaded(true);
    };

    void (async () => {
      try {
        const storedState = await getTrackerState(activeTrackerId);
        if (cancelled) return;
        if (storedState) {
          skipNextWriteRef.current = true;
          dirtyRef.current = false;
          setData((previous) => coerceState(storedState, previous));
        } else {
          setData(createInitialState(gameVersionId));
        }
        markInitialSnapshot();
      } catch (error) {
        if (cancelled) return;
        console.error("Tracker state fetch failed", error);
        setData(createInitialState(gameVersionId));
        markInitialSnapshot();
      } finally {
        if (!cancelled) {
          unsubscribe = subscribeToTrackerState(
            activeTrackerId,
            (liveState) => {
              if (cancelled) return;
              if (dirtyRef.current || stateConflictRef.current) return false;
              if (liveState) {
                skipNextWriteRef.current = true;
                setData((previous) => coerceState(liveState, previous));
              }
              markInitialSnapshot();
              return true;
            },
            (error) => {
              console.error("Tracker state listener error", error);
            },
            (status, error) => {
              if (cancelled) return;
              if (status === "disconnected") {
                realtimeAttemptRef.current += 1;
                if (error)
                  console.error("Tracker realtime connection lost", error);
                setRealtimeStatus("disconnected");
                return;
              }
              const attempt = ++realtimeAttemptRef.current;
              void reconcileTracker(
                activeTrackerId,
                writeSessionRef.current,
                attempt,
              );
            },
          );
        }
      }
    })();

    return () => {
      realtimeAttemptRef.current += 1;
      cancelled = true;
      unsubscribe?.();
      isHydratingRef.current = true;
      setDataLoaded(false);
    };
  }, [
    activeTrackerId,
    canLoad,
    coerceState,
    gameVersionId,
    reconcileTracker,
    setData,
  ]);

  useEffect(() => {
    writeSessionRef.current += 1;
    discardPendingWrites();
    pendingWriteRef.current = Promise.resolve();
    dirtyRef.current = false;
    saveFailedRef.current = false;
    stateConflictRef.current = false;
    realtimeAttemptRef.current += 1;
    setStateConflict(false);
  }, [activeTrackerId, discardPendingWrites, userId]);

  useEffect(() => {
    if (
      !canWrite ||
      !dataLoaded ||
      !activeTrackerId ||
      isHydratingRef.current ||
      stateConflict
    ) {
      return;
    }

    if (skipNextWriteRef.current) {
      skipNextWriteRef.current = false;
      return;
    }

    clearPendingWriteTimer();
    dirtyRef.current = true;
    saveFailedRef.current = false;
    const editVersion = ++editVersionRef.current;
    const trackerId = activeTrackerId;
    const session = writeSessionRef.current;
    const stateToPersist = data;

    pendingWriteTaskRef.current = () => {
      enqueueSave(trackerId, stateToPersist, session, editVersion);
    };
    pendingWriteTimerRef.current = setTimeout(() => {
      pendingWriteTimerRef.current = null;
      pendingWriteTaskRef.current?.();
      pendingWriteTaskRef.current = null;
    }, debounceMs);

    return () => {
      clearPendingWriteTimer();
      pendingWriteTaskRef.current = null;
    };
  }, [
    activeTrackerId,
    canWrite,
    clearPendingWriteTimer,
    discardPendingWrites,
    data,
    dataLoaded,
    debounceMs,
    enqueueSave,
    stateConflict,
  ]);

  return {
    dataLoaded,
    realtimeStatus,
    stateConflict,
    reloadAfterConflict,
    retryRealtimeSync,
    discardPendingWrites,
  };
};
