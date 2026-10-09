import { appendFileSync, closeSync, mkdtempSync, openSync, rmSync, truncateSync, writeFileSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { readRolloutMetadata } from "../../ops/codex/rollout-file.js";
import { sessionGrowth } from "../../ops/codex/lib.js";

const dir = mkdtempSync(join(tmpdir(), "rollout-bounded-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const started = JSON.stringify({ type: "event_msg", payload: { type: "task_started", turn_id: "turn" } });
const complete = JSON.stringify({ type: "event_msg", payload: { type: "task_complete", turn_id: "turn" } });
const tokens = JSON.stringify({ type: "event_msg", payload: { type: "token_count", info: {
  last_token_usage: { input_tokens: 1234 }, model_context_window: 258400 }, rate_limits: {
  primary: { used_percent: 42, window_minutes: 10080 }, secondary: { used_percent: 12, window_minutes: 300 } } } });

describe("bounded TUI rollout metadata", () => {
  it("tracks append-only partial lines and resets after truncation", () => {
    const path = join(dir, "partial.jsonl");
    writeFileSync(path, started + "\n" + tokens.slice(0, 30));
    expect(readRolloutMetadata(path).openTurn).toBe("turn");
    appendFileSync(path, tokens.slice(30) + "\n" + complete + "\n");
    const read = readRolloutMetadata(path);
    expect(read.openTurn).toBeUndefined();
    expect(read.growth).toEqual(sessionGrowth(started + "\n" + tokens + "\n" + complete + "\n"));
    expect(readRolloutMetadata(path)).toEqual(read);
    truncateSync(path, 0);
    writeFileSync(path, started + "\n");
    expect(readRolloutMetadata(path).growth.turns).toBe(1);
    expect(readRolloutMetadata(path).openTurn).toBe("turn");
  });

  it("reads beyond Node's maximum string size without truncating or altering the session", () => {
    const path = join(dir, "large.jsonl");
    writeFileSync(path, started + "\n");
    const fd = openSync(path, "r+");
    const tail = Buffer.from("\n" + complete + "\n" + tokens + "\n");
    writeSync(fd, tail, 0, tail.length, 0x21000000);
    closeSync(fd);
    const read = readRolloutMetadata(path);
    expect(read.growth.bytes).toBe(0x21000000 + tail.length);
    expect(read.growth.contextTokens).toBe(1234);
    expect(read.growth.weeklyUsedPercent).toBe(42);
    expect(read.openTurn).toBeUndefined();
    appendFileSync(path, started + "\n");
    expect(readRolloutMetadata(path).openTurn).toBe("turn");
    expect(readRolloutMetadata(path).growth.turns).toBe(2);
  });
});
