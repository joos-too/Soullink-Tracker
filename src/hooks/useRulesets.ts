import { useEffect, useState } from "react";
import type { Ruleset } from "@/types";
import { PRESET_RULESETS } from "@/src/data/rulesets";
import { listenToUserRulesets } from "@/src/services/rulesets";

export const useRulesets = (userId?: string): Ruleset[] => {
  const [rulesets, setRulesets] = useState<Ruleset[]>(PRESET_RULESETS);

  useEffect(() => {
    setRulesets(PRESET_RULESETS);
    if (!userId) return;

    return listenToUserRulesets(userId, (customRulesets) => {
      const sortedCustom = [...customRulesets].sort(
        (a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0),
      );
      setRulesets([...sortedCustom, ...PRESET_RULESETS]);
    });
  }, [userId]);

  return rulesets;
};
