import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FOSSILS } from "@/src/data/special-items.ts";
import { FiX, FiInfo } from "react-icons/fi";
import LocationSuggestionInput from "@/src/components/inputs/LocationSuggestionInput.tsx";
import Tooltip from "@/src/components/other/Tooltip.tsx";
import { useFocusTrap } from "@/src/hooks/useFocusTrap.ts";
import { findLocationByName } from "@/src/services/locationSearch.ts";
import { normalizeLanguage } from "@/src/utils/language.ts";
import {
  focusRingCardClasses,
  focusRingClasses,
} from "@/src/styles/focusRing.ts";

interface AddFossilModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    fossilId: string,
    location: string,
    inBag: boolean,
    locationSlug?: string,
  ) => void;
  maxGeneration: number;
  alreadyOwnedIds: string[];
  infiniteFossilsEnabled: boolean;
  gameVersionId?: string;
}

const AddFossilModal: React.FC<AddFossilModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  maxGeneration,
  alreadyOwnedIds,
  infiniteFossilsEnabled,
  gameVersionId,
}) => {
  const { t, i18n } = useTranslation();
  const { containerRef } = useFocusTrap(isOpen);
  const locale = normalizeLanguage(i18n.language);
  const [selectedFossilId, setSelectedFossilId] = useState("");
  const [location, setLocation] = useState("");
  const [locationSlug, setLocationSlug] = useState("");
  const [inBag, setInBag] = useState(true);

  const availableFossils = useMemo(() => {
    return FOSSILS.filter((f) => {
      const genMatch = f.gen <= maxGeneration;
      if (!infiniteFossilsEnabled) {
        return genMatch && !alreadyOwnedIds.includes(f.id);
      }
      return genMatch;
    });
  }, [maxGeneration, alreadyOwnedIds, infiniteFossilsEnabled]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!selectedFossilId) return;
    const trimmedLocation = location.trim();
    const resolvedLocation =
      !inBag && locationSlug
        ? { slug: locationSlug }
        : !inBag
          ? findLocationByName(trimmedLocation, {
              locale: locale,
              gameVersionId,
            })
          : null;
    onAdd(
      selectedFossilId,
      inBag || resolvedLocation ? "" : trimmedLocation,
      inBag,
      resolvedLocation?.slug,
    );
    setSelectedFossilId("");
    setLocation("");
    setLocationSlug("");
    setInBag(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-gray-100">
            {t("modals.addFossil.title")}
          </h2>
          <button
            onClick={onClose}
            className={`text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-md ${focusRingClasses}`}
          >
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {t("modals.addFossil.fossilLabel")}
            </label>

            {availableFossils.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 p-1">
                {availableFossils.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFossilId(f.id)}
                    className={`flex flex-col items-center p-2 rounded-md border transition-all ${focusRingCardClasses} ${
                      selectedFossilId === f.id
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <img
                      src={`/fossil-sprites/${f.sprite}`}
                      alt=""
                      className="w-10 h-10 object-contain"
                      style={{ imageRendering: "pixelated" }}
                    />
                    <span className="text-[10px] mt-1 text-center dark:text-gray-200">
                      {t(`fossils.${f.id}`)}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                {t("modals.addFossil.emptyListExplanation")}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="inBag"
              checked={inBag}
              onChange={(e) => {
                setInBag(e.target.checked);
                if (e.target.checked) {
                  setLocation("");
                  setLocationSlug("");
                }
              }}
              disabled={availableFossils.length === 0}
              className="h-4 w-4 accent-green-600 cursor-pointer disabled:cursor-not-allowed"
            />
            <label
              htmlFor="inBag"
              className={`text-sm font-semibold dark:text-gray-200 cursor-pointer ${
                availableFossils.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {t("modals.addFossil.inBagLabel")}
            </label>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                {t("modals.addFossil.locationLabel")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <Tooltip
                side="top"
                content={t("modals.addFossil.locationTooltip")}
              >
                <span
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                  aria-label={t("modals.addFossil.locationTooltipLabel")}
                >
                  <FiInfo size={16} />
                </span>
              </Tooltip>
            </div>
            <LocationSuggestionInput
              label=""
              value={inBag ? "" : location}
              onChange={setLocation}
              selectedSlug={locationSlug}
              onSelectedSlugChange={setLocationSlug}
              isOpen={isOpen}
              gameVersionId={gameVersionId}
              disabled={inBag || availableFossils.length === 0}
              placeholder={inBag ? "" : t("common.locationPlaceholder")}
            />
          </div>

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
              disabled={!selectedFossilId || (!inBag && !location.trim())}
              className={`px-4 py-2 rounded-md font-semibold shadow ${focusRingClasses} ${
                selectedFossilId && (inBag || location.trim())
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              {t("modals.addFossil.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFossilModal;
