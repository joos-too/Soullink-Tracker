import SpriteImage from "@/src/components/images/SpriteImage.tsx";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  getOfficialArtworkUrlById,
  getSpriteUrlById,
} from "@/src/services/sprites.ts";
import { getPokemonNameById } from "@/src/services/search/pokemonSearch.ts";
import type { ItemEntry, PokemonLink } from "@/src/types/domain.ts";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "@/src/utils/language.ts";
import { focusRingClasses } from "@/src/styles/focusRing.ts";
import { useFocusTrap } from "@/src/hooks/useFocusTrap.ts";
import { getPokemonTypeSlugsById } from "@/src/services/pokemons/pokemonTypes.ts";
import TypeBadge from "@/src/components/badges/TypeBadge.tsx";
import { getFilteredEvolutionEntriesForPokemon } from "@/src/services/filter/evolutionMethodFilter.ts";
import ItemGroupCard from "@/src/components/tracker/ItemGroupCard.tsx";
import { groupItemEntries } from "@/src/services/items/itemGroups.ts";
import {
  getItemStatus,
  resolveItemDisplay,
  summarizeEntryGroup,
} from "@/src/services/items/itemDisplay.ts";

interface SelectEvolveModalProps {
  onClose: () => void;
  onConfirm: (playerIndex: number, newId: number, itemId?: string) => void;
  pair: PokemonLink;
  items: ItemEntry[][];
  playerLabels: string[];
  maxGeneration?: number;
  gameVersionId?: string;
  generationSpritePath?: string | null;
  useSpritesEverywhere?: boolean;
  nicknamesEnabled?: boolean;
  blockingError?: string;
}

interface EvoInfo {
  id: number;
  name: string;
  methods: string[];
  itemSlugs: string[];
  artworkUrl: string;
}

function mergeLocationMethods(
  methods: string[] | undefined,
  locationPrefix: string,
): string[] {
  if (!methods || methods.length === 0) return [];
  const locations: string[] = [];
  const others: string[] = [];
  methods.forEach((method) => {
    if (method.startsWith(locationPrefix)) {
      locations.push(method.slice(locationPrefix.length));
    } else {
      others.push(method);
    }
  });
  const withoutPlainLevelUp =
    locations.length > 0
      ? others.filter((method) => method !== "Level-Up")
      : others;
  if (locations.length === 0) return withoutPlainLevelUp;
  if (locations.length === 1)
    return [...withoutPlainLevelUp, `${locationPrefix}${locations[0]}`];
  return [...withoutPlainLevelUp, `${locationPrefix}${locations.join(", ")}`];
}

