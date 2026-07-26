import { describe, expect, it } from "vitest";
import {
  canonicalHash,
  canonicalJson,
  firebaseTrackerIdToUuid,
} from "./canonical.ts";
import { parseAuthMap, transformFirebaseExport } from "./transform.ts";

const OWNER_FIREBASE_UID = "firebase-owner";
const EDITOR_FIREBASE_UID = "firebase-editor";
const OWNER_SUPABASE_ID = "10000000-0000-4000-8000-000000000001";
const EDITOR_SUPABASE_ID = "10000000-0000-4000-8000-000000000002";

const authMap = {
  users: [
    {
      firebaseUid: OWNER_FIREBASE_UID,
      supabaseUserId: OWNER_SUPABASE_ID,
      email: "Owner@Example.com",
    },
    {
      firebaseUid: EDITOR_FIREBASE_UID,
      supabaseUserId: EDITOR_SUPABASE_ID,
      email: "editor@example.com",
    },
  ],
};

const validExport = () => ({
  users: {
    [OWNER_FIREBASE_UID]: {
      uid: OWNER_FIREBASE_UID,
      email: "owner@example.com",
      createdAt: 1_700_000_000_000,
      lastLoginAt: 1_700_000_100_000,
      useGenerationSprites: true,
    },
    [EDITOR_FIREBASE_UID]: {
      uid: EDITOR_FIREBASE_UID,
      email: "editor@example.com",
      createdAt: 1_700_000_000_000,
      lastLoginAt: 1_700_000_100_000,
    },
  },
  userEmails: {
    "owner@example_com": { uid: OWNER_FIREBASE_UID },
    "editor@example_com": { uid: EDITOR_FIREBASE_UID },
  },
  userTrackers: {
    [OWNER_FIREBASE_UID]: { "legacy-tracker": true },
    [EDITOR_FIREBASE_UID]: { "legacy-tracker": true },
  },
  trackers: {
    "legacy-tracker": {
      meta: {
        id: "legacy-tracker",
        title: "Migration fixture",
        playerNames: ["Red", "Blue"],
        createdBy: OWNER_FIREBASE_UID,
        createdAt: 1_700_000_000_000,
        gameVersionId: "gen1_rb",
        isPublic: true,
        members: {
          [OWNER_FIREBASE_UID]: {
            uid: OWNER_FIREBASE_UID,
            role: "owner",
            addedAt: 1_700_000_000_000,
          },
          [EDITOR_FIREBASE_UID]: {
            uid: EDITOR_FIREBASE_UID,
            role: "editor",
            addedAt: 1_700_000_000_100,
          },
        },
        userSettings: {
          [EDITOR_FIREBASE_UID]: {
            rivalPreferences: { blue: "female" },
          },
        },
        rulesetId: "standard",
      },
      state: {
        playerNames: ["Red", "Blue"],
        rulesetId: "standard",
        team: [],
        rules: [" First encounter only. "],
        stats: { runs: 3, deaths: [1] },
        rivalCensorEnabled: false,
      },
    },
  },
  rulesets: {
    [OWNER_FIREBASE_UID]: {
      custom: {
        id: "custom",
        name: "Custom rules",
        rules: ["Rule A"],
        tags: ["Hard", "hard", "Duo"],
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_100_000,
      },
    },
  },
});

