import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n";
import StaySignedInCheckbox from "./StaySignedInCheckbox";

describe("privacy information", () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await i18n.changeLanguage("en");
  });
  it("opens from the stay-signed-in info link without changing the checkbox, and can be dismissed and reopened", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <MemoryRouter>
        <StaySignedInCheckbox
          checked={false}
          disabled={false}
          onChange={onChange}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Privacy and browser storage" }),
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent("90 days");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("GitHub");
    expect(
      screen.getByRole("link", { name: "Privacy Policy" }),
    ).toHaveAttribute("href", "/privacypolicy");
    await user.click(screen.getByRole("button", { name: "Got it" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Privacy and browser storage" }),
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
