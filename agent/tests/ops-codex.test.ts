/**
 * The codex ops session's runner and scheduler (docs/codex-ops.md): its command lines and permission profile, the
 * broker's allow-list and its round trip with ops/codex-ops-do.sh, the event queue and the wake message, the session
 * growth read from codex's session file, the learning loop's mechanical half (ops/codex-ops-learn.py: victories, a new
 * ascension, post-mortem batches with a fake learner, the 10-pending inbox line) and the stall backoff of
 * ops/codex-ops.sh. Temp directories and fake commands only: no codex, no game, nothing real is read or started.
 */
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { archiveCodexTranscripts } from "../../ops/codex/archive.js";
import { startBroker } from "../../ops/codex/main.js";
import {
  ACTIONS,
  OPS_PROFILE,
  SCHEDULER_FILES,
  initCommand,
  initMessage,
  opsPaths,
  opsRequest,
  readQueue,
  resumeCommand,
  sessionGrowth,
  validateRequest,
  wakeMessage,
} from "../../ops/codex/lib.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tmp = mkdtempSync(join(tmpdir(), "ops-codex-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const SESSION = "01a10717-c859-7592-9012-ad4251284920";

function request(root: string) {
  const home = join(tmp, "home");
  mkdirSync(join(home, ".codex"), { recursive: true });
  writeFileSync(join(home, ".jev_api_keys"), "fake");
  return opsRequest(root, { HOME: home, CODEX_HOME: join(home, ".codex") });
}

describe("command lines", () => {
  const root = join(tmp, "proj");
  mkdirSync(root, { recursive: true });

  it("init: codex exec with the ops profile, xhigh, compaction limit, the prompt on stdin", () => {
    const cmd = initCommand(request(root), "PROMPT", "codex");
    expect(cmd.args.slice(0, 2)).toEqual(["exec", "--json"]);
    expect(cmd.args).toContain(`default_permissions="${OPS_PROFILE}"`);
    expect(cmd.args).toContain('model_reasoning_effort="xhigh"');
    expect(cmd.args).toContain('service_tier="priority"');
    expect(cmd.args).toContain("gpt-6.1-sol");
    expect(cmd.args).toContain("model_auto_compact_token_limit=200000");
    expect(cmd.args.at(-1)).toBe("-");
    expect(cmd.stdin).toBe("PROMPT");
    const profile = cmd.args.find((arg) => arg.startsWith(`permissions.${OPS_PROFILE}.filesystem=`))!;
    expect(profile).toContain(`"${join(root, ".git")}" = "write"`);
    expect(profile).toContain(`"${join(root, ".git", "hooks")}" = "read"`);
    expect(profile).toContain(`"${join(root, ".git", "config")}" = "read"`);
    for (const file of SCHEDULER_FILES) expect(profile).not.toContain(`"${join(root, file)}" = "read"`); // Dai 2026-10-05: codex may edit them
    expect(profile).toContain(`"${join(tmp, "home", ".jev_api_keys")}" = "none"`);
    expect(profile).toContain(`"${join(tmp, "home", ".codex", "auth.json")}" = "none"`);
    expect(profile).toContain('"**/.env" = "none"');
  });

  it("resume: the same options without --cd, the session id, then '-'", () => {
    const cmd = resumeCommand(request(root), SESSION, "EVENTS", "codex");
    expect(cmd.args.slice(0, 2)).toEqual(["exec", "resume"]);
    expect(cmd.args).not.toContain("--cd");
    expect(cmd.args.slice(-2)).toEqual([SESSION, "-"]);
    expect(cmd.args).toContain(`default_permissions="${OPS_PROFILE}"`);
    expect(cmd.args).toContain("model_auto_compact_token_limit=200000");
    expect(cmd.stdin).toBe("EVENTS");
    expect(cmd.args).toContain('service_tier="priority"');
    expect(() => resumeCommand(request(root), "../../etc", "x", "codex")).toThrow();
  });

  it("a worktree root grants its main checkout's .git", () => {
    const worktree = join(root, ".worktrees", "step");
    mkdirSync(worktree, { recursive: true });
    const profile = initCommand(request(worktree), "", "codex").args.find((arg) => arg.startsWith("permissions."))!;
    expect(profile).toContain(`"${join(root, ".git")}" = "write"`);
  });
});

