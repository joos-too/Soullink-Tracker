import React from "react";
import { getLocalizedTypeName } from "@/src/services/pokemons/pokemonTypes.ts";
import { normalizeLanguage } from "@/src/utils/language.ts";
import { useTranslation } from "react-i18next";

/**
 * Official-style Pokémon type color palette.
 * Each type has a main background color and a darker border/outline color.
 */
const TYPE_COLORS: Record<string, { bg: string; border: string }> = {
  normal: { bg: "#A8A77A", border: "#6D6D4E" },
  fire: { bg: "#EE8130", border: "#9C531F" },
  water: { bg: "#6390F0", border: "#445E9C" },
  electric: { bg: "#F7D02C", border: "#A1871F" },
  grass: { bg: "#7AC74C", border: "#4E8234" },
  ice: { bg: "#96D9D6", border: "#638D8D" },
  fighting: { bg: "#C22E28", border: "#7D1F1A" },
  poison: { bg: "#A33EA1", border: "#682A68" },
  ground: { bg: "#E2BF65", border: "#927D44" },
  flying: { bg: "#A98FF0", border: "#6D5E9C" },
  psychic: { bg: "#F95587", border: "#A13959" },
  bug: { bg: "#A6B91A", border: "#6D7815" },
  rock: { bg: "#B6A136", border: "#786824" },
  ghost: { bg: "#735797", border: "#493963" },
  dragon: { bg: "#6F35FC", border: "#4924A1" },
  dark: { bg: "#705746", border: "#49392F" },
  steel: { bg: "#B7B7CE", border: "#787887" },
  fairy: { bg: "#D685AD", border: "#9B6470" },
};

const DEFAULT_COLORS = { bg: "#68A090", border: "#44685A" };

interface TypeBadgeProps {
  typeSlug: string;
  selected?: boolean;
}

const TypeBadge: React.FC<TypeBadgeProps> = ({
  typeSlug,
  selected = false,
}) => {
  const { i18n } = useTranslation();
  const locale = normalizeLanguage(i18n.language);
  const label = getLocalizedTypeName(typeSlug, locale).toUpperCase();
  const colors = TYPE_COLORS[typeSlug] ?? DEFAULT_COLORS;

  return (
    <span
      className="inline-flex items-center justify-center rounded-sm text-[9px] font-bold leading-none tracking-wider text-white shadow-sm whitespace-nowrap transition-shadow"
      style={{
        backgroundColor: colors.bg,
        border: `1.5px solid ${colors.border}`,
        padding: "2px 4px",
        boxShadow: selected
          ? "0 0 0 2px #22c55e, 0 1px 2px 0 rgb(0 0 0 / 0.05)"
          : undefined,
        textShadow: "0 0.5px 1px rgba(0,0,0,0.3)",
      }}
    >
      {label}
    </span>
  );
};

export default TypeBadge;
