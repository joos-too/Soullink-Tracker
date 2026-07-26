import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  AppState,
  LevelCap,
  RivalCap,
  TrackerMeta,
  TrackerSummary,
} from "@/types";
import { isSupabaseBackend } from "@/src/services/backend/backend.ts";
import { getDefaultDisplayName } from "@/src/services/repos/profileRepository.ts";
import {
  subscribeToTrackerList,
  subscribeToTrackerMeta,
  subscribeToTrackerState,
  subscribeToUserTrackerIds,
} from "@/src/services/repos/trackerRepository.ts";
import { computeWeightedProgress } from "@/src/utils/progressWeights.ts";

const normalizeTrackerMeta = (
  trackerId: string,
  meta: TrackerMeta,
): TrackerMeta => ({
  ...meta,
  id: trackerId,
  members: Object.fromEntries(
    Object.entries(meta.members ?? {}).map(([uid, member]) => [
      uid,
      {
        ...member,
        uid,
        displayName:
          typeof member.displayName === "string" && member.displayName.trim()
            ? member.displayName.trim()
            : getDefaultDisplayName(member.email),
      },
    ]),
  ),
  guests: Object.fromEntries(
    Object.entries(meta.guests ?? {}).map(([uid, member]) => [
      uid,
      {
        ...member,
        uid,
        displayName:
          typeof member.displayName === "string" && member.displayName.trim()
            ? member.displayName.trim()
            : getDefaultDisplayName(member.email),
      },
    ]),
  ),
  allPokemonAndItems: meta.allPokemonAndItems === true ? true : undefined,
});

const computeTrackerSummary = (
  state?: Partial<AppState> | null,
): TrackerSummary => {
  const teamCount = Array.isArray(state?.team) ? state.team.length : 0;
  const boxCount = Array.isArray(state?.box) ? state.box.length : 0;
  const graveyardCount = Array.isArray(state?.graveyard)
    ? state.graveyard.length
    : 0;
  const runs = Number(state?.stats?.runs ?? 0) || 0;
  const levelCaps = Array.isArray(state?.levelCaps)
    ? (state.levelCaps as LevelCap[])
    : [];
  const rivalCaps = Array.isArray(state?.rivalCaps)
    ? (state.rivalCaps as RivalCap[])
    : [];
  const doneCapsCount = levelCaps.filter((cap) => cap?.done).length;
  const { pct: progressPct } = computeWeightedProgress(levelCaps, rivalCaps);
  const deathCount = Array.isArray(state?.stats?.deaths)
    ? state.stats.deaths.reduce((sum, value) => sum + Number(value || 0), 0)
    : 0;

  return {
    teamCount,
    boxCount,
    graveyardCount,
    deathCount,
    runs,
    championDone: doneCapsCount > 12,
    doneCapsCount,
    progressPct,
  };
};

export interface TrackerListState {
  userTrackerIds: string[];
  trackerMetas: Record<string, TrackerMeta>;
  setTrackerMetas: Dispatch<SetStateAction<Record<string, TrackerMeta>>>;
  trackerSummaries: Record<string, TrackerSummary>;
  loading: boolean;
  upsertTrackerMeta: (trackerId: string, meta: TrackerMeta) => void;
  removeTrackerMeta: (trackerId: string) => void;
  removeTrackerLocally: (trackerId: string) => void;
}

