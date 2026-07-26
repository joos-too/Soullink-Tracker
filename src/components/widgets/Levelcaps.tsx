import React, { useEffect, useState } from "react";
import type {
  GameVersion,
  LevelCap,
  RivalCap,
  RivalCensorMode,
  UserSettings,
} from "@/types.ts";
import { BadgeImage, RivalImage } from "@/src/components/other/GameImages.tsx";
import { FiEye, FiEyeOff, FiRefreshCw } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import {
  getLocalizedArenaLabel,
  getLocalizedRivalEntry,
  getLocalizedRivalLocation,
  resolveRivalDisplayName,
} from "@/src/services/gameLocalization.ts";
import {
  canToggleLevelAtIndex,
  canToggleRivalAtIndex,
} from "@/src/utils/bestRun.ts";
import { focusRingTightClasses } from "@/src/styles/focusRing.ts";

interface LevelcapsProps {
  levelCaps: LevelCap[];
  rivalCaps: RivalCap[];
  onLevelCapToggle: (index: number) => void;
  onRivalCapToggleDone: (index: number) => void;
  onRivalCapReveal: (index: number) => void;
  rivalCensorEnabled: boolean;
  rivalCensorMode?: RivalCensorMode;
  hardcoreModeEnabled: boolean;
  gameVersion?: GameVersion;
  rivalPreferences: UserSettings["rivalPreferences"];
  activeTrackerId?: string | null;
  readOnly: boolean;
}

const readStoredCapsView = (key: string | null): boolean => {
  if (!key || typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "rivals";
  } catch {
    return false;
  }
};

