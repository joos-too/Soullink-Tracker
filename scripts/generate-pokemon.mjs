#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import ts from "typescript";
import { createStaticPokeApiClient } from "./pokeapi-static-client.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const outPokemonPath = path.resolve(__dirname, "../src/data/pokemon.ts");
const outLocationsPath = path.resolve(__dirname, "../src/data/locations.ts");
const localItemsPath = path.resolve(__dirname, "../src/data/items.ts");

const MAX_GENERATION = 9;
const REGION_TO_GENERATION = {
  kanto: 1,
  johto: 2,
  hoenn: 3,
  sinnoh: 4,
  unova: 5,
  kalos: 6,
  alola: 7,
  galar: 8,
  hisui: 8,
  paldea: 9,
};
const SUPPORTED_LANGUAGES = ["de", "en"];

const MANUAL_TRANSLATIONS = {
  de: {
    location: {},
    species: {},
    trigger: {
      "three-critical-hits": "3 Kritische Treffer",
      "three-defeated-bisharp":
        "Besiegen von drei wilden Caesurio die ein Anführersymbol tragen",
      "take-damage": "Schaden erleiden",
      spin: "Drehen",
      "gimmighoul-coins": "Levelaufstieg mit 999 Gierspenst-Münzen",
    },
    item: {
      "scroll-of-darkness": "Unlicht-Schriftrolle",
      "scroll-of-waters": "Wasser-Schriftrolle",
    },
    move: {
      "rage-fist": "Zornesfaust",
      "twin-beam": "Doppelstrahl",
      "hyper-drill": "Hyperbohrer",
      "barb-barrage": "Giftstachelregen",
      "psyshield-bash": "Barrierenstoß",
    },
    type: {},
  },
  en: {
    location: {},
    species: {},
    trigger: {
      "three-critical-hits": "3 Critical Hits",
      "three-defeated-bisharp":
        "Defeat three wild Bisharp with a Leader's Crest",
      "take-damage": "Take Damage",
      spin: "Spin",
      "gimmighoul-coins": "Level-Up with 999 Gimmighoul Coins",
    },
    item: {},
    move: {},
    type: {},
  },
};

const POKEAPI_GENERATION_NAME_TO_NUMBER = {
  "generation-i": 1,
  "generation-ii": 2,
  "generation-iii": 3,
  "generation-iv": 4,
  "generation-v": 5,
  "generation-vi": 6,
  "generation-vii": 7,
  "generation-viii": 8,
  "generation-ix": 9,
};

const createPokedexClient = () => createStaticPokeApiClient();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SKIPPED_EVOLUTIONS = new Set(["489:490"]);

async function withRetry(fn, attempts = 3, delayMs = 500) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i < attempts - 1) {
        await sleep(delayMs * (i + 1));
      }
    }
  }
  throw lastError;
}