export const useTrackerList = (
  userId?: string,
  activeTrackerId?: string | null,
): TrackerListState => {
  const [userTrackerIds, setUserTrackerIds] = useState<string[]>([]);
  const [trackerMetas, setTrackerMetas] = useState<Record<string, TrackerMeta>>(
    {},
  );
  const [trackerSummaries, setTrackerSummaries] = useState<
    Record<string, TrackerSummary>
  >({});
  const [loading, setLoading] = useState(false);
  const metaListenersRef = useRef<Map<string, () => void>>(new Map());
  const stateListenersRef = useRef<Map<string, () => void>>(new Map());

  const removeTrackerMeta = useCallback((trackerId: string) => {
    setTrackerMetas((previous) => {
      if (!(trackerId in previous)) return previous;
      const next = { ...previous };
      delete next[trackerId];
      return next;
    });
  }, []);

  const removeTrackerLocally = useCallback((trackerId: string) => {
    setUserTrackerIds((previous) =>
      previous.includes(trackerId)
        ? previous.filter((id) => id !== trackerId)
        : previous,
    );
    setTrackerMetas((previous) => {
      if (!(trackerId in previous)) return previous;
      const next = { ...previous };
      delete next[trackerId];
      return next;
    });
    setTrackerSummaries((previous) => {
      if (!(trackerId in previous)) return previous;
      const next = { ...previous };
      delete next[trackerId];
      return next;
    });
  }, []);

  const upsertTrackerMeta = useCallback(
    (trackerId: string, meta: TrackerMeta) => {
      setTrackerMetas((previous) => ({
        ...previous,
        [trackerId]: normalizeTrackerMeta(trackerId, meta),
      }));
    },
    [],
  );

  useEffect(() => {
    metaListenersRef.current.forEach((unsubscribe) => unsubscribe());
    metaListenersRef.current.clear();
    stateListenersRef.current.forEach((unsubscribe) => unsubscribe());
    stateListenersRef.current.clear();
    setUserTrackerIds([]);
    setTrackerMetas({});
    setTrackerSummaries({});

    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    if (isSupabaseBackend) {
      return subscribeToTrackerList(
        userId,
        (value) => {
          const entries = value ?? [];
          setUserTrackerIds(entries.map((entry) => entry.meta.id));
          setTrackerMetas(
            Object.fromEntries(
              entries.map(({ meta }) => [
                meta.id,
                normalizeTrackerMeta(meta.id, meta),
              ]),
            ),
          );
          setTrackerSummaries(
            Object.fromEntries(
              entries.map(({ meta, summary }) => [meta.id, summary]),
            ),
          );
          setLoading(false);
        },
        () => setLoading(false),
      );
    }

    return subscribeToUserTrackerIds(
      userId,
      (ids) => {
        setUserTrackerIds(ids ?? []);
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [userId]);

  useEffect(() => {
    if (!userId || isSupabaseBackend) return;

    const listeners = metaListenersRef.current;
    for (const [trackerId, unsubscribe] of listeners) {
      if (!userTrackerIds.includes(trackerId)) {
        unsubscribe();
        listeners.delete(trackerId);
        removeTrackerMeta(trackerId);
      }
    }

    userTrackerIds.forEach((trackerId) => {
      if (listeners.has(trackerId)) return;
      listeners.set(
        trackerId,
        subscribeToTrackerMeta(
          trackerId,
          (meta) => {
            if (meta) upsertTrackerMeta(trackerId, meta);
            else removeTrackerMeta(trackerId);
          },
          () => removeTrackerMeta(trackerId),
        ),
      );
    });
  }, [removeTrackerMeta, upsertTrackerMeta, userId, userTrackerIds]);

  useEffect(() => {
    if (!userId || isSupabaseBackend) return;

    const listeners = stateListenersRef.current;
    for (const [trackerId, unsubscribe] of listeners) {
      if (!userTrackerIds.includes(trackerId)) {
        unsubscribe();
        listeners.delete(trackerId);
        setTrackerSummaries((previous) => {
          const next = { ...previous };
          delete next[trackerId];
          return next;
        });
      }
    }

    userTrackerIds.forEach((trackerId) => {
      if (listeners.has(trackerId)) return;
      listeners.set(
        trackerId,
        subscribeToTrackerState(
          trackerId,
          (state) => {
            setTrackerSummaries((previous) => ({
              ...previous,
              [trackerId]: computeTrackerSummary(state),
            }));
          },
          () => {
            setTrackerSummaries((previous) => {
              const next = { ...previous };
              delete next[trackerId];
              return next;
            });
          },
        ),
      );
    });
  }, [userId, userTrackerIds]);

  useEffect(() => {
    if (
      !isSupabaseBackend ||
      !userId ||
      !activeTrackerId ||
      !userTrackerIds.includes(activeTrackerId)
    ) {
      return;
    }

    return subscribeToTrackerMeta(
      activeTrackerId,
      (meta) => {
        if (meta) upsertTrackerMeta(activeTrackerId, meta);
      },
      () => {},
    );
  }, [activeTrackerId, upsertTrackerMeta, userId, userTrackerIds]);

  useEffect(
    () => () => {
      metaListenersRef.current.forEach((unsubscribe) => unsubscribe());
      stateListenersRef.current.forEach((unsubscribe) => unsubscribe());
    },
    [],
  );

  return {
    userTrackerIds,
    trackerMetas,
    setTrackerMetas,
    trackerSummaries,
    loading,
    upsertTrackerMeta,
    removeTrackerMeta,
    removeTrackerLocally,
  };
};
