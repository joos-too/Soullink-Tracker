import React, { useId } from "react";
import type { PokemonLink } from "@/types.ts";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "@/src/hooks/useFocusTrap.ts";
import { focusRingClasses } from "@/src/styles/focusRing.ts";
import { FiAlertTriangle, FiInfo } from "react-icons/fi";
import Tooltip from "@/src/components/other/Tooltip.tsx";
import { resolvePokemonDisplay } from "@/src/services/pokemons/pokemonDisplay.ts";
import { resolvePokemonLocationDisplay } from "@/src/services/search/locationSearch.ts";
import { normalizeLanguage } from "@/src/utils/language.ts";

interface DeleteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  pair: PokemonLink | null;
  playerNames: string[];
  generationSpritePath: string;
  nicknamesEnabled?: boolean;
}

const DeleteLinkModal: React.FC<DeleteLinkModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  pair,
  playerNames,
  generationSpritePath,
  nicknamesEnabled = true,
}) => {
  const { t, i18n } = useTranslation();
  const locale = normalizeLanguage(i18n.language);
  const { containerRef } = useFocusTrap(isOpen);
  const titleId = useId();

  if (!isOpen || !pair) return null;
  const locationLabel = resolvePokemonLocationDisplay(pair, locale);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <h2 id={titleId} className="text-lg font-bold dark:text-gray-100">
              {t("modals.deleteLink.title")}
            </h2>
            <Tooltip side="top" content={t("modals.deleteLink.description")}>
              <span
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                aria-label={t("modals.deleteLink.tooltipLabel")}
              >
                <FiInfo size={16} />
              </span>
            </Tooltip>
          </div>
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

        <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
          {locationLabel && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 px-1">
              {t("modals.deleteLink.locationLabel", {
                location: locationLabel,
              })}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {playerNames.map((name, index) => {
              const member = pair.members?.[index] ?? {
                id: null,
                nickname: "",
              };
              const { displayName, spriteUrl } = resolvePokemonDisplay(
                member,
                locale,
                generationSpritePath,
              );
              return (
                <div
                  key={`delete-preview-${index}`}
                  className="flex items-center justify-between rounded-md px-2.5 py-1.5 bg-gray-50 dark:bg-gray-700/50 text-xs"
                >
                  <div className="font-semibold">{name}</div>
                  <div className="flex items-center gap-1.5">
                    {spriteUrl && (
                      <img src={spriteUrl} alt="" className="w-8 h-8" />
                    )}
                    <span>
                      {displayName || "-"}
                      {nicknamesEnabled && member.nickname
                        ? ` (${member.nickname})`
                        : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-2 mt-3 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-sm text-red-800 dark:text-red-100">
            <FiAlertTriangle size={16} className="mt-0.5 shrink-0" />
            {t("modals.deleteLink.warning")}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className={`px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${focusRingClasses}`}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-500 ${focusRingClasses}`}
          >
            {t("modals.deleteLink.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteLinkModal;
