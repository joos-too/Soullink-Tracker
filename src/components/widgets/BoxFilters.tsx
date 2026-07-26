import React from "react";
import { useTranslation } from "react-i18next";
import {
  FiChevronDown,
  FiChevronUp,
  FiEyeOff,
  FiFilter,
  FiInfo,
  FiX,
  FiZap,
} from "react-icons/fi";
import TypeBadge from "@/src/components/badges/TypeBadge.tsx";
import ToggleSwitch from "@/src/components/toggles/ToggleSwitch.tsx";
import Tooltip from "@/src/components/other/Tooltip.tsx";
import { focusRingClasses } from "@/src/styles/focusRing.ts";
import { ALL_TYPE_SLUGS } from "@/src/data/pokemon";

export interface TypeFilterEntry {
  types: string[];
  playerIndex: number | null; // null = any player
}

interface BoxFiltersProps {
  playerNames: string[];
  playerColors: string[];
  typeFilter: TypeFilterEntry;
  onTypeFilterChange: (filter: TypeFilterEntry) => void;
  hideHiddenLinks: boolean;
  onHideHiddenLinksChange: (value: boolean) => void;
  hasHiddenLinks: boolean;
  onResetHiddenLinks?: () => void;
  playerTypeSlugs: Map<number, Set<string>>;
  expanded: boolean;
  onExpandedChange: (value: boolean) => void;
}

