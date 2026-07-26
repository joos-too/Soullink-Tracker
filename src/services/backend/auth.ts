import {
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth as firebaseAuth } from "@/src/firebaseConfig.ts";
import { BACKEND } from "@/src/services/backend/backend.ts";
import { getSupabaseClient } from "@/src/services/backend/supabase.ts";
import { updateUserDisplayName } from "@/src/services/repos/profileRepository.ts";

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
}

export type AuthErrorCode =
  | "email-already-in-use"
  | "invalid-email"
  | "same-password"
  | "weak-password"
  | "unknown";

export const passwordResetRequiresCode = BACKEND === "firebase";

const normalizeEmail = (email?: string | null): string =>
  email?.trim().toLowerCase() ?? "";

const toAuthenticatedUser = (
  user: {
    id?: string;
    uid?: string;
    email?: string | null;
  } | null,
): AuthenticatedUser | null => {
  if (!user) return null;
  const uid = user.uid ?? user.id;
  return uid ? { uid, email: user.email ?? null } : null;
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
  if (BACKEND === "firebase") {
    return onAuthStateChanged(firebaseAuth, (user) => {
      callback(toAuthenticatedUser(user));
    });
  }

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
  if (BACKEND === "firebase") {
    await signInWithEmailAndPassword(firebaseAuth, email, password);
    return;
  }

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
): Promise<SignUpResult> => {
  if (BACKEND === "firebase") {
    const credential = await createUserWithEmailAndPassword(
      firebaseAuth,
      email,
      password,
    );
    await updateUserDisplayName(credential.user.uid, displayName);
    return { confirmationRequired: false };
  }

  const { data, error } = await getSupabaseClient().auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      data: { display_name: displayName },
    },
  });
  if (error) throw error;

  const confirmationRequired =
    !!data.user && !data.session && data.user.identities?.length !== 0;
  return { confirmationRequired };
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
  if (BACKEND === "firebase") {
    await signOut(firebaseAuth);
    return;
  }

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

  if (BACKEND === "firebase") {
    await sendPasswordResetEmail(firebaseAuth, email);
    return;
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
  recoveryCode: string | null,
): Promise<string> => {
  if (BACKEND === "firebase") {
    if (!recoveryCode) throw new Error("missing_recovery_code");
    return verifyPasswordResetCode(firebaseAuth, recoveryCode);
  }

  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user.email) throw error ?? new Error("invalid_recovery");
  return data.user.email;
};

export const completePasswordReset = async (
  recoveryCode: string | null,
  password: string,
): Promise<void> => {
  if (BACKEND === "firebase") {
    if (!recoveryCode) throw new Error("missing_recovery_code");
    await confirmPasswordReset(firebaseAuth, recoveryCode, password);
    return;
  }

  const { error } = await getSupabaseClient().auth.updateUser({ password });
  if (error) throw error;
};
