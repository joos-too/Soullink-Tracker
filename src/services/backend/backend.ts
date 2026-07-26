export type BackendKind = "firebase" | "supabase";

const configuredBackend = import.meta.env.VITE_BACKEND?.trim().toLowerCase();

if (
  configuredBackend !== undefined &&
  configuredBackend !== "" &&
  configuredBackend !== "firebase" &&
  configuredBackend !== "supabase"
) {
  throw new Error(
    "VITE_BACKEND must be either 'firebase' or 'supabase' when it is set.",
  );
}

/**
 * The active persistence backend. Firebase remains the default until the
 * tracker and ruleset repositories have been migrated as well.
 */
export const BACKEND: BackendKind =
  configuredBackend === "supabase" ? "supabase" : "firebase";

export const isSupabaseBackend = BACKEND === "supabase";
