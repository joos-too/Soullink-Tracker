import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import type { Ruleset } from "@/types";
import {
  saveRuleset,
  deleteRuleset,
  type SaveRulesetPayload,
} from "@/src/services/rulesets";
import { DEFAULT_RULESET_ID } from "@/src/data/rulesets";
import RulesetEditorPage from "@/src/components/pages/RulesetEditorPage";
import { useAppSession } from "./AppSession";
export default function RulesetsRoute() {
  const { user, rulesets } = useAppSession();
  const navigate = useNavigate();
  const location = useLocation();
  const rulesetBackTarget =
    (location.state as { from?: string } | null)?.from || null;

  const handleRulesetBack = useCallback(() => {
    if (rulesetBackTarget) {
      navigate(rulesetBackTarget);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  }, [navigate, rulesetBackTarget]);

  const handleSaveRuleset = useCallback(
    async (payload: SaveRulesetPayload): Promise<Ruleset> => {
      if (!user) throw new Error("Du musst angemeldet sein.");
      return saveRuleset(user.uid, payload);
    },
    [user],
  );

  const handleDeleteRuleset = useCallback(
    async (rulesetId: string) => {
      if (!user) throw new Error("Du musst angemeldet sein.");
      await deleteRuleset(user.uid, rulesetId);
    },
    [user],
  );

  return (
    <RulesetEditorPage
      rulesets={rulesets}
      onBack={handleRulesetBack}
      onSave={handleSaveRuleset}
      onDelete={handleDeleteRuleset}
      defaultRulesetId={DEFAULT_RULESET_ID}
    />
  );
}
