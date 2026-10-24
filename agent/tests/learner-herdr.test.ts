/** Fixed native records and a harmless sleep process; no real herdr, Codex, model or gameplay. */
import { spawn, type ChildProcess } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";
import { learnerInteractiveArgs } from "../../learner/lib/engines.js";
import { NativeBatch, NativeRows, learnerAgentName, learnerTuiEnv, runLearnerTui, type TuiOptions } from "../../learner/lib/herdr.js";
import type { HerdrResult } from "../../ops/codex/herdr.js";

const roots: string[] = [];
const children: ChildProcess[] = [];
const signalTimers: ReturnType<typeof setTimeout>[] = [];
afterEach(async () => {
  for (const timer of signalTimers.splice(0)) clearTimeout(timer);
  for (const child of children.splice(0)) if (child.exitCode === null && child.signalCode === null) { child.kill("SIGKILL"); await new Promise<void>((done) => child.once("close", () => done())); }
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
const row = (type: string, payload: Record<string, unknown>) => ({ type, payload });
const ok = (result: Record<string, unknown> = {}, stdout = ""): HerdrResult => ({ ok: true, code: 0, result, stdout, stderr: "" });
const fail = (): HerdrResult => ({ ok: false, code: 1, error: "transport_uncertain", stdout: "", stderr: "" });

function fixture(kind = "success", label = "learner-20261022-120000-postmortem", exitSignalDelayMs = 0) {
  const root = mkdtempSync(join(tmpdir(), "learner-tui-")); roots.push(root);
  const home = join(root, "home");
  const date = new Date();
  const sessionDir = join(home, "sessions", String(date.getFullYear()), String(date.getMonth() + 1).padStart(2, "0"), String(date.getDate()).padStart(2, "0"));
  mkdirSync(sessionDir, { recursive: true });
  const file = join(sessionDir, "rollout-019a1000-1234-7123-8123-123456789abc.jsonl");
  const session = "019a1000-1234-7123-8123-123456789abc";
  const pane = { pane_id: "w1:p2", label, tab_id: "w1:t2", terminal_id: "terminal-2", cwd: root };
  let clock = Date.now();
  let child: ChildProcess | undefined;
  let live = false;
  let prompts = 0;
  let status = "idle";
  let name: string | undefined;
  let afterPoll = 0;
  let changed = false;
  let leaseCurrent = true;
  let stopping = false;
  let exitObserved = Promise.resolve();
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
        exitObserved = new Promise<void>((done) => child!.once("close", () => { live = false; done(); }));
        writeFileSync(join(root, "tui.pid"), String(child.pid));
        write(row("session_meta", { id: session, cwd: root }));
        return kind === "start-uncertain" ? fail() : ok();
      }
      if (group === "pane" && action === "read") return ok({}, `header\n› \u001b[2mAsk Codex to do anything\u001b[0m\n${kind === "capacity" ? "at capacity" : ""}`);
      if (group === "agent" && action === "get") return live ? ok({ agent: { agent: "codex", name, pane_id: pane.pane_id, agent_status: status, foreground_cwd: root } }) : fail();
      if (group === "agent" && action === "rename") {
        if (!/^[a-z][a-z0-9_-]{0,31}$/.test(args[3]!)) return { ...fail(), error: "invalid_agent_name" };
        name = args[3]; return ok();
      }
      if (group === "agent" && action === "prompt") {
        prompts++;
        const text = args[3]!;
        const turn = `turn-${prompts}`;
        write(row("event_msg", { type: "task_started", turn_id: turn }));
        if (kind === "bootstrap") write(row("response_item", { type: "message", role: "user", content: [
          { type: "input_text", text: `# AGENTS.md instructions for ${root}\n\n<INSTRUCTIONS>\nFixed instructions.\n</INSTRUCTIONS>` },
          { type: "input_text", text: `<environment_context>\n  <cwd>${root}</cwd>\n  <shell>bash</shell>\n</environment_context>` },
        ] }), row("turn_context", { turn_id: turn, cwd: root }));
        write(kind === "bootstrap" ? row("response_item", { type: "message", role: "user", content: [{ type: "input_text", text }] })
          : row("event_msg", { type: "user_message", message: text }));
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
        if (args[3] === "ctrl+c" && child && live) {
          const owned = child;
          if (exitSignalDelayMs) signalTimers.push(setTimeout(() => owned.kill("SIGTERM"), exitSignalDelayMs));
          else owned.kill("SIGTERM");
        }
        return ok();
      }
      throw new Error(`unexpected fake call ${args.join(" ")}`);
    },
  };
  if (kind === "capacity") opts.timeoutMs = 3_000_000;
  if (kind === "retry-success" || kind === "stale-open-error") opts.retryMs = 100;
  const waitForExit = async (): Promise<void> => {
    if (!live) return;
    // The injected clock must not outrun the real child-process close event.
    // A missing exit still fails closed after a bounded wall-clock wait.
    await new Promise<void>((done, reject) => {
      const timer = setTimeout(() => reject(new Error("fixed TUI child did not close within 2s")), 2000);
      void exitObserved.then(() => { clearTimeout(timer); done(); });
    });
  };
  return { opts, root, events, notices, calls, file, pane, prompts: () => prompts, stopping: () => stopping, waitForExit };
}

