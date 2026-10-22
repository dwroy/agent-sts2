/** Fixed native records and a harmless sleep process; no real herdr, Codex, model or gameplay. */
import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { learnerInteractiveArgs } from "../../learner/lib/engines.js";
import { NativeBatch, NativeRows, learnerTuiEnv, runLearnerTui, type TuiOptions } from "../../learner/lib/herdr.js";
import type { HerdrResult } from "../../ops/codex/herdr.js";

const roots: string[] = [];
const children: ChildProcess[] = [];
afterEach(async () => {
  for (const child of children.splice(0)) if (child.exitCode === null && child.signalCode === null) { child.kill("SIGKILL"); await new Promise<void>((done) => child.once("close", () => done())); }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
const row = (type: string, payload: Record<string, unknown>) => ({ type, payload });
const ok = (result: Record<string, unknown> = {}, stdout = ""): HerdrResult => ({ ok: true, code: 0, result, stdout, stderr: "" });
const fail = (): HerdrResult => ({ ok: false, code: 1, error: "transport_uncertain", stdout: "", stderr: "" });

function fixture(kind = "success") {
  const root = mkdtempSync(join(tmpdir(), "learner-tui-")); roots.push(root);
  const home = join(root, "home");
  const date = new Date();
  const sessionDir = join(home, "sessions", String(date.getFullYear()), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0"));
  mkdirSync(sessionDir, { recursive: true });
  const file = join(sessionDir, "rollout-019a1000-1234-7123-8123-123456789abc.jsonl");
  const session = "019a1000-1234-7123-8123-123456789abc";
  const pane = { pane_id: "w1:p2", label: "learner-20261022-120000-postmortem", tab_id: "w1:t2", terminal_id: "terminal-2", cwd: root };
  let clock = Date.now();
  let child: ChildProcess | undefined;
  let live = false;
  let prompts = 0;
  let status = "idle";
  let afterPoll = 0;
  let changed = false;
  let leaseCurrent = true;
  let stopping = false;
  const calls: string[][] = [];
  const events: Record<string, unknown>[] = [];
  const notices: string[] = [];
  const write = (...rows: ReturnType<typeof row>[]) => appendFileSync(file, rows.map((r) => JSON.stringify(r) + "\n").join(""));
  const finish = (message = "已保存批次报告", turn = `turn-${prompts}`) => write(row("token_usage_record", { turn_id: turn, turn_token_usage: { input_tokens: 100, cached_input_tokens: 20, output_tokens: 10 } }), row("event_msg", { type: "task_complete", turn_id: turn, last_agent_message: message }));
  const opts: TuiOptions = {
    request: { engine: "codex", cwd: root, projectRoot: root, tools: ["Read", "Bash"], model: "gpt-6.1-sol", effort: "high", home, codexHome: home },
    command: "/fixed/codex-learner.sh", prompt: "原始完整任务\n输出固定报告", env: { HOME: home, CODEX_HOME: home, PATH: "/usr/bin:/bin" },
    pane: pane.pane_id, label: pane.label, scratch: root, receipt: join(root, "receipt.json"), codexHome: home,
    timeoutMs: 5000, pollMs: 1, now: () => clock, pause: async () => {
      clock += kind === "capacity" && !stopping ? 100_000 : 100;
      await new Promise((done) => setTimeout(done, 2));
      if (kind === "late-complete" && ++afterPoll === 3) finish();
    },
    lease: { batch: "20261022-120000", identity: "fixed", current: () => leaseCurrent },
    log: (event) => events.push(event), attention: (message) => notices.push(message),
    h: async (args) => {
      calls.push(args);
      const [group, action] = args;
      if (group === "pane" && action === "get") return ok({ pane: { ...pane, ...(changed ? { label: "foreign" } : {}) } });
      if (group === "pane" && action === "process-info") return ok({ process_info: { shell_pid: 1000, foreground_process_group_id: live ? child!.pid : 1000 } });
      if (group === "pane" && action === "run") {
        expect(readFileSync(join(root, "tui.sh"), "utf8")).toContain("exec env -i");
        child = spawn("sleep", ["600"]); children.push(child); live = true;
        child.once("close", () => { live = false; });
        writeFileSync(join(root, "tui.pid"), String(child.pid));
        write(row("session_meta", { id: session, cwd: root }));
        return kind === "start-uncertain" ? fail() : ok();
      }
      if (group === "pane" && action === "read") return ok({}, `header\n› \u001b[2mAsk Codex to do anything\u001b[0m\n${kind === "capacity" ? "at capacity" : ""}`);
      if (group === "agent" && action === "get") return live ? ok({ agent: { agent: "codex", name: pane.label, pane_id: pane.pane_id, agent_status: status } }) : fail();
      if (group === "agent" && action === "rename") return ok();
      if (group === "agent" && action === "prompt") {
        prompts++;
        const text = args[3]!;
        const turn = `turn-${prompts}`;
        write(row("event_msg", { type: "task_started", turn_id: turn }), row("event_msg", { type: "user_message", message: text }));
        if (kind === "capacity" || (kind === "retry-success" || kind === "stale-open-error") && prompts === 1) {
          write(row("event_msg", { type: "error", turn_id: turn, message: "at capacity" }));
          if (kind !== "stale-open-error") write(row("event_msg", { type: "task_complete", turn_id: turn }));
        } else if (kind === "late-complete" || kind === "timeout" || kind === "pane-changed") {
          if (kind === "pane-changed") changed = true;
        } else {
          finish();
          if (kind === "working-after-complete") status = "working";
          if (kind === "lease-lost") leaseCurrent = false;
        }
        return kind === "prompt-uncertain" ? fail() : ok();
      }
      if (group === "agent" && action === "send-keys") {
        stopping = true;
        if (args[3] === "ctrl+c" && child && live) child.kill("SIGTERM");
        return ok();
      }
      throw new Error(`unexpected fake call ${args.join(" ")}`);
    },
  };
  if (kind === "capacity") opts.timeoutMs = 3_000_000;
  if (kind === "retry-success" || kind === "stale-open-error") opts.retryMs = 100;
  return { opts, root, events, notices, calls, file, pane, prompts: () => prompts };
}

describe("integrator #36 ownership regressions", () => {
  it("does not accept a different human turn as the batch completion", () => {
    const b = new NativeBatch("original-batch-marker");
    b.feed(row("event_msg", {type:"task_started",turn_id:"batch-turn"}));
    b.feed(row("event_msg", {type:"user_message",message:"original-batch-marker"}));
    b.feed(row("event_msg", {type:"task_complete",turn_id:"batch-turn",last_agent_message:"batch result"}));
    b.feed(row("event_msg", {type:"task_started",turn_id:"human-turn"}));
    b.feed(row("event_msg", {type:"user_message",message:"An unrelated human task"}));
    b.feed(row("event_msg", {type:"task_complete",turn_id:"human-turn",last_agent_message:"human task result"}));
    expect(b.successful()).toBe(false);
  });
  it.each(["lease-lost", "start-uncertain"])("retains the TUI and supervision when ownership is %s", async (kind) => {
    const f = fixture(kind); const result = await runLearnerTui(f.opts);
    expect({code: result.code, stopped: result.stopped, sends: f.calls.filter(c => c[1] === "send-keys").length})
      .toEqual({code:75, stopped:false, sends:0});
  });
  it("does not retire a TUI with unsent human text on timeout", async () => {
    const f=fixture("timeout"); const h=f.opts.h!;
    f.opts.h=async args => args[0] === "pane" && args[1] === "read" ? ok({}, "header\n› Human draft not sent") : h(args);
    const result=await runLearnerTui(f.opts);
    expect({code:result.code,stopped:result.stopped,sends:f.calls.filter(c=>c[1]==="send-keys").length})
      .toEqual({code:75,stopped:false,sends:0});
  });
});
