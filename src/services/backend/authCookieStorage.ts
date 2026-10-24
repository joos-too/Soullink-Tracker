const REMEMBER_MAX_AGE = 60 * 60 * 24 * 90;
const CHUNK_SIZE = 3000;

const readCookies = (): Map<string, string> =>
  new Map(
    document.cookie
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separator = cookie.indexOf("=");
        return [cookie.slice(0, separator), cookie.slice(separator + 1)];
      }),
  );

/** Shared across tabs; cookies without Max-Age expire with the browser session. */
export const createAuthCookieStorage = (storageKey: string) => {
  const preferenceKey = `${storageKey}-remember`;
  const authKeys = [
    storageKey,
    `${storageKey}-code-verifier`,
    `${storageKey}-user`,
  ];

  const writeCookie = (name: string, value: string, maxAge?: number) => {
    document.cookie = `${name}=${value}; Path=/; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}${maxAge === undefined ? "" : `; Max-Age=${maxAge}`}`;
  };

  const chunkNames = (key: string) =>
    [...readCookies().keys()].filter(
      (name) =>
        name.startsWith(`${key}.`) && /^\d+$/.test(name.slice(key.length + 1)),
    );

  const storage = {
    getItem(key: string): string | null {
      const cookies = readCookies();
      const names = chunkNames(key).sort(
        (left, right) =>
          Number(left.slice(key.length + 1)) -
          Number(right.slice(key.length + 1)),
      );
      if (!names.length) return null;
      if (names.some((name, index) => name !== `${key}.${index}`)) return null;
      try {
        return decodeURIComponent(
          names.map((name) => cookies.get(name)).join(""),
        );
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): void {
      const previousNames = new Set(chunkNames(key));
      const encoded = encodeURIComponent(value);
      const maxAge =
        readCookies().get(preferenceKey) === "true"
          ? REMEMBER_MAX_AGE
          : undefined;
      if (maxAge !== undefined) writeCookie(preferenceKey, "true", maxAge);
      // Supabase sessions can exceed the per-cookie size limit.
      for (
        let offset = 0, index = 0;
        offset < Math.max(encoded.length, 1);
        offset += CHUNK_SIZE, index++
      ) {
        const name = `${key}.${index}`;
        writeCookie(name, encoded.slice(offset, offset + CHUNK_SIZE), maxAge);
        previousNames.delete(name);
      }
      for (const name of previousNames) writeCookie(name, "", 0);
      if (storage.getItem(key) !== value) {
        storage.removeItem(key);
        throw new Error("Authentication cookies could not be stored.");
      }
    },
    removeItem(key: string): void {
      for (const name of chunkNames(key)) writeCookie(name, "", 0);
      if (key === storageKey) writeCookie(preferenceKey, "", 0);
    },
    clear(): void {
      for (const key of authKeys) storage.removeItem(key);
    },
    setStaySignedIn(staySignedIn: boolean): void {
      writeCookie(
        preferenceKey,
        staySignedIn ? "true" : "",
        staySignedIn ? REMEMBER_MAX_AGE : 0,
      );
      for (const key of authKeys) {
        const value = storage.getItem(key);
        if (value !== null) storage.setItem(key, value);
      }
    },
  };

  // Existing users did not opt in. Preserve their current session but remove
  // durable auth data from the former Supabase localStorage implementation.
  for (const key of authKeys) {
    let legacyValue: string | null;
    try {
      legacyValue = window.localStorage.getItem(key);
      window.localStorage.removeItem(key);
    } catch {
      // Cookie auth also works when Web Storage is unavailable.
      continue;
    }
    if (legacyValue !== null && storage.getItem(key) === null) {
      storage.setItem(key, legacyValue);
    }
  }

  return storage;
};
