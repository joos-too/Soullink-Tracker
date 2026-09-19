export type WikiId = "pokewiki" | "bulbapedia" | "pokemondb";

export interface Wiki {
  id: WikiId;
  name: string;
  language: "de" | "en";
  baseUrl: string;
  buildUrl: (pokemonName: string) => string;
}

export const WIKIS: Wiki[] = [
  {
    id: "pokewiki",
    name: "PokéWiki",
    language: "de",
    baseUrl: "https://www.pokewiki.de",
    buildUrl: (name) => `https://www.pokewiki.de/${encodeURIComponent(name)}`,
  },
  {
    id: "bulbapedia",
    name: "Bulbapedia",
    language: "en",
    baseUrl: "https://bulbapedia.bulbagarden.net",
    buildUrl: (name) =>
      `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(name)}_(Pok%C3%A9mon)`,
  },
  {
    id: "pokemondb",
    name: "PokémonDB",
    language: "en",
    baseUrl: "https://pokemondb.net",
    buildUrl: (name) =>
      `https://pokemondb.net/pokedex/${encodeURIComponent(name.toLowerCase())}`,
  },
];

/** Default wiki when the app is displayed in German */
export const DEFAULT_WIKI_DE: WikiId = "pokewiki";

/** Default wiki when the app is displayed in English */
export const DEFAULT_WIKI_EN: WikiId = "bulbapedia";
