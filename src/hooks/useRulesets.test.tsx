import { act, renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PRESET_RULESETS } from "@/src/data/rulesets";
import { listenToUserRulesets } from "@/src/services/rulesets";
import { useRulesets } from "./useRulesets";

vi.mock("@/src/services/rulesets", () => ({
  listenToUserRulesets: vi.fn(),
}));

it("keeps presets available and replaces custom rulesets on account changes", () => {
  const unsubscribeFirst = vi.fn();
  const unsubscribeSecond = vi.fn();
  const listen = vi.mocked(listenToUserRulesets);
  listen
    .mockReturnValueOnce(unsubscribeFirst)
    .mockReturnValueOnce(unsubscribeSecond);
  const { result, rerender, unmount } = renderHook(
    ({ userId }: { userId?: string }) => useRulesets(userId),
    { initialProps: { userId: undefined } },
  );
  expect(result.current).toEqual(PRESET_RULESETS);
  expect(listen).not.toHaveBeenCalled();

  rerender({ userId: "account-one" });
  const older = {
    ...PRESET_RULESETS[0],
    id: "older",
    isPreset: false,
    updatedAt: 1,
  };
  const newer = { ...older, id: "newer", updatedAt: 2 };
  const custom = [older, newer];
  expect(listen.mock.calls[0][0]).toBe("account-one");
  act(() => listen.mock.calls[0][1](custom));
  expect(result.current).toEqual([newer, older, ...PRESET_RULESETS]);
  expect(custom).toEqual([older, newer]);

  rerender({ userId: "account-two" });
  expect(unsubscribeFirst).toHaveBeenCalledOnce();
  expect(listen.mock.calls[1][0]).toBe("account-two");
  act(() => listen.mock.calls[1][1]([]));
  expect(result.current).toEqual(PRESET_RULESETS);
  unmount();
  expect(unsubscribeSecond).toHaveBeenCalledOnce();
});
