import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  FiCopy,
  FiHome,
  FiPlus,
  FiSave,
  FiTag,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import type { Ruleset } from "@/types.ts";
import type { SaveRulesetPayload } from "@/src/services/rulesets.ts";
import { useTranslation } from "react-i18next";
import {
  focusRingClasses,
  focusRingInputClasses,
  focusRingRedClasses,
} from "@/src/styles/focusRing.ts";
import { DEFAULT_RULES, PREDEFINED_RULESET_TAGS } from "@/src/data/rulesets.ts";
import { sanitizeTags } from "@/src/services/init.ts";
import RulesetPicker from "@/src/components/pickers/RulesetPicker.tsx";
import DarkModeToggle from "@/src/components/toggles/DarkModeToggle.tsx";
import { useFocusTrap } from "@/src/hooks/useFocusTrap.ts";

interface RulesetEditorPageProps {
  rulesets: Ruleset[];
  onNavigateHome: () => void;
  onSave: (payload: SaveRulesetPayload) => Promise<Ruleset>;
  onDelete: (rulesetId: string) => Promise<void>;
  defaultRulesetId?: string;
}

const RulesetEditorPage: React.FC<RulesetEditorPageProps> = ({
  rulesets,
  onNavigateHome,
  onSave,
  onDelete,
  defaultRulesetId,
}) => {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState(
    defaultRulesetId || rulesets[0]?.id || "",
  );
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftRules, setDraftRules] = useState<string[]>(DEFAULT_RULES);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { containerRef: confirmModalRef } = useFocusTrap(confirmDeleteOpen);
  const confirmModalTitleId = useId();

  const selectedRuleset = useMemo(
    () => rulesets.find((entry) => entry.id === selectedId),
    [rulesets, selectedId],
  );
  const isPreset = Boolean(selectedRuleset?.isPreset);

  const applyDraftFrom = useCallback(
    (source?: Partial<Ruleset> | null, copyName: boolean = false) => {
      const normalizedRules =
        Array.isArray(source?.rules) && source.rules.length > 0
          ? [...source.rules]
          : [""];
      setDraftName(
        copyName && source?.name
          ? `${source.name} (${t("rulesetEditor.copySuffix")})`
          : source?.name || "",
      );
      setDraftDescription(source?.description || "");
      setDraftRules(normalizedRules);
      setDraftTags(sanitizeTags(source?.tags));
      setTagInput("");
      setMessage(null);
      setError(null);
    },
    [t],
  );

  useEffect(() => {
    if (!selectedRuleset || selectedId === "new") return;
    applyDraftFrom(selectedRuleset);
  }, [selectedRuleset, selectedId, applyDraftFrom]);

  useEffect(() => {
    if (
      selectedId === "new" ||
      rulesets.find((entry) => entry.id === selectedId)
    ) {
      return;
    }
    const fallbackId = defaultRulesetId || rulesets[0]?.id || "";
    setSelectedId(fallbackId);
    const fallbackRuleset = rulesets.find((entry) => entry.id === fallbackId);
    applyDraftFrom(fallbackRuleset);
  }, [rulesets, selectedId, defaultRulesetId, applyDraftFrom]);

  const handleAddRule = () => {
    setDraftRules((prev) => [...prev, ""]);
  };

  const handleRuleChange = (index: number, value: string) => {
    setDraftRules((prev) =>
      prev.map((entry, i) => (i === index ? value : entry)),
    );
  };

  const handleRuleRemove = (index: number) => {
    setDraftRules((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, i) => i !== index),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const result = await onSave({
        id: !isPreset && selectedRuleset ? selectedRuleset.id : undefined,
        name: draftName,
        description: draftDescription,
        rules: draftRules,
        tags: draftTags,
      });
      if (result?.id) {
        setSelectedId(result.id);
      }
      setMessage(t("rulesetEditor.saveSuccess"));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("rulesetEditor.saveError");
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRuleset || selectedRuleset.isPreset) return;
    setDeleting(true);
    setError(null);
    setMessage(null);
    try {
      await onDelete(selectedRuleset.id);
      const fallbackId = defaultRulesetId || rulesets[0]?.id || "";
      setSelectedId(fallbackId);
      const fallbackRuleset = rulesets.find((entry) => entry.id === fallbackId);
      applyDraftFrom(fallbackRuleset);
      setMessage(t("rulesetEditor.deleteSuccess"));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t("rulesetEditor.deleteError");
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    setConfirmDeleteOpen(false);
    await handleDelete();
  };

  const handleStartNew = (template?: Ruleset) => {
    setSelectedId("new");
    applyDraftFrom(
      template ?? { rules: [""], name: "", description: "" },
      Boolean(template),
    );
  };

  const handleAddTag = (tag: string) => {
    const cleaned = sanitizeTags([tag])[0];
    if (!cleaned) return;
    setDraftTags((prev) => sanitizeTags([...prev, cleaned]));
    setTagInput("");
  };

  const handleTagSubmit = (event: React.SubmitEvent) => {
    event.preventDefault();
    handleAddTag(tagInput);
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const handleRemoveTag = (tag: string) => {
    setDraftTags((prev) =>
      prev.filter((entry) => entry.toLowerCase() !== tag.toLowerCase()),
    );
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0] dark:bg-gray-900 text-gray-800 dark:text-gray-100 px-3 py-6 sm:py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-5 sm:px-6 shadow-[6px_6px_0_0_rgba(31,41,55,0.25)] dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.35)]">
          <div className="flex min-w-0 flex-1 flex-col justify-center min-h-16 sm:min-h-20">
            <h1 className="text-xl sm:text-3xl font-press-start text-gray-900 dark:text-gray-100 mt-2">
              {t("rulesetEditor.title")}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              {t("rulesetEditor.subtitle")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <DarkModeToggle />
            <button
              type="button"
              onClick={onNavigateHome}
              className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white ${focusRingClasses}`}
              aria-label={t("common.overview")}
              title={t("common.overview")}
            >
              <FiHome size={28} />
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch lg:h-[calc(100vh-218px)] lg:min-h-0">
          <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-[6px_6px_0_0_rgba(31,41,55,0.25)] dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.35)] h-full flex flex-col min-h-0 overflow-hidden">
            <div className="flex h-full flex-col min-h-0">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
                  {t("rulesetEditor.listTitle")}
                </h2>
                <button
                  type="button"
                  onClick={() => handleStartNew()}
                  className={`inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-sm transition hover:bg-green-700 ${focusRingClasses}`}
                >
                  <FiPlus /> {t("rulesetEditor.new")}
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <RulesetPicker
                  value={selectedId}
                  rulesets={rulesets}
                  onSelect={(id) => setSelectedId(id)}
                  enableTagFilter
                  fullHeight
                />
              </div>
              {selectedRuleset && (
                <div className="mt-auto pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedRuleset.isPreset
                      ? t("rulesetEditor.presetLocked")
                      : t("rulesetEditor.customHint")}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleStartNew(selectedRuleset)}
                    className={`inline-flex items-center gap-1 text-xs font-semibold rounded-md px-2 py-1 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 ${focusRingClasses}`}
                  >
                    <FiCopy size={14} /> {t("rulesetEditor.copy")}
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-[6px_6px_0_0_rgba(31,41,55,0.25)] dark:shadow-[6px_6px_0_0_rgba(0,0,0,0.35)] space-y-4 h-full flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-gray-500">
              {t("rulesetEditor.formTitle")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold mb-1">
                  {t("rulesetEditor.name")}
                </label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  disabled={isPreset}
                  className={`w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 disabled:opacity-60 ${focusRingInputClasses}`}
                  placeholder={t("rulesetEditor.namePlaceholder")}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  {t("rulesetEditor.description")}
                </label>
                <input
                  type="text"
                  value={draftDescription}
                  onChange={(e) => setDraftDescription(e.target.value)}
                  disabled={isPreset}
                  className={`w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-gray-100 disabled:opacity-60 ${focusRingInputClasses}`}
                  placeholder={t("rulesetEditor.descriptionPlaceholder")}
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-1 lg:min-h-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {t("rulesetEditor.rulesTitle")}
                </h3>
                {!isPreset && (
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className={`inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 ${focusRingClasses}`}
                  >
                    <FiPlus /> {t("rulesetEditor.addRule")}
                  </button>
                )}
              </div>
              <div
                tabIndex={-1}
                className="space-y-2 max-h-[40vh] lg:max-h-none lg:flex-1 lg:min-h-40 overflow-y-auto pr-2 sm:pr-1 py-1 custom-scrollbar focus-visible:outline-none"
              >
                {draftRules.map((rule, index) => (
                  <div
                    key={`${index}-${selectedId}`}
                    className="flex items-start gap-2"
                  >
                    <span className="mt-2 text-xs text-gray-500 dark:text-gray-400 w-5 text-right">
                      {index + 1}.
                    </span>
                    <textarea
                      value={rule}
                      onChange={(e) => handleRuleChange(index, e.target.value)}
                      disabled={isPreset}
                      rows={2}
                      className={`flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 disabled:opacity-60 ${focusRingInputClasses}`}
                      placeholder={t("rulesetEditor.rulePlaceholder", {
                        index: index + 1,
                      })}
                    />
                    {!isPreset && (
                      <button
                        type="button"
                        onClick={() => handleRuleRemove(index)}
                        disabled={draftRules.length <= 1}
                        className={`self-center inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60 ${focusRingClasses}`}
                        aria-label={
                          draftRules.length <= 1
                            ? `${t("rulesetEditor.removeRule", {
                                index: index + 1,
                              })} - ${t("rulesetEditor.removeRuleDisabled")}`
                            : t("rulesetEditor.removeRule", {
                                index: index + 1,
                              })
                        }
                        title={
                          draftRules.length <= 1
                            ? t("rulesetEditor.removeRuleDisabled")
                            : t("rulesetEditor.removeRuleTitle")
                        }
                      >
                        <FiX size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {t("rulesetEditor.tagsTitle")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {draftTags.length === 0 ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t("rulesetEditor.tagsEmpty")}
                  </span>
                ) : (
                  draftTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-gray-800 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                    >
                      <span>{tag}</span>
                      {!isPreset && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className={`rounded-full border border-transparent px-1 text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white ${focusRingClasses}`}
                          aria-label={t("rulesetEditor.removeTag", { tag })}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))
                )}
              </div>

              {!isPreset && (
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={handleTagSubmit}
                >
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className={`min-w-40 flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 ${focusRingInputClasses}`}
                    placeholder={t("rulesetEditor.tagPlaceholder")}
                  />
                  <button
                    type="submit"
                    className={`inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-700 ${focusRingClasses}`}
                  >
                    <FiPlus /> {t("rulesetEditor.addTag")}
                  </button>
                </form>
              )}

              {!isPreset && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
                    {t("rulesetEditor.presetTagsLabel")}
                  </span>
                  {PREDEFINED_RULESET_TAGS.map((tag) => {
                    const isActive = draftTags.some(
                      (entry) => entry.toLowerCase() === tag.toLowerCase(),
                    );
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleAddTag(tag)}
                        disabled={isActive}
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${isActive ? "border-green-500 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-100" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-gray-500"} disabled:opacity-60 ${focusRingClasses}`}
                      >
                        <FiTag size={12} />
                        {tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(error || message) && (
                <div className="flex-1 min-w-60">
                  {error && (
                    <div className="rounded-md border border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30 px-3 py-2 text-sm text-red-700 dark:text-red-200">
                      {error}
                    </div>
                  )}
                  {!error && message && (
                    <div className="rounded-md border border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/30 px-3 py-2 text-sm text-green-700 dark:text-green-200">
                      {message}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3 ml-auto">
                {!isPreset &&
                  selectedRuleset &&
                  selectedRuleset.id !== "new" && (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOpen(true)}
                      disabled={deleting}
                      className={`inline-flex items-center gap-2 rounded-md border border-red-300 bg-white dark:bg-gray-800 dark:border-red-700 px-4 py-2 text-sm font-semibold text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-60 ${focusRingRedClasses}`}
                    >
                      <FiTrash2 />{" "}
                      {deleting
                        ? t("rulesetEditor.deleting")
                        : t("rulesetEditor.delete")}
                    </button>
                  )}
                {!isPreset && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={`inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60 ${focusRingClasses}`}
                  >
                    <FiSave />
                    {saving
                      ? t("rulesetEditor.saving")
                      : t("rulesetEditor.save")}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {confirmDeleteOpen && selectedRuleset && !selectedRuleset.isPreset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3">
          <div
            ref={confirmModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={confirmModalTitleId}
            tabIndex={-1}
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                id={confirmModalTitleId}
                className="text-lg font-semibold text-gray-900 dark:text-gray-100"
              >
                {t("rulesetEditor.deleteConfirmTitle")}
              </h2>
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className={`text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-md ${focusRingClasses}`}
                aria-label={t("common.close")}
              >
                <FiX size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t("rulesetEditor.deleteConfirmBody", {
                name: selectedRuleset.name || t("rulesetEditor.name"),
              })}
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className={`inline-flex items-center gap-2 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 ${focusRingClasses}`}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={deleting}
                className={`inline-flex items-center gap-2 rounded-md border border-red-300 bg-white dark:bg-gray-800 dark:border-red-700 px-3 py-2 text-sm font-semibold text-red-700 dark:text-red-200 hover:bg-red-50 dark:hover:bg-red-900/30 disabled:opacity-60 ${focusRingRedClasses}`}
              >
                <FiTrash2 />
                {deleting
                  ? t("rulesetEditor.deleting")
                  : t("rulesetEditor.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RulesetEditorPage;
