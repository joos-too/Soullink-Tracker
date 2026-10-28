import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getLatestPokemonCryUrl,
  playLatestPokemonCry,
} from "./pokemonCries.ts";

describe("pokemon cries", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps a PokéAPI ID to the raw latest cry", () => {
    expect(getLatestPokemonCryUrl(258)).toBe(
      "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/258.ogg",
    );
  });

  it("only creates audio when playback is requested and stops the previous cry", async () => {
    const instances: MockAudio[] = [];

    class MockAudio {
      pause = vi.fn();
      play = vi.fn().mockResolvedValue(undefined);
      addEventListener = vi.fn();
      volume = 1;

      constructor(public src: string) {
        instances.push(this);
      }
    }

    vi.stubGlobal("Audio", MockAudio);

    expect(instances).toHaveLength(0);
    await playLatestPokemonCry(1);
    expect(instances[0]?.src).toBe(getLatestPokemonCryUrl(1));
    expect(instances[0]?.volume).toBe(0.25);
    expect(instances[0]?.play).toHaveBeenCalledOnce();

    await playLatestPokemonCry(2, 80);
    expect(instances[0]?.pause).toHaveBeenCalledOnce();
    expect(instances[1]?.src).toBe(getLatestPokemonCryUrl(2));
    expect(instances[1]?.volume).toBe(0.8);
  });
});
