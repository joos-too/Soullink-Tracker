import React from "react";
import type { UserSettings, VariableRival } from "@/types.ts";
import { getSpriteUrlForPokemonName } from "@/src/services/sprites.ts";

// RivalImage component for displaying rival sprites
export const RivalImage: React.FC<{
  rival: string | VariableRival;
  preferences: UserSettings["rivalPreferences"];
  defaultPreferences?: Record<string, string>;
  displayName?: string;
}> = ({ rival, preferences, defaultPreferences, displayName }) => {
  let spriteName: string;
  let fallbackDisplayName: string;

  if (typeof rival === "string") {
    spriteName = rival
      .toLowerCase()
      .replace(/ & /g, "_")
      .replace(/ /g, "_")
      .replace(/[^a-z0-9_]/g, "");
    fallbackDisplayName = rival;
  } else {
    const preference =
      preferences?.[rival.key] ?? defaultPreferences?.[rival.key] ?? "male";
    spriteName = rival.options[preference];
    fallbackDisplayName = rival.key;
  }
  const resolvedDisplayName = displayName || fallbackDisplayName;

  const imagePath = `/rival-sprites/${spriteName}.png`;
  return (
    <img
      src={imagePath}
      alt=""
      title={resolvedDisplayName}
      className="w-8 h-8 object-contain mx-auto"
      style={{ imageRendering: "pixelated" }}
    />
  );
};

// Function to get badge URL based on arena label and position
export const getBadgeUrl = (
  arenaLabel: string,
  posIndex: number,
  badgeSet?: string,
): string => {
  const raw = arenaLabel || "";
  const label = raw.toLowerCase();

  if (label.startsWith("elite_four_")) {
    return `/elite4-sprites/${label.replace(/^elite_four_/, "")}.png`;
  }

  if (label.startsWith("champion_")) {
    return `/champ-sprites/${label.replace(/^champion_/, "")}.png`;
  }

  const set = badgeSet;
  const pos = Math.min(Math.max(posIndex + 1, 1), 8);
  return `/badge-sprites/${set}/${pos}.png`;
};

// BadgeImage component for displaying badge images
export const BadgeImage: React.FC<{
  arenaLabel: string;
  posIndex: number;
  badgeSet?: string;
  className?: string;
}> = ({
  arenaLabel,
  posIndex,
  badgeSet,
  className = "w-8 h-8 object-contain",
}) => {
  const badgeUrl = getBadgeUrl(arenaLabel, posIndex, badgeSet);
  const isPixelated = !arenaLabel.toLowerCase().includes("gym");

  return (
    <img
      src={badgeUrl}
      alt=""
      className={className}
      style={{ imageRendering: isPixelated ? "pixelated" : "inherit" }}
    />
  );
};

// LegendaryImage component for displaying legendary Pokémon
export const LegendaryImage: React.FC<{
  pokemonName: string;
  className?: string;
  generationSpritePath?: string | null;
}> = ({ pokemonName, className = "w-16 h-16", generationSpritePath }) => {
  return (
    <img
      src={getSpriteUrlForPokemonName(pokemonName, generationSpritePath)}
      alt=""
      className={className}
    />
  );
};
