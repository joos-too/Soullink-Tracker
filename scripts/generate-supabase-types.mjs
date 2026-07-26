import { mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { format, resolveConfig } from "prettier";

const outputPath = resolve("src/types/database.ts");
const temporaryPath = `${outputPath}.tmp`;
const cliEntryPoint = resolve(
  "node_modules",
  "supabase",
  "dist",
  "supabase.js",
);

mkdirSync(dirname(outputPath), { recursive: true });

const result = spawnSync(
  process.execPath,
  [cliEntryPoint, "gen", "types", "typescript", "--local"],
  { encoding: "utf8" },
);

if (result.status !== 0) {
  rmSync(temporaryPath, { force: true });
  const details =
    result.stderr ||
    result.stdout ||
    result.error?.message ||
    "Supabase type generation failed.";
  process.stderr.write(`${details.trimEnd()}\n`);
  process.exit(result.status ?? 1);
}

const prettierConfig = await resolveConfig(outputPath);
const formattedTypes = await format(result.stdout, {
  ...prettierConfig,
  filepath: outputPath,
});
await import("node:fs/promises").then(({ writeFile }) =>
  writeFile(temporaryPath, formattedTypes, "utf8"),
);
renameSync(temporaryPath, outputPath);
process.stdout.write(`Generated ${outputPath}\n`);
