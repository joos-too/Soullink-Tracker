import SpriteImage from "@/src/components/other/SpriteImage.tsx";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FossilEntry, ItemEntry } from "@/types";
import { PLAYER_COLORS } from "@/src/services/init";
import { MEGA_STONES, FOSSILS, STONES } from "@/src/data/special-items.ts";
import {
  getItemName,
  getItemSpriteUrl,
} from "@/src/services/search/itemSearch.ts";
import { resolveLocationDisplay } from "@/src/services/search/locationSearch.ts";
import { normalizeLanguage } from "@/src/utils/language";
import { getPokemonNameById } from "@/src/services/search/pokemonSearch.ts";
import {
  FiPlus,
  FiCheck,
  FiEdit,
  FiSave,
  FiX,
  FiRefreshCw,
  FiZap,
} from "react-icons/fi";
import AddFossilModal from "@/src/components/modals/AddFossilModal.tsx";
import AddItemModal from "@/src/components/modals/AddItemModal.tsx";
import ItemSprite from "@/src/components/other/ItemSprite.tsx";
import {
  groupFossilEntries,
  groupItemEntries,
  isGroupUsedUp,
  type FossilGroup,
  type ItemGroup,
} from "@/src/services/items/itemGroups.ts";
import {
  focusRingCardClasses,
  focusRingClasses,
  focusRingRedClasses,
  focusRingTightClasses,
} from "@/src/styles/focusRing.ts";

interface ItemTrackerProps {
  playerNames: string[];
  fossils: FossilEntry[][];
  items: ItemEntry[][];
  maxGeneration: number;
  infiniteFossilsEnabled: boolean;
  onAddFossil: (
    playerIndex: number,
    fossilId: string,
    location: string,
    inBag: boolean,
    locationSlug?: string,
  ) => void;
  onToggleBag: (playerIndex: number, fossilIndex: number) => void;
  onRevive: (selectedIndices: number[]) => void;
  onUpdateFossils: (newFossils: FossilEntry[][]) => void;
  onAddItems: (
    playerIndex: number,
    id: string | null,
    location: string,
    inBag: boolean,
    name?: string,
    locationSlug?: string,
  ) => void;
  onToggleItemBag: (playerIndex: number, itemIndex: number) => void;
  onUseItem: (playerIndex: number, itemIndex: number) => void;
  onUpdateItems: (newItems: ItemEntry[][]) => void;
  readOnly?: boolean;
  gameVersionId?: string;
  allPokemonAndItems?: boolean;
  generationSpritePath?: string | null;
  megaStoneSpriteStyle?: "item" | "pokemon";
  onMegaStoneSpriteStyleToggle?: (usePokemon: boolean) => void;
}

