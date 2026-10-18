import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  onCurrentAuthStateChange,
  signIn,
  signOutCurrentUser,
  signUp,
  verifyEmailOtp,
  synchronizeCurrentUserLanguage,
} from "./auth.ts";

const authMocks = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  signUp: vi.fn(),
  updateUser: vi.fn(),
  signInWithPassword: vi.fn(),
  verifyOtp: vi.fn(),
  setAuthPersistence: vi.fn(),
  clearAuthCookies: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/src/services/backend/supabase.ts", () => ({
  getSupabaseClient: () => ({ auth: authMocks }),
  setAuthPersistence: authMocks.setAuthPersistence,
  clearAuthCookies: authMocks.clearAuthCookies,
}));

describe("auth language metadata", () => {
  beforeEach(() => {
    authMocks.onAuthStateChange.mockReset();
    authMocks.signUp.mockReset();
    authMocks.updateUser.mockReset();
    authMocks.setAuthPersistence.mockReset();
    authMocks.clearAuthCookies.mockReset();
    authMocks.signOut.mockReset();
  });

  it.each(["local", "global"] as const)(
    "clears cookies after %s logout",
    async (scope) => {
      authMocks.signOut.mockResolvedValue({ error: null });
      await signOutCurrentUser(scope);
      expect(authMocks.signOut).toHaveBeenCalledWith({ scope });
      expect(authMocks.clearAuthCookies).toHaveBeenCalledOnce();
    },
  );

  it.each([false, true])(
    "clears cookies when logout fails (throws: %s)",
    async (throws) => {
      const error = new Error("Server unavailable");
      if (throws) authMocks.signOut.mockRejectedValue(error);
      else authMocks.signOut.mockResolvedValue({ error });
      await expect(signOutCurrentUser()).rejects.toThrow(error);
      expect(authMocks.clearAuthCookies).toHaveBeenCalledOnce();
    },
  );

  it("stores display name and language during signup", async () => {
    authMocks.signUp.mockResolvedValue({
      data: { user: { identities: [] }, session: null },
      error: null,
    });

    await signUp("Trainer@Example.com", "password123", "Trainer", "en");

    expect(authMocks.signUp).toHaveBeenCalledWith({
      email: "trainer@example.com",
      password: "password123",
      options: {
        data: { display_name: "Trainer", language: "en" },
      },
    });
    expect(authMocks.setAuthPersistence).toHaveBeenCalledWith(false);
  });

  it.each([false, true])(
    "uses the persistence choice %s for login and confirmation",
    async (staySignedIn) => {
      authMocks.signInWithPassword.mockResolvedValue({ error: null });
      authMocks.verifyOtp.mockResolvedValue({ error: null });
      await signIn("Trainer@Example.com", "password123", staySignedIn);
      expect(authMocks.setAuthPersistence).toHaveBeenLastCalledWith(
        staySignedIn,
      );
      await verifyEmailOtp("Trainer@Example.com", "123456", staySignedIn);
      expect(authMocks.setAuthPersistence).toHaveBeenLastCalledWith(
        staySignedIn,
      );
      expect(authMocks.verifyOtp).toHaveBeenCalledWith({
        email: "trainer@example.com",
        token: "123456",
        type: "signup",
      });
    },
  );

  it.each([
    ["de", "de"],
    ["en", "en"],
    ["fr", null],
    [undefined, null],
  ] as const)("maps metadata language %s to %s", (metadata, expected) => {
    let authStateCallback:
      | ((event: string, session: unknown) => void)
      | undefined;
    authMocks.onAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    const listener = vi.fn();
    onCurrentAuthStateChange(listener);

    authStateCallback?.("SIGNED_IN", {
      user: {
        id: "10000000-0000-4000-8000-000000000001",
        email: "trainer@example.com",
        user_metadata: { language: metadata },
      },
    });

    expect(listener).toHaveBeenCalledWith({
      uid: "10000000-0000-4000-8000-000000000001",
      email: "trainer@example.com",
      language: expected,
    });
  });

  it("updates mismatched language metadata and skips matching values", async () => {
    authMocks.updateUser.mockResolvedValue({ error: null });

    await synchronizeCurrentUserLanguage("de", "en");
    expect(authMocks.updateUser).toHaveBeenCalledWith({
      data: { language: "en" },
    });

    authMocks.updateUser.mockClear();
    await synchronizeCurrentUserLanguage("en", "en");
    expect(authMocks.updateUser).not.toHaveBeenCalled();
  });
});
