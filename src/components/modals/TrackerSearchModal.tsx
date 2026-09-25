import SpriteImage from "@/src/components/other/SpriteImage.tsx";
import ItemSprite from "@/src/components/other/ItemSprite.tsx";
import React, { useEffect, useId, useMemo, useState } from "react";
import type { FossilEntry, PokemonLink, ItemEntry } from "@/types";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "@/src/hooks/useFocusTrap.ts";
import {
  focusRingClasses,
  focusRingInputClasses,
} from "@/src/styles/focusRing.ts";
import {
  getPokemonFamilyIdsMatchingQuery,
  getPokemonNameById,
} from "@/src/services/search/pokemonSearch.ts";
import { resolvePokemonDisplay } from "@/src/services/pokemons/pokemonDisplay.ts";
import { FOSSILS, STONES, MEGA_STONES } from "@/src/data/special-items.ts";
import {
  getItemName,
  getItemSpriteUrl,
} from "@/src/services/search/itemSearch.ts";
import {
  locationMatchesQuery,
  resolveLocationDisplay,
  resolvePokemonLocationDisplay,
} from "@/src/services/search/locationSearch.ts";
import { normalizeLanguage } from "@/src/utils/language";
import {
  groupFossilEntries,
  groupItemEntries,
  isGroupUsedUp,
  splitPendingIndices,
  type EntryGroup,
} from "@/src/services/items/itemGroups.ts";
import { useMultiLocaleSearch } from "@/src/hooks/useMultiLocaleSearch.ts";

type SearchMode = "pokemon" | "items";
type PokemonSectionKey = "team" | "box" | "graveyard";
type ItemCategory = "fossils" | "stones" | "megaStones" | "items";

interface TrackerSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerNames: string[];
  playerColors: string[];
  team: PokemonLink[];
  box: PokemonLink[];
  graveyard: PokemonLink[];
  fossils: FossilEntry[][];
  items: ItemEntry[][];
  generationSpritePath?: string | null;
  gameVersionId?: string;
}

interface PokemonSection {
  key: PokemonSectionKey;
  title: string;
  pairs: PokemonLink[];
}

const SEARCH_MODE_BUTTON_CLASS =
  "px-3 py-2 rounded-md text-sm font-semibold transition-colors";

interface ItemRow {
  category: ItemCategory;
  id: string;
  name: string;
  spriteUrl: string;
  playerIndex: number;
  status: string;
  /** Further uncollected duplicates, each rendered as its own row */
  extraStatuses: string[];
  /** Items in the bag, shown as a ×N badge for grouped duplicates */
  bagCount: number;
  isGrouped: boolean;
  locations: string[];
  used: boolean;
}

const USED_ROW_CLASS =
  "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20";

// Same card styling as the item tracker
const USED_CARD_CLASS = `${USED_ROW_CLASS} text-red-700 dark:text-red-400`;

// Header colors match the item/fossil tracker headers
const ITEM_CATEGORY_COLORS: Record<ItemCategory, string> = {
  fossils: "#895338",
  stones: "#3b8a5a",
  megaStones: "#6d4c9f",
  items: "#2c7b90",
};

const MEGA_STONE_IDS = new Set(MEGA_STONES.map((m) => m.id));

