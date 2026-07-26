export type MigrationTarget = "staging" | "production";
export type TrackerRole = "owner" | "editor" | "guest";

export interface AuthMapEntry {
  firebaseUid: string;
  supabaseUserId: string;
  email: string;
}

export interface MigrationIssue {
  severity: "warning" | "quarantine";
  code: string;
  entityType: "auth" | "profile" | "tracker" | "membership" | "ruleset";
  entityId: string;
  message: string;
}

export interface ProfileRow {
  id: string;
  firebaseUid: string;
  displayName: string;
  displayNameRequiresUpdate: boolean;
  createdAt: string;
  lastLoginAt: string;
  useGenerationSprites: boolean;
  useSpritesInTeamTable: boolean;
  wikiId: string | null;
  multiLocaleSearch: boolean;
}

export interface TrackerRow {
  id: string;
  firebaseTrackerId: string;
  title: string;
  playerNames: string[];
  createdBy: string;
  createdAt: string;
  gameVersionId: string;
  isPublic: boolean;
  allPokemonAndItems: boolean;
  rulesetId: string | null;
}

export interface TrackerMemberRow {
  trackerId: string;
  userId: string;
  role: TrackerRole;
  addedAt: string;
  settings: Record<string, unknown>;
}

export interface TrackerStateRow {
  trackerId: string;
  state: Record<string, unknown>;
  schemaVersion: number;
  revision: number;
  updatedBy: string;
  canonicalHash: string;
}

export interface RulesetRow {
  ownerId: string;
  id: string;
  name: string;
  description: string;
  rules: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MigrationRows {
  profiles: ProfileRow[];
  trackers: TrackerRow[];
  trackerMembers: TrackerMemberRow[];
  trackerStates: TrackerStateRow[];
  rulesets: RulesetRow[];
}

export interface MigrationCounts {
  users: number;
  profiles: number;
  trackers: number;
  memberships: number;
  states: number;
  rulesets: number;
}

export interface MigrationReport {
  reportVersion: 1;
  toolVersion: string;
  executedAt: string;
  durationMs: number;
  input: {
    filename: string;
    sha256: string;
  };
  target: MigrationTarget;
  dryRun: boolean;
  sourceCounts: MigrationCounts;
  transformedCounts: MigrationCounts;
  targetCounts?: MigrationCounts;
  trackerIdMapping: Record<string, string>;
  userIdMapping: Record<string, string>;
  stateHashes: Record<string, string>;
  issues: MigrationIssue[];
  excluded: Array<{
    entityType: MigrationIssue["entityType"];
    entityId: string;
    reason: string;
  }>;
  validation: {
    quarantineCount: number;
    warningCount: number;
    referentialIntegrityPassed: boolean;
    targetHashesMatch?: boolean;
  };
}

export interface MigrationBundle {
  rows: MigrationRows;
  sourceCounts: MigrationCounts;
  trackerIdMapping: Record<string, string>;
  userIdMapping: Record<string, string>;
  issues: MigrationIssue[];
}
