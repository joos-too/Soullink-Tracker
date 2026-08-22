import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n.ts";
import LoginPage from "./LoginPage.tsx";

const { requestPasswordResetMock } = vi.hoisted(() => ({
  requestPasswordResetMock: vi.fn(),
}));

vi.mock("@/src/services/backend/auth.ts", () => ({
  requestPasswordReset: requestPasswordResetMock,
  signIn: vi.fn(),
}));

describe("LoginPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    requestPasswordResetMock.mockReset();
  });

  it("requests a password reset and confirms that the link was sent", async () => {
    const user = userEvent.setup();
    requestPasswordResetMock.mockResolvedValue(undefined);
    render(<LoginPage onSwitchToRegister={vi.fn()} />);

    await user.type(screen.getByLabelText("Email"), "trainer@example.com");
    await user.click(
      screen.getByRole("button", { name: "Forgot your password?" }),
    );
    await user.click(screen.getByRole("button", { name: "Send reset email" }));

    expect(requestPasswordResetMock).toHaveBeenCalledWith(
      "trainer@example.com",
    );
    expect(
      screen.getByText(
        "We sent you an email with a link to reset your password.",
      ),
    ).toBeInTheDocument();
  });
});
