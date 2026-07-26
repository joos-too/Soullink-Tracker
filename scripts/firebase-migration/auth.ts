import { randomUUID } from "node:crypto";
import type { AuthMapEntry } from "./types.ts";

export interface FirebaseAuthUser {
  localId: string;
  email: string;
  emailVerified: boolean;
  passwordHash: string;
  salt: string;
  disabled?: boolean;
}

export interface FirebaseScryptConfig {
  signerKey: string;
  saltSeparator: string;
  rounds: number;
  memCost: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const requiredString = (
  value: unknown,
  field: string,
  index: number,
): string => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Firebase Auth user ${index} has no valid ${field}.`);
  }
  return value;
};

const assertBase64 = (value: string, field: string) => {
  if (
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      value,
    )
  ) {
    throw new Error(`${field} is not valid padded base64.`);
  }
};

export const parseFirebaseAuthExport = (input: unknown): FirebaseAuthUser[] => {
  if (!isRecord(input) || !Array.isArray(input.users)) {
    throw new Error(
      'Firebase Auth export must have the shape { "users": [...] }.',
    );
  }

  const seenUids = new Set<string>();
  const seenEmails = new Set<string>();
  return input.users.map((value, index) => {
    if (!isRecord(value)) {
      throw new Error(`Firebase Auth user ${index} is not an object.`);
    }
    const localId = requiredString(value.localId, "localId", index);
    const email = requiredString(value.email, "email", index)
      .trim()
      .toLowerCase();
    const passwordHash = requiredString(
      value.passwordHash,
      "passwordHash",
      index,
    );
    const salt = requiredString(value.salt, "salt", index);
    assertBase64(passwordHash, `users[${index}].passwordHash`);
    assertBase64(salt, `users[${index}].salt`);
    if (seenUids.has(localId)) {
      throw new Error(`Duplicate Firebase UID: ${localId}`);
    }
    if (seenEmails.has(email)) {
      throw new Error(`Duplicate normalized email: ${email}`);
    }
    seenUids.add(localId);
    seenEmails.add(email);
    return {
      localId,
      email,
      emailVerified: value.emailVerified === true,
      passwordHash,
      salt,
      disabled: value.disabled === true,
    };
  });
};

export const parseScryptConfig = (
  environment: NodeJS.ProcessEnv,
): FirebaseScryptConfig => {
  const signerKey = environment.FIREBASE_SCRYPT_SIGNER_KEY;
  const saltSeparator = environment.FIREBASE_SCRYPT_SALT_SEPARATOR;
  const rounds = Number(environment.FIREBASE_SCRYPT_ROUNDS);
  const memCost = Number(environment.FIREBASE_SCRYPT_MEM_COST);
  if (!signerKey || saltSeparator === undefined) {
    throw new Error(
      "Set FIREBASE_SCRYPT_SIGNER_KEY and FIREBASE_SCRYPT_SALT_SEPARATOR.",
    );
  }
  if (!Number.isInteger(rounds) || rounds <= 0) {
    throw new Error("FIREBASE_SCRYPT_ROUNDS must be a positive integer.");
  }
  if (!Number.isInteger(memCost) || memCost <= 0 || memCost > 31) {
    throw new Error(
      "FIREBASE_SCRYPT_MEM_COST must be an integer from 1 to 31.",
    );
  }
  assertBase64(signerKey, "FIREBASE_SCRYPT_SIGNER_KEY");
  if (saltSeparator !== "") {
    assertBase64(saltSeparator, "FIREBASE_SCRYPT_SALT_SEPARATOR");
  }
  return { signerKey, saltSeparator, rounds, memCost };
};

export const firebasePasswordHash = (
  user: FirebaseAuthUser,
  config: FirebaseScryptConfig,
): string =>
  `$fbscrypt$v=1,n=${config.memCost},r=${config.rounds},p=1,ss=${config.saltSeparator},sk=${config.signerKey}$${user.salt}$${user.passwordHash}`;

export const createAuthMap = (users: FirebaseAuthUser[]): AuthMapEntry[] =>
  users.map((user) => ({
    firebaseUid: user.localId,
    supabaseUserId: randomUUID(),
    email: user.email,
  }));

export const validateAuthMap = (
  users: FirebaseAuthUser[],
  input: unknown,
): AuthMapEntry[] => {
  if (!isRecord(input) || !Array.isArray(input.users)) {
    throw new Error('Auth map must have the shape { "users": [...] }.');
  }
  const entries = input.users.map((value, index) => {
    if (!isRecord(value)) {
      throw new Error(`Auth map user ${index} is not an object.`);
    }
    const firebaseUid = requiredString(value.firebaseUid, "firebaseUid", index);
    const supabaseUserId = requiredString(
      value.supabaseUserId,
      "supabaseUserId",
      index,
    );
    const email = requiredString(value.email, "email", index)
      .trim()
      .toLowerCase();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        supabaseUserId,
      )
    ) {
      throw new Error(`Auth map user ${index} does not contain a UUIDv4.`);
    }
    return { firebaseUid, supabaseUserId, email };
  });
  if (entries.length !== users.length) {
    throw new Error(
      "Auth map and Firebase Auth export have different user counts.",
    );
  }
  const byUid = new Map(entries.map((entry) => [entry.firebaseUid, entry]));
  for (const user of users) {
    const entry = byUid.get(user.localId);
    if (!entry || entry.email !== user.email) {
      throw new Error(`Auth map does not match Firebase user ${user.localId}.`);
    }
  }
  return entries;
};
