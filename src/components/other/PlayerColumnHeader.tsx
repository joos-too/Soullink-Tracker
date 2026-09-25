import React from "react";

interface PlayerColumnHeaderProps {
  name: string;
  color: string;
  action?: React.ReactNode;
}

/** Player name above a per-player column, e.g. in the item tracker. */
const PlayerColumnHeader: React.FC<PlayerColumnHeaderProps> = ({
  name,
  color,
  action,
}) => (
  <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
    <span
      className="text-xs font-press-start truncate"
      title={name}
      style={{ color }}
    >
      {name}
    </span>
    {action}
  </div>
);

export default PlayerColumnHeader;
