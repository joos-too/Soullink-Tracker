import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackerMeta } from "@/types";
import type { AuthenticatedUser } from "@/src/services/backend/auth";
import type { TrackerListEntry } from "@/src/services/repos/trackerRepository";
import i18n from "@/src/i18n";
import App from "@/src/App";

const backend = vi.hoisted(() => ({
  user: null as AuthenticatedUser | null,
  publicMeta: null as TrackerMeta | null,
  onList: undefined as ((entries: TrackerListEntry[]) => void) | undefined,
  deleteTracker: vi.fn(async () => {}),
  removeMember: vi.fn(async () => {}),
  getState: vi.fn(async () => null),
  unsubscribeState: vi.fn(),
  saveState: vi.fn(async () => {}),
}));
vi.mock("@/src/pokeapi", () => ({}));
vi.mock("@/src/hooks/useAuthSession", () => ({
  useAuthSession: () => ({ user: backend.user, loading: false }),
}));
vi.mock("@/src/hooks/useRulesets", () => ({ useRulesets: () => [] }));
vi.mock("@/src/services/repos/profileRepository", () => ({
  getDefaultDisplayName: () => "Owner",
  ensureUserProfile: async () => {},
  getUserProfilePreferences: async () => ({ displayName: "Owner" }),
}));
vi.mock("@/src/services/repos/trackerRepository", () => ({
  subscribeToTrackerList: (_uid: string, callback: typeof backend.onList) => {
    backend.onList = callback;
    return () => {};
  },
  subscribeToTrackerMeta: (
    _id: string,
    callback: (meta: TrackerMeta | null) => void,
  ) => {
    callback(backend.publicMeta);
    return () => {};
  },
  getTrackerState: backend.getState,
  saveTrackerState: backend.saveState,
  subscribeToTrackerState: () => backend.unsubscribeState,
  TrackerStateConflictError: class extends Error {},
}));
vi.mock("@/src/services/trackers", () => ({
  deleteTracker: backend.deleteTracker,
  removeMemberFromTracker: backend.removeMember,
  TrackerOperationError: class extends Error {},
}));
vi.mock("@/src/components/pages/HomePage", () => ({
  default: () => <h1>Tracker overview</h1>,
}));
vi.mock("@/src/components/pages/SettingsPage", () => ({
  default: (props: {
    onRequestDeleteTracker: () => void;
    onRemoveMember: (uid: string) => Promise<void>;
  }) => (
    <>
      <h1>Tracker settings</h1>
      <button onClick={props.onRequestDeleteTracker}>Delete tracker</button>
      <button
        onClick={() => void props.onRemoveMember("owner").catch(() => {})}
      >
        Leave tracker
      </button>
      <button onClick={() => void props.onRemoveMember("other")}>
        Remove other member
      </button>
    </>
  ),
}));
vi.mock("@/src/components/modals/DeleteTrackerModal", () => ({
  default: (props: {
    isOpen: boolean;
    onConfirm: () => void;
    error: string | null;
  }) =>
    props.isOpen ? (
      <>
        <button onClick={props.onConfirm}>Confirm delete</button>
        {props.error && <p role="alert">{props.error}</p>}
      </>
    ) : null,
}));
vi.mock("@/src/components/modals/CreateTrackerModal", () => ({
  default: () => null,
}));

const tracker: TrackerMeta = {
  id: "30000000-0000-0000-0000-000000000001",
  title: "Test tracker",
  createdBy: "owner",
  createdAt: 1,
  gameVersionId: "gen1_rb",
  playerNames: ["Red", "Blue"],
  members: {
    owner: {
      uid: "owner",
      displayName: "Owner",
      email: "owner@example.com",
      role: "owner",
      addedAt: 1,
    },
  },
};

async function openSettings(meta = tracker) {
  window.history.replaceState({}, "", `/tracker/${meta.id}?panel=settings`);
  render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>,
  );
  await waitFor(() => expect(backend.onList).toBeDefined());
  act(() => backend.onList?.([{ meta, summary: null }]));
  // The first visit imports the full editor; allow for concurrent test workers.
  await screen.findByRole(
    "heading",
    { name: "Tracker settings" },
    { timeout: 5000 },
  );
}

