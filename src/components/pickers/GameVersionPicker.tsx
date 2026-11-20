import React, { useMemo } from "react";
import { GAME_VERSIONS } from "@/src/data/game-versions.ts";
import { focusRingClasses } from "@/src/styles/focusRing.ts";
import { useTranslation } from "react-i18next";
import {
  getLocalizedGameName,
  getLocalizedSelectionLabel,
} from "@/src/services/gameLocalization.ts";

export type TileDef = { key: string; label: string; versionId: string };

type Group = { title: string; rows: TileDef[][] };

function buildGroupsFromGameVersions(): Group[] {
  const entries = Object.entries(GAME_VERSIONS);

  const getGenTitle = (id: string): string => {
    const m = /^gen(\d+)_/i.exec(id);
    return m ? `Gen. ${m[1]}` : "Andere";
  };

  const map = new Map<string, TileDef[][]>();

  for (const [versionId, version] of entries) {
    const title = getGenTitle(versionId);

    const sc = version.selectionColors;
    const labels = sc ? Object.keys(sc) : [versionId];

    const row: TileDef[] = labels.map((label) => ({
      key: `${versionId}_${label}`,
      label,
      versionId,
    }));

    if (!map.has(title)) map.set(title, []);
    map.get(title)!.push(row);
  }

  return Array.from(map.entries()).map(([title, rows]) => ({ title, rows }));
}

export interface GameVersionPickerProps {
  value: string;
  onSelect: (versionId: string) => void;
  isInteractive?: boolean;
}

const GameVersionPicker: React.FC<GameVersionPickerProps> = ({
  value,
  onSelect,
  isInteractive = true,
}) => {
  const { t } = useTranslation();
  const groups = useMemo(() => buildGroupsFromGameVersions(), []);

  return (
    <div>
      <div className="space-y-3 max-h-64 overflow-y-auto overscroll-contain custom-scrollbar pl-0.5 pr-2 sm:pr-1 pb-3">
        {groups.map((group) => (
          <div key={group.title}>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {group.title}
              </div>
              <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            </div>
            <div className="space-y-2 px-1">
              {group.rows.map((row, rowIdx) => {
                const rowVersionId = row[0]?.versionId;
                const rowSelected = rowVersionId === value;
                const versionName = rowVersionId
                  ? getLocalizedGameName(t, rowVersionId, rowVersionId)
                  : "";
                return (
                  <button
                    key={rowIdx}
                    type="button"
                    onClick={() => {
                      if (rowVersionId) {
                        onSelect(rowVersionId);
                      }
                    }}
                    tabIndex={isInteractive ? 0 : -1}
                    disabled={!isInteractive}
                    aria-hidden={!isInteractive}
                    className={`
                                          group w-full rounded-md
                                          ring-2 ${rowSelected ? "ring-green-500" : "ring-transparent hover:ring-gray-300 hover:shadow-sm"}
                                          disabled:opacity-100 disabled:ring-transparent
                                          transition-shadow transition-colors
                                          ${focusRingClasses}
                                        `}
                    aria-pressed={rowSelected}
                    title={versionName}
                    aria-label={versionName}
                  >
                    <span className="flex gap-1 w-full items-stretch rounded-md overflow-hidden">
                      {row.map((tile, tileIdx) => {
                        const version = GAME_VERSIONS[tile.versionId];
                        const sc = version?.selectionColors?.[tile.label];
                        const bgColor = sc?.bgColor || "#ffffff";
                        const textColor = sc?.textColor || "#111827";
                        const borderColor = sc?.borderColor || "#d1d5db";
                        const localizedLabel = getLocalizedSelectionLabel(
                          t,
                          rowVersionId,
                          tile.label,
                        );

                        const isOnlyOne = row.length === 1;
                        const isFirst = tileIdx === 0;
                        const isLast = tileIdx === row.length - 1;

                        const roundingClass = isOnlyOne
                          ? "rounded-md"
                          : isFirst
                            ? "rounded-l-md"
                            : isLast
                              ? "rounded-r-md"
                              : "";

                        const marginClass = !isFirst ? "-ml-px" : "";

                        return (
                          <div
                            key={tile.key}
                            className={`relative inline-flex items-center justify-center px-2 py-1.5 text-xs font-bold shadow-sm border flex-1 w-full ${roundingClass} ${marginClass} ${rowSelected ? "z-10" : ""}`}
                            style={{
                              backgroundColor: bgColor,
                              color: textColor,
                              borderColor: borderColor,
                            }}
                          >
                            {localizedLabel}
                          </div>
                        );
                      })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameVersionPicker;
