import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { STONES, MEGA_STONES } from "@/src/data/special-items.ts";
import { FiX, FiInfo } from "react-icons/fi";
import ToggleSwitch from "@/src/components/toggles/ToggleSwitch";
import LocationSuggestionInput from "@/src/components/inputs/LocationSuggestionInput.tsx";
import ItemSuggestionInput from "@/src/components/inputs/ItemSuggestionInput.tsx";
import Tooltip from "@/src/components/other/Tooltip.tsx";
import { useFocusTrap } from "@/src/hooks/useFocusTrap.ts";
import {
  focusRingCardClasses,
  focusRingClasses,
} from "@/src/styles/focusRing.ts";
import {
  getItemSpriteUrl,
  getItemName,
} from "@/src/services/search/itemSearch.ts";
import { getSpriteUrlById } from "@/src/services/sprites";
import { normalizeLanguage } from "@/src/utils/language";
import { findLocationByName } from "@/src/services/search/locationSearch.ts";

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    id: string | null,
    location: string,
    inBag: boolean,
    name?: string,
    locationSlug?: string,
  ) => void;
  maxGeneration: number;
  gameVersionId?: string;
  allPokemonAndItems?: boolean;
  generationSpritePath?: string | null;
  megaStoneSpriteStyle?: "item" | "pokemon";
  onMegaStoneSpriteStyleToggle?: (usePokemon: boolean) => void;
}

type Tab = "stones" | "items" | "mega";

