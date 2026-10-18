import { FaGithub } from "react-icons/fa";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { focusRingClasses } from "@/src/styles/focusRing";
import { useImageConsent } from "@/src/contexts/ImageConsentContext";

export default function AppFooter({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const { openConsent, showGuestFooterEntry } = useImageConsent();
  const linkClasses = `min-w-0 break-words rounded-sm hover:text-gray-900 dark:hover:text-white ${focusRingClasses}`;
  const githubCredit = (
    <a
      href="https://github.com/joos-too/soullink-tracker"
      target="_blank"
      rel="noopener noreferrer"
      title={t("footer.github")}
      className={`inline-flex min-w-0 items-center gap-2 text-xs ${linkClasses}`}
    >
      <FaGithub size={22} className="shrink-0" aria-hidden="true" />
      <span>
        Made by joos-too
        <br />
        &amp; FreakMediaLP
      </span>
    </a>
  );
  const legalLinks = (
    <nav
      aria-label={t("footer.legalNavigation")}
      className={`flex min-w-0 gap-y-2 text-sm ${compact ? "flex-wrap justify-end gap-x-4" : "flex-col items-start lg:flex-row lg:flex-wrap lg:gap-x-6"}`}
    >
      <Link to="/legalnotice" className={linkClasses}>
        {t("footer.legalNotice")}
      </Link>
      <Link to="/privacypolicy" className={linkClasses}>
        {t("footer.privacyPolicy")}
      </Link>
      {showGuestFooterEntry && openConsent && (
        <button type="button" onClick={openConsent} className={linkClasses}>
          {t("privacy.settings")}
        </button>
      )}
    </nav>
  );
  return (
    <footer className="rounded-lg border border-gray-200 bg-white px-6 py-4 text-gray-600 shadow-[6px_6px_0_0_rgba(31,41,55,0.25)] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.35)] sm:px-8">
      <div className="grid grid-cols-2 items-center gap-4">
        {compact ? (
          githubCredit
        ) : (
          <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-4">
            {githubCredit}
            {legalLinks}
          </div>
        )}
        {compact ? (
          legalLinks
        ) : (
          <div className="min-w-0 space-y-1 text-right text-[10px] leading-relaxed">
            <p>{t("footer.trademarks")}</p>
            <p>{t("footer.copyright")}</p>
            <p>{t("footer.disclaimer")}</p>
          </div>
        )}
      </div>
    </footer>
  );
}
