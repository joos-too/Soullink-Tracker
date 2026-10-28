import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/src/services/backend/auth";
import i18n from "@/src/i18n";
import { AppSessionProvider, useAppSession } from "./AppSession";
import SpriteImage from "@/src/components/other/SpriteImage";
import AppFooter from "@/src/components/layout/AppFooter";
import { CRY_VOLUME_STORAGE_KEY } from "@/src/contexts/CryVolumeContext.ts";

const mocks = vi.hoisted(() => ({
  authLoading: false,
  user: {
    uid: "first-user",
    email: "first@example.com",
    language: "en",
  } as AuthenticatedUser | null,
  getPreferences: vi.fn(),
  updateImages: vi.fn(),
  setCaching: vi.fn(async () => {}),
}));
vi.mock("@/src/hooks/useAuthSession", () => ({
  useAuthSession: () => ({ user: mocks.user, loading: mocks.authLoading }),
}));
vi.mock("@/src/hooks/useTrackerList", () => ({
  useTrackerList: () => ({ loading: false }),
}));
vi.mock("@/src/hooks/useRulesets", () => ({ useRulesets: () => [] }));
vi.mock("@/src/services/imageCache", () => ({
  setImageCachingAllowed: mocks.setCaching,
}));
vi.mock("@/src/services/backend/auth", () => ({
  synchronizeCurrentUserLanguage: vi.fn(async () => {}),
}));
vi.mock("@/src/services/repos/profileRepository.ts", () => ({
  getDefaultDisplayName: () => "Trainer",
  ensureUserProfile: async () => {},
  getUserProfilePreferences: mocks.getPreferences,
  updateUserImageLoadingPreference: mocks.updateImages,
}));

function Controls() {
  const { handleImageLoadingChange, handleCryVolumeChange, cryVolumePercent } =
    useAppSession();
  return (
    <>
      <SpriteImage
        src="https://raw.githubusercontent.com/PokeAPI/sprites/test.png"
        alt="External sprite"
      />
      <button
        onClick={() => void handleImageLoadingChange(false).catch(() => {})}
      >
        Withdraw
      </button>
      <output data-testid="cry-volume">{cryVolumePercent}</output>
      <button onClick={() => handleCryVolumeChange(60)}>Set volume</button>
      <AppFooter />
    </>
  );
}
const app = (path = "/") => (
  <MemoryRouter initialEntries={[path]}>
    <AppSessionProvider>
      <Controls />
    </AppSessionProvider>
  </MemoryRouter>
);
const preferences = (allowImageLoading: boolean | null) => ({
  displayName: "Trainer",
  allowImageLoading,
});

