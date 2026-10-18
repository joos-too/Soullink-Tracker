import { describe, expect, it } from "vitest";
import { createInitialState } from "@/src/services/init";
import { GAME_VERSIONS } from "@/src/data/game-versions";
import type { Database } from "@/src/types/database";
import {
  toPersistedTrackerState,
  toTrackerStateSnapshot,
} from "./supabaseTrackerMapper";

const tracker = {
  player_names: ["Red", "Blue"],
  ruleset_id: null,
  game_version_id: "gen1_rb",
};
const initial = createInitialState(
  tracker.game_version_id,
  tracker.player_names,
);
const row: Database["public"]["Tables"]["tracker_states"]["Row"] = {
  tracker_id: "30000000-0000-4000-8000-000000000001",
  state: toPersistedTrackerState(initial),
  schema_version: 3,
  revision: 7,
  summary: {},
  updated_at: "2026-01-01T00:00:00Z",
  updated_by: null,
};

describe("canonical tracker mapping", () => {
  it("composes relational metadata without defaulting or repairing persisted fields", () => {
    const state = {
      ...initial,
      rules: [],
      runStartedAt: 42,
      rivalCensorMode: "off" as const,
      extension: { retained: true },
    };
    const mapped = toTrackerStateSnapshot(
      { ...row, state: toPersistedTrackerState(state) },
      tracker,
    );
    expect(mapped.state).toEqual({ ...state, rulesetId: undefined });
    expect(mapped.state.rules).toEqual([]);
    expect(mapped.state.runStartedAt).toBe(42);
    expect(mapped.revision).toBe(7);
    expect(toPersistedTrackerState(mapped.state)).not.toHaveProperty(
      "playerNames",
    );
    expect(toPersistedTrackerState(mapped.state)).not.toHaveProperty(
      "rulesetId",
    );
  });

  it("reconciles current templates by ID while retaining saved progress", () => {
    const game = GAME_VERSIONS.gen1_rb;
    const state = {
      ...initial,
      levelCaps: [{ ...game.levelCaps[0], arena: "Outdated", done: true }],
      rivalCaps: [
        {
          ...game.rivalCaps[0],
          location: "Outdated",
          done: true,
          revealed: true,
        },
      ],
    };
    const mapped = toTrackerStateSnapshot(
      { ...row, state: toPersistedTrackerState(state) },
      tracker,
    ).state;
    expect(mapped.levelCaps[0]).toEqual({ ...game.levelCaps[0], done: true });
    expect(mapped.levelCaps[1]).toEqual({ ...game.levelCaps[1], done: false });
    expect(mapped.rivalCaps[0]).toEqual({
      ...game.rivalCaps[0],
      done: true,
      revealed: true,
    });
    expect(mapped.rivalCaps[1]).toEqual({
      ...game.rivalCaps[1],
      done: false,
      revealed: false,
    });
  });

  it.each([1, 2, 4])("rejects unsupported schema %i", (schema_version) => {
    expect(() =>
      toTrackerStateSnapshot({ ...row, schema_version }, tracker),
    ).toThrow("Unsupported tracker state schema");
  });

  it("does not infer graveyard loss from nicknames", () => {
    const state = {
      ...initial,
      graveyard: [
        {
          id: "30000000-0000-4000-8000-000000000002",
          locationSlug: null,
          members: [{ id: 25, nickname: "" }],
          isLost: false,
        },
      ],
    };
    expect(
      toTrackerStateSnapshot(
        { ...row, state: toPersistedTrackerState(state) },
        tracker,
      ).state.graveyard,
    ).toEqual(state.graveyard);
  });
});
