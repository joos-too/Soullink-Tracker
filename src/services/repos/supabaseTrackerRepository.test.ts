import { beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeToSupabaseTrackerState } from "./supabaseTrackerRepository.ts";

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
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(async () => "ok"),
    },
  };
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
