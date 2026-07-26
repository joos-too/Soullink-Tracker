import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n.ts";
import PasswordResetPage from "./PasswordResetPage.tsx";

const {
  completePasswordResetMock,
  getAuthErrorCodeMock,
  verifyPasswordResetMock,
} = vi.hoisted(() => ({
  completePasswordResetMock: vi.fn(),
  getAuthErrorCodeMock: vi.fn(),
  verifyPasswordResetMock: vi.fn(),
}));

vi.mock("@/src/services/backend/auth.ts", () => ({
  completePasswordReset: completePasswordResetMock,
  getAuthErrorCode: getAuthErrorCodeMock,
  passwordResetRequiresCode: false,
  signOutCurrentUser: vi.fn(),
  verifyPasswordReset: verifyPasswordResetMock,
}));

describe("PasswordResetPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    completePasswordResetMock.mockReset();
    getAuthErrorCodeMock.mockReset();
    verifyPasswordResetMock.mockReset();
  });

  it("validates a Supabase recovery session without a Firebase oobCode", async () => {
    verifyPasswordResetMock.mockResolvedValue("trainer@example.com");

    render(
      <MemoryRouter initialEntries={["/reset"]}>
        <PasswordResetPage oobCode={null} />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(verifyPasswordResetMock).toHaveBeenCalledWith(null),
    );
    expect(await screen.findByText("trainer@example.com")).toBeInTheDocument();
    expect(screen.queryByText("Link invalid")).not.toBeInTheDocument();
  });

  it("shows a localized error when the new password matches the old one", async () => {
    const user = userEvent.setup();
    verifyPasswordResetMock.mockResolvedValue("trainer@example.com");
    completePasswordResetMock.mockRejectedValue({ code: "same_password" });
    getAuthErrorCodeMock.mockReturnValue("same-password");

    render(
      <MemoryRouter initialEntries={["/reset"]}>
        <PasswordResetPage oobCode={null} />
      </MemoryRouter>,
    );

    await screen.findByText("trainer@example.com");
    await user.type(screen.getByLabelText("New password"), "password123");
    await user.type(screen.getByLabelText("Confirm password"), "password123");
    await user.click(screen.getByRole("button", { name: "Set password" }));

    expect(
      await screen.findByText(
        "The new password must be different from your old password.",
      ),
    ).toBeInTheDocument();
  });
});
