import React, { useState } from "react";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiExternalLink,
  FiInfo,
  FiLogOut,
  FiMail,
  FiRefreshCw,
} from "react-icons/fi";
import {
  focusRingClasses,
  focusRingRedClasses,
} from "@/src/styles/focusRing.ts";
import { requestPasswordReset } from "@/src/services/auth.ts";
import ToggleSwitch from "@/src/components/toggles/ToggleSwitch.tsx";
import { useTranslation } from "react-i18next";
import LanguageToggle from "@/src/components/toggles/LanguageToggle.tsx";
import Tooltip from "@/src/components/other/Tooltip.tsx";
import { WIKIS, type WikiId } from "@/src/utils/wiki.ts";

interface UserSettingsPageProps {
  email?: string | null;
  onBack: () => void;
  onLogout: () => void;
  useGenerationSprites?: boolean;
  onGenerationSpritesToggle: (enabled: boolean) => void;
  useSpritesInTeamTable?: boolean;
  onSpritesInTeamTableToggle: (enabled: boolean) => void;
  wikiId?: string | null;
  onWikiChange: (id: WikiId) => void;
  multiLocaleSearch?: boolean;
  onMultiLocaleSearchToggle: (enabled: boolean) => void;
}

const UserSettingsPage: React.FC<UserSettingsPageProps> = ({
  email,
  onBack,
  onLogout,
  useGenerationSprites,
  onGenerationSpritesToggle,
  useSpritesInTeamTable,
  onSpritesInTeamTableToggle,
  wikiId,
  onWikiChange,
  multiLocaleSearch,
  onMultiLocaleSearchToggle,
}) => {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation();

  const handlePasswordReset = async () => {
    if (!email) {
      setStatus("error");
      setMessage(t("userSettings.errors.noEmail"));
      return;
    }

    setLoading(true);
    setStatus("idle");
    setMessage(null);
    try {
      await requestPasswordReset(email);
      setStatus("success");
      setMessage(t("userSettings.messages.resetEmailSent"));
    } catch (error) {
      const fallback =
        error instanceof Error
          ? error.message
          : t("userSettings.errors.resetFailed");
      setStatus("error");
      setMessage(fallback);
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || !email;

  return (
    <div className="min-h-screen bg-[#f0f0f0] dark:bg-gray-900 text-gray-800 dark:text-gray-100 px-3 py-6 sm:py-10">
      <div className="max-w-2xl mx-auto space-y-4">
        <button
          onClick={onBack}
          className={`inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white ${focusRingClasses}`}
        >
          <FiArrowLeft /> {t("userSettings.buttons.back")}
        </button>

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-6 py-8 shadow-[6px_6px_0_0_rgba(31,41,55,0.25)]">
          <header className="mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-green-600">
              {t("userSettings.header.badge")}
            </p>
            <h1 className="text-2xl font-bold font-press-start text-gray-900 dark:text-gray-100 mt-3">
              {t("userSettings.header.title")}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              {t("userSettings.header.subtitle")}
            </p>
          </header>

          <section className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700">
              <FiMail className="mt-1" size={20} />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  {t("userSettings.emailLabel")}
                </p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {email || "-"}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {t("userSettings.emailInfo")}
                </p>
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={disabled}
                className={`inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed ${focusRingClasses}`}
              >
                {loading ? (
                  <FiRefreshCw className="animate-spin" />
                ) : (
                  <FiRefreshCw />
                )}
                {t("userSettings.actions.resetPassword")}
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t("userSettings.resetDetails")}
              </p>
            </div>

            {message && (
              <div
                className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
                  status === "success"
                    ? "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200"
                    : "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
                }`}
                role="status"
                aria-live="polite"
              >
                {status === "success" ? (
                  <FiCheckCircle className="mt-0.5" />
                ) : (
                  <FiAlertTriangle className="mt-0.5" />
                )}
                <span>{message}</span>
              </div>
            )}
          </section>

          <section className="pt-6 border-t border-gray-200 dark:border-gray-700 mt-6 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
              {t("userSettings.language.title")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("userSettings.language.description")}
            </p>
            <div className="flex justify-start">
              <LanguageToggle />
            </div>

            <div className="flex items-center justify-between pt-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    {t("userSettings.language.multiLocaleSearch.title")}
                  </div>
                  <Tooltip
                    side="top"
                    content={t(
                      "userSettings.language.multiLocaleSearch.tooltip",
                    )}
                  >
                    <span
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                      aria-label={t(
                        "userSettings.language.multiLocaleSearch.title",
                      )}
                    >
                      <FiInfo size={16} />
                    </span>
                  </Tooltip>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t("userSettings.language.multiLocaleSearch.description")}
                </div>
              </div>
              <ToggleSwitch
                id="multi-locale-search-toggle"
                checked={multiLocaleSearch ?? false}
                onChange={onMultiLocaleSearchToggle}
                ariaLabel={t("userSettings.language.multiLocaleSearch.title")}
              />
            </div>
          </section>

          <section className="pt-6 border-t border-gray-200 dark:border-gray-700 mt-6 space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
              {t("userSettings.sprites.title")}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    {t("settings.features.generationSprites.title")}
                  </div>
                  <Tooltip
                    side="top"
                    content={t("settings.features.generationSprites.tooltip")}
                  >
                    <span
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                      aria-label={t(
                        "settings.features.generationSprites.tooltipLabel",
                      )}
                    >
                      <FiInfo size={16} />
                    </span>
                  </Tooltip>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t("settings.features.generationSprites.description")}
                </div>
              </div>
              <ToggleSwitch
                id="generation-sprites-toggle"
                checked={useGenerationSprites ?? false}
                onChange={onGenerationSpritesToggle}
                ariaLabel={t("settings.features.generationSprites.title")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    {t("settings.features.spritesInTeamTable.title")}
                  </div>
                  <Tooltip
                    side="top"
                    content={t("settings.features.spritesInTeamTable.tooltip")}
                  >
                    <span
                      className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 cursor-help"
                      aria-label={t(
                        "settings.features.spritesInTeamTable.tooltipLabel",
                      )}
                    >
                      <FiInfo size={16} />
                    </span>
                  </Tooltip>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t("settings.features.spritesInTeamTable.description")}
                </div>
              </div>
              <ToggleSwitch
                id="sprites-in-team-table-toggle"
                checked={useSpritesInTeamTable ?? false}
                onChange={onSpritesInTeamTableToggle}
                ariaLabel={t("settings.features.spritesInTeamTable.title")}
              />
            </div>
          </section>

          <section className="pt-6 border-t border-gray-200 dark:border-gray-700 mt-6 space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
              {t("userSettings.wiki.title")}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("userSettings.wiki.description")}
            </p>
            <div className="flex flex-wrap gap-2">
              {WIKIS.map((wiki) => {
                const isActive = wikiId === wiki.id;
                return (
                  <button
                    key={wiki.id}
                    type="button"
                    onClick={() => onWikiChange(wiki.id)}
                    className={`flex-1 min-w-[140px] flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all shadow-sm outline-none ${
                      isActive
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                        : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
                    }`}
                  >
                    <span className="font-bold flex items-center gap-1.5">
                      {wiki.name}
                      <a
                        href={wiki.baseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="opacity-60 hover:opacity-100"
                        tabIndex={-1}
                      >
                        <FiExternalLink size={13} />
                      </a>
                    </span>
                    <span className="text-xs uppercase tracking-wider opacity-70">
                      {wiki.language === "de"
                        ? t("userSettings.wiki.languageDE")
                        : t("userSettings.wiki.languageEN")}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {t("userSettings.logoutPrompt")}
            </p>
            <button
              type="button"
              onClick={onLogout}
              className={`inline-flex items-center gap-2 rounded-md border border-red-200 dark:border-red-700 px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30 ${focusRingRedClasses}`}
            >
              <FiLogOut /> {t("common.logout")}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default UserSettingsPage;
