import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { FiInfo, FiPlus, FiUsers, FiX } from "react-icons/fi";
import { PLAYER_COLORS, sanitizeTags } from "@/src/services/init.ts";
import {
  focusRingClasses,
  focusRingInputClasses,
  focusRingInsetClasses,
} from "@/src/styles/focusRing.ts";
import GameVersionPicker from "@/src/components/pickers/GameVersionPicker.tsx";
import { useTranslation } from "react-i18next";
import { getLocalizedGameName } from "@/src/services/gameLocalization.ts";
import type { Ruleset } from "@/types.ts";
import RulesetPicker from "@/src/components/pickers/RulesetPicker.tsx";
import { useFocusTrap } from "@/src/hooks/useFocusTrap.ts";
import ToggleSwitch from "@/src/components/toggles/ToggleSwitch.tsx";
import Tooltip from "@/src/components/other/Tooltip.tsx";

interface CreateTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    title: string;
    playerNames: string[];
    memberInvites: Array<{ email: string; role: "editor" | "guest" }>;
    gameVersionId: string;
    allPokemonAndItems?: boolean;
    rulesetId?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
  rulesets: Ruleset[];
  defaultRulesetId?: string;
}

const CreateTrackerModal: React.FC<CreateTrackerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
  rulesets,
  defaultRulesetId,
}) => {
  const { containerRef } = useFocusTrap(isOpen);
  const [title, setTitle] = useState("");
  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState<string[]>(["", ""]);
  const [memberInputs, setMemberInputs] = useState<
    Array<{ email: string; role: "editor" | "guest" }>
  >([{ email: "", role: "editor" }]);
  const [gameVersionId, setGameVersionId] = useState("");
  const [allPokemonAndItems, setAllPokemonAndItems] = useState(false);
  const [versionError, setVersionError] = useState(false);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [rulesetId, setRulesetId] = useState(
    defaultRulesetId || rulesets[0]?.id || "",
  );
  const [showRulesetPicker, setShowRulesetPicker] = useState(false);
  const { t, i18n } = useTranslation();
  const titleId = useId();
  const allPokemonAndItemsId = useId();
  const playerCountLabels = useMemo(
    () => ({
      1: t("modals.createTracker.playerCounts.solo"),
      2: t("modals.createTracker.playerCounts.duo"),
      3: t("modals.createTracker.playerCounts.trio"),
    }),
    [t],
  );
  const playerCountTagFilter = useMemo(
    () =>
      ({
        1: "Solo",
        2: "Duo",
        3: "Trio",
      })[playerCount] ?? "Duo",
    [playerCount],
  );
  const localeTag = useMemo(() => {
    const language = (
      i18n.resolvedLanguage ||
      i18n.language ||
      ""
    ).toLowerCase();
    return language.startsWith("en") ? "EN" : "DE";
  }, [i18n.language, i18n.resolvedLanguage]);
  const preferredRulesetIdForSelection = useMemo(() => {
    const includesAllTags = (ruleset: Ruleset, requiredTags: string[]) => {
      const normalizedTags = sanitizeTags(ruleset.tags).map((tag) =>
        tag.toLowerCase(),
      );
      return requiredTags.every((tag) =>
        normalizedTags.includes(tag.toLowerCase()),
      );
    };

    return (
      rulesets.find(
        (ruleset) =>
          ruleset.isPreset &&
          includesAllTags(ruleset, [playerCountTagFilter, localeTag]),
      )?.id ||
      rulesets.find(
        (ruleset) =>
          ruleset.isPreset && includesAllTags(ruleset, [playerCountTagFilter]),
      )?.id ||
      rulesets.find((ruleset) =>
        includesAllTags(ruleset, [playerCountTagFilter, localeTag]),
      )?.id ||
      rulesets.find((ruleset) =>
        includesAllTags(ruleset, [playerCountTagFilter]),
      )?.id ||
      defaultRulesetId ||
      rulesets[0]?.id ||
      ""
    );
  }, [defaultRulesetId, localeTag, playerCountTagFilter, rulesets]);

  useEffect(() => {
    setPlayerNames((prev) => {
      const next = prev.slice(0, playerCount);
      while (next.length < playerCount) {
        next.push("");
      }
      return next;
    });
  }, [playerCount]);

  useEffect(() => {
    if (!isOpen || !preferredRulesetIdForSelection) return;
    setRulesetId((current) =>
      current === preferredRulesetIdForSelection
        ? current
        : preferredRulesetIdForSelection,
    );
  }, [isOpen, preferredRulesetIdForSelection]);

  const resetForm = useCallback(() => {
    setTitle("");
    setPlayerCount(2);
    setPlayerNames(["", ""]);
    setMemberInputs([{ email: "", role: "editor" }]);
    setGameVersionId("");
    setAllPokemonAndItems(false);
    setVersionError(false);
    setShowVersionPicker(false);
    setRulesetId(defaultRulesetId || rulesets[0]?.id || "");
    setShowRulesetPicker(false);
  }, [defaultRulesetId, rulesets]);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  if (!isOpen) return null;

  const handleAddMemberRow = () =>
    setMemberInputs((prev) => [...prev, { email: "", role: "editor" }]);

  const handleRemoveMemberRow = (index: number) => {
    setMemberInputs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMemberChange = (index: number, value: string) => {
    setMemberInputs((prev) =>
      prev.map((entry, i) =>
        i === index ? { ...entry, email: value } : entry,
      ),
    );
  };

  const handleMemberRoleChange = (index: number, role: "editor" | "guest") => {
    setMemberInputs((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, role } : entry)),
    );
  };

  const handleSubmit = async (event: React.SubmitEvent) => {
    event.preventDefault();
    if (!gameVersionId) {
      setVersionError(true);
      setShowVersionPicker(true);
      return;
    }
    const trimmedPlayerNames = playerNames.map((name) => name.trim());
    await onSubmit({
      title,
      playerNames: trimmedPlayerNames,
      memberInvites: memberInputs
        .map((entry) => ({ email: entry.email.trim(), role: entry.role }))
        .filter((entry) => entry.email.length > 0),
      gameVersionId: gameVersionId,
      allPokemonAndItems,
      rulesetId,
    });
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700"
      >
        <form onSubmit={handleSubmit}>
          <header className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-green-600">
                {t("modals.createTracker.badge")}
              </p>
              <h2
                id={titleId}
                className="text-xl font-semibold mt-1 text-gray-900 dark:text-gray-100"
              >
                {t("modals.createTracker.title")}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className={`text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-md ${focusRingClasses}`}
              aria-label={t("common.close")}
              disabled={isSubmitting}
            >
              <FiX size={20} />
            </button>
          </header>

          <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                {t("modals.createTracker.versionLabel")}
              </label>
              <button
                type="button"
                onClick={() => setShowVersionPicker((v) => !v)}
                aria-expanded={showVersionPicker}
                aria-controls="game-version-picker-panel"
                className={`w-full inline-flex items-center justify-between rounded-md border ${versionError ? "border-red-500 dark:border-red-400" : "border-gray-300 dark:border-gray-600"} bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 ${focusRingClasses}`}
                title={t("modals.createTracker.versionButton")}
                aria-invalid={versionError}
                aria-describedby={
                  versionError ? "game-version-error" : undefined
                }
              >
                <span>{t("modals.createTracker.versionButton")}</span>
                <span
                  className={`text-xs ${gameVersionId ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}
                >
                  {gameVersionId
                    ? getLocalizedGameName(t, gameVersionId, gameVersionId)
                    : t("modals.createTracker.versionPlaceholder")}
                </span>
              </button>

              <div
                id="game-version-picker-panel"
                aria-hidden={!showVersionPicker}
                inert={!showVersionPicker}
                className={`transform-gpu ${showVersionPicker ? "mt-3 max-h-72 opacity-100" : "max-h-0 opacity-0 pointer-events-none"} transition-all duration-300 ease-in-out overflow-hidden`}
              >
                <GameVersionPicker
                  value={gameVersionId}
                  isInteractive={showVersionPicker}
                  onSelect={(versionId) => {
                    setGameVersionId(versionId);
                    setVersionError(false);
                    setShowVersionPicker(false);
                  }}
                />
              </div>
              {versionError && (
                <p
                  id="game-version-error"
                  className="mt-2 text-sm text-red-600 dark:text-red-400"
                >
                  {t("modals.createTracker.versionRequired")}
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <label
                  htmlFor={allPokemonAndItemsId}
                  className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                >
                  {t("modals.createTracker.allPokemonAndItemsLabel")}
                </label>
                <Tooltip
                  side={localeTag == "EN" ? "right" : "top"}
                  content={t(
                    "modals.createTracker.allPokemonAndItemsDescription",
                  )}
                >
                  <span
                    className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                    aria-label={t(
                      "modals.createTracker.allPokemonAndItemsTooltipLabel",
                    )}
                  >
                    <FiInfo size={16} />
                  </span>
                </Tooltip>
              </div>
              <ToggleSwitch
                id={allPokemonAndItemsId}
                checked={allPokemonAndItems}
                onChange={setAllPokemonAndItems}
                disabled={isSubmitting}
                size="sm"
                ariaLabel={t("modals.createTracker.allPokemonAndItemsLabel")}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                {t("modals.createTracker.rulesetLabel")}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <button
                  type="button"
                  onClick={() => setShowRulesetPicker((v) => !v)}
                  aria-expanded={showRulesetPicker}
                  aria-controls="ruleset-picker-panel"
                  className={`flex-1 inline-flex items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm font-semibold text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 ${focusRingClasses}`}
                  title={t("modals.createTracker.rulesetButton")}
                  disabled={isSubmitting}
                >
                  <span>{t("modals.createTracker.rulesetButton")}</span>
                  <span
                    className={`text-xs ${rulesetId ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}
                  >
                    {rulesets.find((entry) => entry.id === rulesetId)?.name ||
                      t("modals.createTracker.rulesetPlaceholder")}
                  </span>
                </button>
              </div>

              <div
                id="ruleset-picker-panel"
                aria-hidden={!showRulesetPicker}
                inert={!showRulesetPicker}
                className={`transform-gpu ${showRulesetPicker ? "mt-3 max-h-[70vh] opacity-100" : "max-h-0 opacity-0 pointer-events-none"} transition-all duration-300 ease-in-out overflow-hidden`}
              >
                <RulesetPicker
                  value={rulesetId}
                  rulesets={rulesets}
                  isInteractive={showRulesetPicker && !isSubmitting}
                  enableTagFilter
                  defaultTagFilter={playerCountTagFilter}
                  defaultTagFilterGroup={["Solo", "Duo", "Trio"]}
                  listMaxHeightClass="max-h-56"
                  onSelect={(id) => {
                    setRulesetId(id);
                    setShowRulesetPicker(false);
                  }}
                />
              </div>
            </div>
            <div>
              <label
                className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1 block"
                htmlFor="trackerTitle"
              >
                {t("modals.createTracker.titleLabel")}
              </label>
              <input
                id="trackerTitle"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                data-autofocus
                className={`w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 ${focusRingInputClasses}`}
                placeholder={t("modals.createTracker.titlePlaceholder")}
              />
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t("modals.createTracker.playerCountLabel")}
                </label>
                <div className="inline-flex self-start sm:self-auto rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden focus-within:border-green-500 transition-colors">
                  {[1, 2, 3].map((count) => {
                    const active = playerCount === count;
                    return (
                      <button
                        key={`player-count-${count}`}
                        type="button"
                        onClick={() => setPlayerCount(count)}
                        className={`px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                          active
                            ? "bg-green-600 text-white"
                            : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                        } ${count !== 3 ? "border-r border-gray-300 dark:border-gray-600" : ""} ${focusRingInsetClasses}`}
                      >
                        {playerCountLabels[count]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {playerNames.map((value, index) => {
                  const fullWidth =
                    (playerNames.length === 3 && index === 2) ||
                    playerNames.length === 1;
                  return (
                    <div
                      key={`player-name-${index}`}
                      className={fullWidth ? "sm:col-span-2" : undefined}
                    >
                      <label
                        className="text-sm font-semibold mb-1 block"
                        style={{ color: PLAYER_COLORS[index] ?? "#4b5563" }}
                      >
                        {t("modals.createTracker.playerLabel", {
                          index: index + 1,
                        })}
                      </label>
                      <input
                        type="text"
                        required
                        value={value}
                        onChange={(e) =>
                          setPlayerNames((prev) =>
                            prev.map((entry, i) =>
                              i === index ? e.target.value : entry,
                            ),
                          )
                        }
                        className={`w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 ${focusRingInputClasses}`}
                        placeholder={t(
                          "modals.createTracker.playerPlaceholder",
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <FiUsers /> {t("modals.createTracker.membersLabel")}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t("modals.createTracker.membersDescription")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddMemberRow}
                  className={`inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${focusRingClasses}`}
                >
                  <FiPlus /> {t("modals.createTracker.addMember")}
                </button>
              </div>
              <div className="space-y-2 max-h-44 overflow-y-auto px-1 py-1 custom-scrollbar">
                {memberInputs.map((value, index) => (
                  <div key={`member-${index}`} className="flex min-w-0 gap-2">
                    <input
                      type="email"
                      value={value.email}
                      onChange={(e) =>
                        handleMemberChange(index, e.target.value)
                      }
                      placeholder="trainer@example.com"
                      className={`min-w-0 flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 ${focusRingInputClasses}`}
                    />
                    <select
                      value={value.role}
                      onChange={(e) =>
                        handleMemberRoleChange(
                          index,
                          e.target.value as "editor" | "guest",
                        )
                      }
                      className={`w-24 sm:w-28 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-2 text-sm text-gray-900 dark:text-gray-100 ${focusRingInputClasses}`}
                    >
                      <option value="editor">{t("common.roles.member")}</option>
                      <option value="guest">{t("common.roles.guest")}</option>
                    </select>
                    {memberInputs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMemberRow(index)}
                        className={`rounded-md border border-gray-300 dark:border-gray-600 px-3 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white ${focusRingClasses}`}
                        aria-label={t("modals.createTracker.removeMember")}
                      >
                        <FiX />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-700 px-3 py-2 text-sm text-red-700 dark:text-red-200">
                {error}
              </div>
            )}
          </div>

          <footer className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end border-t border-gray-200 dark:border-gray-700 px-5 py-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className={`inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-60 ${focusRingClasses}`}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !gameVersionId}
              className="inline-flex justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-500 disabled:opacity-60"
            >
              {isSubmitting
                ? t("modals.createTracker.submitting")
                : t("modals.createTracker.submit")}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default CreateTrackerModal;
