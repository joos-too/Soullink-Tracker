import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PokemonLink } from "@/types.ts";
import i18n from "@/src/i18n.ts";
import { ImageLoadingContext } from "@/src/contexts/ImageLoadingContext.ts";
import { ImageConsentContext } from "@/src/contexts/ImageConsentContext.ts";
import TeamTable from "./TeamTable.tsx";
import { playLatestPokemonCry } from "@/src/services/pokemonCries.ts";

vi.mock("@/src/services/pokemonCries.ts", () => ({
  playLatestPokemonCry: vi.fn().mockResolvedValue(undefined),
}));

const link: PokemonLink = {
  id: "10000000-0000-4000-8000-000000000001",
  locationSlug: null,
  members: [{ id: 1, nickname: "" }],
};

const props: React.ComponentProps<typeof TeamTable> = {
  title: "Team",
  data: [link],
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
  nicknamesEnabled: false,
};

describe("TeamTable Pokémon cries", () => {
  beforeEach(async () => {
    vi.mocked(playLatestPokemonCry).mockClear();
    await i18n.changeLanguage("en");
  });

  it("plays a cry only after the displayed sprite is activated", async () => {
    const user = userEvent.setup();
    render(
      <ImageLoadingContext.Provider value={true}>
        <TeamTable {...props} />
      </ImageLoadingContext.Provider>,
    );

    const sprite = screen.getByRole("button", {
      name: "Play cry of Bulbasaur",
    });
    expect(playLatestPokemonCry).not.toHaveBeenCalled();

    await user.click(sprite);
    expect(playLatestPokemonCry).toHaveBeenCalledWith(1);

    sprite.focus();
    await user.keyboard("{Enter} ");
    expect(playLatestPokemonCry).toHaveBeenCalledTimes(3);
  });

  it("does not play from the blocked-image placeholder", async () => {
    const user = userEvent.setup();
    const openConsent = vi.fn();
    render(
      <ImageConsentContext.Provider
        value={{
          decision: false,
          isOpen: false,
          openConsent,
          showGuestFooterEntry: false,
        }}
      >
        <TeamTable {...props} />
      </ImageConsentContext.Provider>,
    );

    expect(
      screen.queryByRole("button", { name: "Play cry of Bulbasaur" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", {
        name: "Images blocked – open settings",
      }),
    );

    expect(openConsent).toHaveBeenCalledOnce();
    expect(playLatestPokemonCry).not.toHaveBeenCalled();
  });
});