describe("learner interactive command policy", () => {
  it.each([undefined, "", "dumb", " DUMB "])("replaces noninteractive TERM=%s only in the isolated TUI environment", (term) => {
    const env = { PATH: "/fixed/bin", ...(term === undefined ? {} : { TERM: term }) };
    expect(learnerTuiEnv(env)).toEqual({ PATH: "/fixed/bin", TERM: "xterm-256color" });
    expect(env.TERM).toBe(term);
  });
  it("preserves an explicitly usable terminal", () => {
    expect(learnerTuiEnv({ TERM: "screen-256color", COLORTERM: "truecolor" }))
      .toEqual({ TERM: "screen-256color", COLORTERM: "truecolor" });
  });
  it("does not persist arbitrary inherited environment or proxy credentials in the pane launch script", () => {
    expect(learnerTuiEnv({ CODEX_HOME: "/fixed/account", PATH: "/fixed/bin", MY_AUTH_HEADER: "private", SOMETHING: "opaque-secret" }))
      .toEqual({ CODEX_HOME: "/fixed/account", PATH: "/fixed/bin", TERM: "xterm-256color" });
    expect(() => learnerTuiEnv({ HTTPS_PROXY: "https://user:private@proxy.example" })).toThrow("credential-bearing proxy");
  });
  it("preserves profile, model, effort, disabled features and explicit thread without exec-only options", () => {
    const f = fixture();
    const args = learnerInteractiveArgs(f.opts.request);
    expect(args).not.toContain("exec"); expect(args).not.toContain("--json"); expect(args).not.toContain("--ignore-user-config");
    expect(args).toContain("--no-daemon"); expect(args).toContain('model_reasoning_effort="high"');
    expect(args).toContain('default_permissions="learner"'); expect(args.some((arg) => arg.startsWith("permissions.learner.filesystem"))).toBe(true);
    const thread = "019a1000-1234-7123-8123-123456789abc";
    expect(learnerInteractiveArgs({ ...f.opts.request, resumeThread: thread })).toEqual(["resume", ...args, thread]);
  });
});

describe("startup readiness and queued inputs", () => {
  const queue = "header\n\u001b[1mQueued follow-up inputs\u001b[0m\n  pending task\n› \u001b[2mAsk Codex to do anything\u001b[0m";
  it("does not propagate the observed TERM=dumb startup confirmation into the pane", async () => {
    const f = fixture(); f.opts.env.TERM = "dumb"; const h = f.opts.h!;
    f.opts.h = async (args) => {
      if (args[0] === "pane" && args[1] === "run") {
        const script = readFileSync(join(f.root, "tui.sh"), "utf8");
        expect(script).toContain("TERM=xterm-256color"); expect(script).not.toContain("TERM=dumb");
      }
      return h(args);
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 0, stopped: true });
    expect(f.opts.env.TERM).toBe("dumb"); expect(f.prompts()).toBe(1);
  });
  it.each(["initial", "before-name", "before-prompt", "after-binding"])("retains queued inputs at %s without another prompt or retirement", async (phase) => {
    const f = fixture(); const h = f.opts.h!; let reads = 0; const screens: string[][] = [];
    f.opts.h = async (args) => {
      if (args[0] === "pane" && args[1] === "read") {
        screens.push(args);
        reads++;
        if (phase === "initial" || phase === "before-name" && reads >= 2 ||
            phase === "before-prompt" && reads >= 3 || phase === "after-binding" && f.prompts()) return ok({}, queue);
      }
      return h(args);
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false });
    expect(f.prompts()).toBe(phase === "after-binding" ? 1 : 0);
    expect(f.calls.some((c) => c[1] === "send-keys")).toBe(false);
    expect(JSON.parse(readFileSync(f.opts.receipt, "utf8")).retirement_authorized).toBe(false);
    expect(screens.length).toBeGreaterThan(0); expect(screens.every((args) => args.includes("visible"))).toBe(true);
  });
});

describe("midnight TUI completion", () => {
  it("persists a native environment proof and retires the original completed TUI without another prompt", async () => {
    const f = fixture("bootstrap"), h = f.opts.h!;
    const pause = f.opts.pause!;
    f.opts.pause = async (ms) => { if (f.stopping()) await f.waitForExit(); await pause(ms); };
    f.opts.h = async (args) => {
      const response = await h(args);
      if (args[0] === "pane" && args[1] === "run") rmSync(f.file);
      if (args[0] === "agent" && args[1] === "prompt") {
        const rows = JSON.parse(readFileSync(new URL("./fixtures/learner-midnight.json", import.meta.url), "utf8")
          .replaceAll("/fixture/learner", f.root)).rows;
        rows[4].payload.content[0].text = args[3];
        writeFileSync(f.file, rows.map((r) => JSON.stringify(r) + "\n").join(""));
      }
      return response;
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 0, stopped: true, reason: "native-task-complete" });
    const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    expect(receipt).toMatchObject({ native_environment_version: 1, retirement_authorized: true });
    expect(receipt.native_environment_updates).toHaveLength(1); expect(receipt.bindings).toHaveLength(1);
    expect(receipt.native_environment_updates[0]).toMatchObject({ cwd: f.root, current_date: "2026-10-24", turn_id: "fixture-turn" });
    expect(f.prompts()).toBe(1); expect(f.notices).toEqual([]);
  });
});