const SelectEvolveModal: React.FC<SelectEvolveModalProps> = ({
  onClose,
  onConfirm,
  pair,
  items,
  playerLabels,
  maxGeneration,
  gameVersionId,
  generationSpritePath,
  useSpritesEverywhere = false,
  nicknamesEnabled = true,
  blockingError,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [availableEvos, setAvailableEvos] = useState<EvoInfo[] | null>(null);
  const [selectedEvoId, setSelectedEvoId] = useState<number | null>(null);
  // Undefined allows a default for a preselected evolution. Null clears it.
  const [itemSelection, setItemSelection] = useState<string | null>();
  const [loading, setLoading] = useState(false);
  const { t, i18n } = useTranslation();
  const language = useMemo(
    () => normalizeLanguage(i18n.language),
    [i18n.language],
  );
  const playerRadioRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { containerRef } = useFocusTrap(true);
  const titleId = useId();

  const evolvablePlayers = useMemo(() => {
    return playerLabels
      .map((label, index) => {
        const member = pair.members?.[index];
        const pokemonId = member?.id;
        if (!pokemonId) return null;
        const entries = getFilteredEvolutionEntriesForPokemon(
          pokemonId,
          language,
          t,
          maxGeneration,
          gameVersionId,
        );
        if (entries.length === 0) return null;
        return { index, label };
      })
      .filter((entry): entry is { index: number; label: string } => !!entry);
  }, [pair, playerLabels, language, t, maxGeneration, gameVersionId]);

  useEffect(() => {
    if (
      selectedPlayer !== null &&
      evolvablePlayers.some((player) => player.index === selectedPlayer)
    ) {
      return;
    }
    const autoSelectIndex =
      evolvablePlayers.length === 1 ? evolvablePlayers[0].index : null;
    setSelectedPlayer(autoSelectIndex);
  }, [evolvablePlayers, selectedPlayer]);

  const currentName = useMemo(() => {
    if (selectedPlayer === null) return "";
    const member = pair.members?.[selectedPlayer];
    return (
      getPokemonNameById(member?.id, language) ||
      (typeof member?.name === "string" ? member.name : "")
    );
  }, [pair, selectedPlayer, language]);

  // when a player gets selected, compute evolutions
  useEffect(() => {
    async function loadEvos() {
      setAvailableEvos(null);
      setSelectedEvoId(null);
      setItemSelection(undefined);
      if (selectedPlayer === null) return;
      const member = pair.members?.[selectedPlayer];
      const pokemonId = member?.id;
      if (!pokemonId) {
        setAvailableEvos([]);
        return;
      }

      const filteredEntries = getFilteredEvolutionEntriesForPokemon(
        pokemonId,
        language,
        t,
        maxGeneration,
        gameVersionId,
      );
      if (filteredEntries.length === 0) {
        setAvailableEvos([]);
        return;
      }

      setLoading(true);
      try {
        const defaultUnknown = t("tracker.evolveModal.methodUnknown");
        const infos = await Promise.all(
          filteredEntries.map(async (entry) => {
            const eid = entry.id;
            const methodsForConstraints =
              entry.methods && entry.methods.length
                ? entry.methods
                : [defaultUnknown];
            const displayMethods = methodsForConstraints.length
              ? methodsForConstraints
              : [t("tracker.evolveModal.unavailable")];
            try {
              const art = getOfficialArtworkUrlById(eid);
              const localizedName = getPokemonNameById(eid, language) || "";
              return {
                id: eid,
                name: localizedName,
                artworkUrl: art,
                methods: displayMethods,
                itemSlugs: entry.itemSlugs,
              };
            } catch (e) {
              console.warn("Data for evolution " + eid + " not found:", e);
            }
          }),
        );
        setAvailableEvos(infos.filter((info) => info !== undefined));
      } finally {
        setLoading(false);
      }
    }

    if (selectedPlayer !== null) loadEvos();
  }, [selectedPlayer, pair, maxGeneration, gameVersionId, language, t]);

  const selectedEvolution =
    availableEvos?.length === 1
      ? availableEvos[0]
      : availableEvos?.find((ev) => ev.id === selectedEvoId);
  const playerItems =
    selectedPlayer === null ? [] : (items[selectedPlayer] ?? []);
  const itemGroups = groupItemEntries(playerItems);
  const getMatchingItemGroups = (evolution: EvoInfo) =>
    itemGroups.filter(({ entry }) => {
      const slug = entry.id?.replace(/^item:/, "");
      return slug && evolution.itemSlugs.includes(slug);
    });
  const getDefaultItemId = (evolution: EvoInfo) =>
    getMatchingItemGroups(evolution).find(
      (group) => group.bagIndices.length > 0,
    )?.entry.id;
  const selectedItemId =
    itemSelection === undefined && selectedEvolution
      ? getDefaultItemId(selectedEvolution)
      : (itemSelection ?? undefined);
  const selectedItemUnavailable =
    selectedItemId !== undefined &&
    !(
      selectedEvolution &&
      getMatchingItemGroups(selectedEvolution).some(
        (group) =>
          group.entry.id === selectedItemId && group.bagIndices.length > 0,
      )
    );
  const canConfirm =
    !blockingError &&
    !selectedItemUnavailable &&
    selectedPlayer !== null &&
    selectedEvolution !== undefined;

  const handleRadioTabNavigation = (
    event: React.KeyboardEvent<HTMLInputElement>,
    index: number,
    refs: React.RefObject<(HTMLInputElement | null)[]>,
  ) => {
    if (event.key !== "Tab") return;
    const nodes = refs.current.filter((el): el is HTMLInputElement =>
      Boolean(el),
    );
    if (!nodes.length) return;
    const currentIndex = Math.min(Math.max(index, 0), nodes.length - 1);
    const nextIndex = currentIndex + (event.shiftKey ? -1 : 1);
    if (nextIndex < 0 || nextIndex >= nodes.length) return;
    event.preventDefault();
    nodes[nextIndex]?.focus({ preventScroll: true });
  };

  const handleConfirm = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!canConfirm) return;
    onConfirm(selectedPlayer, selectedEvolution.id, selectedItemId);
  };

  const renderEvolutionItems = (evolution: EvoInfo) => {
    if (evolution.itemSlugs.length === 0) return null;
    const matchingGroups = getMatchingItemGroups(evolution);
    const isSelected = selectedEvolution?.id === evolution.id;
    if (!isSelected && matchingGroups.length === 0) return null;

    return (
      <div className="w-[38%] max-w-32 shrink-0 space-y-2 wrap-break-word">
        {matchingGroups.length === 0 && (
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {t("tracker.evolveModal.noMatchingItems")}
          </p>
        )}
        {matchingGroups.map((group) => {
          const { id } = group.entry;
          const { name, spriteUrl } = resolveItemDisplay(
            group.entry,
            language,
            t,
            gameVersionId,
          );
          const summary = summarizeEntryGroup(
            group,
            playerItems,
            (entry) => getItemStatus(entry, language, t),
            "tracker.infoPanel.itemCountUsed",
            t,
          );
          const canSelect = summary.bagCount > 0 && id !== undefined;
          const isItemSelected =
            isSelected && canSelect && selectedItemId === id;
          return (
            <div key={group.key}>
              {isItemSelected && (
                <p className="mb-1 text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {t("tracker.evolveModal.usesOnConfirmation")}
                </p>
              )}
              <ItemGroupCard
                name={name}
                spriteUrl={spriteUrl}
                status={summary.status}
                badgeCount={summary.isGrouped ? summary.bagCount : 0}
                used={summary.usedUp}
                dimmed={summary.bagCount === 0}
                extraRows={summary.extraPending.map(({ index, status }) => ({
                  key: index,
                  status,
                }))}
                selected={isItemSelected}
                onSelect={
                  canSelect
                    ? () => {
                        setSelectedEvoId(evolution.id);
                        setItemSelection(isItemSelected ? null : id);
                      }
                    : undefined
                }
              />
            </div>
          );
        })}
        {isSelected && selectedItemUnavailable && (
          <div className="text-sm">
            <p role="alert">{t("tracker.evolveModal.itemUnavailable")}</p>
            <button
              type="button"
              onClick={() => setItemSelection(null)}
              className={`rounded underline ${focusRingClasses}`}
            >
              {t("tracker.evolveModal.clearItem")}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 custom-scrollbar">
      {/* modal shell: limit overall height and hide overflow so inner area can scroll */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
      >
        {/* header */}
        <div className="px-6 py-4 flex justify-between items-center border-b border-gray-100 dark:border-gray-700">
          <h2 id={titleId} className="text-lg font-bold dark:text-gray-100">
            {t("tracker.evolveModal.title")}
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

        <form
          onSubmit={handleConfirm}
          className="px-6 pb-6 flex min-h-0 flex-col"
        >
          {/* scrollable content area; keeps header and footer visible */}
          <div className="overflow-auto pr-2 pt-4" tabIndex={-1}>
            {selectedPlayer === null && (
              <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
                {evolvablePlayers.length > 0 && (
                  <div className="mb-2">{t("tracker.evolveModal.prompt")}</div>
                )}
                {evolvablePlayers.length === 0 && (
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {t("tracker.evolveModal.noneAvailable")}
                  </div>
                )}
                {evolvablePlayers.map(({ index, label }) => {
                  const member = pair?.members?.[index];
                  const displayName =
                    getPokemonNameById(member?.id, language) ||
                    member?.name ||
                    "";
                  return (
                    <label
                      key={`evolve-player-${index}`}
                      className={`flex items-center gap-2 mt-3 cursor-pointer dark:text-gray-200 rounded-md px-2 py-1 ${focusRingClasses}`}
                    >
                      <input
                        type="radio"
                        name="which"
                        value={index}
                        checked={selectedPlayer === index}
                        onChange={() => setSelectedPlayer(index)}
                        tabIndex={0}
                        ref={(el) => {
                          playerRadioRefs.current[index] = el;
                        }}
                        onKeyDown={(event) =>
                          handleRadioTabNavigation(
                            event,
                            index,
                            playerRadioRefs,
                          )
                        }
                        className="h-4 w-4 accent-green-600"
                      />
                      <div>
                        <div className="font-semibold">{label}</div>
                        <div className="text-sm">
                          {displayName || "-"}
                          {nicknamesEnabled && member?.nickname
                            ? ` (${member.nickname})`
                            : ""}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {selectedPlayer !== null && (
              <div className="mb-4">
                <div className="font-semibold mb-2">
                  {t("tracker.evolveModal.evolveQuestion", {
                    name: currentName,
                  })}
                </div>

                {loading && (
                  <div className="text-sm text-gray-500">
                    {t("tracker.evolveModal.loading")}
                  </div>
                )}

                {!loading && availableEvos && availableEvos.length > 0 && (
                  <div className="space-y-3">
                    {availableEvos.map((ev) => {
                      const locationPrefix = t(
                        "tracker.evolveModal.locationPrefix",
                      );
                      const formattedMethods = mergeLocationMethods(
                        ev.methods,
                        locationPrefix,
                      );
                      const methodText = formattedMethods.length
                        ? formattedMethods.join(" · ")
                        : t("tracker.evolveModal.methodUnknown");
                      return (
                        <div key={ev.id} className="flex items-center gap-2">
                          <label
                            className={`flex min-w-0 flex-1 items-center gap-2 sm:gap-3 cursor-pointer dark:text-gray-200 rounded-md px-2 py-1 ${focusRingClasses}`}
                          >
                            <input
                              type="radio"
                              name="evo"
                              value={ev.id}
                              checked={selectedEvolution?.id === ev.id}
                              onChange={() => {
                                setSelectedEvoId(ev.id);
                                setItemSelection(getDefaultItemId(ev) ?? null);
                              }}
                              className="h-4 w-4 shrink-0 accent-green-600"
                            />
                            <SpriteImage
                              src={
                                useSpritesEverywhere
                                  ? getSpriteUrlById(
                                      ev.id,
                                      generationSpritePath,
                                    )
                                  : ev.artworkUrl
                              }
                              alt=""
                              className="size-10 shrink-0 object-contain sm:size-16"
                            />
                            <div className="min-w-0 wrap-break-word text-sm">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{ev.name}</span>
                                {getPokemonTypeSlugsById(
                                  ev.id,
                                  maxGeneration,
                                ).map((slug) => (
                                  <TypeBadge key={slug} typeSlug={slug} />
                                ))}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {methodText}
                              </div>
                            </div>
                          </label>
                          {renderEvolutionItems(ev)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {blockingError && (
            <div
              role="alert"
              className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            >
              {blockingError}
            </div>
          )}

          {/* footer buttons (kept visible) */}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${focusRingClasses}`}
            >
              {t("tracker.evolveModal.buttonCancel")}
            </button>
            <button
              type="submit"
              disabled={!canConfirm}
              className={`px-4 py-2 rounded-md font-semibold shadow ${canConfirm ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"} ${focusRingClasses}`}
            >
              {t("tracker.evolveModal.buttonConfirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SelectEvolveModal;
