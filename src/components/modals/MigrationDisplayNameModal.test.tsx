import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n.ts";
import MigrationDisplayNameModal from "./MigrationDisplayNameModal.tsx";

describe("MigrationDisplayNameModal", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("normalizes and saves the replacement display name", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <MigrationDisplayNameModal
        isOpen
        initialDisplayName="ash"
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    const input = screen.getByLabelText("Display name");
    await user.clear(input);
    await user.type(input, "  Ash   Ketchum  ");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).toHaveBeenCalledWith("Ash Ketchum");
  });
});
