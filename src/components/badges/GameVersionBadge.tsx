import React from "react";
import { useTranslation } from "react-i18next";
import { GAME_VERSIONS } from "@/src/data/game-versions.ts";
import {
  getLocalizedGameName,
  getLocalizedBadgeLabel,
} from "@/src/services/gameLocalization.ts";
import { GameVersionBadgeSegment } from "@/src/types/domain.ts";

interface GameVersionBadgeProps {
  gameVersionId: string;
}

const GameVersionBadge: React.FC<GameVersionBadgeProps> = ({
  gameVersionId,
}) => {
  const { t } = useTranslation();
  const version = GAME_VERSIONS[gameVersionId];
  if (!version?.badge) {
    return null;
  }
  const { segments } = version.badge;
  const localizedSegments: GameVersionBadgeSegment[] = segments.map(
    (segment) => {
      return {
        ...segment,
        badgeSegmentName: getLocalizedBadgeLabel(
          t,
          version?.id,
          segment.badgeSegmentName,
        ),
      };
    },
  );
  const localizedName = getLocalizedGameName(t, version?.id, gameVersionId);

  return (
    <div
      className="inline-flex items-center rounded-lg overflow-hidden text-md font-bold shadow-sm border border-transparent"
      style={{
        // Add a subtle border around the whole badge to handle pixel rounding issues
        borderWidth: "1.5px",
        borderColor: "rgba(0, 0, 0, 0.1)",
      }}
      title={localizedName}
    >
      {localizedSegments.map((segment, index) => (
        <span
          key={index}
          className={`flex items-center justify-center px-1`}
          style={{
            backgroundColor: segment.bgColor,
            color: segment.textColor,
            // Add a border to each segment, but hide it on the side where it meets the next one
            borderRight:
              index < segments.length - 1
                ? `1.5px solid ${segment.borderColor}`
                : "none",
          }}
        >
          {segment.badgeSegmentName}
        </span>
      ))}
    </div>
  );
};

export default GameVersionBadge;
