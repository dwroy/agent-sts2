/** Exercise the real task renderer, preflights, lease, environment and summary around a fixed TUI transport. */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const transport = vi.hoisted(() => vi.fn());
vi.mock("../../learner/lib/herdr.js", () => ({ runLearnerTui: transport }));
import { main } from "../../learner/lib/launcher.js";
import { readQueue } from "../../ops/codex/lib.js";

const roots: string[] = [];
afterEach(() => { transport.mockReset(); for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), "tui-launcher-")); roots.push(root);
  const state = join(root, "ops/codex-ops/learn.json");
  mkdirSync(join(root, "ops/codex-ops"), { recursive: true });
  const tasksDir = join(root, "tasks"); mkdirSync(tasksDir);
  writeFileSync(join(tasksDir, "fixed.md"), "---\ntitle: fixed\ntools: Read, Grep\ntimeout_min: 7\n---\n原始任务：阅读固定证据并保存报告。\n");
  const batch = "20261022-120000";
  writeFileSync(state, JSON.stringify({ batches: { [batch]: { state: "running", pid: process.pid, worktree: root } } }));
  const receipt = join(root, "ops/codex-ops/fixed.tui.json");
  const env = { HOME: root, LEARNER_CODEX_HOME: join(root, "codex-home"), LEARNER_CODEX_BIN: "/bin/true",
    LEARNER_HERDR_PANE: "w1:p2", LEARNER_HERDR_LABEL: "learner-20261022-120000-postmortem", LEARNER_TUI_RECEIPT: receipt,
    LEARNER_BATCH_ID: batch, LEARNER_STATE_FILE: state, OPENAI_API_KEY: "fixed-secret-must-never-reach-transport" };
  const out: string[] = [], err: string[] = [];
  const checkCodex = vi.fn(async () => ({ ok: true as const, version: "fixture" }));
  const checkKeys = vi.fn(async () => ({ ok: true as const, checked: 0 }));
  const deps = { projectRoot: root, tasksDir, runsDir: join(root, "runs"), secretFiles: [], env, checkCodex, checkKeys,
    refreshCodexAuth: undefined, out: (s: string) => out.push(s), err: (s: string) => err.push(s) };
  transport.mockImplementation(async (o) => {
    const result = { code: 0, reason: "native-task-complete", message: '{"status":"done"}', session: "019a1000-1234-7123-8123-123456789abc",
      turn: "fixed-turn", stopped: true, usage: { input_tokens: 200, cached_input_tokens: 50, output_tokens: 40 } };
    writeFileSync(o.receipt, JSON.stringify({ state: "session-ended", result }));
    o.log({ type: "event_msg", payload: { type: "task_complete", turn_id: result.turn, last_agent_message: result.message } });
    return result;
  });
  const run = () => main(["--engine", "codex", "--task", "fixed", "--cwd", root, "--model", "gpt-6.1-sol", "--effort", "high"], deps);
  return { root, deps, run, receipt, out, state };
}

describe("hosted learner launcher", () => {
  it("preserves rendered task, key prechecks, original account/lease and persisted summary", async () => {
    const f = fixture(); expect(await f.run()).toBe(0);
    expect(f.deps.checkCodex).toHaveBeenCalledOnce(); expect(f.deps.checkKeys).toHaveBeenCalledOnce();
    const o = transport.mock.calls[0]![0];
    expect(o.prompt).toContain("原始任务：阅读固定证据并保存报告。");
    expect(o.prompt).toContain("【启动器说明（codex）】");
    expect(o.env.OPENAI_API_KEY).toBeUndefined(); expect(o.env.CODEX_HOME).toBe(f.deps.env.LEARNER_CODEX_HOME);
    expect(o.lease.batch).toBe("20261022-120000"); expect(o.timeoutMs).toBe(7 * 60_000);
    expect(o.request).toMatchObject({ model: "gpt-6.1-sol", effort: "high", cwd: f.root });
    expect(f.out.join("")).toContain('{"status":"done"}');
    const rows = readFileSync(join(f.root, "runs", readdirSync(join(f.root, "runs")).find((n) => n.endsWith(".jsonl"))!), "utf8").trim().split("\n").map((s) => JSON.parse(s));
    expect(rows[0]).toMatchObject({ type: "learner_launch", transport: "herdr-interactive" });
    expect(rows[0].command).not.toContain("exec");
    expect(rows.at(-1)).toMatchObject({ type: "learner_summary", exit_code: 0, summary: { sessionId: o.request.resumeThread ?? "019a1000-1234-7123-8123-123456789abc", tokens: { input: 150, cacheRead: 50, output: 40 } } });
    expect(JSON.parse(readFileSync(f.receipt, "utf8")).artifacts).toMatchObject({ summary: true, out_pending_wrapper_flush: true });
  });
  it("rejects a failed key check before starting any TUI", async () => {
    const f = fixture(); f.deps.checkKeys.mockResolvedValue({ ok: false, readable: [], error: "fixture" } as never);
    expect(await f.run()).toBe(3); expect(transport).not.toHaveBeenCalled();
    expect(JSON.parse(readFileSync(f.receipt, "utf8"))).toMatchObject({ state: "not-started", models_started: 0, result: { code: 3 } });
  });
  it("refuses a missing original batch lease without starting a TUI", async () => {
    const f = fixture(); writeFileSync(f.state, '{"batches":{}}');
    expect(await f.run()).toBe(3); expect(transport).not.toHaveBeenCalled();
  });
  it("does not turn an unverified retirement into success", async () => {
    const f = fixture();
    transport.mockImplementation(async (o) => {
      const result = { code: 75, reason: "retirement-unverified", message: "", stopped: false };
      writeFileSync(o.receipt, JSON.stringify({ state: "needs-attention", result })); return result;
    });
    expect(await f.run()).toBe(75);
    expect(f.out.join("")).toContain("retirement-unverified");
    expect(JSON.parse(readFileSync(f.receipt, "utf8")).state).toBe("needs-attention");
  });
  it("queues attention with the existing reader's alphabetic event-kind grammar", async () => {
    const f = fixture();
    transport.mockImplementation(async (o) => {
      o.attention("fixed ownership failure");
      const result = { code: 75, reason: "retirement-unverified", message: "", stopped: false };
      writeFileSync(o.receipt, JSON.stringify({ state: "needs-attention", result })); return result;
    });
    expect(await f.run()).toBe(75);
    const directory = join(f.root, "ops/codex-ops/queue");
    writeFileSync(join(directory, "123-1aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa-learner-tui-attention.md"), "old unparseable fixture");
    const events = readQueue(directory);
    expect(events).toHaveLength(1);
    expect(events[0]!.kind).toMatch(/^learner-tui-attention-/);
    expect(events[0]!.text).toContain("fixed ownership failure");
    expect(events[0]!.text).toContain("20261022-120000");
  });
});
