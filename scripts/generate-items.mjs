/**
 * generate-items.mjs
 *
 * Fetches every item from PokeAPI, applying pocket/category/slug exclusions,
 * matches them against the local Itemlists/version-files/ files to determine the
 * earliest game version each item appeared in, then fetches the properly
 * cased English and German names from the API.
 *
 * Output format per item:
 *   { slug, de, en, version, pocket, categories }
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
    });
}

function parseVersionFileItems(filePath) {
  const items = [];
  const seen = new Set();
  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const deMatch = line.match(/\|de=([^|}]+)/);
    const enMatch = line.match(/\|en=([^|}]+)/);
    if (!deMatch || !enMatch) continue;
    const rawEn = enMatch[1].trim();
    const de = normalizeLocalNameCapitalization(deMatch[1].trim());
    const en = normalizeLocalNameCapitalization(rawEn);
    const key = `${de.toLowerCase()}|||${en.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ slug: getManualLocalSlug(rawEn), de, en });
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
  for (const { file, filePath, version } of versionFiles) {
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠ Missing ${file}, skipping`);
      continue;
    }
    const parsedItems = parseVersionFileItems(filePath);
    for (const item of parsedItems) {
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

async function resolveItemDetails(P, slug, fallback, attempts = 5) {
  try {
    const itemData = await withRetry(
      () => P.getItemByName(slug),
      attempts,
      800,
      `item:${slug}`,
    );
    const en =
      itemData.names.find((n) => n.language.name === "en")?.name ??
      fallback?.en ??
      slug;
    const de =
      itemData.names.find((n) => n.language.name === "de")?.name ??
      fallback?.de ??
      en;
    return {
      found: true,
      de,
      en,
      pocket: itemData.category?.pocket?.name || null,
    };
  } catch {
    return {
      found: false,
      de: slug,
      en: slug,
      pocket: null,
    };
  }
}

// ---------------------------------------------------------------------------
// 5. Main
// ---------------------------------------------------------------------------
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

    // Fetch the item detail from PokeAPI for properly cased names
    let enName, deName;
    try {
      const itemNames = await resolveItemDetails(P, slug, localItem);
      enName = itemNames.en;
      deName = itemNames.de;

      // If not matched yet, try the API's official English name
      if (!version) {
        const altMatch = resolveLocalMatch(
          localMap,
          VERSION_ORDER,
          toSlug(enName),
          toCollapsed(enName),
        );
        if (altMatch.entry) {
          localItem = altMatch.entry;
          version = altMatch.entry.version;
          wasFuzzy = altMatch.wasFuzzy;
          const itemNamesWithFallback = await resolveItemDetails(
            P,
            slug,
            localItem,
          );
          enName = itemNamesWithFallback.en;
          deName = itemNamesWithFallback.de;
        }
      }
    } catch {
      console.warn(`  ⚠ Falling back to slug names for ${slug}`);
      enName = slug;
      deName = slug;
    }

    const pocket = meta.pocket;
    const categories = [...meta.categories].sort();

    if (version) {
      results.push({
        slug,
        de: deName,
        en: enName,
        version,
        pocket,
        categories,
      });
      if (wasFuzzy) {
        fuzzyMatched.push({ slug, en: enName, de: deName, version });
      }
    } else {
      trulyUnmatched.push({ slug, de: deName, en: enName });
    }
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
    `export const ITEMS: { slug: string; de: string; en: string; version: string; pocket: string; categories: string[] }[] = ${JSON.stringify(results, null, 2)};\n`;
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
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
