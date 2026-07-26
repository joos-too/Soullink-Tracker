import React, { useCallback, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  findItemByName,
  getItemSpriteUrl,
  searchItems,
  type ItemSearchResult,
} from "@/src/services/search/itemSearch.ts";
import { normalizeLanguage } from "@/src/utils/language";
import SuggestionInput from "@/src/components/inputs/SuggestionInput.tsx";
import ItemSprite from "@/src/components/other/ItemSprite.tsx";
import { useMultiLocaleSearch } from "@/src/hooks/useMultiLocaleSearch.ts";

interface ItemSuggestionInputProps {
  label?: React.ReactNode;
  value: string;
  selectedSlug: string;
  onChange: (value: string) => void;
  onSelectedSlugChange: (slug: string) => void;
  isOpen: boolean;
  gameVersionId?: string;
  allPokemonAndItems?: boolean;
  placeholder?: string;
  multiLocaleSearch?: boolean;
}

const ItemSuggestionInput: React.FC<ItemSuggestionInputProps> = ({
  label,
  value,
  selectedSlug,
  onChange,
  onSelectedSlugChange,
  isOpen,
  gameVersionId,
  allPokemonAndItems = false,
  placeholder,
  multiLocaleSearch: multiLocaleSearchProp,
}) => {
  const { t, i18n } = useTranslation();
  const language = useMemo(
    () => normalizeLanguage(i18n.language),
    [i18n.language],
  );
  const contextMultiLocaleSearch = useMultiLocaleSearch();
  const multiLocaleSearch = multiLocaleSearchProp ?? contextMultiLocaleSearch;
  const typedItemMatch = useMemo(
    () =>
      findItemByName(
        value,
        language,
        allPokemonAndItems ? undefined : gameVersionId,
        multiLocaleSearch,
      ),
    [allPokemonAndItems, gameVersionId, language, multiLocaleSearch, value],
  );
  const resolvedSlug = selectedSlug || typedItemMatch?.slug || "";
  const spriteUrl = resolvedSlug ? getItemSpriteUrl(resolvedSlug) : null;

  const fetchSuggestions = useCallback(
    (term: string) =>
      Promise.resolve(
        searchItems(
          term,
          language,
          allPokemonAndItems ? undefined : gameVersionId,
          20,
          multiLocaleSearch,
        ),
      ),
    [allPokemonAndItems, gameVersionId, language, multiLocaleSearch],
  );

  useEffect(() => {
    if (!typedItemMatch || selectedSlug === typedItemMatch.slug) return;
    onSelectedSlugChange(typedItemMatch.slug);
  }, [onSelectedSlugChange, selectedSlug, typedItemMatch]);

  return (
    <SuggestionInput<ItemSearchResult>
      label={label}
      value={value}
      onChange={(nextValue) => {
        onChange(nextValue);
        onSelectedSlugChange("");
      }}
      fetchSuggestions={fetchSuggestions}
      isOpen={isOpen}
      placeholder={placeholder || t("modals.addStone.itemSearchPlaceholder")}
      minSearchLength={1}
      debounceMs={150}
      inputClassName="pr-14"
      getSuggestionValue={(suggestion) => suggestion.name}
      getSuggestionKey={(suggestion) => suggestion.slug}
      onSelectSuggestion={(suggestion) => onSelectedSlugChange(suggestion.slug)}
      renderSuggestion={(suggestion) => (
        <div className="flex items-center gap-2">
          <ItemSprite
            src={suggestion.spriteUrl}
            className="h-5 w-5 shrink-0 object-contain"
          />
          <span>{suggestion.name}</span>
        </div>
      )}
      endAdornment={
        spriteUrl ? (
          <ItemSprite
            src={spriteUrl}
            ariaHidden
            className="pointer-events-none absolute inset-y-0 right-2 my-auto h-10 w-10 select-none"
          />
        ) : null
      }
    />
  );
};

export default ItemSuggestionInput;
