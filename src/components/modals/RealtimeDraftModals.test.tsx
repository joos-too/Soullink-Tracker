import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n.ts";
import EditPairModal from "./EditPairModal.tsx";
import AddLostPokemonModal from "./AddLostPokemonModal.tsx";

describe("realtime-safe modal drafts", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("keeps an edit-pair draft when source props change and blocks submission on error", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const { rerender } = render(
      <EditPairModal
        onClose={vi.fn()}
        onSave={onSave}
        playerLabels={["Red"]}
        initial={{
          location: "Route 1",
          locationSlug: null,
          members: [{ id: 1, nickname: "" }],
        }}
        nicknamesEnabled={false}
      />,
    );

    const locationInput = screen.getByRole("textbox", { name: /^Area/ });
    await user.clear(locationInput);
    await user.type(locationInput, "Local draft route");

    rerender(
      <EditPairModal
        onClose={vi.fn()}
        onSave={onSave}
        playerLabels={["Remote player"]}
        initial={{
          location: "Remote route",
          locationSlug: null,
          members: [{ id: 25, nickname: "" }],
        }}
        nicknamesEnabled={false}
        blockingError="The source disappeared."
      />,
    );

    expect(locationInput).toHaveValue("Local draft route");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The source disappeared.",
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();

    fireEvent.submit(screen.getByRole("button", { name: "Save" }).form!);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("keeps a lost-Pokémon draft when source props change", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <AddLostPokemonModal
        onClose={vi.fn()}
        onAdd={vi.fn()}
        playerNames={["Red"]}
        initial={{
          location: "Route 1",
          locationSlug: null,
          members: [{ id: 1, nickname: "" }],
        }}
        mode="edit"
      />,
    );

    const locationInput = screen.getByRole("textbox", { name: /^Area/ });
    await user.clear(locationInput);
    await user.type(locationInput, "Local lost route");
    const pokemonInput = screen.getByRole("textbox", {
      name: /^Red’s Pokémon/,
    });
    await user.clear(pokemonInput);
    await user.type(pokemonInput, "Localmon");

    rerender(
      <AddLostPokemonModal
        onClose={vi.fn()}
        onAdd={vi.fn()}
        playerNames={["Blue"]}
        initial={{
          location: "Remote route",
          locationSlug: null,
          members: [{ id: 25, nickname: "" }],
        }}
        mode="edit"
      />,
    );

    expect(locationInput).toHaveValue("Local lost route");
    expect(pokemonInput).toHaveValue("Localmon");
  });
});
