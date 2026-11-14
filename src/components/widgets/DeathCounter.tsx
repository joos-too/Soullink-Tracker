import React from "react";
import type { Stats } from "@/types.ts";
import { PLAYER_COLORS } from "@/src/services/init.ts";
import { useTranslation } from "react-i18next";

interface DeathCounterProps {
  playerNames: string[];
  playerColors: string[];
  stats: Stats;
}

const DeathCounter: React.FC<DeathCounterProps> = ({
  playerNames,
  playerColors,
  stats,
}) => {
  const { t } = useTranslation();
  const getPlayerColor = (index: number) =>
    playerColors[index] ?? PLAYER_COLORS[index] ?? "#4b5563";
  const deathStats = playerNames.map((name, index) => {
    const deaths = stats.deaths?.[index] ?? 0;
    const historic = stats.sumDeaths?.[index] ?? 0;
    return {
      name,
      color: getPlayerColor(index),
      deaths,
      total: historic + deaths,
    };
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden flex flex-col h-full">
      <h2 className="text-center p-2 bg-gray-800 dark:bg-gray-900 text-white font-press-start text-sm">
        {t("tracker.infoPanel.deathLabel")}
      </h2>
      <div
        className="grid divide-x divide-gray-300 dark:divide-gray-700 flex-1 h-full"
        style={{
          gridTemplateColumns: `repeat(${playerNames.length}, minmax(0, 1fr))`,
        }}
      >
        {deathStats.map((entry, index) => (
          <div
            key={`death-column-${index}`}
            className="min-w-0 px-2 py-2 text-center flex flex-col items-center gap-3"
          >
            <h3
              className="w-full min-w-0 font-press-start text-xs whitespace-normal wrap-anywhere leading-tight"
              style={{ color: entry.color }}
            >
              {entry.name}
            </h3>
            <div className="text-4xl font-press-start text-gray-800 dark:text-gray-200">
              {entry.deaths}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t("tracker.infoPanel.totalLabel")} {entry.total}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeathCounter;
