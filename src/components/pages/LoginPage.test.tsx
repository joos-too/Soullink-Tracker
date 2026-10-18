import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n.ts";
import LoginPage from "./LoginPage.tsx";

const { requestPasswordResetMock, signInMock } = vi.hoisted(() => ({
  requestPasswordResetMock: vi.fn(),
  signInMock: vi.fn(),
}));

vi.mock("@/src/services/backend/auth.ts", () => ({
  requestPasswordReset: requestPasswordResetMock,
  signIn: signInMock,
}));

describe("LoginPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    requestPasswordResetMock.mockReset();
    signInMock.mockReset();
  });

  it.each([false, true])(
    "submits the stay-signed-in choice %s",
    async (staySignedIn) => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <LoginPage onSwitchToRegister={vi.fn()} />
        </MemoryRouter>,
      );
      const checkbox = screen.getByRole("checkbox", { name: "Stay signed in" });
      expect(checkbox).not.toBeChecked();
      if (staySignedIn) await user.click(checkbox);
      await user.type(screen.getByLabelText("Email"), "trainer@example.com");
      await user.type(screen.getByLabelText("Password"), "password123");
      await user.click(screen.getByRole("button", { name: "Sign in" }));
      expect(signInMock).toHaveBeenCalledWith(
        "trainer@example.com",
        "password123",
        staySignedIn,
      );
    },
  );

  it("requests a password reset and confirms that the link was sent", async () => {
    const user = userEvent.setup();
    requestPasswordResetMock.mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <LoginPage onSwitchToRegister={vi.fn()} />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("Email"), "trainer@example.com");
    await user.click(
      screen.getByRole("button", { name: "Forgot your password?" }),
    );
    await user.click(screen.getByRole("button", { name: "Send reset email" }));

    expect(requestPasswordResetMock).toHaveBeenCalledWith(
      "trainer@example.com",
    );
    const sentButton = await screen.findByRole("button", {
      name: "Email sent",
    });
    expect(sentButton).toBeDisabled();
  });
});