describe("broker requests", () => {
  it("allows only the listed actions with clean arguments", () => {
    expect(validateRequest({ action: "procs" })).toEqual({ ok: true, action: "procs", args: [] });
    expect(validateRequest({ action: "kill", args: ["12345"] })).toEqual({ ok: true, action: "kill", args: ["12345"] });
    expect(validateRequest({ action: "postmortem", args: ["AAAAAAAAAAAA,BBBBBBBBBBBB"] }).ok).toBe(true);
    expect(validateRequest({ action: "rm", args: [] }).ok).toBe(false);
    expect(validateRequest({ action: "toString" }).ok).toBe(false);
    expect(validateRequest({ action: "kill" }).ok).toBe(false);
    expect(validateRequest({ action: "kill", args: ["1; rm -rf /"] }).ok).toBe(false);
    expect(validateRequest({ action: "kill", args: ["-9"] }).ok).toBe(false);
    expect(validateRequest({ action: "procs", args: ["x"] }).ok).toBe(false);
    expect(validateRequest("procs").ok).toBe(false);
  });

  it("every action is implemented by ops/codex-ops-actions.sh and listed by ops/codex-ops-do.sh", () => {
    const actions = readFileSync(join(REPO, "ops", "codex-ops-actions.sh"), "utf8");
    const doc = readFileSync(join(REPO, "ops", "codex-ops-do.sh"), "utf8");
    for (const name of Object.keys(ACTIONS)) {
      expect(actions).toMatch(new RegExp(`^  ${name}\\)`, "m"));
      expect(doc).toContain(name);
    }
  });

  it("round trip: codex-ops-do.sh -> broker -> actions script -> answer and exit code", async () => {
    const root = join(tmp, "broker-root");
    mkdirSync(join(root, "ops"), { recursive: true });
    writeFileSync(join(root, "ops", "codex-ops-actions.sh"), 'echo "ran $1 ${2:-}"; [ "$1" = kill ] && exit 7; exit 0\n');
    const dir = join(root, "ops", "codex-ops");
    const paths = opsPaths(root, { CODEX_OPS_DIR: dir });
    const logs: string[] = [];
    const stop = startBroker(paths, root, (text) => logs.push(text));
    const run = (args: string[]) =>
      new Promise<{ code: number | null; out: string }>((done) => {
        const child = spawn("bash", [join(REPO, "ops", "codex-ops-do.sh"), ...args], { env: { ...process.env, CODEX_OPS_DIR: dir, CODEX_OPS_DO_WAIT: "20" } });
        let out = "";
        child.stdout.on("data", (chunk: Buffer) => (out += chunk.toString()));
        child.stderr.on("data", (chunk: Buffer) => (out += chunk.toString()));
        child.on("close", (code: number | null) => done({ code, out }));
      });
    try {
      expect(await run(["procs"])).toEqual({ code: 0, out: "ran procs \n" });
      expect(await run(["kill", "42"])).toEqual({ code: 7, out: "ran kill 42\n" });
      const refused = await run(["rm-rf"]);
      expect(refused.code).toBe(2);
      expect(refused.out).toContain("没有这个动作");
      const bad = await run(["kill", "1;x"]);
      expect(bad.code).toBe(2); // refused by the wrapper itself
    } finally {
      await stop();
    }
    expect(logs.some((line) => line.startsWith("broker refused"))).toBe(true);
    expect(readdirSync(join(dir, "broker"))).toEqual([]);
  }, 30_000);
});

describe("events", () => {
  it("reads the queue oldest first and numbers the events in the message", () => {
    const queue = join(tmp, "queue");
    mkdirSync(queue, { recursive: true });
    writeFileSync(join(queue, "1791120398623500015-stall.md"), "STALL: no play process running\n");
    writeFileSync(join(queue, "991120398623500015-victory.md"), "通关：X\n");
    writeFileSync(join(queue, ".tmp-ignored.md"), "partial");
    writeFileSync(join(queue, "notes.txt"), "not an event");
    const events = readQueue(queue);
    expect(events.map((e) => e.kind)).toEqual(["victory", "stall"]);
    const now = new Date(2026, 9, 4, 21, 30);
    const message = wakeMessage(events, now);
    expect(message).toContain("【调度器事件】2026-10-04 21:30（CST），共 2 件");
    expect(message).toContain("1. [victory] 通关：X");
    expect(message).toContain("2. [stall] STALL: no play process running");
    expect(message).toContain("ops/codex-ops-do.sh");
    const first = initMessage("PROMPT", events, now);
    expect(first.startsWith("PROMPT")).toBe(true);
    expect(first).toContain("按「开工」做");
    expect(first).toContain("[stall]");
  });

  it("reads the session's growth from codex's session file", () => {
    const rows = [
      { type: "event_msg", payload: { type: "task_started" } },
      { type: "event_msg", payload: { type: "token_count", info: { last_token_usage: { input_tokens: 10590 }, model_context_window: 258400 }, rate_limits: { primary: { used_percent: 1 } } } },
      { type: "compacted", payload: { message: "" } },
      { type: "event_msg", payload: { type: "task_started" } },
      { type: "event_msg", payload: { type: "token_count", info: { last_token_usage: { input_tokens: 4200 }, model_context_window: 258400 }, rate_limits: { primary: { used_percent: 3 } } } },
    ];
    const g = sessionGrowth(`${rows.map((row) => JSON.stringify(row)).join("\n")}\nnot json\n`);
    expect(g).toMatchObject({ turns: 2, contextTokens: 4200, window: 258400, compactions: 1, usedPercent: 3 });
  });
});

