import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough, Writable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { main } from "../../learner/lib/launcher.js";
import { captureStartupLease, StartupEvidence } from "../../learner/lib/startup-recovery.js";

vi.mock("node:child_process", async (original) => ({ ...await original<typeof import("node:child_process")>(), spawn: vi.fn() }));
vi.mock("../../learner/lib/engines.js", async (original) => ({
  ...await original<typeof import("../../learner/lib/engines.js")>(),
  engineBinary: () => "/fixture/codex",
  withCodexKeys: (request: object) => ({ ...request, home: "/fixture", codexHome: "/fixture/codex", keyFiles: [] }),
  codexChildEnv: () => ({}),
}));

// Exact failure structure from 211302/213504; paths and telemetry are synthetic, never credentials.
const detail = "failed to load AGENTS.md instructions for environment `local`: fs sandbox helper failed with status exit status: 1: error building bubblewrap command: Fatal error: ripgrep unreadable glob scan failed for /fixture: rg: /fixture/sibling/.aws: No such file or directory (os error 2)";
const failure = [
  '2026-10-11T13:13:16Z  INFO codex_otel.trace_safe: event.name="codex.conversation_starts" provider_name=OpenAI',
  '2026-10-11T13:13:17Z  INFO codex_otel.trace_safe: event.name="codex.api_request" success=true endpoint="/models" attempt=0',
  `2026-10-11T13:13:25Z ERROR codex_core::session: Failed to create session: ${detail}`,
  "rg: /fixture/sibling/.codex: No such file or directory (os error 2)",
  `Error: thread/start: thread/start failed: error creating thread: ${detail}`,
  "rg: /fixture/sibling/.codex: No such file or directory (os error 2) (code -32603)",
];
const dirs: string[] = [];
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.mocked(spawn).mockReset();
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "startup-recovery-")); dirs.push(root);
  for (const dir of ["tasks", "work", "ops/state", "runs"]) mkdirSync(join(root, dir), { recursive: true });
  writeFileSync(join(root, "tasks/t.md"), "---\ntools: Read\n---\n固定输入 {{scratch}}。\n");
  const batch = "20261011-224302-fix-batch";
  const file = join(root, "ops/state/learn.json");
  const cwd = join(root, "work");
  const registration = { state: "running", pid: process.pid, worktree: cwd, task: "fix-batch" };
  const save = (changes: object = {}) => writeFileSync(file, JSON.stringify({ batches: { [batch]: { ...registration, ...changes } } }));
  save();
  const env = { HOME: root, LEARNER_BATCH_ID: batch, LEARNER_STATE_FILE: file };
  const output: string[] = [];
  return { root, cwd, env, save, output,
    run: (extra: string[] = []) => main(["--engine", "codex", "--task", "t", "--cwd", cwd, ...extra], {
      projectRoot: root, tasksDir: join(root, "tasks"), runsDir: join(root, "runs"), env,
      secretFiles: [], checkCodex: undefined, checkKeys: undefined, refreshCodexAuth: undefined,
      out: (text) => output.push(text), err: () => undefined,
    }),
    records: () => readFileSync(join(root, "runs", readdirSync(join(root, "runs")).find((f) => f.endsWith(".jsonl"))!), "utf8")
      .trim().split("\n").map((line) => JSON.parse(line)),
  };
}

interface Attempt {
  stderr?: string[];
  stdout?: string;
  code?: number;
  signal?: string;
  closeDelay?: number;
  beforeClose?: () => void;
}

function children(attempts: Attempt[]) {
  const inputs: string[] = [];
  const order: string[] = [];
  vi.mocked(spawn).mockImplementation((() => {
    const index = inputs.length;
    const plan = attempts[index];
    if (!plan) throw new Error("unexpected replay");
    inputs.push(""); order.push(`spawn${index}`);
    const child = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(), stderr: new PassThrough(), kill: vi.fn(),
      stdin: new Writable({ write(chunk, _encoding, done) { inputs[index] += chunk.toString(); done(); } }),
    });
    queueMicrotask(() => {
      child.stdout.end(plan.stdout ?? "");
      child.stderr.end((plan.stderr ?? []).join("\n") + "\n");
      child.emit("exit", plan.code ?? 1, plan.signal ?? null);
      setTimeout(() => {
        plan.beforeClose?.();
        order.push(`close${index}`);
        child.emit("close", plan.code ?? 1, plan.signal ?? null);
      }, plan.closeDelay ?? 0);
    });
    return child;
  }) as typeof spawn);
  return { inputs, order };
}

