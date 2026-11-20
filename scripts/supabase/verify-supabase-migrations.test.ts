import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractLocalMigrationVersions,
  verifyMigrationVersions,
} from "./verify-supabase-migrations.mjs";

describe("canonical-state migration deployment", () => {
  it("extends the migration history already deployed on staging", () => {
    const stagingVersions = [
      "20260719130000",
      "20260719130100",
      "20260719130200",
      "20260719130300",
      "20260719130400",
      "20260918120000",
      "20260919220000",
      "20261024120000",
    ];
    const localVersions = extractLocalMigrationVersions(
      readdirSync(resolve("supabase", "migrations")),
    );

    expect(() =>
      verifyMigrationVersions(localVersions, stagingVersions, "before"),
    ).not.toThrow();
    expect(localVersions).toContain("20261116120000");
  });
});
