import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { TrackerMeta, TrackerSummary } from "@/types";
import { getDefaultDisplayName } from "@/src/services/repos/profileRepository.ts";
import {
  subscribeToTrackerList,
  subscribeToTrackerMeta,
} from "@/src/services/repos/trackerRepository.ts";

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
    setUserTrackerIds([]);
    setTrackerMetas({});
    setTrackerSummaries({});

    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
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
  }, [userId]);

  useEffect(() => {
    if (
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
