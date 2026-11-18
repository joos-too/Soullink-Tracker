import { useLayoutEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "@/src/hooks/useFocusTrap";
import { focusRingClasses, focusRingBlueClasses } from "@/src/styles/focusRing";

interface ImageConsentModalProps {
  requireDecision: boolean;
  onChoose: (allowed: boolean) => Promise<void>;
  onClose: () => void;
  confirmationTitle?: string;
}

/** Mounted only while open. A separate portal keeps underlying drafts intact. */
export default function ImageConsentModal({
  requireDecision,
  onChoose,
  onClose,
  confirmationTitle,
}: ImageConsentModalProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const descriptionId = useId();
  const [host] = useState(() => document.createElement("div"));
  const { containerRef } = useFocusTrap(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useLayoutEffect(() => {
    document.body.append(host);
    const background = [...document.body.children].filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== host,
    );
    const previous = background.map((element) => ({
      element,
      inert: element.inert,
    }));
    background.forEach((element) => {
      element.inert = true;
    });
    return () => {
      previous.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      host.remove();
    };
  }, [host]);

  const choose = async (allowed: boolean) => {
    setSaving(true);
    setError(false);
    try {
      await onChoose(allowed);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          if (!requireDecision && !saving) onClose();
        }
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        aria-busy={saving}
        tabIndex={-1}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
      >
        {confirmationTitle && (
          <h2
            id={titleId}
            className="text-xl font-bold text-gray-900 dark:text-gray-100"
          >
            {confirmationTitle}
          </h2>
        )}
        <h2
          id={confirmationTitle ? undefined : titleId}
          className={`${confirmationTitle ? "mt-3 text-base" : "text-xl"} font-bold text-gray-900 dark:text-gray-100`}
        >
          {t("privacy.images.title")}
        </h2>
        <p
          id={descriptionId}
          className="mt-3 text-sm text-gray-700 dark:text-gray-300"
        >
          {t("privacy.images.description")}
        </p>
        <Link
          to="/privacypolicy"
          className={`mt-3 inline-block text-sm text-blue-600 underline dark:text-blue-400 ${focusRingBlueClasses}`}
        >
          {t("privacy.policy")}
        </Link>
        {error && (
          <p
            role="alert"
            className="mt-3 text-sm text-red-600 dark:text-red-400"
          >
            {t("privacy.images.saveError")}
          </p>
        )}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {[false, true].map((allowed) => (
            <button
              key={String(allowed)}
              type="button"
              disabled={saving}
              onClick={() => void choose(allowed)}
              className={`rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-60 ${allowed ? "border-green-600 bg-green-600 text-white hover:border-green-700 hover:bg-green-700" : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"} ${focusRingClasses}`}
            >
              {t(allowed ? "privacy.images.allow" : "privacy.images.decline")}
            </button>
          ))}
        </div>
      </div>
    </div>,
    host,
  );
}
