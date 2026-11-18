import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/src/i18n";
import PersonalizationPage from "./PersonalizationPage";

const renderPage = (onComplete = vi.fn(async () => {})) => {
  render(
    <MemoryRouter>
      <PersonalizationPage
        initialAllowImageLoading={false}
        useGenerationSprites={false}
        onGenerationSpritesToggle={vi.fn()}
        pokemonImageStyle="mixed"
        onPokemonImageStyleChange={vi.fn(async () => {})}
        wikiId="bulbapedia"
        onWikiChange={vi.fn()}
        multiLocaleSearch={false}
        onMultiLocaleSearchToggle={vi.fn()}
        onComplete={onComplete}
      />
    </MemoryRouter>,
  );
  return onComplete;
};

describe("PersonalizationPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders the shared preference sections in its own page shell", () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Personalize your experience" }),
    ).toBeVisible();
    const languageHeading = screen.getByRole("heading", { name: "Language" });
    expect(languageHeading).toBeVisible();
    expect(languageHeading.closest("section")).not.toHaveClass("border-t");
    expect(screen.getByRole("heading", { name: "Sprites" })).toBeVisible();
    expect(
      screen.getByRole("heading", { name: "Wiki-Provider" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Account" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Logout" })).toBeNull();
  });

  it("completes directly when image loading is checked", async () => {
    const onComplete = renderPage();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("checkbox", {
        name: /I want to allow external images from GitHub/i,
      }),
    );
    await user.click(
      screen.getByRole("button", { name: "Continue to the tracker" }),
    );

    expect(onComplete).toHaveBeenCalledWith(true);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks for confirmation with the shared modal when unchecked", async () => {
    const onComplete = renderPage();
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: "Continue to the tracker" }),
    );

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Are you sure?" })).toBeVisible();
    await user.click(
      screen.getByRole("button", { name: "Continue without external images" }),
    );
    expect(onComplete).toHaveBeenCalledWith(false);
  });
});
