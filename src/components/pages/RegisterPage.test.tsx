import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n.ts";
import RegisterPage from "./RegisterPage.tsx";

const { signUpMock, verifyEmailOtpMock } = vi.hoisted(() => ({
  signUpMock: vi.fn(),
  verifyEmailOtpMock: vi.fn(),
}));

vi.mock("@/src/services/backend/auth.ts", () => ({
  signUp: signUpMock,
  verifyEmailOtp: verifyEmailOtpMock,
  getAuthErrorCode: () => "unknown",
}));

describe("RegisterPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    signUpMock.mockReset();
  });

  it.each([false, true])(
    "submits the normalized display name and persistence choice %s through confirmation",
    async (staySignedIn) => {
      const user = userEvent.setup();
      signUpMock.mockResolvedValue({ confirmationRequired: true });
      render(
        <MemoryRouter>
          <RegisterPage onSwitchToLogin={vi.fn()} />
        </MemoryRouter>,
      );
      const checkbox = screen.getByRole("checkbox", { name: "Stay signed in" });
      expect(checkbox).not.toBeChecked();
      if (staySignedIn) await user.click(checkbox);

      await user.type(
        screen.getByLabelText("Display name"),
        "  Ash   Ketchum  ",
      );
      await user.type(screen.getByLabelText("Email"), "ash@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.type(screen.getByLabelText("Confirm password"), "password123");
      await user.click(screen.getByRole("button", { name: "Register" }));

      expect(signUpMock).toHaveBeenCalledWith(
        "ash@example.com",
        "password123",
        "Ash Ketchum",
        "en",
        staySignedIn,
      );
      await user.type(
        screen.getByLabelText(i18n.t("auth.register.confirmation.codeLabel")),
        "123456",
      );
      await user.click(
        screen.getByRole("button", {
          name: i18n.t("auth.register.confirmation.submit"),
        }),
      );
      expect(verifyEmailOtpMock).toHaveBeenCalledWith(
        "ash@example.com",
        "123456",
        staySignedIn,
      );
    },
  );

  it("can reveal and hide a password", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <RegisterPage onSwitchToLogin={vi.fn()} />
      </MemoryRouter>,
    );
    const password = screen.getByLabelText("Password");

    expect(password).toHaveAttribute("type", "password");
    await user.click(
      screen.getAllByRole("button", { name: "Show password" })[0],
    );
    expect(password).toHaveAttribute("type", "text");
    await user.click(
      screen.getAllByRole("button", { name: "Hide password" })[0],
    );
    expect(password).toHaveAttribute("type", "password");
  });
});
