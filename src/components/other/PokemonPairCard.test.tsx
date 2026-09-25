import React from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import i18n from "@/src/i18n.ts";
import type { PokemonLink } from "@/types.ts";
import PokemonPairCard from "./PokemonPairCard.tsx";

const pair: PokemonLink = {
  id: "link-1",
  locationSlug: null,
  location: "Route 1",
  members: [
    { id: 25, nickname: "Sparky" },
    { id: null, nickname: "" },
  ],
};

const renderCard = (
  props: Partial<React.ComponentProps<typeof PokemonPairCard>>,
) =>
  render(
    <PokemonPairCard
      pair={pair}
      playerNames={["Ash", "Misty & Brock"]}
      playerColors={["#ff0000", "#0000ff"]}
      className=""
      {...props}
    />,
  );

describe("PokemonPairCard", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders area, player titles and nicknames", () => {
    renderCard({});

    expect(screen.getByText("Area: Route 1")).toBeInTheDocument();
    expect(screen.getByText(/Ash’s/)).toHaveTextContent("Ash’s Pikachu");
    expect(screen.getByText(/Misty & Brock’s/)).toHaveTextContent(
      "Misty & Brock’s Pokémon",
    );
    expect(screen.getByText("Nickname: Sparky")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("links known Pokémon to the wiki and can hide nicknames", () => {
    renderCard({ wikiId: "bulbapedia", nicknamesEnabled: false });

    expect(screen.getByRole("link", { name: "Pikachu" })).toHaveAttribute(
      "href",
      expect.stringContaining("bulbapedia"),
    );
    expect(screen.queryByText(/Nickname:/)).not.toBeInTheDocument();
  });
});
