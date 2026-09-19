import { POKEMON_DATA } from "@/src/data/pokemon.ts";
import { WIKIS, type WikiId } from "@/src/utils/wikiPreferences";
export {
  WIKIS,
  DEFAULT_WIKI_DE,
  DEFAULT_WIKI_EN,
  type WikiId,
  type Wiki,
} from "@/src/utils/wikiPreferences";

/**
 * Build the wiki URL for a given Pokémon id and wiki.
 * The correct localized name for the target wiki is resolved automatically via the existing Pokémon data.
 * Returns null when the Pokémon cannot be found in the data.
 */
export function getWikiUrlById(
  pokemonId: number | null | undefined,
  wikiId: WikiId,
): string | null {
  const wiki = WIKIS.find((w) => w.id === wikiId);
  if (!wiki) return null;
  if (typeof pokemonId !== "number") return null;

  const targetName =
    wiki.language === "de"
      ? POKEMON_DATA[pokemonId]?.names.de
      : POKEMON_DATA[pokemonId]?.names.en;
  if (!targetName) return null;

  return wiki.buildUrl(targetName);
}
