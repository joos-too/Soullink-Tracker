import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import i18n from "@/src/i18n";
import UserSettingsPage from "./UserSettingsPage";

it("validates display names and preserves the draft after a failed save", async () => {
  await i18n.changeLanguage("en");
  const user = userEvent.setup();
  let rejectSave!: (error: Error) => void;
  const onDisplayNameChange = vi.fn(
    () =>
      new Promise<void>((_, reject) => {
        rejectSave = reject;
      }),
  );
  vi.spyOn(console, "error").mockImplementation(() => {});
  render(
    <MemoryRouter>
      <UserSettingsPage
        email="trainer@example.com"
        displayName="Old Trainer"
        onDisplayNameChange={onDisplayNameChange}
        onBack={vi.fn()}
        onLogout={vi.fn()}
        useGenerationSprites={false}
        onGenerationSpritesToggle={vi.fn()}
        pokemonImageStyle="mixed"
        onPokemonImageStyleChange={vi.fn(async () => {})}
        wikiId="bulbapedia"
        onWikiChange={vi.fn()}
        multiLocaleSearch={false}
        onMultiLocaleSearchToggle={vi.fn()}
      />
    </MemoryRouter>,
  );

  const name = screen.getByLabelText("Display name");
  const save = screen.getByRole("button", { name: "Save display name" });
  expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
  await user.clear(name);
  await user.type(name, "   ");
  await user.click(save);
  expect(screen.getByText("Enter a display name.")).toBeVisible();
  expect(onDisplayNameChange).not.toHaveBeenCalled();

  await user.clear(name);
  await user.type(name, "New   Trainer");
  await user.click(save);
  expect(onDisplayNameChange).toHaveBeenCalledExactlyOnceWith("New Trainer");
  expect(save).toBeDisabled();
  rejectSave(new Error("Write unavailable"));
  expect(
    await screen.findByText("Saving the display name failed."),
  ).toBeVisible();
  expect(name).toHaveValue("New   Trainer");
  expect(save).toBeEnabled();
});
