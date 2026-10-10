/**
 * herdr hosting of the ops processes (docs/codex-ops.md「herdr 托管」): the interactive TUI's arguments, the screen and
 * session-file readers of the herdr wake, ops/herdr-host.sh against a fake herdr binary (panes run real commands), the
 * wake through the TUI (herdr.ts herdrWake), a learner batch hosted in a pane, and the scheduler treating a deferred
 * wake (exit 75) as no failure. Temp directories and fake commands only: no herdr server, no codex, nothing real starts.
 */
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import { argsHash, composerState, herdrWake, openTurn, rolloutTurn } from "../../ops/codex/herdr.js";
import { OPS_PROFILE, hostingMode, interactiveArgs, opsRequest, readQueue, validateRequest } from "../../ops/codex/lib.js";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FAKE = join(REPO, "agent", "tests", "fixtures-herdr", "fake-herdr.py");
const HOST = join(REPO, "ops", "herdr-host.sh");
const tmp = mkdtempSync(join(tmpdir(), "ops-herdr-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

const SESSION = "01a10717-c859-7592-9012-ad4251284920";
chmodSync(FAKE, 0o755);

function waitFor(check: () => boolean, ms = 15_000): void {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error("timed out");
    spawnSync("sleep", ["0.2"]);
  }
}

/** A fake herdr world: its state dir, the env for ops/herdr-host.sh, and a runner. */
function world(name: string) {
  const dir = join(tmp, name);
  const fake = join(dir, "herdr");
  mkdirSync(join(dir, "proj", "ops", "codex-ops"), { recursive: true });
  mkdirSync(fake, { recursive: true });
  const env = {
    ...process.env,
    HERDR_BIN: FAKE,
    FAKE_HERDR_DIR: fake,
    HERDR_HOST_WORKSPACE: "sts2-test",
    HERDR_HOST_CWD: join(dir, "proj"),
    HERDR_HOST_STATE: join(dir, "proj", "ops", "codex-ops", "herdr.json"),
    // Expose the gap between pane removal and the host's subsequent registry update.
    FAKE_HERDR_CLOSE_RETURN_DELAY: name === "close" ? "0.6" : "0",
  };
  const host = (...args: string[]) => spawnSync("bash", [HOST, ...args], { env, encoding: "utf8", timeout: 60_000 });
  const state = () => JSON.parse(readFileSync(join(fake, "state.json"), "utf8"));
  return { dir, fake, env, host, state };
}

describe("interactive TUI arguments", () => {
  const root = join(tmp, "proj-args");
  mkdirSync(root, { recursive: true });
  const home = join(tmp, "home");
  mkdirSync(join(home, ".codex"), { recursive: true });
  writeFileSync(join(home, ".jev_api_keys"), "fake");
  const request = opsRequest(root, { HOME: home, CODEX_HOME: join(home, ".codex") });

  it("resume <options> --no-daemon <id>: the exec options minus what only exec has", () => {
    const args = interactiveArgs(request, SESSION);
    expect(args[0]).toBe("resume");
    expect(args.at(-1)).toBe(SESSION);
    expect(args).toContain("--no-daemon");
    for (const execOnly of ["exec", "--json", "--ignore-user-config", "--ignore-rules", "-"]) expect(args).not.toContain(execOnly);
    expect(args.slice(1, 3)).toEqual(["--cd", root]);
    expect(args).toContain(`default_permissions="${OPS_PROFILE}"`);
    expect(args).toContain('approval_policy="never"');
    expect(args).toContain('service_tier="priority"');
    expect(args).toContain("model_auto_compact_token_limit=200000");
    expect(args).toContain("hooks"); // --disable hooks: no hook (herdr's or anyone's) runs in the ops TUI
    expect(args.find((arg) => arg.startsWith(`permissions.${OPS_PROFILE}.filesystem=`))).toContain(`"${join(home, ".jev_api_keys")}" = "none"`);
    expect(() => interactiveArgs(request, "x; rm -rf /")).toThrow();
  });

  it("without a session: a fresh TUI with the same options (throwaway tests)", () => {
    const args = interactiveArgs(request);
    expect(args[0]).toBe("--cd");
    expect(args).not.toContain("resume");
    expect(argsHash(args)).not.toBe(argsHash(interactiveArgs(request, SESSION)));
  });
});

describe("screen and session-file readers", () => {
  it("composer: the dim placeholder is empty, typed text is not (codex 0.160 screens)", () => {
    const placeholder = "\u001b[0m\u001b[1m› \u001b[0m\u001b[2mAsk Codex to do anything\u001b[0m\r";
    const typed = "\u001b[0m\u001b[1m› \u001b[0mhalf typed by a human\r";
    expect(composerState(`top\n${placeholder}\n\n  model`)).toBe("empty");
    expect(composerState(`top\n${typed}\n`)).toBe("text");
    expect(composerState("\u001b[0m\u001b[1m› \u001b[0m   \n")).toBe("empty");
    expect(composerState("no composer here\n")).toBe("none");
    // The last composer on the screen counts (an earlier "›" line is the transcript's echo of a sent prompt).
    expect(composerState(`\u001b[1m› \u001b[0mold prompt\n${placeholder}`)).toBe("empty");
  });

  const row = (type: string, payload: Record<string, unknown>) => JSON.stringify({ type, payload });
  const ours = "【调度器事件】2026-10-05 22:30（CST），共 1 件：";

  it("finds our turn by the marker, its answer and its tokens; another turn before it does not count", () => {
    const text = [
      row("event_msg", { type: "task_started", turn_id: "t-human" }),
      row("response_item", { type: "message", role: "user", content: [{ type: "input_text", text: "a person's question" }] }),
      row("event_msg", { type: "task_complete", turn_id: "t-human", last_agent_message: "human answer" }),
      row("event_msg", { type: "task_started", turn_id: "t-ops" }),
      row("event_msg", { type: "user_message", message: `${ours}\n1. [stall] x` }),
      row("token_usage_record", { turn_id: "t-ops", turn_token_usage: { input_tokens: 5000, cached_input_tokens: 4000, cache_write_input_tokens: 0, output_tokens: 70, reasoning_output_tokens: 20 } }),
      "{partial line",
    ].join("\n");
    const open = rolloutTurn(text, ours);
    expect(open).toMatchObject({ turnId: "t-ops", complete: false, aborted: false, openTurn: "t-ops" });
    expect(open.tokens).toEqual({ input: 1000, output: 70, cacheRead: 4000, cacheCreation: 0, reasoning: 20 });
    const done = rolloutTurn(`${text}\n${row("event_msg", { type: "task_complete", turn_id: "t-ops", last_agent_message: "done" })}`, ours);
    expect(done).toMatchObject({ complete: true, lastMessage: "done", openTurn: undefined });
    expect(done.rows.length).toBe(4);
    expect(openTurn(text)).toBe("t-ops");
    expect(rolloutTurn(`${text}\n${row("event_msg", { type: "turn_aborted", turn_id: "t-ops" })}`, ours).aborted).toBe(true);
  });

  it("a message steered into a turn already running belongs to that turn", () => {
    const text = [
      row("response_item", { type: "message", role: "user", content: [{ type: "input_text", text: ours }] }),
      row("event_msg", { type: "task_complete", turn_id: "t-running", last_agent_message: "both handled" }),
    ].join("\n");
    expect(rolloutTurn(text, ours)).toMatchObject({ turnId: "t-running", complete: true, lastMessage: "both handled" });
  });

  it("hosting mode: env first, then the hosting file, then the default", () => {
    const dir = join(tmp, "hosting");
    mkdirSync(dir, { recursive: true });
    expect(hostingMode(dir, "ops", "CODEX_OPS_MODE", "exec", {})).toBe("exec");
    writeFileSync(join(dir, "hosting"), "# comment\nops=herdr\nlearners = herdr\n");
    expect(hostingMode(dir, "ops", "CODEX_OPS_MODE", "exec", {})).toBe("herdr");
    expect(hostingMode(dir, "learners", "X", "setsid", {})).toBe("herdr");
    expect(hostingMode(dir, "autoplay", "X", "setsid", {})).toBe("setsid");
    expect(hostingMode(dir, "ops", "CODEX_OPS_MODE", "exec", { CODEX_OPS_MODE: "exec" })).toBe("exec");
  });
});

describe("ops/herdr-host.sh (fake herdr)", () => {
  it("only permits registered-batch-shaped viewer requests without arbitrary commands or target panes", () => {
    expect(validateRequest({ action: "learner-log-tab", args: ["20261010-164301-strategy-proposal"] }).ok).toBe(true);
    for (const args of [["ops"], ["../file"], ["1234"], ["20261010-164301-strategy-proposal", "wJ"]]) {
      expect(validateRequest({ action: "learner-log-tab", args }).ok).toBe(false);
    }
  });
  it("new learner tabs follow the live ops pane when workspace labels are duplicated", () => {
    const w = world("ops-workspace");
    expect(w.host("ensure-workspace").stdout.trim()).toBe("w1");
    const oldPane = w.host("open-pane", "learner-next").stdout.trim();
    const busyRun = w.host("run", "learner-active", "--close-on-exit", "--", "sleep", "30");
    const busyPane = busyRun.stdout.trim();
    const second = spawnSync(FAKE, ["workspace", "create", "--label", "sts2-test", "--cwd", join(w.dir, "proj")], { env: w.env, encoding: "utf8" });
    const ops = JSON.parse(second.stdout).result.root_pane;
    spawnSync(FAKE, ["pane", "rename", ops.pane_id, "ops"], { env: w.env });
    const registry = join(w.dir, "proj", "ops", "codex-ops", "herdr.json");
    const registered = JSON.parse(readFileSync(registry, "utf8"));
    registered.panes.ops = { pane_id: ops.pane_id };
    writeFileSync(registry, JSON.stringify(registered));
    expect(w.host("ensure-workspace").stdout.trim()).toBe("w2");
    const created = w.host("open-pane", "learner-next");
    expect(created.status, created.stderr).toBe(0);
    expect(w.state().panes[created.stdout.trim()].ws).toBe("w2");
    expect(w.state().panes[oldPane]).toBeUndefined();
    expect(w.host("open-pane", "learner-active").status).toBe(4);
    expect(w.state().panes[busyPane].ws).toBe("w1");
    expect(w.state().panes[ops.pane_id].label).toBe("ops");
    w.host("stop", "learner-active");
  });

  it.each(["20261010-164301-strategy-proposal", "20261010-164301"])("shows verified live learner %s beside ops and closes its reused viewer on exit", (batch) => {
    const w = world(`learner-log-view-${batch}`);
    const opsPane = w.host("open-pane", "ops").stdout.trim();
    const root = join(w.dir, "proj");
    const stateDir = join(root, "ops", "codex-ops");
    const viewerHome = join(w.dir, "viewer-home");
    mkdirSync(join(viewerHome, ".local", "bin"), { recursive: true });
    symlinkSync(FAKE, join(viewerHome, ".local", "bin", "herdr"));
    copyFileSync(HOST, join(root, "ops", "herdr-host.sh"));
    copyFileSync(join(REPO, "ops", "herdr-exec.sh"), join(root, "ops", "herdr-exec.sh"));
    const learnerLabel = `learner-${batch}${/^\d{8}-\d{6}$/.test(batch) ? "-postmortem" : ""}`;
    mkdirSync(join(stateDir, "learner"));
    const learner = w.host("run", learnerLabel, "--pidfile", join(stateDir, "learner", `${batch}.pid`), "--close-on-exit", "--", "sleep", "20");
    expect(learner.status, learner.stderr).toBe(0);
    const pid = Number(learner.stdout.trim().split(" ")[1]);
    const writeRecord = (state: string, id: number) => writeFileSync(join(stateDir, "learn.json"), JSON.stringify({ batches: { [batch]: { state, pid: id } } }));
    writeRecord("running", pid);
    writeFileSync(join(stateDir, "learner", `${batch}.out`), "model stdout\n");
    writeFileSync(join(stateDir, "learner", `${batch}.err`), "learner evidence processing\n");
    const runner = (id: string) => spawnSync("python3", [join(REPO, "ops", "learner-log-pane.py"), id], { env: { ...w.env, HOME: viewerHome, HERDR_BIN: "", PATH: "/usr/bin:/bin", CODEX_OPS_ROOT: root }, encoding: "utf8", timeout: 30_000 });
    const result = runner(batch);
    expect(result.status, result.stderr).toBe(0);
    const receipt = JSON.parse(result.stdout);
    expect(receipt).toMatchObject({ batch, workspace: "w1", ops_pane: opsPane, learner_restarted: false });
    expect(receipt.screen).toContain("learner evidence processing");
    const paneCount = Object.keys(w.state().panes).length;
    expect(runner(batch).status).toBe(0);
    expect(Object.keys(w.state().panes)).toHaveLength(paneCount);
    expect(runner("20261010-111111-strategy-proposal").status).toBe(1);
    expect(Object.keys(w.state().panes)).toHaveLength(paneCount);
    expect(JSON.parse(readFileSync(join(stateDir, "learn.json"), "utf8")).batches[batch]).toEqual({ state: "running", pid });
    for (const [state, id] of [["done", pid], ["failed", pid], ["running", 2147483647], ["running", process.pid]] as const) {
      writeRecord(state, id);
      expect(runner(batch).status).toBe(1);
      expect(Object.keys(w.state().panes)).toHaveLength(paneCount);
    }
    writeRecord("running", pid);
    w.host("stop", learnerLabel);
    waitFor(() => w.state().panes[receipt.pane] === undefined, 15_000);
  }, 30_000);

  it("run, reuse, busy, status, stop; only its own labels", () => {
    const w = world("host");
    expect(w.host("available").status).toBe(0);
    const pidfile = join(w.dir, "long.pid");
    const first = w.host("run", "job-a", "--pidfile", pidfile, "--env", "FOO=bar baz", "--", "bash", "-c", 'echo "foo=$FOO label=$HERDR_HOST_LABEL"; sleep 30');
    expect(first.status, first.stderr).toBe(0);
    const [pane, pid] = first.stdout.trim().split(" ");
    expect(pane).toMatch(/^w1:p\d+$/);
    expect(Number(pid)).toBeGreaterThan(1);
    expect(readFileSync(pidfile, "utf8").trim()).toBe(pid);
    expect(w.state().workspaces.w1.label).toBe("sts2-test");
    expect(w.state().panes[pane!].label).toBe("job-a");
    waitFor(() => readFileSync(join(w.fake, `pane${pane!.split(":p")[1]}.log`), "utf8").includes("foo=bar baz label=job-a"));

    // The label's pane is busy: refused (exit 4), nothing typed into it.
    const again = w.host("run", "job-a", "--", "echo", "hi");
    expect(again.status).toBe(4);
    expect(again.stderr).toContain("busy");

    const status = JSON.parse(w.host("status", "--json").stdout);
    expect(status).toEqual([{ label: "job-a", pane_id: pane, alive: true, busy: true, pids: [Number(pid)] }]);

    expect(w.host("stop", "not-ours").status).toBe(2);
    const stop = w.host("stop", "job-a");
    expect(stop.status, stop.stderr).toBe(0);
    expect(w.state().panes[pane!]).toBeUndefined();
    expect(JSON.parse(w.host("status", "--json").stdout)).toEqual([]);
    expect(readFileSync(join(w.dir, "proj", "ops", "codex-ops", "herdr-panes.log"), "utf8")).toContain("job-a");

    // A finished job leaves an idle pane: the label reuses it.
    const quick = w.host("run", "job-b", "--", "true");
    const quickPane = quick.stdout.trim();
    waitFor(() => JSON.parse(w.host("status", "--json").stdout)[0]?.busy === false);
    expect(w.host("open-pane", "job-b").stdout.trim()).toBe(quickPane);
  }, 60_000);

  it("--close-on-exit: the pane closes when the job ends and its last lines are kept", () => {
    const w = world("close");
    const run = w.host("run", "batch-1", "--close-on-exit", "--pidfile", join(w.dir, "b.pid"), "--", "bash", "-c", "echo batch output; exit 3");
    expect(run.status, run.stderr).toBe(0);
    const pane = run.stdout.trim().split(" ")[0]!;
    const registry = join(w.dir, "proj", "ops", "codex-ops", "herdr.json");
    // Pane removal happens before close_pane acquires the lock and forgets the label.
    // Both observable effects must finish before checking the completed close operation.
    waitFor(() => w.state().panes[pane] === undefined && JSON.parse(readFileSync(registry, "utf8")).panes["batch-1"] === undefined);
    const tail = readFileSync(join(w.dir, "proj", "ops", "codex-ops", "herdr-panes.log"), "utf8");
    expect(tail).toContain("batch-1");
    expect(tail).toContain("batch output");
    expect(tail).toContain("exited 3");
    expect(JSON.parse(readFileSync(join(w.dir, "proj", "ops", "codex-ops", "herdr.json"), "utf8")).panes).toEqual({});
  }, 30_000);

  it("refuses bad labels and reports an unavailable herdr", () => {
    const w = world("bad");
    expect(w.host("run", "Bad Label", "--", "true").status).toBe(2);
    const gone = spawnSync("bash", [HOST, "available"], { env: { ...w.env, HERDR_BIN: join(w.dir, "no-such-herdr") }, encoding: "utf8" });
    expect(gone.status).not.toBe(0);
  });
});

describe("wake through the herdr TUI (herdr.ts herdrWake, fake herdr)", () => {
  function setup(name: string) {
    const w = world(name);
    const codexHome = join(w.dir, "codex");
    const day = join(codexHome, "sessions", "2026", "10", "05");
    mkdirSync(day, { recursive: true });
    const rollout = join(day, `rollout-2026-10-05T20-00-00-${SESSION}.jsonl`);
    writeFileSync(rollout, `${JSON.stringify({ type: "session_meta", payload: { id: SESSION } })}\n`);
    const logs: string[] = [];
    const env = { ...w.env, FAKE_HERDR_ROLLOUT: rollout };
    const message = "【调度器事件】2026-10-05 22:40（CST），共 1 件：\n\n1. [manual] hello";
    const options = {
      herdr: FAKE,
      hostScript: HOST,
      agent: "ops",
      session: SESSION,
      args: ["resume", "--cd", "/x", "--no-daemon", SESSION],
      codexHome,
      message,
      marker: message.split("\n")[0]!,
      stateFile: join(w.dir, "proj", "ops", "codex-ops", "herdr-ops.json"),
      timeoutMs: 3000,
      readyWaitMs: 1500,
      pollMs: 100,
      submitWaitMs: 1500,
      env,
      log: (text: string) => logs.push(text),
    };
    return { ...w, rollout, logs, options };
  }

  it("starts the TUI once, prompts, reads the turn's answer and tokens from the session file", async () => {
    const t = setup("wake-ok");
    const first = await herdrWake(t.options);
    expect(first.code, first.reason).toBe(0);
    expect(first.turn).toMatchObject({ complete: true, lastMessage: "handled 1" });
    expect(first.turn!.tokens).toEqual({ input: 200, output: 50, cacheRead: 800, cacheCreation: 0, reasoning: 10 });
    const agent = t.state().agents.ops;
    expect(agent.argv).toEqual(t.options.args);
    expect(t.state().panes[agent.pane].label).toBe("ops");
    expect(JSON.parse(readFileSync(t.options.stateFile, "utf8"))).toMatchObject({ pane: agent.pane, session: SESSION, args_hash: argsHash(t.options.args) });
    // Second wake: the same TUI, no second start.
    const second = await herdrWake(t.options);
    expect(second.code).toBe(0);
    expect(second.turn!.lastMessage).toBe("handled 2");
    const calls = readFileSync(join(t.fake, "calls.log"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as string[]);
    expect(calls.filter((call) => call[0] === "agent" && call[1] === "start")).toHaveLength(1);
  }, 30_000);

  it("other arguments (a new key file, another effort): the idle TUI is restarted", async () => {
    const t = setup("wake-restart");
    expect((await herdrWake(t.options)).code).toBe(0);
    const changed = { ...t.options, args: [...t.options.args.slice(0, -1), "-c", "x=1", SESSION] };
    expect((await herdrWake(changed)).code).toBe(0);
    expect(t.state().agents.ops.argv).toEqual(changed.args);
    expect(t.logs.some((line) => line.includes("restarting"))).toBe(true);
  }, 30_000);

  it("defers (75) while a person's text sits in the composer or a dialog is up; nothing is sent", async () => {
    const t = setup("wake-busy");
    expect((await herdrWake(t.options)).code).toBe(0);
    writeFileSync(join(t.fake, "composer"), "half typed");
    const typed = await herdrWake(t.options);
    expect(typed.code).toBe(75);
    expect(typed.reason).toContain("unsent text");
    rmSync(join(t.fake, "composer"));
    writeFileSync(join(t.fake, "status"), "blocked");
    expect((await herdrWake(t.options)).code).toBe(75);
    expect(t.state().agents.ops.prompts).toBe(1);
  }, 30_000);

  it("a turn that does not end in time is interrupted with esc (124); the TUI stays", async () => {
    const t = setup("wake-timeout");
    expect((await herdrWake(t.options)).code).toBe(0);
    writeFileSync(join(t.fake, "no-complete"), "");
    const slow = await herdrWake(t.options);
    expect(slow.code).toBe(124);
    expect(t.state().agents.ops.keys).toContain("esc");
    // The open turn now blocks the next wake until it ends (deferred, not sent again).
    rmSync(join(t.fake, "no-complete"));
    expect((await herdrWake(t.options)).code).toBe(75);
  }, 30_000);

  it("a startup dialog (agent_not_ready) defers without answering it", async () => {
    const t = setup("wake-trust");
    writeFileSync(join(t.fake, "start-blocked"), "");
    const blocked = await herdrWake(t.options);
    expect(blocked.code).toBe(75);
    expect(blocked.reason).toContain("agent_not_ready");
  }, 30_000);
});

describe("hosted learner batch and the scheduler", () => {
  it("a post-mortem batch runs in its own pane, reports as before, and the pane closes", () => {
    const w = world("learner");
    const root = join(w.dir, "proj");
    for (const sub of ["logs", "notes"]) mkdirSync(join(root, sub), { recursive: true });
    writeFileSync(join(root, "notes", "lessons.md"), "# lessons\n");
    writeFileSync(join(root, "ops", "win-notified"), "");
    writeFileSync(join(root, "logs", "runs.jsonl"), `${JSON.stringify({ run_id: "SILENT000007", character: "SILENT", ascension: 0, victory: false })}\n`);
    const dir = join(root, "ops", "codex-ops");
    writeFileSync(join(dir, "hosting"), "learners=herdr\n");
    const env = {
      ...w.env,
      CODEX_OPS_ROOT: root,
      CODEX_OPS_DIR: dir,
      CODEX_OPS_NO_DRAIN: "1",
      CODEX_OPS_PENDING_CMD: "echo 0",
      LEARNER_CMD: 'for r in $(echo "$1" | tr , " "); do echo "## $r（A0，测试）" >> notes/lessons.md; done; echo "回报 json"',
    };
    const run = spawnSync("python3", [join(REPO, "ops", "codex-ops-learn.py"), "dispatch", "--runs", "SILENT000007"], { env, encoding: "utf8" });
    expect(run.status, run.stderr + run.stdout).toBe(0);
    const batch = Object.entries(JSON.parse(readFileSync(join(dir, "learn.json"), "utf8")).batches)[0] as [string, { pane?: string; pid: number }];
    expect(batch[1].pane).toMatch(/^w1:p\d+$/);
    expect(w.state().panes[batch[1].pane!].label).toBe(`learner-${batch[0]}-postmortem`);
    waitFor(() => readQueue(join(dir, "queue")).some((e) => e.kind === "learner-done"));
    expect(readQueue(join(dir, "queue")).find((e) => e.kind === "learner-done")!.text).toContain("exit 0");
    expect(readFileSync(join(dir, "learner", `${batch[0]}.out`), "utf8")).toContain("回报 json");
    waitFor(() => w.state().panes[batch[1].pane!] === undefined);
    expect(readFileSync(join(dir, "herdr-panes.log"), "utf8")).toContain(`learner-${batch[0]}-postmortem`);
  }, 40_000);

  it("herdr unavailable: the batch starts with setsid as before", () => {
    const w = world("learner-fallback");
    const root = join(w.dir, "proj");
    for (const sub of ["logs", "notes"]) mkdirSync(join(root, sub), { recursive: true });
    writeFileSync(join(root, "notes", "lessons.md"), "# lessons\n");
    writeFileSync(join(root, "ops", "win-notified"), "");
    writeFileSync(join(root, "logs", "runs.jsonl"), `${JSON.stringify({ run_id: "SILENT000008", character: "SILENT", ascension: 0, victory: false })}\n`);
    const dir = join(root, "ops", "codex-ops");
    const env = { ...w.env, HERDR_BIN: join(w.dir, "missing"), CODEX_OPS_LEARNER_HOST: "herdr", CODEX_OPS_ROOT: root, CODEX_OPS_DIR: dir, CODEX_OPS_NO_DRAIN: "1", CODEX_OPS_PENDING_CMD: "echo 0", LEARNER_CMD: "echo ok" };
    const run = spawnSync("python3", [join(REPO, "ops", "codex-ops-learn.py"), "dispatch", "--runs", "SILENT000008"], { env, encoding: "utf8" });
    expect(run.status, run.stderr).toBe(0);
    expect(run.stderr).toContain("starting with setsid");
    const batch = Object.values(JSON.parse(readFileSync(join(dir, "learn.json"), "utf8")).batches)[0] as { pane?: string };
    expect(batch.pane).toBeUndefined();
    waitFor(() => readQueue(join(dir, "queue")).some((e) => e.kind === "learner-done"));
  }, 30_000);

  it("drain: a deferred wake (exit 75) keeps the events and is not counted as a failure", () => {
    const root = join(tmp, "drain");
    const dir = join(root, "ops", "codex-ops");
    mkdirSync(join(dir, "queue"), { recursive: true });
    writeFileSync(join(dir, "queue", "1-manual.md"), "x\n");
    const tsx = join(root, "fake-tsx.sh");
    writeFileSync(tsx, "exit 75\n");
    chmodSync(tsx, 0o755);
    const run = spawnSync("bash", [join(REPO, "ops", "codex-ops.sh"), "drain"], { env: { ...process.env, CODEX_OPS_ROOT: root, CODEX_OPS_DIR: dir, CODEX_OPS_TSX: tsx }, encoding: "utf8" });
    expect(run.status, run.stderr).toBe(0);
    expect(readFileSync(join(dir, "scheduler.log"), "utf8")).toContain("wake deferred");
    expect(existsSync(join(dir, "fails"))).toBe(false);
    expect(existsSync(join(dir, "queue", "1-manual.md"))).toBe(true);
  });
});
