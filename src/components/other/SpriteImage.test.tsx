import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SpriteImage from "./SpriteImage.tsx";
import ItemSprite from "./ItemSprite.tsx";
import { ImageLoadingContext } from "@/src/contexts/ImageLoadingContext";
import { ImageConsentContext } from "@/src/contexts/ImageConsentContext";
import userEvent from "@testing-library/user-event";
import i18n from "@/src/i18n";

const renderWithImages = (ui: React.ReactNode) =>
  render(ui, {
    wrapper: ({ children }) => (
      <ImageLoadingContext.Provider value={true}>
        {children}
      </ImageLoadingContext.Provider>
    ),
  });

describe("SpriteImage", () => {
  it("opens settings by mouse and keyboard without triggering the surrounding card", async () => {
    await i18n.changeLanguage("en");
    const open = vi.fn();
    const card = vi.fn();
    render(
      <ImageConsentContext.Provider
        value={{
          decision: false,
          isOpen: false,
          openConsent: open,
          showGuestFooterEntry: false,
        }}
      >
        <div role="option" onClick={card} onKeyDown={card} onContextMenu={card}>
          <SpriteImage
            src="https://example.com/pokemon.png"
            alt=""
            aria-hidden="true"
            className="pointer-events-none w-8 h-8"
          />
        </div>
      </ImageConsentContext.Provider>,
    );
    const user = userEvent.setup();
    const button = screen.getByRole("button", {
      name: "Images blocked – open settings",
    });
    expect(button).not.toHaveAttribute("aria-hidden");
    expect(button).not.toHaveClass("pointer-events-none");
    await user.click(button);
    button.focus();
    await user.keyboard("{Enter} ");
    fireEvent.contextMenu(button);
    expect(open).toHaveBeenCalledTimes(3);
    expect(card).not.toHaveBeenCalled();
  });

  it("preserves custom fallbacks and does not invent placeholders for missing sources", () => {
    const { container } = render(
      <ImageConsentContext.Provider
        value={{
          decision: false,
          isOpen: false,
          openConsent: vi.fn(),
          showGuestFooterEntry: false,
        }}
      >
        <SpriteImage
          src="https://example.com/image.png"
          fallback={<span>Legacy</span>}
        />
        <SpriteImage src={null} />
      </ImageConsentContext.Provider>,
    );
    expect(screen.getByText("Legacy")).toBeInTheDocument();
    expect(container.querySelector("button")).toBeNull();
  });

  it("treats absolute same-origin URLs and srcSet as local", () => {
    render(
      <SpriteImage
        src={`${window.location.origin}/local.png`}
        srcSet={`${window.location.origin}/local@2x.png 2x`}
        alt="Local absolute"
      />,
    );
    expect(screen.getByAltText("Local absolute")).toBeInTheDocument();
  });
  it("blocks external src and srcSet until allowed, and restores placeholders on withdrawal", () => {
    const image = (
      <SpriteImage
        src="https://raw.githubusercontent.com/PokeAPI/sprites/pikachu.png"
        srcSet="https://raw.githubusercontent.com/PokeAPI/sprites/pikachu@2x.png 2x"
        alt="Pikachu"
      />
    );
    const { container, rerender } = render(image);
    expect(container.querySelector("img")).toBeNull();
    expect(container).toBeEmptyDOMElement();
    rerender(
      <ImageLoadingContext.Provider value={true}>
        {image}
      </ImageLoadingContext.Provider>,
    );
    expect(screen.getByAltText("Pikachu")).toHaveAttribute(
      "src",
      "https://raw.githubusercontent.com/PokeAPI/sprites/pikachu.png",
    );
    rerender(
      <ImageLoadingContext.Provider value={false}>
        {image}
      </ImageLoadingContext.Provider>,
    );
    expect(container.querySelector("img")).toBeNull();
  });

  it("uses the component-specific item fallback when images are blocked", () => {
    const { container } = render(
      <ItemSprite
        src="https://raw.githubusercontent.com/PokeAPI/sprites/item.png"
        placeholderClassName="blocked-placeholder"
      />,
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector(".blocked-placeholder")).toBeInTheDocument();
  });
  it("shows local sprites without external-image consent", () => {
    render(
      <SpriteImage
        src="/rival-sprites/red.png"
        alt="Rival"
        fallback={<div>Custom fallback</div>}
      />,
    );
    expect(screen.getByAltText("Rival")).toHaveAttribute(
      "src",
      "/rival-sprites/red.png",
    );
    expect(screen.queryByText("Custom fallback")).toBeNull();
  });
  it("retries only failed images on online, preserving URLs and image props", () => {
    renderWithImages(
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
      renderWithImages(<SpriteImage src="/missing.png" alt="Missing" />);
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
    const { rerender } = renderWithImages(
      <SpriteImage src="/old.png" alt="Sprite" />,
    );
    fireEvent.error(screen.getByAltText("Sprite"));
    rerender(<SpriteImage src="/new.png" alt="Sprite" />);
    expect(screen.getByAltText("Sprite")).toHaveAttribute("src", "/new.png");
  });

  it("removes the connectivity listener when unmounted", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderWithImages(
      <SpriteImage src="/sprite.png" alt="Sprite" />,
    );
    fireEvent.error(screen.getByAltText("Sprite"));
    unmount();
    expect(remove).toHaveBeenCalledWith("online", expect.any(Function));
    remove.mockRestore();
  });

  it("recovers item sprites from their existing placeholder", () => {
    const { container } = renderWithImages(
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
