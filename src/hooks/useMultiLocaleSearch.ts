import { createContext, useContext } from "react";

export const MultiLocaleSearchContext = createContext<boolean>(false);

export function useMultiLocaleSearch(): boolean {
  return useContext(MultiLocaleSearchContext);
}