describe("bounded native learner names", () => {
  const labels = [
    "learner-20261023-021302-strategy-proposal",
    "learner-20261023-021302-s2-strategy-proposal",
    "learner-20261023-021302-fix-batch",
    "learner-20261023-021301-postmortem",
  ];
  it("reproduces the observed CLI name limit without touching the original pane", async () => {
    const f = fixture();
    expect(labels[0]).toHaveLength(41);
    expect(await f.opts.h!(["agent", "rename", f.pane.pane_id, labels[0]!])).toMatchObject({ ok: false, error: "invalid_agent_name" });
    expect(f.calls.some((c) => c[1] === "run" || c[1] === "prompt")).toBe(false);
  });
  it("is deterministic and distinguishes the full label, pane and cwd without truncating their suffixes", () => {
    const names = labels.map((label) => learnerAgentName(label, "w1:p2", "/fixture/中文"));
    expect(new Set(names).size).toBe(labels.length);
    for (const name of names) expect(name).toMatch(/^learner-[a-f0-9]{24}$/);
    expect(names[0]).toBe("learner-8f55a5ad47c4b2bb40b86574"); // shared Python/TypeScript UTF-8 contract
    expect(names[0]).toBe(learnerAgentName(labels[0]!, "w1:p2", "/fixture/中文"));
    expect(learnerAgentName(labels[0]!, "w1:p3", "/fixture/中文")).not.toBe(names[0]);
    expect(learnerAgentName(labels[0]!, "w1:p2", "/fixture/other")).not.toBe(names[0]);
  });
  it.each(labels)("persists and reads back a bounded name for %s through completion and retirement", async (label) => {
    const f = fixture("success", label); const h = f.opts.h!;
    const expected = learnerAgentName(label, f.pane.pane_id, f.root);
    f.opts.h = async (args) => {
      if (args[1] === "rename") {
        expect(args[3]).toBe(expected);
        expect(JSON.parse(readFileSync(f.opts.receipt, "utf8"))).toMatchObject({
          state: "naming", agent_name: expected, agent_name_version: 1, label, pane: f.pane.pane_id, submitted: false,
        });
      }
      return h(args);
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 0, stopped: true });
    expect(f.prompts()).toBe(1);
    expect(f.calls.filter((c) => c[1] === "rename")).toHaveLength(1);
    const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    expect(receipt).toMatchObject({ agent_name: expected, label, identity: { label }, submitted: true, retirement_authorized: true });
    expect(receipt.bindings).toHaveLength(1);
  });
  it.each(["not-applied", "uncertain", "foreign"])("retains the unsubmitted TUI when naming is %s", async (kind) => {
    const f = fixture(); const h = f.opts.h!;
    f.opts.h = async (args) => {
      if (args[0] === "agent" && args[1] === "rename") return kind === "uncertain" ? fail() : ok();
      const response = await h(args);
      if (kind === "foreign" && args[0] === "agent" && args[1] === "get" && response.ok) {
        return ok({ agent: { ...response.result?.agent as object, name: "human-agent" } });
      }
      return response;
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false });
    expect(f.prompts()).toBe(0);
    expect(f.calls.filter((c) => c[1] === "send-keys")).toHaveLength(0);
    const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    expect(receipt).toMatchObject({ submitted: false, bindings: [], retirement_authorized: false });
  });
  it.each(["lease", "draft", "foreground", "cwd"])("does not rename or submit after pre-naming %s changes", async (kind) => {
    const f = fixture(); const h = f.opts.h!; let started = false;
    if (kind === "lease") f.opts.lease = { batch: "fixed", identity: "fixed", current: () => !started };
    f.opts.h = async (args) => {
      const response = await h(args);
      if (args[0] === "pane" && args[1] === "run") started = true;
      if (started && kind === "draft" && args[1] === "read") return ok({}, "header\n› Human draft not sent");
      if (started && kind === "foreground" && args[1] === "process-info") return ok({ process_info: { shell_pid: 1000, foreground_process_group_id: 99999 } });
      if (started && kind === "cwd" && args[0] === "agent" && args[1] === "get") return ok({ agent: { ...response.result?.agent as object, foreground_cwd: "/foreign" } });
      return response;
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false });
    expect(f.prompts()).toBe(0);
    expect(f.calls.filter((c) => c[1] === "rename" || c[1] === "send-keys")).toHaveLength(0);
  });
  it("checks the same bound name before continuation and every retirement key", async () => {
    const f = fixture("retry-success"); const h = f.opts.h!;
    f.opts.h = async (args) => {
      const response = await h(args);
      if (f.prompts() && args[0] === "agent" && args[1] === "get" && response.ok) {
        return ok({ agent: { ...response.result?.agent as object, name: "foreign" } });
      }
      return response;
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false });
    expect(f.prompts()).toBe(1);
    expect(f.calls.filter((c) => c[1] === "send-keys")).toHaveLength(0);
  });
});

