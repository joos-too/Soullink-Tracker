import { expect, it } from "vitest";
import { searchPokemonNames } from "./pokemonSearch";

it.each([
  { locale: "en", query: "Taubsi", localized: "Pidgey" },
  { locale: "de", query: "Pidgey", localized: "Taubsi" },
] as const)(
  "matches alternate-locale names while displaying the $locale name",
  async ({ locale, query, localized }) => {
    await expect(searchPokemonNames(query, 1, { locale })).resolves.toEqual([]);
    await expect(
      searchPokemonNames(query, 1, { locale, multiLocaleSearch: true }),
    ).resolves.toEqual([localized]);
  },
);

it("applies generation restrictions to alternate-locale matches", async () => {
  const options = { locale: "en", multiLocaleSearch: true } as const;
  await expect(
    searchPokemonNames("Endivie", 1, { ...options, maxGeneration: 1 }),
  ).resolves.toEqual([]);
  await expect(
    searchPokemonNames("Endivie", 1, { ...options, maxGeneration: 2 }),
  ).resolves.toEqual(["Chikorita"]);
});
