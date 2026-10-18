import { ITEMS } from "@/src/data/items.ts";

/** Item versions in chronological release order, as in scripts/generate-items.mjs */
export const ITEM_VERSIONS = [
  "RBY",
  "GS",
  "C",
  "RUSA",
  "FRLG",
  "EM",
  "DP",
  "PT",
  "HGSS",
  "BW",
  "B2W2",
  "XY",
  "ORAS",
  "SM",
  "USUM",
  "LGPLGE",
  "SWSH",
  "BDSP",
  "PLA",
  "SCVI",
  "PLZA",
] as const;

/** Maps each game version ID to the latest item version available */
export const GAME_TO_ITEM_VERSION: Record<string, string> = {
  gen1_rb: "RBY",
  gen1_y: "RBY",
  gen2_gs: "GS",
  gen2_c: "C",
  gen3_rusa: "RUSA",
  gen3_frlg: "FRLG",
  gen3_em: "EM",
  gen4_dp: "DP",
  gen4_pt: "PT",
  gen4_hgss: "HGSS",
  gen5_bw: "BW",
  gen5_b2w2: "B2W2",
  gen6_xy: "XY",
  gen6_oras: "ORAS",
};

/** Release index of the item version of a game, -1 if unknown */
export function getItemVersionIndex(gameVersionId?: string): number {
  const itemVersion = gameVersionId
    ? GAME_TO_ITEM_VERSION[gameVersionId]
    : undefined;
  if (!itemVersion) return -1;
  return ITEM_VERSIONS.indexOf(itemVersion as (typeof ITEM_VERSIONS)[number]);
}

/** Return all items available in (and before) the given game version */
export function getItemsForVersion(gameVersionId: string) {
  const maxIdx = getItemVersionIndex(gameVersionId);
  if (maxIdx === -1) return ITEMS;
  const allowed = new Set(ITEM_VERSIONS.slice(0, maxIdx + 1));
  return ITEMS.filter((item) =>
    allowed.has(item.version as (typeof ITEM_VERSIONS)[number]),
  );
}
