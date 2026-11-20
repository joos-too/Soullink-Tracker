import React from "react";
import type { Stats } from "@/src/types/domain.ts";
import { PLAYER_COLORS } from "@/src/services/init.ts";
import Tooltip from "@/src/components/ui/Tooltip.tsx";
import { FiInfo, FiMinus, FiPlus } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import {
  focusRingInputClasses,
  focusRingTightClasses,
} from "@/src/styles/focusRing.ts";

interface ItemsProps {
  playerNames: string[];
  playerColors: string[];
  stats: Stats;
  onPlayerStatChange: (
    group: keyof Stats,
    playerIndex: number,
    value: string,
  ) => void;
  readOnly: boolean;
}

const ItemStats: React.FC<ItemsProps> = ({
  playerNames,
  playerColors,
  stats,
  onPlayerStatChange,
  readOnly,
}) => {
  const { t } = useTranslation();
  const getPlayerColor = (index: number) =>
    playerColors[index] ?? PLAYER_COLORS[index] ?? "#4b5563";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300 dark:border-gray-700">
      <div className="relative">
        <h2 className="rounded-t-lg text-center p-2 bg-blue-600 text-white font-press-start text-[10px]">
          {t("tracker.infoPanel.itemsHeading")}
        </h2>
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Tooltip
            side="left"
            content={t("tracker.infoPanel.itemsWidgetTooltip")}
          >
            <span
              tabIndex={0}
              className="inline-flex cursor-help rounded-sm text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
              aria-label={t("tracker.infoPanel.itemsWidgetTooltipLabel")}
            >
              <FiInfo size={14} />
            </span>
          </Tooltip>
        </div>
      </div>
      <table className="w-full">
        <tbody>
          {playerNames.map((name, index) => {
            const value = stats.top4Items?.[index] ?? 0;
            return (
              <tr
                key={`top4-${index}`}
                className="border-t border-gray-200 dark:border-gray-700"
              >
                <td
                  className="px-2 py-1.5 text-xs font-bold"
                  style={{ color: getPlayerColor(index) }}
                >
                  {name}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <div className="inline-flex items-center gap-1">
                    {readOnly ? (
                      <span className="w-16 text-right inline-block text-sm text-gray-800 dark:text-gray-200">
                        {value}
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onPlayerStatChange(
                              "top4Items",
                              index,
                              String(Math.max(0, value - 1)),
                            );
                          }}
                          className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 ${focusRingTightClasses}`}
                          aria-label={t("tracker.infoPanel.itemsDecrease")}
                          title={t("tracker.infoPanel.itemsDecrease")}
                        >
                          <FiMinus size={16} />
                        </button>
                        <input
                          type="number"
                          value={value}
                          onChange={(event) => {
                            onPlayerStatChange(
                              "top4Items",
                              index,
                              event.target.value,
                            );
                          }}
                          className={`w-16 text-right bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm ${focusRingInputClasses}`}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            onPlayerStatChange(
                              "top4Items",
                              index,
                              String(value + 1),
                            );
                          }}
                          className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 ${focusRingTightClasses}`}
                          aria-label={t("tracker.infoPanel.itemsIncrease")}
                          title={t("tracker.infoPanel.itemsIncrease")}
                        >
                          <FiPlus size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ItemStats;
