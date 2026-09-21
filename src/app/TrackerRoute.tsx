import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TrackerMeta } from "@/types";
import TrackerPage from "@/src/components/pages/TrackerPage";
import { subscribeToTrackerMeta } from "@/src/services/repos/trackerRepository";
import { useAppSession } from "./AppSession";
import LoadingScreen from "./LoadingScreen";
import { isTrackerUuid } from "./trackerStorage";

function TrackerNotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f0f0f0] dark:bg-gray-900 text-gray-700 dark:text-gray-200 px-6 text-center">
      <p className="text-lg font-semibold">{t("app.trackerNotFound.title")}</p>
      <p className="text-sm text-gray-500 mt-2">
        {t("app.trackerNotFound.description")}
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
      >
        {t("common.overview")}
      </Link>
    </div>
  );
}

function ResolvedTrackerRoute({ trackerId }: { trackerId: string }) {
  const { user, userTrackersLoading, userTrackerIds, trackerMetas } =
    useAppSession();
  const isUserTracker = userTrackerIds.includes(trackerId);
  const [publicMeta, setPublicMeta] = useState<TrackerMeta | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (userTrackersLoading || isUserTracker) return;
    let cancelled = false;
    setPublicMeta(undefined);
    const unsubscribe = subscribeToTrackerMeta(
      trackerId,
      (meta) => {
        if (!cancelled) setPublicMeta(meta?.isPublic ? meta : null);
      },
      () => {
        if (!cancelled) setPublicMeta(null);
      },
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [trackerId, userTrackersLoading, isUserTracker]);

  if (userTrackersLoading || (!isUserTracker && publicMeta === undefined))
    return <LoadingScreen />;
  const meta = isUserTracker ? trackerMetas[trackerId] : publicMeta;
  if (!meta) return user ? <TrackerNotFound /> : <Navigate to="/" replace />;
  return <TrackerPage trackerId={trackerId} trackerMeta={meta} />;
}

export default function TrackerRoute() {
  const { trackerId } = useParams();
  if (!isTrackerUuid(trackerId ?? null)) return <TrackerNotFound />;
  return <ResolvedTrackerRoute key={trackerId} trackerId={trackerId!} />;
}
