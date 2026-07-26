import { SupportedLanguage } from "@/src/utils/language.ts";
import { TFunction } from "i18next";
import { POKEMON_DATA, PokemonDataEntry } from "@/src/data/pokemon";

interface EvolutionMethodRecord {
  slug: string;
  names: Record<SupportedLanguage, string>;
}

interface EvolutionMethodInfo {
  slug: string;
  label: string;
}

const getEvolutionMethods = (
  methods: unknown,
  language: SupportedLanguage,
): EvolutionMethodInfo[] => {
  if (!Array.isArray(methods)) return [];
  return (methods as EvolutionMethodRecord[])
    .map((method) => ({
      slug: method.slug,
      label: method.names[language] ?? method.names.de ?? method.names.en ?? "",
    }))
    .filter((method) => method.slug && method.label);
};

const getEvolutionEntries = (
  pokemon: PokemonDataEntry,
  language: SupportedLanguage,
) =>
  (pokemon.evolutions ?? []).map((entry) => ({
    id: entry.id,
    methods: getEvolutionMethods(entry.methods, language),
  }));

export interface MethodGenerationRule {
  method_slugs: string[];
  minGeneration?: number;
  exactGeneration?: number;
  maxGeneration?: number;
}

const EVOLUTION_TABLES: Record<
  SupportedLanguage,
  Record<number, { id: number; methods: EvolutionMethodInfo[] }[]>
> = {
  de: Object.fromEntries(
    Object.entries(POKEMON_DATA).map(([id, pokemon]) => [
      Number(id),
      getEvolutionEntries(pokemon, "de"),
    ]),
  ),
  en: Object.fromEntries(
    Object.entries(POKEMON_DATA).map(([id, pokemon]) => [
      Number(id),
      getEvolutionEntries(pokemon, "en"),
    ]),
  ),
};

// id = pokemon which evolution results in
const METHOD_GENERATION_RULES: Record<number, MethodGenerationRule[]> = {
  20: [
    {
      method_slugs: ["level-up-min-level-20-time-night"],
      minGeneration: 7,
    },
  ],
  28: [
    {
      method_slugs: ["use-item-ice-stone"],
      minGeneration: 7,
    },
  ],
  38: [
    {
      method_slugs: ["use-item-ice-stone"],
      minGeneration: 7,
    },
  ],
  53: [
    {
      method_slugs: ["level-up-min-happiness-160"],
      minGeneration: 7,
    },
  ],
  80: [
    {
      method_slugs: ["use-item-galarica-cuff"],
      minGeneration: 7,
    },
  ],
  101: [
    {
      method_slugs: ["use-item-leaf-stone"],
      minGeneration: 7,
    },
  ],
  105: [
    {
      method_slugs: ["level-up-min-level-28-time-night"],
      minGeneration: 7,
    },
  ],
  199: [
    {
      method_slugs: ["use-item-galarica-wreath"],
      minGeneration: 7,
    },
  ],
  350: [
    {
      method_slugs: ["trade-held-item-prism-scale"],
      minGeneration: 5,
    },
  ],
  462: [
    {
      method_slugs: ["use-item-thunder-stone"],
      minGeneration: 8,
    },
  ],
  476: [
    {
      method_slugs: ["use-item-thunder-stone"],
      minGeneration: 8,
    },
  ],
  470: [
    {
      method_slugs: ["use-item-leaf-stone"],
      minGeneration: 8,
    },
  ],
  471: [
    {
      method_slugs: ["use-item-ice-stone"],
      minGeneration: 8,
    },
  ],
  700: [
    {
      method_slugs: ["level-up-min-happiness-160-known-move-type-fairy"],
      minGeneration: 8,
    },
  ],
  738: [
    {
      method_slugs: ["use-item-thunder-stone"],
      minGeneration: 8,
    },
  ],
  904: [
    {
      method_slugs: ["level-up-known-move-barb-barrage"],
      minGeneration: 9,
    },
  ],
};

