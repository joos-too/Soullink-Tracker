import React, { useCallback, useState } from "react";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  side = "top",
  className,
}) => {
  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  } as const;

  const [visible, setVisible] = useState(false);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  return (
    <span
      className={`relative inline-block ${className ?? ""}`}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onTouchStart={show}
      onTouchEnd={hide}
      onTouchCancel={hide}
    >
      <span className="inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-sm">
        {children}
      </span>
      {visible && (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-50 w-max max-w-xs ${positionClasses[side]} select-none rounded-md bg-gray-800 px-2 py-1 text-xs text-white opacity-100 shadow-lg ring-1 ring-black/10 transition-opacity duration-150 ease-out dark:bg-gray-200 dark:text-gray-900 whitespace-pre-line`}
        >
          {content}
        </span>
      )}
    </span>
  );
};

export default Tooltip;