const Levelcaps: React.FC<LevelcapsProps> = ({
  levelCaps,
  rivalCaps,
  onLevelCapToggle,
  onRivalCapToggleDone,
  onRivalCapReveal,
  rivalCensorEnabled,
  rivalCensorMode,
  hardcoreModeEnabled,
  gameVersion,
  rivalPreferences,
  activeTrackerId,
  readOnly,
}) => {
  const { t } = useTranslation();
  const trackerViewStorageKey = activeTrackerId
    ? `soullink:tracker:${activeTrackerId}:caps-view`
    : null;
  const [showRivalCaps, setShowRivalCaps] = useState<boolean>(() =>
    readStoredCapsView(trackerViewStorageKey),
  );
  const [isMobile, setIsMobile] = useState(false);
  const effectiveCensorMode: RivalCensorMode =
    rivalCensorMode ?? (rivalCensorEnabled ? "on" : "off");
  const isCensored = effectiveCensorMode !== "off";
  const showLevelsWhileCensored = effectiveCensorMode === "showLevels";
  const nextRivalToRevealIndex = isCensored
    ? rivalCaps.findIndex((cap) => !cap.revealed)
    : -1;
  const versionId = gameVersion?.id;

  useEffect(() => {
    setShowRivalCaps(readStoredCapsView(trackerViewStorageKey));
  }, [trackerViewStorageKey]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const handleChange = (event: MediaQueryListEvent) =>
      setIsMobile(event.matches);
    setIsMobile(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  const toggleCapsView = () => {
    setShowRivalCaps((prev) => {
      const next = !prev;
      if (trackerViewStorageKey && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(
            trackerViewStorageKey,
            next ? "rivals" : "levels",
          );
        } catch {
          // ignore storage errors
        }
      }
      return next;
    });
  };

  const formatRivalSlug = (value: string) =>
    value
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");

  const resolvePreferredRivalName = (cap: RivalCap) => {
    const baseName = resolveRivalDisplayName(t, versionId, cap.id, cap.rival);
    if (typeof cap.rival !== "object") {
      return baseName;
    }
    const preference =
      rivalPreferences?.[cap.rival.key] ??
      gameVersion?.defaultRivalPreferences?.[cap.rival.key] ??
      "male";
    const localizedEntry = getLocalizedRivalEntry(t, cap.rival);
    const localizedOptions: Record<"male" | "female", string> | undefined =
      localizedEntry &&
      typeof localizedEntry === "object" &&
      (localizedEntry as any).options
        ? (localizedEntry as { options?: Record<"male" | "female", string> })
            .options
        : undefined;
    const localizedName = localizedOptions?.[preference];
    if (localizedName && localizedName.trim().length > 0) {
      return localizedName;
    }
    const fallbackSlug = cap.rival.options?.[preference];
    return fallbackSlug ? formatRivalSlug(fallbackSlug) : baseName;
  };

  const renderLevelCaps = (level: string) => {
    const hasSlash = level.includes("/");
    const [leftRaw, rightRaw] = hasSlash
      ? level.split("/")
      : [level, undefined];
    const left = (leftRaw || "").trim();
    const right = (rightRaw || "").trim();

    if (!hardcoreModeEnabled) {
      const show = hasSlash ? left : left || right || "";
      return (
        <div className="inline-flex items-center pl-1">
          <span className="min-w-10 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-bold text-gray-800 dark:text-gray-200 text-center">
            {show}
          </span>
        </div>
      );
    }

    const leftDisplay = hasSlash ? left : left;
    const rightDisplay = hasSlash ? right : "-";
    return (
      <div className="inline-flex items-center gap-1 pl-1">
        <span className="min-w-8 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-bold text-gray-800 dark:text-gray-200 text-center">
          {leftDisplay}
        </span>
        <span className="min-w-8 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-bold text-gray-800 dark:text-gray-200 text-center">
          {rightDisplay}
        </span>
      </div>
    );
  };

  const attemptLevelToggle = (index: number) => {
    if (readOnly) return;
    if (canToggleLevelAtIndex(levelCaps, index)) {
      onLevelCapToggle(index);
    }
  };

  const attemptRivalToggle = (index: number) => {
    if (readOnly) return;
    if (canToggleRivalAtIndex(rivalCaps, index)) {
      onRivalCapToggleDone(index);
    }
  };

  const renderLevelCapList = (
    wrapperClasses: string,
    isVisible: boolean = true,
  ) => (
    <div className={wrapperClasses} tabIndex={-1}>
      {levelCaps.map((cap, index) => {
        const arenaLabel = getLocalizedArenaLabel(
          t,
          versionId,
          cap.id,
          cap.arena,
        );
        const isLevelCapActive =
          isVisible && !readOnly && canToggleLevelAtIndex(levelCaps, index);
        return (
          <div
            key={cap.id}
            className={`flex items-center justify-between pl-2 py-1.5 border rounded-md ${cap.done ? "bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800" : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"}`}
          >
            <div className="flex items-center gap-3 grow min-w-0">
              <input
                id={`levelcap-done-${cap.id}`}
                type="checkbox"
                checked={!!cap.done}
                tabIndex={isLevelCapActive ? 0 : -1}
                onChange={() => attemptLevelToggle(index)}
                onClick={(event) => {
                  if (readOnly || !canToggleLevelAtIndex(levelCaps, index)) {
                    event.preventDefault();
                  }
                }}
                aria-label={t("tracker.infoPanel.completedArena", {
                  target: arenaLabel,
                })}
                className={`h-5 w-5 accent-green-600 shrink-0 ${
                  !isLevelCapActive ? "cursor opacity-70" : "cursor-pointer"
                }`}
              />
              <span className="text-sm text-gray-800 dark:text-gray-300 wrap-break-word">
                {arenaLabel}
              </span>
            </div>
            <div className="flex items-center justify-end shrink-0 px-3">
              <BadgeImage
                arenaLabel={cap.arena}
                posIndex={index}
                badgeSet={gameVersion?.badgeSet}
              />
              <span className="font-bold text-lg text-gray-800 dark:text-gray-200 text-center">
                {renderLevelCaps(cap.level)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderRivalCapList = (
    wrapperClasses: string,
    isVisible: boolean = true,
  ) => (
    <div className={wrapperClasses} tabIndex={-1}>
      {rivalCaps.map((cap, index) => {
        const isRivalCapActive =
          isVisible && !readOnly && canToggleRivalAtIndex(rivalCaps, index);
        const isHidden = isCensored && !cap.revealed;
        const canReveal =
          isHidden && index === nextRivalToRevealIndex && !readOnly;

        if (isHidden) {
          const bgClasses = canReveal
            ? "bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
            : "bg-gray-50 dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-600";

          const content = (
            <>
              <div className="flex items-center gap-3 grow min-w-0 h-8">
                {canReveal ? (
                  <FiEye
                    size={16}
                    className="shrink-0 text-gray-600 dark:text-gray-300"
                  />
                ) : (
                  <FiEyeOff
                    size={16}
                    className="shrink-0 text-gray-400 dark:text-gray-500"
                  />
                )}
                <span
                  className={`text-sm ${canReveal ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}
                >
                  {canReveal
                    ? t("tracker.infoPanel.nextRival")
                    : t("tracker.infoPanel.futureBattle")}
                </span>
              </div>
              {showLevelsWhileCensored && (
                <div className="flex items-center justify-end shrink-0 px-3">
                  <span className="font-bold text-lg text-gray-800 dark:text-gray-200 text-center">
                    {renderLevelCaps(cap.level)}
                  </span>
                </div>
              )}
            </>
          );

          return (
            <div key={cap.id}>
              {canReveal ? (
                <button
                  onClick={() => onRivalCapReveal(index)}
                  tabIndex={isVisible ? 0 : -1}
                  className={`w-full flex items-center justify-between pl-2 py-1.5 border rounded-md ${bgClasses}`}
                >
                  {content}
                </button>
              ) : (
                <div
                  className={`flex items-center justify-between pl-2 py-1.5 border rounded-md cursor-not-allowed ${bgClasses}`}
                >
                  {content}
                </div>
              )}
            </div>
          );
        }

        return (
          <div key={cap.id}>
            <div
              className={`flex items-center justify-between pl-2 py-1.5 border rounded-md ${cap.done ? "bg-green-100 dark:bg-green-900/50 border-green-200 dark:border-green-800" : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"}`}
            >
              <div className="flex items-center gap-3 grow min-w-0">
                <input
                  id={`rivalcap-done-${cap.id}`}
                  type="checkbox"
                  checked={!!cap.done}
                  tabIndex={isRivalCapActive ? 0 : -1}
                  onChange={() => attemptRivalToggle(index)}
                  onClick={(event) => {
                    if (readOnly || !canToggleRivalAtIndex(rivalCaps, index)) {
                      event.preventDefault();
                    }
                  }}
                  aria-label={t("tracker.infoPanel.completedArena", {
                    target: resolvePreferredRivalName(cap),
                  })}
                  className={`h-5 w-5 accent-green-600 shrink-0 ${
                    isRivalCapActive ? "cursor-pointer" : "cursor opacity-70"
                  }`}
                />
                <span
                  onClick={(event) => event.stopPropagation()}
                  className="text-sm text-gray-800 dark:text-gray-300 wrap-break-word"
                >
                  {getLocalizedRivalLocation(
                    t,
                    versionId,
                    cap.id,
                    cap.location,
                  )}
                </span>
              </div>
              <div className="flex items-center justify-end shrink-0 px-3">
                <RivalImage
                  rival={cap.rival}
                  preferences={rivalPreferences}
                  defaultPreferences={gameVersion?.defaultRivalPreferences}
                  displayName={resolvePreferredRivalName(cap)}
                />
                <span className="font-bold text-lg text-gray-800 dark:text-gray-200 text-center">
                  {renderLevelCaps(cap.level)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden flex flex-col"
      style={{ perspective: "1000px" }}
    >
      <div className="relative shrink-0">
        <h2
          className="text-center p-2 text-white font-press-start text-[10px] transition-colors duration-500"
          style={{ backgroundColor: showRivalCaps ? "#693992" : "#cf5930" }}
        >
          {showRivalCaps
            ? t("tracker.infoPanel.rivalCapsLabel.rivals")
            : t("tracker.infoPanel.rivalCapsLabel.arenas")}
        </h2>
        <button
          onClick={toggleCapsView}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/70 hover:text-white hover:bg-black/20 ring-2 ring-white/25 ${focusRingTightClasses}`}
          title={t("tracker.infoPanel.rivalCapsLabel.changeView")}
        >
          <FiRefreshCw
            size={14}
            className={`transition-transform duration-500 ${showRivalCaps ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {isMobile ? (
        showRivalCaps ? (
          renderRivalCapList(
            "p-2 space-y-1 max-h-[50vh] overflow-y-auto overscroll-contain custom-scrollbar",
            true,
          )
        ) : (
          renderLevelCapList(
            "p-2 space-y-1 max-h-[50vh] overflow-y-auto overscroll-contain custom-scrollbar",
            true,
          )
        )
      ) : (
        <div
          className="relative grow min-h-0 transition-transform duration-700"
          style={{
            transformStyle: "preserve-3d",
            transform: showRivalCaps ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <div
            className={`absolute w-full h-full ${showRivalCaps ? "pointer-events-none" : "pointer-events-auto"}`}
            aria-hidden={showRivalCaps}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
            }}
          >
            {renderLevelCapList(
              "p-2 pr-1 h-full overflow-y-auto space-y-1 overscroll-contain custom-scrollbar",
              !showRivalCaps,
            )}
          </div>

          <div
            className={`absolute w-full h-full ${showRivalCaps ? "pointer-events-auto" : "pointer-events-none"}`}
            aria-hidden={!showRivalCaps}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {renderRivalCapList(
              "p-2 pr-1 h-full overflow-y-auto space-y-1 overscroll-contain custom-scrollbar",
              showRivalCaps,
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Levelcaps;
