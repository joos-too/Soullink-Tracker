import { LOCATIONS } from "@/src/data/locations";
import { SupportedLanguage } from "@/src/utils/language";
import { t } from "i18next";
import { FossilEntry, ItemEntry, PokemonLink } from "@/types.ts";

const DEFAULT_GAME_VERSION_ID = "gen5_bw";

interface SearchOptions {
  locale?: SupportedLanguage;
  gameVersionId?: string;
  multiLocaleSearch?: boolean;
}

interface LocationEntry {
  name: string;
  slug: string;
  normalized: string;
  region: string | null;
}

interface LocationDataEntry {
  names: Record<SupportedLanguage, string>;
  slug: string;
  region: string;
}

const DEFAULT_LOCATION_LOCALE: SupportedLanguage = "en";

const ROUTE_NUMBER_NAME_REGEX = /\broute[\s-]*(\d+)\b/i;
const ROUTE_NUMBER_SLUG_REGEX = /route-(\d+)/i;

const SEA_ROUTE_PREFIX_REGEX = /^Sea\s+(?=Route\b)/i;

const stripDiacritics = (value: string): string =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const normalizeForSearch = (value: string): string =>
  stripDiacritics(value.trim().toLowerCase());

const normalizeRouteDisplayName = (name: string): string =>
  name.replace(SEA_ROUTE_PREFIX_REGEX, "");

const VERSION_REGION_MAP: Record<string, string[]> = {
  gen1_rb: ["kanto"],
  gen1_y: ["kanto"],
  gen3_frlg: ["kanto"],
  gen2_gs: ["johto", "kanto"],
  gen2_c: ["johto", "kanto"],
  gen4_hgss: ["johto", "kanto"],
  gen3_rusa: ["hoenn"],
  gen3_em: ["hoenn"],
  gen6_oras: ["hoenn"],
  gen5_bw: ["unova"],
  gen5_b2w2: ["unova"],
  gen6_xy: ["kalos"],
  gen4_dp: ["sinnoh"],
  gen4_pt: ["sinnoh"],
};

const getRegionsForVersion = (versionId?: string): Set<string> => {
  const key =
    versionId && VERSION_REGION_MAP[versionId]
      ? versionId
      : DEFAULT_GAME_VERSION_ID;
  const regions = VERSION_REGION_MAP[key] || [];
  return new Set(regions.map((region) => region.toLowerCase()));
};

