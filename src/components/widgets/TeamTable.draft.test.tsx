import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ItemEntry, LinkId, PokemonLink } from "@/src/types/domain.ts";
import i18n from "@/src/i18n.ts";
import TeamTable from "./TeamTable.tsx";

type TeamTableProps = React.ComponentProps<typeof TeamTable>;

const LINK_ONE = "10000000-0000-4000-8000-000000000001";
const LINK_TWO = "10000000-0000-4000-8000-000000000002";

const pair = (id: LinkId, location: string): PokemonLink => ({
  id,
  location,
  locationSlug: null,
  members: [{ id: 1, nickname: "" }],
});

const createProps = (
  overrides: Partial<TeamTableProps> = {},
): TeamTableProps => ({
  title: "Team",
  data: [pair(LINK_ONE, "Route 1")],
  items: [[]],
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
  canonicalLinkIds: new Set([LINK_ONE]),
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
          data: [pair(LINK_TWO, "Unrelated"), pair(LINK_ONE, "Remote route")],
          canonicalLinkIds: new Set([LINK_ONE, LINK_TWO]),
          onEditLink,
        })}
      />,
    );

    expect(locationInput).toHaveValue("Local route");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onEditLink).toHaveBeenCalledWith(
      LINK_ONE,
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
      "This link was removed by another user",
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
          canonicalLinkIds: new Set([LINK_ONE]),
          onEditLink,
        })}
      />,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onEditLink).toHaveBeenCalledWith(
      LINK_ONE,
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
          data: [pair(LINK_TWO, "Remote route")],
          canonicalLinkIds: new Set([LINK_TWO]),
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

  it("preselects a sole evolution and blocks confirmation if the link disappears", async () => {
    const user = userEvent.setup();
    const onEvolveLink = vi.fn();
    const { rerender } = render(
      <TeamTable {...createProps({ onEvolveLink })} />,
    );

    await user.click(screen.getByRole("button", { name: "Evolve" }));
    const evolutionOption = await screen.findByRole("radio", {
      name: /Ivysaur/,
    });
    expect(evolutionOption).toBeChecked();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeEnabled();

    rerender(
      <TeamTable
        {...createProps({
          data: [pair(LINK_ONE, "Remote route"), pair(LINK_TWO, "Unrelated")],
          canonicalLinkIds: new Set([LINK_ONE, LINK_TWO]),
          onEvolveLink,
        })}
      />,
    );

    expect(evolutionOption).toBeChecked();

    rerender(
      <TeamTable
        {...createProps({
          data: [pair(LINK_ONE, "Remote route")],
          canonicalLinkIds: new Set(),
          onEvolveLink,
        })}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "This link was removed by another user",
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(onEvolveLink).not.toHaveBeenCalled();
  });

  it("allows evolution after the link moves to another collection", async () => {
    const user = userEvent.setup();
    const onEvolveLink = vi.fn();
    const { rerender } = render(
      <TeamTable {...createProps({ onEvolveLink })} />,
    );

    await user.click(screen.getByRole("button", { name: "Evolve" }));
    await screen.findByRole("radio", { name: /Ivysaur/ });

    rerender(
      <TeamTable
        {...createProps({
          data: [],
          canonicalLinkIds: new Set([LINK_ONE]),
          onEvolveLink,
        })}
      />,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onEvolveLink).toHaveBeenCalledWith(LINK_ONE, 0, 2, 1, undefined);
  });

  it("shows the player's items before an evolution is selected and lets an item select its evolution", async () => {
    const user = userEvent.setup();
    const onEvolveLink = vi.fn();
    const inBag = { inBag: true, used: false, locationSlug: null };
    const props = createProps({
      data: [
        {
          ...pair(LINK_ONE, "Route 1"),
          members: [
            { id: 133, nickname: "" },
            { id: 133, nickname: "" },
          ],
        },
      ],
      playerNames: ["Red", "Blue"],
      playerColors: ["#ef4444", "#3b82f6"],
      items: [
        [{ ...inBag, id: "fire-stone" }],
        [
          { ...inBag, id: "item:fire-stone" },
          { ...inBag, id: "thunder-stone" },
          { ...inBag, id: "water-stone", used: true },
        ],
      ],
      gameVersionId: "gen1_rb",
      pokemonGenerationLimit: 1,
      onEvolveLink,
    });
    render(<TeamTable {...props} />);

    await user.click(screen.getByRole("button", { name: "Evolve" }));
    await user.click(screen.getByRole("radio", { name: /Blue/ }));
    const vaporeon = await screen.findByRole("radio", { name: /Vaporeon/ });
    expect(vaporeon).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByText("Water Stone", { exact: true })).toBeVisible();
    expect(screen.queryByRole("button", { name: /Water Stone/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Thunder Stone/ })).toBeVisible();
    const flareon = screen.getByRole("radio", { name: /Flareon/ });
    expect(flareon).not.toBeChecked();
    const fireStone = screen.getByRole("button", { name: /Fire Stone/ });
    await user.click(fireStone);
    expect(flareon).toBeChecked();
    expect(fireStone).toHaveAttribute("aria-pressed", "true");
    await user.click(vaporeon);
    expect(fireStone).toHaveAttribute("aria-pressed", "false");
    await user.click(flareon);
    expect(fireStone).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onEvolveLink).toHaveBeenCalledWith(
      LINK_ONE,
      1,
      136,
      133,
      "item:fire-stone",
    );
  });

  it("lets the user clear an automatically selected item that was used elsewhere", async () => {
    const user = userEvent.setup();
    const onEvolveLink = vi.fn();
    const item: ItemEntry = {
      id: "fire-stone",
      inBag: true,
      used: false,
      locationSlug: null,
    };
    const props = createProps({
      data: [
        { ...pair(LINK_ONE, "Route 1"), members: [{ id: 133, nickname: "" }] },
      ],
      items: [[item]],
      onEvolveLink,
    });
    const { rerender } = render(<TeamTable {...props} />);

    await user.click(screen.getByRole("button", { name: "Evolve" }));
    await user.click(await screen.findByRole("radio", { name: /Flareon/ }));
    expect(screen.getByRole("button", { name: /Fire Stone/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    rerender(<TeamTable {...props} items={[[{ ...item, used: true }]]} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "The selected item is no longer in the bag.",
    );
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    await user.click(
      screen.getByRole("button", { name: "Clear item selection" }),
    );
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onEvolveLink).toHaveBeenCalledWith(LINK_ONE, 0, 136, 133, undefined);
  });

  it("selects an available item for a preselected evolution and allows deselection", async () => {
    const user = userEvent.setup();
    const onEvolveLink = vi.fn();
    render(
      <TeamTable
        {...createProps({
          data: [
            {
              ...pair(LINK_ONE, "Route 1"),
              members: [{ id: 25, nickname: "" }],
            },
          ],
          items: [
            [
              {
                id: "thunder-stone",
                inBag: true,
                used: false,
                locationSlug: null,
              },
            ],
          ],
          gameVersionId: "gen1_rb",
          pokemonGenerationLimit: 1,
          onEvolveLink,
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Evolve" }));
    expect(await screen.findByRole("radio", { name: /Raichu/ })).toBeChecked();
    const thunderStone = screen.getByRole("button", { name: /Thunder Stone/ });
    expect(thunderStone).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Uses 1 on confirmation")).toBeVisible();
    await user.click(thunderStone);
    expect(thunderStone).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByText("Uses 1 on confirmation")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onEvolveLink).toHaveBeenCalledWith(LINK_ONE, 0, 26, 25, undefined);
  });
});
