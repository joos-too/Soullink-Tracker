#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const locationDataPath = path.resolve(__dirname, "../src/data/locations.ts");

const DEFAULT_GAME_VERSION_ID = "gen5_bw";

const VERSION_REGION_MAP = {
  gen1_rb: ["kanto"],
  gen1_y: ["kanto"],
  gen3_frlg: ["kanto"],
  gen2_gs: ["johto", "kanto"],
  gen2_c: ["johto", "kanto"],
  gen4_hgss: ["johto", "kanto"],
  gen3_rusa: ["hoenn"],
  gen3_em: ["hoenn"],
  gen6_oras: ["hoenn"],
  gen5_bw: ["unova"],
  gen5_b2w2: ["unova"],
  gen6_xy: ["kalos"],
  gen4_dp: ["sinnoh"],
  gen4_pt: ["sinnoh"],
};

const FOSSIL_NAMES = {
  "helix-fossil": ["Helixfossil", "Helix Fossil"],
  "dome-fossil": ["Domfossil", "Dome Fossil"],
  "old-amber": ["Altbernstein", "Old Amber"],
  "root-fossil": ["Wurzelfossil", "Root Fossil"],
  "claw-fossil": ["Klauenfossil", "Claw Fossil"],
  "skull-fossil": ["Kopffossil", "Skull Fossil"],
  "armor-fossil": ["Panzerfossil", "Armor Fossil"],
  "cover-fossil": ["Federfossil", "Cover Fossil"],
  "plume-fossil": ["Schildfossil", "Plume Fossil"],
  "jaw-fossil": ["Kieferfossil", "Jaw Fossil"],
  "sail-fossil": ["Flossenfossil", "Sail Fossil"],
};