/* ---- the scheduler's scripts ----------------------------------------------------------------------------- */

function project(name: string): { root: string; dir: string; env: NodeJS.ProcessEnv } {
  const root = join(tmp, name);
  for (const sub of ["logs", "notes", "ops"]) mkdirSync(join(root, sub), { recursive: true });
  writeFileSync(join(root, "notes", "lessons.md"), "# lessons\n\n## OLDRUN000001（A9，第17层，x）\n");
  writeFileSync(join(root, "ops", "win-notified"), "OLDWIN000001\n");
  const dir = join(root, "ops", "codex-ops");
  return { root, dir, env: { ...process.env, CODEX_OPS_ROOT: root, CODEX_OPS_DIR: dir, CODEX_OPS_NO_DRAIN: "1" } };
}

function jsonl(rows: object[]): string {
  return rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
}

function learn(env: NodeJS.ProcessEnv, ...args: string[]) {
  return spawnSync("python3", [join(REPO, "ops", "codex-ops-learn.py"), ...args], { env, encoding: "utf8" });
}

function waitFor(check: () => boolean, ms = 15_000): void {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error("timed out");
    spawnSync("sleep", ["0.2"]);
  }
}

describe("learning loop (ops/codex-ops-learn.py)", () => {
  it("victories, a new ascension, a post-mortem batch with a fake learner, the 10-pending inbox line", () => {
    const { root, dir, env } = project("learn");
    const runs = [
      { run_id: "OLDRUN000001", victory: true, floor: 50 }, // a legacy Ironclad win: not the Silent's
      { run_id: "SILENT000001", character: "SILENT", ascension: 0, victory: true, floor: 50, ended: "2026-10-05T01:00:00Z" },
      { run_id: "SILENT000002", character: "SILENT", ascension: 1, victory: false, floor: 20 },
    ];
    writeFileSync(join(root, "logs", "runs.jsonl"), jsonl(runs));
    writeFileSync(join(root, "logs", "run-config.jsonl"), jsonl([{ run_id: "SILENT000002", character: "SILENT", target_ascension: 1 }]));
    // The fake learner appends a post-mortem heading per run (it runs in the project root, as the real one).
    // It also adds one learning-ledger item for SILENT000001 through the real helper (learner/ledger.py).
    const item = { character: "silent", kind: "fight", claim: "测试", evidence: [{ run: "SILENT000001", floor: 1 }], first_run: "SILENT000001", prior: "unknown", status: "observed", by: "learner:postmortem", where: { lessons: ["SILENT000001"] } };
    const fakeLearner =
      `for r in $(echo "$1" | tr , ' '); do echo "## $r（A0，静默猎手，第1层，测试）" >> notes/lessons.md; done; ` +
      `echo '${JSON.stringify(item)}' | python3 ${join(REPO, "learner", "ledger.py")} add > /dev/null; echo "回报 json"`;
    const pending = `printf '12\\nA00000000001,A00000000002,A00000000003,A00000000004,A00000000005,A00000000006,A00000000007,A00000000008,A00000000009,A00000000010,A00000000011,A00000000012\\n'`;
    const ledgerFile = join(root, "paper", "materials", "learning", "ledger.jsonl");
    const tickEnv = { ...env, LEARNER_CMD: fakeLearner, CODEX_OPS_PENDING_CMD: pending, LEDGER_FILE: ledgerFile, LEDGER_RUNS: join(root, "logs", "runs.jsonl"), LEDGER_VERSIONS: "none" };

    const first = learn(tickEnv, "tick");
    expect(first.status, first.stderr).toBe(0);
    const report = JSON.parse(first.stdout);
    expect(report.victory).toHaveLength(1);
    expect(report.ascension).toEqual([]); // first sight of the character's level: remembered, no event
    expect(report.dispatched[0]).toMatch(/^\d{8}-\d{6}$/);
    expect(report.pending_notified).toBe(true);
    expect(readFileSync(join(root, "ops", "win-notified"), "utf8").trim().split("\n")).toEqual(["OLDWIN000001", "SILENT000001"]);
    expect(readFileSync(join(root, "ops", "inbox-dev.md"), "utf8")).toContain("满 12 局");

    waitFor(() => readQueue(join(dir, "queue")).some((e) => e.kind === "learner-done"));
    const done = readQueue(join(dir, "queue")).find((e) => e.kind === "learner-done")!;
    expect(done.text).toContain("SILENT000001,SILENT000002");
    expect(done.text).toContain("exit 0");
    expect(done.text).toContain("还没有：无");
    expect(done.text).toContain("SILENT000001 silent-0001；SILENT000002 无。没有条目的局：SILENT000002");
    expect(done.text).toContain("paper/materials/learning/ledger.jsonl）");
    expect(readFileSync(join(dir, "learner", `${report.dispatched[0]}.out`), "utf8")).toContain("回报 json");

    // Next tick: nothing new (no second victory event, no batch, the same pending set is not announced again).
    const second = JSON.parse(learn(tickEnv, "tick").stdout);
    expect(second).toMatchObject({ victory: [], ascension: [], dispatched: null, pending_notified: false });

    // The climb moves to A2: one ascension-up event.
    writeFileSync(join(root, "logs", "run-config.jsonl"), jsonl([{ run_id: "SILENT000002", character: "SILENT", target_ascension: 1 }, { run_id: "SILENT000003", character: "SILENT", target_ascension: 2 }]));
    const third = JSON.parse(learn(tickEnv, "tick").stdout);
    expect(third.ascension).toHaveLength(1);
    const up = readQueue(join(dir, "queue")).find((e) => e.kind === "ascension-up")!;
    expect(up.text).toContain("A2（上一级 A1）");
    expect(up.text).toContain("SILENT000003");
  }, 40_000);

  it("a failed batch is retried later; dispatch refuses unknown runs and a second batch", () => {
    const { root, dir, env } = project("learn-fail");
    writeFileSync(join(root, "logs", "runs.jsonl"), jsonl([{ run_id: "SILENT000009", character: "SILENT", ascension: 0, victory: false }]));
    const failEnv = { ...env, LEARNER_CMD: "echo quota >&2; exit 1", CODEX_OPS_PENDING_CMD: "echo 0" };
    expect(learn(failEnv, "dispatch", "--runs", "SILENT00000X").status).toBe(1);
    expect(learn(failEnv, "dispatch", "--runs", "bad").status).toBe(2);
    const ok = learn(failEnv, "dispatch", "--runs", "SILENT000009");
    expect(ok.status, ok.stdout).toBe(0);
    waitFor(() => readQueue(join(dir, "queue")).some((e) => e.kind === "learner-done"));
    const done = readQueue(join(dir, "queue")).find((e) => e.kind === "learner-done")!;
    expect(done.text).toContain("exit 1");
    expect(done.text).toContain("1 小时后重派");
    const state = JSON.parse(readFileSync(join(dir, "learn.json"), "utf8"));
    expect(state.runs.SILENT000009.attempts).toBe(1);
    expect(state.runs.SILENT000009.retry_at).toBeGreaterThan(Date.now() / 1000 + 3000);
    // Within the hour the tick does not re-dispatch it.
    expect(JSON.parse(learn(failEnv, "tick").stdout).dispatched).toBeNull();
  }, 30_000);
});

