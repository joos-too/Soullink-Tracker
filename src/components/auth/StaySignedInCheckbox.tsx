import { useTranslation } from "react-i18next";
import { focusRingInputClasses } from "@/src/styles/focusRing.ts";
import PrivacyNotice from "@/src/components/auth/PrivacyNotice";

interface StaySignedInCheckboxProps {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}

export default function StaySignedInCheckbox({
  checked,
  disabled,
  onChange,
}: StaySignedInCheckboxProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1">
      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className={`h-4 w-4 rounded border-gray-300 accent-green-600 ${focusRingInputClasses}`}
        />
        {t("auth.staySignedIn")}
      </label>
      <PrivacyNotice />
    </div>
  );
}
