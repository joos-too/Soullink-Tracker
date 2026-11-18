import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n";
import ImageConsentModal from "./ImageConsentModal";

describe("image consent modal", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });
  it("requires an initial choice and traps focus without dismissing on Escape or backdrop", async () => {
    const close = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ImageConsentModal requireDecision onChoose={vi.fn()} onClose={close} />
      </MemoryRouter>,
    );
    const dialog = screen.getByRole("dialog", {
      name: "External images from GitHub",
    });
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    await user.keyboard("{Escape}");
    fireEvent.click(dialog.parentElement!);
    expect(close).not.toHaveBeenCalled();
    const allow = screen.getByRole("button", { name: "Allow external images" });
    allow.focus();
    await user.tab();
    expect(screen.getByRole("link")).toHaveFocus();
    await user.tab({ shift: true });
    expect(allow).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("closes a manually opened dialog without saving, restoring focus and preserving the underlying draft", async () => {
    const choose = vi.fn();
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <MemoryRouter>
          <div role="dialog" aria-label="Edit">
            <input aria-label="Draft" defaultValue="Unsaved" />
            <button onClick={() => setOpen(true)}>Settings</button>
          </div>
          {open && (
            <ImageConsentModal
              requireDecision={false}
              onChoose={choose}
              onClose={() => setOpen(false)}
            />
          )}
        </MemoryRouter>
      );
    }
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    const opener = screen.getByRole("button", { name: "Settings" });
    await user.click(opener);
    expect(container.inert).toBe(true);
    fireEvent.click(
      screen.getByRole("dialog", { name: "External images from GitHub" })
        .parentElement!,
    );
    expect(
      screen.getByRole("dialog", { name: "External images from GitHub" }),
    ).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(opener).toHaveFocus();
    expect(container.inert).not.toBe(true);
    expect(screen.getByRole("textbox", { name: "Draft" })).toHaveValue(
      "Unsaved",
    );
    await user.click(opener);
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
    await user.keyboard("{Escape}");
    expect(opener).toHaveFocus();
    expect(choose).not.toHaveBeenCalled();
  });
  it.each([false, true])("records an explicit choice %s", async (allowed) => {
    const choose = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ImageConsentModal
          requireDecision={true}
          onChoose={choose}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );
    await user.click(
      screen.getByRole("button", {
        name: allowed
          ? "Allow external images"
          : "Continue without external images",
      }),
    );
    expect(choose).toHaveBeenCalledWith(allowed);
  });
  it("supports an additional confirmation heading without changing the default modal", () => {
    render(
      <MemoryRouter>
        <ImageConsentModal
          requireDecision
          confirmationTitle="Are you sure?"
          onChoose={vi.fn()}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole("dialog", { name: "Are you sure?" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "External images from GitHub" }),
    ).toBeVisible();
  });
  it("keeps the choice available after a save failure", async () => {
    const choose = vi.fn().mockRejectedValue(new Error("Offline"));
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ImageConsentModal
          requireDecision={true}
          onChoose={choose}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );
    await user.click(
      screen.getByRole("button", { name: "Allow external images" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "could not be saved",
    );
    expect(
      screen.getByRole("button", { name: "Continue without external images" }),
    ).toBeEnabled();
  });
});
