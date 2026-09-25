import type { ItemEntry } from "@/types";

export interface ItemGroup {
  key: string;
  /** First entry of the group, used for name and sprite resolution. */
  entry: ItemEntry;
  /** Indices into the player's item list, in original order. */
  indices: number[];
  /** Collected and not yet used. */
  bagIndices: number[];
  usedIndices: number[];
  /** Not yet collected; each keeps its own location. */
  pendingIndices: number[];
}

export const getItemGroupKey = (entry: ItemEntry): string => {
  const id = entry.id?.trim();
  if (id) return `id:${id}`;
  return `name:${entry.name?.trim().toLowerCase() ?? ""}`;
};

/**
 * Groups identical items of one player. Entries stay stored individually;
 * groups are ordered by the first occurrence of each item.
 */
export const groupItemEntries = (entries: ItemEntry[]): ItemGroup[] => {
  const groups = new Map<string, ItemGroup>();

  entries.forEach((entry, index) => {
    const key = getItemGroupKey(entry);
    let group = groups.get(key);
    if (!group) {
      group = {
        key,
        entry,
        indices: [],
        bagIndices: [],
        usedIndices: [],
        pendingIndices: [],
      };
      groups.set(key, group);
    }

    group.indices.push(index);
    if (entry.used) {
      group.usedIndices.push(index);
    } else if (entry.inBag) {
      group.bagIndices.push(index);
    } else {
      group.pendingIndices.push(index);
    }
  });

  return [...groups.values()];
};

export const isItemGroupUsedUp = (group: ItemGroup): boolean =>
  group.usedIndices.length === group.indices.length;
