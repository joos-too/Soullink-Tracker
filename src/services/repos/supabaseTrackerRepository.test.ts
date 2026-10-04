import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  subscribeToSupabaseTrackerState,
  TrackerStateConflictError,
  updateSupabaseTrackerState,
} from "./supabaseTrackerRepository.ts";
import { createInitialState } from "@/src/services/init.ts";

const realtime = vi.hoisted(() => {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  return {
    channel,
    client: {
      rpc: vi.fn(),
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(async () => "ok"),
    },
  };
});

describe("tracker state save errors", () => {
  beforeEach(() => {
    realtime.client.rpc.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it.each([
    { code: "PT409", message: "state_revision_conflict" },
    { code: "PT409", message: "Conflict" },
    { code: "40001", message: "state_revision_conflict" },
  ])("recognizes revision conflicts: $code / $message", async (error) => {
    realtime.client.rpc.mockReturnValue({
      abortSignal: vi.fn().mockResolvedValue({ data: null, error }),
    });

    await expect(
      updateSupabaseTrackerState("tracker-id", 8, createInitialState()),
    ).rejects.toBeInstanceOf(TrackerStateConflictError);
    expect(realtime.client.rpc).toHaveBeenCalledTimes(1);
  });

  it("does not classify a real serialization failure as a revision conflict", async () => {
    const error = {
      code: "40001",
      message: "could not serialize access due to concurrent update",
    };
    realtime.client.rpc.mockReturnValue({
      abortSignal: vi.fn().mockResolvedValue({ data: null, error }),
    });

    const result = updateSupabaseTrackerState(
      "tracker-id",
      8,
      createInitialState(),
    );
    await expect(result).rejects.toMatchObject(error);
    await expect(result).rejects.not.toBeInstanceOf(TrackerStateConflictError);
  });

  it("aborts a save that never responds", async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    realtime.client.rpc.mockReturnValue({
      abortSignal: (value: AbortSignal) => {
        signal = value;
        return new Promise(() => {});
      },
    });

    const result = updateSupabaseTrackerState(
      "tracker-id",
      8,
      createInitialState(),
    );
    const rejection = expect(result).rejects.toThrow(
      "Tracker request timed out.",
    );
    await vi.advanceTimersByTimeAsync(15_000);
    await rejection;
    expect(signal?.aborted).toBe(true);
  });
});

vi.mock("@/src/services/backend/supabase.ts", () => ({
  getSupabaseClient: () => realtime.client,
}));

describe("tracker realtime connection status", () => {
  beforeEach(() => {
    realtime.channel.on.mockClear();
    realtime.channel.subscribe.mockClear();
    realtime.client.channel.mockClear();
    realtime.client.removeChannel.mockClear();
  });

  it("maps subscribed and failure channel states", () => {
    const onStatus = vi.fn();
    subscribeToSupabaseTrackerState(
      "30000000-0000-0000-0000-000000000001",
      vi.fn(),
      vi.fn(),
      onStatus,
    );
    const statusCallback = realtime.channel.subscribe.mock.calls[0][0];
    const channelError = new Error("socket failed");

    statusCallback("SUBSCRIBED");
    statusCallback("CHANNEL_ERROR", channelError);
    statusCallback("TIMED_OUT");

    expect(onStatus).toHaveBeenNthCalledWith(1, "subscribed");
    expect(onStatus).toHaveBeenNthCalledWith(2, "disconnected", channelError);
    expect(onStatus).toHaveBeenNthCalledWith(3, "disconnected", undefined);
  });

  it("does not report the close caused by intentional cleanup", () => {
    const onStatus = vi.fn();
    const unsubscribe = subscribeToSupabaseTrackerState(
      "30000000-0000-0000-0000-000000000001",
      vi.fn(),
      vi.fn(),
      onStatus,
    );
    const statusCallback = realtime.channel.subscribe.mock.calls[0][0];

    unsubscribe();
    statusCallback("CLOSED");

    expect(onStatus).not.toHaveBeenCalled();
    expect(realtime.client.removeChannel).toHaveBeenCalledWith(
      realtime.channel,
    );
  });
});
