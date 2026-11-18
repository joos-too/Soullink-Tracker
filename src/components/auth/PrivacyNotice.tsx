import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useFocusTrap } from "@/src/hooks/useFocusTrap";
import { focusRingClasses, focusRingBlueClasses } from "@/src/styles/focusRing";
import { FiInfo } from "react-icons/fi";

export default function PrivacyNotice() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { containerRef } = useFocusTrap(open);
  const titleId = useId();
  const close = () => setOpen(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("privacy.notice.title")}
        title={t("privacy.notice.title")}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`shrink-0 rounded p-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 ${focusRingBlueClasses}`}
      >
        <FiInfo size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
          onKeyDown={(event) => {
            if (event.key === "Escape") close();
          }}
        >
          <div
            ref={containerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
          >
            <h2 id={titleId} className="text-xl font-bold dark:text-gray-100">
              {t("privacy.notice.title")}
            </h2>
            <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
              <Trans
                i18nKey="privacy.notice.description"
                components={{
                  privacyLink: (
                    <Link
                      to="/privacypolicy"
                      className={`text-blue-600 underline dark:text-blue-400 ${focusRingBlueClasses}`}
                    />
                  ),
                }}
              />
            </p>
            <button
              type="button"
              onClick={close}
              className={`mt-5 w-full rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 ${focusRingClasses}`}
            >
              {t("privacy.notice.close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
