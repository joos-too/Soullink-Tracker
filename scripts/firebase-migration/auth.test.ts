import { describe, expect, it } from "vitest";
import {
  firebasePasswordHash,
  parseFirebaseAuthExport,
  parseScryptConfig,
  validateAuthMap,
} from "./auth.ts";

const exported = {
  users: [
    {
      localId: "firebase-uid",
      email: " Test@Example.com ",
      emailVerified: false,
      passwordHash: "aGFzaA==",
      salt: "c2FsdA==",
    },
  ],
};

describe("Firebase Auth migration", () => {
  it("normalizes exports and builds the Supabase Firebase Scrypt hash", () => {
    const [user] = parseFirebaseAuthExport(exported);
    const config = parseScryptConfig({
      FIREBASE_SCRYPT_SIGNER_KEY: "a2V5",
      FIREBASE_SCRYPT_SALT_SEPARATOR: "c2Vw",
      FIREBASE_SCRYPT_ROUNDS: "8",
      FIREBASE_SCRYPT_MEM_COST: "14",
    });
    expect(user.email).toBe("test@example.com");
    expect(firebasePasswordHash(user, config)).toBe(
      "$fbscrypt$v=1,n=14,r=8,p=1,ss=c2Vw,sk=a2V5$c2FsdA==$aGFzaA==",
    );
  });

  it("accepts a matching UUIDv4 map", () => {
    const users = parseFirebaseAuthExport(exported);
    expect(
      validateAuthMap(users, {
        users: [
          {
            firebaseUid: "firebase-uid",
            supabaseUserId: "4bd87eb2-e1ee-4a2e-a509-7b2af4d84a52",
            email: "test@example.com",
          },
        ],
      }),
    ).toHaveLength(1);
  });

  it("rejects duplicate normalized emails", () => {
    expect(() =>
      parseFirebaseAuthExport({
        users: [
          exported.users[0],
          { ...exported.users[0], localId: "other", email: "test@example.com" },
        ],
      }),
    ).toThrow("Duplicate normalized email");
  });
});
