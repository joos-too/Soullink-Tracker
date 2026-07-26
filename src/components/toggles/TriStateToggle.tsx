import React from "react";

export interface TriStateOption<T extends string> {
  value: T;
  label: string;
}

export interface TriStateToggleProps<T extends string> {
  id: string;
  value: T;
  options: TriStateOption<T>[];
  onChange: (value: T) => void;
  ariaLabel?: string;
  disabled?: boolean;
}

function TriStateToggle<T extends string>({
  id,
  value,
  options,
  onChange,
  ariaLabel,
  disabled,
}: TriStateToggleProps<T>) {
  const selectedIndex = options.findIndex((o) => o.value === value);

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden ${disabled ? "opacity-60 pointer-events-none" : ""}`}
    >
      {options.map((option, index) => {
        const isActive = index === selectedIndex;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            disabled={disabled}
            className={`px-2.5 py-1 text-xs font-semibold transition-colors duration-150 ${
              isActive
                ? "bg-green-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            } ${index > 0 ? "border-l border-gray-300 dark:border-gray-600" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default TriStateToggle;
