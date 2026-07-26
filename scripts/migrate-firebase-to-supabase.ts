import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { importMigrationBundle } from "./firebase-migration/database.ts";
import { sha256 } from "./firebase-migration/canonical.ts";
import {
  transformedCounts,
  transformFirebaseExport,
} from "./firebase-migration/transform.ts";
import type {
  MigrationReport,
  MigrationTarget,
} from "./firebase-migration/types.ts";

interface CliOptions {
  input: string;
  authMap: string;
  target: MigrationTarget;
  report: string;
  dryRun: boolean;
  confirmProduction: boolean;
}

const usage = `
Firebase Realtime Database to Supabase migration

Usage:
  npm run firebase:migrate -- \\
    --input <firebase-export.json> \\
    --auth-map <firebase-to-supabase-users.json> \\
    --target <staging|production> \\
    --report <report.json> \\
    --dry-run

Remove --dry-run to import. A production import additionally requires
--confirm-production and SUPABASE_MIGRATION_PRODUCTION_DB_URL.
`;

const parseArguments = (argv: string[]): CliOptions => {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--dry-run" || argument === "--confirm-production") {
      flags.add(argument);
      continue;
    }
    if (!argument.startsWith("--")) {
      throw new Error(`Unexpected argument: ${argument}`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${argument}.`);
    }
    values.set(argument, value);
    index += 1;
  }

  const input = values.get("--input");
  const authMap = values.get("--auth-map");
  const target = values.get("--target");
  const report = values.get("--report");
  if (
    !input ||
    !authMap ||
    !report ||
    (target !== "staging" && target !== "production")
  ) {
    throw new Error("Missing or invalid required arguments.");
  }
  return {
    input: path.resolve(input),
    authMap: path.resolve(authMap),
    target,
    report: path.resolve(report),
    dryRun: flags.has("--dry-run"),
    confirmProduction: flags.has("--confirm-production"),
  };
};

const readJson = async (
  filename: string,
): Promise<{ raw: Buffer; value: unknown }> => {
  const raw = await readFile(filename);
  return { raw, value: JSON.parse(raw.toString("utf8")) as unknown };
};

const writeReport = async (filename: string, report: MigrationReport) => {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporaryFilename = `${filename}.tmp`;
  await writeFile(temporaryFilename, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporaryFilename, filename);
};

const main = async () => {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log(usage);
    return;
  }
  const startedAt = Date.now();
  let options: CliOptions;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(usage);
    process.exitCode = 1;
    return;
  }

  if (
    options.target === "production" &&
    !options.dryRun &&
    !options.confirmProduction
  ) {
    throw new Error(
      "Production import requires --confirm-production after an approved dry-run report.",
    );
  }

  const [firebaseExport, authMap] = await Promise.all([
    readJson(options.input),
    readJson(options.authMap),
  ]);
  const bundle = transformFirebaseExport(firebaseExport.value, authMap.value);
  const quarantineIssues = bundle.issues.filter(
    (entry) => entry.severity === "quarantine",
  );
  const stateHashes = Object.fromEntries(
    bundle.rows.trackerStates.map((row) => [row.trackerId, row.canonicalHash]),
  );
  const report: MigrationReport = {
    reportVersion: 1,
    toolVersion: "firebase-json-v1",
    executedAt: new Date().toISOString(),
    durationMs: 0,
    input: {
      filename: path.basename(options.input),
      sha256: sha256(firebaseExport.raw),
    },
    target: options.target,
    dryRun: options.dryRun,
    sourceCounts: bundle.sourceCounts,
    transformedCounts: transformedCounts(bundle.rows),
    trackerIdMapping: bundle.trackerIdMapping,
    userIdMapping: bundle.userIdMapping,
    stateHashes,
    issues: bundle.issues,
    excluded: quarantineIssues.map((entry) => ({
      entityType: entry.entityType,
      entityId: entry.entityId,
      reason: entry.code,
    })),
    validation: {
      quarantineCount: quarantineIssues.length,
      warningCount: bundle.issues.length - quarantineIssues.length,
      referentialIntegrityPassed: !bundle.issues.some(
        (entry) => entry.code === "referential_integrity_failed",
      ),
    },
  };

  if (!options.dryRun && quarantineIssues.length === 0) {
    const environmentVariable =
      options.target === "staging"
        ? "SUPABASE_MIGRATION_STAGING_DB_URL"
        : "SUPABASE_MIGRATION_PRODUCTION_DB_URL";
    const connectionString = process.env[environmentVariable];
    if (!connectionString) {
      throw new Error(`Missing ${environmentVariable}.`);
    }
    const result = await importMigrationBundle(connectionString, bundle);
    report.targetCounts = result.targetCounts;
    report.validation.targetHashesMatch = result.targetHashesMatch;
  }

  report.durationMs = Date.now() - startedAt;
  await writeReport(options.report, report);

  console.log(`Migration report: ${options.report}`);
  console.log(
    `Transformed ${report.transformedCounts.profiles} profiles, ${report.transformedCounts.trackers} trackers, ${report.transformedCounts.memberships} memberships, ${report.transformedCounts.states} states, and ${report.transformedCounts.rulesets} rulesets.`,
  );
  console.log(
    `Validation: ${report.validation.warningCount} warning(s), ${report.validation.quarantineCount} quarantine issue(s).`,
  );

  if (quarantineIssues.length > 0) {
    console.error(
      "Import was not attempted because quarantined records require resolution.",
    );
    process.exitCode = 2;
  } else if (options.dryRun) {
    console.log("Dry run complete; no database changes were made.");
  } else {
    console.log("Transactional import and post-import validation completed.");
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
