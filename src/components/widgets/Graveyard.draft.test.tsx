import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LinkId, PokemonLink } from "@/types.ts";
import i18n from "@/src/i18n.ts";
import Graveyard from "./Graveyard.tsx";

const LINK_ID = "70000000-0000-4000-8000-000000000007";

const lostPair = (id: LinkId, location: string): PokemonLink => ({
  id,
  location,
  locationSlug: null,
  members: [{ id: 1, nickname: "" }],
  isLost: true,
});

describe("Graveyard modal sessions", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("restores dead links directly and keeps deletion for lost encounters", async () => {
    const user = userEvent.setup();
    const dead = {
      ...lostPair(LINK_ID, "Route 1"),
      isLost: false,
      deathPlayerIndex: 0,
    };
    const lost = lostPair("70000000-0000-4000-8000-000000000008", "Route 2");
    const onRestoreLink = vi.fn();
    const onDeleteLink = vi.fn();
    render(
      <Graveyard
        graveyard={[dead, lost]}
        playerNames={["Red"]}
        onEditPair={vi.fn()}
        onRestoreLink={onRestoreLink}
        onDeleteLink={onDeleteLink}
      />,
    );

    expect(
      screen.getAllByRole("button", { name: "Restore to box" }),
    ).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Delete link" })).toHaveLength(
      1,
    );
    await user.click(screen.getByRole("button", { name: "Restore to box" }));
    expect(onRestoreLink).toHaveBeenCalledWith(dead);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete link" }));
    expect(onDeleteLink).toHaveBeenCalledWith(lost);
  });

  it("asks who caused a legacy death before restoring it", async () => {
    const user = userEvent.setup();
    const dead = { ...lostPair(LINK_ID, "Route 1"), isLost: false };
    const onRestoreLink = vi.fn();
    render(
      <Graveyard
        graveyard={[dead]}
        playerNames={["Red", "Blue"]}
        onEditPair={vi.fn()}
        onRestoreLink={onRestoreLink}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Restore to box" }));
    expect(screen.getByRole("dialog", { name: "Restore link?" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Restore" })).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /Blue/ }));
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(onRestoreLink).toHaveBeenCalledWith(dead, 1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes legacy restoration if the link is removed remotely", async () => {
    const user = userEvent.setup();
    const onRestoreLink = vi.fn();
    const props = { playerNames: ["Red"], onEditPair: vi.fn(), onRestoreLink };
    const { rerender } = render(
      <Graveyard
        {...props}
        graveyard={[{ ...lostPair(LINK_ID, "Route 1"), isLost: false }]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Restore to box" }));
    rerender(<Graveyard {...props} graveyard={[]} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onRestoreLink).not.toHaveBeenCalled();
  });

  it("hides mutation actions for read-only viewers", () => {
    render(
      <Graveyard
        graveyard={[{ ...lostPair(LINK_ID, "Route 1"), isLost: false }]}
        playerNames={["Red"]}
        onEditPair={vi.fn()}
        onRestoreLink={vi.fn()}
        onDeleteLink={vi.fn()}
        readOnly
      />,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("preserves a lost-link draft and blocks saving after remote removal", async () => {
    const user = userEvent.setup();
    const onEditPair = vi.fn();
    const { rerender } = render(
      <Graveyard
        graveyard={[lostPair(LINK_ID, "Route 1")]}
        playerNames={["Red"]}
        onEditPair={onEditPair}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const locationInput = screen.getByRole("textbox", { name: /^Area/ });
    await user.clear(locationInput);
    await user.type(locationInput, "Local lost route");

    rerender(
      <Graveyard
        graveyard={[]}
        playerNames={["Remote player"]}
        onEditPair={onEditPair}
      />,
    );

    expect(locationInput).toHaveValue("Local lost route");
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This link was removed by another user",
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(onEditPair).not.toHaveBeenCalled();
  });

  it("allows saving when the link moves out of the graveyard", async () => {
    const user = userEvent.setup();
    const onEditPair = vi.fn();
    const { rerender } = render(
      <Graveyard
        graveyard={[lostPair(LINK_ID, "Route 1")]}
        playerNames={["Red"]}
        onEditPair={onEditPair}
        canonicalLinkIds={new Set([LINK_ID])}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const locationInput = screen.getByRole("textbox", { name: /^Area/ });
    await user.clear(locationInput);
    await user.type(locationInput, "Updated route");

    rerender(
      <Graveyard
        graveyard={[]}
        playerNames={["Red"]}
        onEditPair={onEditPair}
        canonicalLinkIds={new Set([LINK_ID])}
      />,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onEditPair).toHaveBeenCalledWith(
      LINK_ID,
      expect.objectContaining({ location: "Updated route" }),
    );
  });
});
