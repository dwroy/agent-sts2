import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BrainRouter } from "../src/brain/router.js";
import { pickSpec } from "../src/brain/specs.js";
import { CodexEngine } from "../src/brain/engines/codex.js";
import { fileBrainWait } from "../src/brain/wait.js";
import { loadConfig } from "../src/core/config.js";
import { createDecisionLog, createStateLog } from "../src/eye/decision-log.js";

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
const request = { runId: "WG8GK5B9D7YH", questionId: "fixed", label: "reward/card", system: "固定题面", question: "固定问题", options: { a: "固定选项" }, payload: {},
  spec: pickSpec("reward/card", { a: "固定选项" }, {}) };
const ts = "2026-10-13T03:00:00.000Z";
const writers = [
  { name: "brain", rows: 1, write: async (path: string) => {
    // This fixed engine only returns data; it never starts Codex or makes a network call.
    const router = new BrainRouter({ config: loadConfig({ BRAIN_LOG: path }).brain, codexOnly: true,
      engine: () => ({ name: "codex", model: "fixture", decide: async () => ({ engine: "codex", model: "fixture", answer: { choice: "a" },
        problems: [], attempts: 1, latencyMs: 1, usage: { inputTokens: 1, outputTokens: 1 }, toolCalls: [] }) }) });
    await router.decide(request);
  } },
  { name: "codex-calls", rows: 1, write: (path: string) => {
    const engine = new CodexEngine({ codex: loadConfig({}).brain.codex, traceFile: path,
      readUsage: async () => { throw new Error("usage must not be read by a trace writer"); } });
    (engine as unknown as { writeTrace(row: object): void }).writeTrace({ ts, question_id: "fixed", run_id: request.runId });
  } },
  { name: "decisions", rows: 1, write: (path: string) => {
    createDecisionLog(path).write({ ts, mode: "fixture", screen: "REWARD", session: "fixed", floor: 9, turn: null,
      label: "reward/card", decision_id: "fixed", fingerprint: "{}", rationale: "固定记录", confidence: null, result: "fixture" });
  } },
  { name: "states", rows: 1, write: (path: string) => {
    createStateLog(path).write({ ts, fingerprint: "{}", screen: "REWARD", session: "fixed", state: { fixture: true } });
  } },
  { name: "brain-wait", rows: 2, write: (path: string) => {
    const wait = fileBrainWait(dirname(path), join(dirname(path), "ops"), { now: () => Date.parse(ts) });
    try { wait.pause(request, "fixed fault"); } finally { wait.finish("resumed"); }
  } },
];
const tails = [
  { name: "truncated JSON", bytes: Buffer.from('{"ts":"old","answer":"interrupted') },
  { name: "complete JSON without newline", bytes: Buffer.from('{"old":true}') },
  { name: "split UTF-8", bytes: Buffer.concat([Buffer.from('{"old":"'), Buffer.from("旧").subarray(0, 2)]) },
  { name: "large interrupted record", bytes: Buffer.from('{"old":"' + "x".repeat(1 << 20)) },
];

describe.each(writers)("$name JSONL append boundaries", (writer) => {
  it.each(tails)("preserves $name bytes and starts independently parseable fresh records", async (tail) => {
    const dir = mkdtempSync(join(tmpdir(), "jsonl-boundary-")); dirs.push(dir);
    const path = join(dir, `${writer.name}.jsonl`);
    writeFileSync(path, tail.bytes);
    await writer.write(path);
    const raw = readFileSync(path);
    expect(raw.subarray(0, tail.bytes.length).equals(tail.bytes)).toBe(true);
    expect(raw[tail.bytes.length]).toBe(10);
    const rows = raw.subarray(tail.bytes.length + 1).toString("utf8").trimEnd().split("\n").map((line) => JSON.parse(line));
    expect(rows).toHaveLength(writer.rows);
    const audit = readFileSync(`${path}.recovery.jsonl`, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    expect(audit).toHaveLength(1);
    const sample = tail.bytes.subarray(Math.max(0, tail.bytes.length - 4096));
    expect(audit[0]).toEqual({ type: "jsonl_unterminated_tail", source: `${writer.name}.jsonl`, boundary_offset: tail.bytes.length,
      next_record_offset: tail.bytes.length + 1, tail_bytes: sample.length, tail_sha256: createHash("sha256").update(sample).digest("hex") });
  });

  it("keeps normal newline-terminated history and fresh record schemas unchanged", async () => {
    const dir = mkdtempSync(join(tmpdir(), "jsonl-normal-")); dirs.push(dir);
    const path = join(dir, `${writer.name}.jsonl`);
    const old = '{"old":true}\n'; writeFileSync(path, old);
    await writer.write(path);
    const raw = readFileSync(path, "utf8");
    expect(raw.startsWith(old)).toBe(true);
    const rows = raw.trimEnd().split("\n").map((line) => JSON.parse(line));
    expect(rows[0]).toEqual({ old: true });
    expect(rows).toHaveLength(1 + writer.rows);
    expect(existsSync(`${path}.recovery.jsonl`)).toBe(false);
  });
});
