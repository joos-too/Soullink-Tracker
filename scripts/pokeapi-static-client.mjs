import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_DATA_DIR = path.resolve(__dirname, "pokeapi-data");

const ENDPOINT_METHODS = {
  EvolutionChain: "evolution-chain",
  Item: "item",
  ItemCategory: "item-category",
  ItemPocket: "item-pocket",
  Location: "location",
  Move: "move",
  Pokemon: "pokemon",
  PokemonSpecies: "pokemon-species",
  Type: "type",
};

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function extractIdFromUrl(url) {
  const match = String(url || "").match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : null;
}

function sliceList(list, interval = {}) {
  const results = Array.isArray(list?.results) ? list.results : [];
  const offset = Number.isFinite(interval.offset) ? interval.offset : 0;
  const limit = Number.isFinite(interval.limit)
    ? interval.limit
    : results.length;
  const end = offset + limit;

  return {
    ...list,
    count: typeof list?.count === "number" ? list.count : results.length,
    next: end < results.length ? "static-data-next-page" : null,
    previous: offset > 0 ? "static-data-previous-page" : null,
    results: results.slice(offset, end),
  };
}

export class StaticPokeApiClient {
  constructor(options = {}) {
    this.requestedRoot = path.resolve(
      options.dataDir || process.env.POKEAPI_DATA_DIR || DEFAULT_DATA_DIR,
    );
    this.apiRoot = null;
    this.fileCache = new Map();
    this.nameToIdCache = new Map();
  }

  async resolveApiRoot() {
    if (this.apiRoot) return this.apiRoot;

    const candidates = [
      this.requestedRoot,
      path.join(this.requestedRoot, "v2"),
      path.join(this.requestedRoot, "api", "v2"),
      path.join(this.requestedRoot, "data", "api", "v2"),
    ];

    for (const candidate of candidates) {
      if (await exists(path.join(candidate, "pokemon", "index.json"))) {
        this.apiRoot = candidate;
        return this.apiRoot;
      }
    }

    throw new Error(
      [
        `Could not find PokeAPI static data under ${this.requestedRoot}.`,
        "Clone https://github.com/PokeAPI/api-data into scripts/pokeapi-data",
        "or set POKEAPI_DATA_DIR to the repo root or data/api/v2 directory.",
      ].join(" "),
    );
  }

  async readJson(...segments) {
    const apiRoot = await this.resolveApiRoot();
    const filePath = path.join(apiRoot, ...segments);
    const cached = this.fileCache.get(filePath);
    if (cached) return cached;

    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    this.fileCache.set(filePath, parsed);
    return parsed;
  }

  async getEndpointIndex(endpoint) {
    return this.readJson(endpoint, "index.json");
  }

  async getNameToIdMap(endpoint) {
    const cached = this.nameToIdCache.get(endpoint);
    if (cached) return cached;

    const index = await this.getEndpointIndex(endpoint);
    const map = new Map();
    for (const resource of index.results || []) {
      const id = extractIdFromUrl(resource.url);
      if (resource.name && id) {
        map.set(String(resource.name).toLowerCase(), id);
      }
    }
    this.nameToIdCache.set(endpoint, map);
    return map;
  }

  async resolveId(endpoint, nameOrId) {
    if (typeof nameOrId === "number") return nameOrId;
    const value = String(nameOrId || "").trim();
    if (!value) throw new Error(`Missing ${endpoint} name or id`);
    if (/^\d+$/.test(value)) return Number(value);

    const nameToId = await this.getNameToIdMap(endpoint);
    const id = nameToId.get(value.toLowerCase());
    if (!id) throw new Error(`Unknown ${endpoint}: ${value}`);
    return id;
  }

  async getResourceByNameOrId(endpoint, nameOrId) {
    const id = await this.resolveId(endpoint, nameOrId);
    return this.readJson(endpoint, String(id), "index.json");
  }

  async getResourceList(endpoint, interval) {
    const index = await this.getEndpointIndex(endpoint);
    return sliceList(index, interval);
  }

  async getItemByName(nameOrId) {
    return this.getResourceByNameOrId(ENDPOINT_METHODS.Item, nameOrId);
  }

  async getItemCategoryByName(nameOrId) {
    return this.getResourceByNameOrId(ENDPOINT_METHODS.ItemCategory, nameOrId);
  }

  async getItemPocketByName(nameOrId) {
    return this.getResourceByNameOrId(ENDPOINT_METHODS.ItemPocket, nameOrId);
  }

  async getItemPocketsList(interval) {
    return this.getResourceList(ENDPOINT_METHODS.ItemPocket, interval);
  }

  async getPokemonSpeciesByName(nameOrId) {
    return this.getResourceByNameOrId(
      ENDPOINT_METHODS.PokemonSpecies,
      nameOrId,
    );
  }

  async getPokemonSpeciesList(interval) {
    return this.getResourceList(ENDPOINT_METHODS.PokemonSpecies, interval);
  }

  async getPokemonByName(nameOrId) {
    return this.getResourceByNameOrId(ENDPOINT_METHODS.Pokemon, nameOrId);
  }

  async getEvolutionChainById(id) {
    return this.getResourceByNameOrId(ENDPOINT_METHODS.EvolutionChain, id);
  }

  async getLocationsList(interval) {
    return this.getResourceList(ENDPOINT_METHODS.Location, interval);
  }

  async getLocationByName(nameOrId) {
    return this.getResourceByNameOrId(ENDPOINT_METHODS.Location, nameOrId);
  }

  async getMoveByName(nameOrId) {
    return this.getResourceByNameOrId(ENDPOINT_METHODS.Move, nameOrId);
  }

  async getTypeByName(nameOrId) {
    return this.getResourceByNameOrId(ENDPOINT_METHODS.Type, nameOrId);
  }
}

export function createStaticPokeApiClient(options) {
  return new StaticPokeApiClient(options);
}
