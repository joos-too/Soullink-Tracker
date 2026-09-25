import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import type { ItemEntry } from "@/types";
import { groupItemEntries } from "./itemGroups.ts";
import { summarizeEntryGroup } from "./itemDisplay.ts";

const t = ((key: string, options?: { amount?: number }) =>
  options?.amount !== undefined
    ? `${key}:${options.amount}`
    : key) as TFunction;

const entry = (inBag: boolean, used = false, location = ""): ItemEntry => ({
  id: "fire-stone",
  location,
  locationSlug: null,
  inBag,
  used,
});

const summarize = (entries: ItemEntry[]) =>
  summarizeEntryGroup(
    groupItemEntries(entries)[0],
    entries,
    (item) => (item.used ? "used" : item.inBag ? "bag" : item.location!),
    "used-count",
    t,
  );

describe("summarizeEntryGroup", () => {
  it("shows the status of a single entry", () => {
    expect(summarize([entry(true)])).toMatchObject({
      status: "bag",
      isGrouped: false,
      bagCount: 1,
      usedUp: false,
      extraPending: [],
    });
  });

  it("summarizes bag and used counts of a group", () => {
    const summary = summarize([entry(true), entry(true), entry(true, true)]);
    expect(summary.status).toBe(
      "tracker.infoPanel.itemCountBag:2 · used-count:1",
    );
    expect(summary.isGrouped).toBe(true);
    expect(summary.headerPendingIdx).toBeUndefined();
  });

  it("puts the first uncollected entry in the header without bag or used entries", () => {
    const summary = summarize([
      entry(false, false, "Route 1"),
      entry(false, false, "Route 2"),
    ]);
    expect(summary.status).toBe("Route 1");
    expect(summary.headerPendingIdx).toBe(0);
    expect(summary.extraPending).toEqual([{ index: 1, status: "Route 2" }]);
  });

  it("lists every uncollected entry as its own row next to bag entries", () => {
    const summary = summarize([entry(true), entry(false, false, "Route 3")]);
    expect(summary.status).toBe("tracker.infoPanel.itemCountBag:1");
    expect(summary.extraPending).toEqual([{ index: 1, status: "Route 3" }]);
  });

  it("marks a fully used group as used up", () => {
    expect(summarize([entry(true, true), entry(true, true)]).usedUp).toBe(true);
  });
});
