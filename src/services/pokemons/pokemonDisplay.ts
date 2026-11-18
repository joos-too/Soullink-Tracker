import type { Pokemon, PokemonImageStyle } from "@/types.ts";
import { getPokemonNameById } from "@/src/services/search/pokemonSearch.ts";
import { getPokemonImageUrlById } from "@/src/services/sprites.ts";
import type { SupportedLanguage } from "@/src/utils/language.ts";

type PokemonDisplaySource =
  | Pick<Pokemon, "id" | "name">
  | {
      id?: number | null;
      name?: string;
    }
  | null
  | undefined;

export function resolvePokemonDisplay(
  pokemon: PokemonDisplaySource,
  locale: SupportedLanguage,
  generationSpritePath?: string | null,
  imageStyle: PokemonImageStyle = "mixed",
  artworkInMixed = false,
): { displayName: string; spriteUrl: string | null } {
  const pokemonId = pokemon?.id ?? null;
  const displayName =
    getPokemonNameById(pokemonId, locale) || pokemon?.name || "";
  const spriteUrl = pokemonId
    ? getPokemonImageUrlById(
        pokemonId,
        imageStyle,
        generationSpritePath,
        artworkInMixed,
      )
    : null;

  return { displayName, spriteUrl };
}
