#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const itemsDataPath = path.resolve(__dirname, "../src/data/items.ts");
const specialItemsDataPath = path.resolve(
  __dirname,
  "../src/data/special-items.ts",
);

function printUsage() {
  console.log(`Usage:
  node scripts/migrate-item-names-to-ids.mjs <input.json> <output.json> [options]

Options:
  --dry-run             Print the migration report without writing output.
  --fail-on-unresolved  Exit without writing if any item name cannot be resolved.
  --in-place            Allow output.json to be the same file as input.json.

Use "-" as input.json to read a Firebase export from stdin.

Examples:
  node scripts/migrate-item-names-to-ids.mjs firebase-export.json firebase-export.migrated.json
  node scripts/migrate-item-names-to-ids.mjs firebase-export.json firebase-export.migrated.json --fail-on-unresolved
  node scripts/migrate-item-names-to-ids.mjs firebase-export.json ignored.json --dry-run
`);
}

function parseArgs(argv) {
  const options = {
    dryRun: false,
    failOnUnresolved: false,
    inPlace: false,
  };
  const positional = [];

  argv.forEach((arg) => {
    switch (arg) {
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--fail-on-unresolved":
        options.failOnUnresolved = true;
        break;
      case "--in-place":
        options.inPlace = true;
        break;
      case "-h":
      case "--help":
        options.help = true;
        break;
      default:
        positional.push(arg);
    }
  });

  return {
    inputPath: positional[0],
    outputPath: positional[1],
    options,
  };
}

function findAssignedLiteral(source, constName, sourcePath) {
  const declaration = `export const ${constName}`;
  const declarationIndex = source.indexOf(declaration);
  if (declarationIndex === -1) {
    throw new Error(`Could not find ${constName} in ${sourcePath}`);
  }

  const equalsIndex = source.indexOf("=", declarationIndex);
  if (equalsIndex === -1) {
    throw new Error(`Could not find ${constName} assignment`);
  }

  const objectStart = source.indexOf("{", equalsIndex);
  const arrayStart = source.indexOf("[", equalsIndex);
  const literalStart =
    objectStart === -1
      ? arrayStart
      : arrayStart === -1
        ? objectStart
        : Math.min(objectStart, arrayStart);

  if (literalStart === -1) {
    throw new Error(`Could not find ${constName} literal`);
  }

  let depth = 0;
  let stringQuote = null;
  let escaped = false;

  for (let i = literalStart; i < source.length; i += 1) {
    const char = source[i];

    if (stringQuote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === stringQuote) {
        stringQuote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      stringQuote = char;
      continue;
    }

    if (char === "{" || char === "[") {
      depth += 1;
    } else if (char === "}" || char === "]") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(literalStart, i + 1);
      }
    }
  }

  throw new Error(`Could not parse ${constName} literal`);
}

async function loadLiteral(sourcePath, constName) {
  const source = await readFile(sourcePath, "utf8");
  const literal = findAssignedLiteral(source, constName, sourcePath);
  return vm.runInNewContext(`(${literal})`, Object.create(null), {
    timeout: 1000,
  });
}

async function loadItemNameMap() {
  const [items, stones, megaStones] = await Promise.all([
    loadLiteral(itemsDataPath, "ITEMS"),
    loadLiteral(specialItemsDataPath, "STONES"),
    loadLiteral(specialItemsDataPath, "MEGA_STONES"),
  ]);
  const stoneSlugs = new Set(stones.map((entry) => entry.id));
  const nameToId = new Map();
  const slugToId = new Map();
  const duplicates = new Map();

  const canonicalIdForSlug = (slug) =>
    stoneSlugs.has(slug) ? slug : `item:${slug}`;

  items.forEach((entry) => {
    const slug = typeof entry?.slug === "string" ? entry.slug.trim() : "";
    if (!slug) return;
    const id = canonicalIdForSlug(slug);
    slugToId.set(normalizeItemName(slug), id);
    addItemAlias(nameToId, duplicates, slug, id);
    addItemAlias(nameToId, duplicates, entry.de, id);
    addItemAlias(nameToId, duplicates, entry.en, id);
  });

  stones.forEach((entry) => {
    if (typeof entry?.id === "string" && entry.id.trim()) {
      slugToId.set(normalizeItemName(entry.id), entry.id);
      addItemAlias(nameToId, duplicates, entry.id, entry.id);
    }
  });

  megaStones.forEach((entry) => {
    if (typeof entry?.id === "string" && entry.id.trim()) {
      const id = `item:${entry.id}`;
      slugToId.set(normalizeItemName(entry.id), id);
      addItemAlias(nameToId, duplicates, entry.id, id);
    }
  });

  return { nameToId, slugToId, duplicates };
}

