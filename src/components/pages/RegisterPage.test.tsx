import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n.ts";
import RegisterPage from "./RegisterPage.tsx";

const { signUpMock } = vi.hoisted(() => ({ signUpMock: vi.fn() }));

vi.mock("@/src/services/backend/auth.ts", () => ({
  signUp: signUpMock,
  getAuthErrorCode: () => "unknown",
}));

describe("RegisterPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    signUpMock.mockReset();
  });

  it("submits the normalized display name with the credentials", async () => {
    const user = userEvent.setup();
    render(<RegisterPage onSwitchToLogin={vi.fn()} />);

    await user.type(screen.getByLabelText("Display name"), "  Ash   Ketchum  ");
    await user.type(screen.getByLabelText("Email"), "ash@example.com");
    await user.type(screen.getByLabelText("Password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: "Register" }));

    expect(signUpMock).toHaveBeenCalledWith(
      "ash@example.com",
      "password123",
      "Ash Ketchum",
    );
  });
});