describe("stall backoff (ops/codex-ops.sh tick stall)", () => {
  it("wakes once per cause, waits before the next wake, forgets the cause when OK", () => {
    const { dir, env } = project("stall");
    const check = join(tmp, "stall-check.sh");
    const tick = (output: string) => {
      writeFileSync(check, `printf '%s\\n' "${output}"\n`);
      chmodSync(check, 0o755);
      const run = spawnSync("bash", [join(REPO, "ops", "codex-ops.sh"), "tick", "stall"], { env: { ...env, CODEX_OPS_STALL_CHECK: check }, encoding: "utf8" });
      expect(run.status, run.stderr).toBe(0);
      return readQueue(join(dir, "queue")).filter((e) => e.kind === "stall");
    };
    expect(tick("OK (between runs)")).toHaveLength(0);
    const first = tick("STALL: console silent 500s");
    expect(first).toHaveLength(1);
    expect(first[0]!.text).toContain("第 1 次");
    // Same cause (the number differs): within the backoff, no new event.
    expect(tick("STALL: console silent 800s")[0]!.name).toBe(first[0]!.name);
    expect(readFileSync(join(dir, "stall.state"), "utf8")).toMatch(/^\d+ 1 \d+\n$/);
    // Another cause: a fresh event replaces the queued one.
    const other = tick("STALL: no play process running");
    expect(other).toHaveLength(1);
    expect(other[0]!.text).toContain("no play process running");
    expect(tick("OK (last decision 3s ago)")).toHaveLength(1); // the queued event stays for the wake
    expect(existsSync(join(dir, "stall.state"))).toBe(false);
  }, 30_000);
});

