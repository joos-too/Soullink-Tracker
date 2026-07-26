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
  getTrackerState,
  saveTrackerState,
  subscribeToTrackerState,
  TrackerStateConflictError,
} from "@/src/services/repos/trackerRepository.ts";

export interface UseActiveTrackerOptions {
  activeTrackerId: string | null;
  userId?: string;
  gameVersionId?: string;
  canLoad: boolean;
  canWrite: boolean;
  isViewingPublicTracker: boolean;
  routeTrackerPendingSelection: boolean;
  routeTrackerKnownMissing: boolean;
  data: AppState;
  setData: Dispatch<SetStateAction<AppState>>;
  coerceState: (incoming: unknown, base: AppState) => AppState;
  debounceMs: number;
}

export interface ActiveTrackerController {
  dataLoaded: boolean;
  stateConflict: boolean;
  reloadAfterConflict: () => Promise<void>;
}

export const useActiveTracker = ({
  activeTrackerId,
  userId,
  gameVersionId,
  canLoad,
  canWrite,
  isViewingPublicTracker,
  routeTrackerPendingSelection,
  routeTrackerKnownMissing,
  data,
  setData,
  coerceState,
  debounceMs,
}: UseActiveTrackerOptions): ActiveTrackerController => {
  const [dataLoaded, setDataLoaded] = useState(false);
  const [stateConflict, setStateConflict] = useState(false);
  const skipNextWriteRef = useRef(false);
  const pendingWriteRef = useRef<Promise<void>>(Promise.resolve());
  const pendingWriteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const writeSessionRef = useRef(0);
  const isHydratingRef = useRef(true);

  const clearPendingWriteTimer = useCallback(() => {
    if (!pendingWriteTimerRef.current) return;
    clearTimeout(pendingWriteTimerRef.current);
    pendingWriteTimerRef.current = null;
  }, []);

  const reloadAfterConflict = useCallback(async () => {
    if (!activeTrackerId) return;
    try {
      const remoteState = await getTrackerState(activeTrackerId);
      if (remoteState) {
        skipNextWriteRef.current = true;
        setData((previous) => coerceState(remoteState, previous));
      }
      setStateConflict(false);
    } catch (error) {
      console.error("Failed to reload tracker after state conflict", error);
    }
  }, [activeTrackerId, coerceState, setData]);

  useEffect(() => {
    isHydratingRef.current = true;

    if (!canLoad) {
      setData(createInitialState());
      setDataLoaded(false);
      isHydratingRef.current = false;
      return;
    }

    if (!isViewingPublicTracker && routeTrackerPendingSelection) {
      setData(createInitialState());
      setDataLoaded(false);
      return;
    }

    if (!isViewingPublicTracker && routeTrackerKnownMissing) {
      setData(createInitialState());
      setDataLoaded(true);
      isHydratingRef.current = false;
      return;
    }

    if (!activeTrackerId) {
      setData(createInitialState());
      setDataLoaded(true);
      isHydratingRef.current = false;
      return;
    }

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
              if (liveState) {
                skipNextWriteRef.current = true;
                setData((previous) => coerceState(liveState, previous));
              }
              markInitialSnapshot();
            },
            (error) => {
              console.error("Tracker state listener error", error);
            },
          );
        }
      }
    })();

    return () => {
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
    isViewingPublicTracker,
    routeTrackerKnownMissing,
    routeTrackerPendingSelection,
    setData,
  ]);

  useEffect(() => {
    writeSessionRef.current += 1;
    clearPendingWriteTimer();
    pendingWriteRef.current = Promise.resolve();
    setStateConflict(false);
  }, [activeTrackerId, clearPendingWriteTimer, userId]);

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
    const trackerId = activeTrackerId;
    const session = writeSessionRef.current;
    const stateToPersist = data;

    pendingWriteTimerRef.current = setTimeout(() => {
      pendingWriteTimerRef.current = null;
      pendingWriteRef.current = pendingWriteRef.current
        .then(() => saveTrackerState(trackerId, stateToPersist))
        .catch((error) => {
          if (
            error instanceof TrackerStateConflictError &&
            writeSessionRef.current === session
          ) {
            setStateConflict(true);
            return;
          }
          console.error("Tracker state write failed", error);
        });
    }, debounceMs);

    return clearPendingWriteTimer;
  }, [
    activeTrackerId,
    canWrite,
    clearPendingWriteTimer,
    data,
    dataLoaded,
    debounceMs,
    stateConflict,
  ]);

  return { dataLoaded, stateConflict, reloadAfterConflict };
};
