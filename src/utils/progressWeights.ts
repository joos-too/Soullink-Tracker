import type { LevelCap, RivalCap } from "@/src/types/domain";

/**
 * Milestone category weights for progress bar calculation.
 *
 * The idea: gym badges represent the long main journey and should occupy
 * more visual progress. The Elite 4 + Champion fights are at the very end
 * but with equal weighting, each milestone feels the same, making the bar
 * appear "only half way" when you already reach the elite 4.
 *
 * With these weights the gym portion stretches to fill a larger share of
 * the bar while the Elite 4 + Champ and rival fights take up less space.
 * The bar still reaches exactly 100% when everything is completed,
 * regardless of how many rivals or level caps the chosen game version has.
 */

const WEIGHT_GYM = 1.5;
const WEIGHT_ELITE4_CHAMP = 0.6;
const WEIGHT_RIVAL = 0.75;

export type MilestoneCategory = "gym" | "elite4_champ" | "rival";

export function classifyLevelCap(cap: LevelCap): MilestoneCategory {
  if (cap.id >= 9) {
    return "elite4_champ";
  }
  return "gym";
}

function weightForCategory(cat: MilestoneCategory): number {
  switch (cat) {
    case "gym":
      return WEIGHT_GYM;
    case "elite4_champ":
      return WEIGHT_ELITE4_CHAMP;
    case "rival":
      return WEIGHT_RIVAL;
  }
}

export interface WeightedProgress {
  completed: number /** Completed weighted sum */;
  total: number /** Total weighted sum */;
  pct: number /** 0-100 percentage, rounded */;
  rawCompleted: number /** Raw (unweighted) completed count – useful for display */;
  rawTotal: number /** Raw (unweighted) total count */;
}

/**
 * Compute weighted progress across all milestone types.
 *
 * Each category (gym, elite4/champ, rival) has its own weight so the
 * progress bar feels proportional to actual gameplay effort.
 * Returns a percentage between 0 and 100. When every milestone is done
 * the result is always exactly 100 (no rounding gap), regardless of the
 * number of milestones in the chosen game version.
 */
export function computeWeightedProgress(
  levelCaps: LevelCap[],
  rivalCaps: RivalCap[],
): WeightedProgress {
  let completedWeight = 0;
  let totalWeight = 0;
  let rawCompleted = 0;
  const rawTotal = levelCaps.length + rivalCaps.length;

  for (const cap of levelCaps) {
    const w = weightForCategory(classifyLevelCap(cap));
    totalWeight += w;
    if (cap.done) {
      completedWeight += w;
      rawCompleted += 1;
    }
  }

  for (const rc of rivalCaps) {
    const w = weightForCategory("rival");
    totalWeight += w;
    if (rc.done) {
      completedWeight += w;
      rawCompleted += 1;
    }
  }

  const allDone = levelCaps.length > 0 && levelCaps.every((c) => c.done);
  const pct = allDone
    ? 100
    : totalWeight > 0
      ? Math.round((completedWeight / totalWeight) * 100)
      : 0;

  return {
    completed: completedWeight,
    total: totalWeight,
    pct,
    rawCompleted,
    rawTotal,
  };
}
