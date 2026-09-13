import React, { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { focusRingInputClasses } from "@/src/styles/focusRing.ts";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

const PasswordInput: React.FC<PasswordInputProps> = ({
  className = "",
  disabled,
  ...props
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="relative">
      <input
        {...props}
        type={isVisible ? "text" : "password"}
        disabled={disabled}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={t(
          isVisible
            ? "auth.passwordVisibility.hide"
            : "auth.passwordVisibility.show",
        )}
        aria-pressed={isVisible}
        title={t(
          isVisible
            ? "auth.passwordVisibility.hide"
            : "auth.passwordVisibility.show",
        )}
        onClick={() => setIsVisible((visible) => !visible)}
        className={`absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-gray-500 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:text-gray-500 dark:text-gray-400 dark:hover:text-gray-100 dark:disabled:hover:text-gray-400 ${focusRingInputClasses}`}
      >
        {isVisible ? (
          <FiEyeOff size={18} aria-hidden="true" />
        ) : (
          <FiEye size={18} aria-hidden="true" />
        )}
      </button>
    </div>
  );
};

export default PasswordInput;
