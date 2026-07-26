import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  getOfficialArtworkUrlById,
  getSpriteUrlById,
} from "@/src/services/sprites.ts";
import { getPokemonNameById } from "@/src/services/search/pokemonSearch.ts";
import type { PokemonLink } from "@/types.ts";
import { useTranslation } from "react-i18next";
import { normalizeLanguage } from "@/src/utils/language.ts";
import { focusRingClasses } from "@/src/styles/focusRing.ts";
import { useFocusTrap } from "@/src/hooks/useFocusTrap.ts";
import { getPokemonTypeSlugsById } from "@/src/services/pokemons/pokemonTypes.ts";
import TypeBadge from "@/src/components/badges/TypeBadge.tsx";
import { getFilteredEvolutionEntriesForPokemon } from "@/src/services/filter/evolutionMethodFilter.ts";

interface SelectEvolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (playerIndex: number, newName: string, newId: number) => void;
  pair: PokemonLink | null;
  playerLabels: string[];
  maxGeneration?: number;
  gameVersionId?: string;
  generationSpritePath?: string | null;
  useSpritesEverywhere?: boolean;
  nicknamesEnabled?: boolean;
}

interface EvoInfo {
  id: number;
  name: string;
  methods: string[];
  artworkUrl?: string | null;
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
  isOpen,
  onClose,
  onConfirm,
  pair,
  playerLabels,
  maxGeneration,
  gameVersionId,
  generationSpritePath,
  useSpritesEverywhere = false,
  nicknamesEnabled = true,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [availableEvos, setAvailableEvos] = useState<EvoInfo[] | null>(null);
  const [selectedEvoId, setSelectedEvoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { t, i18n } = useTranslation();
  const language = useMemo(
    () => normalizeLanguage(i18n.language),
    [i18n.language],
  );
  const playerRadioRefs = useRef<(HTMLInputElement | null)[]>([]);
  const evoRadioRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { containerRef } = useFocusTrap(isOpen);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      setSelectedPlayer(null);
      setAvailableEvos(null);
      setSelectedEvoId(null);
      setLoading(false);
    }
  }, [isOpen, playerLabels.length, language]);

  const evolvablePlayers = useMemo(() => {
    if (!pair) return [];
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
    if (!isOpen) return;
    if (
      selectedPlayer !== null &&
      evolvablePlayers.some((player) => player.index === selectedPlayer)
    ) {
      return;
    }
    const autoSelectIndex =
      evolvablePlayers.length === 1 ? evolvablePlayers[0].index : null;
    setSelectedPlayer(autoSelectIndex);
  }, [evolvablePlayers, isOpen, selectedPlayer]);

  const currentName = useMemo(() => {
    if (!pair || selectedPlayer === null) return "";
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
      if (!pair || selectedPlayer === null) return;
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
        const infos: EvoInfo[] = await Promise.all(
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
              };
            } catch (e) {
              console.warn("Data for evolution " + eid + " not found:", e);
            }
          }),
        );
        setAvailableEvos(infos.filter(Boolean));
      } finally {
        setLoading(false);
      }
    }

    if (selectedPlayer !== null) loadEvos();
  }, [selectedPlayer, pair, maxGeneration, gameVersionId, language, t]);

  if (!isOpen) return null;

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
    if (selectedPlayer === null || selectedEvoId === null) return;
    const targetName = getPokemonNameById(selectedEvoId, language) || "";
    onConfirm(selectedPlayer, targetName, selectedEvoId);
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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden"
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

        <form onSubmit={handleConfirm} className="px-6 pb-6">
          {/* scrollable content area; keeps header and footer visible */}
          <div className="overflow-auto max-h-[60vh] pr-2 pt-4" tabIndex={-1}>
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
                    {availableEvos.map((ev, idx) => {
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
                        <label
                          key={ev.id}
                          className={`flex items-center gap-3 cursor-pointer dark:text-gray-200 rounded-md px-2 py-1 ${focusRingClasses}`}
                        >
                          <input
                            type="radio"
                            name="evo"
                            value={ev.id}
                            checked={selectedEvoId === ev.id}
                            onChange={() => setSelectedEvoId(ev.id)}
                            tabIndex={0}
                            ref={(el) => {
                              evoRadioRefs.current[idx] = el;
                            }}
                            onKeyDown={(event) =>
                              handleRadioTabNavigation(event, idx, evoRadioRefs)
                            }
                            className="h-4 w-4 accent-green-600"
                          />
                          <img
                            src={
                              useSpritesEverywhere
                                ? getSpriteUrlById(ev.id, generationSpritePath)
                                : ev.artworkUrl
                            }
                            alt=""
                            className="w-16 h-16 object-contain"
                          />
                          <div className="text-sm">
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
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

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
              disabled={selectedPlayer === null || selectedEvoId === null}
              className={`px-4 py-2 rounded-md font-semibold shadow ${selectedEvoId ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"} ${focusRingClasses}`}
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
