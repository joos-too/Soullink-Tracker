import { ITEMS, type ItemData } from "@/src/data/items.ts";
import {
  getItemsForVersion,
  getItemVersionIndex,
  ITEM_VERSIONS,
} from "@/src/services/filter/itemFilter.ts";
import { MEGA_STONES, FOSSILS, STONES } from "@/src/data/special-items.ts";
import type { SupportedLanguage } from "@/src/utils/language.ts";

/** Slugs already covered by the Stones, Fossils and Mega Stones tabs */
const SPECIAL_ITEM_SLUGS = new Set([
  ...STONES.map((s) => s.id),
  ...FOSSILS.map((f) => f.id),
  ...MEGA_STONES.map((m) => m.id),
]);

/** Strip diacritics: é→e, ü→u, etc. */
function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeSearchTerm(s: string): string {
  return stripDiacritics(s.trim().toLowerCase());
}

interface ItemDataEntry {
  item: ItemData;
  /** Normalized current names and aliases per locale */
  searchNames: Record<SupportedLanguage, string[]>;
}

const ITEM_ENTRIES: ItemDataEntry[] = ITEMS.map((item) => ({
  item,
  searchNames: {
    de: [item.de, ...(item.aliases?.de ?? [])].map(normalizeSearchTerm),
    en: [item.en, ...(item.aliases?.en ?? [])].map(normalizeSearchTerm),
  },
}));

const ITEMS_BY_SLUG = new Map(ITEMS.map((item) => [item.slug, item]));

export interface ItemSearchResult {
  slug: string;
  name: string;
  spriteUrl: string;
}

export interface ItemSearchOptions {
  locale?: SupportedLanguage;
  /** Tracker game: selects the item names and, unless `allVersions` is set, the available items */
  gameVersionId?: string;
  /** Include items of all game versions */
  allVersions?: boolean;
  multiLocaleSearch?: boolean;
}

/** PokeAPI item sprite URL */
function getSpriteUrl(slug: string): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
}

/**
 * Name of an item in the given game. Items renamed between versions use the
 * name of the latest version up to the game; without a known game the
 * current name is used.
 */
function resolveItemName(
  item: ItemData,
  locale: SupportedLanguage,
  gameVersionId?: string,
): string {
  const versionNames = item.versionNames?.[locale];
  const gameIdx = getItemVersionIndex(gameVersionId);
  if (!versionNames || gameIdx === -1) return item[locale];

  let name: string | undefined;
  let nameIdx = -1;
  for (const [version, versionName] of Object.entries(versionNames)) {
    const idx = ITEM_VERSIONS.indexOf(
      version as (typeof ITEM_VERSIONS)[number],
    );
    if (idx !== -1 && idx <= gameIdx && idx > nameIdx) {
      name = versionName;
      nameIdx = idx;
    }
  }
  // Games released before the item was listed use its earliest name
  return name ?? Object.values(versionNames)[0] ?? item[locale];
}

function createAvailabilityFilter(gameVersionId?: string, allVersions = false) {
  const allowedSlugs =
    gameVersionId && !allVersions
      ? new Set(getItemsForVersion(gameVersionId).map((i) => i.slug))
      : null;
  return (entry: ItemDataEntry) =>
    !SPECIAL_ITEM_SLUGS.has(entry.item.slug) &&
    (!allowedSlugs || allowedSlugs.has(entry.item.slug));
}

function toSearchResult(
  entry: ItemDataEntry,
  locale: SupportedLanguage,
  gameVersionId?: string,
): ItemSearchResult {
  return {
    slug: entry.item.slug,
    name: resolveItemName(entry.item, locale, gameVersionId),
    spriteUrl: getSpriteUrl(entry.item.slug),
  };
}

export function searchItems(
  query: string,
  {
    locale = "de",
    gameVersionId,
    allVersions = false,
    multiLocaleSearch = false,
  }: ItemSearchOptions = {},
  max = 10,
): ItemSearchResult[] {
  const q = normalizeSearchTerm(query);
  if (q.length < 1) return [];

  const isAvailable = createAvailabilityFilter(gameVersionId, allVersions);
  const matches = (entry: ItemDataEntry, lang: SupportedLanguage) =>
    entry.searchNames[lang].some((name) => name.includes(q));

  const localResults = ITEM_ENTRIES.filter(
    (entry) => isAvailable(entry) && matches(entry, locale),
  );
  const fallbackLocale = locale === "de" ? "en" : "de";
  const results =
    !multiLocaleSearch || localResults.length >= max
      ? localResults
      : [
          ...localResults,
          ...ITEM_ENTRIES.filter(
            (entry) =>
              isAvailable(entry) &&
              !matches(entry, locale) &&
              matches(entry, fallbackLocale),
          ),
        ];

  return results
    .map((entry) => toSearchResult(entry, locale, gameVersionId))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, max);
}

export function findItemByName(
  name: string,
  {
    locale = "de",
    gameVersionId,
    allVersions = false,
    multiLocaleSearch = true,
  }: ItemSearchOptions = {},
): ItemSearchResult | null {
  const normalizedName = normalizeSearchTerm(name);
  if (!normalizedName) return null;

  const isAvailable = createAvailabilityFilter(gameVersionId, allVersions);
  const findIn = (lang: SupportedLanguage) =>
    ITEM_ENTRIES.find(
      (entry) =>
        isAvailable(entry) && entry.searchNames[lang].includes(normalizedName),
    );
  const fallbackLocale = locale === "de" ? "en" : "de";
  const entry =
    findIn(locale) ?? (multiLocaleSearch ? findIn(fallbackLocale) : undefined);

  return entry ? toSearchResult(entry, locale, gameVersionId) : null;
}

/** Name of an item as it is called in the given game */
export function getItemName(
  slug: string,
  locale: SupportedLanguage = "de",
  gameVersionId?: string,
): string {
  const item = ITEMS_BY_SLUG.get(slug);
  return item ? resolveItemName(item, locale, gameVersionId) : slug;
}

/** Current name and all aliases of an item */
export function getItemSearchNames(
  slug: string,
  locale: SupportedLanguage = "de",
): string[] {
  const item = ITEMS_BY_SLUG.get(slug);
  return item ? [item[locale], ...(item.aliases?.[locale] ?? [])] : [];
}

export function getItemSpriteUrl(slug: string): string {
  return getSpriteUrl(slug);
}
