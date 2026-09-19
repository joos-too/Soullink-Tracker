import { useTranslation } from "react-i18next";
export default function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f0f0] dark:bg-gray-900">
      <div
        className="flex flex-col items-center gap-3"
        role="status"
        aria-live="polite"
      >
        <div className="h-10 w-10 border-4 border-gray-300 dark:border-gray-600 dark:border-t-blue-600 border-t-blue-600 rounded-full animate-spin" />
        <span className="text-gray-600 dark:text-gray-300 text-sm">
          {t("common.loading")}
        </span>
      </div>
    </div>
  );
}
