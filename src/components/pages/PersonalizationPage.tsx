import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import PageLayout from "@/src/components/layout/PageLayout";
import ImageConsentModal from "@/src/components/modals/ImageConsentModal";
import {
  UserPreferenceSections,
  type UserPreferenceSectionsProps,
} from "./UserSettingsPage";
import { focusRingClasses } from "@/src/styles/focusRing";

type PersonalizationPageProps = Omit<
  UserPreferenceSectionsProps,
  | "allowImageLoading"
  | "onImageLoadingChange"
  | "showImageLoadingSetting"
  | "showTopDivider"
> & {
  initialAllowImageLoading: boolean;
  onComplete: (allowImageLoading: boolean) => Promise<void>;
};

export default function PersonalizationPage({
  initialAllowImageLoading,
  onComplete,
  ...preferenceProps
}: PersonalizationPageProps) {
  const { t } = useTranslation();
  const [allowImageLoading, setAllowImageLoading] = useState(
    initialAllowImageLoading,
  );
  const [showImageConfirmation, setShowImageConfirmation] = useState(false);
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionError, setCompletionError] = useState(false);

  useEffect(() => {
    setAllowImageLoading(initialAllowImageLoading);
  }, [initialAllowImageLoading]);

  const complete = async (allowed: boolean) => {
    setCompletionSaving(true);
    setCompletionError(false);
    try {
      await onComplete(allowed);
    } finally {
      setCompletionSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0] px-3 py-6 text-gray-800 dark:bg-gray-900 dark:text-gray-100 sm:py-10">
      <PageLayout width="account" showFooter={false}>
        <div className="rounded-lg border border-gray-200 bg-white px-6 py-8 shadow-[6px_6px_0_0_rgba(31,41,55,0.25)] dark:border-gray-700 dark:bg-gray-800 dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.35)]">
          <header>
            <h1 className="font-press-start text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t("personalization.title")}
            </h1>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t("personalization.description")}
            </p>
          </header>

          <UserPreferenceSections
            {...preferenceProps}
            showTopDivider={false}
            showImageLoadingSetting={false}
          />

          <section className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
              <input
                type="checkbox"
                checked={allowImageLoading}
                disabled={completionSaving}
                onChange={(event) => setAllowImageLoading(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-green-600 accent-green-600"
              />
              <span>
                <span className="block font-medium text-gray-800 dark:text-gray-200">
                  {t("personalization.allowImages")}
                </span>
                <span className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
                  {t("privacy.images.description")}
                </span>
              </span>
            </label>

            {completionError && (
              <p
                role="alert"
                className="mt-3 text-sm text-red-600 dark:text-red-400"
              >
                {t("personalization.saveError")}
              </p>
            )}

            <button
              type="button"
              disabled={completionSaving}
              onClick={() => {
                if (!allowImageLoading) {
                  setShowImageConfirmation(true);
                  return;
                }
                void complete(true).catch(() => setCompletionError(true));
              }}
              className={`mt-4 inline-flex w-full items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${focusRingClasses}`}
            >
              {completionSaving
                ? `${t("personalization.continue")}…`
                : t("personalization.continue")}
            </button>
          </section>
        </div>
      </PageLayout>

      {showImageConfirmation && (
        <ImageConsentModal
          requireDecision
          confirmationTitle={t("personalization.imageConfirmationTitle")}
          onClose={() => {}}
          onChoose={async (allowed) => {
            await complete(allowed);
          }}
        />
      )}
    </div>
  );
}