describe("delayed native acceptance after prompt delivery", () => {
  function delayed(delayMs: number | undefined, screen: "paste" | "human" | "empty" | "queue" = "paste", neighbour = "aaa", exitSignalDelayMs = 0) {
    const f = fixture("bootstrap", undefined, exitSignalDelayMs); const h = f.opts.h!;
    let clock = Date.now(), sentAt: number | undefined, sent: string[] | undefined, meta = "", promptCalls = 0;
    f.opts.now = () => clock;
    f.opts.timeoutMs = 800_000;
    f.opts.pause = async () => {
      if (f.stopping()) {
        await f.waitForExit();
        clock += f.opts.pollMs ?? 1000;
        return;
      }
      clock += 10_000;
      await new Promise((done) => setTimeout(done, 2));
      if (sent) {
        expect(f.calls.some((c) => c[1] === "send-keys")).toBe(false);
        expect(promptCalls).toBe(1);
        if (clock - sentAt! > 120_000) {
          expect(JSON.parse(readFileSync(f.opts.receipt, "utf8"))).toMatchObject({
            state: "awaiting-native", submitted: true, bindings: [], retirement_authorized: false,
            native_acceptance_warn_at_ms: sentAt! + 120_000, native_acceptance_deadline_ms: sentAt! + 600_000,
          });
        }
      }
      if (sent && delayMs !== undefined && clock - sentAt! >= delayMs) {
        writeFileSync(f.file, meta);
        const args = sent; sent = undefined;
        await h(args); // The original prompt appears once, in its original native session.
      }
    };
    f.opts.h = async (args) => {
      if (args[0] === "agent" && args[1] === "prompt") {
        promptCalls++; sent = args; sentAt = clock;
        // Concurrent dispatch has a different cwd/session even if a prompt proof is copied into its file.
        const other = join(f.root, "home", "sessions", ...f.file.split("/").slice(-4, -1), `${neighbour}.jsonl`);
        writeFileSync(other, [row("session_meta", { id: "neighbour", cwd: `${f.root}/other` }),
          row("event_msg", { type: "task_started", turn_id: "other" }),
          row("event_msg", { type: "user_message", message: args[3] })].map((r) => JSON.stringify(r) + "\n").join(""));
        return ok(); // Submission receipt precedes native acceptance, as in 151302-s2.
      }
      if (sent && args[0] === "pane" && args[1] === "read") return ok({}, screen === "queue"
        ? "header\n\u001b[1m↳ Queued follow-up inputs\u001b[0m\n  original task pending\n› \u001b[2mAsk Codex to do anything\u001b[0m"
        : screen === "empty"
        ? "header\n› \u001b[2mAsk Codex to do anything\u001b[0m"
        : `header\n› ${screen === "human" ? "Human draft not sent" : sent[3]}`);
      const response = await h(args);
      if (args[0] === "pane" && args[1] === "run") {
        meta = readFileSync(f.file, "utf8"); rmSync(f.file); // No native file until the delayed first turn.
      }
      return response;
    };
    return { ...f, promptCalls: () => promptCalls, elapsed: () => clock - sentAt! };
  }

  it.each(["aaa", "zzz"].flatMap((neighbour) => [35_000, 450_000].map((delay) => ({ neighbour, delay }))))(
    "waits for the original $delay-ms-delayed turn with a concurrent $neighbour session", async ({ neighbour, delay }) => {
    const f = delayed(delay, delay > 120_000 ? "queue" : "paste", neighbour);
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 0, stopped: true, turn: "turn-1" });
    const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    expect(receipt.bindings).toHaveLength(1); expect(receipt.native_preludes).toHaveLength(1);
    expect(receipt.rollout).toBe(f.file); expect(receipt.retirement_authorized).toBe(true);
    expect(f.promptCalls()).toBe(1); expect(f.notices).toEqual(delay > 120_000
      ? ["learner native acceptance delayed; observing original session until deadline; no task replay"] : []);
    expect(f.events.filter((e) => e.type === "thread.started")).toHaveLength(1);
  });

  it.each(["aaa", "zzz"])("waits for real exit after delayed acceptance and a 250ms signal delay (%s)", async (neighbour) => {
    const f = delayed(35_000, "paste", neighbour, 250);
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 0, stopped: true, turn: "turn-1" });
    const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    expect(receipt.bindings).toHaveLength(1); expect(receipt.native_preludes).toHaveLength(1);
    expect(receipt.rollout).toBe(f.file); expect(receipt.retirement_authorized).toBe(true);
    expect(f.promptCalls()).toBe(1); expect(f.notices).toEqual([]);
    expect(f.events.filter((e) => e.type === "thread.started")).toHaveLength(1);
  });

  it("does not certify retirement when the delayed fixture child misses its bounded real exit", async () => {
    const f = delayed(35_000, "paste", "aaa", 5000);
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false, turn: "turn-1" });
    const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    expect(receipt.bindings).toHaveLength(1); expect(receipt.retirement_authorized).toBe(false);
    expect(f.promptCalls()).toBe(1);
  });

  it.each(["paste", "human", "empty", "queue"] as const)("bounds missing acceptance with %s visible and never sends keys or replays", async (screen) => {
    const f = delayed(undefined, screen);
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false });
    expect(f.elapsed()).toBe(600_000); expect(f.promptCalls()).toBe(1);
    expect(f.notices).toEqual(["learner native acceptance delayed; observing original session until deadline; no task replay"]);
    expect(f.calls.some((c) => c[1] === "send-keys" || c[1] === "close")).toBe(false);
    const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    expect(receipt.bindings).toEqual([]); expect(receipt.retirement_authorized).toBe(false);
  });

  it("still refuses a real draft after delayed native acceptance", async () => {
    const f = delayed(35_000); const h = f.opts.h!;
    f.opts.h = async (args) => f.prompts() && args[0] === "pane" && args[1] === "read"
      ? ok({}, "header\n› Human draft not sent") : h(args);
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false });
    expect(JSON.parse(readFileSync(f.opts.receipt, "utf8")).bindings).toHaveLength(1);
    expect(f.notices).toEqual(["learner composer contains text; observing original session without control until it clears or the input-hold deadline"]);
    expect(f.calls.some((c) => c[1] === "send-keys")).toBe(false); expect(f.promptCalls()).toBe(1);
  });

  it("keeps the caller's shorter deadline while acceptance is pending", async () => {
    const f = delayed(undefined, "queue"); f.opts.timeoutMs = 90_000;
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false });
    expect(f.elapsed()).toBe(90_000); expect(f.promptCalls()).toBe(1);
    expect(f.calls.some((c) => c[1] === "send-keys")).toBe(false);
  });

  it("resolves an uncertain submission only from its original delayed native prompt", async () => {
    const f = delayed(450_000, "queue"); const h = f.opts.h!;
    f.opts.h = async (args) => {
      const response = await h(args);
      return args[0] === "agent" && args[1] === "prompt" ? fail() : response;
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 0, stopped: true, turn: "turn-1" });
    expect(f.promptCalls()).toBe(1);
    expect(JSON.parse(readFileSync(f.opts.receipt, "utf8")).bindings).toHaveLength(1);
  });

  it.each(["lease", "pane"].flatMap((kind) => [20_000, 180_000].map((at) => ({ kind, at })) ))(
    "keeps the $kind guard at $at ms while waiting for native acceptance", async ({ kind, at }) => {
    const f = delayed(450_000); const h = f.opts.h!;
    if (kind === "lease") f.opts.lease = { batch: "fixed", identity: "fixed", current: () => !(f.elapsed() >= at) };
    f.opts.h = async (args) => {
      const response = await h(args);
      if (kind === "pane" && f.elapsed() >= at && args[0] === "pane" && args[1] === "get") {
        return ok({ pane: { ...response.result?.pane as object, terminal_id: "foreign-terminal" } });
      }
      return response;
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false });
    expect(f.elapsed()).toBe(at); expect(f.promptCalls()).toBe(1);
    expect(JSON.parse(readFileSync(f.opts.receipt, "utf8")).bindings).toEqual([]);
    expect(f.calls.some((c) => c[1] === "send-keys")).toBe(false);
  });
});

