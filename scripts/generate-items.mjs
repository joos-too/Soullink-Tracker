/**
 * generate-items.mjs
 *
 * Fetches every item from PokeAPI, applying pocket/category/slug exclusions,
 * matches them against the local Itemlists/version-files/ files to determine the
 * earliest game version each item appeared in, then fetches the properly
 * cased English and German names from the API.
 *
 * The version files also provide the name of each item per game. Items that
 * were renamed get `versionNames` (the name from each version on which it
 * changed) and `aliases` (every other known name, used for search).
 *
 * Output format per item:
 *   { slug, de, en, version, pocket, categories, aliases?, versionNames? }
 *
 * Usage: node scripts/generate-items.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createStaticPokeApiClient } from "./pokeapi-static-client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const versionFilesDir = path.join(
  __dirname,
  "itemlists-source",
  "version-files",
);
const debugDir = path.join(__dirname, "itemlists-source", "debug");
const outPath = path.join(__dirname, "..", "src", "data", "items.ts");
const DEBUG_SLOW_REQUEST_MS = 10000;

// ---------------------------------------------------------------------------
// Version ordering for discovered files. Unknown future labels fall back to
// filename sorting within the generation.
// ---------------------------------------------------------------------------
const VERSION_RELEASE_ORDER = [
  "RBY",
  "GS",
  "C",
  "RUSA",
  "FRLG",
  "EM",
  "DP",
  "PT",
  "HGSS",
  "BW",
  "B2W2",
  "XY",
  "ORAS",
  "SM",
  "USUM",
  "LGPLGE",
  "SWSH",
  "BDSP",
  "PLA",
  "SCVI",
  "PLZA",
];

// ---------------------------------------------------------------------------
// 2. Manual overrides for known mismatches.
// ---------------------------------------------------------------------------
const MANUAL_MATCH_OVERRIDES = {
  "paralyze-heal": "parlyz heal",
};

const MANUAL_LOCAL_SLUG_OVERRIDES = {
  "<sup>p</sup>o<sup>k</sup>éblock case": "pokeblock-case",
};

// Current names that are wrong in PokeAPI. Remove once fixed upstream.
// Format: { [slug]: { de?: string, en?: string } }
const MANUAL_NAME_OVERRIDES = {
  // PokeAPI lists the French name as German name
  meowsticite: { de: "Psiaugonit" },
  // PokeAPI misses the hyphen
  "fresh-start-mochi": { en: "Fresh-Start Mochi" },
};

// Additional search names that the version files do not contain.
// Format: { [slug]: { de?: string[], en?: string[] } }
const MANUAL_ALIASES = {
  // Spelling used by PokeAPI
  "fresh-start-mochi": { en: ["Fresh Start Mochi"] },
};

const LANGUAGES = ["de", "en"];

// Excluded pockets
const EXCLUDED_POCKETS = new Set(["key", "mail"]);

// Excluded categories: https://pokeapi.co/api/v2/item-category/
const EXCLUDED_CATEGORIES = new Set(["stat-boosts", "jewels"]);

// Excluded slugs — exact matches
const EXCLUDED_SLUGS = new Set([
  "lapoke-ball",
  "lagreat-ball",
  "laultra-ball",
  "laheavy-ball",
  "revive",
  "max-revive",
]);

// Excluded slug patterns — predicate functions checked against each slug
const EXCLUDED_SLUG_PATTERNS = [
  (slug) => slug.endsWith("-wing"),
  (slug) => slug.startsWith("dire-hit"),
  (slug) => slug.startsWith("x-"),
  (slug) => slug.startsWith("dynamax-"),
];

/** Check whether a slug should be excluded */
function isSlugExcluded(slug) {
  return (
    EXCLUDED_SLUGS.has(slug) || EXCLUDED_SLUG_PATTERNS.some((fn) => fn(slug))
  );
}

function serializeApiFilterEntry(entry) {
  return {
    pocket: entry.pocket,
    categories: Array.from(entry.categories).sort(),
    reasons: Array.from(entry.reasons).sort(),
  };
}

function addApiFilteredItem(map, slug, reason, details = {}) {
  if (!slug) return;
  const entry = map.get(slug) || {
    slug,
    pocket: details.pocket || "",
    categories: new Set(),
    reasons: new Set(),
  };
  if (details.pocket && !entry.pocket) entry.pocket = details.pocket;
  if (details.category) entry.categories.add(details.category);
  entry.reasons.add(reason);
  map.set(slug, entry);
}