const AddItemModal: React.FC<AddItemModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  maxGeneration,
  gameVersionId,
  allPokemonAndItems = false,
  generationSpritePath,
  megaStoneSpriteStyle = "item",
  onMegaStoneSpriteStyleToggle,
}) => {
  const { t, i18n } = useTranslation();
  const { containerRef } = useFocusTrap(isOpen);
  const [activeTab, setActiveTab] = useState<Tab>("stones");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [location, setLocation] = useState("");
  const [locationSlug, setLocationSlug] = useState("");
  const [inBag, setInBag] = useState(true);

  const [itemQuery, setItemQuery] = useState("");
  const [selectedItemSlug, setSelectedItemSlug] = useState("");

  const locale = normalizeLanguage(i18n.language);

  const availableStones = useMemo(() => {
    return STONES.filter((s) => s.gen <= maxGeneration);
  }, [maxGeneration]);

  const showMegaTab =
    allPokemonAndItems ||
    gameVersionId === "gen6_xy" ||
    gameVersionId === "gen6_oras";

  const availableMegaStones = useMemo(() => {
    if (!showMegaTab) return [];
    if (allPokemonAndItems) return MEGA_STONES;
    if (gameVersionId === "gen6_xy")
      return MEGA_STONES.filter((m) => m.version === "XY");
    return MEGA_STONES; // ORAS gets all (XY + ORAS)
  }, [showMegaTab, allPokemonAndItems, gameVersionId]);

  if (!isOpen) return null;

  const currentSelection =
    activeTab === "stones"
      ? selectedItemId
      : activeTab === "mega"
        ? selectedItemId
        : selectedItemSlug || itemQuery.trim();

  const handleSubmit = (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!currentSelection) return;
    const customName = itemQuery.trim();
    const id =
      activeTab === "stones"
        ? selectedItemId
        : activeTab === "mega"
          ? `item:${selectedItemId}`
          : selectedItemSlug
            ? `item:${selectedItemSlug}`
            : null;
    const trimmedLocation = location.trim();
    const resolvedLocation =
      !inBag && locationSlug
        ? { slug: locationSlug }
        : !inBag
          ? findLocationByName(trimmedLocation, {
              locale,
              gameVersionId,
            })
          : null;
    onAdd(
      id,
      inBag || resolvedLocation ? "" : trimmedLocation,
      inBag,
      id === null ? customName : undefined,
      resolvedLocation?.slug,
    );
    resetForm();
  };

  const resetForm = () => {
    setSelectedItemId("");
    setSelectedItemSlug("");
    setItemQuery("");
    setLocation("");
    setLocationSlug("");
    setInBag(true);
  };

  const handleClose = () => {
    resetForm();
    setActiveTab("stones");
    onClose();
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
            {activeTab === "stones"
              ? t("modals.addStone.title")
              : activeTab === "mega"
                ? t("modals.addStone.megaTitle")
                : t("modals.addStone.itemTitle")}
          </h2>
          <button
            onClick={handleClose}
            className={`text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-md ${focusRingClasses}`}
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              setActiveTab("stones");
              resetForm();
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors ${focusRingClasses} ${
              activeTab === "stones"
                ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-b-0 border-gray-200 dark:border-gray-700"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t("modals.addStone.tabStones")}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("items");
              setSelectedItemId("");
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors ${focusRingClasses} ${
              activeTab === "items"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-b-0 border-gray-200 dark:border-gray-700"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t("modals.addStone.tabItems")}
          </button>
          {showMegaTab && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("mega");
                resetForm();
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-t-md transition-colors ${focusRingClasses} ${
                activeTab === "mega"
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-b-0 border-gray-200 dark:border-gray-700"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              }`}
            >
              {t("modals.addStone.tabMegaStones")}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {activeTab === "stones" ? (
            /* ── Stone Grid ── */
            <div>
              <div className="flex items-center justify-between mb-2 h-8">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  {t("modals.addStone.stoneLabel")}
                </label>
              </div>

              {availableStones.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 p-1 max-h-64 overflow-y-auto custom-scrollbar">
                  {availableStones.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedItemId(s.id)}
                      className={`flex flex-col items-center p-2 rounded-md border transition-all ${focusRingCardClasses} ${
                        selectedItemId === s.id
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <img
                        src={`/stone-sprites/${s.sprite}`}
                        alt=""
                        className="w-10 h-10 object-contain"
                        style={{ imageRendering: "pixelated" }}
                      />
                      <span className="text-[10px] mt-1 text-center dark:text-gray-200">
                        {t(`stones.${s.id}`)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                  {t("modals.addStone.emptyListExplanation")}
                </div>
              )}
            </div>
          ) : activeTab === "mega" ? (
            /* ── Mega Stone Grid ── */
            <div>
              <div className="flex items-center justify-between mb-2 h-8">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  {t("modals.addStone.megaStoneLabel")}
                </label>
                {onMegaStoneSpriteStyleToggle && (
                  <div className="flex items-center gap-1.5 scale-75 origin-right">
                    <span className="text-[15px] font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {t("modals.addStone.showPokemon")}
                    </span>
                    <ToggleSwitch
                      id="mega-sprite-toggle"
                      checked={megaStoneSpriteStyle === "pokemon"}
                      onChange={(val) => onMegaStoneSpriteStyleToggle(val)}
                      ariaLabel={t("modals.addStone.showPokemon")}
                    />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 p-1 max-h-64 overflow-y-auto custom-scrollbar">
                {availableMegaStones.map((m) => {
                  const megaName = getItemName(m.id, locale);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedItemId(m.id)}
                      className={`flex flex-col items-center p-2 rounded-md border transition-all ${focusRingCardClasses} ${
                        selectedItemId === m.id
                          ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      <img
                        src={
                          megaStoneSpriteStyle === "pokemon"
                            ? getSpriteUrlById(
                                m.pokemonId,
                                generationSpritePath,
                              )
                            : getItemSpriteUrl(m.id)
                        }
                        alt=""
                        className="w-10 h-10 object-contain"
                        style={
                          megaStoneSpriteStyle !== "pokemon"
                            ? { imageRendering: "pixelated" }
                            : undefined
                        }
                        loading="lazy"
                      />
                      <span className="text-[10px] mt-1 text-center dark:text-gray-200">
                        {megaName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <ItemSuggestionInput
                label={t("modals.addStone.itemLabel")}
                value={itemQuery}
                selectedSlug={selectedItemSlug}
                onChange={setItemQuery}
                onSelectedSlugChange={setSelectedItemSlug}
                isOpen={isOpen}
                gameVersionId={gameVersionId}
                allPokemonAndItems={allPokemonAndItems}
              />
            </div>
          )}

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="stoneInBag"
              checked={inBag}
              onChange={(e) => {
                setInBag(e.target.checked);
                if (e.target.checked) {
                  setLocation("");
                  setLocationSlug("");
                }
              }}
              disabled={
                activeTab === "stones" ? availableStones.length === 0 : false
              }
              className="h-4 w-4 accent-green-600 cursor-pointer disabled:cursor-not-allowed"
            />
            <label
              htmlFor="stoneInBag"
              className={`text-sm font-semibold dark:text-gray-200 cursor-pointer ${
                activeTab === "stones" && availableStones.length === 0
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {t("modals.addStone.inBagLabel")}
            </label>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                {t("modals.addStone.locationLabel")}{" "}
                <span className="text-red-500">*</span>
              </label>
              <Tooltip
                side="top"
                content={t("modals.addStone.locationTooltip")}
              >
                <span
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                  aria-label={t("modals.addStone.locationTooltipLabel")}
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
              disabled={
                inBag ||
                (activeTab === "stones" && availableStones.length === 0)
              }
              placeholder={inBag ? "" : t("common.locationPlaceholder")}
            />
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className={`px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 ${focusRingClasses}`}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!currentSelection || (!inBag && !location.trim())}
              className={`px-4 py-2 rounded-md font-semibold shadow ${focusRingClasses} ${
                currentSelection && (inBag || location.trim())
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              {t("modals.addStone.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;
