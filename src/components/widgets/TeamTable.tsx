import React, { useEffect, useMemo, useState } from "react";
import type { LinkEditPayload, Pokemon, PokemonLink } from "@/types.ts";
import EditPairModal from "@/src/components/modals/EditPairModal.tsx";
import SelectEvolveModal from "@/src/components/modals/SelectEvolveModal.tsx";
import {
  FiArrowDown,
  FiArrowUp,
  FiEdit,
  FiEyeOff,
  FiEye,
  FiPlus,
  FiTrash,
} from "react-icons/fi";
import { LuCircleFadingArrowUp } from "react-icons/lu";
import { PiSkullBold } from "react-icons/pi";
import { getOfficialArtworkUrlById } from "@/src/services/sprites.ts";
import { getPokemonTypeSlugsById } from "@/src/services/pokemons/pokemonTypes.ts";
import TypeBadge from "@/src/components/badges/TypeBadge.tsx";
import { useTranslation } from "react-i18next";
import { focusRingClasses } from "@/src/styles/focusRing.ts";
import { getWikiUrlById, type WikiId } from "@/src/utils/wiki.ts";
import { resolvePokemonDisplay } from "@/src/services/pokemons/pokemonDisplay.ts";
import { resolvePokemonLocationDisplay } from "@/src/services/search/locationSearch.ts";
import { normalizeLanguage } from "@/src/utils/language.ts";

interface TeamTableProps {
  title: string;
  data: PokemonLink[];
  playerNames: string[];
  playerColors: string[];
  onPokemonChange: (
    index: number,
    playerIndex: number,
    field: keyof Pokemon,
    value: string | number | null,
  ) => void;
  onRouteChange: (index: number, value: string, locationSlug?: string) => void;
  onAddToGraveyard: (pair: PokemonLink) => void;
  onDeleteLink?: (pair: PokemonLink) => void;
  onAddLink: (payload: LinkEditPayload) => void;
  emptyMessage: string;
  addDisabled?: boolean;
  addDisabledReason?: string;
  context: "team" | "box";
  onMoveToTeam: (pair: PokemonLink) => void;
  onMoveToBox: (pair: PokemonLink) => void;
  teamIsFull?: boolean;
  pokemonGenerationLimit?: number;
  gameVersionId?: string;
  readOnly?: boolean;
  generationSpritePath?: string | null;
  useSpritesInTeamTable?: boolean;
  wikiId?: WikiId | string | null;
  badLinkIds?: Set<number>;
  onToggleBadLink?: (id: number) => void;
  filterBar?: React.ReactNode;
  filtersExpanded?: boolean;
  nicknamesEnabled?: boolean;
}