describe("retained input supervision and exit diagnostics", () => {
  it.each(["running", "completed"])("observes %s native activity through transient text without submitting or controlling it", async (state) => {
    const f = fixture(state === "running" ? "late-complete" : "success"); const h = f.opts.h!;
    let reads = 0, held = false;
    f.opts.h = async (args) => {
      const reply = await h(args);
      if (f.prompts() && args[1] === "read" && reads++ < 4) { held = true; return ok({}, "header\n› transient transcript prompt"); }
      if (held && args[1] === "send-keys") expect(reads).toBeGreaterThanOrEqual(4);
      return reply;
    };
    const pause = f.opts.pause!;
    f.opts.pause = async (ms) => { await pause(ms); if (f.stopping()) await f.waitForExit(); };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 0, stopped: true });
    expect(f.prompts()).toBe(1);
    expect(f.events.some((e) => e.type === "learner_tui_input_hold")).toBe(true);
    expect(f.events.some((e) => e.type === "learner_tui_input_resumed")).toBe(true);
  });

  it("refuses a new native human turn while observing text even if the composer clears", async () => {
    const f = fixture("late-complete"); const h = f.opts.h!; let reads = 0;
    f.opts.h = async (args) => {
      const reply = await h(args);
      if (f.prompts() && args[1] === "read") {
        if (++reads === 3) appendFileSync(f.file, JSON.stringify(row("event_msg", { type: "task_started", turn_id: "human" })) + "\n");
        if (reads < 3) return ok({}, "header\n› Human draft");
      }
      return reply;
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false, failure_reason: "foreign-native-activity" });
    expect(f.calls.some((c) => c[1] === "send-keys")).toBe(false);
    expect(f.prompts()).toBe(1);
  });

  it("bounds persistent input and records its original cause without authorizing retirement", async () => {
    const f = fixture(); const h = f.opts.h!; const pause = f.opts.pause!;
    f.opts.timeoutMs = 1_000_000;
    f.opts.pause = async (ms) => { await pause(ms); await pause(ms); };
    f.opts.h = async (args) => f.prompts() && args[1] === "read" ? ok({}, "header\n› Human draft") : h(args);
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false, failure_reason: "pending-input-timeout" });
    const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    expect(receipt.input_hold.deadline_ms - receipt.input_hold.since_ms).toBe(120_000);
    expect(receipt.input_hold.screen_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(receipt.retirement_authorized).toBe(false);
    expect(f.calls.some((c) => c[1] === "send-keys")).toBe(false);
  });

  it("preserves a pre-submission process disappearance as failure instead of waiting for startup or claiming zero models", async () => {
    const f = fixture(); const h = f.opts.h!; let polls = 0;
    f.opts.h = async (args) => {
      const reply = await h(args);
      if (args[0] === "pane" && args[1] === "run") {
        process.kill(Number(readFileSync(join(f.root, "tui.pid"), "utf8")), "SIGTERM");
        await f.waitForExit();
      }
      if (args[1] === "get") polls++;
      return reply;
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false, failure_reason: "startup-process-unavailable" });
    const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    expect(receipt.state).toBe("needs-attention"); expect(receipt.submitted).toBe(false);
    expect(receipt.models_started).toBeUndefined(); expect(receipt.bindings).toEqual([]);
    expect(polls).toBeLessThan(5); expect(f.prompts()).toBe(0);
    expect(f.calls.some((c) => c[1] === "send-keys")).toBe(false);
  });
});

