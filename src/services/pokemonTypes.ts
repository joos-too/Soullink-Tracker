import { POKEMON_DATA, POKEMON_TYPE_NAMES } from "@/src/data/pokemon";
import type { SupportedLanguage } from "@/src/utils/language";

const TYPE_NAMES: Record<SupportedLanguage, Record<string, string>> = {
  de: POKEMON_TYPE_NAMES.de,
  en: POKEMON_TYPE_NAMES.en,
};

/**
 * Returns the raw type slugs (e.g. ["grass", "poison"]) for a Pokémon id.
 */
export function getPokemonTypeSlugsById(
  id: number,
  generation?: number | null,
): string[] {
  const pokemon = POKEMON_DATA[id];
  const currentTypes = pokemon?.types ?? [];
  if (typeof generation !== "number") return currentTypes;
  const matchingPastEntry = (pokemon?.pastTypes ?? []).find(
    (entry) => generation <= entry.generation,
  );
  return matchingPastEntry?.types ?? currentTypes;
}

/**
 * Translate a single type slug (e.g. "grass") to a localized name.
 */
export function getLocalizedTypeName(
  slug: string,
  locale: SupportedLanguage,
): string {
  return TYPE_NAMES[locale]?.[slug] ?? slug;
}