function addItemAlias(nameToId, duplicates, rawName, id) {
  const name = textValue(rawName);
  if (!name) return;
  const key = normalizeItemName(name);
  const existing = nameToId.get(key);
  if (existing && existing !== id) {
    duplicates.set(key, [
      ...new Set([...(duplicates.get(key) ?? [existing]), id]),
    ]);
    return;
  }
  nameToId.set(key, id);
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function normalizeItemName(name) {
  return name
    .trim()
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createReport() {
  return {
    trackersVisited: 0,
    legacyStoneListsMigrated: 0,
    legacyStoneListsMerged: 0,
    itemsVisited: 0,
    itemIdsCanonicalized: 0,
    stoneIdsConverted: 0,
    itemNamesConverted: 0,
    itemNamesRemoved: 0,
    itemNamesPreserved: 0,
    unresolved: [],
  };
}

function textValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function resolveName(nameToId, rawName) {
  const name = textValue(rawName);
  if (!name) return null;
  return nameToId.get(normalizeItemName(name)) ?? null;
}

function resolveExistingId(slugToId, rawId) {
  const id = textValue(rawId);
  if (!id) return null;

  if (id.startsWith("item:")) {
    const slug = textValue(id.slice("item:".length));
    if (!slug) return null;
    return slugToId.get(normalizeItemName(slug)) ?? id;
  }

  return slugToId.get(normalizeItemName(id)) ?? id;
}

function migrateItemEntry(entry, pathLabel, maps, report) {
  if (!isObject(entry)) return;
  report.itemsVisited += 1;

  const { nameToId, slugToId } = maps;
  const rawId = textValue(entry.id);
  const rawStoneId = textValue(entry.stoneId);
  const canonicalId = resolveExistingId(slugToId, rawId ?? rawStoneId);
  const resolvedNameId = resolveName(nameToId, entry.name);

  if (canonicalId) {
    if (rawId && rawId !== canonicalId) {
      report.itemIdsCanonicalized += 1;
    }
    if (rawStoneId && !rawId) {
      report.stoneIdsConverted += 1;
    }
    entry.id = canonicalId;
    delete entry.stoneId;

    if (textValue(entry.name) && resolvedNameId === null) {
      entry.name = textValue(entry.name);
      report.itemNamesPreserved += 1;
      report.unresolved.push({
        path: `${pathLabel}.name`,
        value: entry.name,
      });
    } else if ("name" in entry) {
      delete entry.name;
      report.itemNamesRemoved += 1;
    }
    return;
  }

  delete entry.id;
  delete entry.stoneId;

  if (resolvedNameId !== null) {
    entry.id = resolvedNameId;
    delete entry.name;
    report.itemNamesConverted += 1;
    return;
  }

  const name = textValue(entry.name);
  if (name) {
    entry.name = name;
    report.itemNamesPreserved += 1;
    report.unresolved.push({
      path: `${pathLabel}.name`,
      value: name,
    });
  } else if ("name" in entry) {
    delete entry.name;
    report.itemNamesRemoved += 1;
  }
}

function migrateItems(items, pathLabel, maps, report) {
  if (!Array.isArray(items)) return;
  items.forEach((playerItems, playerIndex) => {
    if (!Array.isArray(playerItems)) return;
    playerItems.forEach((entry, itemIndex) => {
      migrateItemEntry(
        entry,
        `${pathLabel}[${playerIndex}][${itemIndex}]`,
        maps,
        report,
      );
    });
  });
}

function mergeLegacyStonesIntoItems(state, report) {
  if (!Array.isArray(state.stones)) return;

  if (!Array.isArray(state.items)) {
    state.items = state.stones;
    report.legacyStoneListsMigrated += 1;
    delete state.stones;
    return;
  }

  state.stones.forEach((playerStones, playerIndex) => {
    if (!Array.isArray(playerStones) || playerStones.length === 0) return;
    const playerItems = Array.isArray(state.items[playerIndex])
      ? state.items[playerIndex]
      : [];
    state.items[playerIndex] = [...playerItems, ...playerStones];
  });
  report.legacyStoneListsMerged += 1;
  delete state.stones;
}

function migrateTrackerState(state, pathLabel, maps, report) {
  if (!isObject(state)) return;

  mergeLegacyStonesIntoItems(state, report);
  migrateItems(state.items, `${pathLabel}.items`, maps, report);
}

function migrateDatabaseExport(database, maps) {
  const report = createReport();
  const trackers = database?.trackers;

  if (!isObject(trackers)) {
    return report;
  }

  Object.entries(trackers).forEach(([trackerId, tracker]) => {
    if (!isObject(tracker)) return;
    report.trackersVisited += 1;
    migrateTrackerState(
      tracker.state,
      `trackers.${trackerId}.state`,
      maps,
      report,
    );
  });

  return report;
}

function printReport(report, duplicateCount) {
  console.log("Item name to id migration report");
  console.log("--------------------------------");
  console.log(`Trackers visited:          ${report.trackersVisited}`);
  console.log(`Legacy stone lists moved:  ${report.legacyStoneListsMigrated}`);
  console.log(`Legacy stone lists merged: ${report.legacyStoneListsMerged}`);
  console.log(`Items visited:             ${report.itemsVisited}`);
  console.log(`Item ids canonicalized:    ${report.itemIdsCanonicalized}`);
  console.log(`Stone ids converted:       ${report.stoneIdsConverted}`);
  console.log(`Item names converted:      ${report.itemNamesConverted}`);
  console.log(`Item names removed:        ${report.itemNamesRemoved}`);
  console.log(`Item names preserved:      ${report.itemNamesPreserved}`);
  console.log(`Unresolved names:          ${report.unresolved.length}`);
  if (duplicateCount > 0) {
    console.log(`Duplicate name keys:       ${duplicateCount}`);
  }

  if (report.unresolved.length > 0) {
    console.log("");
    console.log("Unresolved entries:");
    report.unresolved.forEach((entry) => {
      console.log(`- ${entry.path}: ${entry.value}`);
    });
  }
}

async function main() {
  const { inputPath, outputPath, options } = parseArgs(process.argv.slice(2));

  if (options.help || !inputPath || (!outputPath && !options.dryRun)) {
    printUsage();
    process.exit(options.help ? 0 : 1);
  }

  const resolvedInput = path.resolve(process.cwd(), inputPath);
  const resolvedOutput = outputPath
    ? path.resolve(process.cwd(), outputPath)
    : null;

  if (
    resolvedOutput &&
    resolvedInput === resolvedOutput &&
    !options.inPlace &&
    !options.dryRun
  ) {
    throw new Error(
      "Refusing to overwrite the input file. Pass --in-place if this is intentional.",
    );
  }

  const [maps, rawDatabase] = await Promise.all([
    loadItemNameMap(),
    inputPath === "-" ? readStdin() : readFile(resolvedInput, "utf8"),
  ]);
  const database = JSON.parse(rawDatabase);
  const report = migrateDatabaseExport(database, maps);
  printReport(report, maps.duplicates.size);

  if (report.unresolved.length > 0 && options.failOnUnresolved) {
    console.error("");
    console.error("Migration aborted because unresolved names were found.");
    process.exit(2);
  }

  if (options.dryRun) {
    return;
  }

  await writeFile(resolvedOutput, `${JSON.stringify(database, null, 2)}\n`);
  console.log("");
  console.log(`Wrote migrated export to ${resolvedOutput}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
