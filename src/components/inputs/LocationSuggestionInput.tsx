import React, { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  searchLocations,
  findLocationByName,
  type LocationSearchResult,
} from "@/src/services/locationSearch.ts";
import { normalizeLanguage } from "@/src/utils/language.ts";
import SuggestionInput from "@/src/components/inputs/SuggestionInput.tsx";
import { useMultiLocaleSearch } from "@/src/hooks/useMultiLocaleSearch.ts";

interface LocationSuggestionInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  selectedSlug?: string;
  onSelectedSlugChange?: (slug: string) => void;
  isOpen: boolean;
  gameVersionId?: string;
  placeholder?: string;
  disabled?: boolean;
}

const LocationSuggestionInput: React.FC<LocationSuggestionInputProps> = ({
  label,
  value,
  onChange,
  selectedSlug,
  onSelectedSlugChange,
  isOpen,
  gameVersionId,
  placeholder,
  disabled = false,
}) => {
  const { t, i18n } = useTranslation();
  const language = useMemo(
    () => normalizeLanguage(i18n.language),
    [i18n.language],
  );
  const multiLocaleSearch = useMultiLocaleSearch();
  const typedLocationMatch = useMemo(
    () =>
      findLocationByName(value, {
        locale: language,
        gameVersionId,
        multiLocaleSearch,
      }),
    [gameVersionId, language, multiLocaleSearch, value],
  );
  const fetchSuggestions = useCallback(
    (term: string) =>
      searchLocations(term, 1000, {
        locale: language,
        gameVersionId,
        multiLocaleSearch,
      }),
    [gameVersionId, language, multiLocaleSearch],
  );

  useEffect(() => {
    if (!typedLocationMatch || typedLocationMatch.slug === selectedSlug) return;
    onSelectedSlugChange?.(typedLocationMatch.slug);
  }, [onSelectedSlugChange, selectedSlug, typedLocationMatch]);

  return (
    <SuggestionInput<LocationSearchResult>
      id="location"
      label={label}
      value={value}
      onChange={(nextValue) => {
        onChange(nextValue);
        onSelectedSlugChange?.("");
      }}
      fetchSuggestions={fetchSuggestions}
      isOpen={isOpen}
      placeholder={placeholder || t("common.locationPlaceholder")}
      disabled={disabled}
      getSuggestionValue={(suggestion) => suggestion.name}
      getSuggestionKey={(suggestion) => suggestion.slug}
      onSelectSuggestion={(suggestion) =>
        onSelectedSlugChange?.(suggestion.slug)
      }
    />
  );
};

export default LocationSuggestionInput;
