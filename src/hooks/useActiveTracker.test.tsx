import { useState } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState } from "@/types";
import { createInitialState } from "@/src/services/init";
import { useActiveTracker } from "./useActiveTracker";

const repository = vi.hoisted(() => ({
  get: vi.fn<() => Promise<AppState | null>>(),
  fetch: vi.fn(),
  accept: vi.fn(),
  save: vi.fn(async () => {}),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  ConflictError: class TrackerStateConflictError extends Error {},
}));
vi.mock("@/src/services/repos/trackerRepository", () => ({
  acceptTrackerStateSnapshot: repository.accept,
  fetchTrackerStateSnapshot: repository.fetch,
  getTrackerState: repository.get,
  saveTrackerState: repository.save,
  subscribeToTrackerState: repository.subscribe,
  TrackerStateConflictError: repository.ConflictError,
}));

const coerceState = (incoming: unknown) => incoming as AppState;
const initialState = createInitialState();

function useEditor(canWrite = true, debounceMs = 10000) {
  const [data, setData] = useState(initialState);
  const controller = useActiveTracker({
    activeTrackerId: "tracker-id",
    userId: "user-id",
    canLoad: true,
    canWrite,
    data,
    setData,
    coerceState,
    debounceMs,
  });
  return { ...controller, data, setData };
}

describe("tracker editor lifecycle", () => {
  beforeEach(() => {
    repository.get.mockReset().mockResolvedValue(initialState);
    repository.fetch
      .mockReset()
      .mockResolvedValue({ state: initialState, revision: 2 });
    repository.accept.mockClear();
    repository.save.mockReset().mockResolvedValue(undefined);
    repository.subscribe.mockReset().mockReturnValue(repository.unsubscribe);
    repository.unsubscribe.mockClear();
  });

  it("flushes the last debounced edit when navigation unmounts the editor", async () => {
    const { result, unmount } = renderHook(() => useEditor());
    await waitFor(() => expect(result.current.dataLoaded).toBe(true));
    const edited = { ...initialState, rules: ["Edited rule"] };
    act(() => result.current.setData(edited));
    expect(repository.save).not.toHaveBeenCalled();
    unmount();
    await waitFor(() =>
      expect(repository.save).toHaveBeenCalledWith("tracker-id", edited),
    );
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("discards the pending edit when deleting or leaving", async () => {
    const { result, unmount } = renderHook(() => useEditor());
    await waitFor(() => expect(result.current.dataLoaded).toBe(true));
    act(() =>
      result.current.setData({ ...initialState, rules: ["Edited rule"] }),
    );
    act(() => result.current.discardPendingWrites());
    await act(async () => unmount());
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("does not write for a read-only viewer", async () => {
    const { result, unmount } = renderHook(() => useEditor(false));
    await waitFor(() => expect(result.current.dataLoaded).toBe(true));
    await act(async () => unmount());
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("does not subscribe when an initial fetch completes after unmount", async () => {
    let complete!: (state: AppState) => void;
    const pending = new Promise<AppState>((resolve) => {
      complete = resolve;
    });
    repository.get.mockReturnValueOnce(pending);
    const { unmount } = renderHook(() => useEditor());
    unmount();
    await act(async () => {
      complete(initialState);
      await pending;
    });
    expect(repository.subscribe).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
  });

  it("reports a lost connection without blocking offline edits", async () => {
    const { result } = renderHook(() => useEditor(true, 0));
    await waitFor(() => expect(repository.subscribe).toHaveBeenCalled());
    const onStatus = repository.subscribe.mock.calls[0][3];

    act(() => onStatus("disconnected"));
    expect(result.current.realtimeStatus).toBe("disconnected");

    const edited = { ...initialState, rules: ["Offline edit"] };
    act(() => result.current.setData(edited));
    await waitFor(() =>
      expect(repository.save).toHaveBeenCalledWith("tracker-id", edited),
    );
  });

  it("refreshes the server snapshot after subscribing", async () => {
    const refreshed = { ...initialState, rules: ["Server state"] };
    repository.fetch.mockResolvedValueOnce({ state: refreshed, revision: 3 });
    const { result } = renderHook(() => useEditor());
    await waitFor(() => expect(repository.subscribe).toHaveBeenCalled());
    const onStatus = repository.subscribe.mock.calls[0][3];

    act(() => onStatus("subscribed"));

    await waitFor(() =>
      expect(result.current.realtimeStatus).toBe("connected"),
    );
    expect(result.current.data).toEqual(refreshed);
    expect(repository.accept).toHaveBeenCalledWith("tracker-id", {
      state: refreshed,
      revision: 3,
    });
  });

  it("keeps local state after a failed offline save and retries it", async () => {
    repository.save
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useEditor(true, 0));
    await waitFor(() => expect(repository.subscribe).toHaveBeenCalled());
    const onStatus = repository.subscribe.mock.calls[0][3];
    act(() => onStatus("disconnected"));

    const edited = { ...initialState, rules: ["Keep me"] };
    act(() => result.current.setData(edited));
    await waitFor(() => expect(repository.save).toHaveBeenCalledTimes(1));
    act(() => onStatus("subscribed"));
    await waitFor(() =>
      expect(result.current.realtimeStatus).toBe("resync-error"),
    );
    expect(result.current.data).toEqual(edited);

    act(() => result.current.retryRealtimeSync());
    await waitFor(() => expect(repository.save).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(result.current.realtimeStatus).toBe("connected"),
    );
  });

  it("keeps the conflict outcome when an offline edit is stale", async () => {
    repository.save.mockRejectedValueOnce(new repository.ConflictError());
    const serverState = { ...initialState, rules: ["Newer server state"] };
    repository.get
      .mockResolvedValueOnce(initialState)
      .mockResolvedValueOnce(serverState);
    const { result } = renderHook(() => useEditor(true, 0));
    await waitFor(() => expect(repository.subscribe).toHaveBeenCalled());
    const onStatus = repository.subscribe.mock.calls[0][3];
    act(() => onStatus("disconnected"));

    act(() =>
      result.current.setData({ ...initialState, rules: ["Offline edit"] }),
    );
    await waitFor(() => expect(result.current.stateConflict).toBe(true));
    act(() => onStatus("subscribed"));
    await waitFor(() =>
      expect(result.current.realtimeStatus).toBe("connected"),
    );
    expect(result.current.stateConflict).toBe(true);
    expect(repository.fetch).not.toHaveBeenCalled();

    await act(async () => result.current.reloadAfterConflict());
    expect(result.current.data).toEqual(serverState);
    expect(result.current.stateConflict).toBe(false);
  });
});
