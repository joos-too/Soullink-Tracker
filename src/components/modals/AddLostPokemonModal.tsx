import React, { useId, useState } from "react";
import { focusRingClasses } from "@/src/styles/focusRing.ts";
import type { LinkEditPayload, Pokemon } from "@/types.ts";
import { useTranslation } from "react-i18next";
import LocationSuggestionInput from "@/src/components/inputs/LocationSuggestionInput.tsx";
import PokemonSuggestionInput from "@/src/components/inputs/PokemonSuggestionInput.tsx";
import { useFocusTrap } from "@/src/hooks/useFocusTrap.ts";
import {
  getPokemonIdFromName,
  getPokemonNameById,
} from "@/src/services/search/pokemonSearch.ts";
import {
  findLocationByName,
  getLocationName,
} from "@/src/services/search/locationSearch.ts";
import { normalizeLanguage } from "@/src/utils/language.ts";

interface AddLostPokemonModalProps {
  onClose: () => void;
  onAdd: (payload: LinkEditPayload) => void;
  playerNames: string[];
  generationLimit?: number;
  generationSpritePath?: string | null;
  gameVersionId?: string;
  mode?: "add" | "edit";
  initial?: {
    location?: string;
    locationSlug?: string | null;
    members: Pokemon[];
  };
  blockingError?: string;
}

const AddLostPokemonModal: React.FC<AddLostPokemonModalProps> = ({
  onClose,
  onAdd,
  playerNames,
  generationLimit,
  gameVersionId,
  generationSpritePath,
  mode = "add",
  initial,
  blockingError,
}) => {
  const { t, i18n } = useTranslation();
  const locale = normalizeLanguage(i18n.language);
  const { containerRef } = useFocusTrap(true);
  const titleId = useId();
  const [location, setLocation] = useState(() =>
    initial?.locationSlug
      ? getLocationName(initial.locationSlug, locale)
      : (initial?.location ?? ""),
  );
  const [locationSlug, setLocationSlug] = useState(
    () => initial?.locationSlug ?? "",
  );
  const [pokemonNames, setPokemonNames] = useState<string[]>(() =>
    playerNames.map((_, index) => {
      const member = initial?.members?.[index];
      return (
        getPokemonNameById(member?.id, locale) ||
        (typeof member?.name === "string" ? member.name : "")
      );
    }),
  );

  const title =
    mode === "add" ? t("modals.addLost.title") : t("modals.editLost.title");
  const submitLabel = mode === "add" ? t("common.add") : t("common.save");

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (blockingError) return;
    const trimmedLocation = location.trim();
    const trimmedNames = pokemonNames.map((name) => name.trim());
    if (
      !trimmedLocation ||
      trimmedNames.some(
        (name) => getPokemonIdFromName(name) === null && name.length === 0,
      )
    )
      return;
    const resolvedLocation = locationSlug
      ? { slug: locationSlug }
      : findLocationByName(trimmedLocation, { locale: locale, gameVersionId });
    const members: Pokemon[] = trimmedNames.map((name) => {
      const pokemonId = getPokemonIdFromName(name);
      return {
        id: pokemonId,
        ...(pokemonId === null ? { name } : {}),
        nickname: "",
      };
    });
    onAdd({
      location: resolvedLocation ? undefined : trimmedLocation,
      locationSlug: resolvedLocation?.slug ?? null,
      members,
    });
  };

  const isValid =
    location.trim().length > 0 &&
    pokemonNames.every((name) => {
      const trimmed = name.trim();
      return getPokemonIdFromName(trimmed) !== null || trimmed.length > 0;
    });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id={titleId} className="text-xl font-bold dark:text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className={`text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-md ${focusRingClasses}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <LocationSuggestionInput
                label={t("modals.addLost.locationLabel")}
                value={location}
                onChange={setLocation}
                selectedSlug={locationSlug}
                onSelectedSlugChange={setLocationSlug}
                isOpen
                gameVersionId={gameVersionId}
              />
            </div>
            {playerNames.map((name, index) => (
              <PokemonSuggestionInput
                key={`lost-field-${index}`}
                label={t("modals.addLost.playerPokemonLabel", { name })}
                value={pokemonNames[index] ?? ""}
                onChange={(value) =>
                  setPokemonNames((prev) => {
                    const next = [...prev];
                    next[index] = value;
                    return next;
                  })
                }
                isOpen
                generationLimit={generationLimit}
                generationSpritePath={generationSpritePath}
              />
            ))}
          </div>

          {blockingError && (
            <div
              role="alert"
              className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
            >
              {blockingError}
            </div>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${focusRingClasses}`}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!isValid || Boolean(blockingError)}
              className={`px-4 py-2 rounded-md font-semibold shadow ${isValid && !blockingError ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"} ${focusRingClasses}`}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLostPokemonModal;
