// Legendary Pokémon organized by generation
const LEGENDARY_POKEMON_BY_GENERATION: Record<number, string[]> = {
  1: ["Arktos", "Zapdos", "Lavados", "Mewtu", "Mew"],
  2: ["Raikou", "Entei", "Suicune", "Lugia", "Ho-Oh", "Celebi"],
  3: [
    "Regirock",
    "Regice",
    "Registeel",
    "Latias",
    "Latios",
    "Kyogre",
    "Groudon",
    "Rayquaza",
    "Jirachi",
    "Deoxys",
  ],
  4: [
    "Selfe",
    "Vesprit",
    "Tobutz",
    "Dialga",
    "Palkia",
    "Heatran",
    "Regigigas",
    "Giratina",
    "Cresselia",
    "Phione",
    "Manaphy",
    "Darkrai",
    "Shaymin",
    "Arceus",
  ],
  5: [
    "Victini",
    "Kobalium",
    "Terrakium",
    "Viridium",
    "Boreos",
    "Voltolos",
    "Reshiram",
    "Zekrom",
    "Demeteros",
    "Kyurem",
    "Keldeo",
    "Meloetta",
    "Genesect",
  ],
  6: ["Xerneas", "Yveltal", "Zygarde", "Diancie", "Hoopa", "Volcanion"],
};

// Filter legendary Pokémon up to and including the specified generation
export const getLegendariesUpToGeneration = (
  maxGeneration: number,
): string[] => {
  const result: string[] = [];
  for (let gen = 1; gen <= maxGeneration; gen++) {
    result.push(...(LEGENDARY_POKEMON_BY_GENERATION[gen] || []));
  }
  return result;
};
