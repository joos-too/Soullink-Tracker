import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  onCurrentAuthStateChange,
  signUp,
  synchronizeCurrentUserLanguage,
} from "./auth.ts";

const authMocks = vi.hoisted(() => ({
  onAuthStateChange: vi.fn(),
  signUp: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/src/services/backend/supabase.ts", () => ({
  getSupabaseClient: () => ({ auth: authMocks }),
}));

describe("auth language metadata", () => {
  beforeEach(() => {
    authMocks.onAuthStateChange.mockReset();
    authMocks.signUp.mockReset();
    authMocks.updateUser.mockReset();
  });

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
  });

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
