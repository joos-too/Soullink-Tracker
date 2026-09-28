export interface FossilDef {
  id: string;
  gen: number;
  sprite: string;
}

export const FOSSILS: FossilDef[] = [
  { id: "helix-fossil", gen: 1, sprite: "gen1/helix-fossil.png" },
  { id: "dome-fossil", gen: 1, sprite: "gen1/dome-fossil.png" },
  { id: "old-amber", gen: 1, sprite: "gen1/old-amber.png" },
  { id: "root-fossil", gen: 3, sprite: "gen3/root-fossil.png" },
  { id: "claw-fossil", gen: 3, sprite: "gen3/claw-fossil.png" },
  { id: "skull-fossil", gen: 4, sprite: "gen4/skull-fossil.png" },
  { id: "armor-fossil", gen: 4, sprite: "gen4/armor-fossil.png" },
  { id: "cover-fossil", gen: 5, sprite: "gen5/cover-fossil.png" },
  { id: "plume-fossil", gen: 5, sprite: "gen5/plume-fossil.png" },
  { id: "jaw-fossil", gen: 6, sprite: "gen6/jaw-fossil.png" },
  { id: "sail-fossil", gen: 6, sprite: "gen6/sail-fossil.png" },
  { id: "fossilized-bird", gen: 8, sprite: "gen8/fossilized-bird.png" },
  { id: "fossilized-fish", gen: 8, sprite: "gen8/fossilized-fish.png" },
  { id: "fossilized-drake", gen: 8, sprite: "gen8/fossilized-drake.png" },
  { id: "fossilized-dino", gen: 8, sprite: "gen8/fossilized-dino.png" },
];

export interface StoneDef {
  id: string;
  gen: number;
  sprite: string;
}

export const STONES: StoneDef[] = [
  { id: "fire-stone", gen: 1, sprite: "gen1/fire-stone.png" },
  { id: "water-stone", gen: 1, sprite: "gen1/water-stone.png" },
  { id: "thunder-stone", gen: 1, sprite: "gen1/thunder-stone.png" },
  { id: "leaf-stone", gen: 1, sprite: "gen1/leaf-stone.png" },
  { id: "moon-stone", gen: 1, sprite: "gen1/moon-stone.png" },
  { id: "sun-stone", gen: 2, sprite: "gen2/sun-stone.png" },
  { id: "shiny-stone", gen: 4, sprite: "gen4/shiny-stone.png" },
  { id: "dusk-stone", gen: 4, sprite: "gen4/dusk-stone.png" },
  { id: "dawn-stone", gen: 4, sprite: "gen4/dawn-stone.png" },
  { id: "ice-stone", gen: 7, sprite: "gen7/ice-stone.png" },
];

export interface MegaStoneDef {
  id: string;
  pokemonId: number;
  version: "XY" | "ORAS";
}

/** Mega stones — id is the item slug, pokemonId is the PokeAPI mega form ID */
export const MEGA_STONES: MegaStoneDef[] = [
  // XY mega stones
  { id: "venusaurite", pokemonId: 10033, version: "XY" },
  { id: "charizardite-x", pokemonId: 10034, version: "XY" },
  { id: "charizardite-y", pokemonId: 10035, version: "XY" },
  { id: "blastoisinite", pokemonId: 10036, version: "XY" },
  { id: "alakazite", pokemonId: 10037, version: "XY" },
  { id: "gengarite", pokemonId: 10038, version: "XY" },
  { id: "kangaskhanite", pokemonId: 10039, version: "XY" },
  { id: "pinsirite", pokemonId: 10040, version: "XY" },
  { id: "gyaradosite", pokemonId: 10041, version: "XY" },
  { id: "aerodactylite", pokemonId: 10042, version: "XY" },
  { id: "mewtwonite-x", pokemonId: 10043, version: "XY" },
  { id: "mewtwonite-y", pokemonId: 10044, version: "XY" },
  { id: "ampharosite", pokemonId: 10045, version: "XY" },
  { id: "scizorite", pokemonId: 10046, version: "XY" },
  { id: "heracronite", pokemonId: 10047, version: "XY" },
  { id: "houndoominite", pokemonId: 10048, version: "XY" },
  { id: "tyranitarite", pokemonId: 10049, version: "XY" },
  { id: "blazikenite", pokemonId: 10050, version: "XY" },
  { id: "gardevoirite", pokemonId: 10051, version: "XY" },
  { id: "mawilite", pokemonId: 10052, version: "XY" },
  { id: "aggronite", pokemonId: 10053, version: "XY" },
  { id: "medichamite", pokemonId: 10054, version: "XY" },
  { id: "manectite", pokemonId: 10055, version: "XY" },
  { id: "banettite", pokemonId: 10056, version: "XY" },
  { id: "absolite", pokemonId: 10057, version: "XY" },
  { id: "garchompite", pokemonId: 10058, version: "XY" },
  { id: "lucarionite", pokemonId: 10059, version: "XY" },
  { id: "abomasite", pokemonId: 10060, version: "XY" },
  // ORAS mega stones
  { id: "beedrillite", pokemonId: 10090, version: "ORAS" },
  { id: "pidgeotite", pokemonId: 10073, version: "ORAS" },
  { id: "slowbronite", pokemonId: 10071, version: "ORAS" },
  { id: "steelixite", pokemonId: 10072, version: "ORAS" },
  { id: "sceptilite", pokemonId: 10065, version: "ORAS" },
  { id: "swampertite", pokemonId: 10064, version: "ORAS" },
  { id: "sablenite", pokemonId: 10066, version: "ORAS" },
  { id: "sharpedonite", pokemonId: 10070, version: "ORAS" },
  { id: "cameruptite", pokemonId: 10087, version: "ORAS" },
  { id: "altarianite", pokemonId: 10067, version: "ORAS" },
  { id: "glalitite", pokemonId: 10074, version: "ORAS" },
  { id: "salamencite", pokemonId: 10089, version: "ORAS" },
  { id: "metagrossite", pokemonId: 10076, version: "ORAS" },
  { id: "latiasite", pokemonId: 10062, version: "ORAS" },
  { id: "latiosite", pokemonId: 10063, version: "ORAS" },
  { id: "lopunnite", pokemonId: 10088, version: "ORAS" },
  { id: "galladite", pokemonId: 10068, version: "ORAS" },
  { id: "audinite", pokemonId: 10069, version: "ORAS" },
  { id: "diancite", pokemonId: 10075, version: "ORAS" },
];
