import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/src/services/backend/auth.ts";
import { useAuthSession } from "@/src/hooks/useAuthSession.ts";

const authMock = vi.hoisted(() => ({
  callback: undefined as ((user: AuthenticatedUser | null) => void) | undefined,
  unsubscribe: vi.fn(),
}));

vi.mock("@/src/services/backend/auth.ts", () => ({
  onCurrentAuthStateChange: (
    callback: (user: AuthenticatedUser | null) => void,
  ) => {
    authMock.callback = callback;
    return authMock.unsubscribe;
  },
}));

describe("useAuthSession", () => {
  beforeEach(() => {
    authMock.callback = undefined;
    authMock.unsubscribe.mockClear();
  });

  it("starts in a loading state and exposes the restored user", () => {
    const { result } = renderHook(() => useAuthSession());

    expect(result.current).toEqual({ user: null, loading: true });

    const user = {
      uid: "10000000-0000-0000-0000-000000000001",
      email: "test@example.com",
    } satisfies AuthenticatedUser;

    act(() => authMock.callback?.(user));

    expect(result.current).toEqual({ user, loading: false });
  });

  it("unsubscribes from auth changes when unmounted", () => {
    const { unmount } = renderHook(() => useAuthSession());

    unmount();

    expect(authMock.unsubscribe).toHaveBeenCalledOnce();
  });
});