const ItemTracker: React.FC<ItemTrackerProps> = ({
  playerNames,
  fossils,
  items,
  maxGeneration,
  infiniteFossilsEnabled,
  onAddFossil,
  onToggleBag,
  onRevive,
  onUpdateFossils,
  onAddItems,
  onToggleItemBag,
  onUseItem,
  onUpdateItems,
  readOnly = false,
  gameVersionId,
  allPokemonAndItems = false,
  generationSpritePath,
  megaStoneSpriteStyle = "item",
  onMegaStoneSpriteStyleToggle,
}) => {
  const { t, i18n } = useTranslation();
  const [showFossils, setShowFossils] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // --- Item state ---
  const [isItemEditing, setIsItemEditing] = useState(false);
  const [draftItems, setDraftItems] = useState<ItemEntry[][]>([]);
  const [itemModalOpen, setItemModalOpen] = useState<{
    open: boolean;
    playerIndex: number;
  }>({ open: false, playerIndex: 0 });

  // --- Fossil state ---
  const [isFossilEditing, setIsFossilEditing] = useState(false);
  const [draftFossils, setDraftFossils] = useState<FossilEntry[][]>([]);
  const [fossilModalOpen, setFossilModalOpen] = useState<{
    open: boolean;
    playerIndex: number;
  }>({ open: false, playerIndex: 0 });
  const [fossilSelections, setFossilSelections] = useState<number[]>(
    playerNames.map(() => -1),
  );

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) =>
      setIsMobile(e.matches);
    handler(mql);
    mql.addEventListener("change", handler as (e: MediaQueryListEvent) => void);
    return () =>
      mql.removeEventListener(
        "change",
        handler as (e: MediaQueryListEvent) => void,
      );
  }, []);

  // --- Stone helpers ---
  const startStoneEditing = () => {
    setDraftItems(JSON.parse(JSON.stringify(items)));
    setIsItemEditing(true);
  };
  const cancelStoneEditing = () => {
    setIsItemEditing(false);
    setDraftItems([]);
  };
  const saveStoneEditing = () => {
    onUpdateItems(draftItems);
    setIsItemEditing(false);
  };
  const deleteStone = (pIdx: number, sIdx: number) => {
    setDraftItems((prev) => {
      const next = [...prev];
      next[pIdx] = next[pIdx].filter((_, i) => i !== sIdx);
      return next;
    });
  };
  const displayStones = isItemEditing ? draftItems : items;

  // --- Fossil helpers ---
  const startFossilEditing = () => {
    setDraftFossils(JSON.parse(JSON.stringify(fossils)));
    setIsFossilEditing(true);
  };
  const cancelFossilEditing = () => {
    setIsFossilEditing(false);
    setDraftFossils([]);
  };
  const saveFossilEditing = () => {
    onUpdateFossils(draftFossils);
    setIsFossilEditing(false);
  };
  const deleteFossil = (pIdx: number, fIdx: number) => {
    setDraftFossils((prev) => {
      const next = [...prev];
      next[pIdx] = next[pIdx].filter((_, i) => i !== fIdx);
      return next;
    });
  };
  const displayFossils = isFossilEditing ? draftFossils : fossils;
  const canRevive =
    !isFossilEditing &&
    displayFossils.every((list) => list.some((f) => f.inBag && !f.revived)) &&
    fossilSelections.every((idx) => idx !== -1);
  const handleReviveClick = () => {
    if (!canRevive) return;
    onRevive(fossilSelections);
    setFossilSelections(playerNames.map(() => -1));
  };

  const toggleFlip = () => setShowFossils((prev) => !prev);

  // --- Render stone header buttons ---
  const renderStoneHeaderButtons = () => {
    if (readOnly) return null;
    return (
      <>
        {!isItemEditing ? (
          <button
            onClick={startStoneEditing}
            className={`absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/70 hover:text-white hover:bg-black/20 ring-2 ring-white/25 ${focusRingTightClasses}`}
            title={t("tracker.infoPanel.editItems")}
          >
            <FiEdit size={14} />
          </button>
        ) : (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 flex gap-2">
            <button
              onClick={cancelStoneEditing}
              className={`p-1 rounded-full text-white/70 hover:text-white hover:bg-black/20 ring-2 ring-white/25 ${focusRingTightClasses}`}
            >
              <FiX size={14} />
            </button>
            <button
              onClick={saveStoneEditing}
              className={`p-1 rounded-full text-white/70 hover:text-white hover:bg-black/20 ring-2 ring-white/25 ${focusRingTightClasses}`}
            >
              <FiSave size={14} />
            </button>
          </div>
        )}
      </>
    );
  };

  // --- Render fossil header buttons ---
  const renderFossilHeaderButtons = () => {
    if (readOnly) return null;
    return (
      <>
        {!isFossilEditing ? (
          <button
            onClick={startFossilEditing}
            className={`absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/70 hover:text-white hover:bg-black/20 ring-2 ring-white/25 ${focusRingTightClasses}`}
            title={t("tracker.infoPanel.editFossils")}
          >
            <FiEdit size={14} />
          </button>
        ) : (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 flex gap-2">
            <button
              onClick={cancelFossilEditing}
              className={`p-1 rounded-full text-white/70 hover:text-white hover:bg-black/20 ring-2 ring-white/25 ${focusRingTightClasses}`}
            >
              <FiX size={14} />
            </button>
            <button
              onClick={saveFossilEditing}
              className={`p-1 rounded-full text-white/70 hover:text-white hover:bg-black/20 ring-2 ring-white/25 ${focusRingTightClasses}`}
            >
              <FiSave size={14} />
            </button>
          </div>
        )}
      </>
    );
  };

  // --- Item rendering helpers ---
  const locale = normalizeLanguage(i18n.language);

  const resolveItemDisplay = (entry: ItemEntry) => {
    const itemId = entry.id ?? "";
    const customName = entry.name?.trim() ?? "";
    const isCustomItem = itemId.startsWith("item:");
    const itemSlug = isCustomItem ? itemId.replace("item:", "") : null;
    const megaDef = itemSlug
      ? MEGA_STONES.find((m) => m.id === itemSlug)
      : null;
    const def = isCustomItem ? null : STONES.find((s) => s.id === itemId);
    const displayName = customName
      ? customName
      : isCustomItem
        ? getItemName(itemSlug ?? "", locale)
        : t(`stones.${itemId}`);
    const spriteSrc = def
      ? `/stone-sprites/${def.sprite}`
      : megaDef || itemSlug
        ? getItemSpriteUrl(megaDef?.id ?? itemSlug ?? "")
        : null;
    return { displayName, spriteSrc };
  };

  const getEntryStatus = (entry: ItemEntry) =>
    entry.used
      ? t("tracker.infoPanel.stoneUsed")
      : entry.inBag
        ? t("tracker.infoPanel.stoneBag")
        : t("tracker.infoPanel.stoneLocation", {
            location: resolveLocationDisplay(entry, locale),
          });

  const renderItemSprite = (spriteSrc: string | null, used: boolean) =>
    spriteSrc ? (
      <ItemSprite
        src={spriteSrc}
        className="w-6 h-6 object-contain shrink-0"
        used={used}
      />
    ) : (
      <ItemSprite />
    );

  const renderCollectButton = (onCollect: () => void, title: string) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onCollect();
      }}
      className="p-1 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 hover:bg-blue-200 shrink-0"
      title={title}
    >
      <FiCheck size={12} />
    </button>
  );

  // Each further uncollected duplicate gets its own row. Rows are spaced like
  // separate cards (padding, border and gap = 18px), so a group is exactly as
  // tall as the same entries listed individually.
  const renderPendingRow = (
    key: string,
    name: string,
    status: string,
    collectButton: React.ReactNode,
  ) => (
    <div
      key={key}
      className="mt-2 pt-2.25 border-t border-dashed border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center gap-2 h-7.5">
        <div className="w-6 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{name}</div>
          <div className="opacity-70 truncate">{status}</div>
        </div>
        {!readOnly && collectButton}
      </div>
    </div>
  );

  const collectItem = (pIdx: number, sIdx: number) =>
    renderCollectButton(
      () => onToggleItemBag(pIdx, sIdx),
      t("tracker.infoPanel.stoneBag"),
    );

  const renderEditableItem = (entry: ItemEntry, pIdx: number, sIdx: number) => {
    const { displayName, spriteSrc } = resolveItemDisplay(entry);
    return (
      <div
        key={`${pIdx}-${entry.id || entry.name}-${sIdx}`}
        className={`flex items-center gap-2 p-1.5 rounded border text-[10px] transition-all ${
          entry.used
            ? "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
            : "border-gray-200 dark:border-gray-700 dark:text-gray-300"
        }`}
      >
        {renderItemSprite(spriteSrc, entry.used)}
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate">{displayName}</div>
          <div className="opacity-70 truncate">{getEntryStatus(entry)}</div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteStone(pIdx, sIdx);
          }}
          className={`p-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 shrink-0 ${focusRingRedClasses}`}
        >
          <FiX size={12} />
        </button>
      </div>
    );
  };

  const renderItemGroup = (group: ItemGroup, pIdx: number) => {
    const { displayName, spriteSrc } = resolveItemDisplay(group.entry);
    const usedUp = isGroupUsedUp(group);
    const isSingle = group.indices.length === 1;
    const bagCount = group.bagIndices.length;
    const usedCount = group.usedIndices.length;

    const statusParts: string[] = [];
    if (bagCount > 0) {
      statusParts.push(
        t("tracker.infoPanel.itemCountBag", { amount: bagCount }),
      );
    }
    if (usedCount > 0) {
      statusParts.push(
        t("tracker.infoPanel.itemCountUsed", { amount: usedCount }),
      );
    }
    // Without bag or used items, the first uncollected item is shown in the
    // header row, so a group of N uncollected items is exactly N rows tall.
    const headerPendingIdx =
      bagCount === 0 && usedCount === 0 ? group.pendingIndices[0] : undefined;
    const extraPendingIndices = group.pendingIndices.filter(
      (sIdx) => sIdx !== headerPendingIdx,
    );
    const status =
      headerPendingIdx !== undefined
        ? getEntryStatus(displayStones[pIdx][headerPendingIdx])
        : isSingle
          ? getEntryStatus(group.entry)
          : statusParts.join(" · ");

    return (
      <div
        key={`${pIdx}-${group.key}`}
        className={`p-1.5 rounded border text-[10px] transition-all ${
          usedUp
            ? "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
            : bagCount === 0
              ? "border-gray-200 dark:border-gray-700 opacity-60"
              : "border-gray-200 dark:border-gray-700 dark:text-gray-300"
        }`}
      >
        <div className="flex items-center gap-2 h-7.5">
          {renderItemSprite(spriteSrc, usedUp)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-bold truncate">{displayName}</span>
              {!isSingle && bagCount > 0 && (
                <span className="shrink-0 px-1 rounded bg-gray-200 dark:bg-gray-700 font-bold">
                  ×{bagCount}
                </span>
              )}
            </div>
            <div className="opacity-70 truncate">{status}</div>
          </div>

          {/* Move to bag button for the uncollected item in the header */}
          {headerPendingIdx !== undefined &&
            !readOnly &&
            collectItem(pIdx, headerPendingIdx)}

          {/* Use one item from the bag */}
          {bagCount > 0 && !readOnly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUseItem(pIdx, group.bagIndices[0]);
              }}
              className={`p-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 shrink-0 ${focusRingRedClasses}`}
              title={t("tracker.infoPanel.stoneUse")}
            >
              <FiZap size={12} />
            </button>
          )}
        </div>

        {extraPendingIndices.map((sIdx) =>
          renderPendingRow(
            `${pIdx}-${group.key}-pending-${sIdx}`,
            displayName,
            getEntryStatus(displayStones[pIdx][sIdx]),
            collectItem(pIdx, sIdx),
          ),
        )}
      </div>
    );
  };

  // --- Fossil rendering helpers ---
  const getFossilStatus = (entry: FossilEntry) => {
    if (entry.revived) {
      const pokemonName =
        getPokemonNameById(entry.pokemonId, locale) || entry.pokemonName || "";
      return pokemonName
        ? `${t("tracker.infoPanel.fossilRevived")}: ${pokemonName}`
        : t("tracker.infoPanel.fossilRevived");
    }
    return entry.inBag
      ? t("tracker.infoPanel.fossilBag")
      : t("tracker.infoPanel.fossilLocation", {
          location: resolveLocationDisplay(entry, locale),
        });
  };

  const renderFossilSprite = (fossilId: string, revived: boolean) => {
    const def = FOSSILS.find((f) => f.id === fossilId);
    return (
      <SpriteImage
        src={`/fossil-sprites/${def?.sprite}`}
        alt=""
        className={`w-6 h-6 object-contain shrink-0 ${revived ? "grayscale-[0.5]" : ""}`}
      />
    );
  };

  const collectFossil = (pIdx: number, fIdx: number) =>
    renderCollectButton(
      () => onToggleBag(pIdx, fIdx),
      t("tracker.infoPanel.fossilBag"),
    );

  const renderEditableFossil = (
    entry: FossilEntry,
    pIdx: number,
    fIdx: number,
  ) => (
    <div
      key={`${pIdx}-${entry.fossilId}-${fIdx}`}
      className={`flex items-center gap-2 p-1.5 rounded border text-[10px] transition-all ${
        entry.revived
          ? "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
          : "border-gray-200 dark:border-gray-700 dark:text-gray-300"
      }`}
    >
      {renderFossilSprite(entry.fossilId, entry.revived)}
      <div className="flex-1 min-w-0">
        <div className="font-bold truncate">
          {t(`fossils.${entry.fossilId}`)}
        </div>
        <div className="opacity-70 truncate">{getFossilStatus(entry)}</div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteFossil(pIdx, fIdx);
        }}
        className={`p-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 shrink-0 ${focusRingRedClasses}`}
      >
        <FiX size={12} />
      </button>
    </div>
  );

  const renderFossilGroup = (group: FossilGroup, pIdx: number) => {
    const name = t(`fossils.${group.entry.fossilId}`);
    const revivedUp = isGroupUsedUp(group);
    const isSingle = group.indices.length === 1;
    const bagCount = group.bagIndices.length;
    const revivedCount = group.usedIndices.length;
    const playerFossils = displayFossils[pIdx];

    // Any fossil of the group in the bag can be revived, so the group selects
    // its first one.
    const isSelected = group.bagIndices.includes(fossilSelections[pIdx]);
    const isInteractive = !readOnly && bagCount > 0;
    const toggleSelection = () =>
      setFossilSelections((prev) => {
        const next = [...prev];
        next[pIdx] = isSelected ? -1 : group.bagIndices[0];
        return next;
      });

    const statusParts: string[] = [];
    if (bagCount > 0) {
      statusParts.push(
        t("tracker.infoPanel.itemCountBag", { amount: bagCount }),
      );
    }
    if (revivedCount > 0) {
      statusParts.push(
        t("tracker.infoPanel.fossilCountRevived", { amount: revivedCount }),
      );
    }
    // Same layout as items: the first uncollected fossil is the header when
    // nothing is in the bag or revived.
    const headerPendingIdx =
      bagCount === 0 && revivedCount === 0
        ? group.pendingIndices[0]
        : undefined;
    const extraPendingIndices = group.pendingIndices.filter(
      (fIdx) => fIdx !== headerPendingIdx,
    );
    const status =
      headerPendingIdx !== undefined
        ? getFossilStatus(playerFossils[headerPendingIdx])
        : isSingle
          ? getFossilStatus(group.entry)
          : statusParts.join(" · ");
    // Revived Pokémon are only listed in the tooltip of grouped fossils
    const statusTitle =
      !isSingle && revivedCount > 0
        ? group.usedIndices
            .map((fIdx) => getFossilStatus(playerFossils[fIdx]))
            .join("\n")
        : status;

    return (
      <div
        key={`${pIdx}-${group.key}`}
        onClick={() => {
          if (isInteractive) toggleSelection();
        }}
        onKeyDown={(e) => {
          if (!isInteractive) return;
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          toggleSelection();
        }}
        role={isInteractive ? "button" : undefined}
        aria-pressed={isInteractive ? isSelected : undefined}
        tabIndex={isInteractive ? 0 : -1}
        className={`p-1.5 rounded border text-[10px] transition-all ${
          revivedUp
            ? "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20 text-red-700 dark:text-red-400 cursor-default"
            : isSelected
              ? "border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500 cursor-pointer"
              : bagCount === 0
                ? "border-gray-200 dark:border-gray-700 opacity-60 cursor-default"
                : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300 cursor-pointer"
        } ${isInteractive ? focusRingCardClasses : ""}`}
      >
        <div className="flex items-center gap-2 h-7.5">
          {renderFossilSprite(group.entry.fossilId, revivedUp)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className="font-bold truncate">{name}</span>
              {!isSingle && bagCount > 0 && (
                <span className="shrink-0 px-1 rounded bg-gray-200 dark:bg-gray-700 font-bold">
                  ×{bagCount}
                </span>
              )}
            </div>
            <div className="opacity-70 truncate" title={statusTitle}>
              {status}
            </div>
          </div>

          {headerPendingIdx !== undefined &&
            !readOnly &&
            collectFossil(pIdx, headerPendingIdx)}
        </div>

        {extraPendingIndices.map((fIdx) =>
          renderPendingRow(
            `${pIdx}-${group.key}-pending-${fIdx}`,
            name,
            getFossilStatus(playerFossils[fIdx]),
            collectFossil(pIdx, fIdx),
          ),
        )}
      </div>
    );
  };

  // --- Render stone content ---
  const renderStoneContent = () => (
    <div className="flex flex-col max-h-87.5">
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div
          className="grid gap-4 grid-cols-1 px-4 pb-4"
          style={{
            gridTemplateColumns:
              playerNames.length > 1
                ? `repeat(${playerNames.length}, minmax(0, 1fr))`
                : undefined,
          }}
        >
          {playerNames.map((name, pIdx) => (
            <div key={`stone-player-${pIdx}`} className="space-y-2">
              <div className="sticky top-0 z-10 pt-4 pb-1 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span
                    className="text-xs font-press-start truncate mr-2"
                    style={{ color: PLAYER_COLORS[pIdx] }}
                  >
                    {name}
                  </span>
                  {!readOnly && (
                    <button
                      onClick={() =>
                        setItemModalOpen({ open: true, playerIndex: pIdx })
                      }
                      disabled={isItemEditing}
                      className={`p-1 rounded-md text-white transition-all shrink-0 shadow-sm ${
                        isItemEditing
                          ? "bg-gray-400 cursor-not-allowed opacity-50"
                          : "hover:scale-110 hover:shadow-md"
                      } ${focusRingClasses}`}
                      style={
                        !isItemEditing
                          ? { backgroundColor: PLAYER_COLORS[pIdx] }
                          : undefined
                      }
                    >
                      <FiPlus size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1 px-1">
                {isItemEditing
                  ? displayStones[pIdx]?.map((entry, sIdx) =>
                      renderEditableItem(entry, pIdx, sIdx),
                    )
                  : groupItemEntries(displayStones[pIdx] ?? []).map((group) =>
                      renderItemGroup(group, pIdx),
                    )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // --- Render fossil content ---
  const renderFossilContent = () => (
    <div className="flex flex-col max-h-87.5">
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">
        <div
          className="grid gap-4 grid-cols-1 px-4 pb-4"
          style={{
            gridTemplateColumns:
              playerNames.length > 1
                ? `repeat(${playerNames.length}, minmax(0, 1fr))`
                : undefined,
          }}
        >
          {playerNames.map((name, pIdx) => (
            <div key={`fossil-player-${pIdx}`} className="space-y-2">
              <div className="sticky top-0 z-10 pt-4 pb-1 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                  <span
                    className="text-xs font-press-start truncate mr-2"
                    style={{ color: PLAYER_COLORS[pIdx] }}
                  >
                    {name}
                  </span>
                  {!readOnly && (
                    <button
                      onClick={() =>
                        setFossilModalOpen({ open: true, playerIndex: pIdx })
                      }
                      disabled={isFossilEditing}
                      className={`p-1 rounded-md text-white transition-all shrink-0 shadow-sm ${
                        isFossilEditing
                          ? "bg-gray-400 cursor-not-allowed opacity-50"
                          : "hover:scale-110 hover:shadow-md"
                      } ${focusRingClasses}`}
                      style={
                        !isFossilEditing
                          ? { backgroundColor: PLAYER_COLORS[pIdx] }
                          : undefined
                      }
                    >
                      <FiPlus size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1 px-1">
                {isFossilEditing
                  ? displayFossils[pIdx]?.map((entry, fIdx) =>
                      renderEditableFossil(entry, pIdx, fIdx),
                    )
                  : groupFossilEntries(displayFossils[pIdx] ?? []).map(
                      (group) => renderFossilGroup(group, pIdx),
                    )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {!readOnly && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={handleReviveClick}
            disabled={!canRevive}
            className={`w-full py-2 rounded-md font-press-start text-[10px] shadow-sm transition-all ${
              canRevive
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed opacity-50"
            } ${focusRingRedClasses}`}
          >
            {t("tracker.infoPanel.fossilRevive")}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-300 dark:border-gray-700 overflow-hidden"
        style={{ perspective: "1000px" }}
      >
        {/* Header */}
        <div className="relative shrink-0">
          <h2
            className="text-center p-2 text-white font-press-start text-sm transition-colors duration-500"
            style={{
              backgroundColor: showFossils ? "#895338" : "#2c7b90",
            }}
          >
            {showFossils
              ? t("tracker.infoPanel.fossilTracker")
              : t("tracker.infoPanel.itemTracker")}
          </h2>
          {showFossils
            ? renderFossilHeaderButtons()
            : renderStoneHeaderButtons()}
          <button
            onClick={toggleFlip}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-white/70 hover:text-white hover:bg-black/20 ring-2 ring-white/25 ${focusRingTightClasses}`}
            title={
              showFossils
                ? t("tracker.infoPanel.flipToItems")
                : t("tracker.infoPanel.flipToFossils")
            }
          >
            <FiRefreshCw
              size={14}
              className={`transition-transform duration-500 ${showFossils ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Content with flip animation */}
        {isMobile ? (
          showFossils ? (
            renderFossilContent()
          ) : (
            renderStoneContent()
          )
        ) : (
          <div
            className="transition-transform duration-700"
            style={{
              display: "grid",
              transformStyle: "preserve-3d",
              transform: showFossils ? "rotateY(180deg)" : "rotateY(0deg)",
            }}
          >
            <div
              className={`${showFossils ? "pointer-events-none" : "pointer-events-auto"}`}
              aria-hidden={showFossils}
              style={{
                gridArea: "1 / 1",
                backfaceVisibility: "hidden",
                transform: "rotateY(0deg)",
              }}
            >
              {renderStoneContent()}
            </div>

            <div
              className={`${showFossils ? "pointer-events-auto" : "pointer-events-none"}`}
              aria-hidden={!showFossils}
              style={{
                gridArea: "1 / 1",
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              {renderFossilContent()}
            </div>
          </div>
        )}
      </div>

      {/* Modals rendered outside the tracker to avoid clipping/containment issues */}
      <AddItemModal
        isOpen={itemModalOpen.open}
        onClose={() => setItemModalOpen({ open: false, playerIndex: 0 })}
        maxGeneration={maxGeneration}
        gameVersionId={gameVersionId}
        allPokemonAndItems={allPokemonAndItems}
        generationSpritePath={generationSpritePath}
        megaStoneSpriteStyle={megaStoneSpriteStyle}
        onMegaStoneSpriteStyleToggle={onMegaStoneSpriteStyleToggle}
        onAdd={(id, loc, bag, name, locationSlug) => {
          onAddItems(
            itemModalOpen.playerIndex,
            id,
            loc,
            bag,
            name,
            locationSlug,
          );
          setItemModalOpen({ open: false, playerIndex: 0 });
        }}
      />
      <AddFossilModal
        isOpen={fossilModalOpen.open}
        onClose={() => setFossilModalOpen({ open: false, playerIndex: 0 })}
        maxGeneration={maxGeneration}
        alreadyOwnedIds={
          fossils[fossilModalOpen.playerIndex]?.map((f) => f.fossilId) || []
        }
        infiniteFossilsEnabled={infiniteFossilsEnabled}
        gameVersionId={gameVersionId}
        onAdd={(id, loc, bag, locationSlug) => {
          onAddFossil(fossilModalOpen.playerIndex, id, loc, bag, locationSlug);
          setFossilModalOpen({ open: false, playerIndex: 0 });
        }}
      />
    </>
  );
};

export default ItemTracker;
