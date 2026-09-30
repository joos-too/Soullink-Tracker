import React, { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n.ts";
import SuggestionInput from "./SuggestionInput.tsx";

const NAMES = ["Charmander", "Charmeleon", "Charizard"];

const fetchSuggestions = vi.fn((term: string) =>
  Promise.resolve(
    NAMES.filter((name) => name.toLowerCase().includes(term.toLowerCase())),
  ),
);

const Harness: React.FC = () => {
  const [value, setValue] = useState("");
  return (
    <SuggestionInput
      label="Pokémon"
      value={value}
      onChange={setValue}
      fetchSuggestions={fetchSuggestions}
      isOpen
      debounceMs={0}
    />
  );
};

describe("SuggestionInput", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    fetchSuggestions.mockClear();
  });

  it.each(["click", "enter"] as const)(
    "closes the suggestions after accepting one via %s",
    async (method) => {
      const user = userEvent.setup();
      render(<Harness />);

      const input = screen.getByRole("textbox", { name: /Pokémon/ });
      await user.type(input, "Charm");
      await screen.findByRole("option", { name: "Charmander" });

      if (method === "click") {
        await user.click(screen.getByRole("option", { name: "Charmander" }));
      } else {
        await user.keyboard("{Enter}");
      }

      expect(input).toHaveValue("Charmander");
      expect(input).toHaveFocus();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(screen.queryAllByRole("option")).toHaveLength(0);

      // Editing the accepted value searches again
      await user.type(input, "{Backspace}");
      await waitFor(() =>
        expect(screen.getAllByRole("option").length).toBeGreaterThan(0),
      );
    },
  );
});