const TeamTable: React.FC<TeamTableProps> = ({
  title,
  data,
  playerNames,
  playerColors,
  onPokemonChange,
  onRouteChange,
  onAddToGraveyard,
  onDeleteLink,
  onAddLink,
  emptyMessage,
  addDisabled = false,
  addDisabledReason,
  context,
  onMoveToTeam,
  onMoveToBox,
  teamIsFull = false,
  pokemonGenerationLimit,
  gameVersionId,
  readOnly = false,
  generationSpritePath,
  useSpritesInTeamTable = false,
  wikiId,
  badLinkIds,
  onToggleBadLink,
  filterBar,
  filtersExpanded = false,
  nicknamesEnabled = true,
}) => {
  const { t, i18n } = useTranslation();
  const locale = normalizeLanguage(i18n.language);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [evolveIndex, setEvolveIndex] = useState<number | null>(null);

  useEffect(() => {
    if (readOnly) {
      setEditIndex(null);
      setAddOpen(false);
      setEvolveIndex(null);
    }
  }, [readOnly]);

  const rows = useMemo(
    () =>
      data
        .map((pair, i) => ({ pair, originalIndex: i }))
        .filter(
          ({ pair }) =>
            pair.locationSlug ||
            pair.location ||
            pair.fossilSlugs?.length ||
            pair.members.some(
              (member) =>
                typeof member?.id === "number" || Boolean(member?.name),
            ),
        ),
    [data],
  );

  const handleSave = (payload: LinkEditPayload) => {
    if (readOnly || editIndex === null) return;
    payload.members.forEach((member, playerIndex) => {
      onPokemonChange(editIndex, playerIndex, "id", member.id);
      onPokemonChange(editIndex, playerIndex, "name", member.name ?? "");
      onPokemonChange(editIndex, playerIndex, "nickname", member.nickname);
    });
    onRouteChange(editIndex, payload.location ?? "", payload.locationSlug);
    setEditIndex(null);
  };

  const editInitial = useMemo(() => {
    if (editIndex === null) return null;
    const current = data[editIndex];
    return {
      location: current?.location,
      locationSlug: current?.locationSlug,
      fossilSlugs: current?.fossilSlugs,
      members: playerNames.map(
        (_, index) => current?.members?.[index] ?? { id: null, nickname: "" },
      ),
    };
  }, [editIndex, data, playerNames]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300 dark:border-gray-700">
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-press-start text-gray-800 dark:text-gray-200">
          {title}
        </h3>
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              if (!addDisabled) setAddOpen(true);
            }}
            disabled={addDisabled}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold shadow ${
              addDisabled
                ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-500"
            } ${focusRingClasses}`}
            title={
              addDisabled
                ? addDisabledReason || t("team.addDisabled")
                : t("team.addPokemon")
            }
          >
            <FiPlus size={18} /> {t("team.addPokemon")}
          </button>
        )}
      </div>
      {filterBar}
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse min-w-225">
          <thead>
            <tr>
              <th
                rowSpan={2}
                className="p-2 text-xs font-bold text-gray-700 dark:text-gray-300 border-t border-b border-gray-300 dark:border-gray-700"
              >
                #
              </th>
              {playerNames.map((name, index) => (
                <th
                  key={`player-header-${index}`}
                  colSpan={nicknamesEnabled ? 3 : 2}
                  className="p-2 text-xs font-press-start text-white text-center border-t border-b border-l border-gray-300 dark:border-gray-700"
                  style={{ backgroundColor: playerColors[index] ?? "#4b5563" }}
                >
                  {name}
                </th>
              ))}
              <th
                rowSpan={2}
                className="p-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 border-t border-b border-l border-gray-300 dark:border-gray-700"
              >
                {t("team.locationColumn")}
              </th>
              {!readOnly && (
                <th
                  rowSpan={2}
                  className="p-2 text-xs font-bold text-gray-700 dark:text-gray-300 border-t border-b border-l border-gray-300 dark:border-gray-700"
                  style={{ width: "28px" }}
                >
                  {t("team.actionsColumn")}
                </th>
              )}
            </tr>
            <tr>
              {playerNames.map((_, index) => (
                <React.Fragment key={`player-subheader-${index}`}>
                  <th className="p-1 text-[11px] text-gray-600 dark:text-gray-400 border-b border-l border-gray-200 dark:border-gray-700 text-center">
                    {t("team.pokemonColumn")}
                  </th>
                  <th className="p-1 text-[11px] text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 text-center">
                    {t("team.nameColumn")}
                  </th>
                  {nicknamesEnabled && (
                    <th className="p-1 text-[11px] text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 text-center">
                      {t("team.nicknameColumn")}
                    </th>
                  )}
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  className="p-3 text-center text-sm text-gray-500 dark:text-gray-400"
                  colSpan={
                    2 +
                    playerNames.length * (nicknamesEnabled ? 3 : 2) +
                    (readOnly ? 0 : 1)
                  }
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {rows.map(({ pair, originalIndex }, displayIndex) => {
              const locationLabel = resolvePokemonLocationDisplay(pair, locale);
              return (
                <tr
                  key={pair.id}
                  className={`border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${badLinkIds?.has(pair.id) ? "opacity-40" : ""}`}
                >
                  <td className="p-2 text-center text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {displayIndex + 1}
                  </td>
                  {playerNames.map((_, playerIndex) => {
                    const member = pair.members?.[playerIndex] ?? {
                      id: null,
                      nickname: "",
                    };
                    const pokemonId = member.id;
                    const { displayName, spriteUrl } = resolvePokemonDisplay(
                      member,
                      locale,
                      generationSpritePath,
                    );
                    const imgURL = pokemonId
                      ? useSpritesInTeamTable
                        ? spriteUrl
                        : getOfficialArtworkUrlById(pokemonId)
                      : null;
                    const wikiUrl =
                      pokemonId && wikiId
                        ? getWikiUrlById(pokemonId, wikiId as WikiId)
                        : null;
                    return (
                      <React.Fragment
                        key={`player-cell-${pair.id}-${playerIndex}`}
                      >
                        <td className="p-2 text-center border-l border-gray-200 dark:border-gray-700">
                          {imgURL ? (
                            <div className="mx-auto flex h-20 w-20 items-center justify-center">
                              <img
                                src={imgURL}
                                alt=""
                                className="block max-h-full max-w-full object-contain"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">
                              -
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-sm text-gray-800 dark:text-gray-300 text-center whitespace-nowrap">
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
                            "-"
                          )}
                          {pokemonId &&
                            (() => {
                              const typeSlugs = getPokemonTypeSlugsById(
                                pokemonId,
                                pokemonGenerationLimit,
                              );
                              return typeSlugs.length > 0 ? (
                                <div className="flex items-center justify-center gap-0.5 mt-1">
                                  {typeSlugs.map((slug) => (
                                    <TypeBadge key={slug} typeSlug={slug} />
                                  ))}
                                </div>
                              ) : null;
                            })()}
                        </td>
                        {nicknamesEnabled && (
                          <td className="p-2 text-sm text-gray-800 dark:text-gray-300 text-center">
                            {member.nickname || "-"}
                          </td>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <td className="p-2 text-sm text-center text-gray-800 dark:text-gray-200 border-l border-gray-200 dark:border-gray-700">
                    {locationLabel || "-"}
                  </td>
                  {!readOnly && (
                    <td
                      className="p-2 text-center border-l border-gray-200 dark:border-gray-700"
                      style={{ width: "28px" }}
                    >
                      <div className="inline-flex items-center gap-1.5 justify-center">
                        {(pair.members.some(
                          (m) => typeof m?.id === "number" || Boolean(m?.name),
                        ) ||
                          pair.location ||
                          pair.locationSlug ||
                          pair.fossilSlugs?.length) && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditIndex(originalIndex);
                            }}
                            className={`p-1 rounded-full inline-flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 ${focusRingClasses}`}
                            title={t("team.titleEdit")}
                          >
                            <FiEdit size={18} />
                          </button>
                        )}
                        {context === "team" ? (
                          <button
                            type="button"
                            onClick={() => {
                              onMoveToBox(pair);
                            }}
                            className={`p-1 rounded-full inline-flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 ${focusRingClasses}`}
                            title={t("team.titleMoveToBox")}
                          >
                            <FiArrowDown size={18} />
                          </button>
                        ) : null}
                        {context === "box" && (
                          <button
                            type="button"
                            onClick={() => {
                              if (!teamIsFull) onMoveToTeam(pair);
                            }}
                            disabled={teamIsFull}
                            className={`p-1 rounded-full inline-flex items-center justify-center ${teamIsFull ? "text-gray-400 dark:text-gray-500 cursor-not-allowed" : "hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"} ${focusRingClasses}`}
                            title={
                              teamIsFull
                                ? t("team.teamFull")
                                : t("team.moveToTeam")
                            }
                          >
                            <FiArrowUp size={18} />
                          </button>
                        )}
                        {pair.members.some(
                          (member) => typeof member?.id === "number",
                        ) && (
                          <button
                            type="button"
                            onClick={() => {
                              setEvolveIndex(originalIndex);
                            }}
                            className={`p-1 rounded-full inline-flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400 ${focusRingClasses}`}
                            title={t("team.titleEvolve")}
                          >
                            <LuCircleFadingArrowUp size={20} />
                          </button>
                        )}
                        {filtersExpanded && onToggleBadLink && (
                          <button
                            type="button"
                            onClick={() => onToggleBadLink(pair.id)}
                            className={`p-1 rounded-full inline-flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 text-yellow-600 dark:text-yellow-400 ${focusRingClasses}`}
                            title={
                              badLinkIds?.has(pair.id)
                                ? t("team.unhideLink")
                                : t("team.toggleHideLink")
                            }
                          >
                            {badLinkIds?.has(pair.id) ? (
                              <FiEye size={18} />
                            ) : (
                              <FiEyeOff size={18} />
                            )}
                          </button>
                        )}
                        {context === "team" &&
                          pair.members.some(
                            (member) =>
                              typeof member?.id === "number" ||
                              Boolean(member?.name),
                          ) && (
                            <button
                              type="button"
                              onClick={() => {
                                onAddToGraveyard(pair);
                              }}
                              className={`p-1 rounded-full inline-flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 focus-visible:ring-red-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${focusRingClasses}`}
                              title={t("team.titleSendToGraveyard")}
                            >
                              <PiSkullBold size={18} />
                            </button>
                          )}
                        {context === "box" && onDeleteLink && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteLink(pair);
                            }}
                            className={`p-1 rounded-full inline-flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 focus-visible:ring-red-500 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${focusRingClasses}`}
                            title={t("team.titleDeleteLink")}
                          >
                            <FiTrash size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <EditPairModal
        isOpen={!readOnly && editIndex !== null}
        onClose={() => setEditIndex(null)}
        onSave={handleSave}
        playerLabels={playerNames}
        mode="edit"
        initial={
          editInitial || {
            location: "",
            locationSlug: null,
            members: playerNames.map(() => ({ id: null, nickname: "" })),
          }
        }
        generationLimit={pokemonGenerationLimit}
        gameVersionId={gameVersionId}
        generationSpritePath={generationSpritePath}
        nicknamesEnabled={nicknamesEnabled}
      />
      <SelectEvolveModal
        isOpen={!readOnly && evolveIndex !== null}
        onClose={() => setEvolveIndex(null)}
        onConfirm={(playerIndex, _newName, newId) => {
          if (evolveIndex === null) return;
          onPokemonChange(evolveIndex, playerIndex, "id", newId);
          onPokemonChange(evolveIndex, playerIndex, "name", "");
          setEvolveIndex(null);
        }}
        pair={evolveIndex !== null ? data[evolveIndex] : null}
        playerLabels={playerNames}
        maxGeneration={pokemonGenerationLimit}
        gameVersionId={gameVersionId}
        generationSpritePath={generationSpritePath}
        useSpritesEverywhere={useSpritesInTeamTable}
        nicknamesEnabled={nicknamesEnabled}
      />
      <EditPairModal
        isOpen={!readOnly && addOpen}
        onClose={() => setAddOpen(false)}
        onSave={(payload) => {
          onAddLink(payload);
          setAddOpen(false);
        }}
        playerLabels={playerNames}
        mode="create"
        initial={{
          location: "",
          locationSlug: null,
          members: playerNames.map(() => ({ id: null, nickname: "" })),
        }}
        generationLimit={pokemonGenerationLimit}
        gameVersionId={gameVersionId}
        generationSpritePath={generationSpritePath}
        nicknamesEnabled={nicknamesEnabled}
      />
    </div>
  );
};

export default TeamTable;
