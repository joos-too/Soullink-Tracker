import { useState } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppState } from "@/types";
import { createInitialState } from "@/src/services/init";
import { useActiveTracker } from "./useActiveTracker";

const repository = vi.hoisted(() => ({
  get: vi.fn<() => Promise<AppState | null>>(),
  save: vi.fn(async () => {}),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock("@/src/services/repos/trackerRepository", () => ({
  getTrackerState: repository.get,
  saveTrackerState: repository.save,
  subscribeToTrackerState: repository.subscribe,
  TrackerStateConflictError: class extends Error {},
}));

const coerceState = (incoming: unknown) => incoming as AppState;
const initialState = createInitialState();

function useEditor(canWrite = true) {
  const [data, setData] = useState(initialState);
  const controller = useActiveTracker({
    activeTrackerId: "tracker-id",
    userId: "user-id",
    canLoad: true,
    canWrite,
    data,
    setData,
    coerceState,
    debounceMs: 10000,
  });
  return { ...controller, data, setData };
}

describe("tracker editor lifecycle", () => {
  beforeEach(() => {
    repository.get.mockReset().mockResolvedValue(initialState);
    repository.save.mockClear();
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
});