const parseRouteNumberFromName = (name: string): number | null => {
  if (!name) return null;
  const match = ROUTE_NUMBER_NAME_REGEX.exec(name);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

const parseRouteNumberFromSlug = (slug: string): number | null => {
  if (!slug) return null;
  const match = ROUTE_NUMBER_SLUG_REGEX.exec(slug);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

const getRouteNumberForEntry = (entry: LocationEntry): number | null =>
  parseRouteNumberFromName(entry.name) ?? parseRouteNumberFromSlug(entry.slug);

const buildEntries = (
  items: LocationDataEntry[],
  locale: SupportedLanguage,
): LocationEntry[] =>
  items.map((entry) => {
    const name =
      entry.names[locale] ?? entry.names[DEFAULT_LOCATION_LOCALE] ?? entry.slug;
    const normalizedName = normalizeRouteDisplayName(name);
    return {
      slug: entry.slug,
      region: entry.region,
      name: normalizedName,
      normalized: normalizeForSearch(normalizedName),
    };
  });

const getEntriesForLocale = (locale: SupportedLanguage): LocationEntry[] => {
  const entries = buildEntries(LOCATIONS, locale);
  if (entries.length) return entries;
  return buildEntries(LOCATIONS, DEFAULT_LOCATION_LOCALE);
};

const LOCATION_LISTS: Record<SupportedLanguage, LocationEntry[]> = {
  en: getEntriesForLocale("en"),
  de: getEntriesForLocale("de"),
};

const ALL_LOCATION_ENTRIES = Object.values(LOCATION_LISTS).flat();

export interface LocationSearchResult {
  slug: string;
  name: string;
}

const getLocaleList = (locale: SupportedLanguage): LocationEntry[] => {
  const fallbackList = LOCATION_LISTS[DEFAULT_LOCATION_LOCALE] ?? [];
  return LOCATION_LISTS[locale]?.length ? LOCATION_LISTS[locale] : fallbackList;
};

const getEntryBySlug = (
  slug: string,
  locale: SupportedLanguage = DEFAULT_LOCATION_LOCALE,
): LocationEntry | undefined =>
  getLocaleList(locale).find((location) => location.slug === slug) ??
  getLocaleList(DEFAULT_LOCATION_LOCALE).find(
    (location) => location.slug === slug,
  ) ??
  ALL_LOCATION_ENTRIES.find((location) => location.slug === slug);

const getEntriesBySlug = (slug: string): LocationEntry[] =>
  ALL_LOCATION_ENTRIES.filter((location) => location.slug === slug);

const sortLocations = (entries: LocationEntry[]): LocationEntry[] =>
  [...entries].sort((a, b) => {
    const aRoute = getRouteNumberForEntry(a);
    const bRoute = getRouteNumberForEntry(b);
    if (aRoute !== null && bRoute !== null) {
      if (aRoute !== bRoute) return aRoute - bRoute;
      const nameCompare = a.name.localeCompare(
        b.name,
        DEFAULT_LOCATION_LOCALE,
        {
          sensitivity: "base",
        },
      );
      if (nameCompare !== 0) return nameCompare;
      return a.slug.localeCompare(b.slug);
    }
    return a.name.localeCompare(b.name, DEFAULT_LOCATION_LOCALE, {
      sensitivity: "base",
    });
  });

export async function searchLocations(
  query: string,
  max = 10,
  options: SearchOptions = {},
): Promise<LocationSearchResult[]> {
  const q = normalizeForSearch(query);
  if (q.length < 2) return [];
  const { locale = "en", gameVersionId, multiLocaleSearch = false } = options;
  const allowedRegions = getRegionsForVersion(gameVersionId);
  if (!allowedRegions.size) return [];

  const isMatchingEntry = (entry: LocationEntry) => {
    const matchesTerm = entry.normalized.includes(q);
    return matchesTerm && !!entry.region && allowedRegions.has(entry.region);
  };

  const localResults = getLocaleList(locale).filter(isMatchingEntry);
  const matchingEntries =
    multiLocaleSearch && localResults.length < max
      ? [
          ...localResults,
          ...ALL_LOCATION_ENTRIES.filter(
            (entry) =>
              !localResults.some(
                (localEntry) => localEntry.slug === entry.slug,
              ) && isMatchingEntry(entry),
          ),
        ]
      : localResults;

  const sorted = sortLocations(matchingEntries);
  const unique: LocationEntry[] = [];
  const seenSlugs = new Set<string>();
  sorted.forEach((entry) => {
    if (!seenSlugs.has(entry.slug)) {
      seenSlugs.add(entry.slug);
      unique.push(entry);
    }
  });
  return unique.slice(0, max).map((entry) => ({
    slug: entry.slug,
    name: getEntryBySlug(entry.slug, locale)?.name ?? entry.name,
  }));
}

export function getLocationName(
  slug: string | undefined | null,
  locale: SupportedLanguage = DEFAULT_LOCATION_LOCALE,
): string {
  if (!slug) return "";
  const entry = getEntryBySlug(slug, locale);
  return entry?.name ?? slug;
}

export function getFossilLocationName(slugs: string[]): string {
  if (slugs.length === 0) return "";
  return slugs.map((slug) => t(`fossils.${slug}`)).join("/");
}

export function findLocationByName(
  name: string | undefined | null,
  options: SearchOptions = {},
): LocationSearchResult | null {
  const normalizedName = normalizeForSearch(name ?? "");
  if (!normalizedName) return null;

  const {
    locale = DEFAULT_LOCATION_LOCALE,
    gameVersionId,
    multiLocaleSearch = false,
  } = options;
  const allowedRegions = getRegionsForVersion(gameVersionId);

  const isMatchingEntry = (entry: LocationEntry) => {
    if (!entry.region || !allowedRegions.has(entry.region)) return false;
    return (
      entry.normalized === normalizedName ||
      normalizeForSearch(entry.slug) === normalizedName
    );
  };
  const found =
    getLocaleList(locale).find(isMatchingEntry) ??
    (multiLocaleSearch
      ? ALL_LOCATION_ENTRIES.find(isMatchingEntry)
      : undefined);
  const displayEntry = found ? getEntryBySlug(found.slug, locale) : null;

  return found
    ? { slug: found.slug, name: displayEntry?.name ?? found.name }
    : null;
}

export function locationMatchesQuery(
  locationName: string | undefined | null,
  query: string,
  options: SearchOptions = {},
): boolean {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return true;

  const normalizedLocationName = normalizeForSearch(locationName ?? "");
  const matchedLocation = findLocationByName(locationName, {
    ...options,
    multiLocaleSearch: true,
  });
  if (!matchedLocation) return normalizedLocationName.includes(normalizedQuery);

  const { locale = DEFAULT_LOCATION_LOCALE, multiLocaleSearch = false } =
    options;
  const entries = multiLocaleSearch
    ? getEntriesBySlug(matchedLocation.slug)
    : [getEntryBySlug(matchedLocation.slug, locale)].filter(
        (entry): entry is LocationEntry => !!entry,
      );

  return entries.some((entry) => entry.normalized.includes(normalizedQuery));
}

export function resolvePokemonLocationDisplay(
  pokemon: PokemonLink | undefined | null,
  locale: SupportedLanguage = DEFAULT_LOCATION_LOCALE,
): string {
  return pokemon.locationSlug
    ? getLocationName(pokemon.locationSlug, locale)
    : pokemon.fossilSlugs?.length
      ? getFossilLocationName(pokemon.fossilSlugs)
      : pokemon.location || "";
}

export function resolveLocationDisplay(
  fossil: FossilEntry | ItemEntry | undefined | null,
  locale: SupportedLanguage = DEFAULT_LOCATION_LOCALE,
): string {
  return fossil.locationSlug
    ? getLocationName(fossil.locationSlug, locale)
    : fossil.location || "";
}
