#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pokemonDataPath = path.resolve(__dirname, "../src/data/pokemon.ts");

function printUsage() {
  console.log(`Usage:
  node scripts/migrate-pokemon-names-to-ids.mjs <input.json> <output.json> [options]

Options:
  --dry-run             Print the migration report without writing output.
  --fail-on-unresolved  Exit without writing if any Pokemon name cannot be resolved.
  --in-place            Allow output.json to be the same file as input.json.

Use "-" as input.json to read a Firebase export from stdin.

Examples:
  node scripts/migrate-pokemon-names-to-ids.mjs firebase-export.json firebase-export.migrated.json
  node scripts/migrate-pokemon-names-to-ids.mjs firebase-export.json firebase-export.migrated.json --fail-on-unresolved
  node scripts/migrate-pokemon-names-to-ids.mjs firebase-export.json ignored.json --dry-run
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

function findAssignedObjectLiteral(source, constName) {
  const declaration = `export const ${constName}`;
  const declarationIndex = source.indexOf(declaration);
  if (declarationIndex === -1) {
    throw new Error(`Could not find ${constName} in ${pokemonDataPath}`);
  }

  const equalsIndex = source.indexOf("=", declarationIndex);
  const objectStart = source.indexOf("{", equalsIndex);
  if (equalsIndex === -1 || objectStart === -1) {
    throw new Error(`Could not find ${constName} object literal`);
  }

  let depth = 0;
  let stringQuote = null;
  let escaped = false;

  for (let i = objectStart; i < source.length; i += 1) {
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

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(objectStart, i + 1);
      }
    }
  }

  throw new Error(`Could not parse ${constName} object literal`);
}

async function loadPokemonNameMap() {
  const source = await readFile(pokemonDataPath, "utf8");
  const literal = findAssignedObjectLiteral(source, "POKEMON_DATA");
  const pokemonData = vm.runInNewContext(`(${literal})`, Object.create(null), {
    timeout: 1000,
  });
  const nameToId = new Map();
  const duplicates = new Map();

  Object.values(pokemonData).forEach((entry) => {
    const id = Number(entry?.id);
    if (!Number.isFinite(id) || id <= 0) return;
    Object.values(entry?.names ?? {}).forEach((name) => {
      if (typeof name !== "string" || !name.trim()) return;
      const key = normalizePokemonName(name);
      const existing = nameToId.get(key);
      if (existing && existing !== id) {
        duplicates.set(key, [...(duplicates.get(key) ?? [existing]), id]);
        return;
      }
      nameToId.set(key, id);
    });
  });

  return { nameToId, duplicates };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function normalizePokemonName(name) {
  return name.trim().toLocaleLowerCase("de-DE");
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function positiveInteger(value) {
  const numeric = Number(value);
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function createReport() {
  return {
    trackersVisited: 0,
    membersVisited: 0,
    memberNamesConverted: 0,
    memberNamesRemoved: 0,
    memberNamesPreserved: 0,
    fossilsVisited: 0,
    fossilNamesConverted: 0,
    fossilNamesRemoved: 0,
    fossilNamesPreserved: 0,
    unresolved: [],
  };
}

function resolveName(nameToId, rawName) {
  if (typeof rawName !== "string" || !rawName.trim()) return null;
  return nameToId.get(normalizePokemonName(rawName)) ?? null;
}

function textValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function unresolvedNameCandidate(...values) {
  for (const value of values) {
    const text = textValue(value);
    if (text && positiveInteger(text) === null) return text;
  }
  return null;
}

function migratePokemonMember(member, pathLabel, nameToId, report) {
  if (!isObject(member)) return;
  report.membersVisited += 1;

  const currentId = positiveInteger(member.id ?? member.pokemonId);
  if (currentId !== null) {
    member.id = currentId;
    delete member.pokemonId;
    const name = textValue(member.name);
    const resolvedNameId = resolveName(nameToId, name);
    if (name && resolvedNameId === null) {
      member.name = name;
      report.memberNamesPreserved += 1;
    } else if ("name" in member) {
      delete member.name;
      report.memberNamesRemoved += 1;
    }
    return;
  }

  const rawName = unresolvedNameCandidate(
    member.name,
    member.id,
    member.pokemonId,
  );
  delete member.id;
  delete member.pokemonId;
  if (!rawName) {
    if ("name" in member) {
      delete member.name;
      report.memberNamesRemoved += 1;
    }
    return;
  }

  const resolvedId = resolveName(nameToId, rawName);
  if (resolvedId !== null) {
    member.id = resolvedId;
    delete member.name;
    report.memberNamesConverted += 1;
    return;
  }

  member.id = null;
  member.name = rawName;
  report.memberNamesPreserved += 1;
  report.unresolved.push({
    path: `${pathLabel}.name`,
    value: rawName,
  });
}

function migrateMembers(container, pathLabel, nameToId, report) {
  if (!isObject(container)) return;

  if (Array.isArray(container.members)) {
    container.members.forEach((member, index) => {
      migratePokemonMember(
        member,
        `${pathLabel}.members[${index}]`,
        nameToId,
        report,
      );
    });
  }

  ["player1", "player2", "player3"].forEach((legacyKey) => {
    if (isObject(container[legacyKey])) {
      migratePokemonMember(
        container[legacyKey],
        `${pathLabel}.${legacyKey}`,
        nameToId,
        report,
      );
    }
  });
}

function migratePokemonCollection(collection, pathLabel, nameToId, report) {
  if (!Array.isArray(collection)) return;
  collection.forEach((link, index) => {
    migrateMembers(link, `${pathLabel}[${index}]`, nameToId, report);
  });
}

function migrateFossilEntry(entry, pathLabel, nameToId, report) {
  if (!isObject(entry)) return;
  report.fossilsVisited += 1;

  const currentId = positiveInteger(entry.pokemonId);
  if (currentId !== null) {
    entry.pokemonId = currentId;
    const pokemonName = textValue(entry.pokemonName);
    const resolvedNameId = resolveName(nameToId, pokemonName);
    if (pokemonName && resolvedNameId === null) {
      entry.pokemonName = pokemonName;
      report.fossilNamesPreserved += 1;
    } else if ("pokemonName" in entry) {
      delete entry.pokemonName;
      report.fossilNamesRemoved += 1;
    }
    return;
  }

  const rawName = unresolvedNameCandidate(entry.pokemonName, entry.pokemonId);
  delete entry.pokemonId;
  if (!rawName) {
    if ("pokemonName" in entry) {
      delete entry.pokemonName;
      report.fossilNamesRemoved += 1;
    }
    return;
  }

  const resolvedId = resolveName(nameToId, rawName);
  if (resolvedId !== null) {
    entry.pokemonId = resolvedId;
    delete entry.pokemonName;
    report.fossilNamesConverted += 1;
    return;
  }

  entry.pokemonId = null;
  entry.pokemonName = rawName;
  report.fossilNamesPreserved += 1;
  report.unresolved.push({
    path: `${pathLabel}.pokemonName`,
    value: rawName,
  });
}

function migrateFossils(fossils, pathLabel, nameToId, report) {
  if (!Array.isArray(fossils)) return;
  fossils.forEach((playerFossils, playerIndex) => {
    if (!Array.isArray(playerFossils)) return;
    playerFossils.forEach((entry, fossilIndex) => {
      migrateFossilEntry(
        entry,
        `${pathLabel}[${playerIndex}][${fossilIndex}]`,
        nameToId,
        report,
      );
    });
  });
}

function migrateTrackerState(state, pathLabel, nameToId, report) {
  if (!isObject(state)) return;

  migratePokemonCollection(state.team, `${pathLabel}.team`, nameToId, report);
  migratePokemonCollection(state.box, `${pathLabel}.box`, nameToId, report);
  migratePokemonCollection(
    state.graveyard,
    `${pathLabel}.graveyard`,
    nameToId,
    report,
  );
  migrateFossils(state.fossils, `${pathLabel}.fossils`, nameToId, report);
}

function migrateDatabaseExport(database, nameToId) {
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
      nameToId,
      report,
    );
  });

  return report;
}

function printReport(report, duplicateCount) {
  console.log("Pokemon name to id migration report");
  console.log("-----------------------------------");
  console.log(`Trackers visited:       ${report.trackersVisited}`);
  console.log(`Members visited:        ${report.membersVisited}`);
  console.log(`Member names converted: ${report.memberNamesConverted}`);
  console.log(`Member names removed:   ${report.memberNamesRemoved}`);
  console.log(`Member names preserved: ${report.memberNamesPreserved}`);
  console.log(`Fossils visited:        ${report.fossilsVisited}`);
  console.log(`Fossil names converted: ${report.fossilNamesConverted}`);
  console.log(`Fossil names removed:   ${report.fossilNamesRemoved}`);
  console.log(`Fossil names preserved: ${report.fossilNamesPreserved}`);
  console.log(`Unresolved names:       ${report.unresolved.length}`);
  if (duplicateCount > 0) {
    console.log(`Duplicate name keys:    ${duplicateCount}`);
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

  const [{ nameToId, duplicates }, rawDatabase] = await Promise.all([
    loadPokemonNameMap(),
    inputPath === "-" ? readStdin() : readFile(resolvedInput, "utf8"),
  ]);
  const database = JSON.parse(rawDatabase);
  const report = migrateDatabaseExport(database, nameToId);
  printReport(report, duplicates.size);

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
