import { createHash } from "node:crypto";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
};

export const canonicalJson = (value: unknown): string =>
  JSON.stringify(canonicalize(value));

export const sha256 = (value: string | Buffer): string =>
  createHash("sha256").update(value).digest("hex");

export const canonicalHash = (value: unknown): string =>
  sha256(canonicalJson(value));

const uuidToBytes = (uuid: string): Buffer =>
  Buffer.from(uuid.replaceAll("-", ""), "hex");

const bytesToUuid = (bytes: Buffer): string => {
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
};

export const uuidV5 = (name: string, namespace: string): string => {
  const hash = createHash("sha1")
    .update(uuidToBytes(namespace))
    .update(Buffer.from(name, "utf8"))
    .digest()
    .subarray(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  return bytesToUuid(hash);
};

export const DNS_UUID_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
export const TRACKER_UUID_NAMESPACE = uuidV5(
  "soullink-tracker.janlieder.de/firebase-tracker",
  DNS_UUID_NAMESPACE,
);

export const firebaseTrackerIdToUuid = (firebaseTrackerId: string): string =>
  uuidV5(firebaseTrackerId, TRACKER_UUID_NAMESPACE);
