import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackerListEntry } from "@/src/services/repos/trackerRepository.ts";
import { useTrackerList } from "@/src/hooks/useTrackerList.ts";

const trackerRepositoryMock = vi.hoisted(() => ({
  onTrackerList: undefined as
    | ((entries: TrackerListEntry[] | null) => void)
    | undefined,
  unsubscribe: vi.fn(),
}));

vi.mock("@/src/services/backend/backend.ts", () => ({
  isSupabaseBackend: true,
}));

vi.mock("@/src/services/repos/profileRepository.ts", () => ({
  getDefaultDisplayName: (email?: string | null) => email ?? "User",
}));

vi.mock("@/src/services/repos/trackerRepository.ts", () => ({
  subscribeToTrackerList: (
    _userId: string,
    onValueChange: (entries: TrackerListEntry[] | null) => void,
  ) => {
    trackerRepositoryMock.onTrackerList = onValueChange;
    return trackerRepositoryMock.unsubscribe;
  },
  subscribeToTrackerMeta: vi.fn(() => vi.fn()),
  subscribeToTrackerState: vi.fn(() => vi.fn()),
  subscribeToUserTrackerIds: vi.fn(() => vi.fn()),
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
    trackerRepositoryMock.unsubscribe.mockClear();
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
