export const LAST_TRACKER_STORAGE_KEY = "soullink:lastSupabaseTrackerId";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isTrackerUuid = (value: string | null): value is string =>
  Boolean(value && UUID_PATTERN.test(value));

export const getInitialActiveTrackerId = (): string | null => {
  if (typeof window === "undefined") return null;

  const storedTrackerId = window.localStorage.getItem(LAST_TRACKER_STORAGE_KEY);
  if (!isTrackerUuid(storedTrackerId)) {
    window.localStorage.removeItem(LAST_TRACKER_STORAGE_KEY);
    return null;
  }
  return storedTrackerId;
};
