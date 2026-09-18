import { describe, expect, it } from "vitest";
import { createLinkId, isLinkId } from "./linkIds.ts";

describe("link IDs", () => {
  it("creates unique UUIDs", () => {
    const first = createLinkId();
    const second = createLinkId();

    expect(isLinkId(first)).toBe(true);
    expect(isLinkId(second)).toBe(true);
    expect(second).not.toBe(first);
  });

  it("rejects legacy numeric and malformed IDs", () => {
    expect(isLinkId(123)).toBe(false);
    expect(isLinkId("123")).toBe(false);
  });
});