function serializeFilteredItems(map) {
  return Array.from(map.values())
    .map((entry) => ({
      slug: entry.slug,
      ...serializeApiFilterEntry(entry),
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

// ---------------------------------------------------------------------------
// 3. Helpers
// ---------------------------------------------------------------------------

/** Normalize an English item name to a PokeAPI-style slug */
function toSlug(en) {
  return en
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-") // non-alphanum → hyphen
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens
}

/** Collapse a slug/name to only alphanumeric chars (no hyphens/spaces) */
function toCollapsed(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeLocalNameCapitalization(name) {
  return name
    .toLowerCase()
    .split(/([\s/.-]+)/)
    .map((part) => {
      if (!part || /^[\s/.-]+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

/** Match key for version file rows that keeps Nidoran ♂/♀ items apart */
function toNameMatchKey(name) {
  return toCollapsed(name.replace(/♂/g, "m").replace(/♀/g, "f"));
}

/** Compare key that ignores case, apostrophe style and ß/ss */
function toNameKey(name) {
  return name
    .toLowerCase()
    .replace(/ß/g, "ss")
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Gen 1-3 names are listed in capitals */
function isAllCaps(name) {
  return /\p{Lu}/u.test(name) && name === name.toUpperCase();
}

function getManualLocalSlug(name) {
  return MANUAL_LOCAL_SLUG_OVERRIDES[name.trim().toLowerCase()] || null;
}

function parseVersionFileName(file) {
  const match = file.match(/^Gen(\d+)\s+(.+?)\s*\(/);
  if (!match) return null;
  return {
    file,
    filePath: path.join(versionFilesDir, file),
    generation: Number(match[1]),
    version: match[2].trim(),
  };
}

function loadVersionFiles() {
  if (!fs.existsSync(versionFilesDir)) {
    throw new Error(`Missing version files directory: ${versionFilesDir}`);
  }

  const orderIndex = new Map(
    VERSION_RELEASE_ORDER.map((version, index) => [version, index]),
  );
  return fs
    .readdirSync(versionFilesDir)
    .filter((file) => file.endsWith(".txt"))
    .map((file) => {
      const entry = parseVersionFileName(file);
      if (!entry) {
        console.warn(`  ⚠ Could not parse version from ${file}, skipping`);
      }
      return entry;
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.generation !== b.generation) return a.generation - b.generation;
      const aIndex = orderIndex.get(a.version) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = orderIndex.get(b.version) ?? Number.MAX_SAFE_INTEGER;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.file.localeCompare(b.file);
    })
    .map((entry) => ({
      ...entry,
      items: parseVersionFileItems(entry.filePath),
    }));
}

function parseVersionFileItems(filePath) {
  const items = [];
  const seen = new Set();
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const deMatch = line.match(/\|de=([^|}]+)/);
    const enMatch = line.match(/\|en=([^|}]+)/);
    if (!deMatch || !enMatch) continue;
    const rawDe = deMatch[1].trim();
    const rawEn = enMatch[1].trim();
    const de = normalizeLocalNameCapitalization(rawDe);
    const en = normalizeLocalNameCapitalization(rawEn);
    const key = `${de.toLowerCase()}|||${en.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ slug: getManualLocalSlug(rawEn), de, en, rawDe, rawEn });
  }
  return items;
}

const createPokedexClient = () => createStaticPokeApiClient();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withRetry(fn, attempts = 3, delayMs = 500, label = "request") {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    const startedAt = Date.now();
    try {
      const result = await fn();
      const elapsed = Date.now() - startedAt;
      if (elapsed >= DEBUG_SLOW_REQUEST_MS) {
        console.warn(`  ⚠ Slow ${label}: ${elapsed}ms`);
      }
      return result;
    } catch (err) {
      lastError = err;
      console.warn(
        `  ⚠ ${label} failed attempt ${i + 1}/${attempts}: ${err?.message || err}`,
      );
      if (i < attempts - 1) {
        await sleep(delayMs * (i + 1));
      }
    }
  }
  throw lastError;
}

// ---------------------------------------------------------------------------
// 4. Build local lookup maps
// ---------------------------------------------------------------------------

/** slug → item metadata  (first occurrence wins)
 *  Also registers collapsed forms (no hyphens/spaces) as secondary keys. */
function buildLocalData(versionFiles) {
  const lookup = new Map();
  for (const { version, items } of versionFiles) {
    for (const item of items) {
      const slug = item.slug || toSlug(item.en);
      const collapsed = toCollapsed(item.en);
      const entry = { slug, version, de: item.de, en: item.en };
      if (!lookup.has(slug)) {
        lookup.set(slug, entry);
      }
      if (!lookup.has(collapsed)) {
        lookup.set(collapsed, entry);
      }
    }
  }
  return { lookup };
}

function resolveLocalMatch(localMap, versionOrder, slug, collapsed) {
  const slugEntry = localMap.get(slug) ?? null;
  const collapsedEntry = localMap.get(collapsed) ?? null;

  if (slugEntry && collapsedEntry) {
    const slugIdx = versionOrder.indexOf(slugEntry.version);
    const collIdx = versionOrder.indexOf(collapsedEntry.version);
    return collIdx < slugIdx
      ? { entry: collapsedEntry, wasFuzzy: true }
      : { entry: slugEntry, wasFuzzy: false };
  }
  if (slugEntry) return { entry: slugEntry, wasFuzzy: false };
  if (collapsedEntry) return { entry: collapsedEntry, wasFuzzy: true };
  return { entry: null, wasFuzzy: false };
}

/** English and German names from PokeAPI, `null` where PokeAPI has none */
async function resolveItemNames(P, slug, attempts = 5) {
  try {
    const itemData = await withRetry(
      () => P.getItemByName(slug),
      attempts,
      800,
      `item:${slug}`,
    );
    const findName = (lang) =>
      itemData.names.find((n) => n.language.name === lang)?.name ?? null;
    return { de: findName("de"), en: findName("en") };
  } catch {
    console.warn(`  ⚠ Could not read names for ${slug}`);
    return { de: null, en: null };
  }
}

// ---------------------------------------------------------------------------
// 5. Names per game version
// ---------------------------------------------------------------------------

/** Map version file name keys to result slugs, dropping ambiguous keys */
function buildNameMatchMap(results) {
  const map = new Map();
  const ambiguous = new Set();
  const register = (key, slug) => {
    if (!key || ambiguous.has(key)) return;
    const existing = map.get(key);
    if (existing && existing !== slug) {
      map.delete(key);
      ambiguous.add(key);
      return;
    }
    map.set(key, slug);
  };
  for (const item of results) {
    register(toNameMatchKey(item.slug), item.slug);
    if (item.apiNames.en) {
      register(toNameMatchKey(item.apiNames.en), item.slug);
    }
    if (MANUAL_MATCH_OVERRIDES[item.slug]) {
      register(toNameMatchKey(MANUAL_MATCH_OVERRIDES[item.slug]), item.slug);
    }
  }
  return { map, ambiguous: Array.from(ambiguous).sort() };
}

/** Raw version file names per slug: Map<slug, { de: [], en: [] }> */
function collectLocalNames(results, versionFiles) {
  const { map, ambiguous } = buildNameMatchMap(results);
  const names = new Map();
  versionFiles.forEach(({ version, items }, versionIdx) => {
    for (const row of items) {
      const slug = row.slug ?? map.get(toNameMatchKey(row.rawEn));
      if (!slug) continue;
      if (!names.has(slug)) names.set(slug, { de: [], en: [] });
      const entry = names.get(slug);
      entry.de.push({ version, versionIdx, name: row.rawDe });
      entry.en.push({ version, versionIdx, name: row.rawEn });
    }
  });
  return { names, ambiguous };
}

/**
 * Restore the casing of capitalized names from the closest version that
 * spells the same name in regular case.
 */
function resolveCapitalization(row, candidates) {
  if (!isAllCaps(row.name)) return row.name;
  const key = toNameKey(row.name).replace(/\s/g, "");
  const matches = candidates.filter(
    (c) => toNameKey(c.name).replace(/\s/g, "") === key,
  );
  const match =
    matches.find((c) => c.versionIdx > row.versionIdx) ?? matches.at(-1);
  return match ? match.name : normalizeLocalNameCapitalization(row.name);
}

/**
 * One name per version, preferring the API spelling when they only differ in
 * style. Version files are ordered by internal item ID, so the first row of a
 * version is the item itself; later rows with the same English name are
 * game-specific variants (e.g. the Legends: Arceus items kept in later games).
 */
function resolveLocalNamesByVersion(rows, apiName, conflicts, slug, lang) {
  const candidates = rows
    .filter((row) => !isAllCaps(row.name))
    .sort((a, b) => a.versionIdx - b.versionIdx);
  if (apiName) {
    candidates.push({ versionIdx: Number.MAX_SAFE_INTEGER, name: apiName });
  }

  const byVersion = new Map();
  for (const row of rows) {
    let name = resolveCapitalization(row, candidates);
    if (apiName && toNameKey(name) === toNameKey(apiName)) name = apiName;
    const existing = byVersion.get(row.versionIdx);
    if (!existing) {
      byVersion.set(row.versionIdx, { version: row.version, name });
    } else if (existing.name !== name) {
      conflicts.push({
        slug,
        lang,
        version: row.version,
        names: [existing.name, name],
      });
    }
  }
  return Array.from(byVersion.entries())
    .sort(([a], [b]) => a - b)
    .map(([, entry]) => entry);
}

/**
 * Fill missing API names from the version files and add `aliases` and
 * `versionNames` to items that were renamed between versions.
 */
function applyLocalNames(results, versionFiles) {
  const { names, ambiguous } = collectLocalNames(results, versionFiles);
  const conflicts = [];
  const apiMismatches = [];

  for (const item of results) {
    const local = names.get(item.slug) ?? { de: [], en: [] };
    const aliases = {};
    const versionNames = {};

    for (const lang of LANGUAGES) {
      const apiName = item.apiNames[lang];
      const currentName = MANUAL_NAME_OVERRIDES[item.slug]?.[lang] ?? apiName;
      const byVersion = resolveLocalNamesByVersion(
        local[lang],
        currentName,
        conflicts,
        item.slug,
        lang,
      );
      const latest = byVersion.at(-1);

      if (
        latest &&
        latest.name.replace(/'/g, "’") !== apiName?.replace(/'/g, "’")
      ) {
        apiMismatches.push({
          slug: item.slug,
          lang,
          api: apiName,
          local: latest.name,
          localVersion: latest.version,
        });
      }

      const name =
        currentName ??
        latest?.name ??
        item.localItem?.[lang] ??
        (lang === "de" ? item.apiNames.en : null) ??
        item.slug;
      item[lang] = name;

      const otherNames = new Set(
        byVersion.map((entry) => entry.name).filter((n) => n !== name),
      );
      for (const alias of MANUAL_ALIASES[item.slug]?.[lang] ?? []) {
        if (alias !== name) otherNames.add(alias);
      }
      if (otherNames.size > 0) aliases[lang] = Array.from(otherNames);

      if (byVersion.some((entry) => entry.name !== name)) {
        versionNames[lang] = {};
        let previous = null;
        for (const entry of byVersion) {
          if (entry.name === previous) continue;
          versionNames[lang][entry.version] = entry.name;
          previous = entry.name;
        }
      }
    }

    if (Object.keys(aliases).length > 0) item.aliases = aliases;
    if (Object.keys(versionNames).length > 0) item.versionNames = versionNames;
  }

  return { ambiguous, conflicts, apiMismatches };
}

// ---------------------------------------------------------------------------
// 6. Main
// ---------------------------------------------------------------------------
const ITEM_TYPE = `export interface ItemData {
  slug: string;
  /** Current name: PokeAPI, else the latest version file name */
  de: string;
  en: string;
  /** Version the item first appeared in */
  version: string;
  pocket: string;
  categories: string[];
  /** Other known names of the item, searchable but not displayed */
  aliases?: { de?: string[]; en?: string[] };
  /** Name used from each listed version on, if it differs between versions */
  versionNames?: {
    de?: Record<string, string>;
    en?: Record<string, string>;
  };
}`;

function writeDebugFile(name, data, message) {
  const filePath = path.join(debugDir, name);
  if (data.length === 0) {
    fs.rmSync(filePath, { force: true });
    return;
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`  ℹ ${data.length} ${message} → ${filePath}`);
}

async function main() {
  const P = createPokedexClient();

  console.log("Discovering local item version files ...");
  const versionFiles = loadVersionFiles();
  const VERSION_ORDER = versionFiles.map((v) => v.version);
  console.log(
    `  Found ${versionFiles.length} files: ${VERSION_ORDER.join(", ")}\n`,
  );

  console.log("Building local item map from Itemlists/version-files/ ...");
  const { lookup: localMap } = buildLocalData(versionFiles);
  console.log(`  ${localMap.size} unique items from local lists`);

  // --- Fetch pockets ---
  console.log("Fetching item pockets from PokeAPI ...");
  const pocketList = await withRetry(
    () => P.getItemPocketsList({ limit: 100, offset: 0 }),
    5,
    800,
    "item-pockets:list",
  );
  const pockets = pocketList.results || [];
  const includedPockets = pockets.filter((p) => !EXCLUDED_POCKETS.has(p.name));
  console.log(
    `  Pockets: ${pockets.map((p) => p.name).join(", ")}` +
      `\n  Excluding pockets: ${Array.from(EXCLUDED_POCKETS).join(", ")}` +
      `\n  Using: ${includedPockets.map((p) => p.name).join(", ")}\n`,
  );

  // --- Fetch categories per pocket, tracking pocket + category per item slug ---
  // Map<slug, { pocket: string, categories: Set<string> }>
  const itemMeta = new Map();
  const apiFilteredItems = new Map();
  const categoryEntries = [];

  for (const pocket of pockets) {
    const pocketData = await withRetry(
      () => P.getItemPocketByName(pocket.name),
      5,
      800,
      `item-pocket:${pocket.name}`,
    );
    for (const cat of pocketData.categories) {
      categoryEntries.push({
        pocketName: pocket.name,
        name: cat.name,
        pocketExcluded: EXCLUDED_POCKETS.has(pocket.name),
      });
    }
  }
  console.log(`  ${categoryEntries.length} categories to fetch\n`);

  // --- Collect item slugs from categories, recording pocket & categories ---
  for (const { pocketName, name, pocketExcluded } of categoryEntries) {
    const catData = await withRetry(
      () => P.getItemCategoryByName(name),
      5,
      800,
      `item-category:${name}`,
    );
    const categoryName = catData.name;
    const categoryExcluded = EXCLUDED_CATEGORIES.has(categoryName);
    for (const item of catData.items) {
      const slug = item.name;
      const slugExcluded = isSlugExcluded(slug);

      if (pocketExcluded) {
        addApiFilteredItem(apiFilteredItems, slug, `pocket:${pocketName}`, {
          pocket: pocketName,
          category: categoryName,
        });
      }
      if (categoryExcluded) {
        addApiFilteredItem(apiFilteredItems, slug, `category:${categoryName}`, {
          pocket: pocketName,
          category: categoryName,
        });
      }
      if (slugExcluded) {
        addApiFilteredItem(apiFilteredItems, slug, "slug-rule", {
          pocket: pocketName,
          category: categoryName,
        });
      }

      if (pocketExcluded || categoryExcluded || slugExcluded) {
        itemMeta.delete(slug);
        continue;
      }
      if (apiFilteredItems.has(slug)) continue;
      if (!itemMeta.has(slug)) {
        itemMeta.set(slug, { pocket: pocketName, categories: new Set() });
      }
      itemMeta.get(slug).categories.add(categoryName);
    }
  }
  console.log(
    `  ${itemMeta.size} included items from PokeAPI` +
      `\n  ${apiFilteredItems.size} filtered items from PokeAPI\n`,
  );

  // --- Match against local map & fetch proper names from API ---
  const results = [];
  const trulyUnmatched = [];
  const fuzzyMatched = []; // items that needed collapsed matching
  let i = 0;

  for (const [slug, meta] of itemMeta) {
    i++;
    if (i % 50 === 0) console.log(`  Processing ${i}/${itemMeta.size} ...`);

    // Determine version via local map — check both slug and collapsed,
    // pick the earliest version to handle naming inconsistencies across gens
    const overrideEn = MANUAL_MATCH_OVERRIDES[slug];
    const lookupSlug = overrideEn ? toSlug(overrideEn) : slug;
    const collapsed = toCollapsed(slug);
    let version = null;
    let localItem = null;
    let wasFuzzy = false;

    const primaryMatch = resolveLocalMatch(
      localMap,
      VERSION_ORDER,
      lookupSlug,
      collapsed,
    );
    if (primaryMatch.entry) {
      localItem = primaryMatch.entry;
      version = primaryMatch.entry.version;
      wasFuzzy = primaryMatch.wasFuzzy;
    }

    // Fetch the properly cased names from PokeAPI
    const apiNames = await resolveItemNames(P, slug);

    // If not matched yet, try the API's official English name
    if (!version && apiNames.en) {
      const altMatch = resolveLocalMatch(
        localMap,
        VERSION_ORDER,
        toSlug(apiNames.en),
        toCollapsed(apiNames.en),
      );
      if (altMatch.entry) {
        localItem = altMatch.entry;
        version = altMatch.entry.version;
        wasFuzzy = altMatch.wasFuzzy;
      }
    }

    const pocket = meta.pocket;
    const categories = [...meta.categories].sort();

    if (version) {
      // Names are finalized by applyLocalNames below
      results.push({
        slug,
        de: null,
        en: null,
        version,
        pocket,
        categories,
        apiNames,
        localItem,
        wasFuzzy,
      });
    } else {
      trulyUnmatched.push({
        slug,
        de: apiNames.de ?? slug,
        en: apiNames.en ?? slug,
      });
    }
  }

  console.log("Resolving names per version ...");
  const { ambiguous, conflicts, apiMismatches } = applyLocalNames(
    results,
    versionFiles,
  );
  const renamedCount = results.filter((item) => item.versionNames).length;
  console.log(`  ${renamedCount} items have different names across versions`);

  for (const item of results) {
    if (item.wasFuzzy) {
      fuzzyMatched.push({
        slug: item.slug,
        en: item.en,
        de: item.de,
        version: item.version,
      });
    }
    delete item.apiNames;
    delete item.localItem;
    delete item.wasFuzzy;
  }

  // Sort by version (release order), then alphabetically by English name
  results.sort((a, b) => {
    const vA = VERSION_ORDER.indexOf(a.version);
    const vB = VERSION_ORDER.indexOf(b.version);
    if (vA !== vB) return vA - vB;
    return a.en.localeCompare(b.en);
  });

  // --- Write output ---
  const dataDir = path.join(__dirname, "..", "src", "data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(debugDir, { recursive: true });

  const tsContent =
    `// Generated by scripts/generate-items.mjs\n` +
    `${ITEM_TYPE}\n\n` +
    `export const ITEMS: ItemData[] = ${JSON.stringify(results, null, 2)};\n`;
  fs.writeFileSync(outPath, tsContent, "utf-8");
  console.log(
    `\n✅ Wrote ${results.length} items to ${outPath} (from ${itemMeta.size} API items)`,
  );

  const apiFiltered = serializeFilteredItems(apiFilteredItems);
  if (apiFiltered.length > 0) {
    const apiFilteredPath = path.join(debugDir, "items-api-filtered.json");
    fs.writeFileSync(
      apiFilteredPath,
      JSON.stringify(apiFiltered, null, 2),
      "utf-8",
    );
    console.log(
      `  ℹ ${apiFiltered.length} API items were filtered by pocket/category/slug rules → ${apiFilteredPath}`,
    );
  }

  if (trulyUnmatched.length > 0) {
    const unmatchedPath = path.join(debugDir, "items-unmatched.json");
    fs.writeFileSync(
      unmatchedPath,
      JSON.stringify(trulyUnmatched, null, 2),
      "utf-8",
    );
    console.log(
      `  ⚠ ${trulyUnmatched.length} items could not be matched to ANY version.` +
        `\n    Review: ${unmatchedPath}` +
        `\n    Add overrides to MANUAL_MATCH_OVERRIDES in this script and re-run.`,
    );
  } else {
    console.log("🎉 All items matched to a version!");
  }

  if (fuzzyMatched.length > 0) {
    const fuzzyPath = path.join(debugDir, "items-fuzzy-matched.json");
    fs.writeFileSync(fuzzyPath, JSON.stringify(fuzzyMatched, null, 2), "utf-8");
    console.log(
      `  ℹ ${fuzzyMatched.length} items needed collapsed/fuzzy matching → ${fuzzyPath}`,
    );
  }

  writeDebugFile(
    "items-api-name-mismatches.json",
    apiMismatches,
    "names differ between PokeAPI and the latest version file (api: null = missing in PokeAPI)",
  );
  writeDebugFile(
    "items-name-conflicts.json",
    conflicts,
    "version file entries list several names for one item in the same version (first entry used)",
  );
  writeDebugFile(
    "items-ambiguous-name-keys.json",
    ambiguous,
    "name keys match several items and were ignored for version names",
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
