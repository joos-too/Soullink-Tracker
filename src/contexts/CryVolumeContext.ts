import { createContext, useContext } from "react";

export const DEFAULT_CRY_VOLUME_PERCENT = 25;
export const CRY_VOLUME_STORAGE_KEY = "soullink:cryVolumePercent";

export const normalizeCryVolumePercent = (volumePercent: number) =>
  Math.round(Math.min(100, Math.max(0, volumePercent)));

export const readStoredCryVolumePercent = () => {
  try {
    const stored = window.localStorage.getItem(CRY_VOLUME_STORAGE_KEY);
    if (stored === null) return DEFAULT_CRY_VOLUME_PERCENT;
    const parsed = Number(stored);
    return Number.isFinite(parsed)
      ? normalizeCryVolumePercent(parsed)
      : DEFAULT_CRY_VOLUME_PERCENT;
  } catch {
    return DEFAULT_CRY_VOLUME_PERCENT;
  }
};

export const storeCryVolumePercent = (volumePercent: number) => {
  const normalizedVolume = normalizeCryVolumePercent(volumePercent);
  try {
    window.localStorage.setItem(
      CRY_VOLUME_STORAGE_KEY,
      String(normalizedVolume),
    );
  } catch {
    /* Keep the current in-memory choice if storage is unavailable. */
  }
  return normalizedVolume;
};

export const CryVolumeContext = createContext(DEFAULT_CRY_VOLUME_PERCENT);
export const useCryVolume = () => useContext(CryVolumeContext);
