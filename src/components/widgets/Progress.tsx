import React from "react";
import type { GameVersion, LevelCap, RivalCap } from "@/types.ts";
import { BadgeImage } from "@/src/components/other/GameImages.tsx";
import { getLocalizedArenaLabel } from "@/src/services/gameLocalization.ts";
import { computeWeightedProgress } from "@/src/utils/progressWeights.ts";
import { useTranslation } from "react-i18next";

interface ProgressProps {
  levelCaps: LevelCap[];
  rivalCaps: RivalCap[];
  runStartedAt?: number;
  gameVersion?: GameVersion;
  hardcoreModeEnabled: boolean;
}

const Progress: React.FC<ProgressProps> = ({
  levelCaps,
  rivalCaps,
  runStartedAt,
  gameVersion,
  hardcoreModeEnabled,
}) => {
  const { t } = useTranslation();
  const versionId = gameVersion?.id;
  const challengeComplete =
    levelCaps.length > 0 && levelCaps.every((cap) => cap.done);
  const weightedProgress = computeWeightedProgress(levelCaps, rivalCaps);
  const totalMilestones = weightedProgress.rawTotal;
  const completedMilestones = weightedProgress.rawCompleted;
  const progressPct = weightedProgress.pct;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
      <h2 className="text-center p-2 bg-blue-600 text-white font-press-start text-[10px]">
        {t("tracker.infoPanel.currentLevelCap")}
      </h2>
      <div className="p-1 text-l text-gray-800 dark:text-gray-200 text-center space-y-1">
        <div className="min-h-20 flex flex-col items-center justify-center">
          {(() => {
            const next = levelCaps.find((cap) => !cap.done);
            if (!next) {
              return (
                <span className="text-xl font-bold">
                  {t("tracker.infoPanel.challengeComplete")}
                </span>
              );
            }

            const arenaLabel = getLocalizedArenaLabel(
              t,
              versionId,
              next.id,
              next.arena,
            );

            return (
              <div className="flex items-center justify-center px-3 gap-x-4">
                <BadgeImage
                  arenaLabel={next.arena}
                  posIndex={Math.max(
                    levelCaps.findIndex((cap) => cap.id === next.id),
                    0,
                  )}
                  badgeSet={gameVersion?.badgeSet}
                  className="w-14 h-14 sm:w-16 sm:h-16 object-contain"
                />
                <div className="flex flex-col items-center">
                  <div className="flex flex-wrap justify-center items-baseline gap-x-1">
                    <span>{t("tracker.infoPanel.activeLabel")}</span>
                    <strong>{arenaLabel}</strong>
                  </div>
                  <div>
                    {t("tracker.infoPanel.levelCapLabel")}{" "}
                    <strong>
                      {hardcoreModeEnabled
                        ? next.level
                        : next.level.split("/")[0].trim()}
                    </strong>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
        {typeof runStartedAt === "number" && runStartedAt > 0 && (
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-">
            {t("tracker.infoPanel.runStartedLabel")}{" "}
            {new Date(runStartedAt).toLocaleString("de-DE", {
              dateStyle: "short",
              timeStyle: "short",
            })}{" "}
            Uhr
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-2">
          <span>{t("tracker.infoPanel.progressLabel")}</span>
          {!challengeComplete && (
            <span className="font-semibold">
              {completedMilestones}/{totalMilestones}
              {" \u00b7 "}
              {progressPct}%
            </span>
          )}
        </div>
        <div
          className="relative h-4 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden"
          aria-label={t("tracker.infoPanel.progressLabel")}
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full transition-all duration-700 ease-out bg-linear-to-r from-green-400 via-emerald-500 to-teal-500 shadow-[inset_0_0_6px_rgba(0,0,0,0.25)]"
            style={{ width: `${progressPct}%` }}
          />
          <div className="absolute inset-0 mask-[radial-gradient(transparent,black)] opacity-20 pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
};

export default Progress;
