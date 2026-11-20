import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import i18n from "@/src/i18n";
import { PRESET_RULESETS } from "@/src/data/rulesets";
import CreateTrackerModal from "./CreateTrackerModal";

it("requires a game version and retains the form after a submission error", async () => {
  await i18n.changeLanguage("en");
  const user = userEvent.setup();
  const onSubmit = vi.fn(async () => {});
  const onClose = vi.fn();
  const modal = (isSubmitting: boolean, error?: string) => (
    <MemoryRouter>
      <CreateTrackerModal
        isOpen
        onClose={onClose}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        rulesets={PRESET_RULESETS}
        error={error}
      />
    </MemoryRouter>
  );
  const { rerender } = render(modal(false));
  const dialog = within(
    screen.getByRole("dialog", { name: "Create your tracker" }),
  );
  await user.click(dialog.getByRole("button", { name: "Solo" }));
  await user.type(dialog.getByLabelText("Title"), "First run");
  await user.type(dialog.getByPlaceholderText("Name"), "Red");
  expect(dialog.getByRole("button", { name: "Create tracker" })).toBeDisabled();
  expect(onSubmit).not.toHaveBeenCalled();

  await user.click(dialog.getByRole("button", { name: /Select game version/ }));
  await user.click(dialog.getByRole("button", { name: "Pokémon Red / Blue" }));
  await user.click(dialog.getByRole("button", { name: "Create tracker" }));
  expect(onSubmit).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      title: "First run",
      playerNames: ["Red"],
      gameVersionId: "gen1_rb",
    }),
  );

  rerender(modal(true));
  expect(dialog.getByRole("button", { name: "Creating…" })).toBeDisabled();
  rerender(modal(false, "Could not create tracker."));
  expect(dialog.getByText("Could not create tracker.")).toBeVisible();
  expect(dialog.getByLabelText("Title")).toHaveValue("First run");
  expect(dialog.getByRole("button", { name: "Create tracker" })).toBeEnabled();
});
