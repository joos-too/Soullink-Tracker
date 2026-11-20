import type { GameVersion, LevelCap, RivalCap } from "@/src/types/domain";
import { t } from "i18next";

export const formatBestLabel = (
  bestCount: number | undefined,
  levelCaps: LevelCap[],
  gameVersion?: GameVersion,
): string => {
  const count = Number(bestCount ?? 0);
  if (count <= 0) return t("home.progressFallback");
  const caps = Array.isArray(gameVersion?.levelCaps)
    ? gameVersion!.levelCaps
    : levelCaps;
  // If inside first 8 arenas
  if (count >= 1 && count <= 8) {
    return `${count}. ${t("common.gym")}`;
  }
  // Top 4 range (assume positions 9..12)
  if (count >= 9 && count <= 12) {
    const top4Defeated = count - 8;
    return t("tracker.progress.eliteFour", { count: top4Defeated });
  }
  // Champion or beyond
  if (count > 12) {
    return t("tracker.infoPanel.challengeComplete");
  }
  return caps[caps.length - 1]?.arena ?? "Champion";
};

export const canToggleLevelAtIndex = (
  levelCaps: LevelCap[],
  index: number,
): boolean => {
  const cap = levelCaps[index];
  if (!cap) return false;
  const firstUndone = levelCaps.findIndex((c) => !c.done);
  if (cap.done) {
    const lastDoneIndex = levelCaps
      .map((c, i) => (c.done ? i : -1))
      .filter((i) => i !== -1)
      .pop();
    return lastDoneIndex === index;
  }
  return firstUndone === index;
};

export const canToggleRivalAtIndex = (
  rivalCaps: RivalCap[],
  index: number,
): boolean => {
  const rc = rivalCaps[index];
  if (!rc) return false;
  const firstUndone = rivalCaps.findIndex((r) => !r.done);
  if (rc.done) {
    const lastDoneIndex = rivalCaps
      .map((r, i) => (r.done ? i : -1))
      .filter((i) => i !== -1)
      .pop();
    return lastDoneIndex === index;
  }
  return firstUndone === index;
};
