import pg from "pg";
import { canonicalHash, canonicalJson } from "./canonical.ts";
import { transformedCounts } from "./transform.ts";
import type {
  MigrationBundle,
  MigrationCounts,
  MigrationRows,
} from "./types.ts";

const { Client } = pg;

interface ImportResult {
  targetCounts: MigrationCounts;
  targetHashesMatch: boolean;
}

const normalizedDate = (value: unknown): string =>
  value instanceof Date
    ? value.toISOString()
    : new Date(String(value)).toISOString();

const assertExistingTrackersCompatible = async (
  client: pg.Client,
  rows: MigrationRows,
): Promise<Set<string>> => {
  const trackerIds = rows.trackers.map((row) => row.id);
  if (!trackerIds.length) return new Set();

  const existingTrackers = await client.query({
    text: `
      select
        tracker.id,
        tracker.title,
        tracker.player_names,
        tracker.created_by,
        tracker.created_at,
        tracker.game_version_id,
        tracker.is_public,
        tracker.all_pokemon_and_items,
        tracker.ruleset_id,
        tracker_state.state
      from public.trackers as tracker
      left join public.tracker_states as tracker_state on tracker_state.tracker_id = tracker.id
      where tracker.id = any($1::uuid[])
    `,
    values: [trackerIds],
  });
  const existingIds = new Set<string>();

  for (const existing of existingTrackers.rows) {
    const id = String(existing.id);
    existingIds.add(id);
    const expected = rows.trackers.find((row) => row.id === id);
    const expectedState = rows.trackerStates.find(
      (row) => row.trackerId === id,
    );
    if (!expected || !expectedState) {
      throw new Error(`Existing tracker ${id} has no transformed counterpart.`);
    }
    const comparableExisting = {
      title: existing.title,
      playerNames: existing.player_names,
      createdBy: existing.created_by,
      createdAt: normalizedDate(existing.created_at),
      gameVersionId: existing.game_version_id,
      isPublic: existing.is_public,
      allPokemonAndItems: existing.all_pokemon_and_items,
      rulesetId: existing.ruleset_id,
      stateHash: canonicalHash(existing.state),
    };
    const comparableExpected = {
      title: expected.title,
      playerNames: expected.playerNames,
      createdBy: expected.createdBy,
      createdAt: expected.createdAt,
      gameVersionId: expected.gameVersionId,
      isPublic: expected.isPublic,
      allPokemonAndItems: expected.allPokemonAndItems,
      rulesetId: expected.rulesetId,
      stateHash: expectedState.canonicalHash,
    };
    if (
      canonicalJson(comparableExisting) !== canonicalJson(comparableExpected)
    ) {
      throw new Error(
        `Refusing to overwrite existing tracker ${id}: target data differs from the migration output.`,
      );
    }
  }

  if (existingIds.size) {
    const existingMembers = await client.query({
      text: `
        select tracker_id, user_id, role, added_at, settings
        from public.tracker_members
        where tracker_id = any($1::uuid[])
        order by tracker_id, user_id
      `,
      values: [[...existingIds]],
    });
    const comparableExisting = existingMembers.rows.map((row) => ({
      trackerId: String(row.tracker_id),
      userId: String(row.user_id),
      role: row.role,
      addedAt: normalizedDate(row.added_at),
      settings: row.settings,
    }));
    const comparableExpected = rows.trackerMembers
      .filter((row) => existingIds.has(row.trackerId))
      .sort(
        (left, right) =>
          left.trackerId.localeCompare(right.trackerId) ||
          left.userId.localeCompare(right.userId),
      );
    if (
      canonicalJson(comparableExisting) !== canonicalJson(comparableExpected)
    ) {
      throw new Error(
        "Refusing to overwrite existing trackers: target memberships differ from the migration output.",
      );
    }
  }

  return existingIds;
};

const validateAuthUsers = async (client: pg.Client, rows: MigrationRows) => {
  const userIds = rows.profiles.map((row) => row.id);
  if (!userIds.length) return;
  const result = await client.query({
    text: "select id from auth.users where id = any($1::uuid[])",
    values: [userIds],
  });
  const existing = new Set(result.rows.map((row) => String(row.id)));
  const missing = userIds.filter((id) => !existing.has(id));
  if (missing.length) {
    throw new Error(
      `Auth import is incomplete: ${missing.length} mapped Supabase user(s) are absent from auth.users.`,
    );
  }
};