const TrackerSearchModal: React.FC<TrackerSearchModalProps> = ({
  isOpen,
  onClose,
  playerNames,
  playerColors,
  team,
  box,
  graveyard,
  fossils,
  items,
  generationSpritePath,
  gameVersionId,
}) => {
  const { t, i18n } = useTranslation();
  const { containerRef } = useFocusTrap(isOpen);
  const titleId = useId();
  const [mode, setMode] = useState<SearchMode>("pokemon");
  const [query, setQuery] = useState("");
  const locale = normalizeLanguage(i18n.language);
  const multiLocaleSearch = useMultiLocaleSearch();

  useEffect(() => {
    if (!isOpen) return;
    setMode("pokemon");
    setQuery("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
  }, [isOpen, mode]);

  const normalizedQuery = query.trim().toLowerCase();
  const matchingFamilyIds = useMemo(
    () =>
      normalizedQuery
        ? getPokemonFamilyIdsMatchingQuery(normalizedQuery, {
            locale,
            multiLocaleSearch,
          })
        : new Set<number>(),
    [normalizedQuery, locale, multiLocaleSearch],
  );

  const matchesPokemonQuery = (pair: PokemonLink) => {
    const locationLabel = resolvePokemonLocationDisplay(pair, locale);

    if (!normalizedQuery) {
      return pair.members.some(
        (member) => typeof member?.id === "number" || member?.name?.trim(),
      );
    }

    if (
      locationMatchesQuery(locationLabel, normalizedQuery, {
        locale,
        gameVersionId,
        multiLocaleSearch,
      })
    ) {
      return true;
    }

    return pair.members.some((member) => {
      const name = member?.name || "";
      const pokemonId = member?.id;
      const displayName = getPokemonNameById(pokemonId, locale) || name;
      const nickname = member?.nickname || "";
      if (
        displayName.toLowerCase().includes(normalizedQuery) ||
        nickname.toLowerCase().includes(normalizedQuery)
      ) {
        return true;
      }

      return pokemonId !== null && matchingFamilyIds.has(pokemonId);
    });
  };

  const pokemonSections = useMemo<PokemonSection[]>(() => {
    const sections: PokemonSection[] = [
      {
        key: "team",
        title: t("team.teamTitle"),
        pairs: team.filter(matchesPokemonQuery),
      },
      {
        key: "box",
        title: t("team.boxTitle"),
        pairs: box.filter(matchesPokemonQuery),
      },
      {
        key: "graveyard",
        title: t("graveyard.title"),
        pairs: [...graveyard].reverse().filter(matchesPokemonQuery),
      },
    ];

    return sections.filter((section) => section.pairs.length > 0);
  }, [
    box,
    gameVersionId,
    graveyard,
    locale,
    multiLocaleSearch,
    team,
    t,
    matchingFamilyIds,
    normalizedQuery,
  ]);

  const allItems = useMemo<ItemRow[]>(() => {
    const rows: ItemRow[] = [];

    // Shared by fossils and items, same layout as the item tracker
    const buildGroupStatus = <T,>(
      group: EntryGroup<T>,
      entries: T[],
      getEntryStatus: (entry: T) => string,
      usedCountKey: string,
    ) => {
      const { headerPendingIdx, extraPendingIndices } =
        splitPendingIndices(group);
      const extraStatuses = extraPendingIndices.map((idx) =>
        getEntryStatus(entries[idx]),
      );

      let status: string;
      if (headerPendingIdx !== undefined) {
        status = getEntryStatus(entries[headerPendingIdx]);
      } else if (group.indices.length === 1) {
        status = getEntryStatus(group.entry);
      } else {
        const parts: string[] = [];
        if (group.bagIndices.length > 0) {
          parts.push(
            t("tracker.infoPanel.itemCountBag", {
              amount: group.bagIndices.length,
            }),
          );
        }
        if (group.usedIndices.length > 0) {
          parts.push(t(usedCountKey, { amount: group.usedIndices.length }));
        }
        status = parts.join(" · ");
      }

      return {
        status,
        extraStatuses,
        bagCount: group.bagIndices.length,
        isGrouped: group.indices.length > 1,
        used: isGroupUsedUp(group),
      };
    };

    // Fossils, identical fossils grouped per player
    (fossils ?? []).forEach((playerFossils, pIdx) => {
      groupFossilEntries(playerFossils ?? []).forEach((group) => {
        const { fossilId } = group.entry;
        const def = FOSSILS.find((f) => f.id === fossilId);
        const fossilStatus = (entry: FossilEntry) => {
          if (entry.revived) {
            const pokemonName =
              getPokemonNameById(entry.pokemonId, locale) ||
              entry.pokemonName ||
              "";
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
        rows.push({
          category: "fossils",
          id: fossilId,
          name: t(`fossils.${fossilId}`),
          spriteUrl: def ? `/fossil-sprites/${def.sprite}` : "",
          playerIndex: pIdx,
          ...buildGroupStatus(
            group,
            playerFossils,
            fossilStatus,
            "tracker.infoPanel.fossilCountRevived",
          ),
          locations: group.indices.map((idx) =>
            resolveLocationDisplay(playerFossils[idx], locale),
          ),
        });
      });
    });

    // Stones & items, identical items grouped per player
    (items ?? []).forEach((playerItems, pIdx) => {
      groupItemEntries(playerItems ?? []).forEach((group) => {
        const { entry } = group;
        const itemId = entry.id ?? "";
        const customName = entry.name?.trim() ?? "";
        const isCustomItem = itemId.startsWith("item:");
        const itemSlug = isCustomItem ? itemId.replace("item:", "") : null;
        const isMega = itemSlug ? MEGA_STONE_IDS.has(itemSlug) : false;
        const stoneDef = isCustomItem
          ? null
          : STONES.find((s) => s.id === itemId);

        let category: ItemCategory;
        let name: string;
        let spriteUrl: string;

        if (!isCustomItem && stoneDef) {
          category = "stones";
          name = t(`stones.${itemId}`);
          spriteUrl = `/stone-sprites/${stoneDef.sprite}`;
        } else if (isMega && itemSlug) {
          category = "megaStones";
          name = getItemName(itemSlug, locale);
          spriteUrl = getItemSpriteUrl(itemSlug);
        } else if (itemSlug) {
          category = "items";
          name = getItemName(itemSlug, locale);
          spriteUrl = getItemSpriteUrl(itemSlug);
        } else {
          category = "items";
          name = customName || itemId;
          spriteUrl = "";
        }

        const locations = group.indices.map((idx) =>
          resolveLocationDisplay(playerItems[idx], locale),
        );
        const itemStatus = (item: ItemEntry) =>
          item.used
            ? t("tracker.infoPanel.stoneUsed")
            : item.inBag
              ? t("tracker.infoPanel.stoneBag")
              : t("tracker.infoPanel.stoneLocation", {
                  location: resolveLocationDisplay(item, locale),
                });

        rows.push({
          category,
          id: itemId || customName,
          name,
          spriteUrl,
          playerIndex: pIdx,
          ...buildGroupStatus(
            group,
            playerItems,
            itemStatus,
            "tracker.infoPanel.itemCountUsed",
          ),
          locations,
        });
      });
    });

    return rows;
  }, [fossils, items, t, locale]);

  const itemSections = useMemo(() => {
    const categories: { key: ItemCategory; titleKey: string }[] = [
      { key: "fossils", titleKey: "tracker.infoPanel.fossilTracker" },
      { key: "stones", titleKey: "tracker.search.categoryStones" },
      { key: "megaStones", titleKey: "tracker.search.categoryMegaStones" },
      { key: "items", titleKey: "tracker.infoPanel.itemTracker" },
    ];

    return categories
      .map(({ key, titleKey }) => {
        const items = allItems.filter((item) => {
          if (item.category !== key) return false;
          if (!normalizedQuery) return true;
          return (
            item.name.toLowerCase().includes(normalizedQuery) ||
            item.locations.some((location) =>
              locationMatchesQuery(location, normalizedQuery, {
                locale,
                gameVersionId,
                multiLocaleSearch,
              }),
            )
          );
        });
        const itemsByPlayer = playerNames.map((_, pIdx) =>
          items.filter((item) => item.playerIndex === pIdx),
        );
        return { key, title: t(titleKey), items, itemsByPlayer };
      })
      .filter((section) => section.items.length > 0);
  }, [
    allItems,
    gameVersionId,
    locale,
    multiLocaleSearch,
    normalizedQuery,
    playerNames,
    t,
  ]);

  const playerGridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${playerNames.length}, minmax(0, 1fr))`,
  };

  const renderItemText = (item: ItemRow, status: string, showBadge = false) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1 min-w-0">
        <span className="font-bold truncate" title={item.name}>
          {item.name}
        </span>
        {showBadge && item.isGrouped && item.bagCount > 0 && (
          <span className="shrink-0 px-1 rounded bg-gray-200 dark:bg-gray-700 font-bold">
            ×{item.bagCount}
          </span>
        )}
      </div>
      <div className="opacity-70 truncate" title={status}>
        {status}
      </div>
    </div>
  );

  // Same card as the item/fossil tracker widget
  const renderItemCard = (item: ItemRow, key: string) => (
    <div
      key={key}
      className={`p-1.5 rounded border text-[10px] ${
        item.used
          ? USED_CARD_CLASS
          : item.bagCount === 0
            ? "border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300 opacity-60"
            : "border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-300"
      }`}
    >
      <div className="flex items-center gap-2 h-7.5">
        <ItemSprite src={item.spriteUrl || null} used={item.used} />
        {renderItemText(item, item.status, true)}
      </div>
      {/* Row spacing (18px) matches the padding, border and gap between two
          separate cards */}
      {item.extraStatuses.map((line, lineIdx) => (
        <div
          key={lineIdx}
          className="mt-2 pt-2.25 border-t border-dashed border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 h-7.5">
            <div className="w-6 shrink-0" />
            {renderItemText(item, line)}
          </div>
        </div>
      ))}
    </div>
  );

  const hasPokemonResults = pokemonSections.length > 0;
  const hasItemResults = itemSections.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 custom-scrollbar">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-160 max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="shrink-0 px-6 py-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
          <h2 id={titleId} className="text-lg font-bold dark:text-gray-100">
            {t("tracker.search.title")}
          </h2>
          <button
            onClick={onClose}
            className={`text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-md ${focusRingClasses}`}
            aria-label={t("common.close")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="shrink-0 px-6 py-4 border-b border-gray-100 dark:border-gray-700 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("pokemon")}
              className={`${SEARCH_MODE_BUTTON_CLASS} ${
                mode === "pokemon"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
              } ${focusRingClasses}`}
            >
              {t("tracker.search.modePokemon")}
            </button>
            <button
              type="button"
              onClick={() => setMode("items")}
              className={`${SEARCH_MODE_BUTTON_CLASS} ${
                mode === "items"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
              } ${focusRingClasses}`}
            >
              {t("tracker.search.modeItems")}
            </button>
          </div>

          <input
            data-autofocus
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("common.searchPlaceholder")}
            aria-label={t("tracker.search.fieldLabel")}
            className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 ${focusRingInputClasses}`}
          />
        </div>

        <div className="flex-1 min-h-0 mb-2 px-6 pb-6 pt-4 overflow-y-auto overscroll-contain custom-scrollbar">
          {mode === "pokemon" ? (
            hasPokemonResults ? (
              <div className="space-y-6 pb-2">
                {pokemonSections.map((section) => (
                  <div key={section.key} className="space-y-3">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                      {section.title}
                    </h3>
                    <div className="space-y-3">
                      {section.pairs.map((pair) => (
                        <div
                          key={`${section.key}-${pair.id}`}
                          className={`p-2 border rounded-md text-xs ${
                            section.key === "graveyard"
                              ? USED_ROW_CLASS
                              : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
                          }`}
                        >
                          <p className="text-center font-bold text-gray-600 dark:text-gray-300 mb-1">
                            {t("graveyard.areaLabel", {
                              location:
                                resolvePokemonLocationDisplay(pair, locale) ||
                                t("common.unknownLocation"),
                            })}
                          </p>
                          <div
                            className="grid gap-2 justify-items-center"
                            style={{
                              gridTemplateColumns: `repeat(${playerNames.length}, minmax(0, 1fr))`,
                            }}
                          >
                            {playerNames.map((name, index) => {
                              const member = pair.members?.[index] ?? {
                                id: null,
                                nickname: "",
                              };
                              const { displayName, spriteUrl } =
                                resolvePokemonDisplay(
                                  member,
                                  locale,
                                  generationSpritePath,
                                );

                              return (
                                <div
                                  key={`${section.key}-${pair.id}-player-${index}`}
                                  className="flex justify-center w-full"
                                >
                                  <div className="inline-flex items-center gap-2 text-left mb-2">
                                    {spriteUrl ? (
                                      <SpriteImage
                                        src={spriteUrl}
                                        alt=""
                                        className="w-16 h-16 -my-3"
                                        loading="lazy"
                                      />
                                    ) : null}
                                    <div className="flex flex-col items-start">
                                      <p
                                        className="font-bold"
                                        style={{
                                          color:
                                            playerColors[index] ?? "#4b5563",
                                        }}
                                      >
                                        {t("graveyard.memberTitle", {
                                          name,
                                          pokemon:
                                            displayName ||
                                            t("graveyard.unknownPokemon"),
                                        })}
                                      </p>
                                      <p className="text-gray-700 dark:text-gray-400">
                                        {t("graveyard.nicknameLabel", {
                                          nickname:
                                            member.nickname ||
                                            t("graveyard.noNickname"),
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
                {normalizedQuery
                  ? t("modals.common.noMatches")
                  : t("tracker.search.emptyPokemon")}
              </p>
            )
          ) : hasItemResults ? (
            <div className="space-y-4 pb-2">
              {itemSections.map((section) => (
                <div
                  key={section.key}
                  className="rounded-lg shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden"
                >
                  <h3
                    className="text-center p-2 text-white font-press-start text-xs"
                    style={{
                      backgroundColor: ITEM_CATEGORY_COLORS[section.key],
                    }}
                  >
                    {section.title}
                  </h3>
                  <div className="grid gap-3 p-3" style={playerGridStyle}>
                    {section.itemsByPlayer.map((playerItems, pIdx) => (
                      <div
                        key={`${section.key}-player-${pIdx}`}
                        className="space-y-2 min-w-0"
                      >
                        <div className="px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                          <span
                            className="block text-xs font-press-start truncate"
                            title={playerNames[pIdx]}
                            style={{ color: playerColors[pIdx] ?? "#4b5563" }}
                          >
                            {playerNames[pIdx]}
                          </span>
                        </div>
                        <div className="space-y-1 px-1">
                          {playerItems.map((item, idx) =>
                            renderItemCard(
                              item,
                              `${section.key}-${item.id}-${pIdx}-${idx}`,
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-8">
              {normalizedQuery
                ? t("modals.common.noMatches")
                : t("tracker.search.emptyItems")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrackerSearchModal;
