import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SpriteImage from "./SpriteImage.tsx";
import ItemSprite from "./ItemSprite.tsx";

describe("SpriteImage", () => {
  it("retries only failed images on online, preserving URLs and image props", () => {
    render(
      <>
        <SpriteImage
          src="/pokemon.png"
          alt="Pokemon"
          loading="lazy"
          className="w-8"
        />
        <SpriteImage src="/loaded.png" alt="Loaded" />
      </>,
    );
    const failed = screen.getByAltText("Pokemon");
    const loaded = screen.getByAltText("Loaded");
    fireEvent.load(loaded);
    fireEvent.error(failed);
    expect(screen.queryByAltText("Pokemon")).not.toBeInTheDocument();

    fireEvent(window, new Event("online"));
    const retried = screen.getByAltText("Pokemon");
    expect(retried).not.toBe(failed);
    expect(retried).toHaveAttribute("src", "/pokemon.png");
    expect(retried).toHaveAttribute("loading", "lazy");
    expect(retried).toHaveClass("w-8");
    expect(screen.getByAltText("Loaded")).toBe(loaded);
    fireEvent.load(retried);
    fireEvent(window, new Event("online"));
    expect(screen.getByAltText("Pokemon")).toBe(retried);
  });

  it("does not loop if the retry also fails", () => {
    vi.useFakeTimers();
    try {
      render(<SpriteImage src="/missing.png" alt="Missing" />);
      fireEvent.error(screen.getByAltText("Missing"));
      fireEvent(window, new Event("online"));
      fireEvent.error(screen.getByAltText("Missing"));
      act(() => vi.advanceTimersByTime(60_000));
      expect(screen.queryByAltText("Missing")).not.toBeInTheDocument();
      fireEvent(window, new Event("online"));
      expect(screen.getByAltText("Missing")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("resets failures when the source changes", () => {
    const { rerender } = render(<SpriteImage src="/old.png" alt="Sprite" />);
    fireEvent.error(screen.getByAltText("Sprite"));
    rerender(<SpriteImage src="/new.png" alt="Sprite" />);
    expect(screen.getByAltText("Sprite")).toHaveAttribute("src", "/new.png");
  });

  it("removes the connectivity listener when unmounted", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<SpriteImage src="/sprite.png" alt="Sprite" />);
    fireEvent.error(screen.getByAltText("Sprite"));
    unmount();
    expect(remove).toHaveBeenCalledWith("online", expect.any(Function));
    remove.mockRestore();
  });

  it("recovers item sprites from their existing placeholder", () => {
    const { container } = render(
      <ItemSprite
        src="/item.png"
        placeholderClassName="item-placeholder"
        used
      />,
    );
    fireEvent.error(container.querySelector("img")!);
    expect(container.querySelector(".item-placeholder")).toBeInTheDocument();
    fireEvent(window, new Event("online"));
    expect(
      container.querySelector(".item-placeholder"),
    ).not.toBeInTheDocument();
    expect(container.querySelector("img")).toHaveAttribute("src", "/item.png");
    expect(container.querySelector("img")).toHaveClass("grayscale-[0.5]");
  });
});
