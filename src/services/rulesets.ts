import { get, onValue, ref, remove, set } from "firebase/database";
import { db } from "@/src/firebaseConfig";
import type { Ruleset } from "@/types";
import { PRESET_RULESETS } from "@/src/data/rulesets";
import { BACKEND } from "@/src/services/backend/backend.ts";
import { sanitizeRules, sanitizeTags } from "@/src/services/init.ts";
import { getSupabaseClient } from "@/src/services/backend/supabase.ts";
import type { Database } from "@/src/types/database.ts";

const generateRulesetId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const normalizeRuleset = (id: string, value: any): Ruleset => ({
  id,
  name: typeof value?.name === "string" ? value.name : "Regelset",
  description:
    typeof value?.description === "string" ? value.description : undefined,
  rules: sanitizeRules(value?.rules),
  tags: sanitizeTags(value?.tags),
  isPreset: Boolean(value?.isPreset),
  createdBy: typeof value?.createdBy === "string" ? value.createdBy : undefined,
  createdAt: typeof value?.createdAt === "number" ? value.createdAt : undefined,
  updatedAt: typeof value?.updatedAt === "number" ? value.updatedAt : undefined,
});

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
  if (BACKEND === "supabase") {
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
  }

  const rulesetRef = ref(db, `rulesets/${userId}`);
  return onValue(
    rulesetRef,
    (snapshot) => {
      const value = snapshot.val();
      const rulesets: Ruleset[] = value
        ? Object.entries(value).map(([id, entry]) =>
            normalizeRuleset(id, entry),
          )
        : [];
      callback(rulesets);
    },
    () => callback([]),
  );
};

export const saveRuleset = async (
  userId: string,
  payload: SaveRulesetPayload,
): Promise<Ruleset> => {
  const rules = sanitizeRules(payload.rules);
  const tags = sanitizeTags(payload.tags);
  const now = Date.now();
  const rulesetId = payload.id || generateRulesetId();

  if (BACKEND === "supabase") {
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
  }

  let createdAt = now;
  if (payload.id) {
    const existingSnap = await get(ref(db, `rulesets/${userId}/${rulesetId}`));
    const existingCreatedAt = existingSnap.child("createdAt").val();
    if (typeof existingCreatedAt === "number") {
      createdAt = existingCreatedAt;
    }
  }

  const record: Ruleset = {
    id: rulesetId,
    name: payload.name.trim() || "Neues Regelset",
    description: payload.description?.trim() || "",
    rules: rules.length > 0 ? rules : PRESET_RULESETS[0]?.rules || [],
    tags,
    createdBy: userId,
    isPreset: false,
    createdAt,
    updatedAt: now,
  };

  await set(ref(db, `rulesets/${userId}/${rulesetId}`), record);
  return record;
};

export const deleteRuleset = async (
  userId: string,
  rulesetId: string,
): Promise<void> => {
  if (BACKEND === "supabase") {
    const { error } = await getSupabaseClient()
      .from("rulesets")
      .delete()
      .eq("owner_id", userId)
      .eq("id", rulesetId);
    if (error) throw error;
    return;
  }

  await remove(ref(db, `rulesets/${userId}/${rulesetId}`));
};
