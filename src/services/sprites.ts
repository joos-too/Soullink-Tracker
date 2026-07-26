import { findPokemonIdByName } from "@/src/services/search/pokemonSearch.ts";
import type { SupportedLanguage } from "@/src/utils/language";

// Map game version IDs to PokeAPI sprite generation paths
export function getGenerationSpritePath(gameVersionId: string): string | null {
  const mapping: Record<string, string> = {
    // Generation I - using transparent variants
    gen1_rb: "versions/generation-i/red-blue/transparent",
    gen1_y: "versions/generation-i/yellow/transparent",
    // Generation II - using transparent variants
    gen2_gs: "versions/generation-ii/gold/transparent",
    gen2_c: "versions/generation-ii/crystal/transparent",
    // Generation III
    gen3_rusa: "versions/generation-iii/ruby-sapphire",
    gen3_em: "versions/generation-iii/emerald",
    gen3_frlg: "versions/generation-iii/firered-leafgreen",
    // Generation IV
    gen4_dp: "versions/generation-iv/diamond-pearl",
    gen4_pt: "versions/generation-iv/platinum",
    gen4_hgss: "versions/generation-iv/heartgold-soulsilver",
    // Generation V
    gen5_bw: "versions/generation-v/black-white",
    gen5_b2w2: "versions/generation-v/black-white", // Gen 5 only has black-white sprites
    // Generation VI and later don't have version-specific sprites in PokeAPI
    // They use the modern unified sprites, so return null
  };
  return mapping[gameVersionId] || null;
}

// Known gaps where PokeAPI does not provide a sprite/one does not exist for the requested game,
// so we swap in a nearby generation path (or the default modern sprite).
type GenerationFallbackRule = {
  generationPath: string;
  fallbackPath: string | null;
  maxSupportedId?: number;
  minSupportedId?: number;
  missingIds?: Set<number>;
};

const GENERATION_1_MAX_ID = 151;
const GENERATION_2_MAX_ID = GENERATION_1_MAX_ID + 100;
const GENERATION_3_MAX_ID = GENERATION_2_MAX_ID + 135;
const GENERATION_4_MAX_ID = GENERATION_3_MAX_ID + 107;

const GENERATION_SPRITE_FALLBACKS: GenerationFallbackRule[] = [
  {
    generationPath: "versions/generation-i/red-blue/transparent",
    maxSupportedId: GENERATION_1_MAX_ID,
    fallbackPath: "versions/generation-v/black-white",
  },
  {
    generationPath: "versions/generation-i/yellow/transparent",
    maxSupportedId: GENERATION_1_MAX_ID,
    fallbackPath: "versions/generation-v/black-white",
  },
  {
    generationPath: "versions/generation-ii/gold/transparent",
    maxSupportedId: GENERATION_2_MAX_ID,
    fallbackPath: "versions/generation-v/black-white",
  },
  {
    generationPath: "versions/generation-ii/crystal/transparent",
    maxSupportedId: GENERATION_2_MAX_ID,
    fallbackPath: "versions/generation-v/black-white",
  },
  {
    generationPath: "versions/generation-iii/ruby-sapphire",
    maxSupportedId: GENERATION_3_MAX_ID,
    fallbackPath: "versions/generation-v/black-white",
  },
  {
    generationPath: "versions/generation-iii/emerald",
    maxSupportedId: GENERATION_3_MAX_ID,
    fallbackPath: "versions/generation-v/black-white",
  },
  {
    // PokeAPI only ships Kanto sprites for FR/LG; anything above 151 falls back to Emerald
    generationPath: "versions/generation-iii/firered-leafgreen",
    maxSupportedId: GENERATION_1_MAX_ID,
    fallbackPath: "versions/generation-iii/emerald",
  },
  {
    generationPath: "versions/generation-iv/diamond-pearl",
    maxSupportedId: GENERATION_4_MAX_ID,
    fallbackPath: "versions/generation-v/black-white",
  },
  {
    generationPath: "versions/generation-iv/platinum",
    maxSupportedId: GENERATION_4_MAX_ID,
    fallbackPath: "versions/generation-v/black-white",
  },
  {
    generationPath: "versions/generation-iv/heartgold-soulsilver",
    maxSupportedId: GENERATION_4_MAX_ID,
    fallbackPath: "versions/generation-v/black-white",
  },
];

function applySpriteGenerationFallback(
  generationPath: string | null | undefined,
  id: number | null,
): string | null {
  let effectiveGenerationPath = generationPath || null;

  while (effectiveGenerationPath && id) {
    const rule = GENERATION_SPRITE_FALLBACKS.find(
      (entry) => entry.generationPath === effectiveGenerationPath,
    );
    if (!rule) return effectiveGenerationPath;

    const outsideMin =
      typeof rule.minSupportedId === "number" && id < rule.minSupportedId;
    const outsideMax =
      typeof rule.maxSupportedId === "number" && id > rule.maxSupportedId;
    const explicitlyMissing = rule.missingIds?.has(id);

    if (!outsideMin && !outsideMax && !explicitlyMissing) {
      return effectiveGenerationPath;
    }

    if (rule.fallbackPath === effectiveGenerationPath) {
      return effectiveGenerationPath;
    }

    effectiveGenerationPath = rule.fallbackPath;
  }

  return effectiveGenerationPath;
}

// Official artwork (high-res) by numeric id
export function getOfficialArtworkUrlById(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

// Classic front sprite by numeric id
export function getSpriteUrlById(
  id: number,
  generationPath?: string | null,
): string {
  const effectiveGenerationPath = applySpriteGenerationFallback(
    generationPath,
    id,
  );
  if (effectiveGenerationPath) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${effectiveGenerationPath}/${id}.png`;
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

// Resolve classic sprite by localized name
export function getSpriteUrlForPokemonName(
  name: string | undefined | null,
  generationPath?: string | null,
  locale?: SupportedLanguage,
): string | null {
  const match = findPokemonIdByName(name, locale);
  if (!match) return null;
  return getSpriteUrlById(match.id, generationPath);
}
