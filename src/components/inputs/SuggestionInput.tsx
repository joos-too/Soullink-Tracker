import React, { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { focusRingInputClasses } from "@/src/styles/focusRing.ts";

interface SuggestionInputProps<TSuggestion = string> {
  id?: string;
  label?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  fetchSuggestions: (term: string) => Promise<TSuggestion[]>;
  isOpen: boolean;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  minSearchLength?: number;
  debounceMs?: number;
  inputClassName?: string;
  endAdornment?: React.ReactNode;
  getSuggestionValue?: (suggestion: TSuggestion) => string;
  getSuggestionKey?: (suggestion: TSuggestion, index: number) => React.Key;
  renderSuggestion?: (suggestion: TSuggestion) => React.ReactNode;
  onSelectSuggestion?: (suggestion: TSuggestion) => void;
}

const SuggestionInput = <TSuggestion,>({
  id,
  label,
  value,
  onChange,
  fetchSuggestions,
  isOpen,
  placeholder,
  disabled = false,
  required = true,
  minSearchLength = 2,
  debounceMs = 250,
  inputClassName = "",
  endAdornment,
  getSuggestionValue = (suggestion) => String(suggestion),
  getSuggestionKey,
  renderSuggestion,
  onSelectSuggestion,
}: SuggestionInputProps<TSuggestion>) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [suggestions, setSuggestions] = useState<TSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchSeq = useRef(0);
  const { t } = useTranslation();

  useEffect(() => {
    const seq = ++searchSeq.current;

    if (!isOpen || !focused || disabled) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    const term = value.trim();
    if (term.length < minSearchLength) {
      setSuggestions([]);
      setLoading(false);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    setOpen(true);

    const timer = window.setTimeout(async () => {
      const res = await fetchSuggestions(term);
      if (seq !== searchSeq.current) return;

      setSuggestions(res);
      setLoading(false);
      setOpen(true);
      setActiveIndex(res.length ? 0 : -1);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [
    debounceMs,
    disabled,
    fetchSuggestions,
    focused,
    isOpen,
    minSearchLength,
    value,
  ]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (!open || loading || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(
        (prev) => (prev - 1 + suggestions.length) % suggestions.length,
      );
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const suggestion = suggestions[activeIndex];
      onChange(getSuggestionValue(suggestion));
      onSelectSuggestion?.(suggestion);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div>
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1"
        >
          {label} {required ? <span className="text-red-500">*</span> : null}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() =>
            window.setTimeout(() => {
              setFocused(false);
              setOpen(false);
            }, 150)
          }
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${focusRingInputClasses} ${inputClassName}`}
          placeholder={placeholder}
          required={required}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        {endAdornment}
        {open ? (
          <div className="scrollbar-hidden absolute z-10 mt-1 w-full max-h-56 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                {t("modals.common.loadingSuggestions")}
              </div>
            ) : null}
            {!loading
              ? suggestions.map((suggestion, idx) => (
                  <div
                    key={
                      getSuggestionKey?.(suggestion, idx) ??
                      `${getSuggestionValue(suggestion)}-${idx}`
                    }
                    role="option"
                    aria-selected={idx === activeIndex}
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(getSuggestionValue(suggestion));
                      onSelectSuggestion?.(suggestion);
                      setOpen(false);
                    }}
                    className={`block w-full text-left px-3 py-2 text-sm text-gray-900 dark:text-gray-100 hover:bg-indigo-50 dark:hover:bg-gray-700 ${idx === activeIndex ? "bg-indigo-100 dark:bg-gray-700" : ""}`}
                  >
                    {renderSuggestion
                      ? renderSuggestion(suggestion)
                      : getSuggestionValue(suggestion)}
                  </div>
                ))
              : null}
            {!loading && suggestions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                {t("modals.common.noMatches")}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SuggestionInput;