const METHOD_VERSION_RULES: Record<string, string[]> = {
  "level-up-location-mt-coronet": ["gen4_dp", "gen4_pt"],
  "level-up-location-chargestone-cave": ["gen5_bw", "gen5_b2w2"],
  "level-up-location-kalos-route-13": ["gen6_xy"],
  "level-up-location-pinwheel-forest": ["gen5_bw", "gen5_b2w2"],
  "level-up-location-eterna-forest": ["gen4_dp", "gen4_pt"],
  "level-up-location-kalos-route-20": ["gen6_xy"],
  "level-up-location-petalburg-woods": ["gen6_oras"],
  "level-up-location-sinnoh-route-217": ["gen4_dp", "gen4_pt"],
  "level-up-location-twist-mountain": ["gen5_bw", "gen5_b2w2"],
  "level-up-location-frost-cavern": ["gen6_xy"],
  "level-up-location-shoal-cave": ["gen6_oras"],
  "level-up-location-vast-poni-canyon": ["gen7_sm", "gen7_usum"],
  "level-up-location-blush-mountain": ["gen7_sm", "gen7_usum"],
  "level-up-location-mount-lanakila": ["gen7_sm", "gen7_usum"],
  "level-up-min-beauty-170": [
    "gen3_rusa",
    "gen3_em",
    "gen4_dp",
    "gen4_pt",
    "gen4_hgss",
    "gen6_oras",
  ],
  "strong-style-move-used-move-barb-barrage-min-move-count-20": ["gen8_pla"],
  "use-move-barb-barrage-20-times": ["gen9_plza"],
};

export function methodAllowedForVersion(
  methodSlug: string,
  gameVersionId?: string,
) {
  if (!gameVersionId) return true;
  const allowedVersions = METHOD_VERSION_RULES[methodSlug];
  if (!allowedVersions) return true;
  return allowedVersions.includes(gameVersionId);
}

export function filterMethodsForConstraints(
  pokemonId: number,
  methods: EvolutionMethodInfo[] | undefined,
  generation?: number | null,
  gameVersionId?: string,
) {
  if (!methods || methods.length === 0) return methods || [];
  let filtered = methods;
  if (typeof generation === "number") {
    const rules = METHOD_GENERATION_RULES[pokemonId];
    if (rules && rules.length) {
      filtered = filtered.filter((method) => {
        const rule = rules.find((r) => r.method_slugs?.includes(method.slug));
        if (!rule) return true;
        if (
          typeof rule.minGeneration === "number" &&
          generation < rule.minGeneration
        )
          return false;
        if (
          typeof rule.maxGeneration === "number" &&
          generation > rule.maxGeneration
        )
          return false;
        if (
          typeof rule.exactGeneration === "number" &&
          generation == rule.exactGeneration
        )
          return false;
        return true;
      });
    }
  }
  if (gameVersionId) {
    filtered = filtered.filter((method) =>
      methodAllowedForVersion(method.slug, gameVersionId),
    );
  }
  return filtered;
}

export function getFilteredEvolutionEntriesForPokemon(
  pokemonId: number,
  language: SupportedLanguage,
  t: TFunction,
  generation?: number | null,
  gameVersionId?: string,
) {
  const evoTable = EVOLUTION_TABLES[language] || EVOLUTION_TABLES.de;
  const evoEntries = evoTable[pokemonId] || [];
  const generationLimit = typeof generation === "number" ? generation : null;
  const filteredEntries =
    generationLimit === null
      ? evoEntries
      : evoEntries.filter((entry) => {
          const gen = POKEMON_DATA[entry.id]?.generation;
          if (typeof gen !== "number") return true;
          return gen <= generationLimit;
        });
  if (filteredEntries.length === 0) return [];
  const defaultUnknown = t("tracker.evolveModal.methodUnknown");
  return filteredEntries
    .map((entry) => {
      const baseMethods =
        entry.methods && entry.methods.length
          ? entry.methods
          : [{ slug: "unknown", label: defaultUnknown }];
      const methodsForConstraints = filterMethodsForConstraints(
        entry.id,
        baseMethods,
        generation,
        gameVersionId,
      );
      return {
        id: entry.id,
        methods: methodsForConstraints.map((method) => method.label),
      };
    })
    .filter((entry) => entry.methods.length > 0);
}
