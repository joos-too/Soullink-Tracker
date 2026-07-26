import { POKEMON_DATA } from "@/src/data/pokemon.ts";
import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
} from "@/src/utils/language.ts";

interface SearchOptions {
  maxGeneration?: number;
  locale?: SupportedLanguage;
  multiLocaleSearch?: boolean;
}

type PokemonNameEntry = {
  name: string;
  id: number;
  generation: number;
  lower: string;
};

const POKEMON_ENTRIES = Object.values(POKEMON_DATA);

const buildEntries = (locale: SupportedLanguage) =>
  POKEMON_ENTRIES.map((entry) => {
    const name = entry.names[locale] || entry.names.de || entry.names.en;
    return {
      name,
      id: entry.id,
      generation: entry.generation,
      lower: name.toLowerCase(),
    };
  }).sort((a, b) => a.name.localeCompare(b.name, locale));

const NAME_LISTS: Record<SupportedLanguage, PokemonNameEntry[]> = {
  de: buildEntries("de"),
  en: buildEntries("en"),
};

const ID_TO_NAME: Record<SupportedLanguage, Record<number, string>> = {
  de: Object.fromEntries(
    POKEMON_ENTRIES.map((entry) => [entry.id, entry.names.de]),
  ),
  en: Object.fromEntries(
    POKEMON_ENTRIES.map((entry) => [entry.id, entry.names.en]),
  ),
};

const ALL_NAME_ENTRIES = SUPPORTED_LANGUAGES.reduce<PokemonNameEntry[]>(
  (acc, locale) => acc.concat(NAME_LISTS[locale] || []),
  [],
);

const EVOLUTION_GRAPH = Object.entries(POKEMON_DATA).reduce<
  Record<number, number[]>
>((acc, [sourceId, pokemon]) => {
  const numericSourceId = Number(sourceId);
  (pokemon.evolutions ?? []).forEach(({ id }) => {
    acc[numericSourceId] = [...(acc[numericSourceId] || []), id];
    acc[id] = [...(acc[id] || []), numericSourceId];
  });
  return acc;
}, {});

const POKEMON_FAMILY_CACHE = new Map<number, Set<number>>();

export interface PokemonNameMatch {
  id: number;
  language: SupportedLanguage;
}

const MERGED_NAME_TO_ID: Record<string, PokemonNameMatch> = {};
SUPPORTED_LANGUAGES.forEach((locale) => {
  NAME_LISTS[locale].forEach(({ lower, id }) => {
    if (!MERGED_NAME_TO_ID[lower]) {
      MERGED_NAME_TO_ID[lower] = { id, language: locale };
    }
  });
});

const LOCALE_NAME_TO_ID: Record<SupportedLanguage, Record<string, number>> = {
  de: Object.fromEntries(NAME_LISTS.de.map(({ lower, id }) => [lower, id])),
  en: Object.fromEntries(NAME_LISTS.en.map(({ lower, id }) => [lower, id])),
};

export async function searchPokemonNames(
  query: string,
  max = 10,
  options: SearchOptions = {},
): Promise<string[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const { maxGeneration, locale = "de", multiLocaleSearch = false } = options;
  const list = NAME_LISTS[locale] || NAME_LISTS.de;

  const genFilter = (generation: number) =>
    typeof maxGeneration !== "number" || generation <= maxGeneration;

  const localMatches = list.filter(
    (entry) => entry.lower.includes(q) && genFilter(entry.generation),
  );
  const localResults = localMatches.slice(0, max).map((entry) => entry.name);

  if (!multiLocaleSearch || localResults.length >= max) {
    return localResults;
  }

  // Cross-locale: find matching IDs from other locales, return current-locale names
  const localIds = new Set(localMatches.map((entry) => entry.id));

  const crossLocaleIds = new Set<number>();
  SUPPORTED_LANGUAGES.forEach((lang) => {
    if (lang === locale) return;
    (NAME_LISTS[lang] || []).forEach((entry) => {
      if (
        entry.lower.includes(q) &&
        genFilter(entry.generation) &&
        !localIds.has(entry.id)
      ) {
        crossLocaleIds.add(entry.id);
      }
    });
  });

  const idToName = ID_TO_NAME[locale] || ID_TO_NAME.de;
  const crossResults = Array.from(crossLocaleIds)
    .map((id) => idToName[id])
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, locale));

  return [...localResults, ...crossResults].slice(0, max);
}

function collectPokemonFamilyIds(id: number): Set<number> {
  const cached = POKEMON_FAMILY_CACHE.get(id);
  if (cached) return cached;

  const visited = new Set<number>();
  const queue = [id];

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (typeof currentId !== "number" || visited.has(currentId)) continue;
    visited.add(currentId);
    (EVOLUTION_GRAPH[currentId] || []).forEach((neighborId) => {
      if (!visited.has(neighborId)) {
        queue.push(neighborId);
      }
    });
  }

  POKEMON_FAMILY_CACHE.set(id, visited);
  return visited;
}

export function getPokemonFamilyIdsMatchingQuery(
  query: string,
  options: SearchOptions = {},
): Set<number> {
  const q = query.trim().toLowerCase();
  if (!q) return new Set<number>();

  const { maxGeneration, locale, multiLocaleSearch = true } = options;
  const entries =
    !multiLocaleSearch && locale
      ? NAME_LISTS[locale] || NAME_LISTS.de
      : ALL_NAME_ENTRIES;
  return entries.reduce<Set<number>>((acc, entry) => {
    if (!entry.lower.includes(q)) return acc;
    if (typeof maxGeneration === "number" && entry.generation > maxGeneration) {
      return acc;
    }
    collectPokemonFamilyIds(entry.id).forEach((familyId) => acc.add(familyId));
    return acc;
  }, new Set<number>());
}

export function findPokemonIdByName(
  name: string | undefined | null,
  locale?: SupportedLanguage,
): PokemonNameMatch | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (!key) return null;
  if (locale) {
    const id = LOCALE_NAME_TO_ID[locale]?.[key];
    if (typeof id === "number") return { id, language: locale };
    return null;
  }
  return MERGED_NAME_TO_ID[key] || null;
}

export function getPokemonIdFromName(
  name: string | undefined | null,
): number | null {
  const match = findPokemonIdByName(name);
  return match ? match.id : null;
}

export function getPokemonNameById(
  id: number | null | undefined,
  locale: SupportedLanguage,
): string | undefined {
  if (typeof id !== "number") return undefined;
  return ID_TO_NAME[locale]?.[id];
}
