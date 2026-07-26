import { describe, expect, it } from "vitest";
import {
  extractLocalMigrationVersions,
  parseMigrationArguments,
  validateMigrationDatabaseUrl,
  verifyEnvironmentMarker,
  verifyMigrationVersions,
} from "./verify-supabase-migrations.mjs";

describe("hosted migration verification", () => {
  it("accepts the supported command interface", () => {
    expect(
      parseMigrationArguments([
        "--environment",
        "staging",
        "--phase",
        "before",
      ]),
    ).toEqual({ environment: "staging", phase: "before" });
  });

  it("rejects unsupported environments and phases", () => {
    expect(() =>
      parseMigrationArguments([
        "--environment",
        "preview",
        "--phase",
        "before",
      ]),
    ).toThrow("Environment must be either staging or production.");
    expect(() =>
      parseMigrationArguments([
        "--environment",
        "production",
        "--phase",
        "during",
      ]),
    ).toThrow("Phase must be either before or after.");
  });

  it("requires the fixed loopback SSH tunnel and postgres database", () => {
    expect(() =>
      validateMigrationDatabaseUrl(
        "postgresql://postgres:secret@database.example.com:5432/postgres",
      ),
    ).toThrow("127.0.0.1:55432");
    expect(() =>
      validateMigrationDatabaseUrl(
        "postgresql://postgres:secret@127.0.0.1:55432/template1",
      ),
    ).toThrow("postgres database");
    expect(
      validateMigrationDatabaseUrl(
        "postgresql://postgres:encoded%21password@127.0.0.1:55432/postgres",
      ).hostname,
    ).toBe("127.0.0.1");
  });

  it("rejects missing and mismatched database environment markers", () => {
    expect(() => verifyEnvironmentMarker(null, "staging")).toThrow(
      'received "missing"',
    );
    expect(() => verifyEnvironmentMarker("production", "staging")).toThrow(
      'expected "staging", received "production"',
    );
    expect(() =>
      verifyEnvironmentMarker("production", "production"),
    ).not.toThrow();
  });

  it("extracts ordered unique migration versions", () => {
    expect(
      extractLocalMigrationVersions([
        "20260719130200_rls_and_grants.sql",
        "README.md",
        "20260719130000_core_schema.sql",
      ]),
    ).toEqual(["20260719130000", "20260719130200"]);
    expect(() =>
      extractLocalMigrationVersions([
        "20260719130000_first.sql",
        "20260719130000_second.sql",
      ]),
    ).toThrow("must be unique");
    expect(() =>
      extractLocalMigrationVersions(["invalid_migration.sql"]),
    ).toThrow("Invalid migration filename");
  });

  it("allows an ordered remote prefix before deployment", () => {
    expect(() =>
      verifyMigrationVersions(
        ["20260719130000", "20260719130100", "20260719130200"],
        ["20260719130000", "20260719130100"],
        "before",
      ),
    ).not.toThrow();
  });

  it("rejects remote-only, missing, and reordered versions", () => {
    const local = ["20260719130000", "20260719130100", "20260719130200"];

    expect(() =>
      verifyMigrationVersions(
        local,
        ["20260719130000", "20260719139999"],
        "before",
      ),
    ).toThrow("diverges");
    expect(() =>
      verifyMigrationVersions(
        local,
        ["20260719130100", "20260719130000"],
        "before",
      ),
    ).toThrow("diverges");
    expect(() =>
      verifyMigrationVersions(
        local,
        ["20260719130000", "20260719130200"],
        "before",
      ),
    ).toThrow("diverges");
  });

  it("requires exact equality after deployment", () => {
    expect(() =>
      verifyMigrationVersions(
        ["20260719130000", "20260719130100"],
        ["20260719130000"],
        "after",
      ),
    ).toThrow("incomplete");
    expect(() =>
      verifyMigrationVersions(
        ["20260719130000", "20260719130100"],
        ["20260719130000", "20260719130100"],
        "after",
      ),
    ).not.toThrow();
  });
});
