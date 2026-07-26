import { readFile } from "node:fs/promises";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  canonicalHash,
  firebaseTrackerIdToUuid,
} from "../../scripts/firebase-migration/canonical.ts";

const { Client } = pg;
const databaseUrl = process.env.SUPABASE_MIGRATION_TEST_DB_URL;
const firstReportPath = process.env.SUPABASE_MIGRATION_TEST_FIRST_REPORT;
const rerunReportPath = process.env.SUPABASE_MIGRATION_TEST_RERUN_REPORT;
const trackerId = firebaseTrackerIdToUuid("fixture-tracker");

if (!databaseUrl || !firstReportPath || !rerunReportPath) {
  throw new Error(
    "Run migrated-data integration tests through npm run test:migration:integration.",
  );
}

interface MigrationReport {
  dryRun: boolean;
  transformedCounts: Record<string, number>;
  targetCounts?: Record<string, number>;
  trackerIdMapping: Record<string, string>;
  stateHashes: Record<string, string>;
  validation: {
    quarantineCount: number;
    targetHashesMatch?: boolean;
  };
}

const loadReport = async (filename: string): Promise<MigrationReport> =>
  JSON.parse(await readFile(filename, "utf8")) as MigrationReport;

describe("migrated Firebase data in PostgreSQL", () => {
  const client = new Client({ connectionString: databaseUrl });

  beforeAll(async () => client.connect());
  afterAll(async () => client.end());

  it("records matching counts, deterministic IDs, and round-trip hashes", async () => {
    const [firstReport, rerunReport] = await Promise.all([
      loadReport(firstReportPath),
      loadReport(rerunReportPath),
    ]);

    expect(firstReport.dryRun).toBe(false);
    expect(firstReport.validation).toMatchObject({
      quarantineCount: 0,
      targetHashesMatch: true,
    });
    expect(firstReport.targetCounts).toEqual(firstReport.transformedCounts);
    expect(firstReport.trackerIdMapping["fixture-tracker"]).toBe(trackerId);
    expect(rerunReport.targetCounts).toEqual(firstReport.targetCounts);
    expect(rerunReport.stateHashes).toEqual(firstReport.stateHashes);

    const stateResult = await client.query({
      text: "select state from public.tracker_states where tracker_id = $1",
      values: [trackerId],
    });
    expect(stateResult.rows).toHaveLength(1);
    expect(canonicalHash(stateResult.rows[0].state)).toBe(
      firstReport.stateHashes[trackerId],
    );
  });

  it("persists relational metadata, ownership, profile mapping, and legacy defaults", async () => {
    const result = await client.query({
      text: `
        select
          tracker.title,
          tracker.player_names,
          tracker.game_version_id,
          tracker.is_public,
          tracker.ruleset_id,
          member.role,
          profile.firebase_uid,
          profile.display_name,
          profile.display_name_requires_update,
          profile.multi_locale_search,
          tracker_state.schema_version,
          tracker_state.revision,
          tracker_state.state
        from public.trackers as tracker
        join public.tracker_members as member on member.tracker_id = tracker.id
        join public.profiles as profile on profile.id = member.user_id
        join public.tracker_states as tracker_state on tracker_state.tracker_id = tracker.id
        where tracker.id = $1
      `,
      values: [trackerId],
    });

    expect(result.rows).toHaveLength(1);
    const row = result.rows[0];
    expect(row).toMatchObject({
      title: "Migration fixture",
      player_names: ["Red", "Blue"],
      game_version_id: "gen1_rb",
      is_public: false,
      ruleset_id: "standard",
      role: "owner",
      firebase_uid: "fixture-owner",
      display_name: "owner",
      display_name_requires_update: true,
      multi_locale_search: false,
      schema_version: 1,
      revision: "1",
    });
    expect(row.state).toMatchObject({
      nicknamesEnabled: true,
      rivalCensorMode: "on",
      rules: ["First encounter only."],
    });
    expect(row.state).not.toHaveProperty("playerNames");
    expect(row.state).not.toHaveProperty("rulesetId");
    expect(row.state).not.toHaveProperty("rivalCensorEnabled");
  });

  it("does not duplicate rows during the repeated import", async () => {
    const result = await client.query({
      text: `
        select
          (select count(*)::integer from public.trackers where id = $1) as trackers,
          (select count(*)::integer from public.tracker_members where tracker_id = $1) as memberships,
          (select count(*)::integer from public.tracker_states where tracker_id = $1) as states
      `,
      values: [trackerId],
    });

    expect(result.rows[0]).toEqual({
      trackers: 1,
      memberships: 1,
      states: 1,
    });
  });
});