describe("transcript archive for the paper (ops/codex/archive.ts)", () => {
  it("copies the ops wakes and rollout, the learner run logs and their codex rollouts, keys redacted, incrementally", () => {
    const root = join(tmp, "archive");
    const home = join(tmp, "archive-codex");
    const opsDir = join(root, "ops", "codex-ops");
    const secret = "FAKEKEYVALUE0123456789abcdef";
    const thread = "01a10799-0000-7000-8000-000000000001";
    const lost = "01a10799-0000-7000-8000-00000000dead";
    const day = join(home, "sessions", "2026", "10", "04");
    mkdirSync(join(opsDir, "wakes"), { recursive: true });
    writeFileSync(join(opsDir, "wakes", "20261004-2200-wake.jsonl"), `{"msg":"wake ${secret}"}\n`);
    writeFileSync(join(opsDir, "wakes.jsonl"), "{}\n");
    mkdirSync(day, { recursive: true });
    writeFileSync(join(day, `rollout-2026-10-04T22-00-00-${SESSION}.jsonl`), `{"ops":"${secret}"}\n`);
    writeFileSync(join(day, `rollout-2026-10-04T22-10-00-${thread}.jsonl`), '{"learner":1}\n');
    for (const dir of [join(root, "learner", "runs"), join(root, ".worktrees", "exp", "learner", "runs")]) mkdirSync(dir, { recursive: true });
    writeFileSync(join(root, "learner", "runs", "20261004-221000-postmortem.jsonl"), `{"type":"learner_launch"}\n{"type":"thread.started","thread_id":"${thread}"}\n`);
    writeFileSync(join(root, ".worktrees", "exp", "learner", "runs", "20261004-230000-experience-update.jsonl"), `{"type":"thread.started","thread_id":"${lost}"}\n`);

    const options = { root, codexHome: home, opsDir, opsSession: SESSION, secrets: [secret] };
    const first = archiveCodexTranscripts(options);
    const out = join(root, "paper", "materials", "session", "codex");
    expect(first.outDir).toBe(out);
    expect([...first.copied].sort()).toEqual([
      join("learner", "rollouts", `rollout-${thread}.jsonl`),
      join("learner", "runs", "20261004-221000-postmortem.jsonl"),
      join("learner", "runs", "20261004-230000-experience-update.jsonl"),
      join("ops", `rollout-${SESSION}.jsonl`),
      join("ops", "wakes.jsonl"),
      join("ops", "wakes", "20261004-2200-wake.jsonl"),
    ]);
    expect(first.redacted).toBe(2);
    expect(first.missingRollouts).toEqual([lost]);
    expect(readFileSync(join(out, "ops", `rollout-${SESSION}.jsonl`), "utf8")).toBe('{"ops":"[REDACTED]"}\n');
    expect(readFileSync(join(out, "ops", "wakes", "20261004-2200-wake.jsonl"), "utf8")).not.toContain(secret);

    // Nothing changed: nothing copied again; a grown wake log is copied again.
    expect(archiveCodexTranscripts(options).copied).toEqual([]);
    writeFileSync(join(opsDir, "wakes.jsonl"), "{}\n{}\n");
    expect(archiveCodexTranscripts(options).copied).toEqual([join("ops", "wakes.jsonl")]);
  });
});
