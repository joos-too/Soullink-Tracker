import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n.ts";
import RealtimeConnectionBanner from "./RealtimeConnectionBanner.tsx";

describe("RealtimeConnectionBanner", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("explains that editing can continue while disconnected", () => {
    render(
      <RealtimeConnectionBanner status="disconnected" onRetry={vi.fn()} />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "You can continue editing",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers retry after synchronization fails", () => {
    const onRetry = vi.fn();
    render(
      <RealtimeConnectionBanner status="resync-error" onRetry={onRetry} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
