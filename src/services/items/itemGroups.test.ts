import { describe, expect, it } from "vitest";
import type { FossilEntry, ItemEntry } from "@/types";
import {
  groupFossilEntries,
  groupItemEntries,
  isGroupUsedUp,
} from "./itemGroups.ts";

const bag = (id: string, used = false): ItemEntry => ({
  id,
  locationSlug: null,
  inBag: true,
  used,
});

const pending = (id: string, location: string): ItemEntry => ({
  id,
  location,
  locationSlug: null,
  inBag: false,
  used: false,
});

describe("groupItemEntries", () => {
  it("groups identical items in order of first occurrence", () => {
    const groups = groupItemEntries([
      bag("water-stone"),
      bag("fire-stone"),
      pending("water-stone", "Route 5"),
      bag("water-stone", true),
    ]);

    expect(groups.map((g) => g.key)).toEqual([
      "id:water-stone",
      "id:fire-stone",
    ]);
    expect(groups[0].indices).toEqual([0, 2, 3]);
    expect(groups[0].bagIndices).toEqual([0]);
    expect(groups[0].pendingIndices).toEqual([2]);
    expect(groups[0].usedIndices).toEqual([3]);
  });

  it("groups custom items by trimmed, case-insensitive name", () => {
    const groups = groupItemEntries([
      { name: "Lucky Egg", locationSlug: null, inBag: true, used: false },
      { name: " lucky egg ", locationSlug: null, inBag: true, used: false },
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].bagIndices).toEqual([0, 1]);
  });

  it("is only used up when every entry is used", () => {
    const [partial] = groupItemEntries([bag("x", true), bag("x")]);
    const [full] = groupItemEntries([bag("x", true), bag("x", true)]);

    expect(isGroupUsedUp(partial)).toBe(false);
    expect(isGroupUsedUp(full)).toBe(true);
  });
});

describe("groupFossilEntries", () => {
  const fossil = (
    fossilId: string,
    state: Partial<FossilEntry> = {},
  ): FossilEntry => ({
    fossilId,
    locationSlug: null,
    inBag: true,
    revived: false,
    ...state,
  });

  it("groups by fossil and treats revived fossils as used", () => {
    const groups = groupFossilEntries([
      fossil("helix"),
      fossil("dome", { inBag: false, location: "Mt. Moon" }),
      fossil("helix", { revived: true, pokemonId: 138 }),
      fossil("helix", { inBag: false, location: "Route 3" }),
    ]);

    expect(groups.map((g) => g.key)).toEqual(["fossil:helix", "fossil:dome"]);
    expect(groups[0].bagIndices).toEqual([0]);
    expect(groups[0].usedIndices).toEqual([2]);
    expect(groups[0].pendingIndices).toEqual([3]);
    expect(groups[1].pendingIndices).toEqual([1]);
  });
});
