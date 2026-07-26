import React from "react";

export interface ToggleSwitchProps {
  id: string;
  checked: boolean;
  onChange: (enabled: boolean) => void;
  ariaLabel?: string;
  disabled?: boolean;
  size?: "sm" | "md";
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  id,
  checked,
  onChange,
  ariaLabel,
  disabled,
  size = "md",
}) => {
  const isSmall = size === "sm";
  const trackClasses = `relative block ${isSmall ? "h-5 w-9" : "h-6 w-11"} rounded-full transition-colors duration-200 ease-out pointer-events-none ${
    checked ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"
  } ${disabled ? "opacity-60" : ""}`;
  const thumbClasses = `absolute top-[2px] left-[2px] ${isSmall ? "h-4 w-4" : "h-5 w-5"} transform rounded-full bg-white shadow transition duration-200 ease-out pointer-events-none ${
    checked ? (isSmall ? "translate-x-4" : "translate-x-5") : ""
  }`;

  return (
    <label
      htmlFor={id}
      className={`focus-ring-toggle inline-flex items-center rounded-full p-1 ${
        disabled ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
        className="sr-only"
        aria-label={ariaLabel}
      />
      <span aria-hidden="true" className={trackClasses}>
        <span className={thumbClasses} />
      </span>
    </label>
  );
};

export default ToggleSwitch;
