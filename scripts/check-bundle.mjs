import assert from "node:assert/strict";
import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const manifest = JSON.parse(readFileSync("dist/.vite/manifest.json", "utf8"));
const closure = (key, seen = new Set(), stack = new Set()) => {
  assert(!stack.has(key), `Circular static chunk dependency: ${key}`);
  if (seen.has(key)) return seen;
  assert(manifest[key], `Missing manifest entry: ${key}`);
  seen.add(key);
  stack.add(key);
  for (const dependency of manifest[key].imports ?? []) {
    closure(dependency, seen, stack);
  }
  stack.delete(key);
  return seen;
};

for (const [key, chunk] of Object.entries(manifest)) {
  closure(key);
  for (const dependency of chunk.dynamicImports ?? []) {
    assert(manifest[dependency], `Missing dynamic import: ${dependency}`);
  }
  if (chunk.file.endsWith(".js")) {
    assert(
      statSync(`dist/${chunk.file}`).size < 500_000,
      `${chunk.file} exceeds 500 kB`,
    );
  }
}

for (const entry of [
  "index.html",
  "src/app/HomeRoute.tsx",
  "src/app/AccountRoute.tsx",
]) {
  const chunks = [...closure(entry)].map((key) => manifest[key]);
  assert(
    !chunks.some((chunk) => /^(pokemon|item|location)-data$/.test(chunk.name)),
    `${entry} eagerly loads tracker datasets`,
  );
}
for (const eager of [
  "src/components/modals/CreateTrackerModal.tsx",
  "src/components/pages/RegisterPage.tsx",
  "src/components/pages/SettingsPage.tsx",
  "src/components/modals/TrackerSearchModal.tsx",
  "src/components/modals/RulesetSaveModal.tsx",
]) {
  assert(
    !manifest[eager]?.isDynamicEntry,
    `${eager} must not introduce an interaction-time download`,
  );
}

const startup = [...closure("index.html")].map((key) =>
  readFileSync(`dist/${manifest[key].file}`),
);
const bytes = startup.reduce((sum, content) => sum + content.length, 0);
const gzip = startup.reduce(
  (sum, content) => sum + gzipSync(content).length,
  0,
);
console.log(
  `Bundle checks passed. Startup JS: ${(bytes / 1000).toFixed(2)} kB (${(gzip / 1000).toFixed(2)} kB gzip).`,
);
