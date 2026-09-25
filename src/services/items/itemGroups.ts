import type { FossilEntry, ItemEntry } from "@/types";

export interface EntryGroup<T> {
  key: string;
  /** First entry of the group, used for name and sprite resolution. */
  entry: T;
  /** Indices into the player's list, in original order. */
  indices: number[];
  /** Collected and not yet used / revived. */
  bagIndices: number[];
  /** Used items or revived fossils. */
  usedIndices: number[];
  /** Not yet collected; each keeps its own location. */
  pendingIndices: number[];
}

export type ItemGroup = EntryGroup<ItemEntry>;
export type FossilGroup = EntryGroup<FossilEntry>;

const getItemGroupKey = (entry: ItemEntry): string => {
  const id = entry.id?.trim();
  if (id) return `id:${id}`;
  return `name:${entry.name?.trim().toLowerCase() ?? ""}`;
};

/**
 * Groups identical entries of one player. Entries stay stored individually;
 * groups are ordered by the first occurrence of each entry.
 */
const groupEntries = <T extends { inBag: boolean }>(
  entries: T[],
  getKey: (entry: T) => string,
  isUsed: (entry: T) => boolean,
): EntryGroup<T>[] => {
  const groups = new Map<string, EntryGroup<T>>();

  entries.forEach((entry, index) => {
    const key = getKey(entry);
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
    if (isUsed(entry)) {
      group.usedIndices.push(index);
    } else if (entry.inBag) {
      group.bagIndices.push(index);
    } else {
      group.pendingIndices.push(index);
    }
  });

  return [...groups.values()];
};

export const groupItemEntries = (entries: ItemEntry[]): ItemGroup[] =>
  groupEntries(entries, getItemGroupKey, (entry) => entry.used);

/** Revived fossils count as used. */
export const groupFossilEntries = (entries: FossilEntry[]): FossilGroup[] =>
  groupEntries(
    entries,
    (entry) => `fossil:${entry.fossilId}`,
    (entry) => entry.revived,
  );

export const isGroupUsedUp = <T>(group: EntryGroup<T>): boolean =>
  group.usedIndices.length === group.indices.length;

/**
 * Without bag or used entries, the first uncollected entry is shown in the
 * group's header row, so a group of N uncollected entries is exactly N rows
 * tall. Every other uncollected entry gets its own row.
 */
export const splitPendingIndices = <T>(group: EntryGroup<T>) => {
  const headerPendingIdx =
    group.bagIndices.length === 0 && group.usedIndices.length === 0
      ? group.pendingIndices[0]
      : undefined;
  return {
    headerPendingIdx,
    extraPendingIndices: group.pendingIndices.filter(
      (idx) => idx !== headerPendingIdx,
    ),
  };
};
