import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FossilEntry, ItemEntry } from "@/types";
import { PLAYER_COLORS } from "@/src/services/init";
import { normalizeLanguage } from "@/src/utils/language";
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
import ItemGroupCard from "@/src/components/other/ItemGroupCard.tsx";
import PlayerColumnHeader from "@/src/components/other/PlayerColumnHeader.tsx";
import {
  groupFossilEntries,
  groupItemEntries,
  type FossilGroup,
  type ItemGroup,
} from "@/src/services/items/itemGroups.ts";
import {
  getFossilSpriteUrl,
  getFossilStatus,
  getItemStatus,
  resolveItemDisplay,
  summarizeEntryGroup,
} from "@/src/services/items/itemDisplay.ts";
import {
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

  // --- Card rendering helpers ---
  const locale = normalizeLanguage(i18n.language);

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

  const renderRedButton = (
    onClick: () => void,
    icon: React.ReactNode,
    title?: string,
  ) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`p-1 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 hover:bg-red-200 shrink-0 ${focusRingRedClasses}`}
      title={title}
    >
      {icon}
    </button>
  );

  // --- Item cards ---
  const itemStatus = (entry: ItemEntry) => getItemStatus(entry, locale, t);

  const renderCollectItemButton = (pIdx: number, sIdx: number) =>
    readOnly
      ? null
      : renderCollectButton(
          () => onToggleItemBag(pIdx, sIdx),
          t("tracker.infoPanel.stoneBag"),
        );

  const renderEditableItem = (entry: ItemEntry, pIdx: number, sIdx: number) => {
    const { name, spriteUrl } = resolveItemDisplay(entry, locale, t);
    return (
      <ItemGroupCard
        key={`${pIdx}-${entry.id || entry.name}-${sIdx}`}
        name={name}
        spriteUrl={spriteUrl}
        status={itemStatus(entry)}
        used={entry.used}
        actions={renderRedButton(
          () => deleteStone(pIdx, sIdx),
          <FiX size={12} />,
        )}
      />
    );
  };

  const renderItemGroup = (group: ItemGroup, pIdx: number) => {
    const { name, spriteUrl } = resolveItemDisplay(group.entry, locale, t);
    const summary = summarizeEntryGroup(
      group,
      displayStones[pIdx],
      itemStatus,
      "tracker.infoPanel.itemCountUsed",
      t,
    );

    return (
      <ItemGroupCard
        key={`${pIdx}-${group.key}`}
        name={name}
        spriteUrl={spriteUrl}
        status={summary.status}
        badgeCount={summary.isGrouped ? summary.bagCount : 0}
        used={summary.usedUp}
        dimmed={summary.bagCount === 0}
        actions={
          <>
            {/* Move to bag button for the uncollected item in the header */}
            {summary.headerPendingIdx !== undefined &&
              renderCollectItemButton(pIdx, summary.headerPendingIdx)}
            {/* Use one item from the bag */}
            {summary.bagCount > 0 &&
              !readOnly &&
              renderRedButton(
                () => onUseItem(pIdx, group.bagIndices[0]),
                <FiZap size={12} />,
                t("tracker.infoPanel.stoneUse"),
              )}
          </>
        }
        extraRows={summary.extraPending.map(({ index, status }) => ({
          key: index,
          status,
          action: renderCollectItemButton(pIdx, index),
        }))}
      />
    );
  };

  // --- Fossil cards ---
  const fossilStatus = (entry: FossilEntry) =>
    getFossilStatus(entry, locale, t);

  const renderCollectFossilButton = (pIdx: number, fIdx: number) =>
    readOnly
      ? null
      : renderCollectButton(
          () => onToggleBag(pIdx, fIdx),
          t("tracker.infoPanel.fossilBag"),
        );

  const renderEditableFossil = (
    entry: FossilEntry,
    pIdx: number,
    fIdx: number,
  ) => (
    <ItemGroupCard
      key={`${pIdx}-${entry.fossilId}-${fIdx}`}
      name={t(`fossils.${entry.fossilId}`)}
      spriteUrl={getFossilSpriteUrl(entry.fossilId)}
      status={fossilStatus(entry)}
      used={entry.revived}
      actions={renderRedButton(
        () => deleteFossil(pIdx, fIdx),
        <FiX size={12} />,
      )}
    />
  );

  const renderFossilGroup = (group: FossilGroup, pIdx: number) => {
    const playerFossils = displayFossils[pIdx];
    const summary = summarizeEntryGroup(
      group,
      playerFossils,
      fossilStatus,
      "tracker.infoPanel.fossilCountRevived",
      t,
    );

    // Any fossil of the group in the bag can be revived, so the group selects
    // its first one.
    const isSelected = group.bagIndices.includes(fossilSelections[pIdx]);
    const toggleSelection = () =>
      setFossilSelections((prev) => {
        const next = [...prev];
        next[pIdx] = isSelected ? -1 : group.bagIndices[0];
        return next;
      });

    // Revived Pokémon are only listed in the tooltip of grouped fossils
    const statusTitle =
      summary.isGrouped && group.usedIndices.length > 0
        ? group.usedIndices
            .map((fIdx) => fossilStatus(playerFossils[fIdx]))
            .join("\n")
        : summary.status;

    return (
      <ItemGroupCard
        key={`${pIdx}-${group.key}`}
        name={t(`fossils.${group.entry.fossilId}`)}
        spriteUrl={getFossilSpriteUrl(group.entry.fossilId)}
        status={summary.status}
        statusTitle={statusTitle}
        badgeCount={summary.isGrouped ? summary.bagCount : 0}
        used={summary.usedUp}
        dimmed={summary.bagCount === 0}
        onSelect={
          !readOnly && summary.bagCount > 0 ? toggleSelection : undefined
        }
        selected={isSelected}
        actions={
          summary.headerPendingIdx !== undefined &&
          renderCollectFossilButton(pIdx, summary.headerPendingIdx)
        }
        extraRows={summary.extraPending.map(({ index, status }) => ({
          key: index,
          status,
          action: renderCollectFossilButton(pIdx, index),
        }))}
      />
    );
  };

  // --- Per-player columns, shared by the item and fossil side ---
  const renderPlayerColumns = (
    keyPrefix: string,
    isEditing: boolean,
    onAdd: (pIdx: number) => void,
    renderCards: (pIdx: number) => React.ReactNode,
  ) => (
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
          <div key={`${keyPrefix}-player-${pIdx}`} className="space-y-2">
            <div className="sticky top-0 z-10 pt-4 pb-1 bg-white dark:bg-gray-800">
              <PlayerColumnHeader
                name={name}
                color={PLAYER_COLORS[pIdx]}
                action={
                  !readOnly && (
                    <button
                      onClick={() => onAdd(pIdx)}
                      disabled={isEditing}
                      className={`p-1 rounded-md text-white transition-all shrink-0 shadow-sm ${
                        isEditing
                          ? "bg-gray-400 cursor-not-allowed opacity-50"
                          : "hover:scale-110 hover:shadow-md"
                      } ${focusRingClasses}`}
                      style={
                        !isEditing
                          ? { backgroundColor: PLAYER_COLORS[pIdx] }
                          : undefined
                      }
                    >
                      <FiPlus size={14} />
                    </button>
                  )
                }
              />
            </div>

            <div className="space-y-1 px-1">{renderCards(pIdx)}</div>
          </div>
        ))}
      </div>
    </div>
  );

  // --- Render stone content ---
  const renderStoneContent = () => (
    <div className="flex flex-col max-h-87.5">
      {renderPlayerColumns(
        "stone",
        isItemEditing,
        (pIdx) => setItemModalOpen({ open: true, playerIndex: pIdx }),
        (pIdx) =>
          isItemEditing
            ? displayStones[pIdx]?.map((entry, sIdx) =>
                renderEditableItem(entry, pIdx, sIdx),
              )
            : groupItemEntries(displayStones[pIdx] ?? []).map((group) =>
                renderItemGroup(group, pIdx),
              ),
      )}
    </div>
  );

  // --- Render fossil content ---
  const renderFossilContent = () => (
    <div className="flex flex-col max-h-87.5">
      {renderPlayerColumns(
        "fossil",
        isFossilEditing,
        (pIdx) => setFossilModalOpen({ open: true, playerIndex: pIdx }),
        (pIdx) =>
          isFossilEditing
            ? displayFossils[pIdx]?.map((entry, fIdx) =>
                renderEditableFossil(entry, pIdx, fIdx),
              )
            : groupFossilEntries(displayFossils[pIdx] ?? []).map((group) =>
                renderFossilGroup(group, pIdx),
              ),
      )}

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