describe("account image consent", () => {
  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.removeItem(CRY_VOLUME_STORAGE_KEY);
    mocks.authLoading = false;
    await i18n.changeLanguage("en");
    mocks.user = {
      uid: "first-user",
      email: "first@example.com",
      language: "en",
    };
    mocks.getPreferences.mockReset();
    mocks.updateImages.mockReset();
    mocks.updateImages.mockResolvedValue(undefined);
    mocks.setCaching.mockClear();
  });
  it("does not apply a guest grant while authentication is still resolving", () => {
    mocks.user = null;
    mocks.authLoading = true;
    sessionStorage.setItem("soullink:allowImageLoading", "true");
    const { container } = render(app("/tracker/public-tracker"));
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.setCaching).toHaveBeenLastCalledWith(false);
  });
  it("opens from the guest tracker footer without changing the stored choice or cache permission", async () => {
    mocks.user = null;
    sessionStorage.setItem("soullink:allowImageLoading", "false");
    render(app("/tracker/public-tracker"));
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Privacy settings" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(sessionStorage.getItem("soullink:allowImageLoading")).toBe("false");
    expect(mocks.setCaching).toHaveBeenCalledTimes(1);
    expect(mocks.setCaching).toHaveBeenLastCalledWith(false);
  });

  it("hides the footer entry for accounts but opens through a blocked image and retains errors", async () => {
    mocks.getPreferences.mockResolvedValue(preferences(false));
    render(app("/tracker/private-tracker"));
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", {
        name: "Images blocked – open settings",
      }),
    );
    expect(
      screen.queryByRole("button", { name: "Privacy settings" }),
    ).toBeNull();
    mocks.updateImages.mockRejectedValue(new Error("Offline"));
    await user.click(
      screen.getByRole("button", { name: "Allow external images" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not be saved",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mocks.setCaching).toHaveBeenLastCalledWith(false);
  });

  it("does not show a guest footer opener outside the tracker", () => {
    mocks.user = null;
    render(app("/"));
    expect(
      screen.queryByRole("button", { name: "Privacy settings" }),
    ).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("blocks while the profile loads, then allows images only for saved true", async () => {
    let resolve!: (value: ReturnType<typeof preferences>) => void;
    mocks.getPreferences.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const { container } = render(app());
    expect(container.querySelector("img")).toBeNull();
    await act(async () => {
      resolve(preferences(true));
    });
    expect(screen.getByAltText("External sprite")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Allow external images" }),
    ).toBeNull();
  });

  it.each([false, true])(
    "persists the explicit choice %s and gates sprites",
    async (allowed) => {
      mocks.getPreferences.mockResolvedValue(preferences(null));
      render(app());
      const user = userEvent.setup();
      await user.click(
        await screen.findByRole("button", {
          name: allowed
            ? "Allow external images"
            : "Continue without external images",
        }),
      );
      expect(mocks.updateImages).toHaveBeenCalledWith("first-user", allowed);
      expect(!!screen.queryByAltText("External sprite")).toBe(allowed);
      expect(
        screen.queryByRole("button", { name: "Allow external images" }),
      ).toBeNull();
    },
  );

  it("stops images immediately on withdrawal even if the account update fails", async () => {
    mocks.getPreferences.mockResolvedValue(preferences(true));
    render(app());
    await screen.findByAltText("External sprite");
    mocks.updateImages.mockRejectedValue(new Error("Offline"));
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Withdraw" }));
    expect(screen.queryByAltText("External sprite")).toBeNull();
    expect(mocks.setCaching).toHaveBeenLastCalledWith(false);
  });

  it("does not reuse another account's consent while the next profile loads", async () => {
    mocks.getPreferences
      .mockResolvedValueOnce(preferences(true))
      .mockReturnValue(new Promise(() => {}));
    const { container, rerender } = render(app());
    await screen.findByAltText("External sprite");
    mocks.user = {
      uid: "second-user",
      email: "second@example.com",
      language: "en",
    };
    rerender(app());
    expect(container.querySelector("img")).toBeNull();
    await waitFor(() =>
      expect(mocks.getPreferences).toHaveBeenCalledWith(
        "second-user",
        "second@example.com",
      ),
    );
  });

  it("fails closed and offers a choice when profile loading fails", async () => {
    mocks.getPreferences.mockRejectedValue(new Error("Offline"));
    const { container } = render(app());
    await screen.findByRole("button", {
      name: "Continue without external images",
    });
    expect(container.querySelector("img")).toBeNull();
  });

  it.each([false, true])(
    "remembers guest consent %s for the tab session",
    async (allowed) => {
      mocks.user = null;
      const user = userEvent.setup();
      const { unmount } = render(app("/tracker/public-tracker"));
      await user.click(
        screen.getByRole("button", {
          name: allowed
            ? "Allow external images"
            : "Continue without external images",
        }),
      );
      expect(sessionStorage.getItem("soullink:allowImageLoading")).toBe(
        String(allowed),
      );
      unmount();
      render(app("/tracker/public-tracker"));
      expect(
        screen.queryByRole("button", { name: "Allow external images" }),
      ).toBeNull();
      expect(!!screen.queryByAltText("External sprite")).toBe(allowed);
      expect(mocks.updateImages).not.toHaveBeenCalled();
    },
  );

  it("keeps guest session consent separate from account consent", async () => {
    sessionStorage.setItem("soullink:allowImageLoading", "true");
    mocks.getPreferences.mockResolvedValue(preferences(null));
    const { container } = render(app());
    await screen.findByRole("button", { name: "Allow external images" });
    expect(container.querySelector("img")).toBeNull();
  });

  it("loads and updates the locally stored cry volume", async () => {
    localStorage.setItem(CRY_VOLUME_STORAGE_KEY, "70");
    mocks.getPreferences.mockResolvedValue(preferences(true));
    render(app());

    await waitFor(() =>
      expect(screen.getByTestId("cry-volume")).toHaveTextContent("70"),
    );
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Set volume" }));

    expect(localStorage.getItem(CRY_VOLUME_STORAGE_KEY)).toBe("60");
    expect(screen.getByTestId("cry-volume")).toHaveTextContent("60");
  });
});
