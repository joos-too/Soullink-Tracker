import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import i18n from "@/src/i18n";
import * as auth from "@/src/services/backend/auth";
import UserSettingsPage from "./UserSettingsPage";

function renderSettings(
  onDisplayNameChange = vi.fn<(displayName: string) => Promise<void>>(),
) {
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
}

it("validates display names, preserves failed drafts, and confirms a successful save", async () => {
  await i18n.changeLanguage("en");
  const user = userEvent.setup();
  let rejectSave!: (error: Error) => void;
  const onDisplayNameChange = vi
    .fn<(displayName: string) => Promise<void>>()
    .mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          rejectSave = reject;
        }),
    )
    .mockResolvedValueOnce(undefined);
  vi.spyOn(console, "error").mockImplementation(() => {});
  renderSettings(onDisplayNameChange);

  const name = screen.getByLabelText("Display name");
  const save = screen.getByRole("button", { name: "Save display name" });
  expect(screen.getByLabelText("Email")).toBeDisabled();
  expect(save).toBeDisabled();
  await user.clear(name);
  await user.type(name, " Old   Trainer ");
  expect(save).toBeDisabled();
  await user.keyboard("{Enter}");
  expect(onDisplayNameChange).not.toHaveBeenCalled();

  await user.clear(name);
  await user.type(name, "old Trainer");
  expect(save).toBeEnabled();

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

  await user.click(save);
  expect(await screen.findByRole("status")).toHaveTextContent(
    "Display name saved.",
  );
  expect(name).toHaveValue("New Trainer");
  await user.type(name, "!");
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("lets the user retry an email change while keeping the current sign-in address", async () => {
  await i18n.changeLanguage("en");
  const user = userEvent.setup();
  const request = vi
    .spyOn(auth, "requestEmailChange")
    .mockRejectedValueOnce({ code: "email_exists" })
    .mockResolvedValueOnce(undefined);
  renderSettings();

  const emailInput = screen.getByLabelText("Email", { exact: true });
  const edit = () =>
    user.click(screen.getByRole("button", { name: "Edit email" }));
  expect(emailInput).toBeDisabled();
  await edit();
  expect(emailInput).toHaveFocus();
  await user.clear(emailInput);
  await user.type(emailInput, "draft@example.com");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(emailInput).toBeDisabled();
  expect(emailInput).toHaveValue("trainer@example.com");
  expect(screen.getByRole("button", { name: "Reset password" })).toBeEnabled();

  await edit();
  const send = screen.getByRole("button", { name: "Send confirmation link" });
  expect(send).toBeDisabled();
  await user.clear(emailInput);
  await user.type(emailInput, "TRAINER@example.com");
  expect(send).toBeDisabled();
  await user.keyboard("{Enter}");
  expect(request).not.toHaveBeenCalled();

  await user.clear(emailInput);
  await user.type(emailInput, "Taken@example.com");
  expect(send).toBeEnabled();
  await user.click(send);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "This email address is already in use.",
  );
  expect(emailInput).toHaveValue("Taken@example.com");

  await user.clear(emailInput);
  await user.type(emailInput, "New@EXAMPLE.com");
  await user.click(send);
  expect(await screen.findByRole("status")).toHaveTextContent(
    "We sent a confirmation link to new@example.com.",
  );
  expect(request).toHaveBeenLastCalledWith("new@example.com");
  expect(emailInput).toBeDisabled();
  expect(emailInput).toHaveValue("trainer@example.com");
});

it("shows the reset link lifetime after sending the email", async () => {
  await i18n.changeLanguage("en");
  const user = userEvent.setup();
  const reset = vi
    .spyOn(auth, "requestPasswordReset")
    .mockResolvedValue(undefined);
  renderSettings();

  expect(screen.queryByText(/24 hours/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Reset password" }));
  expect(reset).toHaveBeenCalledExactlyOnceWith("trainer@example.com");
  expect(await screen.findByRole("status")).toHaveTextContent(
    "The link is valid for 24 hours.",
  );
});
