import type { Ruleset } from "@/types";
import { PRESET_RULESETS } from "@/src/data/rulesets";
import { sanitizeRules, sanitizeTags } from "@/src/services/init.ts";
import { getSupabaseClient } from "@/src/services/backend/supabase.ts";
import type { Database } from "@/src/types/database.ts";

const generateRulesetId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

type SupabaseRulesetRow = Database["public"]["Tables"]["rulesets"]["Row"];

const toTimestamp = (value: string): number | undefined => {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
};

const normalizeSupabaseRuleset = (row: SupabaseRulesetRow): Ruleset => ({
  id: row.id,
  name: row.name,
  description: row.description,
  rules: sanitizeRules(row.rules),
  tags: sanitizeTags(row.tags),
  isPreset: false,
  createdBy: row.owner_id,
  createdAt: toTimestamp(row.created_at),
  updatedAt: toTimestamp(row.updated_at),
});

export interface SaveRulesetPayload {
  id?: string;
  name: string;
  description?: string;
  rules: string[];
  tags?: string[];
}

export const listenToUserRulesets = (
  userId: string,
  callback: (rulesets: Ruleset[]) => void,
): (() => void) => {
  const supabase = getSupabaseClient();
  let active = true;
  const load = async () => {
    const { data, error } = await supabase
      .from("rulesets")
      .select()
      .eq("owner_id", userId)
      .order("updated_at", { ascending: false });
    if (!active) return;
    callback(error || !data ? [] : data.map(normalizeSupabaseRuleset));
  };

  void load();
  const channel = supabase
    .channel(`rulesets:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "rulesets",
        filter: `owner_id=eq.${userId}`,
      },
      () => void load(),
    )
    .subscribe();

  return () => {
    active = false;
    void supabase.removeChannel(channel);
  };
};

export const saveRuleset = async (
  userId: string,
  payload: SaveRulesetPayload,
): Promise<Ruleset> => {
  const rules = sanitizeRules(payload.rules);
  const tags = sanitizeTags(payload.tags);
  const rulesetId = payload.id || generateRulesetId();

  const { data, error } = await getSupabaseClient()
    .from("rulesets")
    .upsert(
      {
        owner_id: userId,
        id: rulesetId,
        name: payload.name.trim() || "Neues Regelset",
        description: payload.description?.trim() || "",
        rules: rules.length > 0 ? rules : PRESET_RULESETS[0]?.rules || [],
        tags,
      },
      { onConflict: "owner_id,id" },
    )
    .select()
    .single();
  if (error) throw error;
  return normalizeSupabaseRuleset(data);
};

export const deleteRuleset = async (
  userId: string,
  rulesetId: string,
): Promise<void> => {
  const { error } = await getSupabaseClient()
    .from("rulesets")
    .delete()
    .eq("owner_id", userId)
    .eq("id", rulesetId);
  if (error) throw error;
};
