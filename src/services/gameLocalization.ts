import type { TFunction } from "i18next";
import type { VariableRival } from "@/src/types/domain";

const NO_TRANSLATION = "__soullink_no_translation__";

const translateSlug = (
  t: TFunction,
  namespace: string,
  slug: string | undefined | null,
  fallback: string,
) => {
  if (!slug) return fallback;
  const value = t(`gameData.${namespace}.${slug}`, {
    defaultValue: NO_TRANSLATION,
  });
  return value === NO_TRANSLATION ? fallback : String(value);
};

const formatSlug = (slug: string): string =>
  slug
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export const getLocalizedRivalEntry = (
  t: TFunction,
  rival: string | VariableRival,
) => {
  if (typeof rival === "string") {
    return translateSlug(t, "rivals", rival, formatSlug(rival));
  }

  return {
    ...rival,
    name: translateSlug(t, "rivals", rival.key, formatSlug(rival.key)),
    options: {
      male: translateSlug(
        t,
        "rivals",
        rival.options.male,
        formatSlug(rival.options.male),
      ),
      female: translateSlug(
        t,
        "rivals",
        rival.options.female,
        formatSlug(rival.options.female),
      ),
    },
  };
};

export const getLocalizedGameName = (
  t: TFunction,
  versionId?: string | null,
  fallback: string = "",
) => {
  const slug = fallback || versionId;
  return translateSlug(t, "games", slug, fallback || versionId || "");
};

export const getLocalizedArenaLabel = (
  t: TFunction,
  _versionId: string | undefined,
  _capId: number | string,
  fallback: string,
) => translateSlug(t, "arenas", fallback, fallback);

export const getLocalizedRivalLocation = (
  t: TFunction,
  _versionId: string | undefined,
  _capId: number | string,
  fallback: string,
) => translateSlug(t, "locations", fallback, fallback);

export const resolveRivalDisplayName = (
  t: TFunction,
  _versionId: string | undefined,
  _capId: number | string,
  rival: string | VariableRival,
) => {
  const localized = getLocalizedRivalEntry(t, rival);
  return typeof localized === "string" ? localized : localized.name;
};

export const getLocalizedSelectionLabel = (
  t: TFunction,
  _versionId: string | undefined,
  label: string,
) => translateSlug(t, "selections", label, label);

export const getLocalizedBadgeLabel = (
  t: TFunction,
  _versionId: string | undefined,
  label: string,
) => translateSlug(t, "badges", label, label);
