import { createContext, useContext } from "react";
import type { PokemonImageStyle } from "@/types.ts";

export const PokemonImageStyleContext =
  createContext<PokemonImageStyle>("mixed");

export const usePokemonImageStyle = (): PokemonImageStyle =>
  useContext(PokemonImageStyleContext);