describe("native batch authority", () => {
  it("ignores idle screens and unrelated/old completions, and requires a matching accepted native turn", () => {
    const old = new NativeBatch("our-marker");
    old.feed(row("event_msg", { type: "task_started", turn_id: "old" }));
    old.feed(row("event_msg", { type: "task_complete", turn_id: "old", last_agent_message: "old answer" }));
    expect(old.successful()).toBe(false);
    const b = new NativeBatch("our-marker");
    b.feed(row("event_msg", { type: "task_started", turn_id: "ours" }));
    b.feed(row("event_msg", { type: "user_message", message: "our-marker" }));
    b.feed(row("event_msg", { type: "task_complete", turn_id: "old", last_agent_message: "old answer" }));
    expect(b.successful()).toBe(false);
    b.feed(row("event_msg", { type: "task_complete", turn_id: "ours", last_agent_message: "报告" }));
    expect(b.successful()).toBe(true);
    b.feed(row("event_msg", { type: "task_started", turn_id: "new-human-turn" }));
    expect(b.successful()).toBe(false);
  });
  it("counts each native turn's last usage snapshot once across continuations", () => {
    const b = new NativeBatch("our-marker");
    for (const [turn, input] of [["one", 100], ["two", 200]] as const) {
      const marker = turn === "one" ? "our-marker" : "retry-marker";
      if (turn === "two") b.expectPrompt(marker, marker);
      b.feed(row("event_msg", { type: "task_started", turn_id: turn }));
      b.feed(row("event_msg", { type: "user_message", message: marker }));
      b.feed(row("token_usage_record", { turn_id: turn, turn_token_usage: { input_tokens: input / 2 } }));
      b.feed(row("token_usage_record", { turn_id: turn, turn_token_usage: { input_tokens: input } }));
    }
    expect(b.totalUsage()).toEqual({ input_tokens: 300 });
  });
  it.each(["replay", "wrong-body", "prefix"])("rejects %s instead of carrying native authorization forward", (kind) => {
    const b = new NativeBatch("our-marker"); b.expectPrompt("our-marker", "our-marker\noriginal");
    b.feed(row("event_msg", { type: "task_started", turn_id: "one" }));
    b.feed(row("event_msg", { type: "user_message", message: "our-marker\noriginal" }));
    b.feed(row("event_msg", { type: "task_complete", turn_id: "one", last_agent_message: "report" }));
    b.expectPrompt("retry-marker", "retry-marker\ncontinue");
    b.feed(row("event_msg", { type: "task_started", turn_id: "two" }));
    const message = kind === "replay" ? "our-marker\noriginal" : kind === "prefix" ? "retry-marker-extra\ncontinue" : "retry-marker\nhuman task";
    b.feed(row("event_msg", { type: "user_message", message }));
    b.feed(row("event_msg", { type: "task_complete", turn_id: "two", last_agent_message: "human answer" }));
    expect(b.successful()).toBe(false); expect(b.foreignActivity).toBe(true); expect(b.turn).toBe("one");
  });
  it("accepts duplicate native representations only within their explicitly bound turn", () => {
    const b = new NativeBatch("marker"); b.expectPrompt("marker", "marker\noriginal");
    b.feed(row("event_msg", { type: "task_started", turn_id: "one" }));
    b.feed(row("event_msg", { type: "user_message", message: "marker\noriginal" }));
    b.feed(row("response_item", { type: "message", role: "user", content: [{ text: "marker\noriginal" }] }));
    b.feed(row("event_msg", { type: "task_complete", turn_id: "one", last_agent_message: "report" }));
    expect(b.successful()).toBe(true); expect(b.bindings).toHaveLength(1);
    b.expectPrompt("retry", "retry"); expect(b.successful()).toBe(false);
  });
  it("keeps partial native UTF-8 rows intact and fails closed on truncation", () => {
    const f = fixture();
    const reader = new NativeRows();
    const bytes = Buffer.from(JSON.stringify(row("event_msg", { type: "user_message", message: "中文" })) + "\n");
    const split = bytes.indexOf(Buffer.from("中")) + 1;
    writeFileSync(f.file, bytes.subarray(0, split)); expect(reader.read(f.file)).toEqual([]);
    appendFileSync(f.file, bytes.subarray(split)); expect(reader.read(f.file)[0]!.payload!.message).toBe("中文");
    writeFileSync(f.file, ""); expect(() => reader.read(f.file)).toThrow("truncated");
  });
});

