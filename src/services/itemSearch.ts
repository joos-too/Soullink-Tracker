import { ITEMS } from "@/src/data/items";
import { getItemsForVersion } from "@/src/services/itemFilter";
import { MEGA_STONES, FOSSILS, STONES } from "@/src/data/special-items.ts";
import type { SupportedLanguage } from "@/src/utils/language";

/** Slugs already covered by the Stones tab */
const STONE_SLUGS = new Set(STONES.map((s) => s.id));

/** Slugs already covered by the Fossils tab */
const FOSSIL_SLUGS = new Set(FOSSILS.map((f) => f.id));

/** Slugs already covered by the Mega Stones tab */
const MEGA_STONE_SLUGS = new Set(MEGA_STONES.map((m) => m.id));

/** Strip diacritics: é→e, ü→u, etc. */
function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

interface ItemDataEntry {
  slug: string;
  de: string;
  en: string;
  version: string;
  normDe: string;
  normEn: string;
}

const ITEM_ENTRIES: ItemDataEntry[] = ITEMS.map((item) => ({
  ...item,
  normDe: stripDiacritics(item.de.toLowerCase()),
  normEn: stripDiacritics(item.en.toLowerCase()),
}));

export interface ItemSearchResult {
  slug: string;
  name: string;
  spriteUrl: string;
}

/** PokeAPI item sprite URL */
function getSpriteUrl(slug: string): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${slug}.png`;
}

export function searchItems(
  query: string,
  locale: SupportedLanguage = "de",
  gameVersionId?: string,
  max = 10,
  multiLocaleSearch = false,
): ItemSearchResult[] {
  const q = stripDiacritics(query.trim().toLowerCase());
  if (q.length < 1) return [];

  const allowedSlugs = gameVersionId
    ? new Set(getItemsForVersion(gameVersionId).map((i) => i.slug))
    : null;

  const field = locale === "de" ? "normDe" : "normEn";
  const nameField = locale === "de" ? "de" : "en";

  const isAvailable = (entry: ItemDataEntry) =>
    !STONE_SLUGS.has(entry.slug) &&
    !FOSSIL_SLUGS.has(entry.slug) &&
    !MEGA_STONE_SLUGS.has(entry.slug) &&
    (!allowedSlugs || allowedSlugs.has(entry.slug));

  const localResults = ITEM_ENTRIES.filter(
    (entry) => isAvailable(entry) && entry[field].includes(q),
  );

  if (!multiLocaleSearch || localResults.length >= max) {
    return localResults
      .sort((a, b) => a[nameField].localeCompare(b[nameField]))
      .slice(0, max)
      .map((entry) => ({
        slug: entry.slug,
        name: entry[nameField],
        spriteUrl: getSpriteUrl(entry.slug),
      }));
  }

  const localSlugs = new Set(localResults.map((entry) => entry.slug));
  const fallbackField = locale === "de" ? "normEn" : "normDe";
  const crossResults = ITEM_ENTRIES.filter(
    (entry) =>
      isAvailable(entry) &&
      !localSlugs.has(entry.slug) &&
      entry[fallbackField].includes(q),
  );

  return [...localResults, ...crossResults]
    .sort((a, b) => a[nameField].localeCompare(b[nameField]))
    .slice(0, max)
    .map((entry) => ({
      slug: entry.slug,
      name: entry[nameField],
      spriteUrl: getSpriteUrl(entry.slug),
    }));
}

export function findItemByName(
  name: string,
  locale: SupportedLanguage = "de",
  gameVersionId?: string,
  multiLocaleSearch = true,
): ItemSearchResult | null {
  const normalizedName = stripDiacritics(name.trim().toLowerCase());
  if (!normalizedName) return null;

  const allowedSlugs = gameVersionId
    ? new Set(getItemsForVersion(gameVersionId).map((i) => i.slug))
    : null;

  const nameField = locale === "de" ? "de" : "en";
  const preferredField = locale === "de" ? "normDe" : "normEn";
  const fallbackField = locale === "de" ? "normEn" : "normDe";
  const isAvailableEntry = (entry: ItemDataEntry) =>
    !STONE_SLUGS.has(entry.slug) &&
    !FOSSIL_SLUGS.has(entry.slug) &&
    !MEGA_STONE_SLUGS.has(entry.slug) &&
    (!allowedSlugs || allowedSlugs.has(entry.slug));
  const entry =
    ITEM_ENTRIES.find(
      (entry) =>
        isAvailableEntry(entry) && entry[preferredField] === normalizedName,
    ) ??
    (multiLocaleSearch
      ? ITEM_ENTRIES.find(
          (entry) =>
            isAvailableEntry(entry) && entry[fallbackField] === normalizedName,
        )
      : undefined);

  return entry
    ? {
        slug: entry.slug,
        name: entry[nameField],
        spriteUrl: getSpriteUrl(entry.slug),
      }
    : null;
}

export function getItemName(
  slug: string,
  locale: SupportedLanguage = "de",
): string {
  const item = ITEMS.find((i) => i.slug === slug);
  if (!item) return slug;
  return locale === "de" ? item.de : item.en;
}

export function getItemSpriteUrl(slug: string): string {
  return getSpriteUrl(slug);
}