describe("tracker exit navigation", () => {
  beforeEach(async () => {
    localStorage.clear();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    backend.onList = undefined;
    backend.user = { uid: "owner", email: "owner@example.com", language: "en" };
    backend.publicMeta = null;
    backend.deleteTracker.mockReset();
    backend.removeMember.mockReset();
    backend.getState.mockClear();
    backend.unsubscribeState.mockClear();
    backend.saveState.mockClear();
    await i18n.changeLanguage("en");
  });

  it.each(["delete", "leave"])(
    "stays on home after %s from settings",
    async (operation) => {
      await openSettings();
      const user = userEvent.setup();
      if (operation === "delete") {
        await user.click(
          screen.getByRole("button", { name: "Delete tracker" }),
        );
        await user.click(
          screen.getByRole("button", { name: "Confirm delete" }),
        );
      } else {
        await user.click(screen.getByRole("button", { name: "Leave tracker" }));
      }
      await screen.findByRole("heading", { name: "Tracker overview" });
      act(() => backend.onList?.([]));
      expect(window.location.pathname).toBe("/");
      expect(window.location.search).toBe("");
      expect(
        screen.getByRole("heading", { name: "Tracker overview" }),
      ).toBeVisible();
      expect(localStorage.getItem("soullink:lastSupabaseTrackerId")).toBeNull();
      expect(backend.unsubscribeState).toHaveBeenCalled();
    },
  );

  it.each(["delete", "leave"])(
    "stays home when realtime arrives before %s completes",
    async (operation) => {
      let complete!: () => void;
      const pending = new Promise<void>((resolve) => {
        complete = resolve;
      });
      (operation === "delete"
        ? backend.deleteTracker
        : backend.removeMember
      ).mockReturnValueOnce(pending);
      await openSettings();
      const user = userEvent.setup();
      if (operation === "delete") {
        await user.click(
          screen.getByRole("button", { name: "Delete tracker" }),
        );
        await user.click(
          screen.getByRole("button", { name: "Confirm delete" }),
        );
      } else {
        await user.click(screen.getByRole("button", { name: "Leave tracker" }));
      }
      act(() => backend.onList?.([]));
      await act(async () => {
        complete();
        await pending;
      });
      await screen.findByRole("heading", { name: "Tracker overview" });
      expect(window.location.pathname).toBe("/");
    },
  );

  it.each(["delete", "leave"])(
    "keeps settings open when %s fails",
    async (operation) => {
      (operation === "delete"
        ? backend.deleteTracker
        : backend.removeMember
      ).mockRejectedValueOnce(new Error("Operation failed"));
      await openSettings();
      const user = userEvent.setup();
      if (operation === "delete") {
        await user.click(
          screen.getByRole("button", { name: "Delete tracker" }),
        );
        await user.click(
          screen.getByRole("button", { name: "Confirm delete" }),
        );
        expect(await screen.findByRole("alert")).toHaveTextContent(
          "Operation failed",
        );
      } else {
        await user.click(screen.getByRole("button", { name: "Leave tracker" }));
      }
      expect(
        screen.getByRole("heading", { name: "Tracker settings" }),
      ).toBeVisible();
      expect(window.location.pathname).toBe(`/tracker/${tracker.id}`);
      expect(window.location.search).toBe("?panel=settings");
    },
  );

  it("does not exit when removing another member", async () => {
    await openSettings();
    await userEvent.click(
      screen.getByRole("button", { name: "Remove other member" }),
    );
    expect(backend.removeMember).toHaveBeenCalledWith(tracker.id, "other");
    expect(
      screen.getByRole("heading", { name: "Tracker settings" }),
    ).toBeVisible();
    expect(window.location.pathname).toBe(`/tracker/${tracker.id}`);
  });

  it("lets a guest leave a public tracker without reopening it as a public viewer", async () => {
    const guestTracker: TrackerMeta = {
      ...tracker,
      isPublic: true,
      members: {},
      guests: { owner: { ...tracker.members.owner, role: "guest" } },
    };
    backend.publicMeta = guestTracker;
    await openSettings(guestTracker);
    await userEvent.click(
      screen.getByRole("button", { name: "Leave tracker" }),
    );
    await screen.findByRole("heading", { name: "Tracker overview" });
    expect(window.location.pathname).toBe("/");
    expect(backend.saveState).not.toHaveBeenCalled();
  });

  it("does not load a remembered tracker's state on home", async () => {
    localStorage.setItem("soullink:lastSupabaseTrackerId", tracker.id);
    window.history.replaceState({}, "", "/");
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );
    act(() => backend.onList?.([{ meta: tracker, summary: null }]));
    await screen.findByRole("heading", { name: "Tracker overview" });
    expect(backend.getState).not.toHaveBeenCalled();
  });

  it("shows not found for an invalid tracker URL without loading tracker state", async () => {
    window.history.replaceState({}, "", "/tracker/not-a-uuid");
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );
    expect(await screen.findByText("Tracker not found.")).toBeVisible();
    expect(backend.getState).not.toHaveBeenCalled();
  });

  it("allows anonymous public viewing without opening settings or writing data", async () => {
    backend.user = null;
    backend.publicMeta = { ...tracker, isPublic: true };
    window.history.replaceState(
      {},
      "",
      `/tracker/${tracker.id}?panel=settings`,
    );
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );
    await waitFor(() =>
      expect(backend.getState).toHaveBeenCalledWith(tracker.id),
    );
    expect(await screen.findByText("Test tracker")).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Tracker settings" }),
    ).not.toBeInTheDocument();
    expect(backend.saveState).not.toHaveBeenCalled();
  });
});
