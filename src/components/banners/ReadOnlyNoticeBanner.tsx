import React, { useState } from "react";
import { FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { focusRingClasses } from "@/src/styles/focusRing.ts";

export const READ_ONLY_NOTICE_STORAGE_KEY = "read-only-notice-dismissed";

const getDismissedTrackerIds = (): string[] => {
  const storedValue = window.localStorage.getItem(READ_ONLY_NOTICE_STORAGE_KEY);
  if (!storedValue) return [];

  let parsedValue: unknown;
  try {
    parsedValue = JSON.parse(storedValue);
  } catch {
    return [];
  }
  return Array.isArray(parsedValue)
    ? parsedValue.filter((value): value is string => typeof value === "string")
    : [];
};

const isDismissed = (trackerId: string) => {
  try {
    return getDismissedTrackerIds().includes(trackerId);
  } catch {
    return false;
  }
};

interface ReadOnlyNoticeBannerProps {
  trackerId: string;
  notice: string;
}

const ReadOnlyNoticeBanner: React.FC<ReadOnlyNoticeBannerProps> = ({
  trackerId,
  notice,
}) => {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => isDismissed(trackerId));

  const dismiss = () => {
    try {
      const dismissedTrackerIds = getDismissedTrackerIds();
      if (!dismissedTrackerIds.includes(trackerId)) {
        window.localStorage.setItem(
          READ_ONLY_NOTICE_STORAGE_KEY,
          JSON.stringify([...dismissedTrackerIds, trackerId]),
        );
      }
    } catch {
      // Keep the banner dismissible even when browser storage is unavailable.
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className="max-w-480 mx-auto mt-3 mb-3 flex items-center gap-3 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-900 shadow-sm dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100"
      role="status"
    >
      <span className="min-w-0 flex-1">{notice}</span>
      <button
        type="button"
        onClick={dismiss}
        className={`shrink-0 rounded-md p-0.5 text-yellow-700 hover:text-yellow-950 dark:text-amber-100 dark:hover:text-amber-50 ${focusRingClasses}`}
        aria-label={t("common.close")}
      >
        <FiX size={20} />
      </button>
    </div>
  );
};

export default ReadOnlyNoticeBanner;
