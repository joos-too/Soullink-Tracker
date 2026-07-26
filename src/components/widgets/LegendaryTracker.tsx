import React, { useMemo } from "react";
import type { Stats } from "@/types.ts";
import { LegendaryImage } from "@/src/components/other/GameImages.tsx";
import { getLegendariesUpToGeneration } from "@/src/services/filter/legendaryFilter.ts";
import { useTranslation } from "react-i18next";

interface LegendaryTrackerProps {
  stats: Stats;
  onlegendaryIncrement: () => void;
  onlegendaryDecrement: () => void;
  readOnly: boolean;
  generationSpritePath?: string | null;
  pokemonGenerationLimit?: number;
}

const LegendaryTracker: React.FC<LegendaryTrackerProps> = ({
  stats,
  onlegendaryIncrement,
  onlegendaryDecrement,
  readOnly,
  generationSpritePath,
  pokemonGenerationLimit,
}) => {
  const { t } = useTranslation();
  const availableLegendaries = useMemo(() => {
    return getLegendariesUpToGeneration(pokemonGenerationLimit || 6);
  }, [pokemonGenerationLimit]);
  const randomLegendary = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * availableLegendaries.length);
    return availableLegendaries[randomIndex];
  }, [availableLegendaries]);

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300
                  dark:border-gray-700 overflow-hidden hover:bg-gray-100 active:bg-gray-200
                  dark:hover:bg-gray-700 dark:active:bg-gray-600 select-none flex flex-col h-full"
      onClick={() => {
        if (!readOnly) onlegendaryIncrement();
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!readOnly) onlegendaryDecrement();
      }}
      title={t("tracker.infoPanel.legendaryHint")}
      aria-disabled={readOnly}
      style={{ cursor: readOnly ? "not-allowed" : "pointer" }}
    >
      <h2
        className="text-center p-2 text-black font-press-start text-[13.5px]"
        style={{ backgroundColor: "#cfcfc3" }}
      >
        {t("tracker.infoPanel.legendaryTitle")}
      </h2>
      <div className="p-4 flex items-center justify-center grow">
        <div className="flex items-center justify-center gap-3 w-full max-w-sm">
          <div
            className="shrink-0"
            style={{ width: "4.5rem", height: "4.5rem" }}
          >
            <LegendaryImage
              pokemonName={randomLegendary}
              className="w-full h-full object-contain"
              generationSpritePath={generationSpritePath}
            />
          </div>
          <div
            className="font-press-start text-gray-800 dark:text-gray-200 leading-none text-right"
            style={{ fontSize: "2.5rem" }}
          >
            {stats.legendaryEncounters ?? 0}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegendaryTracker;
