import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createInitialState,
  ensureStatsForPlayers,
  resetTrackerState,
} from "./init";
import { toPersistedTrackerState } from "./backend/supabaseTrackerMapper";

afterEach(() => vi.restoreAllMocks());

describe("new canonical tracker state", () => {
  it("resets a run without legacy defaults or losing saved settings and cumulative stats", () => {
    const previous = createInitialState("gen1_rb", ["Red", "Blue"]);
    previous.rules = [];
    previous.rivalCensorMode = "showLevels";
    previous.megaStoneSpriteStyle = "pokemon";
    previous.runStartedAt = 100;
    previous.stats.deaths = [2, 3];
    previous.stats.sumDeaths = [4, 5];
    previous.stats.legendaryEncounters = 6;
    previous.levelCaps[0].done = true;
    previous.rivalCaps[0].revealed = true;
    previous.graveyard = [
      {
        id: "30000000-0000-4000-8000-000000000003",
        locationSlug: null,
        members: [],
        isLost: false,
      },
    ];
    vi.spyOn(Date, "now").mockReturnValue(200);
    const next = resetTrackerState(previous, "gen1_rb");
    expect(next.rules).toEqual([]);
    expect(next.rivalCensorMode).toBe("showLevels");
    expect(next.megaStoneSpriteStyle).toBe("pokemon");
    expect(next.stats).toEqual({
      runs: 2,
      best: 1,
      deaths: [0, 0],
      sumDeaths: [6, 8],
      top4Items: [0, 0],
      legendaryEncounters: 6,
    });
    expect(next.runStartedAt).toBe(200);
    expect(next.graveyard).toEqual([]);
    expect(next.rivalCaps[0].revealed).toBe(true);
    expect(next.levelCaps[0].done).toBe(false);
    expect(previous.graveyard).toHaveLength(1);
    expect(previous.stats.deaths).toEqual([2, 3]);
  });
  it.each([1, 2, 3])(
    "creates independent player arrays for %i players",
    (count) => {
      vi.spyOn(Date, "now").mockReturnValue(12345);
      const names = Array.from(
        { length: count },
        (_, index) => `Player ${index}`,
      );
      const state = createInitialState("gen1_rb", names);
      expect(state.fossils).toEqual(names.map(() => []));
      expect(state.items).toEqual(names.map(() => []));
      expect(state.stats).toEqual({
        runs: 1,
        best: 0,
        deaths: names.map(() => 0),
        sumDeaths: names.map(() => 0),
        top4Items: names.map(() => 0),
        legendaryEncounters: 0,
      });
      expect(state.runStartedAt).toBe(12345);
      expect(state.rivalCensorMode).toBe("on");
      expect(state.hardcoreModeEnabled).toBe(false);
      expect(state.megaStoneSpriteStyle).toBe("item");
      const persisted = toPersistedTrackerState(state);
      expect(persisted).not.toHaveProperty("rivalCensorEnabled");
      expect(persisted).not.toHaveProperty("playerNames");
      expect(persisted).not.toHaveProperty("rulesetId");
      expect(state.levelCaps.every((cap) => cap.done === false)).toBe(true);
      expect(
        state.rivalCaps.every(
          (cap) => cap.done === false && cap.revealed === false,
        ),
      ).toBe(true);
      expect(state.items[0]).not.toBe(state.fossils[0]);
      if (count > 1) expect(state.fossils[0]).not.toBe(state.fossils[1]);
    },
  );

  it("resizes stats only when explicitly requested, retaining existing values", () => {
    const stats = {
      runs: 5,
      best: 4,
      deaths: [3],
      sumDeaths: [10],
      top4Items: [2],
      legendaryEncounters: 8,
    };
    expect(ensureStatsForPlayers(stats, 3)).toEqual({
      ...stats,
      deaths: [3, 0, 0],
      sumDeaths: [10, 0, 0],
      top4Items: [2, 0, 0],
    });
    expect(stats.deaths).toEqual([3]);
  });
});
