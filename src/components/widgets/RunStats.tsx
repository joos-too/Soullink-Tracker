import React from "react";
import type { GameVersion, LevelCap, Stats } from "@/src/types/domain.ts";
import { formatBestLabel } from "@/src/utils/bestRun.ts";
import { useTranslation } from "react-i18next";

interface RunStatsProps {
  stats: Stats;
  levelCaps: LevelCap[];
  gameVersion?: GameVersion;
}

const RunStats: React.FC<RunStatsProps> = ({
  stats,
  levelCaps,
  gameVersion,
}) => {
  const { t } = useTranslation();
  const liveDoneArenas = levelCaps.filter((cap) => cap.done).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden">
      <h2 className="text-center p-2 bg-blue-600 text-white font-press-start text-[10px]">
        {t("tracker.infoPanel.runStats")}
      </h2>
      <table className="w-full">
        <tbody>
          <tr className="border-t border-gray-200 dark:border-gray-700">
            <td className="px-2 py-1.5 text-xs font-bold text-gray-800 dark:text-gray-300">
              {t("tracker.infoPanel.currentRun")}
            </td>
            <td className="px-2 py-1.5 text-right">
              <span className="inline-block min-w-[2ch] text-sm font-bold">
                Run {stats.runs}
              </span>
            </td>
          </tr>
          <tr className="border-t border-gray-200 dark:border-gray-700">
            <td className="px-2 py-1.5 text-xs font-bold text-gray-800 dark:text-gray-300">
              {t("tracker.infoPanel.bestRunLabel")}
            </td>
            <td className="px-2 py-1.5 text-right">
              <span className="inline-block min-w-[2ch] text-sm font-bold">
                {formatBestLabel(
                  liveDoneArenas > (stats.best ?? 0)
                    ? liveDoneArenas
                    : stats.best,
                  levelCaps,
                  gameVersion,
                )}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default RunStats;
