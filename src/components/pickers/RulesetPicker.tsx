import React, { useEffect, useMemo, useState } from "react";
import type { Ruleset } from "@/src/types/domain.ts";
import {
  focusRingCardClasses,
  focusRingClasses,
} from "@/src/styles/focusRing.ts";
import { FiLock, FiTag, FiUser } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { PREDEFINED_RULESET_TAGS } from "@/src/data/rulesets.ts";
import { sanitizeTags } from "@/src/services/init.ts";

interface RulesetPickerProps {
  value: string;
  rulesets: Ruleset[];
  onSelect: (rulesetId: string) => void;
  isInteractive?: boolean;
  enableTagFilter?: boolean;
  defaultTagFilter?: string;
  defaultTagFilterGroup?: string[];
  fullHeight?: boolean;
  listMaxHeightClass?: string;
}

const RulesetPicker: React.FC<RulesetPickerProps> = ({
  value,
  rulesets,
  onSelect,
  isInteractive = true,
  enableTagFilter = false,
  defaultTagFilter,
  defaultTagFilterGroup,
  fullHeight = false,
  listMaxHeightClass = "max-h-64",
}) => {
  const { t } = useTranslation();
  const [tagFilters, setTagFilters] = useState<string[]>([]);

  useEffect(() => {
    if (!enableTagFilter) return;
    const cleanedDefaultTag = defaultTagFilter?.trim();
    if (!cleanedDefaultTag) return;
    const normalizedGroup = (
      defaultTagFilterGroup && defaultTagFilterGroup.length > 0
        ? defaultTagFilterGroup
        : [cleanedDefaultTag]
    ).map((tag) => tag.toLowerCase());
    setTagFilters((current) => {
      const preserved = current.filter(
        (value) => !normalizedGroup.includes(value.toLowerCase()),
      );
      const next = [...preserved, cleanedDefaultTag];
      const deduped: string[] = [];
      const seen = new Set<string>();
      next.forEach((tag) => {
        const key = tag.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(tag);
      });
      if (
        deduped.length === current.length &&
        deduped.every(
          (tag, index) => tag.toLowerCase() === current[index].toLowerCase(),
        )
      ) {
        return current;
      }
      return deduped;
    });
  }, [defaultTagFilter, defaultTagFilterGroup, enableTagFilter]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    PREDEFINED_RULESET_TAGS.forEach((tag) => tagSet.add(tag));
    rulesets.forEach((ruleset) => {
      sanitizeTags(ruleset.tags).forEach((tag) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [rulesets]);

  const normalizedTagFilters = useMemo(
    () => tagFilters.map((tag) => tag.toLowerCase()),
    [tagFilters],
  );

  const visibleRulesets = useMemo(() => {
    if (!enableTagFilter || normalizedTagFilters.length === 0) return rulesets;
    return rulesets.filter((ruleset) =>
      normalizedTagFilters.every((filterTag) =>
        sanitizeTags(ruleset.tags)
          .map((tag) => tag.toLowerCase())
          .includes(filterTag),
      ),
    );
  }, [rulesets, normalizedTagFilters, enableTagFilter]);

  const toggleTagFilter = (tag: string) => {
    setTagFilters((current) => {
      const normalizedTag = tag.toLowerCase();
      const hasTag = current.some(
        (value) => value.toLowerCase() === normalizedTag,
      );
      if (hasTag) {
        return current.filter((value) => value.toLowerCase() !== normalizedTag);
      }
      return [...current, tag];
    });
  };

  if (!rulesets.length) {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-300 px-1 py-2">
        {t("rulesets.empty")}
      </div>
    );
  }

  return (
    <div
      className={`space-y-3 ${fullHeight ? "flex h-full flex-col" : ""} py-1 px-1`}
    >
      {enableTagFilter && availableTags.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
            {t("rulesets.tagFilterLabel")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTagFilters([])}
              aria-pressed={tagFilters.length === 0}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tagFilters.length === 0 ? "border-green-500 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-100" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-gray-500"} ${focusRingClasses}`}
            >
              {t("rulesets.tagFilterAll")}
            </button>
            {availableTags.map((tag) => {
              const active = normalizedTagFilters.includes(tag.toLowerCase());
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTagFilter(tag)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-green-500 bg-green-50 text-green-700 dark:border-green-600 dark:bg-green-900/30 dark:text-green-100" : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:border-gray-500"} ${focusRingClasses}`}
                  title={t("rulesets.tagFilterSelect", { tag })}
                >
                  <FiTag size={12} />
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        tabIndex={-1}
        className={`space-y-2 pl-1 pr-2 sm:pr-1 py-1 custom-scrollbar overscroll-contain focus-visible:outline-none ${fullHeight ? "flex-1 min-h-0 overflow-y-auto" : `${listMaxHeightClass} overflow-y-auto`}`}
      >
        {visibleRulesets.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-300 px-1 py-2">
            {t("rulesets.filteredEmpty")}
          </div>
        ) : (
          visibleRulesets.map((ruleset) => {
            const selected = ruleset.id === value;
            const badgeIcon = ruleset.isPreset ? (
              <FiLock size={12} />
            ) : (
              <FiUser size={12} />
            );
            const badgeLabel = ruleset.isPreset
              ? t("rulesets.presetTag")
              : t("rulesets.customTag");
            const tags = sanitizeTags(ruleset.tags);
            return (
              <button
                key={ruleset.id}
                type="button"
                onClick={() => onSelect(ruleset.id)}
                disabled={!isInteractive}
                className={`w-full text-left rounded-md border px-3 py-2 transition ${selected ? "border-green-500 bg-green-50 dark:border-green-500/80 dark:bg-green-900/20 shadow-sm" : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"} disabled:opacity-60 disabled:cursor-not-allowed ${focusRingCardClasses}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        {ruleset.name}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${ruleset.isPreset ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-100" : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"}`}
                        title={badgeLabel}
                      >
                        <span className="sr-only">{badgeLabel}</span>
                        {badgeIcon}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      {ruleset.description || t("rulesets.noDescription")}
                    </p>
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <span
                            key={`${ruleset.id}-${tag}`}
                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-100"
                          >
                            <FiTag size={12} />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-600 dark:text-gray-300 whitespace-nowrap">
                    {t("rulesets.ruleCount", { count: ruleset.rules.length })}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RulesetPicker;