describe("Firebase migration transformation", () => {
  it("generates stable version-5 tracker UUIDs", () => {
    const first = firebaseTrackerIdToUuid("legacy-tracker");
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(firebaseTrackerIdToUuid("legacy-tracker")).toBe(first);
    expect(firebaseTrackerIdToUuid("another-tracker")).not.toBe(first);
  });

  it("normalizes profiles, memberships, metadata, state, and custom rulesets", () => {
    const result = transformFirebaseExport(validExport(), authMap);

    expect(
      result.issues.filter((entry) => entry.severity === "quarantine"),
    ).toEqual([]);
    expect(result.rows.profiles).toHaveLength(2);
    expect(result.rows.profiles[0]).toMatchObject({
      id: OWNER_SUPABASE_ID,
      firebaseUid: OWNER_FIREBASE_UID,
      displayName: "owner",
      displayNameRequiresUpdate: true,
      useGenerationSprites: true,
      multiLocaleSearch: false,
    });
    expect(result.rows.trackers[0]).toMatchObject({
      firebaseTrackerId: "legacy-tracker",
      createdBy: OWNER_SUPABASE_ID,
      playerNames: ["Red", "Blue"],
      gameVersionId: "gen1_rb",
      isPublic: true,
      rulesetId: "standard",
    });
    expect(result.rows.trackerMembers).toHaveLength(2);
    expect(
      result.rows.trackerMembers.find(
        (entry) => entry.userId === EDITOR_SUPABASE_ID,
      ),
    ).toMatchObject({
      role: "editor",
      settings: { rivalPreferences: { blue: "female" } },
    });
    expect(result.rows.trackerStates[0].state).toMatchObject({
      rules: ["First encounter only."],
      rivalCensorMode: "off",
      nicknamesEnabled: true,
      fossils: [[], []],
      items: [[], []],
      stats: {
        runs: 3,
        deaths: [1, 0],
        sumDeaths: [0, 0],
      },
    });
    expect(result.rows.trackerStates[0].state).not.toHaveProperty(
      "playerNames",
    );
    expect(result.rows.trackerStates[0].state).not.toHaveProperty("rulesetId");
    expect(result.rows.trackerStates[0].state).not.toHaveProperty(
      "rivalCensorEnabled",
    );
    expect(result.rows.rulesets[0]).toMatchObject({
      ownerId: OWNER_SUPABASE_ID,
      id: "custom",
      tags: ["Hard", "Duo"],
    });
  });

  it("uses metadata player names and reports a disagreement with state", () => {
    const source = validExport();
    source.trackers["legacy-tracker"].state.playerNames = ["Wrong", "Names"];

    const result = transformFirebaseExport(source, authMap);

    expect(result.rows.trackers[0].playerNames).toEqual(["Red", "Blue"]);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "player_names_mismatch",
        entityId: "legacy-tracker",
      }),
    );
  });

  it("applies safe defaults for invalid new preference fields", () => {
    const source = validExport();
    const owner = source.users[OWNER_FIREBASE_UID] as Record<string, unknown>;
    const state = source.trackers["legacy-tracker"].state as Record<
      string,
      unknown
    >;
    owner.multiLocaleSearch = "yes";
    owner.displayName = "   Preferred   Trainer   ";
    state.nicknamesEnabled = "yes";

    const result = transformFirebaseExport(source, authMap);

    expect(result.rows.profiles[0]).toMatchObject({
      displayName: "Preferred Trainer",
      multiLocaleSearch: false,
    });
    expect(result.rows.trackerStates[0].state.nicknamesEnabled).toBe(true);
  });

  it("moves legacy guests into read-only relational memberships", () => {
    const source = validExport();
    const trackerMeta = source.trackers["legacy-tracker"].meta;
    const editor = trackerMeta.members[EDITOR_FIREBASE_UID];
    delete trackerMeta.members[EDITOR_FIREBASE_UID];
    Object.assign(trackerMeta, {
      guests: {
        [EDITOR_FIREBASE_UID]: { ...editor, role: "guest" },
      },
    });

    const result = transformFirebaseExport(source, authMap);

    expect(
      result.rows.trackerMembers.find(
        (entry) => entry.userId === EDITOR_SUPABASE_ID,
      ),
    ).toMatchObject({ role: "guest" });
  });

  it("quarantines an unknown version and an unmapped owner without partial rows", () => {
    const source = validExport();
    source.trackers["legacy-tracker"].meta.gameVersionId = "unknown";
    source.trackers["legacy-tracker"].meta.createdBy = "missing-owner";

    const result = transformFirebaseExport(source, authMap);

    expect(result.rows.trackers).toEqual([]);
    expect(result.rows.trackerMembers).toEqual([]);
    expect(result.rows.trackerStates).toEqual([]);
    expect(result.issues.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "unknown_game_version",
        "unmapped_tracker_owner",
      ]),
    );
  });

  it("rejects duplicate normalized Auth emails", () => {
    const issues: Parameters<typeof parseAuthMap>[1] = [];
    const parsed = parseAuthMap(
      {
        users: [
          ...authMap.users,
          {
            firebaseUid: "duplicate-user",
            supabaseUserId: "10000000-0000-4000-8000-000000000003",
            email: "OWNER@example.com",
          },
        ],
      },
      issues,
    );

    expect(parsed.has("duplicate-user")).toBe(false);
    expect(issues).toContainEqual(
      expect.objectContaining({ code: "duplicate_normalized_email" }),
    );
  });

  it("quarantines source profiles and members missing from the Auth mapping", () => {
    const source = validExport();
    const result = transformFirebaseExport(source, {
      users: [authMap.users[0]],
    });

    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unmapped_profile" }),
        expect.objectContaining({ code: "unmapped_member" }),
      ]),
    );
    expect(result.rows.trackers).toEqual([]);
  });

  it("quarantines malformed state and invalid membership roles", () => {
    const malformedStateSource = validExport();
    Object.assign(malformedStateSource.trackers["legacy-tracker"], {
      state: "not-an-object",
    });
    const malformedStateResult = transformFirebaseExport(
      malformedStateSource,
      authMap,
    );
    expect(malformedStateResult.issues).toContainEqual(
      expect.objectContaining({ code: "malformed_state" }),
    );

    const invalidRoleSource = validExport();
    invalidRoleSource.trackers["legacy-tracker"].meta.members[
      EDITOR_FIREBASE_UID
    ].role = "admin";
    const invalidRoleResult = transformFirebaseExport(
      invalidRoleSource,
      authMap,
    );
    expect(invalidRoleResult.issues).toContainEqual(
      expect.objectContaining({ code: "invalid_membership_role" }),
    );
    expect(invalidRoleResult.rows.trackers).toEqual([]);
  });

  it("is deterministic across reruns and hashes sorted objects without sorting arrays", () => {
    const first = transformFirebaseExport(validExport(), authMap);
    const second = transformFirebaseExport(validExport(), authMap);

    expect(second).toEqual(first);
    expect(canonicalJson({ b: 1, a: [2, 1] })).toBe('{"a":[2,1],"b":1}');
    expect(canonicalHash({ b: 1, a: [2, 1] })).toBe(
      canonicalHash({ a: [2, 1], b: 1 }),
    );
    expect(canonicalHash({ a: [1, 2], b: 1 })).not.toBe(
      canonicalHash({ a: [2, 1], b: 1 }),
    );
  });
});
