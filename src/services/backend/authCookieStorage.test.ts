import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthCookieStorage } from "./authCookieStorage.ts";

const key = "sb-test-auth-token";

describe("authentication cookie storage", () => {
  beforeEach(() => {
    for (const cookie of document.cookie.split(";")) {
      document.cookie = `${cookie.split("=")[0].trim()}=; Path=/; Max-Age=0`;
    }
    window.localStorage.clear();
  });

  it("defaults to session cookies and survives page reloads without Web Storage", () => {
    const writes = vi.spyOn(document, "cookie", "set");
    const storage = createAuthCookieStorage(key);
    storage.setItem(key, "session");
    expect(writes).toHaveBeenCalledWith(
      `${key}.0=session; Path=/; SameSite=Lax`,
    );
    expect(createAuthCookieStorage(key).getItem(key)).toBe("session");
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("keeps persistent cookies through refreshes and downgrades to session cookies", () => {
    const storage = createAuthCookieStorage(key);
    const writes = vi.spyOn(document, "cookie", "set");
    storage.setStaySignedIn(true);
    storage.setItem(key, "initial");
    const reloaded = createAuthCookieStorage(key);
    reloaded.setItem(key, "refreshed");
    expect(writes).toHaveBeenCalledWith(
      `${key}.0=refreshed; Path=/; SameSite=Lax; Max-Age=7776000`,
    );
    reloaded.setStaySignedIn(false);
    expect(writes).toHaveBeenLastCalledWith(
      `${key}.0=refreshed; Path=/; SameSite=Lax`,
    );
  });

  it("round-trips large Unicode sessions, removes stale chunks and clears on logout", () => {
    const storage = createAuthCookieStorage(key);
    storage.setStaySignedIn(true);
    const session = JSON.stringify({
      token: "a".repeat(6000),
      name: "Pokémon 🐱",
    });
    storage.setItem(key, session);
    expect(storage.getItem(key)).toBe(session);
    expect(document.cookie).toContain(`${key}.2=`);
    storage.setItem(key, "short");
    expect(document.cookie).not.toContain(`${key}.1=`);
    storage.removeItem(key);
    expect(storage.getItem(key)).toBeNull();
    expect(document.cookie).not.toContain(`${key}-remember`);
  });

  it("migrates legacy credentials to session cookies and deletes durable copies", () => {
    window.localStorage.setItem(key, "legacy-session");
    window.localStorage.setItem(`${key}-code-verifier`, "verifier");
    window.localStorage.setItem("unrelated-preference", "keep");
    const writes = vi.spyOn(document, "cookie", "set");
    const storage = createAuthCookieStorage(key);
    expect(storage.getItem(key)).toBe("legacy-session");
    expect(storage.getItem(`${key}-code-verifier`)).toBe("verifier");
    expect(window.localStorage.getItem(key)).toBeNull();
    expect(window.localStorage.getItem(`${key}-code-verifier`)).toBeNull();
    expect(window.localStorage.getItem("unrelated-preference")).toBe("keep");
    expect(
      writes.mock.calls.every(([cookie]) => !cookie.includes("Max-Age")),
    ).toBe(true);
  });

  it.each([false, true])(
    "clears all auth cookies on logout (persistent: %s)",
    (persistent) => {
      const storage = createAuthCookieStorage(key);
      storage.setStaySignedIn(persistent);
      storage.setItem(key, "a".repeat(6500));
      storage.setItem(`${key}-code-verifier`, "verifier");
      storage.setItem(`${key}-user`, "user");
      document.cookie = "unrelated-preference=keep; Path=/";

      storage.clear();
      storage.clear();

      expect(document.cookie).toBe("unrelated-preference=keep");
    },
  );

  it("works with blocked Web Storage and rejects incomplete chunks", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Blocked");
    });
    const storage = createAuthCookieStorage(key);
    storage.setItem(key, "session");
    expect(storage.getItem(key)).toBe("session");
    document.cookie = `${key}.0=; Path=/; Max-Age=0`;
    document.cookie = `${key}.1=partial; Path=/`;
    expect(storage.getItem(key)).toBeNull();
  });

  it("reports blocked cookies instead of silently losing authentication", () => {
    vi.spyOn(document, "cookie", "set").mockImplementation(() => {});
    const storage = createAuthCookieStorage(key);
    expect(() => storage.setItem(key, "session")).toThrow(
      "Authentication cookies could not be stored.",
    );
  });
});
