import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import i18n from "@/src/i18n.ts";
import ReadOnlyNoticeBanner, {
  READ_ONLY_NOTICE_STORAGE_KEY,
} from "./ReadOnlyNoticeBanner.tsx";

describe("ReadOnlyNoticeBanner", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage("en");
  });

  it("dismisses the notice and saves the tracker-specific preference", () => {
    render(<ReadOnlyNoticeBanner trackerId="tracker-one" notice="Read only" />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Read only")).not.toBeInTheDocument();
    expect(
      JSON.parse(
        window.localStorage.getItem(READ_ONLY_NOTICE_STORAGE_KEY) ?? "[]",
      ),
    ).toEqual(["tracker-one"]);
  });

  it("keeps another tracker's notice visible", () => {
    window.localStorage.setItem(
      READ_ONLY_NOTICE_STORAGE_KEY,
      JSON.stringify(["tracker-one"]),
    );

    const { rerender } = render(
      <ReadOnlyNoticeBanner
        key="tracker-one"
        trackerId="tracker-one"
        notice="First tracker"
      />,
    );
    expect(screen.queryByText("First tracker")).not.toBeInTheDocument();

    rerender(
      <ReadOnlyNoticeBanner
        key="tracker-two"
        trackerId="tracker-two"
        notice="Second tracker"
      />,
    );
    expect(screen.getByText("Second tracker")).toBeVisible();
  });

  it("preserves previously dismissed tracker IDs", () => {
    window.localStorage.setItem(
      READ_ONLY_NOTICE_STORAGE_KEY,
      JSON.stringify(["tracker-one"]),
    );
    render(
      <ReadOnlyNoticeBanner trackerId="tracker-two" notice="Second tracker" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(
      JSON.parse(
        window.localStorage.getItem(READ_ONLY_NOTICE_STORAGE_KEY) ?? "[]",
      ),
    ).toEqual(["tracker-one", "tracker-two"]);
  });
});