describe("bounded learner startup recovery", () => {
  it("retries exact pre-session ENOENT after close with identical input and one final completion", async () => {
    const f = fixture();
    const fake = children([{ stderr: failure, closeDelay: 10 }, { code: 0 }]);
    expect(await f.run()).toBe(0);
    expect(fake.inputs).toHaveLength(2);
    expect(fake.inputs[0]).toBe(fake.inputs[1]);
    expect(fake.order).toEqual(["spawn0", "close0", "spawn1", "close1"]);
    const rows = f.records();
    const starts = rows.filter((r) => r.type === "learner_startup_attempt");
    expect(starts.map((r) => r.attempt)).toEqual([1, 2]);
    for (const field of ["batch", "lease", "input_sha256", "command_sha256"]) expect(starts[0][field]).toBe(starts[1][field]);
    expect(starts[0].lease).toMatch(/^[a-f0-9]{64}$/);
    expect(rows.filter((r) => r.type === "learner_startup_exit").map((r) => r.exit_code)).toEqual([1, 0]);
    expect(rows.filter((r) => r.type === "learner_stderr" && r.attempt === 1).map((r) => r.text)).toEqual(failure);
    expect(rows.filter((r) => r.type === "learner_summary")).toHaveLength(1);
    expect(f.output).toHaveLength(1);
    expect(vi.mocked(spawn).mock.calls[0]).toEqual(vi.mocked(spawn).mock.calls[1]);
  });

  it("caps persistent pre-session failures at two additional attempts", async () => {
    const f = fixture(); children(Array.from({ length: 3 }, () => ({ stderr: failure })));
    expect(await f.run()).toBe(1);
    expect(spawn).toHaveBeenCalledTimes(3);
    expect(f.records().filter((r) => r.type === "learner_startup_exit")).toHaveLength(3);
  });

  it.each([
    { stderr: failure.map((s) => s.replaceAll("No such file or directory (os error 2)", "Permission denied (os error 13)")) },
    { stderr: ["Error: unrelated startup failure"] },
    { stderr: [failure[4]!] }, // Zero tokens alone, or a partial diagnostic, does not prove no session.
    { stderr: [...failure, '2026-10-11Z INFO event.name="codex.model_request"'] },
    { stderr: failure, stdout: '{"type":"thread.started","thread_id":"fixture"}\n' },
    { stderr: failure, stdout: '{"type":"session.started"}\n' },
    { stderr: failure, stdout: '{"type":"item.started","item":{"type":"command_execution"}}\n' },
    { stderr: failure, stdout: '{"type":"turn.completed","usage":{"input_tokens":0}}\n' },
    { stderr: failure, stdout: "unknown event\n" },
    { stderr: failure, signal: "SIGTERM" },
    { stderr: failure, code: 2 },
  ])("never retries ambiguous errors or any session/model/tool activity %#", async (plan) => {
    const f = fixture(); children([plan]);
    expect(await f.run()).toBe(1);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it.each(["lost", "replaced", "absent", "cancelled"])("refuses a %s lease", async (kind) => {
    const f = fixture();
    children([{ stderr: failure, beforeClose: () => {
      if (kind === "absent") rmSync(f.env.LEARNER_STATE_FILE);
      else f.save(kind === "lost" ? { state: "lost" } : kind === "replaced" ? { pid: 99999999 } : { cancelled: true });
    } }]);
    expect(await f.run()).toBe(1);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("checks lease ownership again after backoff", async () => {
    const f = fixture();
    children([{ stderr: failure, beforeClose: () => { setTimeout(() => f.save({ state: "lost" }), 30); } }]);
    expect(await f.run()).toBe(1);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("does not retry an unregistered standalone launch", async () => {
    const f = fixture(); delete (f.env as Partial<typeof f.env>).LEARNER_BATCH_ID;
    children([{ stderr: failure }]);
    expect(await f.run()).toBe(1);
    expect(spawn).toHaveBeenCalledTimes(1);
  });

  it("keeps cancellation terminal even if the child reports an eligible error", async () => {
    const f = fixture();
    children([{ stderr: failure, beforeClose: () => { (process.listeners("SIGTERM").at(-1)! as () => void)(); } }]);
    expect(await f.run()).toBe(1);
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(f.records().at(-1).cancelled).toBe(true);
  });

  it("keeps the original timeout across startup attempts", async () => {
    vi.useFakeTimers(); const f = fixture();
    children([{ stderr: failure, closeDelay: 59_800 }, { stderr: failure, closeDelay: 1000 }]);
    const result = f.run(["--timeout-min", "1"]);
    await vi.runAllTimersAsync();
    expect(await result).toBe(124);
    expect(spawn).toHaveBeenCalledTimes(1); // The deadline expires during backoff.
    expect(f.records().at(-1).timed_out).toBe(true);
  });
});

it("fails closed when error capture exceeds its fixed bound", () => {
  const evidence = new StartupEvidence();
  for (const line of failure) evidence.stderr(line);
  expect(evidence.transientBeforeSession()).toBe(true);
  evidence.stderr(" ".repeat(65_537));
  expect(evidence.transientBeforeSession()).toBe(false);
});

it("binds lease identity to the registered live owner and rejects paths outside ops", () => {
  const f = fixture();
  const lease = captureStartupLease(f.env, f.root, f.cwd);
  expect(lease?.current()).toBe(true);
  f.save({ state: "failed" });
  expect(lease?.current()).toBe(false);
  expect(captureStartupLease({ ...f.env, LEARNER_STATE_FILE: "/fixture/learn.json" }, f.root, f.cwd)).toBeUndefined();
});
