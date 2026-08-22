import { getSupabaseClient } from "@/src/services/backend/supabase.ts";
import type { SupportedLanguage } from "@/src/utils/language.ts";

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  language: SupportedLanguage | null;
}

export type AuthErrorCode =
  | "email-already-in-use"
  | "invalid-email"
  | "same-password"
  | "weak-password"
  | "unknown";

export const passwordResetRequiresCode = false;

const normalizeEmail = (email?: string | null): string =>
  email?.trim().toLowerCase() ?? "";

const getUserLanguage = (metadata: unknown): SupportedLanguage | null => {
  if (typeof metadata !== "object" || metadata === null) return null;
  const language = (metadata as { language?: unknown }).language;
  return language === "de" || language === "en" ? language : null;
};

const toAuthenticatedUser = (
  user: {
    id?: string;
    email?: string | null;
    user_metadata?: unknown;
  } | null,
): AuthenticatedUser | null => {
  if (!user) return null;
  return user.id
    ? {
        uid: user.id,
        email: user.email ?? null,
        language: getUserLanguage(user.user_metadata),
      }
    : null;
};

const getRecoveryRedirectUrl = (): string =>
  new URL("/reset", window.location.origin).toString();

export const getAuthErrorCode = (error: unknown): AuthErrorCode => {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "unknown";
  }

  switch (String(error.code)) {
    case "auth/email-already-in-use":
    case "email_exists":
    case "user_already_exists":
      return "email-already-in-use";
    case "auth/invalid-email":
    case "invalid_email":
      return "invalid-email";
    case "auth/weak-password":
    case "weak_password":
      return "weak-password";
    case "same_password":
      return "same-password";
    default:
      return "message" in error &&
        String(error.message).includes(
          "New password should be different from the old password",
        )
        ? "same-password"
        : "unknown";
  }
};

export const onCurrentAuthStateChange = (
  callback: (user: AuthenticatedUser | null) => void,
): (() => void) => {
  const supabase = getSupabaseClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(toAuthenticatedUser(session?.user ?? null));
  });
  return () => data.subscription.unsubscribe();
};

export const signIn = async (
  email: string,
  password: string,
): Promise<void> => {
  const { error } = await getSupabaseClient().auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });
  if (error) throw error;
};

export interface SignUpResult {
  confirmationRequired: boolean;
}

export const signUp = async (
  email: string,
  password: string,
  displayName: string,
  language: SupportedLanguage,
): Promise<SignUpResult> => {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      data: { display_name: displayName, language },
    },
  });
  if (error) throw error;

  const confirmationRequired =
    !!data.user && !data.session && data.user.identities?.length !== 0;
  return { confirmationRequired };
};

export const synchronizeCurrentUserLanguage = async (
  currentLanguage: SupportedLanguage | null,
  language: SupportedLanguage,
): Promise<void> => {
  if (currentLanguage === language) return;
  const { error } = await getSupabaseClient().auth.updateUser({
    data: { language },
  });
  if (error) throw error;
};

export const verifyEmailOtp = async (
  email: string,
  token: string,
): Promise<void> => {
  const { error } = await getSupabaseClient().auth.verifyOtp({
    email: normalizeEmail(email),
    token,
    type: "signup",
  });
  if (error) throw error;
};

export const signOutCurrentUser = async (): Promise<void> => {
  const { error } = await getSupabaseClient().auth.signOut();
  if (error) throw error;
};

export const requestPasswordReset = async (
  rawEmail?: string | null,
): Promise<void> => {
  const email = normalizeEmail(rawEmail);
  if (!email) {
    throw new Error("Dein Account besitzt keine gültige Email-Adresse.");
  }

  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
    email,
    {
      redirectTo: getRecoveryRedirectUrl(),
    },
  );
  if (error) throw error;
};

export const verifyPasswordReset = async (
  _recoveryCode: string | null,
): Promise<string> => {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user.email) throw error ?? new Error("invalid_recovery");
  return data.user.email;
};

export const completePasswordReset = async (
  _recoveryCode: string | null,
  password: string,
): Promise<void> => {
  const { error } = await getSupabaseClient().auth.updateUser({ password });
  if (error) throw error;
};
