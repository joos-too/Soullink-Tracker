import React from "react";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { focusRingClasses } from "@/src/styles/focusRing.ts";

interface TrackerConflictBannerProps {
  onReload: () => void;
}

const TrackerConflictBanner: React.FC<TrackerConflictBannerProps> = ({
  onReload,
}) => {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-live="polite"
      className="max-w-480 mx-auto mt-3 mb-3 flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100"
    >
      <FiAlertTriangle className="shrink-0" size={20} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("app.stateConflict.title")}</p>
        <p>{t("app.stateConflict.description")}</p>
      </div>
      <button
        type="button"
        onClick={onReload}
        className={`inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800 ${focusRingClasses}`}
      >
        <FiRefreshCw aria-hidden />
        {t("app.stateConflict.reload")}
      </button>
    </div>
  );
};

export default TrackerConflictBanner;
