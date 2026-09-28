import React from "react";
import ItemSprite from "@/src/components/other/ItemSprite.tsx";
import { focusRingCardClasses } from "@/src/styles/focusRing.ts";

export interface ItemCardRow {
  key: React.Key;
  status: string;
  action?: React.ReactNode;
}

interface ItemGroupCardProps {
  name: string;
  spriteUrl: string | null;
  status: string;
  statusTitle?: string;
  /** Shown as a ×N badge when greater than zero */
  badgeCount?: number;
  used?: boolean;
  /** Nothing of this entry is in the bag */
  dimmed?: boolean;
  /** Buttons at the end of the header row */
  actions?: React.ReactNode;
  /** Further uncollected duplicates, each rendered as its own row */
  extraRows?: ItemCardRow[];
  /** Turns the card into a toggle button */
  onSelect?: () => void;
  selected?: boolean;
}

const USED_CARD_CLASS =
  "border-red-300 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20 text-red-700 dark:text-red-400";

/** Item or fossil card of the item tracker, also used by the search modal. */
const ItemGroupCard: React.FC<ItemGroupCardProps> = ({
  name,
  spriteUrl,
  status,
  statusTitle = status,
  badgeCount = 0,
  used = false,
  dimmed = false,
  actions,
  extraRows = [],
  onSelect,
  selected = false,
}) => {
  const interactive = onSelect !== undefined;
  const stateClass = used
    ? USED_CARD_CLASS
    : selected
      ? "border-green-500 bg-green-50 dark:bg-green-900/20 ring-1 ring-green-500"
      : dimmed
        ? "border-gray-200 dark:border-gray-700 opacity-60"
        : interactive
          ? "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300"
          : "border-gray-200 dark:border-gray-700 dark:text-gray-300";

  const renderText = (rowStatus: string, rowTitle: string, badge: number) => (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-1 min-w-0">
        <span className="font-bold truncate" title={name}>
          {name}
        </span>
        {badge > 0 && (
          <span className="shrink-0 px-1 rounded bg-gray-200 dark:bg-gray-700 font-bold">
            ×{badge}
          </span>
        )}
      </div>
      <div className="opacity-70 truncate" title={rowTitle}>
        {rowStatus}
      </div>
    </div>
  );

  return (
    <div
      onClick={onSelect}
      onKeyDown={(e) => {
        if (!onSelect) return;
        if (e.key !== "Enter" && e.key !== " ") return;
        e.preventDefault();
        onSelect();
      }}
      role={interactive ? "button" : undefined}
      aria-pressed={interactive ? selected : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`p-1.5 rounded border text-[10px] transition-all ${stateClass} ${
        interactive ? `cursor-pointer ${focusRingCardClasses}` : ""
      }`}
    >
      <div className="flex items-center gap-2 h-7.5">
        <ItemSprite src={spriteUrl} used={used} />
        {renderText(status, statusTitle, badgeCount)}
        {actions}
      </div>

      {/* Row spacing (18px) matches the padding, border and gap between two
          separate cards, so a group is exactly as tall as the same entries
          listed individually */}
      {extraRows.map((row) => (
        <div
          key={row.key}
          className="mt-2 pt-2.25 border-t border-dashed border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 h-7.5">
            <div className="w-6 shrink-0" />
            {renderText(row.status, row.status, 0)}
            {row.action}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ItemGroupCard;