describe("interactive batch lifecycle", () => {
  it("keeps pre-dispatch resume history outside the active parser window", async () => {
    const f = fixture("bootstrap");
    const session = "019a1000-1234-7123-8123-123456789abc";
    f.opts.request.resumeThread = session;
    writeFileSync(f.file, [row("session_meta", { id: session, cwd: f.root }),
      row("event_msg", { type: "task_started", turn_id: "historical" }),
      row("response_item", { type: "function_call", name: "historical-tool" }),
      row("response_item", { type: "local_shell_call", call_id: "historical-shell" }),
      row("response_item", { type: "message", role: "assistant", content: [{ type: "output_text", text: "Historical answer" }] }),
      row("event_msg", { type: "task_complete", turn_id: "historical", last_agent_message: "Historical answer" }),
    ].map((r) => JSON.stringify(r) + "\n").join(""));
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 0, stopped: true, session, turn: "turn-1" });
    expect(f.prompts()).toBe(1);
    expect(f.events.some((event) => (event.payload as Record<string, unknown>)?.name === "historical-tool")).toBe(false);
    const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    expect(receipt.bindings).toHaveLength(1); expect(receipt.bindings[0].turn_id).toBe("turn-1");
  });
  it("persists bootstrap proof without interrupting the original native task or weakening retirement", async () => {
    const f = fixture("bootstrap");
    const log = f.opts.log; let running: Record<string, unknown> | undefined;
    f.opts.log = (event) => {
      log(event);
      if (event.type === "token_usage_record") running = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 0, stopped: true, turn: "turn-1" });
    expect(running).toMatchObject({ state: "native-accepted", session: "019a1000-1234-7123-8123-123456789abc",
      turn: "turn-1", submitted: true, retirement_authorized: false });
    expect(running?.bindings).toHaveLength(1); expect(running?.native_preludes).toHaveLength(1);
    expect(f.prompts()).toBe(1);
    const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    expect(receipt).toMatchObject({ native_context_version: 1, retirement_authorized: true, submitted: true });
    expect(receipt.native_preludes).toHaveLength(1); expect(receipt.bindings).toHaveLength(1);
    expect(receipt.native_preludes[0]).toMatchObject({ turn_id: "turn-1", cwd: f.root });
    expect(f.calls.filter((c) => c[1] === "run")).toHaveLength(1);
  });
  it("refuses inherited MCP/config context before launching the TUI, without changing the account", async () => {
    const f = fixture();
    const path = join(f.opts.codexHome, "config.toml");
    const config = '[mcp_servers.unapproved]\ncommand="/fixed/forbidden"\n';
    writeFileSync(path, config);
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 3, reason: "inherited-tui-config-not-isolated" });
    expect(f.calls).toEqual([["pane", "get", f.opts.pane]]); expect(readFileSync(path, "utf8")).toBe(config);
    expect(JSON.parse(readFileSync(f.opts.receipt, "utf8"))).toMatchObject({ pane: f.opts.pane, label: f.opts.label,
      cwd: f.root, identity: { pane_id: f.opts.pane }, submitted: false, bindings: [], retirement_authorized: false });
  });
  it("classifies unsafe persisted environment before any model/terminal start", async () => {
    const f = fixture(); f.opts.env.HTTPS_PROXY = "https://user:private@proxy.example";
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 3, reason: "unsafe-tui-environment" });
    expect(f.calls).toEqual([["pane", "get", f.opts.pane]]);
    expect(JSON.parse(readFileSync(f.opts.receipt, "utf8"))).toMatchObject({ state: "not-started", models_started: 0 });
  });
  it("runs one interactive TUI, sends the original task, persists native completion and retires only its own PID", async () => {
    const f = fixture();
    const result = await runLearnerTui(f.opts);
    expect(result).toMatchObject({ code: 0, stopped: true, turn: "turn-1", message: "已保存批次报告" });
    expect(result.usage).toMatchObject({ input_tokens: 100 });
    expect(f.notices).toEqual([]);
    expect(f.prompts()).toBe(1);
    expect(f.calls.find((c) => c[1] === "prompt")![3]).toContain(f.opts.prompt);
    expect(f.calls.filter((c) => c[1] === "run")).toHaveLength(1);
    expect(f.calls.some((c) => c[1] === "close")).toBe(false); // task audit closes later
    expect(JSON.parse(readFileSync(f.opts.receipt, "utf8"))).toMatchObject({ state: "session-ended", result: { code: 0 } });
    expect(f.events.some((e) => e.type === "learner_tui_session")).toBe(true);
  });
  it("waits for the native task_complete even when the screen is idle", async () => {
    const f = fixture("late-complete"); expect((await runLearnerTui(f.opts)).code).toBe(0);
    expect(f.calls.filter((c) => c[1] === "get" && c[0] === "agent").length).toBeGreaterThan(2);
  });
  it.each([false, true])("checks the original host/tab when pane.label is absent (foreign title: %s)", async (foreign) => {
    const f = fixture(); const h = f.opts.h!;
    mkdirSync(join(f.root, "ops/codex-ops"), { recursive: true });
    writeFileSync(join(f.root, "ops/codex-ops/herdr.json"), JSON.stringify({ workspace_id: "w1", panes: {
      [f.opts.label]: { pane_id: f.opts.pane, title: "学习大脑 · 原批" },
    } }));
    f.opts.h = async (args) => {
      if (args[0] === "tab" && args[1] === "list") return ok({ tabs: [{ tab_id: f.pane.tab_id, pane_count: 1,
        label: foreign ? "人工改名" : "学习大脑 · 原批" }] });
      const result = await h(args);
      if (args[0] === "pane" && args[1] === "get") {
        const pane = { ...(result.result!.pane as Record<string, unknown>), workspace_id: "w1" };
        delete pane.label; return ok({ pane });
      }
      return result;
    };
    const result = await runLearnerTui(f.opts);
    expect(result.code).toBe(foreign ? 3 : 0);
    expect(f.prompts()).toBe(foreign ? 0 : 1);
    const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    if (!foreign) expect(receipt.identity).toMatchObject({ pane_id: f.opts.pane, workspace_id: "w1" });
    expect(receipt.identity?.label).toBeUndefined();
  });
  it.each(["timeout"])("does not declare %s complete", async (kind) => {
    const f = fixture(kind); const result = await runLearnerTui(f.opts);
    expect(result.code).toBe(124); expect(result.stopped).toBe(true);
    expect(f.notices).toHaveLength(1);
  });
  it.each(["lease-lost", "working-after-complete"])("retains %s rather than interrupting an unverified foreground", async (kind) => {
    const f = fixture(kind); const result = await runLearnerTui(f.opts);
    expect(result).toMatchObject({ code: 75, stopped: false });
    expect(f.prompts()).toBe(1);
    expect(f.calls.filter((c) => c[1] === "send-keys")).toHaveLength(0);
  });
  it.each(["draft", "unknown", "foreign-cwd", "foreign-foreground", "foreign-turn"])("retains a timed-out batch after %s appears", async (kind) => {
    const f = fixture("timeout"); const h = f.opts.h!;
    f.opts.h = async (args) => {
      const response = await h(args);
      if (!f.prompts()) return response;
      if (kind === "draft" && args[0] === "pane" && args[1] === "read") return ok({}, "header\n› Human draft not sent");
      if (kind === "unknown" && args[0] === "pane" && args[1] === "read") return ok({}, "ambiguous terminal");
      if (kind === "foreign-cwd" && args[0] === "agent" && args[1] === "get") return ok({ agent: { ...response.result?.agent as object, foreground_cwd: "/foreign" } });
      if (kind === "foreign-foreground" && args[1] === "process-info") return ok({ process_info: { shell_pid: 1000, foreground_process_group_id: 99999 } });
      if (kind === "foreign-turn" && args[0] === "agent" && args[1] === "prompt") appendFileSync(f.file, JSON.stringify(row("event_msg", { type: "task_started", turn_id: "human" })) + "\n" + JSON.stringify(row("event_msg", { type: "user_message", message: "human request" })) + "\n");
      return response;
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false });
    expect(f.calls.filter((c) => c[1] === "send-keys")).toHaveLength(0);
  });
  it.each(["draft", "lease", "uncertain-key"])("stops retirement if %s changes after Esc", async (kind) => {
    const f = fixture("timeout"); const h = f.opts.h!; let escaped = false;
    if (kind === "lease") f.opts.lease = { batch: "fixed", identity: "fixed", current: () => !escaped };
    f.opts.h = async (args) => {
      const response = await h(args);
      if (args[1] === "send-keys" && args[3] === "esc") { escaped = true; if (kind === "uncertain-key") return fail(); }
      if (kind === "draft" && escaped && args[1] === "read") return ok({}, "header\n› Human draft not sent");
      return response;
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false });
    expect(f.calls.filter((c) => c[1] === "send-keys").map((c) => c[3])).toEqual(["esc"]);
  });
  it.each(["cancelled", "native-error", "transport-error"])("preserves human input on the %s exit path", async (kind) => {
    const f = fixture("timeout"); const h = f.opts.h!;
    f.opts.h = async (args) => {
      const response = await h(args);
      if (args[1] === "prompt") {
        if (kind === "cancelled") process.emit("SIGTERM");
        if (kind === "transport-error") throw new Error("fixed transport failure");
        if (kind === "native-error") appendFileSync(f.file, JSON.stringify(row("event_msg", { type: "error", message: "fixed permanent error" })) + "\n");
      }
      if (f.prompts() && args[1] === "read") return ok({}, "header\n› Human draft not sent");
      return response;
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false });
    expect(f.prompts()).toBe(1);
    expect(f.calls.filter((c) => c[1] === "send-keys")).toHaveLength(0);
  });
  it("retains an owned TUI that does not exit after verified keys, without force killing it", async () => {
    const f = fixture("timeout"); const h = f.opts.h!;
    f.opts.h = async (args) => args[1] === "send-keys" ? ok() : h(args);
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 75, stopped: false });
    const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
    expect(existsSync(`/proc/${receipt.pid}`)).toBe(true);
    expect(receipt.retirement_authorized).toBe(false);
  });
  it("waits read-only when the exact PID has exited but foreground metadata still names it", async () => {
    const f = fixture("timeout"); const h = f.opts.h!; let lag = 0;
    f.opts.h = async (args) => {
      const response = await h(args);
      if (args[1] === "send-keys" && args[3] === "ctrl+c") {
        const child = children.at(-1)!;
        if (child.exitCode === null && child.signalCode === null) await new Promise<void>((done) => child.once("close", () => done()));
        lag = 3;
      }
      if (args[1] === "process-info" && lag-- > 0) {
        const receipt = JSON.parse(readFileSync(f.opts.receipt, "utf8"));
        return ok({ process_info: { shell_pid: 1000, foreground_process_group_id: receipt.pid } });
      }
      return response;
    };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 124, stopped: true });
    expect(f.calls.filter((c) => c[1] === "send-keys").map((c) => c[3])).toEqual(["esc", "ctrl+c"]);
  });
  it("waits for a split native acceptance row without treating task_started alone as a human turn", async () => {
    const f = fixture("late-complete"); const h = f.opts.h!; let delayed = "";
    f.opts.h = async (args) => {
      const response = await h(args);
      if (args[1] === "prompt") {
        const lines = readFileSync(f.file, "utf8").trimEnd().split("\n");
        delayed = lines.pop()! + "\n"; writeFileSync(f.file, lines.join("\n") + "\n");
      }
      return response;
    };
    const pause = f.opts.pause!;
    f.opts.pause = async (ms) => { if (delayed) { appendFileSync(f.file, delayed); delayed = ""; } await pause(ms); };
    expect(await runLearnerTui(f.opts)).toMatchObject({ code: 0, stopped: true });
  });
  it("accepts a matching native user message as evidence when the submission receipt is uncertain", async () => {
    const f = fixture("prompt-uncertain"); expect((await runLearnerTui(f.opts)).code).toBe(0); expect(f.prompts()).toBe(1);
  });
  it("retries a capacity error by continuing the same native session", async () => {
    const f = fixture("retry-success"); const result = await runLearnerTui(f.opts);
    expect(result.code).toBe(0); expect(result.turn).toBe("turn-2"); expect(f.prompts()).toBe(2);
    expect(f.calls.filter((c) => c[1] === "run")).toHaveLength(1);
    expect(f.events.filter((e) => e.type === "learner_tui_retry")).toHaveLength(1);
  });
  it("continues a known error-idle TUI even when the failed native task_started has no end record", async () => {
    const f = fixture("stale-open-error"); const result = await runLearnerTui(f.opts);
    expect(result.code).toBe(0); expect(f.prompts()).toBe(2);
    expect(f.calls.filter((c) => c[1] === "run")).toHaveLength(1);
  });
  it("uses ten-minute backoff and caps three error continuations without progress", async () => {
    const f = fixture("capacity"); const result = await runLearnerTui(f.opts);
    expect(result.code).toBe(124); expect(f.prompts()).toBe(4);
    expect(f.notices.some((s) => s.includes("three continuations"))).toBe(true);
    expect(f.calls.filter((c) => c[1] === "run")).toHaveLength(1);
  });
  it("preserves an uncertain start without submitting or starting another model", async () => {
    const f = fixture("start-uncertain"); const result = await runLearnerTui(f.opts);
    expect(result).toMatchObject({ code: 75, stopped: false }); expect(f.prompts()).toBe(0);
    expect(f.calls.filter((c) => c[1] === "send-keys")).toHaveLength(0);
    expect(f.calls.filter((c) => c[1] === "run")).toHaveLength(1);
  });
  it("keeps a changed pane and forbids finish/reclamation when retirement cannot be verified", async () => {
    const f = fixture("pane-changed"); const result = await runLearnerTui(f.opts);
    expect(result.code).toBe(75); expect(result.stopped).toBe(false);
    expect(f.calls.some((c) => c[1] === "send-keys" || c[1] === "close")).toBe(false);
    expect(existsSync(f.opts.receipt)).toBe(true);
  });
});
