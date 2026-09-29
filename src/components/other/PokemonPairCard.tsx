import React from "react";
import { Trans, useTranslation } from "react-i18next";
import type { PokemonLink } from "@/types.ts";
import SpriteImage from "@/src/components/other/SpriteImage.tsx";
import { resolvePokemonDisplay } from "@/src/services/pokemons/pokemonDisplay.ts";
import { resolvePokemonLocationDisplay } from "@/src/services/search/locationSearch.ts";
import { normalizeLanguage } from "@/src/utils/language.ts";
import { getWikiUrlById, type WikiId } from "@/src/utils/wiki.ts";

interface PokemonPairCardProps {
  pair: PokemonLink;
  playerNames: string[];
  playerColors: string[];
  /** Shows a dead/lost badge, e.g. for graveyard entries */
  status?: "dead" | "lost";
  generationSpritePath?: string | null;
  wikiId?: WikiId | string | null;
  nicknamesEnabled?: boolean;
  /** Absolutely positioned overlays, e.g. edit buttons */
  children?: React.ReactNode;
}

/** Linked Pokémon of all players with their area, e.g. in the graveyard. */
const PokemonPairCard: React.FC<PokemonPairCardProps> = ({
  pair,
  playerNames,
  playerColors,
  status,
  generationSpritePath,
  wikiId,
  nicknamesEnabled = true,
  children,
}) => {
  const { t, i18n } = useTranslation();
  const locale = normalizeLanguage(i18n.language);

  return (
    <div className="relative p-2 border rounded-md text-xs border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
      {status && (
        <div
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status === "lost" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200"}`}
        >
          {status === "lost"
            ? t("graveyard.statusLost")
            : t("graveyard.statusDead")}
        </div>
      )}
      {children}
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
          gridTemplateColumns: `repeat(${playerNames.length}, minmax(max-content, 1fr))`,
        }}
      >
        {playerNames.map((name, index) => {
          const member = pair.members?.[index] ?? { id: null, nickname: "" };
          const { displayName, spriteUrl } = resolvePokemonDisplay(
            member,
            locale,
            generationSpritePath,
          );
          const wikiUrl =
            displayName && member.id && wikiId
              ? getWikiUrlById(member.id, wikiId as WikiId)
              : null;

          return (
            <div
              key={`${pair.id}-player-${index}`}
              className="flex justify-center w-full"
            >
              <div className="inline-flex items-center gap-2 text-left mb-2">
                {spriteUrl && (
                  <SpriteImage
                    src={spriteUrl}
                    alt=""
                    className="w-16 h-16 -my-3"
                    loading="lazy"
                  />
                )}
                <div className="flex flex-col items-start">
                  <p
                    className="font-bold"
                    style={{ color: playerColors[index] ?? "#4b5563" }}
                  >
                    <Trans
                      i18nKey="graveyard.memberTitle"
                      values={{
                        name,
                        pokemon: displayName || t("graveyard.unknownPokemon"),
                      }}
                      components={{
                        pokemon: wikiUrl ? (
                          <a
                            href={wikiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          />
                        ) : (
                          <span />
                        ),
                      }}
                    />
                  </p>
                  {nicknamesEnabled && (
                    <p className="text-gray-700 dark:text-gray-400">
                      {t("graveyard.nicknameLabel", {
                        nickname: member.nickname || t("graveyard.noNickname"),
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
};

export default PokemonPairCard;
