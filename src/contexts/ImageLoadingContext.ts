import { createContext, useContext } from "react";

// Fail closed outside the application provider, including while profiles load.
export const ImageLoadingContext = createContext(false);
export const useImageLoading = () => useContext(ImageLoadingContext);
