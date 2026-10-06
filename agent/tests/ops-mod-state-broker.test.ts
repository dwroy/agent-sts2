import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spawn = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", async (original) => ({
  ...await original<typeof import("node:child_process")>(), spawn,
}));

import { runAction } from "../../ops/codex/main.js";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  spawn.mockReset();
  vi.clearAllTimers();
  vi.useRealTimers();
});

async function response(chunks: Buffer[], action = "mod-state", code = 0) {
  const child = Object.assign(new EventEmitter(), {
    stdout: new PassThrough(), stderr: new PassThrough(), pid: 123, kill: vi.fn(),
  });
  spawn.mockReturnValueOnce(child);
  const pending = runAction("/unused-fixed-project", action, [], 5000);
  for (const chunk of chunks) child.stdout.write(chunk);
  child.stdout.end();
  child.stderr.end();
  child.emit("close", code, null);
  return pending;
}

describe("mod-state broker output", () => {
  it("keeps complete states above 20000 characters when they fit the broker limit", async () => {
    const state = { ok: true, data: { screen: "COMBAT", text: "x".repeat(25_000) } };
    const result = await response([Buffer.from(JSON.stringify(state))]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out)).toEqual(state);
  });

  it("preserves a Chinese character split across stdout chunks", async () => {
    const state = { ok: true, data: { screen: "CARD_SELECTION", text: "状态" } };
    const bytes = Buffer.from(JSON.stringify(state));
    const split = bytes.indexOf(Buffer.from("状")) + 1;
    const result = await response([bytes.subarray(0, split), bytes.subarray(split)]);
    expect(result.code).toBe(0);
    expect(JSON.parse(result.out)).toEqual(state);
  });

  it.each(["single chunk", "exact-limit prefix"])("returns a JSON error for an oversized state: %s", async (boundary) => {
    const bytes = Buffer.from(JSON.stringify({ ok: true, data: { screen: "COMBAT", text: "x".repeat(70_000) } }));
    const chunks = boundary === "single chunk" ? [bytes] : [bytes.subarray(0, 64 * 1024), bytes.subarray(64 * 1024)];
    const result = await response(chunks);
    expect(result.code).toBe(1);
    expect(JSON.parse(result.out)).toMatchObject({ ok: false, error: { code: "broker_output_limit" } });
    expect(result.out).not.toContain("xxxx");
  });

  it("retains the child error code for a small failed state request", async () => {
    expect(await response([Buffer.from("invalid mod state response\n")], "mod-state", 1))
      .toEqual({ code: 1, out: "invalid mod state response\n" });
  });

  it("keeps the existing display limit for other actions", async () => {
    const result = await response([Buffer.from("x".repeat(70_000))], "procs");
    expect(result.code).toBe(0);
    expect(result.out).toBe(`${"x".repeat(64 * 1024)}\n（输出截断）\n`);
  });
});
