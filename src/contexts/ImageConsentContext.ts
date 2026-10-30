import { createContext, useContext } from "react";

interface ImageConsentState {
  decision: boolean | null;
  isOpen: boolean;
  openConsent: (() => void) | null;
  showGuestFooterEntry: boolean;
}

export const ImageConsentContext = createContext<ImageConsentState>({
  decision: null,
  isOpen: false,
  openConsent: null,
  showGuestFooterEntry: false,
});
export const useImageConsent = () => useContext(ImageConsentContext);
