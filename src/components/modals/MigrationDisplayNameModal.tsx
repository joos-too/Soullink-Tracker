import React, { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFocusTrap } from "@/src/hooks/useFocusTrap.ts";
import {
  focusRingClasses,
  focusRingInputClasses,
} from "@/src/styles/focusRing.ts";

interface MigrationDisplayNameModalProps {
  isOpen: boolean;
  initialDisplayName: string;
  onClose: () => void;
  onSave: (displayName: string) => Promise<void>;
}

const MigrationDisplayNameModal: React.FC<MigrationDisplayNameModalProps> = ({
  isOpen,
  initialDisplayName,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const { containerRef } = useFocusTrap(isOpen);
  const titleId = useId();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(initialDisplayName);
    setError(null);
  }, [initialDisplayName, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.SubmitEvent) => {
    event.preventDefault();
    const normalized = displayName.trim().replace(/\s+/g, " ");
    if (!normalized) {
      setError(t("modals.migrationDisplayName.required"));
      return;
    }
    if (normalized.length > 50) {
      setError(t("modals.migrationDisplayName.tooLong"));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(normalized);
    } catch (saveError) {
      console.error("Failed to save migrated display name", saveError);
      setError(t("modals.migrationDisplayName.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
      >
        <h2 id={titleId} className="text-xl font-bold dark:text-gray-100">
          {t("modals.migrationDisplayName.title")}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          {t("modals.migrationDisplayName.description")}
        </p>
        <form onSubmit={handleSubmit} className="mt-5">
          <label
            htmlFor="migration-display-name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {t("modals.migrationDisplayName.label")}
          </label>
          <input
            id="migration-display-name"
            data-autofocus
            required
            maxLength={50}
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setError(null);
            }}
            className={`mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 ${focusRingInputClasses}`}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className={`rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700 ${focusRingClasses}`}
            >
              {t("modals.migrationDisplayName.later")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 ${focusRingClasses}`}
            >
              {saving
                ? t("modals.migrationDisplayName.saving")
                : t("modals.migrationDisplayName.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MigrationDisplayNameModal;
