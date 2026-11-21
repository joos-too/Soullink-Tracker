import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackerListEntry } from "@/src/services/repos/trackerRepository.ts";
import { useTrackerList } from "@/src/hooks/useTrackerList.ts";

const trackerRepositoryMock = vi.hoisted(() => ({
  onTrackerList: undefined as
    ((entries: TrackerListEntry[] | null) => void) | undefined,
  unsubscribe: vi.fn(),
  unsubscribeMeta: vi.fn(),
  onError: undefined as (() => void) | undefined,
  subscribeMeta: vi.fn(),
}));

vi.mock("@/src/services/repos/profileRepository.ts", () => ({
  getDefaultDisplayName: (email?: string | null) => email ?? "User",
}));

vi.mock("@/src/services/repos/trackerRepository.ts", () => ({
  subscribeToTrackerList: (
    _userId: string,
    onValueChange: (entries: TrackerListEntry[] | null) => void,
    onError: () => void,
  ) => {
    trackerRepositoryMock.onTrackerList = onValueChange;
    trackerRepositoryMock.onError = onError;
    return trackerRepositoryMock.unsubscribe;
  },
  subscribeToTrackerMeta: trackerRepositoryMock.subscribeMeta,
  subscribeToTrackerState: vi.fn(() => vi.fn()),
}));

const trackerEntry: TrackerListEntry = {
  meta: {
    id: "30000000-0000-0000-0000-000000000001",
    title: "Test tracker",
    playerNames: ["Red", "Blue"],
    createdBy: "10000000-0000-0000-0000-000000000001",
    createdAt: 1,
    members: {},
    gameVersionId: "red-blue",
  },
  summary: {
    teamCount: 1,
    boxCount: 2,
    graveyardCount: 3,
    deathCount: 4,
    runs: 5,
    championDone: false,
    doneCapsCount: 6,
    progressPct: 7,
  },
};

describe("useTrackerList", () => {
  beforeEach(() => {
    trackerRepositoryMock.onTrackerList = undefined;
    trackerRepositoryMock.onError = undefined;
    trackerRepositoryMock.unsubscribe.mockClear();
    trackerRepositoryMock.unsubscribeMeta.mockClear();
    trackerRepositoryMock.subscribeMeta
      .mockReset()
      .mockReturnValue(trackerRepositoryMock.unsubscribeMeta);
  });

  it("hydrates summaries, refreshes them, and unsubscribes when the account changes", () => {
    const { result, rerender, unmount } = renderHook(
      ({ userId }) => useTrackerList(userId, trackerEntry.meta.id),
      { initialProps: { userId: "account-one" } },
    );
    expect(result.current.loading).toBe(true);
    expect(trackerRepositoryMock.subscribeMeta).not.toHaveBeenCalled();

    act(() => trackerRepositoryMock.onTrackerList?.([trackerEntry]));
    expect(result.current.loading).toBe(false);
    expect(result.current.trackerSummaries[trackerEntry.meta.id]).toEqual(
      trackerEntry.summary,
    );
    expect(trackerRepositoryMock.subscribeMeta).toHaveBeenCalledWith(
      trackerEntry.meta.id,
      expect.any(Function),
      expect.any(Function),
    );

    const updated = { ...trackerEntry.summary, runs: 6 };
    act(() =>
      trackerRepositoryMock.onTrackerList?.([
        { ...trackerEntry, summary: updated },
      ]),
    );
    expect(result.current.trackerSummaries[trackerEntry.meta.id]).toEqual(
      updated,
    );

    rerender({ userId: "account-two" });
    expect(result.current.userTrackerIds).toEqual([]);
    expect(result.current.trackerMetas).toEqual({});
    expect(result.current.trackerSummaries).toEqual({});
    expect(trackerRepositoryMock.unsubscribe).toHaveBeenCalledTimes(1);
    expect(trackerRepositoryMock.unsubscribeMeta).toHaveBeenCalled();
    unmount();
    expect(trackerRepositoryMock.unsubscribe).toHaveBeenCalledTimes(2);
  });

  it("ends loading when the initial subscription read fails", () => {
    const { result } = renderHook(() => useTrackerList("account-one"));
    expect(result.current.loading).toBe(true);
    act(() => trackerRepositoryMock.onError?.());
    expect(result.current.loading).toBe(false);
    expect(result.current.userTrackerIds).toEqual([]);
  });

  it("removes a deleted tracker from all local list state", () => {
    const { result } = renderHook(() =>
      useTrackerList("10000000-0000-0000-0000-000000000001", null),
    );

    act(() => trackerRepositoryMock.onTrackerList?.([trackerEntry]));

    expect(result.current.userTrackerIds).toEqual([trackerEntry.meta.id]);
    expect(result.current.trackerMetas[trackerEntry.meta.id]).toBeDefined();
    expect(result.current.trackerSummaries[trackerEntry.meta.id]).toBeDefined();

    act(() => result.current.removeTrackerLocally(trackerEntry.meta.id));

    expect(result.current.userTrackerIds).toEqual([]);
    expect(result.current.trackerMetas[trackerEntry.meta.id]).toBeUndefined();
    expect(
      result.current.trackerSummaries[trackerEntry.meta.id],
    ).toBeUndefined();
  });
});
