import React, { useEffect, useMemo, useState } from "react";
import type { LinkEditPayload, PokemonLink } from "@/types.ts";
import { PLAYER_COLORS } from "@/src/services/init.ts";
import { useTranslation } from "react-i18next";
import { focusRingClasses } from "@/src/styles/focusRing.ts";
import { FiEdit, FiTrash } from "react-icons/fi";
import AddLostPokemonModal from "@/src/components/modals/AddLostPokemonModal.tsx";
import EditPairModal from "@/src/components/modals/EditPairModal.tsx";
import { getWikiUrlById, type WikiId } from "@/src/utils/wiki.ts";
import { resolvePokemonDisplay } from "@/src/services/pokemons/pokemonDisplay.ts";
import { resolvePokemonLocationDisplay } from "@/src/services/search/locationSearch.ts";
import { normalizeLanguage } from "@/src/utils/language.ts";

interface GraveyardProps {
  graveyard?: PokemonLink[];
  playerNames: string[];
  playerColors?: string[];
  onManualAddClick?: () => void;
  onEditPair: (pairId: number, payload: LinkEditPayload) => void;
  onDeleteLink?: (pair: PokemonLink) => void;
  readOnly?: boolean;
  generationSpritePath?: string | null;
  pokemonGenerationLimit?: number;
  gameVersionId?: string;
  wikiId?: WikiId | string | null;
  nicknamesEnabled?: boolean;
}

