import type { Pokemon } from "@/types";
import { getPokemonNameById } from "@/src/services/pokemonSearch.ts";
import { getSpriteUrlById } from "@/src/services/sprites.ts";
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
): { displayName: string; spriteUrl: string | null } {
  const pokemonId = pokemon?.id ?? null;
  const displayName =
    getPokemonNameById(pokemonId, locale) || pokemon?.name || "";
  const spriteUrl = pokemonId
    ? getSpriteUrlById(pokemonId, generationSpritePath)
    : null;

  return { displayName, spriteUrl };
}
