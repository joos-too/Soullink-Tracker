import type { TFunction } from "i18next";
import type { FossilEntry, ItemEntry } from "@/types";
import { FOSSILS, MEGA_STONES, STONES } from "@/src/data/special-items.ts";
import {
  getItemName,
  getItemSpriteUrl,
} from "@/src/services/search/itemSearch.ts";
import { resolveLocationDisplay } from "@/src/services/search/locationSearch.ts";
import { getPokemonNameById } from "@/src/services/search/pokemonSearch.ts";
import type { SupportedLanguage } from "@/src/utils/language.ts";
import {
  isGroupUsedUp,
  splitPendingIndices,
  type EntryGroup,
} from "./itemGroups.ts";

export type ItemCategory = "fossils" | "stones" | "megaStones" | "items";

export interface ItemDisplay {
  category: ItemCategory;
  name: string;
  spriteUrl: string | null;
}

const MEGA_STONE_IDS = new Set(MEGA_STONES.map((m) => m.id));

export const resolveItemDisplay = (
  entry: ItemEntry,
  locale: SupportedLanguage,
  t: TFunction,
): ItemDisplay => {
  const itemId = entry.id ?? "";
  const customName = entry.name?.trim() ?? "";
  const isCustomItem = itemId.startsWith("item:");
  const itemSlug = isCustomItem ? itemId.replace("item:", "") : null;
  const stoneDef = isCustomItem ? null : STONES.find((s) => s.id === itemId);

  if (stoneDef) {
    return {
      category: "stones",
      name: customName || t(`stones.${itemId}`),
      spriteUrl: `/stone-sprites/${stoneDef.sprite}`,
    };
  }
  if (itemSlug) {
    return {
      category: MEGA_STONE_IDS.has(itemSlug) ? "megaStones" : "items",
      name: customName || getItemName(itemSlug, locale),
      spriteUrl: getItemSpriteUrl(itemSlug),
    };
  }
  return {
    category: "items",
    name: customName || itemId,
    spriteUrl: null,
  };
};

export const getFossilSpriteUrl = (fossilId: string): string | null => {
  const def = FOSSILS.find((f) => f.id === fossilId);
  return def ? `/fossil-sprites/${def.sprite}` : null;
};

export const getItemStatus = (
  entry: ItemEntry,
  locale: SupportedLanguage,
  t: TFunction,
): string =>
  entry.used
    ? t("tracker.infoPanel.stoneUsed")
    : entry.inBag
      ? t("tracker.infoPanel.stoneBag")
      : t("tracker.infoPanel.stoneLocation", {
          location: resolveLocationDisplay(entry, locale),
        });

export const getFossilStatus = (
  entry: FossilEntry,
  locale: SupportedLanguage,
  t: TFunction,
): string => {
  if (entry.revived) {
    const pokemonName =
      getPokemonNameById(entry.pokemonId, locale) || entry.pokemonName || "";
    return pokemonName
      ? `${t("tracker.infoPanel.fossilRevived")}: ${pokemonName}`
      : t("tracker.infoPanel.fossilRevived");
  }
  return entry.inBag
    ? t("tracker.infoPanel.fossilBag")
    : t("tracker.infoPanel.fossilLocation", {
        location: resolveLocationDisplay(entry, locale),
      });
};

export interface EntryGroupSummary {
  /** Status of the header row */
  status: string;
  /** Uncollected entry shown in the header row, if any */
  headerPendingIdx: number | undefined;
  /** Further uncollected entries, each rendered as its own row */
  extraPending: { index: number; status: string }[];
  bagCount: number;
  isGrouped: boolean;
  usedUp: boolean;
}

/**
 * Header status of a group: a single entry shows its own status, a group
 * without uncollected header entry summarizes bag and used counts.
 */
export const summarizeEntryGroup = <T>(
  group: EntryGroup<T>,
  entries: T[],
  getStatus: (entry: T) => string,
  usedCountKey: string,
  t: TFunction,
): EntryGroupSummary => {
  const { headerPendingIdx, extraPendingIndices } = splitPendingIndices(group);
  const isGrouped = group.indices.length > 1;
  const bagCount = group.bagIndices.length;
  const usedCount = group.usedIndices.length;

  let status: string;
  if (headerPendingIdx !== undefined) {
    status = getStatus(entries[headerPendingIdx]);
  } else if (!isGrouped) {
    status = getStatus(group.entry);
  } else {
    const parts: string[] = [];
    if (bagCount > 0) {
      parts.push(t("tracker.infoPanel.itemCountBag", { amount: bagCount }));
    }
    if (usedCount > 0) {
      parts.push(t(usedCountKey, { amount: usedCount }));
    }
    status = parts.join(" · ");
  }

  return {
    status,
    headerPendingIdx,
    extraPending: extraPendingIndices.map((index) => ({
      index,
      status: getStatus(entries[index]),
    })),
    bagCount,
    isGrouped,
    usedUp: isGroupUsedUp(group),
  };
};
