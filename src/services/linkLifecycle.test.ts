import { describe, expect, it } from "vitest";
import type { AppState, PokemonLink } from "@/types.ts";
import { createInitialState } from "@/src/services/init.ts";
import { killLink, restoreLink } from "./linkLifecycle.ts";

const pair: PokemonLink = {
  id: "70000000-0000-4000-8000-000000000007",
  locationSlug: "kanto-route-1",
  fossilSlugs: ["helix-fossil"],
  members: [
    { id: 25, nickname: "Sparky" },
    { id: 1, nickname: "Leaf" },
  ],
};

const initialState = (): AppState => ({
  ...createInitialState("gen1_rb", ["Red", "Blue"]),
  team: [pair],
  stats: {
    runs: 2,
    best: 0,
    top4Items: [1, 2],
    deaths: [3, 4],
    sumDeaths: [5, 6],
  },
});

describe("link lifecycle", () => {
  it.each(["team", "box"] as const)(
    "reverts a death from the %s without changing other statistics or link data",
    (collection) => {
      const state = { ...initialState(), team: [], [collection]: [pair] };
      const dead = killLink(state, pair.id, 1);
      expect(dead.team).toEqual([]);
      expect(dead.box).toEqual([]);
      expect(dead.graveyard).toEqual([
        { ...pair, isLost: false, deathPlayerIndex: 1 },
      ]);
      expect(dead.stats.deaths).toEqual([3, 5]);

      const restored = restoreLink(dead, pair.id);
      expect(restored.graveyard).toEqual([]);
      expect(restored.box).toEqual([pair]);
      expect(restored.stats).toEqual(state.stats);
      expect(state[collection]).toEqual([pair]);
    },
  );

  it("ignores repeated or stale kill/restore actions", () => {
    const dead = killLink(initialState(), pair.id, 0);
    expect(killLink(dead, pair.id, 0)).toBe(dead);
    const restored = restoreLink(dead, pair.id);
    expect(restoreLink(restored, pair.id)).toBe(restored);
    expect(restoreLink(restored, "missing")).toBe(restored);
  });

  it("uses the current link data when a pending death is confirmed", () => {
    const state = initialState();
    state.team = [{ ...pair, location: "Updated area" }];
    expect(killLink(state, pair.id, 0).graveyard[0].location).toBe(
      "Updated area",
    );
  });

  it("requires a player selection for legacy deaths and does not make counters negative", () => {
    const state = {
      ...initialState(),
      team: [],
      graveyard: [{ ...pair, isLost: false }],
    };
    state.stats.deaths = [0, 4];
    expect(restoreLink(state, pair.id)).toBe(state);
    expect(restoreLink(state, pair.id, 0).stats.deaths).toEqual([0, 4]);
    expect(restoreLink(state, pair.id, 1).stats.deaths).toEqual([0, 3]);
  });

  it("does not restore lost encounters or accept invalid player indices", () => {
    const state = { ...initialState(), graveyard: [{ ...pair, isLost: true }] };
    expect(restoreLink(state, pair.id, 0)).toBe(state);
    expect(killLink(state, pair.id, -1)).toBe(state);
    expect(killLink(state, pair.id, 2)).toBe(state);
    state.graveyard = [{ ...pair, isLost: false, deathPlayerIndex: 2 }];
    expect(restoreLink(state, pair.id)).toBe(state);
  });

  it("records a fresh attribution if a restored link dies again", () => {
    const restored = restoreLink(killLink(initialState(), pair.id, 0), pair.id);
    const dead = killLink(restored, pair.id, 1);
    expect(dead.graveyard[0].deathPlayerIndex).toBe(1);
    expect(dead.stats.deaths).toEqual([3, 5]);
    expect(restoreLink(dead, pair.id, 0).stats.deaths).toEqual([3, 4]);
  });
});
