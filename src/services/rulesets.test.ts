import { expect, it, vi } from "vitest";
import { listenToUserRulesets } from "./rulesets";

const backend = vi.hoisted(() => ({
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
}));
vi.mock("@/src/services/backend/supabase", () => ({
  getSupabaseClient: () => backend,
}));

it("maps custom rulesets and ignores a pending read after removing its channel", async () => {
  const row = {
    id: "custom",
    owner_id: "owner",
    name: "Custom rules",
    description: "Notes",
    rules: ["  One encounter  ", ""],
    tags: ["  Duo  "],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  };
  const result = { data: [row], error: null };
  let finishRefresh!: (value: typeof result) => void;
  const refresh = new Promise<typeof result>((resolve) => {
    finishRefresh = resolve;
  });
  const order = vi
    .fn()
    .mockResolvedValueOnce(result)
    .mockReturnValueOnce(refresh);
  const eq = vi.fn(() => ({ order }));
  backend.from.mockReturnValue({ select: () => ({ eq }) });
  const channel = { on: vi.fn(), subscribe: vi.fn() };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  backend.channel.mockReturnValue(channel);
  const onRulesets = vi.fn();

  const unsubscribe = listenToUserRulesets("owner", onRulesets);
  await vi.waitFor(() => expect(onRulesets).toHaveBeenCalledOnce());
  expect(eq).toHaveBeenCalledWith("owner_id", "owner");
  expect(onRulesets).toHaveBeenCalledWith([
    {
      id: "custom",
      createdBy: "owner",
      name: "Custom rules",
      description: "Notes",
      rules: ["One encounter"],
      tags: ["Duo"],
      isPreset: false,
      createdAt: Date.parse(row.created_at),
      updatedAt: Date.parse(row.updated_at),
    },
  ]);

  const [, filter, onChange] = channel.on.mock.calls[0];
  expect(filter).toMatchObject({
    table: "rulesets",
    filter: "owner_id=eq.owner",
  });
  onChange();
  expect(order).toHaveBeenCalledTimes(2);
  unsubscribe();
  finishRefresh(result);
  await refresh;
  expect(backend.removeChannel).toHaveBeenCalledWith(channel);
  expect(onRulesets).toHaveBeenCalledOnce();
});
