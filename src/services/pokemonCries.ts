import { DEFAULT_CRY_VOLUME_PERCENT } from "@/src/contexts/CryVolumeContext.ts";

const POKEAPI_CRY_BASE_URL =
  "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest";

let activeCry: HTMLAudioElement | null = null;

export const getLatestPokemonCryUrl = (pokemonId: number) =>
  `${POKEAPI_CRY_BASE_URL}/${pokemonId}.ogg`;

export const playLatestPokemonCry = async (
  pokemonId: number,
  volumePercent = DEFAULT_CRY_VOLUME_PERCENT,
) => {
  activeCry?.pause();

  const cry = new Audio(getLatestPokemonCryUrl(pokemonId));
  cry.volume = Math.min(100, Math.max(0, volumePercent)) / 100;
  activeCry = cry;

  cry.addEventListener(
    "ended",
    () => {
      if (activeCry === cry) activeCry = null;
    },
    { once: true },
  );

  try {
    await cry.play();
  } catch (error) {
    if (activeCry === cry) activeCry = null;
    throw error;
  }
};
