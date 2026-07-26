import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiAward,
  FiEdit,
  FiEye,
  FiFilter,
  FiLock,
  FiMenu,
  FiMoon,
  FiPlus,
  FiSettings,
  FiSun,
  FiUnlock,
  FiUser,
  FiUsers,
} from "react-icons/fi";
import DarkModeToggle, {
  getDarkMode,
  setDarkMode,
} from "@/src/components/toggles/DarkModeToggle.tsx";
import type { TrackerMeta, TrackerSummary } from "@/types.ts";
import GameVersionBadge from "@/src/components/badges/GameVersionBadge.tsx";
import {
  focusRingCardClasses,
  focusRingClasses,
  focusRingInsetClasses,
} from "@/src/styles/focusRing.ts";
import { GAME_VERSIONS } from "@/src/data/game-versions.ts";
import { formatBestLabel } from "@/src/utils/bestRun.ts";
import { useTranslation } from "react-i18next";
import { getLocalizedGameName } from "@/src/services/gameLocalization.ts";
import MigrationDisplayNameModal from "@/src/components/modals/MigrationDisplayNameModal.tsx";

type SortOption = "date" | "name" | "version";
type VisibilityFilter = "all" | "public" | "private";
type PlayerCountFilter = "all" | 1 | 2 | 3;

interface HomePageProps {
  trackers: TrackerMeta[];
  onOpenTracker: (trackerId: string) => void;
  onCreateTracker: () => void;
  onOpenUserSettings: () => void;
  onOpenRulesetEditor: () => void;
  isLoading: boolean;
  activeTrackerId: string | null;
  userEmail?: string | null;
  currentUserId?: string | null;
  displayName: string;
  displayNameRequiresUpdate: boolean;
  onDisplayNameChange: (displayName: string) => Promise<void>;
  trackerSummaries: Record<string, TrackerSummary | undefined>;
}

