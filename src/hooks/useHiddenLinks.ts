import { useCallback, useEffect, useState } from "react";
import type { LinkId } from "@/types.ts";
import { isLinkId } from "@/src/services/linkIds.ts";

function storageKey(trackerId: string | null | undefined): string | null {
  return trackerId ? `soullink:hiddenLinks:${trackerId}` : null;
}

export function useHiddenLinks(trackerId: string | null | undefined) {
  const [hiddenLinkIds, setHiddenLinkIds] = useState<Set<LinkId>>(new Set());

  useEffect(() => {
    const key = storageKey(trackerId);
    if (!key) {
      setHiddenLinkIds(new Set());
      return;
    }
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        setHiddenLinkIds(
          new Set(Array.isArray(parsed) ? parsed.filter(isLinkId) : []),
        );
      } else {
        setHiddenLinkIds(new Set());
      }
    } catch {
      setHiddenLinkIds(new Set());
    }
  }, [trackerId]);

  const persist = useCallback(
    (next: Set<LinkId>) => {
      const key = storageKey(trackerId);
      if (!key) return;
      try {
        localStorage.setItem(key, JSON.stringify([...next]));
      } catch {
        /* quota exceeded – ignore */
      }
    },
    [trackerId],
  );

  const toggleHiddenLink = useCallback(
    (id: LinkId) => {
      setHiddenLinkIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const resetAllHiddenLinks = useCallback(() => {
    setHiddenLinkIds(new Set());
    persist(new Set());
  }, [persist]);

  return { hiddenLinkIds, toggleHiddenLink, resetAllHiddenLinks };
}
