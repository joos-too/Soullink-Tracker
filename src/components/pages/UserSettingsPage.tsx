import React, { useEffect, useState } from "react";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiCheckCircle,
  FiExternalLink,
  FiInfo,
  FiLock,
  FiLogOut,
  FiMail,
  FiRefreshCw,
  FiSave,
  FiUser,
} from "react-icons/fi";
import {
  focusRingClasses,
  focusRingRedClasses,
} from "@/src/styles/focusRing.ts";
import { sectionHeadingClasses } from "@/src/styles/sectionHeading.ts";
import { requestPasswordReset } from "@/src/services/backend/auth.ts";
import ToggleSwitch from "@/src/components/toggles/ToggleSwitch.tsx";
import { useTranslation } from "react-i18next";
import LanguageToggle from "@/src/components/toggles/LanguageToggle.tsx";
import Tooltip from "@/src/components/other/Tooltip.tsx";
import { WIKIS, type WikiId } from "@/src/utils/wikiPreferences";

interface UserSettingsPageProps {
  email?: string | null;
  displayName: string;
  onDisplayNameChange: (displayName: string) => Promise<void>;
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
  displayName,
  onDisplayNameChange,
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
  const [displayNameDraft, setDisplayNameDraft] = useState(displayName);
  const [displayNameSaving, setDisplayNameSaving] = useState(false);
  const [displayNameError, setDisplayNameError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    setDisplayNameDraft(displayName);
  }, [displayName]);

  const handleDisplayNameSave = async (event: React.SubmitEvent) => {
    event.preventDefault();
    const nextDisplayName = displayNameDraft.trim().replace(/\s+/g, " ");
    if (!nextDisplayName) {
      setDisplayNameError(t("userSettings.displayName.required"));
      return;
    }
    if (nextDisplayName.length > 50) {
      setDisplayNameError(t("userSettings.displayName.tooLong"));
      return;
    }

    setDisplayNameSaving(true);
    setDisplayNameError(null);
    try {
      await onDisplayNameChange(nextDisplayName);
      setDisplayNameDraft(nextDisplayName);
    } catch (error) {
      console.error("Failed to save display name", error);
      setDisplayNameError(t("userSettings.displayName.saveFailed"));
    } finally {
      setDisplayNameSaving(false);
    }
  };

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

        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-6 py-8 shadow-[6px_6px_0_0_rgba(31,41,55,0.25)] dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.35)]">
          <header className="pb-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-2xl font-bold font-press-start text-gray-900 dark:text-gray-100">
              {t("userSettings.header.title")}
            </h1>
          </header>

          <section className="mt-6 space-y-4">
            <div className="space-y-3">
              <h2 className={sectionHeadingClasses}>
                {t("userSettings.account.title")}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("userSettings.account.description")}
              </p>
            </div>
            <form
              onSubmit={handleDisplayNameSave}
              className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4"
            >
              <FiUser className="mt-0.5 shrink-0" size={20} />
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="display-name"
                  className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500"
                >
                  {t("userSettings.displayName.label")}
                </label>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("userSettings.displayName.info")}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="display-name"
                    value={displayNameDraft}
                    onChange={(event) => {
                      setDisplayNameDraft(event.target.value);
                      setDisplayNameError(null);
                    }}
                    maxLength={50}
                    required
                    className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  />
                  <button
                    type="submit"
                    disabled={displayNameSaving}
                    className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRingClasses}`}
                  >
                    <FiSave />
                    {t("userSettings.displayName.save")}
                  </button>
                </div>
                {displayNameError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {displayNameError}
                  </p>
                )}
              </div>
            </form>

            <div className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4">
              <FiMail className="mt-0.5 shrink-0" size={20} />
              <div className="min-w-0 flex-1">
                <label
                  htmlFor="account-email"
                  className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500"
                >
                  {t("userSettings.emailLabel")}
                </label>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t("userSettings.emailInfo")}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <div className="relative min-w-0 flex-1">
                    <input
                      id="account-email"
                      value={email || "-"}
                      readOnly
                      aria-readonly="true"
                      aria-describedby="account-email-locked"
                      className="w-full cursor-not-allowed rounded-md border border-dashed border-gray-300 bg-gray-100 py-2 pl-3 pr-10 text-gray-500 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center">
                      <Tooltip
                        side="top"
                        content={t("userSettings.emailReadOnly")}
                        className="h-4"
                      >
                        <span className="text-gray-400 dark:text-gray-500 cursor-help">
                          <FiLock size={16} aria-hidden="true" />
                        </span>
                      </Tooltip>
                    </div>
                    <span id="account-email-locked" className="sr-only">
                      {t("userSettings.emailReadOnly")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={disabled}
                    className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRingClasses}`}
                  >
                    <FiRefreshCw className={loading ? "animate-spin" : ""} />
                    {t("userSettings.actions.resetPassword")}
                  </button>
                </div>
                {message && (
                  <div
                    className={`mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-sm leading-6 ${
                      status === "success"
                        ? "border-green-300 bg-green-50 text-green-800 dark:border-green-700 dark:bg-green-900/30 dark:text-green-200"
                        : "border-red-300 bg-red-50 text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
                    }`}
                    role="status"
                    aria-live="polite"
                  >
                    {status === "success" ? (
                      <FiCheckCircle className="mt-[5px] shrink-0" />
                    ) : (
                      <FiAlertTriangle className="mt-[5px] shrink-0" />
                    )}
                    <span>{message}</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="pt-6 border-t border-gray-200 dark:border-gray-700 mt-6 space-y-3">
            <h2 className={sectionHeadingClasses}>
              {t("userSettings.language.title")}
            </h2>
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
            <h2 className={sectionHeadingClasses}>
              {t("userSettings.sprites.title")}
            </h2>

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
            <h2 className={sectionHeadingClasses}>
              {t("userSettings.wiki.title")}
            </h2>
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
