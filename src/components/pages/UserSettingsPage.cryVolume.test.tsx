import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n.ts";
import UserSettingsPage from "./UserSettingsPage.tsx";

const createProps = (
  onCryVolumeChange: (volumePercent: number) => void,
): React.ComponentProps<typeof UserSettingsPage> => ({
  email: "trainer@example.com",
  displayName: "Trainer",
  onDisplayNameChange: vi.fn().mockResolvedValue(undefined),
  onBack: vi.fn(),
  onLogout: vi.fn(),
  onGenerationSpritesToggle: vi.fn(),
  onSpritesInTeamTableToggle: vi.fn(),
  onWikiChange: vi.fn(),
  onMultiLocaleSearchToggle: vi.fn(),
  cryVolumePercent: 25,
  onCryVolumeChange,
});

describe("UserSettingsPage cry volume", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows 25% by default and saves the selected volume", () => {
    const onCryVolumeChange = vi.fn();
    render(<UserSettingsPage {...createProps(onCryVolumeChange)} />);

    const slider = screen.getByRole("slider", { name: "Cry volume" });
    expect(slider).toHaveValue("25");
    expect(slider).toHaveClass("cry-volume-slider");
    expect(slider).toHaveStyle({ "--cry-volume": "25%" });
    expect(screen.getByText("25%")).toBeInTheDocument();

    fireEvent.change(slider, { target: { value: "40" } });
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(slider).toHaveStyle({ "--cry-volume": "40%" });
    expect(onCryVolumeChange).toHaveBeenCalledWith(40);
  });

  it("shows a previously stored volume", () => {
    render(
      <UserSettingsPage {...createProps(vi.fn())} cryVolumePercent={70} />,
    );
    expect(screen.getByRole("slider", { name: "Cry volume" })).toHaveValue(
      "70",
    );
    expect(screen.getByText("70%")).toBeInTheDocument();
  });
});
