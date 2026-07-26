import React, { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { searchPokemonNames } from "@/src/services/search/pokemonSearch.ts";
import { getSpriteUrlForPokemonName } from "@/src/services/sprites.ts";
import { normalizeLanguage } from "@/src/utils/language.ts";
import SuggestionInput from "@/src/components/inputs/SuggestionInput.tsx";
import { useMultiLocaleSearch } from "@/src/hooks/useMultiLocaleSearch.ts";

interface PokemonSuggestionInputProps {
  label?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  isOpen: boolean;
  generationLimit?: number;
  generationSpritePath?: string | null;
  multiLocaleSearch?: boolean;
}

const PokemonSuggestionInput: React.FC<PokemonSuggestionInputProps> = ({
  label,
  value,
  onChange,
  isOpen,
  generationLimit,
  generationSpritePath,
  multiLocaleSearch: multiLocaleSearchProp,
}) => {
  const { t, i18n } = useTranslation();
  const language = useMemo(
    () => normalizeLanguage(i18n.language),
    [i18n.language],
  );
  const contextMultiLocaleSearch = useMultiLocaleSearch();
  const multiLocaleSearch = multiLocaleSearchProp ?? contextMultiLocaleSearch;
  const spriteLocale = multiLocaleSearch ? undefined : language;
  const spriteUrl = getSpriteUrlForPokemonName(
    value,
    generationSpritePath,
    spriteLocale,
  );
  const fetchSuggestions = useCallback(
    (term: string) =>
      searchPokemonNames(term, 10, {
        maxGeneration: generationLimit,
        locale: language,
        multiLocaleSearch,
      }),
    [generationLimit, language, multiLocaleSearch],
  );

  return (
    <SuggestionInput
      label={label}
      value={value}
      onChange={onChange}
      fetchSuggestions={fetchSuggestions}
      isOpen={isOpen}
      placeholder={t("common.pokemonPlaceholder")}
      inputClassName="pr-14"
      renderSuggestion={(suggestion) => {
        const suggestionSpriteUrl = getSpriteUrlForPokemonName(
          suggestion,
          generationSpritePath,
        );
        return (
          <div className="flex items-center gap-2">
            {suggestionSpriteUrl ? (
              <img
                src={suggestionSpriteUrl}
                alt=""
                className="h-6 w-6 shrink-0 object-contain"
                loading="lazy"
              />
            ) : null}
            <span>{suggestion}</span>
          </div>
        );
      }}
      endAdornment={
        spriteUrl ? (
          <img
            src={spriteUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-2 my-auto h-8 w-8 select-none"
            loading="lazy"
          />
        ) : null
      }
    />
  );
};

export default PokemonSuggestionInput;