const Graveyard: React.FC<GraveyardProps> = ({
  graveyard = [],
  playerNames,
  playerColors,
  onManualAddClick,
  onEditPair,
  onDeleteLink,
  generationSpritePath,
  pokemonGenerationLimit,
  gameVersionId,
  readOnly = false,
  wikiId,
  nicknamesEnabled = true,
}) => {
  const { t, i18n } = useTranslation();
  const locale = normalizeLanguage(i18n.language);
  const names = useMemo(() => {
    const list = playerNames.length
      ? playerNames
      : [t("graveyard.defaultPlayer", { index: 1 })];
    return list.map((name, index) =>
      name?.trim().length
        ? name
        : t("graveyard.defaultPlayer", { index: index + 1 }),
    );
  }, [playerNames]);
  const colorForIndex = (index: number) =>
    playerColors?.[index] ?? PLAYER_COLORS[index] ?? "#4b5563";

  const [editIndex, setEditIndex] = useState<number | null>(null);

  useEffect(() => {
    if (readOnly) {
      setEditIndex(null);
    }
  }, [readOnly]);

  useEffect(() => {
    if (editIndex !== null && !graveyard[editIndex]) {
      setEditIndex(null);
    }
  }, [editIndex, graveyard]);

  const activePair = editIndex !== null ? graveyard[editIndex] : null;
  const isLostPair = Boolean(activePair?.isLost);

  const editInitial = useMemo(() => {
    if (!activePair) return null;
    return {
      location: activePair.location ?? "",
      locationSlug: activePair.locationSlug,
      fossilSlugs: activePair.fossilSlugs,
      members: names.map(
        (_, index) => activePair.members?.[index] ?? { id: null, nickname: "" },
      ),
    };
  }, [activePair, names]);

  const handleSave = (payload: LinkEditPayload) => {
    if (!activePair) return;
    onEditPair(activePair.id, payload);
    setEditIndex(null);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden custom-scrollbar">
      <div className="flex justify-center items-center p-2 bg-gray-800 dark:bg-gray-900">
        <h2 className="text-center text-white font-press-start text-sm">
          {t("graveyard.title")}
        </h2>
        {onManualAddClick && !readOnly && (
          <button
            onClick={onManualAddClick}
            className={`ml-4 text-white hover:text-gray-300 rounded-md ${focusRingClasses}`}
            title={t("graveyard.manualAddTitle")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
        )}
      </div>
      <div className="p-4 max-h-96 overflow-y-auto">
        {graveyard && graveyard.length > 0 ? (
          <div className="space-y-3">
            {[...graveyard].reverse().map((pair) => {
              const locationLabel = resolvePokemonLocationDisplay(pair, locale);
              const canEdit =
                !readOnly &&
                (locationLabel ||
                  pair.members.some(
                    (member) =>
                      typeof member?.id === "number" || Boolean(member?.name),
                  ));
              const canDelete = !readOnly && onDeleteLink;
              const isLost = Boolean(pair.isLost);
              const statusLabel = isLost
                ? t("graveyard.statusLost")
                : t("graveyard.statusDead");
              return (
                <div
                  key={pair.id}
                  className="relative p-2 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-xs"
                >
                  <div
                    className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${isLost ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"}`}
                  >
                    {statusLabel}
                  </div>
                  {(canEdit || canDelete) && (
                    <div className="absolute right-2 top-2 flex items-center gap-1">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() =>
                            setEditIndex(
                              graveyard.findIndex((g) => g.id === pair.id),
                            )
                          }
                          className={`p-1 rounded-full text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 ${focusRingClasses}`}
                          title={t("graveyard.titleEdit")}
                          aria-label={t("graveyard.titleEdit")}
                        >
                          <FiEdit size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDeleteLink(pair)}
                          className={`p-1 rounded-full text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 hover:bg-gray-200 dark:hover:bg-gray-600 focus-visible:ring-red-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${focusRingClasses}`}
                          title={t("team.titleDeleteLink")}
                          aria-label={t("team.titleDeleteLink")}
                        >
                          <FiTrash size={14} />
                        </button>
                      )}
                    </div>
                  )}
                  <p className="text-center font-bold text-gray-600 dark:text-gray-300 mb-1">
                    {t("graveyard.areaLabel", {
                      location: locationLabel || t("common.unknownLocation"),
                    })}
                  </p>
                  <div
                    className="grid gap-2 justify-items-center"
                    style={{
                      gridTemplateColumns: `repeat(${names.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {names.map((name, index) => {
                      const member = pair.members?.[index] ?? {
                        id: null,
                        nickname: "",
                      };
                      const pokemonId = member.id;
                      const { displayName, spriteUrl } = resolvePokemonDisplay(
                        member,
                        locale,
                        generationSpritePath,
                      );
                      const wikiUrl =
                        pokemonId && wikiId
                          ? getWikiUrlById(pokemonId, wikiId as WikiId)
                          : null;
                      return (
                        <div
                          key={`${pair.id}-player-${index}`}
                          className="flex justify-center w-full"
                        >
                          <div className="inline-flex items-center gap-2 text-left mb-2">
                            {spriteUrl && (
                              <img
                                src={spriteUrl}
                                alt=""
                                className="w-16 h-16 -my-3"
                                loading="lazy"
                              />
                            )}
                            <div className="flex flex-col items-start">
                              <p
                                className="font-bold"
                                style={{ color: colorForIndex(index) }}
                              >
                                {name}
                                {"'s "}
                                {displayName ? (
                                  wikiUrl ? (
                                    <a
                                      href={wikiUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline"
                                    >
                                      {displayName}
                                    </a>
                                  ) : (
                                    displayName
                                  )
                                ) : (
                                  t("graveyard.unknownPokemon")
                                )}
                              </p>
                              {nicknamesEnabled && (
                                <p className="text-gray-700 dark:text-gray-400">
                                  {t("graveyard.nicknameLabel", {
                                    nickname:
                                      member.nickname ||
                                      t("graveyard.noNickname"),
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm py-4">
            {t("graveyard.empty")}
          </p>
        )}
      </div>
      <EditPairModal
        isOpen={!readOnly && editIndex !== null && !isLostPair}
        onClose={() => setEditIndex(null)}
        onSave={handleSave}
        playerLabels={names}
        mode="edit"
        initial={
          editInitial || {
            location: "",
            fossilSlugs: [],
            members: names.map(() => ({ id: null, nickname: "" })),
          }
        }
        generationLimit={pokemonGenerationLimit}
        gameVersionId={gameVersionId}
        generationSpritePath={generationSpritePath}
        nicknamesEnabled={nicknamesEnabled}
      />
      <AddLostPokemonModal
        isOpen={!readOnly && editIndex !== null && isLostPair}
        onClose={() => setEditIndex(null)}
        onAdd={handleSave}
        playerNames={names}
        generationLimit={pokemonGenerationLimit}
        generationSpritePath={generationSpritePath}
        gameVersionId={gameVersionId}
        mode="edit"
        initial={
          editInitial || {
            location: "",
            members: names.map(() => ({ id: null, nickname: "" })),
          }
        }
      />
    </div>
  );
};

export default Graveyard;