const assertExistingProfilesCompatible = async (
  client: pg.Client,
  rows: MigrationRows,
) => {
  const userIds = rows.profiles.map((row) => row.id);
  if (!userIds.length) return;
  const result = await client.query({
    text: `
      select
        id, firebase_uid, display_name, created_at, last_login_at,
        use_generation_sprites, use_sprites_in_team_table, wiki_id,
        multi_locale_search, display_name_requires_update
      from public.profiles
      where id = any($1::uuid[])
    `,
    values: [userIds],
  });
  for (const existing of result.rows) {
    if (existing.firebase_uid === null) continue;
    const expected = rows.profiles.find(
      (row) => row.id === String(existing.id),
    );
    if (!expected) continue;
    const comparableExisting = {
      firebaseUid: existing.firebase_uid,
      displayName: existing.display_name,
      displayNameRequiresUpdate: existing.display_name_requires_update,
      createdAt: normalizedDate(existing.created_at),
      lastLoginAt: normalizedDate(existing.last_login_at),
      useGenerationSprites: existing.use_generation_sprites,
      useSpritesInTeamTable: existing.use_sprites_in_team_table,
      wikiId: existing.wiki_id,
      multiLocaleSearch: existing.multi_locale_search,
    };
    const { id: _id, ...comparableExpected } = expected;
    if (
      canonicalJson(comparableExisting) !== canonicalJson(comparableExpected)
    ) {
      throw new Error(
        `Refusing to overwrite existing migrated profile ${expected.id}: target data differs from the migration output.`,
      );
    }
  }
};

const assertExistingRulesetsCompatible = async (
  client: pg.Client,
  rows: MigrationRows,
) => {
  const ownerIds = [...new Set(rows.rulesets.map((row) => row.ownerId))];
  if (!ownerIds.length) return;
  const result = await client.query({
    text: `
      select owner_id, id, name, description, rules, tags, created_at, updated_at
      from public.rulesets
      where owner_id = any($1::uuid[])
    `,
    values: [ownerIds],
  });
  for (const existing of result.rows) {
    const expected = rows.rulesets.find(
      (row) =>
        row.ownerId === String(existing.owner_id) &&
        row.id === String(existing.id),
    );
    if (!expected) continue;
    const comparableExisting = {
      ownerId: String(existing.owner_id),
      id: String(existing.id),
      name: existing.name,
      description: existing.description,
      rules: existing.rules,
      tags: existing.tags,
      createdAt: normalizedDate(existing.created_at),
      updatedAt: normalizedDate(existing.updated_at),
    };
    if (canonicalJson(comparableExisting) !== canonicalJson(expected)) {
      throw new Error(
        `Refusing to overwrite existing ruleset ${expected.ownerId}:${expected.id}: target data differs from the migration output.`,
      );
    }
  }
};

const insertRows = async (
  client: pg.Client,
  bundle: MigrationBundle,
  existingTrackerIds: Set<string>,
) => {
  for (const row of bundle.rows.profiles) {
    await client.query({
      text: `
        insert into public.profiles (
          id, firebase_uid, display_name, created_at, last_login_at,
          use_generation_sprites, use_sprites_in_team_table, wiki_id,
          multi_locale_search, display_name_requires_update
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        on conflict (id) do update set
          firebase_uid = excluded.firebase_uid,
          display_name = excluded.display_name,
          created_at = excluded.created_at,
          last_login_at = excluded.last_login_at,
          use_generation_sprites = excluded.use_generation_sprites,
          use_sprites_in_team_table = excluded.use_sprites_in_team_table,
          wiki_id = excluded.wiki_id,
          multi_locale_search = excluded.multi_locale_search,
          display_name_requires_update = excluded.display_name_requires_update
        where public.profiles.firebase_uid is null
      `,
      values: [
        row.id,
        row.firebaseUid,
        row.displayName,
        row.createdAt,
        row.lastLoginAt,
        row.useGenerationSprites,
        row.useSpritesInTeamTable,
        row.wikiId,
        row.multiLocaleSearch,
        row.displayNameRequiresUpdate,
      ],
    });
  }

  for (const row of bundle.rows.rulesets) {
    await client.query({
      text: `
        insert into public.rulesets (
          owner_id, id, name, description, rules, tags, created_at, updated_at
        ) values ($1, $2, $3, $4, $5::text[], $6::text[], $7, $8)
        on conflict (owner_id, id) do nothing
      `,
      values: [
        row.ownerId,
        row.id,
        row.name,
        row.description,
        row.rules,
        row.tags,
        row.createdAt,
        row.updatedAt,
      ],
    });
  }

  for (const row of bundle.rows.trackers) {
    if (existingTrackerIds.has(row.id)) continue;
    await client.query({
      text: `
        insert into public.trackers (
          id, title, player_names, created_by, created_at, game_version_id,
          is_public, all_pokemon_and_items, ruleset_id
        ) values ($1, $2, $3::text[], $4, $5, $6, $7, $8, $9)
      `,
      values: [
        row.id,
        row.title,
        row.playerNames,
        row.createdBy,
        row.createdAt,
        row.gameVersionId,
        row.isPublic,
        row.allPokemonAndItems,
        row.rulesetId,
      ],
    });
  }

  for (const row of bundle.rows.trackerMembers) {
    if (existingTrackerIds.has(row.trackerId)) continue;
    await client.query({
      text: `
        insert into public.tracker_members (
          tracker_id, user_id, role, added_at, settings
        ) values ($1, $2, $3::public.tracker_role, $4, $5::jsonb)
      `,
      values: [
        row.trackerId,
        row.userId,
        row.role,
        row.addedAt,
        JSON.stringify(row.settings),
      ],
    });
  }

  for (const row of bundle.rows.trackerStates) {
    if (existingTrackerIds.has(row.trackerId)) continue;
    await client.query({
      text: `
        insert into public.tracker_states (
          tracker_id, state, schema_version, revision, updated_by
        ) values ($1, $2::jsonb, $3, $4, $5)
      `,
      values: [
        row.trackerId,
        JSON.stringify(row.state),
        row.schemaVersion,
        row.revision,
        row.updatedBy,
      ],
    });
  }
};

