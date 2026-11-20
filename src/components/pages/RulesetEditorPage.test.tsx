import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import i18n from "@/src/i18n";
import { PRESET_RULESETS } from "@/src/data/rulesets";
import type { Ruleset } from "@/types";
import RulesetEditorPage from "./RulesetEditorPage";

const preset = PRESET_RULESETS[0];

beforeEach(async () => {
  await i18n.changeLanguage("en");
});

const renderEditor = (
  onSave = vi.fn<(ruleset: Partial<Ruleset>) => Promise<Ruleset>>(),
) =>
  render(
    <MemoryRouter>
      <RulesetEditorPage
        rulesets={[preset]}
        onNavigateHome={vi.fn()}
        onSave={onSave}
        onDelete={vi.fn()}
      />
    </MemoryRouter>,
  );

it("locks presets and offers duplication instead of editing or deleting them", () => {
  renderEditor();
  expect(screen.getByText("Preset rulesets can’t be edited.")).toBeVisible();
  expect(screen.getByPlaceholderText("Name your ruleset")).toBeDisabled();
  expect(screen.getByPlaceholderText("Rule 1")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Duplicate" })).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Save ruleset" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Delete" }),
  ).not.toBeInTheDocument();
});

it("keeps the draft after a rejected save and enables retry", async () => {
  const user = userEvent.setup();
  let rejectSave!: (error: Error) => void;
  const onSave = vi.fn(
    () =>
      new Promise<Ruleset>((_, reject) => {
        rejectSave = reject;
      }),
  );
  renderEditor(onSave);

  await user.click(screen.getByRole("button", { name: "New ruleset" }));
  const name = screen.getByPlaceholderText("Name your ruleset");
  await user.type(name, "One encounter");
  await user.click(screen.getByRole("button", { name: "Save ruleset" }));
  expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  expect(onSave).toHaveBeenCalledOnce();

  rejectSave(new Error("Write unavailable"));
  expect(await screen.findByText("Write unavailable")).toBeVisible();
  expect(name).toHaveValue("One encounter");
  expect(screen.getByRole("button", { name: "Save ruleset" })).toBeEnabled();
});
