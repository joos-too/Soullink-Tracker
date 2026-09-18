import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PokemonLink } from "@/types.ts";
import i18n from "@/src/i18n.ts";
import TeamTable from "./TeamTable.tsx";

type TeamTableProps = React.ComponentProps<typeof TeamTable>;

const pair = (id: number, location: string): PokemonLink => ({
  id,
  location,
  locationSlug: null,
  members: [{ id: 1, nickname: "" }],
});

const createProps = (
  overrides: Partial<TeamTableProps> = {},
): TeamTableProps => ({
  title: "Team",
  data: [pair(1, "Route 1")],
  playerNames: ["Red"],
  playerColors: ["#ef4444"],
  onEditLink: vi.fn(),
  onEvolveLink: vi.fn(),
  onAddToGraveyard: vi.fn(),
  onAddLink: vi.fn(),
  emptyMessage: "Empty",
  context: "team",
  onMoveToTeam: vi.fn(),
  onMoveToBox: vi.fn(),
  canonicalLinkIds: new Set([1]),
  nicknamesEnabled: false,
  ...overrides,
});

describe("TeamTable modal sessions", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("preserves the edit draft across data replacement and saves by link ID", async () => {
    const user = userEvent.setup();
    const onEditLink = vi.fn();
    const { rerender } = render(<TeamTable {...createProps({ onEditLink })} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const locationInput = screen.getByRole("textbox", { name: /^Area/ });
    await user.clear(locationInput);
    await user.type(locationInput, "Local route");

    rerender(
      <TeamTable
        {...createProps({
          data: [pair(2, "Unrelated"), pair(1, "Remote route")],
          canonicalLinkIds: new Set([1, 2]),
          onEditLink,
        })}
      />,
    );

    expect(locationInput).toHaveValue("Local route");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onEditLink).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ location: "Local route" }),
    );
  });

  it("keeps the modal open and disables save when the canonical link disappears", async () => {
    const user = userEvent.setup();
    const onEditLink = vi.fn();
    const onCloseProps = createProps({ onEditLink });
    const { rerender } = render(<TeamTable {...onCloseProps} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    rerender(
      <TeamTable
        {...createProps({
          data: [],
          canonicalLinkIds: new Set(),
          onEditLink,
        })}
      />,
    );

    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "This link was removed or moved to the graveyard by another user",
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(onEditLink).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("allows saving when the link moved out of the currently displayed collection", async () => {
    const user = userEvent.setup();
    const onEditLink = vi.fn();
    const { rerender } = render(<TeamTable {...createProps({ onEditLink })} />);

    await user.click(screen.getByRole("button", { name: "Edit" }));
    const locationInput = screen.getByRole("textbox", { name: /^Area/ });
    await user.clear(locationInput);
    await user.type(locationInput, "Draft after move");

    rerender(
      <TeamTable
        {...createProps({
          data: [],
          canonicalLinkIds: new Set([1]),
          onEditLink,
        })}
      />,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onEditLink).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ location: "Draft after move" }),
    );
  });

  it("preserves a create draft while unrelated links arrive", async () => {
    const user = userEvent.setup();
    const onAddLink = vi.fn();
    const { rerender } = render(
      <TeamTable {...createProps({ data: [], onAddLink })} />,
    );

    await user.click(screen.getByRole("button", { name: "Add Pokémon" }));
    const locationInput = screen.getByRole("textbox", { name: /^Area/ });
    await user.type(locationInput, "New route");
    const pokemonInput = screen.getByRole("textbox", {
      name: /^Red - Pokémon/,
    });
    await user.type(pokemonInput, "Bulbasaur");

    rerender(
      <TeamTable
        {...createProps({
          data: [pair(2, "Remote route")],
          canonicalLinkIds: new Set([2]),
          onAddLink,
        })}
      />,
    );

    expect(locationInput).toHaveValue("New route");
    expect(pokemonInput).toHaveValue("Bulbasaur");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(onAddLink).toHaveBeenCalledWith(
      expect.objectContaining({ location: "New route" }),
    );
  });

  it("preserves evolution selection and blocks confirmation if the link disappears", async () => {
    const user = userEvent.setup();
    const onEvolveLink = vi.fn();
    const { rerender } = render(
      <TeamTable {...createProps({ onEvolveLink })} />,
    );

    await user.click(screen.getByRole("button", { name: "Evolve" }));
    const evolutionOption = await screen.findByRole("radio", {
      name: /Ivysaur/,
    });
    await user.click(evolutionOption);
    expect(evolutionOption).toBeChecked();

    rerender(
      <TeamTable
        {...createProps({
          data: [pair(1, "Remote route"), pair(2, "Unrelated")],
          canonicalLinkIds: new Set([1, 2]),
          onEvolveLink,
        })}
      />,
    );

    expect(evolutionOption).toBeChecked();

    rerender(
      <TeamTable
        {...createProps({
          data: [pair(1, "Remote route")],
          canonicalLinkIds: new Set(),
          onEvolveLink,
        })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This link was removed or moved to the graveyard by another user",
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(onEvolveLink).not.toHaveBeenCalled();
  });
});