const countTargetRows = async (
  client: pg.Client,
  rows: MigrationRows,
): Promise<MigrationCounts> => {
  const userIds = rows.profiles.map((row) => row.id);
  const firebaseUids = rows.profiles.map((row) => row.firebaseUid);
  const trackerIds = rows.trackers.map((row) => row.id);
  const rulesetKeys = rows.rulesets.map((row) => `${row.ownerId}:${row.id}`);
  const result = await client.query({
    text: `
      select
        (select count(*)::integer from auth.users where id = any($1::uuid[])) as users,
        (select count(*)::integer from public.profiles where firebase_uid = any($2::text[])) as profiles,
        (select count(*)::integer from public.trackers where id = any($3::uuid[])) as trackers,
        (select count(*)::integer from public.tracker_members where tracker_id = any($3::uuid[])) as memberships,
        (select count(*)::integer from public.tracker_states where tracker_id = any($3::uuid[])) as states,
        (select count(*)::integer from public.rulesets where owner_id::text || ':' || id = any($4::text[])) as rulesets
    `,
    values: [userIds, firebaseUids, trackerIds, rulesetKeys],
  });
  return result.rows[0] as MigrationCounts;
};

const validateStateHashes = async (
  client: pg.Client,
  rows: MigrationRows,
): Promise<boolean> => {
  const trackerIds = rows.trackerStates.map((row) => row.trackerId);
  if (!trackerIds.length) return true;
  const result = await client.query({
    text: "select tracker_id, state from public.tracker_states where tracker_id = any($1::uuid[])",
    values: [trackerIds],
  });
  const expected = new Map(
    rows.trackerStates.map((row) => [row.trackerId, row.canonicalHash]),
  );
  return (
    result.rows.length === rows.trackerStates.length &&
    result.rows.every(
      (row) =>
        expected.get(String(row.tracker_id)) === canonicalHash(row.state),
    )
  );
};

export const importMigrationBundle = async (
  connectionString: string,
  bundle: MigrationBundle,
): Promise<ImportResult> => {
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
  });
  await client.connect();
  try {
    await client.query("begin isolation level serializable");
    await client.query("set constraints all deferred");
    await validateAuthUsers(client, bundle.rows);
    await assertExistingProfilesCompatible(client, bundle.rows);
    await assertExistingRulesetsCompatible(client, bundle.rows);
    const existingTrackerIds = await assertExistingTrackersCompatible(
      client,
      bundle.rows,
    );
    await insertRows(client, bundle, existingTrackerIds);
    const targetCounts = await countTargetRows(client, bundle.rows);
    const targetHashesMatch = await validateStateHashes(client, bundle.rows);
    const expectedCounts = transformedCounts(bundle.rows);
    if (
      targetCounts.profiles !== expectedCounts.profiles ||
      targetCounts.trackers !== expectedCounts.trackers ||
      targetCounts.memberships !== expectedCounts.memberships ||
      targetCounts.states !== expectedCounts.states ||
      targetCounts.rulesets !== expectedCounts.rulesets ||
      !targetHashesMatch
    ) {
      throw new Error("Post-import count or state-hash validation failed.");
    }
    await client.query("commit");
    return { targetCounts, targetHashesMatch };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
};