const HomePage: React.FC<HomePageProps> = ({
  trackers,
  onOpenTracker,
  onCreateTracker,
  isLoading,
  onOpenUserSettings,
  onOpenRulesetEditor,
  trackerSummaries,
  currentUserId,
  displayName,
  displayNameRequiresUpdate,
  onDisplayNameChange,
}) => {
  const { t, i18n } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(getDarkMode());
  const [filterOpen, setFilterOpen] = useState(false);
  const [displayNamePromptDismissed, setDisplayNamePromptDismissed] =
    useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("date");
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>("all");
  const [playerCountFilter, setPlayerCountFilter] =
    useState<PlayerCountFilter>("all");
  const [versionFilter, setVersionFilter] = useState<string>("all");
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  const usedVersionIds = useMemo(() => {
    const ids = new Set<string>();
    trackers.forEach((tracker) => ids.add(tracker.gameVersionId));
    const canonicalOrder = Object.keys(GAME_VERSIONS);
    return canonicalOrder.filter((id) => ids.has(id));
  }, [trackers]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (visibilityFilter !== "all") count++;
    if (playerCountFilter !== "all") count++;
    if (versionFilter !== "all") count++;
    return count;
  }, [visibilityFilter, playerCountFilter, versionFilter]);

  const hasActiveFilters = activeFilterCount > 0;

  const filteredAndSortedTrackers = useMemo(() => {
    let result = [...trackers];

    // Filter by visibility
    if (visibilityFilter === "public") {
      result = result.filter((tracker) => tracker.isPublic);
    } else if (visibilityFilter === "private") {
      result = result.filter((tracker) => !tracker.isPublic);
    }

    // Filter by player count
    if (playerCountFilter !== "all") {
      result = result.filter(
        (tracker) =>
          Object.keys(tracker.playerNames ?? {}).length === playerCountFilter,
      );
    }

    // Filter by game version
    if (versionFilter !== "all") {
      result = result.filter(
        (tracker) => tracker.gameVersionId === versionFilter,
      );
    }

    // Sort
    switch (sortBy) {
      case "name":
        result.sort((a, b) =>
          a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
        );
        break;
      case "version": {
        const canonicalOrder = Object.keys(GAME_VERSIONS);
        result.sort((a, b) => {
          const idxA = canonicalOrder.indexOf(a.gameVersionId);
          const idxB = canonicalOrder.indexOf(b.gameVersionId);
          return (
            (idxA === -1 ? Infinity : idxA) - (idxB === -1 ? Infinity : idxB)
          );
        });
        break;
      }
      case "date":
      default:
        result.sort((a, b) => b.createdAt - a.createdAt);
        break;
    }

    return result;
  }, [trackers, sortBy, visibilityFilter, playerCountFilter, versionFilter]);
  const dateLocale = useMemo(
    () => (i18n.language?.toLowerCase().startsWith("de") ? "de-DE" : "en-US"),
    [i18n.language],
  );
  const playerCountLabels = useMemo(
    () => ({
      1: t("modals.createTracker.playerCounts.solo"),
      2: t("modals.createTracker.playerCounts.duo"),
      3: t("modals.createTracker.playerCounts.trio"),
    }),
    [t],
  );

  useEffect(() => {
    if (!mobileMenuOpen) return;
    setIsDark(getDarkMode());
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!filterOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target as Node) &&
        filterButtonRef.current &&
        !filterButtonRef.current.contains(event.target as Node)
      ) {
        setFilterOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [filterOpen]);

  return (
    <div className="min-h-screen bg-[#f0f0f0] dark:bg-gray-900 text-gray-800 dark:text-gray-100 px-3 py-6 sm:py-10">
      <MigrationDisplayNameModal
        isOpen={displayNameRequiresUpdate && !displayNamePromptDismissed}
        initialDisplayName={displayName}
        onClose={() => setDisplayNamePromptDismissed(true)}
        onSave={async (nextDisplayName) => {
          await onDisplayNameChange(nextDisplayName);
          setDisplayNamePromptDismissed(true);
        }}
      />
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-5 sm:px-6 shadow-[6px_6px_0_0_rgba(31,41,55,0.25)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <img
                src="/Soullinktracker-Logo.png"
                alt={t("home.logoAlt", {
                  defaultValue: "Soullink Tracker Logo",
                })}
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow"
              />
              <div>
                <h1 className="text-xl sm:text-3xl font-press-start text-gray-900 dark:text-gray-100 mt-2">
                  {t("home.heroTitle")}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  {t("home.heroSubtitle")}
                </p>
              </div>
            </div>
            <div className="hidden xl:flex flex-col items-end gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <DarkModeToggle />
                <button
                  type="button"
                  onClick={onOpenRulesetEditor}
                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white ${focusRingClasses}`}
                  aria-label={t("home.rulesetEditor")}
                  title={t("home.rulesetEditor")}
                >
                  <FiEdit size={30} />
                  <span className="sr-only">{t("home.rulesetEditor")}</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenUserSettings}
                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white ${focusRingClasses}`}
                  aria-label={t("tracker.menu.settings")}
                  title={t("tracker.menu.settings")}
                >
                  <FiSettings size={30} />
                  <span className="sr-only">{t("tracker.menu.settings")}</span>
                </button>
              </div>
            </div>
            <button
              type="button"
              className={`xl:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 ${focusRingClasses}`}
              aria-label={t("tracker.menu.open")}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
            >
              <FiMenu size={26} />
            </button>
          </div>

          <div className="xl:hidden">
            <div
              className={`fixed inset-0 bg-black/50 transition-opacity duration-300 ${mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"} z-40`}
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden
            />
            <div
              className={`fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl transform transition-transform duration-300 ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"} z-50`}
              role="dialog"
              aria-label={t("tracker.menu.dialog")}
            >
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {t("tracker.menu.title")}
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 ${focusRingClasses}`}
                  aria-label={t("tracker.menu.close")}
                >
                  ✕
                </button>
              </div>
              <div className="p-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isDark;
                    setDarkMode(next);
                    setIsDark(next);
                  }}
                  className={`w-full text-left px-2 py-2 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 inline-flex items-center gap-2 ${focusRingClasses}`}
                  title={
                    isDark
                      ? t("tracker.menu.lightMode")
                      : t("tracker.menu.darkMode")
                  }
                >
                  {isDark ? <FiSun size={18} /> : <FiMoon size={18} />}
                  {isDark
                    ? t("tracker.menu.lightMode")
                    : t("tracker.menu.darkMode")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenRulesetEditor();
                  }}
                  className={`w-full text-left px-2 py-2 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 inline-flex items-center gap-2 ${focusRingClasses}`}
                  title={t("tracker.menu.rulesets")}
                >
                  <FiEdit size={18} /> {t("tracker.menu.rulesets")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenUserSettings();
                  }}
                  className={`w-full text-left px-2 py-2 rounded-md text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 inline-flex items-center gap-2 ${focusRingClasses}`}
                  title={t("tracker.menu.settings")}
                >
                  <FiSettings size={18} /> {t("tracker.menu.settings")}
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-6 sm:px-6 shadow-[6px_6px_0_0_rgba(31,41,55,0.25)]">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-green-600">
                {t("home.trackersBadge")}
              </p>
              <h2 className="text-xl font-semibold mt-1">
                {t("home.trackersTitle")}
              </h2>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end sm:flex-row sm:gap-3">
              <div className="relative">
                <button
                  ref={filterButtonRef}
                  type="button"
                  onClick={() => setFilterOpen((v) => !v)}
                  aria-expanded={filterOpen}
                  className={`inline-flex items-center gap-2 justify-center rounded-md border px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] shadow-sm transition ${
                    hasActiveFilters
                      ? "border-green-500 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-100"
                      : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  } ${focusRingClasses}`}
                  title={t("home.filterSort")}
                >
                  <FiFilter size={14} />
                  {t("home.filterSort")}
                  {hasActiveFilters && (
                    <span className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-600 text-[9px] font-bold text-white leading-none normal-case tracking-normal">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {filterOpen && (
                  <div
                    ref={filterPanelRef}
                    className="absolute left-0 sm:left-auto sm:right-0 z-30 mt-2 w-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-xl p-3 space-y-3"
                  >
                    {/* Sort */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
                        {t("home.sortLabel")}
                      </p>
                      <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden focus-within:border-green-500 transition-colors">
                        {(["date", "name", "version"] as SortOption[]).map(
                          (option, idx) => {
                            const active = sortBy === option;
                            return (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setSortBy(option)}
                                className={`px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                                  active
                                    ? "bg-green-600 text-white"
                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                } ${idx !== 2 ? "border-r border-gray-300 dark:border-gray-600" : ""} ${focusRingInsetClasses}`}
                              >
                                {t(`home.sort.${option}`)}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>

                    <hr className="border-gray-200 dark:border-gray-700" />

                    {/* Visibility filter */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
                        {t("home.visibilityLabel")}
                      </p>
                      <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden focus-within:border-green-500 transition-colors">
                        {(
                          ["all", "public", "private"] as VisibilityFilter[]
                        ).map((option, idx) => {
                          const active = visibilityFilter === option;
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => setVisibilityFilter(option)}
                              className={`px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                                active
                                  ? "bg-green-600 text-white"
                                  : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                              } ${idx !== 2 ? "border-r border-gray-300 dark:border-gray-600" : ""} ${focusRingInsetClasses}`}
                            >
                              {t(`home.visibility.${option}`)}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Player count filter */}
                    <div className="space-y-1.5">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
                        {t("home.playerCountLabel")}
                      </p>
                      <div className="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden focus-within:border-green-500 transition-colors">
                        {(["all", 1, 2, 3] as PlayerCountFilter[]).map(
                          (option, idx) => {
                            const active = playerCountFilter === option;
                            const label =
                              option === "all"
                                ? t("home.visibility.all")
                                : playerCountLabels[option];
                            return (
                              <button
                                key={String(option)}
                                type="button"
                                onClick={() => setPlayerCountFilter(option)}
                                className={`px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                                  active
                                    ? "bg-green-600 text-white"
                                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                                } ${idx !== 3 ? "border-r border-gray-300 dark:border-gray-600" : ""} ${focusRingInsetClasses}`}
                              >
                                {label}
                              </button>
                            );
                          },
                        )}
                      </div>
                    </div>

                    {/* Version filter */}
                    {usedVersionIds.length > 1 && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
                          {t("home.versionLabel")}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => setVersionFilter("all")}
                            aria-pressed={versionFilter === "all"}
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                              versionFilter === "all"
                                ? "border-green-500 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-100"
                                : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-gray-500"
                            } ${focusRingClasses}`}
                          >
                            {t("home.visibility.all")}
                          </button>
                          {usedVersionIds.map((versionId) => {
                            const active = versionFilter === versionId;
                            const gv = GAME_VERSIONS[versionId];
                            const label = gv
                              ? getLocalizedGameName(t, versionId, versionId)
                              : versionId;
                            return (
                              <button
                                key={versionId}
                                type="button"
                                onClick={() => setVersionFilter(versionId)}
                                aria-pressed={active}
                                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                                  active
                                    ? "border-green-500 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-100"
                                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-gray-500"
                                } ${focusRingClasses}`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Reset filters */}
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={() => {
                          setVisibilityFilter("all");
                          setPlayerCountFilter("all");
                          setVersionFilter("all");
                        }}
                        className={`w-full text-center rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${focusRingClasses}`}
                      >
                        {t("home.resetFilters")}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onCreateTracker}
                className={`inline-flex items-center gap-2 justify-center rounded-md bg-green-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-sm transition hover:bg-green-700 ${focusRingClasses}`}
              >
                <FiPlus /> {t("home.createTracker")}
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3 text-gray-500 dark:text-gray-400">
                <div className="h-10 w-10 border-4 border-gray-300 dark:border-gray-600 dark:border-t-blue-600 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-sm font-medium">{t("home.loading")}</p>
              </div>
            </div>
          ) : filteredAndSortedTrackers.length === 0 &&
            trackers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-gray-600 dark:text-gray-300">
              <p className="text-base font-semibold">{t("home.emptyTitle")}</p>
              <p className="text-sm mt-2">{t("home.emptyDescription")}</p>
              <button
                type="button"
                onClick={onCreateTracker}
                className={`mt-4 inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-sm transition hover:bg-green-700 ${focusRingClasses}`}
              >
                <FiPlus /> {t("home.startNow")}
              </button>
            </div>
          ) : filteredAndSortedTrackers.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center text-gray-600 dark:text-gray-300">
              <p className="text-base font-semibold">
                {t("home.filteredEmptyTitle")}
              </p>
              <p className="text-sm mt-2">
                {t("home.filteredEmptyDescription")}
              </p>
              <button
                type="button"
                onClick={() => {
                  setVisibilityFilter("all");
                  setPlayerCountFilter("all");
                  setVersionFilter("all");
                }}
                className={`mt-4 inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${focusRingClasses}`}
              >
                {t("home.resetFilters")}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredAndSortedTrackers.map((tracker) => {
                const playerCount = Object.keys(
                  tracker.playerNames ?? {},
                ).length;
                const summary = trackerSummaries[tracker.id];
                const activePokemon =
                  (summary?.teamCount ?? 0) + (summary?.boxCount ?? 0);
                const deadPokemon = summary?.graveyardCount ?? 0;
                const runNumber = summary?.runs ?? 0;
                const doneCapsCount = summary?.doneCapsCount;
                const gameVersion = GAME_VERSIONS[tracker.gameVersionId];
                const progressLabel =
                  typeof doneCapsCount === "number"
                    ? formatBestLabel(
                        doneCapsCount,
                        gameVersion?.levelCaps ?? [],
                        gameVersion,
                      )
                    : t("home.progressFallback");
                const isGuestTracker = Boolean(
                  currentUserId &&
                    tracker.guests?.[currentUserId] &&
                    !tracker.members?.[currentUserId],
                );
                const isCompleted = summary?.championDone === true;
                const progressPct = summary?.progressPct ?? 0;
                return (
                  <div
                    key={tracker.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenTracker(tracker.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenTracker(tracker.id);
                      }
                    }}
                    className={`rounded-lg border px-4 py-5 shadow-sm transition cursor-pointer ${focusRingCardClasses} hover:transform hover:scale-[1.02] hover:shadow-md border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900`}
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                        <span className="text-xs uppercase tracking-[0.3em] text-gray-500">
                          {new Date(tracker.createdAt).toLocaleDateString(
                            dateLocale,
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-semibold">
                          {playerCount > 1 ? <FiUsers /> : <FiUser />}
                          {playerCountLabels[playerCount]}
                        </span>
                        {isGuestTracker && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-semibold">
                            <FiEye /> {t("common.roles.guest")}
                          </span>
                        )}
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-semibold"
                          aria-label={
                            tracker.isPublic
                              ? t("home.publicTracker")
                              : t("home.privateTracker")
                          }
                          title={
                            tracker.isPublic
                              ? t("home.publicTracker")
                              : t("home.privateTracker")
                          }
                        >
                          {tracker.isPublic ? (
                            <FiUnlock size={14} />
                          ) : (
                            <FiLock size={14} />
                          )}
                        </span>
                        {isCompleted && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-300/5 text-yellow-700 dark:text-yellow-400 px-2 py-1 text-xs font-semibold"
                            title={t("home.completedBadge")}
                          >
                            <FiAward size={14} />{" "}
                            <span className="hidden min-[480px]:inline">
                              {t("home.completedBadge")}
                            </span>
                          </span>
                        )}
                        <div className="ml-auto shrink-0">
                          <GameVersionBadge
                            gameVersionId={tracker.gameVersionId}
                          />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                          {tracker.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {(() => {
                            const names =
                              Array.isArray(tracker.playerNames) &&
                              tracker.playerNames.length > 0
                                ? tracker.playerNames
                                : [
                                    tracker.player1Name,
                                    tracker.player2Name,
                                  ].filter(Boolean);
                            return names.length
                              ? names.join(" • ")
                              : t("common.unknownPlayers");
                          })()}
                        </p>
                      </div>
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-3 w-full sm:grid-cols-4">
                          {/* Progress field (takes 2 columns) */}
                          <div className="col-span-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-900/40 p-3">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-500">
                                {t("home.progressLabel")}
                              </p>
                              <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-500">
                                {t("home.runCount", { count: runNumber })}
                              </p>
                            </div>
                            <div className="relative group">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {progressLabel}
                              </p>
                            </div>
                            {summary && (
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${isCompleted ? "bg-yellow-400 dark:bg-yellow-500" : "bg-green-500 dark:bg-green-400"}`}
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                                <span className="text-[0.6rem] font-semibold text-gray-500 dark:text-gray-400 tabular-nums">
                                  {progressPct}%
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Stats fields (1 column each) */}
                          <div className="flex h-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white/60 p-3 text-left dark:border-gray-700 dark:bg-gray-900/40 sm:flex-col sm:justify-center sm:text-center">
                            <p className="min-w-0 flex-1 text-left text-[0.65rem] uppercase leading-tight tracking-[0.18em] text-gray-500 sm:flex-none sm:text-center sm:tracking-[0.3em]">
                              {t("home.activePokemon")}
                            </p>
                            <p className="shrink-0 text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {activePokemon}
                            </p>
                          </div>
                          <div className="flex h-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white/60 p-3 text-left dark:border-gray-700 dark:bg-gray-900/40 sm:flex-col sm:justify-center sm:text-center">
                            <p className="min-w-0 flex-1 text-left text-[0.65rem] uppercase leading-tight tracking-[0.18em] text-gray-500 sm:flex-none sm:text-center sm:tracking-[0.3em]">
                              {t("home.fallenPokemon")}
                            </p>
                            <p className="shrink-0 text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {deadPokemon}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HomePage;