function formatSlugName(slug) {
  if (!slug || typeof slug !== "string") return "";
  return slug
    .split(/[-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getGenerationNumberFromPokeApiName(name) {
  if (!name || typeof name !== "string") return null;
  return POKEAPI_GENERATION_NAME_TO_NUMBER[name] ?? null;
}

function getManualTranslation(locale, category, key) {
  return MANUAL_TRANSLATIONS?.[locale]?.[category]?.[key] || null;
}

function buildLocalizedRecord(slug, names = [], category) {
  const record = {};
  SUPPORTED_LANGUAGES.forEach((locale) => {
    const manual = getManualTranslation(locale, category, slug);
    if (manual) {
      record[locale] = manual;
      return;
    }
    const preferredLanguageCode = locale === "en" ? "en" : "de";
    const preferred = names.find(
      (n) => n.language?.name === preferredLanguageCode,
    )?.name;
    if (preferred) {
      record[locale] = preferred;
      return;
    }
    if (locale === "de") {
      const fallbackEn = names.find((n) => n.language?.name === "en")?.name;
      if (fallbackEn) {
        record[locale] = fallbackEn;
        return;
      }
    }
    record[locale] = formatSlugName(slug);
  });
  return record;
}

function resolveTranslationFromRecord(recordMap, slug, locale, category) {
  if (!slug) return "";
  const manual = getManualTranslation(locale, category, slug);
  if (manual) return manual;
  const record = recordMap.get(slug);
  if (record?.[locale]) return record[locale];
  const fallbackLocale = locale === "de" ? "en" : "de";
  if (record?.[fallbackLocale]) return record[fallbackLocale];
  return formatSlugName(slug);
}

function getObjectStringProperty(node, propertyName) {
  if (!ts.isObjectLiteralExpression(node)) return "";
  const property = node.properties.find((prop) => {
    if (!ts.isPropertyAssignment(prop)) return false;
    const name = prop.name;
    return (
      (ts.isIdentifier(name) && name.text === propertyName) ||
      (ts.isStringLiteral(name) && name.text === propertyName)
    );
  });
  if (!property || !ts.isPropertyAssignment(property)) return "";
  const initializer = property.initializer;
  return ts.isStringLiteral(initializer) ? initializer.text : "";
}

async function loadLocalItemTranslations() {
  const result = new Map();
  let sourceText;
  try {
    sourceText = await readFile(localItemsPath, "utf8");
  } catch {
    return result;
  }

  const sourceFile = ts.createSourceFile(
    localItemsPath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );

  const visit = (node) => {
    if (!ts.isVariableDeclaration(node) || node.name?.getText() !== "ITEMS") {
      ts.forEachChild(node, visit);
      return;
    }
    const initializer = node.initializer;
    if (!initializer || !ts.isArrayLiteralExpression(initializer)) return;
    initializer.elements.forEach((element) => {
      if (!ts.isObjectLiteralExpression(element)) return;
      const slug = getObjectStringProperty(element, "slug");
      const de = getObjectStringProperty(element, "de");
      const en = getObjectStringProperty(element, "en");
      if (slug && (de || en)) {
        result.set(slug, {
          de: de || en || formatSlugName(slug),
          en: en || de || formatSlugName(slug),
        });
      }
    });
  };

  visit(sourceFile);
  return result;
}

function createTranslators(locale, resources) {
  const {
    itemTranslations,
    moveTranslations,
    typeTranslations,
    locationTranslations,
    speciesSlugToName,
  } = resources;
  return {
    item: (slug) =>
      resolveTranslationFromRecord(itemTranslations, slug, locale, "item"),
    move: (slug) =>
      resolveTranslationFromRecord(moveTranslations, slug, locale, "move"),
    type: (slug) =>
      resolveTranslationFromRecord(typeTranslations, slug, locale, "type"),
    location: (slug) =>
      resolveTranslationFromRecord(
        locationTranslations,
        slug,
        locale,
        "location",
      ),
    species: (slug) => {
      if (!slug) return "";
      const manual = getManualTranslation(locale, "species", slug);
      if (manual) return manual;
      const primary = speciesSlugToName[locale]?.get(slug);
      if (primary) return primary;
      const fallbackLocale = locale === "de" ? "en" : "de";
      const fallback = speciesSlugToName[fallbackLocale]?.get(slug);
      if (fallback) return fallback;
      return formatSlugName(slug);
    },
  };
}

async function loadItemTranslations(P, slugs) {
  const result = new Map();
  if (!slugs || slugs.size === 0) return result;
  const localTranslations = await loadLocalItemTranslations();
  for (const slug of slugs) {
    const record = localTranslations.get(slug);
    if (record) result.set(slug, record);
  }
  const arr = Array.from(slugs);
  const ITEM_CHUNK = 50;
  for (let i = 0; i < arr.length; i += ITEM_CHUNK) {
    const slice = arr.slice(i, i + ITEM_CHUNK);
    const items = await Promise.all(
      slice.map((slug) =>
        result.has(slug)
          ? Promise.resolve(null)
          : withRetry(() => P.getItemByName(slug), 3, 600).catch(() => null),
      ),
    );
    items.forEach((item, idx) => {
      const slug = slice[idx];
      if (!slug) return;
      if (result.has(slug) && !item) return;
      const names = item?.names || [];
      result.set(slug, buildLocalizedRecord(slug, names, "item"));
    });
  }
  return result;
}

async function loadMoveTranslations(P, slugs) {
  const result = new Map();
  if (!slugs || slugs.size === 0) return result;
  const arr = Array.from(slugs);
  const MOVE_CHUNK = 50;
  for (let i = 0; i < arr.length; i += MOVE_CHUNK) {
    const slice = arr.slice(i, i + MOVE_CHUNK);
    const moves = await Promise.all(
      slice.map((slug) =>
        withRetry(() => P.getMoveByName(slug), 3, 600).catch(() => null),
      ),
    );
    moves.forEach((move, idx) => {
      const slug = slice[idx];
      if (!slug) return;
      const names = move?.names || [];
      result.set(slug, buildLocalizedRecord(slug, names, "move"));
    });
  }
  return result;
}

async function loadTypeTranslations(P, slugs) {
  const result = new Map();
  if (!slugs || slugs.size === 0) return result;
  const arr = Array.from(slugs);
  const TYPE_CHUNK = 50;
  for (let i = 0; i < arr.length; i += TYPE_CHUNK) {
    const slice = arr.slice(i, i + TYPE_CHUNK);
    const types = await Promise.all(
      slice.map((slug) =>
        withRetry(() => P.getTypeByName(slug), 3, 600).catch(() => null),
      ),
    );
    types.forEach((type, idx) => {
      const slug = slice[idx];
      if (!slug) return;
      const names = type?.names || [];
      result.set(slug, buildLocalizedRecord(slug, names, "type"));
    });
  }
  return result;
}

async function loadAllLocations(P) {
  const translations = new Map();
  const regions = new Map();
  const list = await withRetry(
    () => P.getLocationsList({ limit: 2000, offset: 0 }),
    3,
    600,
  );
  const slugs = Array.isArray(list?.results)
    ? list.results.map((it) => it?.name).filter(Boolean)
    : [];
  const LOC_CHUNK = 40;
  for (let i = 0; i < slugs.length; i += LOC_CHUNK) {
    const slice = slugs.slice(i, i + LOC_CHUNK);
    const locations = await Promise.all(
      slice.map((slug) =>
        withRetry(() => P.getLocationByName(slug), 3, 600).catch(() => null),
      ),
    );
    locations.forEach((loc, idx) => {
      const slug = slice[idx];
      if (!slug) return;
      const region = loc?.region?.name || "";
      const regionGeneration = REGION_TO_GENERATION[region] || Infinity;
      if (regionGeneration > MAX_GENERATION) return;
      const names = loc?.names || [];
      translations.set(slug, buildLocalizedRecord(slug, names, "location"));
      regions.set(slug, region);
    });
  }
  return { translations, regions };
}

const LANGUAGE_TEXT = {
  de: {
    unknownRequirement: "Bedingung unbekannt",
    unknownCondition: "Unbekannte Bedingung",
    locationPrefix: "Levelaufstieg - Ort: ",
    baseLevelUp: "Levelaufstieg",
    baseTrade: "Tausch",
    baseTradeWith: (name) => `Tausch mit ${name}`,
    baseUseItem: "Item verwenden",
    baseItemWithName: (name) => `Item: ${name}`,
    baseUseMove: "Attacke einsetzen",
    baseUseMoveWithName: (name) => `Attacke einsetzen: ${name}`,
    baseUseMoveWithCount: (count, name) =>
      `Attacke einsetzen: ${count} x ${name}`,
    strongStyleMove: "Krafttechnik",
    agileStyleMove: "Tempotechnik",
    styleMoveWithName: (name, style) =>
      `Attacke einsetzen: ${name} als ${style}`,
    styleMoveWithCount: (count, name, style) =>
      `Attacke einsetzen: ${count} x ${name} als ${style}`,
    baseSpecial: "Spezial",
    baseSpecialSpecies: (name) => `Spezial: ${name}`,
    level: (value) => `Level ${value}`,
    friendship: (value) => `Freundschaft ≥ ${value}`,
    affection: (value) => `Zutrauen ≥ ${value}`,
    beauty: (value) => `Schönheit ≥ ${value}`,
    steps: (value) => `Nach ${value} Schritten im "Pokémon losschicken"-Modus`,
    timeOfDayMap: {
      day: "Tag",
      night: "Nacht",
      dusk: "Abend",
      "full-moon": "Vollmond",
    },
    timeOfDay: (value) => `Tageszeit: ${value}`,
    overworldRain: "Regen in der Oberwelt",
    genderFemale: "Nur weiblich",
    genderMale: "Nur männlich",
    criticalHitsExact: "3 Kritische Treffer",
    criticalHits: (value) => `Kritische Treffer ≥ ${value}`,
    heldItem: (name) => `Trägt ${name}`,
    knownMove: (name) => `Kennt ${name}`,
    knownMoveType: (name) => `Kennt Attacke vom Typ ${name}`,
    location: (name) => `Ort: ${name}`,
    partySpecies: (name) => `Team: ${name}`,
    partyType: (type) => `Pokémon von Typ ${type} im Team`,
    statsLess: "Angriff < Verteidigung",
    statsEqual: "Angriff = Verteidigung",
    statsGreater: "Angriff > Verteidigung",
    upsideDown: "Konsole umdrehen",
  },
  en: {
    unknownRequirement: "Requirement unknown",
    unknownCondition: "Unknown condition",
    locationPrefix: "Level-Up - Location: ",
    baseLevelUp: "Level-Up",
    baseTrade: "Trade",
    baseTradeWith: (name) => `Trade with ${name}`,
    baseUseItem: "Use item",
    baseItemWithName: (name) => `Item: ${name}`,
    baseUseMove: "Use move",
    baseUseMoveWithName: (name) => `Use move: ${name}`,
    baseUseMoveWithCount: (count, name) => `Use move: ${count} x ${name}`,
    strongStyleMove: "Strong Style Move",
    agileStyleMove: "Agile Style Move",
    styleMoveWithName: (name, style) => `Use move: ${name} as ${style}`,
    styleMoveWithCount: (count, name, style) =>
      `Use move: ${count} x ${name} as ${style}`,
    baseSpecial: "Special",
    baseSpecialSpecies: (name) => `Special: ${name}`,
    level: (value) => `Level ${value}`,
    friendship: (value) => `Friendship ≥ ${value}`,
    affection: (value) => `Affection ≥ ${value}`,
    beauty: (value) => `Beauty ≥ ${value}`,
    steps: (value) => `After ${value} Steps in "Let's Go" mode`,
    timeOfDayMap: { day: "Day", night: "Night", dusk: "Dusk" },
    timeOfDay: (value) => `Time of day: ${value}`,
    overworldRain: "Overworld rain",
    genderFemale: "Only female",
    genderMale: "Only male",
    criticalHitsExact: "3 Critical Hits",
    criticalHits: (value) => `Critical hits ≥ ${value}`,
    heldItem: (name) => `Holds ${name}`,
    knownMove: (name) => `Knows ${name}`,
    knownMoveType: (name) => `Knows move of type ${name}`,
    location: (name) => `Location: ${name}`,
    partySpecies: (name) => `Party: ${name}`,
    partyType: (type) => `Pokémon of type ${type} in party`,
    statsLess: "Attack < Defense",
    statsEqual: "Attack = Defense",
    statsGreater: "Attack > Defense",
    upsideDown: "Turn console upside down",
  },
};

function describeEvolutionDetail(detail, translators = {}, locale = "de") {
  const langText = LANGUAGE_TEXT[locale] || LANGUAGE_TEXT.de;
  if (!detail) return langText.unknownRequirement;
  const translateItem = (slug) => {
    if (!slug) return "";
    const fn = translators.item;
    const value = fn ? fn(slug) : null;
    return value || formatSlugName(slug);
  };
  const translateMove = (slug) => {
    if (!slug) return "";
    const fn = translators.move;
    const value = fn ? fn(slug) : null;
    return value || formatSlugName(slug);
  };
  const translateType = (slug) => {
    if (!slug) return "";
    const fn = translators.type;
    const value = fn ? fn(slug) : null;
    return value || formatSlugName(slug);
  };
  const translateLocation = (slug) => {
    if (!slug) return "";
    const fn = translators.location;
    const value = fn ? fn(slug) : null;
    return value || formatSlugName(slug);
  };
  const translateSpecies = (slug) => {
    if (!slug) return "";
    const fn = translators.species;
    const value = fn ? fn(slug) : null;
    return value || formatSlugName(slug);
  };
  const extras = [];
  const add = (value) => {
    if (value && !extras.includes(value)) extras.push(value);
  };

  if (typeof detail.min_level === "number")
    add(langText.level(detail.min_level));
  if (typeof detail.min_happiness === "number")
    add(langText.friendship(detail.min_happiness));
  if (typeof detail.min_affection === "number")
    add(langText.affection(detail.min_affection));
  if (typeof detail.min_beauty === "number")
    add(langText.beauty(detail.min_beauty));
  if (typeof detail.min_steps === "number")
    add(langText.steps(detail.min_steps));
  if (detail.time_of_day) {
    const key = detail.time_of_day.trim().toLowerCase();
    const map = langText.timeOfDayMap || {};
    const mapped = map[key] || formatSlugName(detail.time_of_day);
    add(langText.timeOfDay(mapped));
  }
  if (detail.needs_overworld_rain) add(langText.overworldRain);
  if (typeof detail.gender === "number") {
    if (detail.gender === 1) add(langText.genderFemale);
    else if (detail.gender === 2) add(langText.genderMale);
  }
  if (typeof detail.min_critical_hits === "number") {
    if (detail.min_critical_hits === 3) add(langText.criticalHitsExact);
    else add(langText.criticalHits(detail.min_critical_hits));
  }
  if (detail.held_item?.name)
    add(langText.heldItem(translateItem(detail.held_item.name)));
  if (detail.known_move?.name)
    add(langText.knownMove(translateMove(detail.known_move.name)));
  if (detail.known_move_type?.name)
    add(langText.knownMoveType(translateType(detail.known_move_type.name)));
  if (detail.location?.name)
    add(langText.location(translateLocation(detail.location.name)));
  if (detail.party_species?.name)
    add(langText.partySpecies(translateSpecies(detail.party_species.name)));
  if (detail.party_type?.name)
    add(langText.partyType(translateType(detail.party_type.name)));
  if (typeof detail.relative_physical_stats === "number") {
    if (detail.relative_physical_stats === -1) add(langText.statsLess);
    else if (detail.relative_physical_stats === 0) add(langText.statsEqual);
    else if (detail.relative_physical_stats === 1) add(langText.statsGreater);
  }
  if (detail.turn_upside_down) add(langText.upsideDown);
  let base;
  const trigger = detail.trigger?.name || "";
  switch (trigger) {
    case "level-up":
      base = langText.baseLevelUp;
      break;
    case "trade":
      base = detail.trade_species?.name
        ? langText.baseTradeWith(translateSpecies(detail.trade_species.name))
        : langText.baseTrade;
      break;
    case "use-item":
      base = detail.item?.name
        ? langText.baseItemWithName(translateItem(detail.item.name))
        : langText.baseUseItem;
      break;
    case "use-move":
      base = detail.used_move?.name
        ? typeof detail.min_move_count === "number"
          ? langText.baseUseMoveWithCount(
              detail.min_move_count,
              translateMove(detail.used_move.name),
            )
          : langText.baseUseMoveWithName(translateMove(detail.used_move.name))
        : langText.baseUseMove;
      break;
    case "strong-style-move":
    case "agile-style-move": {
      const style =
        trigger === "strong-style-move"
          ? langText.strongStyleMove
          : langText.agileStyleMove;
      base = detail.used_move?.name
        ? typeof detail.min_move_count === "number"
          ? langText.styleMoveWithCount(
              detail.min_move_count,
              translateMove(detail.used_move.name),
              style,
            )
          : langText.styleMoveWithName(
              translateMove(detail.used_move.name),
              style,
            )
        : style;
      break;
    }
    case "shed":
      base = langText.baseSpecialSpecies(
        translateSpecies("shedinja") || formatSlugName("shedinja"),
      );
      break;
    case "three-critical-hits":
      base =
        getManualTranslation(locale, "trigger", trigger) ||
        langText.criticalHitsExact;
      break;
    case "other":
      base = langText.baseSpecial;
      break;
    default:
      if (trigger) {
        const manualTrigger = getManualTranslation(locale, "trigger", trigger);
        const fallbackTrigger = formatSlugName(trigger);
        const locationTrigger = translateLocation(trigger);
        base =
          manualTrigger ||
          (locationTrigger && locationTrigger !== fallbackTrigger
            ? locationTrigger
            : fallbackTrigger);
      } else {
        base = langText.baseSpecial;
      }
  }
  if (!base) base = langText.baseSpecial;
  if (extras.length === 0 && base.startsWith("Item:") && !detail.item?.name) {
    extras.push(langText.unknownCondition);
  }
  return extras.length ? `${base} - ${extras.join(", ")}` : base;
}

function slugPart(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createEvolutionMethodSlug(detail) {
  if (!detail) return "unknown-requirement";
  const trigger = detail.trigger?.name || "special";
  const parts = [slugPart(trigger)];
  const add = (key, value) => {
    if (value === null || value === undefined || value === "") return;
    const normalizedValue = slugPart(value);
    if (normalizedValue) {
      parts.push(key ? `${key}-${normalizedValue}` : normalizedValue);
    }
  };

  add("min-level", detail.min_level);
  add("min-happiness", detail.min_happiness);
  add("min-affection", detail.min_affection);
  add("min-beauty", detail.min_beauty);
  add("min-steps", detail.min_steps);
  add("time", detail.time_of_day);
  if (detail.needs_overworld_rain) parts.push("overworld-rain");
  add("gender", detail.gender);
  add("critical-hits", detail.min_critical_hits);
  if (trigger === "use-item") {
    add("", detail.item?.name);
  } else {
    add("item", detail.item?.name);
  }
  add("held-item", detail.held_item?.name);
  add("known-move", detail.known_move?.name);
  if (trigger === "use-move") {
    add("", detail.used_move?.name);
    if (typeof detail.min_move_count === "number") {
      add("", `${detail.min_move_count}-times`);
    }
  } else {
    add("used-move", detail.used_move?.name);
    add("min-move-count", detail.min_move_count);
  }
  add("known-move-type", detail.known_move_type?.name);
  add("location", detail.location?.name);
  add("party-species", detail.party_species?.name);
  add("party-type", detail.party_type?.name);
  add("trade-species", detail.trade_species?.name);
  if (detail.turn_upside_down) parts.push("turn-upside-down");

  return parts.join("-");
}

async function main() {
  const P = createPokedexClient();
  console.log("Fetching species list…");
  const list = await withRetry(
    () => P.getPokemonSpeciesList({ limit: 20000, offset: 0 }),
    5,
    800,
  );
  const items = list.results || [];

  const ids = items
    .map((it) => {
      const m = it.url.match(/\/pokemon-species\/(\d+)\/?$/);
      return m ? Number(m[1]) : null;
    })
    .filter((x) => !!x);

  const nameEntriesByLocale = {
    de: new Map(),
    en: new Map(),
  }; // Record<locale, Map<lowerName, { name: string; id: number; generation: number }>>
  const nameToIdByLocale = {
    de: new Map(),
    en: new Map(),
  }; // Record<locale, Map<lowerCaseName, id>>
  const chainIds = new Set();
  const itemSlugs = new Set();
  const moveSlugs = new Set();
  const typeSlugs = new Set();
  const speciesSlugToName = {
    de: new Map(),
    en: new Map(),
  };
  const pokemonNamesById = new Map(); // Map<id, { de: string; en: string }>
  const ensureSpeciesEntry = (slug) => {
    if (!slug) return;
    SUPPORTED_LANGUAGES.forEach((locale) => {
      if (!speciesSlugToName[locale].has(slug)) {
        speciesSlugToName[locale].set(slug, formatSlugName(slug));
      }
    });
  };
  const allowedSpeciesIds = new Set();
  const idToGeneration = new Map();
  const CHUNK = 50;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    process.stdout.write(
      `Fetching ${i + 1}-${Math.min(i + CHUNK, ids.length)} of ${ids.length}\r`,
    );
    const speciesArr = await Promise.all(
      slice.map((id) =>
        withRetry(() => P.getPokemonSpeciesByName(id), 5, 800).catch(
          () => null,
        ),
      ),
    );
    for (const sp of speciesArr) {
      if (!sp) continue;
      const genUrl = sp.generation?.url || "";
      const gm = genUrl.match(/\/generation\/(\d+)\/?$/);
      const genNumber = gm ? Number(gm[1]) : Infinity;
      if (!genNumber || genNumber > MAX_GENERATION) continue;
      const namesField = sp.names || [];
      const de = namesField.find((n) => n.language?.name === "de");
      const en = namesField.find((n) => n.language?.name === "en");
      const fallbackSlugName = sp.name ? formatSlugName(sp.name) : "";
      const germanName = (
        de?.name ||
        en?.name ||
        fallbackSlugName ||
        ""
      ).trim();
      const englishName = (
        en?.name ||
        fallbackSlugName ||
        germanName ||
        ""
      ).trim();
      const addNameForLocale = (locale, value) => {
        if (!value) return;
        const lower = value.toLowerCase();
        const entries = nameEntriesByLocale[locale];
        if (!entries.has(lower)) {
          entries.set(lower, {
            name: value,
            id: sp.id,
            generation: genNumber,
          });
        }
        nameToIdByLocale[locale].set(lower, sp.id);
        if (sp.name) {
          speciesSlugToName[locale].set(String(sp.name), value);
        }
      };
      addNameForLocale("de", germanName);
      addNameForLocale("en", englishName);
      pokemonNamesById.set(sp.id, {
        de: germanName,
        en: englishName,
      });
      allowedSpeciesIds.add(sp.id);
      idToGeneration.set(sp.id, genNumber);
      const chainUrl = sp.evolution_chain?.url || "";
      const m2 = chainUrl && chainUrl.match(/\/evolution-chain\/(\d+)\/?$/);
      if (m2) chainIds.add(Number(m2[1]));
    }
  }

  // Fetch Pokémon types for every allowed species
  const pokemonTypesById = new Map(); // Map<id, string[]>  (type slugs)
  const pokemonPastTypesById = new Map(); // Map<id, { generation: number; types: string[] }[]>
  const allTypeSlugsForNames = new Set(); // collect all type slugs we need translations for
  const allowedIdArr = Array.from(allowedSpeciesIds).sort((a, b) => a - b);
  const POKEMON_CHUNK = 50;
  console.log(`\nFetching Pokémon types for ${allowedIdArr.length} species…`);
  for (let i = 0; i < allowedIdArr.length; i += POKEMON_CHUNK) {
    const slice = allowedIdArr.slice(i, i + POKEMON_CHUNK);
    process.stdout.write(
      `Fetching types ${i + 1}-${Math.min(i + POKEMON_CHUNK, allowedIdArr.length)} of ${allowedIdArr.length}\r`,
    );
    const pokemonArr = await Promise.all(
      slice.map((id) =>
        withRetry(() => P.getPokemonByName(id), 5, 800).catch(() => null),
      ),
    );
    for (let j = 0; j < pokemonArr.length; j++) {
      const poke = pokemonArr[j];
      const id = slice[j];
      if (!poke) continue;
      if (Array.isArray(poke.types)) {
        const types = poke.types
          .sort((a, b) => a.slot - b.slot)
          .map((t) => t.type?.name)
          .filter(Boolean);
        if (types.length) {
          pokemonTypesById.set(id, types);
          types.forEach((slug) => allTypeSlugsForNames.add(slug));
        }
      }
      if (Array.isArray(poke.past_types)) {
        const pastTypes = poke.past_types
          .map((entry) => {
            const generation = getGenerationNumberFromPokeApiName(
              entry?.generation?.name,
            );
            const types = Array.isArray(entry?.types)
              ? entry.types
                  .slice()
                  .sort((a, b) => a.slot - b.slot)
                  .map((t) => t.type?.name)
                  .filter(Boolean)
              : [];
            if (typeof generation !== "number" || types.length === 0) {
              return null;
            }
            return { generation, types };
          })
          .filter(Boolean)
          .sort((a, b) => a.generation - b.generation);
        if (pastTypes.length) {
          pokemonPastTypesById.set(id, pastTypes);
          pastTypes.forEach((entry) => {
            entry.types.forEach((slug) => allTypeSlugsForNames.add(slug));
          });
        }
      }
    }
  }
  console.log(`\nCollected types for ${pokemonTypesById.size} Pokémon.`);

  // Load translations for ALL type slugs (including those needed for types file)
  const allTypeTranslations = await loadTypeTranslations(
    P,
    allTypeSlugsForNames,
  );

  // Build evolutions map from evolution chains
  const evoMap = new Map(); // Map<fromId, Map<toId, EvolutionDetail[] | null[]>>
  const chainIdArr = Array.from(chainIds);
  const CHAIN_CHUNK = 30;
  for (let i = 0; i < chainIdArr.length; i += CHAIN_CHUNK) {
    const slice = chainIdArr.slice(i, i + CHAIN_CHUNK);
    process.stdout.write(
      `Fetching evolution chains ${i + 1}-${Math.min(i + CHAIN_CHUNK, chainIdArr.length)} of ${chainIdArr.length}      \r`,
    );
    const chains = await Promise.all(
      slice.map((cid) =>
        withRetry(() => P.getEvolutionChainById(cid), 5, 800).catch(() => null),
      ),
    );
    for (const ch of chains) {
      if (!ch?.chain) continue;
      const walk = (node) => {
        if (!node) return;
        const fromUrl = node.species?.url || "";
        const m = fromUrl.match(/\/pokemon-species\/(\d+)\/?$/);
        const fromId = m ? Number(m[1]) : null;
        const arr = Array.isArray(node.evolves_to) ? node.evolves_to : [];
        for (const child of arr) {
          const cu = child?.species?.url || "";
          const cm = cu.match(/\/pokemon-species\/(\d+)\/?$/);
          const cid2 = cm ? Number(cm[1]) : null;
          if (fromId && cid2) {
            const skipKey = `${fromId}:${cid2}`;
            if (SKIPPED_EVOLUTIONS.has(skipKey)) continue;
            if (!evoMap.has(fromId)) evoMap.set(fromId, new Map());
            const targetMap = evoMap.get(fromId);
            const fromAllowed = allowedSpeciesIds.has(fromId);
            const toAllowed = cid2 && allowedSpeciesIds.has(cid2);
            if (fromAllowed && toAllowed) {
              if (!targetMap.has(cid2)) targetMap.set(cid2, []);
              const store = targetMap.get(cid2);
              const details = Array.isArray(child.evolution_details)
                ? child.evolution_details
                : [];
              if (!details.length) {
                store.push(null);
              } else {
                for (const detail of details) {
                  if (detail?.item?.name) itemSlugs.add(detail.item.name);
                  if (detail?.held_item?.name)
                    itemSlugs.add(detail.held_item.name);
                  if (detail?.known_move?.name)
                    moveSlugs.add(detail.known_move.name);
                  if (detail?.used_move?.name)
                    moveSlugs.add(detail.used_move.name);
                  if (detail?.known_move_type?.name)
                    typeSlugs.add(detail.known_move_type.name);
                  if (detail?.party_type?.name)
                    typeSlugs.add(detail.party_type.name);
                  if (detail?.party_species?.name) {
                    ensureSpeciesEntry(detail.party_species.name);
                  }
                  if (detail?.trade_species?.name) {
                    ensureSpeciesEntry(detail.trade_species.name);
                  }
                  store.push(detail || null);
                }
              }
            }
          }
        }
        for (const child of arr) walk(child);
      };
      walk(ch.chain);
    }
  }
  // Merge evolution type slugs that weren't already fetched
  const missingTypeSlugs = new Set();
  for (const slug of typeSlugs) {
    if (!allTypeTranslations.has(slug)) missingTypeSlugs.add(slug);
  }
  const [
    { translations: locationTranslations, regions: locationRegions },
    itemTranslations,
    moveTranslations,
    extraTypeTranslations,
  ] = await Promise.all([
    loadAllLocations(P),
    loadItemTranslations(P, itemSlugs),
    loadMoveTranslations(P, moveSlugs),
    loadTypeTranslations(P, missingTypeSlugs),
  ]);
  // Merge extra evolution type translations into allTypeTranslations
  for (const [slug, record] of extraTypeTranslations) {
    allTypeTranslations.set(slug, record);
  }
  const typeTranslations = allTypeTranslations;
  const translatorResources = {
    itemTranslations,
    moveTranslations,
    typeTranslations,
    locationTranslations,
    speciesSlugToName,
  };

  const buildLocationSuggestions = () => {
    const entries = [];
    locationTranslations.forEach((record, slug) => {
      const region = locationRegions.get(slug) || "";
      if (slug.includes("-pokemart") || slug.includes("-pokecenter")) return;
      const names = {};
      SUPPORTED_LANGUAGES.forEach((locale) => {
        names[locale] = record?.[locale] || record?.en || formatSlugName(slug);
      });
      if (!Object.values(names).some(Boolean)) return;
      entries.push({ names, slug, region });
    });
    return entries.sort((a, b) =>
      a.names.en.localeCompare(b.names.en, "en", { sensitivity: "base" }),
    );
  };

  const buildEvolutionMethod = (detail) => {
    const slug = createEvolutionMethodSlug(detail);
    const names = {};
    SUPPORTED_LANGUAGES.forEach((locale) => {
      const translators = createTranslators(locale, translatorResources);
      names[locale] =
        describeEvolutionDetail(detail, translators, locale) ||
        LANGUAGE_TEXT[locale]?.unknownRequirement ||
        LANGUAGE_TEXT.de.unknownRequirement;
    });
    return { slug, names };
  };

  const buildEvolutionTable = () => {
    return Object.fromEntries(
      [...evoMap.entries()]
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([fromId, toMap]) => [
          fromId,
          [...toMap.entries()]
            .map(([toId, detailList]) => {
              const methodMap = new Map();
              const normalized =
                detailList && detailList.length ? detailList : [null];
              normalized.forEach((detail) => {
                const method = buildEvolutionMethod(detail);
                methodMap.set(method.slug, method);
              });
              if (!methodMap.size)
                methodMap.set(
                  "unknown-requirement",
                  buildEvolutionMethod(null),
                );
              return {
                id: Number(toId),
                methods: Array.from(methodMap.values()).sort((a, b) =>
                  a.names.de.localeCompare(b.names.de, "de"),
                ),
              };
            })
            .sort((a, b) => a.id - b.id),
        ]),
    );
  };

  const evolutionTable = buildEvolutionTable();

  const buildEvolutionEntries = (id) => {
    return (evolutionTable[id] || []).sort((a, b) => a.id - b.id);
  };

  const locationSuggestions = buildLocationSuggestions();
  const locFile = `// Generated by scripts/generate-pokemon-de.mjs\nexport type LocationLanguage = "de" | "en";\n\nexport interface LocationDataEntry {\n  names: Record<LocationLanguage, string>;\n  slug: string;\n  region: string;\n}\n\nexport const LOCATIONS: LocationDataEntry[] = ${JSON.stringify(locationSuggestions, null, 2)};\n`;
  await writeFile(outLocationsPath, locFile, "utf8");

  const typeNamesByLocale = {};
  SUPPORTED_LANGUAGES.forEach((locale) => {
    const map = {};
    for (const slug of allTypeSlugsForNames) {
      const record = allTypeTranslations.get(slug);
      map[slug] = record?.[locale] || record?.en || formatSlugName(slug);
    }
    typeNamesByLocale[locale] = map;
  });

  const pokemonData = Object.fromEntries(
    allowedIdArr.map((id) => {
      const names = pokemonNamesById.get(id) || {
        de: formatSlugName(String(id)),
        en: formatSlugName(String(id)),
      };
      const entry = {
        id,
        names,
        generation: idToGeneration.get(id) || 0,
        types: pokemonTypesById.get(id) || [],
      };
      const pastTypes = pokemonPastTypesById.get(id) || [];
      if (pastTypes.length) {
        entry.pastTypes = pastTypes;
      }
      const evolutions = buildEvolutionEntries(id);
      if (evolutions.length) {
        entry.evolutions = evolutions;
      }
      return [id, entry];
    }),
  );

  const pokemonFile = `// Generated by scripts/generate-pokemon-de.mjs\nexport type PokemonLanguage = "de" | "en";\n\nexport interface PokemonEvolutionMethod {\n  slug: string;\n  names: Record<PokemonLanguage, string>;\n}\n\nexport interface PokemonEvolutionEntry {\n  id: number;\n  methods: PokemonEvolutionMethod[];\n}\n\nexport interface PokemonPastTypesEntry {\n  generation: number;\n  types: string[];\n}\n\nexport interface PokemonDataEntry {\n  id: number;\n  names: Record<PokemonLanguage, string>;\n  generation: number;\n  types: string[];\n  pastTypes?: PokemonPastTypesEntry[];\n  evolutions?: PokemonEvolutionEntry[];\n}\n\nexport const POKEMON_DATA: Record<number, PokemonDataEntry> = ${JSON.stringify(pokemonData, null, 2)};\n\nexport const POKEMON_TYPE_NAMES: Record<PokemonLanguage, Record<string, string>> = ${JSON.stringify(typeNamesByLocale, null, 2)};\n\nexport const ALL_TYPE_SLUGS = Object.keys(POKEMON_TYPE_NAMES.en)`;
  await writeFile(outPokemonPath, pokemonFile, "utf8");

  console.log(
    `\nWrote ${Object.keys(pokemonData).length} Pokémon entries to ${outPokemonPath}`,
  );
  console.log(
    `Wrote ${locationTranslations.size} location entries to ${outLocationsPath}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
