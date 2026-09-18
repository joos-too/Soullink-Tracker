import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PokemonLink } from "@/types.ts";
import i18n from "@/src/i18n.ts";
import Graveyard from "./Graveyard.tsx";

const lostPair = (id: number, location: string): PokemonLink => ({
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

  it("preserves a lost-link draft and blocks saving after remote removal", async () => {
    const user = userEvent.setup();
    const onEditPair = vi.fn();
    const { rerender } = render(
      <Graveyard
        graveyard={[lostPair(7, "Route 1")]}
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
      "This link was removed or moved to the graveyard by another user",
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(onEditPair).not.toHaveBeenCalled();
  });
});
