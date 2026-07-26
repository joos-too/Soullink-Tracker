import React, { useEffect, useId, useState } from "react";
import type { PokemonLink } from "@/types.ts";
import { Trans, useTranslation } from "react-i18next";
import { useFocusTrap } from "@/src/hooks/useFocusTrap.ts";
import { focusRingClasses } from "@/src/styles/focusRing.ts";
import { FiInfo } from "react-icons/fi";
import Tooltip from "@/src/components/other/Tooltip.tsx";
import { resolvePokemonDisplay } from "@/src/services/pokemonDisplay.ts";
import { resolvePokemonLocationDisplay } from "@/src/services/locationSearch.ts";
import { normalizeLanguage } from "@/src/utils/language.ts";

interface SelectLossModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (playerIndex: number) => void;
  pair: PokemonLink | null;
  playerNames: string[];
  generationSpritePath: string;
  nicknamesEnabled?: boolean;
}

const SelectLossModal: React.FC<SelectLossModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  pair,
  playerNames,
  generationSpritePath,
  nicknamesEnabled = true,
}) => {
  const [selected, setSelected] = useState<number | null>(null);
  const { t, i18n } = useTranslation();
  const locale = normalizeLanguage(i18n.language);
  const { containerRef } = useFocusTrap(isOpen);
  const titleId = useId();

  useEffect(() => {
    if (isOpen) {
      setSelected(playerNames.length === 1 ? 0 : null);
    }
  }, [isOpen, playerNames.length]);

  if (!isOpen) return null;
  const locationLabel = pair ? resolvePokemonLocationDisplay(pair, locale) : "";

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (selected === null) return;
    onConfirm(selected);
  };

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
              {t("modals.selectLoss.title")}
            </h2>
            <Tooltip side="top" content={t("modals.selectLoss.description")}>
              <span
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                aria-label={t("modals.selectLoss.tooltipLabel")}
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

        <form onSubmit={handleSubmit}>
          {pair && (
            <div className="mb-4 text-sm text-gray-700 dark:text-gray-300">
              {locationLabel && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-3 px-1">
                  {t("modals.selectLoss.locationLabel", {
                    location: locationLabel,
                  })}
                </div>
              )}

              {playerNames.length === 1 ? (
                <div className="flex flex-col gap-1 bg-gray-50 dark:bg-gray-700/50 rounded-md px-2.5 py-1.5">
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
                        key={`loss-preview-${index}`}
                        className="flex items-center justify-between text-xs"
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
              ) : (
                <fieldset className="flex flex-col gap-1.5">
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
                    const isSelected = selected === index;
                    return (
                      <label
                        key={`loss-preview-${index}`}
                        className={`flex items-center justify-between cursor-pointer rounded-md px-2.5 py-1.5 border-2 transition-colors ${
                          isSelected
                            ? "border-red-500 bg-red-50 dark:bg-red-900/30"
                            : "border-transparent bg-gray-50 dark:bg-gray-700/50 hover:border-gray-300 dark:hover:border-gray-500"
                        } ${focusRingClasses}`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="lost-player"
                            checked={isSelected}
                            onChange={() => setSelected(index)}
                            className="h-4 w-4 accent-red-600"
                          />
                          <span className="font-semibold text-xs dark:text-gray-200">
                            {name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
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
                      </label>
                    );
                  })}
                </fieldset>
              )}

              <p className="mt-3 text-xs font-semibold">
                {playerNames.length === 1 ? (
                  <Trans
                    i18nKey="modals.selectLoss.autoAssign"
                    values={{ player: playerNames[0] }}
                    components={{ strong: <span className="font-semibold" /> }}
                  />
                ) : (
                  t("modals.selectLoss.selectHint")
                )}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${focusRingClasses}`}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={selected === null}
              className={`px-4 py-2 text-sm font-semibold rounded-md shadow ${focusRingClasses} ${selected !== null ? "bg-red-600 text-white hover:bg-red-700 dark:hover:bg-red-500" : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"}`}
            >
              {t("modals.selectLoss.confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SelectLossModal;
