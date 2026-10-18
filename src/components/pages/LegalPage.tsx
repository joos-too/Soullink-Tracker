import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import PageLayout from "@/src/components/layout/PageLayout";
import { focusRingClasses } from "@/src/styles/focusRing";

export default function LegalPage({
  kind,
}: {
  kind: "legalNotice" | "privacyPolicy";
}) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[#f0f0f0] px-3 py-6 text-gray-800 dark:bg-gray-900 dark:text-gray-100 sm:py-10">
      <PageLayout width="account" className="space-y-4" showFooter={false}>
        <Link
          to="/"
          className={`inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white ${focusRingClasses}`}
        >
          <FiArrowLeft aria-hidden="true" /> {t("common.back")}
        </Link>
        <main className="rounded-lg border border-gray-200 bg-white px-6 py-8 shadow-[6px_6px_0_0_rgba(31,41,55,0.25)] dark:border-gray-700 dark:bg-gray-800 dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.35)]">
          <h1 className="wrap-break-word text-2xl font-bold">
            {t(`footer.${kind}`)}
          </h1>
          {kind === "legalNotice" && (
            <div className="mt-6 space-y-6 text-sm leading-relaxed">
              <address className="not-italic">
                Jan Erik Lieder
                <br />
                c/o flexdienst – #22275
                <br />
                Kurt-Schumacher-Straße 74
                <br />
                67663 Kaiserslautern
              </address>
              <section aria-labelledby="legal-contact-heading">
                <h2
                  id="legal-contact-heading"
                  className="mb-2 text-lg font-semibold"
                >
                  {t("legalNotice.contact")}
                </h2>
                <p>
                  {t("legalNotice.phone")}:{" "}
                  <a
                    href="tel:+4916096770129"
                    className={`rounded-sm underline ${focusRingClasses}`}
                  >
                    +4916096770129
                  </a>
                </p>
                <p>
                  {t("legalNotice.email")}:{" "}
                  <a
                    href="mailto:jlzmk56@gmail.com"
                    className={`wrap-break-word rounded-sm underline ${focusRingClasses}`}
                  >
                    jlzmk56@gmail.com
                  </a>
                </p>
              </section>
            </div>
          )}
        </main>
      </PageLayout>
    </div>
  );
}
