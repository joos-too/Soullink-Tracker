import { describe, expect, it } from "vitest";
import {
  findItemByName,
  getItemName,
  getItemSearchNames,
  searchItems,
} from "./itemSearch.ts";

describe("getItemName", () => {
  it("uses the name of the tracker's game for renamed items", () => {
    expect(getItemName("sharp-beak", "de", "gen4_hgss")).toBe("Hackattack");
    expect(getItemName("stick", "en", "gen2_gs")).toBe("Stick");
    expect(getItemName("thunder-stone", "en", "gen5_bw")).toBe("Thunderstone");
    expect(getItemName("thunder-stone", "en", "gen6_xy")).toBe("Thunder Stone");
  });

  it("uses the current name without a known game", () => {
    expect(getItemName("sharp-beak", "de")).toBe("Spitzer Schnabel");
    expect(getItemName("stick", "en", "unknown")).toBe("Leek");
  });

  it("uses the earliest name for games before the item was listed", () => {
    expect(getItemName("sharp-beak", "de", "gen1_rb")).toBe("Hackattack");
  });

  it("falls back to the slug for unknown items", () => {
    expect(getItemName("not-an-item", "de", "gen4_hgss")).toBe("not-an-item");
  });
});

describe("searchItems", () => {
  it("finds items by names of other game versions", () => {
    const results = searchItems("Drachenschuppe", {
      locale: "de",
      gameVersionId: "gen6_oras",
    });
    expect(results).toEqual([
      expect.objectContaining({ slug: "dragon-scale", name: "Drachenhaut" }),
    ]);
  });

  it("returns names of the tracker's game", () => {
    const results = searchItems("Spitzer Schnabel", {
      locale: "de",
      gameVersionId: "gen4_hgss",
    });
    expect(results.map((r) => [r.slug, r.name])).toEqual([
      ["sharp-beak", "Hackattack"],
    ]);
  });

  it("finds aliases of the other locale with multi-locale search", () => {
    expect(
      searchItems("BrightPowder", { locale: "de", gameVersionId: "gen4_dp" }),
    ).toEqual([]);
    const results = searchItems("BrightPowder", {
      locale: "de",
      gameVersionId: "gen4_dp",
      multiLocaleSearch: true,
    });
    expect(results.map((r) => [r.slug, r.name])).toEqual([
      ["bright-powder", "Blendpuder"],
    ]);
  });

  it("still filters by game availability unless all versions are allowed", () => {
    expect(
      searchItems("Fähigkeiten-Kapsel", {
        locale: "de",
        gameVersionId: "gen5_bw",
      }),
    ).toEqual([]);
    const results = searchItems("Fähigkeiten-Kapsel", {
      locale: "de",
      gameVersionId: "gen5_bw",
      allVersions: true,
    });
    expect(results.map((r) => [r.slug, r.name])).toEqual([
      ["ability-capsule", "Fähigk.-Kapsel"],
    ]);
  });
});

describe("findItemByName", () => {
  it("resolves aliases to the item", () => {
    expect(
      findItemByName("abyssschuppe", {
        locale: "de",
        gameVersionId: "gen3_em",
      }),
    ).toMatchObject({ slug: "deep-sea-scale", name: "Abyssplatte" });
  });
});

describe("getItemSearchNames", () => {
  it("lists the current name and all aliases", () => {
    expect(getItemSearchNames("up-grade", "de")).toEqual(
      expect.arrayContaining(["Up-Grade", "Upgrade"]),
    );
  });
});