const BoxFilters: React.FC<BoxFiltersProps> = ({
  playerNames,
  playerColors,
  typeFilter,
  onTypeFilterChange,
  hideHiddenLinks,
  onHideHiddenLinksChange,
  hasHiddenLinks,
  onResetHiddenLinks,
  playerTypeSlugs,
  expanded,
  onExpandedChange,
}) => {
  const { t } = useTranslation();
  const setExpanded = onExpandedChange;

  const activeCount = typeFilter.types.length;
  const hasActiveFilters = activeCount > 0;

  const toggleType = (slug: string) => {
    const next = typeFilter.types.includes(slug)
      ? typeFilter.types.filter((s) => s !== slug)
      : [...typeFilter.types, slug];
    onTypeFilterChange({ ...typeFilter, types: next });
  };

  const setPlayerIndex = (playerIndex: number | null) => {
    onTypeFilterChange({ ...typeFilter, playerIndex });
  };

  const clearAll = () => {
    onTypeFilterChange({ types: [], playerIndex: null });
  };

  const applyAutoFilter = () => {
    if (typeFilter.playerIndex === null) return;
    const slugs = playerTypeSlugs.get(typeFilter.playerIndex) ?? new Set();
    const missingTypes = ALL_TYPE_SLUGS.filter((s) => !slugs.has(s));
    onTypeFilterChange({ ...typeFilter, types: missingTypes });
  };

  const autoEnabled = typeFilter.playerIndex !== null;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
      {/* Toggle bar */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`flex w-full items-center justify-between px-4 py-2.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-100/60 dark:hover:bg-gray-700/40 transition-colors ${focusRingClasses}`}
      >
        <span className="flex items-center gap-2">
          <FiFilter size={14} className="shrink-0" />
          {t("team.filtersTitle")}
          {hasActiveFilters && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold tabular-nums bg-green-600 text-white">
              {activeCount}
            </span>
          )}
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full transition-opacity ${
              hideHiddenLinks
                ? "bg-yellow-500 text-white opacity-100"
                : "opacity-0"
            }`}
            aria-hidden={!hideHiddenLinks}
            title={t("team.hideHiddenLinks")}
          >
            <FiEyeOff size={11} />
          </span>
        </span>
        {expanded ? (
          <FiChevronUp size={14} className="shrink-0" />
        ) : (
          <FiChevronDown size={14} className="shrink-0" />
        )}
      </button>

      {/* Filter panel */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-4">
          {/* ── Row: Player + Hidden Links ── */}
          <div className="grid grid-cols-2 gap-4">
            {/* ── Section: Player ── */}
            {playerNames.length > 1 && (
              <fieldset className="min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
                <legend className="px-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {t("team.filterPlayerLabel")}
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPlayerIndex(null)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${focusRingClasses} ${
                      typeFilter.playerIndex === null
                        ? "bg-gray-800 text-white border-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:border-gray-100 shadow-sm"
                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                  >
                    {t("team.filterAllPlayers")}
                  </button>
                  {playerNames.map((name, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPlayerIndex(idx)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${focusRingClasses} ${
                        typeFilter.playerIndex === idx
                          ? "text-white border-transparent shadow-sm"
                          : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                      }`}
                      style={
                        typeFilter.playerIndex === idx
                          ? {
                              backgroundColor: playerColors[idx] ?? "#4b5563",
                            }
                          : undefined
                      }
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {/* ── Section: Hidden Links ── */}
            <fieldset className="min-w-0 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
              <legend className="px-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {t("team.hiddenLinksSection")}
              </legend>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-sm ${
                      hasHiddenLinks
                        ? "text-gray-700 dark:text-gray-300"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {t("team.hideHiddenLinks")}
                  </span>
                  <ToggleSwitch
                    id="hide-hidden-links-toggle"
                    checked={hideHiddenLinks}
                    onChange={onHideHiddenLinksChange}
                    ariaLabel={t("team.hideHiddenLinks")}
                    disabled={!hasHiddenLinks}
                  />
                </div>

                {onResetHiddenLinks && (
                  <button
                    type="button"
                    onClick={() => {
                      onResetHiddenLinks!();
                      onHideHiddenLinksChange(false);
                    }}
                    disabled={!hasHiddenLinks}
                    className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border shadow-sm transition-all ${focusRingClasses} ${
                      hasHiddenLinks
                        ? "text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 opacity-100"
                        : "opacity-0 pointer-events-none border-transparent"
                    }`}
                    aria-hidden={!hasHiddenLinks}
                    tabIndex={hasHiddenLinks ? 0 : -1}
                  >
                    <FiX size={12} />
                    {t("team.resetHiddenLinks")}
                  </button>
                )}
              </div>
            </fieldset>
          </div>

          {/* ── Section: Types ── */}
          <fieldset className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
            <legend className="px-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {t("team.filterByType")}
            </legend>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-nowrap gap-1 min-w-0">
                {ALL_TYPE_SLUGS.map((slug) => {
                  const isSelected = typeFilter.types.includes(slug);
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => toggleType(slug)}
                      className={`transition-all rounded-sm ${focusRingClasses} ${
                        isSelected
                          ? "opacity-100"
                          : "opacity-50 hover:opacity-80"
                      }`}
                      title={slug}
                    >
                      <TypeBadge typeSlug={slug} selected={isSelected} />
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={!hasActiveFilters}
                  className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border shadow-sm transition-all ${focusRingClasses} ${
                    hasActiveFilters
                      ? "text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 opacity-100"
                      : "opacity-0 pointer-events-none border-transparent"
                  }`}
                  aria-hidden={!hasActiveFilters}
                  tabIndex={hasActiveFilters ? 0 : -1}
                >
                  <FiX size={12} />
                  {t("team.clearFilters")}
                </button>

                <button
                  type="button"
                  onClick={applyAutoFilter}
                  disabled={!autoEnabled}
                  className={`inline-flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border shadow-sm transition-all ${focusRingClasses} ${
                    autoEnabled
                      ? "text-yellow-700 dark:text-yellow-300 border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-800/40"
                      : "opacity-50 cursor-not-allowed text-gray-400 dark:text-gray-500 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700"
                  }`}
                >
                  <FiZap size={12} />
                  {t("team.autoTypeFilter")}
                  <Tooltip
                    side="top"
                    content={
                      autoEnabled
                        ? t("team.autoTypeFilterTooltip")
                        : t("team.autoTypeFilterDisabledTooltip")
                    }
                  >
                    <FiInfo size={12} className="cursor-help" />
                  </Tooltip>
                </button>
              </div>
            </div>
          </fieldset>
        </div>
      )}
    </div>
  );
};

export default BoxFilters;
