import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n.ts";
import TrackerConflictBanner from "./TrackerConflictBanner.tsx";

describe("TrackerConflictBanner", () => {
  it.each([
    ["en", "Tracker updated elsewhere", "Reload tracker"],
    ["de", "Tracker wurde anderswo aktualisiert", "Tracker neu laden"],
  ])(
    "shows an inline conflict warning in %s with reload action",
    async (locale, title, reload) => {
      await i18n.changeLanguage(locale);
      const onReload = vi.fn();
      render(<TrackerConflictBanner onReload={onReload} />);

      const banner = screen.getByRole("status");
      expect(banner).toHaveTextContent(title);
      expect(banner).toHaveAttribute("aria-live", "polite");
      expect(banner).not.toHaveClass("fixed");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: reload }));
      expect(onReload).toHaveBeenCalledOnce();
    },
  );
});
