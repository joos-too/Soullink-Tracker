import type { AppState, Stats } from "@/types.ts";
import { GAME_VERSIONS } from "@/src/data/game-versions.ts";
import { DEFAULT_RULES, DEFAULT_RULESET_ID } from "@/src/data/rulesets.ts";

export const PLAYER1_COLOR = "#cf5930";
export const PLAYER2_COLOR = "#693992";
export const PLAYER3_COLOR = "#2c7b90";
export const PLAYER_COLORS = [PLAYER1_COLOR, PLAYER2_COLOR, PLAYER3_COLOR];

export const MIN_PLAYER_COUNT = 1;
export const MAX_PLAYER_COUNT = 3;

export const sanitizePlayerNames = (names?: string[]): string[] => {
  if (!Array.isArray(names)) {
    return [];
  }
  return names
    .slice(0, MAX_PLAYER_COUNT)
    .map((name) => (typeof name === "string" ? name : ""));
};

export const ensureStatsForPlayers = (
  stats: Stats | undefined,
  playerCount: number,
): Stats => {
  const base = stats ?? {
    runs: 1,
    best: 0,
    top4Items: [],
    deaths: [],
    sumDeaths: [],
    legendaryEncounters: 0,
  };
  const normalizeArray = (values?: number[]) => {
    const arr = Array.isArray(values) ? values.slice(0, playerCount) : [];
    while (arr.length < playerCount) {
      arr.push(0);
    }
    return arr;
  };
  return {
    runs: typeof base.runs === "number" ? base.runs : 1,
    best: typeof base.best === "number" ? base.best : 0,
    top4Items: normalizeArray(base.top4Items),
    deaths: normalizeArray(base.deaths),
    sumDeaths: normalizeArray(base.sumDeaths),
    legendaryEncounters:
      typeof base.legendaryEncounters === "number"
        ? base.legendaryEncounters
        : 0,
  };
};

export const sanitizeRules = (rules?: unknown): string[] => {
  if (!Array.isArray(rules)) return [];
  return rules
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
};

export const sanitizeTags = (tags?: unknown): string[] => {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  tags.forEach((tag) => {
    if (typeof tag !== "string") return;
    const cleaned = tag.trim();
    if (!cleaned.length) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(cleaned);
  });
  return normalized;
};

const DEFAULT_GAME_VERSION_ID = "gen5_bw";

const DEFAULT_PLAYER_NAME_SET: string[] = [];

export const INITIAL_STATE: AppState = {
  playerNames: DEFAULT_PLAYER_NAME_SET,
  team: [],
  box: [],
  graveyard: [],
  rules: DEFAULT_RULES,
  rulesetId: DEFAULT_RULESET_ID,
  levelCaps: [],
  rivalCaps: [],
  stats: ensureStatsForPlayers(undefined, DEFAULT_PLAYER_NAME_SET.length),
  legendaryTrackerEnabled: true,
  rivalCensorEnabled: true,
  rivalCensorMode: "on",
  hardcoreModeEnabled: false,
  nicknamesEnabled: true,
  infiniteFossilsEnabled: false,
  megaStoneSpriteStyle: "item",
  fossils: [],
  items: [],
  runStartedAt: Date.now(),
};

export const createInitialState = (
  gameVersionId: string = DEFAULT_GAME_VERSION_ID,
  playerNames?: string[],
  ruleset?: { id?: string; rules?: string[] },
): AppState => {
  const gameVersion =
    GAME_VERSIONS[gameVersionId] || GAME_VERSIONS[DEFAULT_GAME_VERSION_ID];
  const base = JSON.parse(JSON.stringify(INITIAL_STATE)) as AppState;
  const normalizedNames = sanitizePlayerNames(playerNames);
  const normalizedRules = sanitizeRules(
    Array.isArray(ruleset?.rules) ? ruleset?.rules : undefined,
  );

  base.playerNames = normalizedNames;
  base.rules = normalizedRules.length > 0 ? normalizedRules : DEFAULT_RULES;
  base.rulesetId = ruleset?.id || DEFAULT_RULESET_ID;
  base.stats = ensureStatsForPlayers(base.stats, normalizedNames.length);
  base.levelCaps = gameVersion.levelCaps.map((cap) => ({
    ...cap,
    done: false,
  }));
  base.rivalCaps = gameVersion.rivalCaps.map((cap) => ({
    ...cap,
    done: false,
    revealed: false,
  }));
  base.fossils = normalizedNames.map(() => []);
  base.items = normalizedNames.map(() => []);
  base.runStartedAt = Date.now();
  return base;
};
