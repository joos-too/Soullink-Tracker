import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n.ts";
import SettingsPage from "./SettingsPage.tsx";

type SettingsPageProps = React.ComponentProps<typeof SettingsPage>;

const members: SettingsPageProps["members"] = [
  {
    uid: "10000000-0000-0000-0000-000000000001",
    displayName: "Owner",
    email: "owner@example.com",
    role: "owner",
    addedAt: 1,
  },
  {
    uid: "10000000-0000-0000-0000-000000000002",
    displayName: "Editor",
    email: "editor@example.com",
    role: "editor",
    addedAt: 2,
  },
];

const createProps = (
  overrides: Partial<SettingsPageProps> = {},
): SettingsPageProps => ({
  trackerTitle: "Test tracker",
  playerNames: ["Red", "Blue"],
  onTitleChange: vi.fn(),
  onPlayerNameChange: vi.fn(),
  onBack: vi.fn(),
  legendaryTrackerEnabled: true,
  onlegendaryTrackerToggle: vi.fn(),
  rivalCensorMode: "on",
  onRivalCensorModeChange: vi.fn(),
  hardcoreModeEnabled: true,
  onHardcoreModeToggle: vi.fn(),
  nicknamesEnabled: true,
  onNicknamesToggle: vi.fn(),
  infiniteFossilsEnabled: false,
  onInfiniteFossilsToggle: vi.fn(),
  allPokemonAndItems: false,
  onAllPokemonAndItemsToggle: vi.fn(),
  isPublic: false,
  onPublicToggle: vi.fn(),
  members,
  guests: [],
  onInviteMember: vi.fn(async () => {}),
  onRemoveMember: vi.fn(async () => {}),
  onRequestDeleteTracker: vi.fn(),
  canManageMembers: true,
  currentUserId: members[0].uid,
  onRivalPreferenceChange: vi.fn(),
  rulesets: [],
  onRulesetSelect: vi.fn(),
  onSynchronizeRules: vi.fn(),
  onOpenRulesetEditor: vi.fn(),
  onSaveRulesetToCollection: vi.fn(),
  ...overrides,
});

describe("SettingsPage permissions", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows member emails and enables visibility changes for the owner", () => {
    render(<SettingsPage {...createProps()} />);

    expect(screen.getByText("editor@example.com")).toBeVisible();
    expect(
      screen.getByRole("checkbox", { name: "Public tracker" }),
    ).toBeEnabled();
  });

  it("hides member emails and disables visibility changes for non-owners", () => {
    render(
      <SettingsPage
        {...createProps({
          canManageMembers: false,
          currentUserId: members[1].uid,
        })}
      />,
    );

    expect(screen.queryByText("editor@example.com")).not.toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Public tracker" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Allow anyone to view this tracker via the URL. Only the owner can change this setting.",
      ),
    ).toBeVisible();
  });
});
