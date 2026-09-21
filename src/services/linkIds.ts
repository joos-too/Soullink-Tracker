import type { LinkId } from "@/types.ts";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isLinkId = (value: unknown): value is LinkId =>
  typeof value === "string" && UUID_PATTERN.test(value);

export const createLinkId = (): LinkId => crypto.randomUUID();
