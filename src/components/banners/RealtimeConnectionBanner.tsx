import React from "react";
import { FiAlertTriangle, FiRefreshCw, FiWifi } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import type { TrackerRealtimeStatus } from "@/src/hooks/useActiveTracker.ts";
import { focusRingClasses } from "@/src/styles/focusRing.ts";

interface RealtimeConnectionBannerProps {
  status: Exclude<TrackerRealtimeStatus, "idle" | "connected">;
  onRetry: () => void;
}

const RealtimeConnectionBanner: React.FC<RealtimeConnectionBannerProps> = ({
  status,
  onRetry,
}) => {
  const { t } = useTranslation();
  const isWarning = status === "disconnected" || status === "resync-error";
  const Icon = isWarning ? FiAlertTriangle : FiWifi;

  return (
    <div
      className={`max-w-480 mx-auto mt-3 mb-3 flex items-center gap-3 rounded-md border px-3 py-2 text-sm shadow-sm ${
        isWarning
          ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100"
          : "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-100"
      }`}
      role="status"
      aria-live="polite"
    >
      <Icon className="shrink-0" size={20} aria-hidden />
      <span className="min-w-0 flex-1">{t(`app.realtime.${status}`)}</span>
      {status === "resync-error" && (
        <button
          type="button"
          onClick={onRetry}
          className={`inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800 ${focusRingClasses}`}
        >
          <FiRefreshCw aria-hidden />
          {t("app.realtime.retry")}
        </button>
      )}
    </div>
  );
};

export default RealtimeConnectionBanner;
