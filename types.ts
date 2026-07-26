export interface Pokemon {
  id: number | null;
  nickname: string;
  name?: string;
}

export interface PokemonLink {
  id: number;
  locationSlug: string | null;
  location?: string;
  fossilSlugs?: string[];
  members: Pokemon[];
  isLost?: boolean;
}

export interface LinkEditPayload {
  locationSlug: string | null;
  location?: string;
  members: Pokemon[];
}

export interface Ruleset {
  id: string;
  name: string;
  description?: string;
  rules: string[];
  tags?: string[];
  isPreset?: boolean;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface LevelCap {
  id: number;
  arena: string;
  level: string;
  done?: boolean;
}

export interface VariableRival {
  key: string;
  options: {
    male: string;
    female: string;
  };
}

export interface RivalCap {
  id: number;
  location: string;
  rival: string | VariableRival;
  level: string;
  done?: boolean;
  revealed?: boolean;
}

export interface FossilEntry {
  fossilId: string;
  location?: string;
  locationSlug: string | null;
  inBag: boolean;
  revived: boolean;
  pokemonId?: number | null;
  pokemonName?: string;
}

export interface ItemEntry {
  id?: string;
  name?: string;
  location?: string;
  locationSlug: string | null;
  inBag: boolean;
  used: boolean;
}

export interface Stats {
  runs: number;
  best: number;
  top4Items: number[];
  deaths: number[];
  sumDeaths?: number[];
  legendaryEncounters?: number;
}

export type RivalCensorMode = "off" | "showLevels" | "on";

export interface AppState {
  playerNames: string[];
  team: PokemonLink[];
  box: PokemonLink[];
  graveyard: PokemonLink[];
  rules: string[];
  rulesetId?: string;
  levelCaps: LevelCap[];
  rivalCaps: RivalCap[];
  stats: Stats;
  legendaryTrackerEnabled?: boolean;
  rivalCensorMode?: RivalCensorMode;
  /** @deprecated Use rivalCensorMode instead */
  rivalCensorEnabled?: boolean;
  hardcoreModeEnabled?: boolean;
  nicknamesEnabled?: boolean;
  infiniteFossilsEnabled?: boolean;
  megaStoneSpriteStyle?: "item" | "pokemon";
  fossils?: FossilEntry[][];
  items?: ItemEntry[][];
  runStartedAt?: number;
}

export type TrackerRole = "owner" | "editor" | "guest";

export type RivalGender = "male" | "female";

export interface UserSettings {
  rivalPreferences?: Record<string, RivalGender>;
  useGenerationSprites?: boolean;
}

export interface TrackerMember {
  uid: string;
  displayName: string;
  /** Available to tracker owners; omitted for all other Supabase readers. */
  email?: string;
  role: TrackerRole;
  addedAt: number;
}

export interface GameVersionBadgeSegment {
  badgeSegmentName: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export interface GameSelectionColor {
  bgColor: string;
  textColor: string;
  borderColor: string;
}

export interface GameVersion {
  id: string;
  badgeSet: string;
  badge?: {
    segments: GameVersionBadgeSegment[];
  };
  selectionColors?: Record<string, GameSelectionColor>;
  levelCaps: Omit<LevelCap, "done">[];
  rivalCaps: Omit<RivalCap, "done" | "revealed">[];
  defaultRivalPreferences?: Record<string, RivalGender>;
}

export interface TrackerMeta {
  id: string;
  title: string;
  playerNames: string[];
  player1Name?: string | null;
  player2Name?: string | null;
  player3Name?: string | null;
  createdBy: string;
  createdAt: number;
  members: Record<string, TrackerMember>;
  guests?: Record<string, TrackerMember>;
  gameVersionId: string;
  allPokemonAndItems?: boolean;
  rulesetId?: string;
  userSettings?: Record<string, UserSettings>;
  isPublic?: boolean;
}

export interface TrackerSummary {
  teamCount: number;
  boxCount: number;
  graveyardCount: number;
  deathCount: number;
  runs: number;
  championDone: boolean;
  doneCapsCount: number;
  progressPct: number;
}