function printUsage() {
  console.log(`Usage:
  node scripts/migrate-location-names-to-slugs.mjs <input.json> <output.json> [options]

Options:
  --dry-run             Print the migration report without writing output.
  --fail-on-unresolved  Exit without writing if any Location name cannot be resolved.
  --in-place            Allow output.json to be the same file as input.json.

Use "-" as input.json to read a Firebase export from stdin.

Examples:
  node scripts/migrate-location-names-to-slugs.mjs firebase-export.json firebase-export.migrated.json
  node scripts/migrate-location-names-to-slugs.mjs firebase-export.json firebase-export.migrated.json --fail-on-unresolved
  node scripts/migrate-location-names-to-slugs.mjs firebase-export.json ignored.json --dry-run
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

function findAssignedLiteral(source, constName) {
  const declaration = `export const ${constName}`;
  const declarationIndex = source.indexOf(declaration);
  if (declarationIndex === -1) {
    throw new Error(`Could not find ${constName} in ${locationDataPath}`);
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

async function loadLocationNameMap() {
  const source = await readFile(locationDataPath, "utf8");
  const literal = findAssignedLiteral(source, "LOCATIONS");
  const locationData = vm.runInNewContext(`(${literal})`, Object.create(null), {
    timeout: 1000,
  });
  const nameToLocations = new Map();
  const duplicates = new Map();

  Object.values(locationData).forEach((entry) => {
    const slug = typeof entry?.slug === "string" ? entry.slug : "";
    if (!slug) return;
    const location = {
      slug,
      region: typeof entry?.region === "string" ? entry.region : "",
    };
    Object.values(entry?.names ?? {}).forEach((name) => {
      if (typeof name !== "string" || !name.trim()) return;
      addLocationNameAlias(nameToLocations, duplicates, name, location);
      addLocationNameAlias(
        nameToLocations,
        duplicates,
        normalizeRouteDisplayName(name),
        location,
      );
    });
  });

  return { nameToLocations, duplicates };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function normalizeLocationName(name) {
  return name
    .trim()
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const SEA_ROUTE_PREFIX_REGEX = /^Sea\s+(?=Route\b)/i;

function normalizeRouteDisplayName(name) {
  return name.replace(SEA_ROUTE_PREFIX_REGEX, "");
}

function addLocationNameAlias(nameToLocations, duplicates, name, location) {
  if (typeof name !== "string" || !name.trim()) return;
  const key = normalizeLocationName(name);
  const existing = nameToLocations.get(key) ?? [];
  if (existing.some((entry) => entry.slug === location.slug)) return;

  const entries = [...existing, location];
  nameToLocations.set(key, entries);
  if (entries.length > 1) {
    duplicates.set(
      key,
      entries.map((entry) => entry.slug),
    );
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function createReport() {
  return {
    trackersVisited: 0,
    linksVisited: 0,
    legacyMembersVisited: 0,
    memberRoutesConverted: 0,
    memberRoutesRemoved: 0,
    memberRoutesPreserved: 0,
    routeFossilPairsConverted: 0,
    fossilsVisited: 0,
    fossilLocationsConverted: 0,
    fossilLocationsRemoved: 0,
    fossilLocationsPreserved: 0,
    itemsVisited: 0,
    itemLocationsConverted: 0,
    itemLocationsRemoved: 0,
    itemLocationsPreserved: 0,
    stonesVisited: 0,
    stoneLocationsConverted: 0,
    stoneLocationsRemoved: 0,
    stoneLocationsPreserved: 0,
    unresolved: [],
  };
}

function getRegionsForVersion(versionId) {
  const key =
    versionId && VERSION_REGION_MAP[versionId]
      ? versionId
      : DEFAULT_GAME_VERSION_ID;
  return new Set(VERSION_REGION_MAP[key] ?? []);
}

function createFossilNameMap() {
  const map = new Map();
  Object.entries(FOSSIL_NAMES).forEach(([slug, names]) => {
    map.set(normalizeLocationName(slug), slug);
    names.forEach((name) => map.set(normalizeLocationName(name), slug));
  });
  return map;
}

const FOSSIL_NAME_TO_SLUG = createFossilNameMap();

function resolveFossilPair(rawName) {
  const name = textValue(rawName);
  if (!name || !name.includes("/")) return null;

  const slugs = name.split("/").map((part) => {
    const key = normalizeLocationName(part);
    return FOSSIL_NAME_TO_SLUG.get(key) ?? null;
  });

  if (slugs.some((slug) => slug === null)) return null;
  return slugs;
}

function resolveSlugFromName(nameToLocations, rawName, allowedRegions) {
  const name = textValue(rawName);
  if (!name) return null;
  const entries = nameToLocations.get(normalizeLocationName(name)) ?? [];
  if (!entries.length) return null;

  const regionMatches = entries.filter(
    (entry) => entry.region && allowedRegions.has(entry.region),
  );
  const candidates = regionMatches.length ? regionMatches : entries;
  return candidates[0]?.slug ?? null;
}

function addUnresolved(report, path, value, nameToLocations) {
  const name = textValue(value);
  const entries = name
    ? (nameToLocations.get(normalizeLocationName(name)) ?? [])
    : [];
  const uniqueCandidates = [...new Set(entries.map((entry) => entry.slug))];
  if (uniqueCandidates.length > 1) {
    report.unresolved.push({
      path,
      value,
      candidates: uniqueCandidates,
    });
    return;
  }
  report.unresolved.push({ path, value });
}

function textValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function migrateRouteFields(
  entry,
  pathLabel,
  nameToLocations,
  allowedRegions,
  report,
) {
  if (!isObject(entry)) return;

  const rawName = textValue(entry.location) ?? textValue(entry.route);
  if (!rawName) {
    if ("location" in entry) {
      delete entry.location;
      report.memberRoutesRemoved += 1;
    }
    if ("route" in entry) {
      delete entry.route;
      report.memberRoutesRemoved += 1;
    }
    delete entry.routeSlug;
    return;
  }

  const fossilSlugs = resolveFossilPair(rawName);
  if (fossilSlugs !== null) {
    entry.locationSlug = null;
    entry.fossilSlugs = fossilSlugs;
    delete entry.location;
    delete entry.route;
    delete entry.routeSlug;
    report.routeFossilPairsConverted += 1;
    return;
  }

  const resolvedSlug = resolveSlugFromName(
    nameToLocations,
    rawName,
    allowedRegions,
  );
  if (resolvedSlug !== null) {
    entry.locationSlug = resolvedSlug;
    delete entry.fossilSlugs;
    delete entry.location;
    delete entry.route;
    delete entry.routeSlug;
    report.memberRoutesConverted += 1;
    return;
  }

  delete entry.routeSlug;
  delete entry.fossilSlugs;
  entry.locationSlug = null;
  entry.location = rawName;
  delete entry.route;
  report.memberRoutesPreserved += 1;
  addUnresolved(report, `${pathLabel}.location`, rawName, nameToLocations);
}

function migratePokemonMember(
  member,
  pathLabel,
  nameToLocations,
  allowedRegions,
  report,
) {
  if (!isObject(member)) return;
  report.legacyMembersVisited += 1;
  migrateRouteFields(
    member,
    pathLabel,
    nameToLocations,
    allowedRegions,
    report,
  );
}

function migrateMembers(
  container,
  pathLabel,
  nameToLocations,
  allowedRegions,
  report,
) {
  if (!isObject(container)) return;

  if (Array.isArray(container.members)) {
    container.members.forEach((member, index) => {
      migratePokemonMember(
        member,
        `${pathLabel}.members[${index}]`,
        nameToLocations,
        allowedRegions,
        report,
      );
    });
  }

  ["player1", "player2", "player3"].forEach((legacyKey) => {
    if (isObject(container[legacyKey])) {
      migratePokemonMember(
        container[legacyKey],
        `${pathLabel}.${legacyKey}`,
        nameToLocations,
        allowedRegions,
        report,
      );
    }
  });
}

function migratePokemonCollection(
  collection,
  pathLabel,
  nameToLocations,
  allowedRegions,
  report,
) {
  if (!Array.isArray(collection)) return;
  collection.forEach((link, index) => {
    if (!isObject(link)) return;
    report.linksVisited += 1;
    migrateRouteFields(
      link,
      `${pathLabel}[${index}]`,
      nameToLocations,
      allowedRegions,
      report,
    );
    migrateMembers(
      link,
      `${pathLabel}[${index}]`,
      nameToLocations,
      allowedRegions,
      report,
    );
  });
}

function migrateFossilEntry(
  entry,
  pathLabel,
  nameToLocations,
  allowedRegions,
  report,
) {
  if (!isObject(entry)) return;
  report.fossilsVisited += 1;

  const rawName = textValue(entry.location);
  if (!rawName) {
    if ("location" in entry) {
      delete entry.location;
      report.fossilLocationsRemoved += 1;
    }
    return;
  }
  delete entry.locationSlug;

  const resolvedSlug = resolveSlugFromName(
    nameToLocations,
    rawName,
    allowedRegions,
  );
  if (resolvedSlug !== null) {
    entry.locationSlug = resolvedSlug;
    delete entry.location;
    report.fossilLocationsConverted += 1;
    return;
  }

  delete entry.locationSlug;
  entry.location = rawName;
  report.fossilLocationsPreserved += 1;
  addUnresolved(report, `${pathLabel}.location`, rawName, nameToLocations);
}

function migrateItemEntry(
  entry,
  pathLabel,
  nameToLocations,
  allowedRegions,
  report,
) {
  if (!isObject(entry)) return;
  report.itemsVisited += 1;

  const rawName = textValue(entry.location);
  if (!rawName) {
    if ("location" in entry) {
      delete entry.location;
      report.itemLocationsRemoved += 1;
    }
    return;
  }
  delete entry.locationSlug;

  const resolvedSlug = resolveSlugFromName(
    nameToLocations,
    rawName,
    allowedRegions,
  );
  if (resolvedSlug !== null) {
    entry.locationSlug = resolvedSlug;
    delete entry.location;
    report.itemLocationsConverted += 1;
    return;
  }

  delete entry.locationSlug;
  entry.location = rawName;
  report.itemLocationsPreserved += 1;
  addUnresolved(report, `${pathLabel}.location`, rawName, nameToLocations);
}

function migrateItems(
  items,
  pathLabel,
  nameToLocations,
  allowedRegions,
  report,
) {
  if (!Array.isArray(items)) return;
  items.forEach((playerItems, playerIndex) => {
    if (!Array.isArray(playerItems)) return;
    playerItems.forEach((entry, itemIndex) => {
      migrateItemEntry(
        entry,
        `${pathLabel}[${playerIndex}][${itemIndex}]`,
        nameToLocations,
        allowedRegions,
        report,
      );
    });
  });
}

function migrateStoneEntry(
  entry,
  pathLabel,
  nameToLocations,
  allowedRegions,
  report,
) {
  if (!isObject(entry)) return;
  report.stonesVisited += 1;

  const rawName = textValue(entry.location);
  if (!rawName) {
    if ("location" in entry) {
      delete entry.location;
      report.stoneLocationsRemoved += 1;
    }
    return;
  }
  delete entry.locationSlug;

  const resolvedSlug = resolveSlugFromName(
    nameToLocations,
    rawName,
    allowedRegions,
  );
  if (resolvedSlug !== null) {
    entry.locationSlug = resolvedSlug;
    delete entry.location;
    report.stoneLocationsConverted += 1;
    return;
  }

  delete entry.locationSlug;
  entry.location = rawName;
  report.stoneLocationsPreserved += 1;
  addUnresolved(report, `${pathLabel}.location`, rawName, nameToLocations);
}

function migrateStones(
  stones,
  pathLabel,
  nameToLocations,
  allowedRegions,
  report,
) {
  if (!Array.isArray(stones)) return;
  stones.forEach((playerStones, playerIndex) => {
    if (!Array.isArray(playerStones)) return;
    playerStones.forEach((entry, stoneIndex) => {
      migrateStoneEntry(
        entry,
        `${pathLabel}[${playerIndex}][${stoneIndex}]`,
        nameToLocations,
        allowedRegions,
        report,
      );
    });
  });
}

function migrateFossils(
  fossils,
  pathLabel,
  nameToLocations,
  allowedRegions,
  report,
) {
  if (!Array.isArray(fossils)) return;
  fossils.forEach((playerFossils, playerIndex) => {
    if (!Array.isArray(playerFossils)) return;
    playerFossils.forEach((entry, fossilIndex) => {
      migrateFossilEntry(
        entry,
        `${pathLabel}[${playerIndex}][${fossilIndex}]`,
        nameToLocations,
        allowedRegions,
        report,
      );
    });
  });
}

function migrateTrackerState(
  state,
  pathLabel,
  nameToLocations,
  allowedRegions,
  report,
) {
  if (!isObject(state)) return;

  migratePokemonCollection(
    state.team,
    `${pathLabel}.team`,
    nameToLocations,
    allowedRegions,
    report,
  );
  migratePokemonCollection(
    state.box,
    `${pathLabel}.box`,
    nameToLocations,
    allowedRegions,
    report,
  );
  migratePokemonCollection(
    state.graveyard,
    `${pathLabel}.graveyard`,
    nameToLocations,
    allowedRegions,
    report,
  );
  migrateFossils(
    state.fossils,
    `${pathLabel}.fossils`,
    nameToLocations,
    allowedRegions,
    report,
  );
  migrateItems(
    state.items,
    `${pathLabel}.items`,
    nameToLocations,
    allowedRegions,
    report,
  );
  migrateStones(
    state.stones,
    `${pathLabel}.stones`,
    nameToLocations,
    allowedRegions,
    report,
  );
}

function migrateDatabaseExport(database, nameToLocations) {
  const report = createReport();
  const trackers = database?.trackers;

  if (!isObject(trackers)) {
    return report;
  }

  Object.entries(trackers).forEach(([trackerId, tracker]) => {
    if (!isObject(tracker)) return;
    report.trackersVisited += 1;
    const allowedRegions = getRegionsForVersion(tracker.meta?.gameVersionId);
    migrateTrackerState(
      tracker.state,
      `trackers.${trackerId}.state`,
      nameToLocations,
      allowedRegions,
      report,
    );
  });

  return report;
}

function printReport(report, duplicateCount) {
  console.log("Location name to slug migration report");
  console.log("--------------------------------------");
  console.log(`Trackers visited:       ${report.trackersVisited}`);
  console.log(`Links visited:          ${report.linksVisited}`);
  console.log(`Legacy members visited: ${report.legacyMembersVisited}`);
  console.log(`Routes converted:       ${report.memberRoutesConverted}`);
  console.log(
    `Route fossil pairs converted: ${report.routeFossilPairsConverted}`,
  );
  console.log(`Routes removed:         ${report.memberRoutesRemoved}`);
  console.log(`Routes preserved:       ${report.memberRoutesPreserved}`);
  console.log(`Fossils visited:        ${report.fossilsVisited}`);
  console.log(`Fossil locations converted: ${report.fossilLocationsConverted}`);
  console.log(`Fossil locations removed:   ${report.fossilLocationsRemoved}`);
  console.log(`Fossil locations preserved: ${report.fossilLocationsPreserved}`);
  console.log(`Items visited:          ${report.itemsVisited}`);
  console.log(`Item locations converted: ${report.itemLocationsConverted}`);
  console.log(`Item locations removed:   ${report.itemLocationsRemoved}`);
  console.log(`Item locations preserved: ${report.itemLocationsPreserved}`);
  console.log(`Stones visited:         ${report.stonesVisited}`);
  console.log(`Stone locations converted: ${report.stoneLocationsConverted}`);
  console.log(`Stone locations removed:   ${report.stoneLocationsRemoved}`);
  console.log(`Stone locations preserved: ${report.stoneLocationsPreserved}`);
  console.log(`Unresolved names:       ${report.unresolved.length}`);
  if (duplicateCount > 0) {
    console.log(`Duplicate name keys:    ${duplicateCount}`);
  }

  if (report.unresolved.length > 0) {
    console.log("");
    console.log("Unresolved entries:");
    report.unresolved.forEach((entry) => {
      const suffix = entry.candidates?.length
        ? ` (candidates: ${entry.candidates.join(", ")})`
        : "";
      console.log(`- ${entry.path}: ${entry.value}${suffix}`);
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

  const [{ nameToLocations, duplicates }, rawDatabase] = await Promise.all([
    loadLocationNameMap(),
    inputPath === "-" ? readStdin() : readFile(resolvedInput, "utf8"),
  ]);
  console.log(nameToLocations.size, "location names loaded");
  const database = JSON.parse(rawDatabase);
  const report = migrateDatabaseExport(database, nameToLocations);
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
