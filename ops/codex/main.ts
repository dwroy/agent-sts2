/**
 * The codex ops session's runner (docs/codex-ops.md). Called by ops/codex-ops.sh, which holds the wake lock:
 *
 *   agent/node_modules/.bin/tsx ops/codex/main.ts wake [--dry-run]   one wake: the queued events to the session
 *                                                                    (the first wake creates it from the ops prompt)
 *   agent/node_modules/.bin/tsx ops/codex/main.ts precheck            codex usable + key files unreadable under "ops"
 *   agent/node_modules/.bin/tsx ops/codex/main.ts growth              the session file's size, context, compactions
 *   agent/node_modules/.bin/tsx ops/codex/main.ts snapshot-session    copy the codex transcripts (ops session, learner) to
 *                                                                    paper/materials/session/codex/, keys -> [REDACTED]
 *   agent/node_modules/.bin/tsx ops/codex/main.ts probe <script.sh>   run a shell script under the ops profile
 *                                                                    (re-verify the sandbox after a codex update)
 *
 * Exit codes: 0 done (or nothing queued), 1 the wake failed (events stay queued), 3 codex unavailable or the key
 * pre-check failed, 75 deferred (herdr mode: the TUI is busy, blocked or holds unsent text; events stay queued, not a
 * failure), 124 timed out.
 *
 * Wakes after the first go to an interactive TUI in herdr instead of `codex exec resume` when CODEX_OPS_MODE=herdr or
 * ops/codex-ops/hosting has `ops=herdr` (herdr.ts; docs/codex-ops.md「herdr 托管」).
 */
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

import { checkCodex } from "../../agent/src/brain/engines/codex.js";
import { AUTH_ERROR, refreshCodexAuth } from "../../agent/src/brain/engines/codex-usage.js";
import { PROJECT_ROOT } from "../../agent/src/core/paths.js";
import { codexChildEnv, codexKeyCheck, codexProfileOverrides, engineBinary, learnerCodexHome, shellQuote, strippedEnvNames } from "../../learner/lib/engines.js";
import { collectSecrets, redactSecrets, secretFilesOf, stamp } from "../../learner/lib/launcher.js";
import { SummaryTracker, findRollout } from "../../learner/lib/summary.js";
import { archiveCodexTranscripts } from "./archive.js";
import { herdrWake, runCommand, tuiStateFile } from "./herdr.js";
import {
  ACTIONS,
  DEFAULT_WAKE_TIMEOUT_MIN,
  REQUEST_ID,
  hostingMode,
  initCommand,
  initMessage,
  interactiveArgs,
  localStamp,
  opsPaths,
  opsRequest,
  readQueue,
  readSessionId,
  resumeCommand,
  sessionGrowth,
  validateRequest,
  wakeMessage,
  type OpsPaths,
  type QueuedEvent,
} from "./lib.js";

const env = process.env;
const ROOT = env["CODEX_OPS_ROOT"] || PROJECT_ROOT;
const paths = opsPaths(ROOT, env);
const STATE = join(tmpdir(), "jev-codex-ops-state");

function log(text: string): void {
  const line = `${localStamp(new Date())} ${text}`;
  process.stderr.write(`${line}\n`);
  try {
    mkdirSync(paths.dir, { recursive: true });
    appendFileSync(paths.schedulerLog, `${line}\n`);
  } catch {
    // the log is best effort
  }
}

/* ---- broker ------------------------------------------------------------------------------------------------- */

/**
 * Runs the model's allow-listed requests outside the sandbox while a wake lasts: polls ops/codex-ops/broker/ for
 * <id>.req, claims it (rename to .run), validates it (lib.ts validateRequest), runs ops/codex-ops-actions.sh with the
 * action's time limit, and answers <id>.res (written to a temporary name, then renamed). One request at a time.
 */
export function startBroker(p: OpsPaths, root: string, onLog: (text: string) => void): () => Promise<void> {
  mkdirSync(p.broker, { recursive: true });
  let busy: Promise<void> = Promise.resolve();
  let stopped = false;
  const answer = (id: string, body: { code: number; out: string }): void => {
    const tmp = join(p.broker, `${id}.res.tmp`);
    writeFileSync(tmp, JSON.stringify(body));
    renameSync(tmp, join(p.broker, `${id}.res`));
  };
  const handle = async (id: string): Promise<void> => {
    const claimed = join(p.broker, `${id}.run`);
    try {
      renameSync(join(p.broker, `${id}.req`), claimed);
    } catch {
      return;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(readFileSync(claimed, "utf8"));
    } catch {
      raw = undefined;
    }
    rmSync(claimed, { force: true });
    const request = validateRequest(raw);
    if (!request.ok) {
      onLog(`broker refused ${id}: ${request.error}`);
      answer(id, { code: 2, out: `拒绝：${request.error}\n` });
      return;
    }
    onLog(`broker ${request.action} ${request.args.join(" ")}`.trim());
    const result = await runAction(root, request.action, request.args, ACTIONS[request.action]!.ms);
    onLog(`broker ${request.action} exit ${result.code}`);
    answer(id, result);
  };
  const poll = (): void => {
    if (stopped) return;
    let names: string[] = [];
    try {
      names = readdirSync(p.broker);
    } catch {
      // recreated below
    }
    for (const name of names.sort()) {
      const id = name.endsWith(".req") ? name.slice(0, -4) : "";
      if (REQUEST_ID.test(id)) busy = busy.then(() => handle(id));
    }
  };
  const timer = setInterval(poll, 500);
  return async () => {
    stopped = true;
    clearInterval(timer);
    await busy;
  };
}

const OUT_MAX = 64 * 1024;

/** bash ops/codex-ops-actions.sh <action> [arg], niced, its own process group, killed at the time limit. */
export function runAction(root: string, action: string, args: string[], ms: number): Promise<{ code: number; out: string }> {
  return new Promise((done) => {
    const child = spawn("nice", ["-n", "5", "bash", join(root, "ops", "codex-ops-actions.sh"), action, ...args], { cwd: root, env: { ...process.env, CODEX_OPS_ROOT: root }, stdio: ["ignore", "pipe", "pipe"], detached: true });
    let out = "";
    const take = (chunk: Buffer): void => {
      if (out.length < OUT_MAX) out += chunk.toString("utf8");
    };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    const timer = setTimeout(() => {
      try {
        process.kill(-child.pid!, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
      out += `\n（超过 ${ms / 1000} 秒，已终止）\n`;
    }, ms);
    child.on("error", (error) => {
      clearTimeout(timer);
      done({ code: 127, out: `${out}${error.message}\n` });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      done({ code: code ?? (signal ? 128 : 1), out: out.length > OUT_MAX ? `${out.slice(0, OUT_MAX)}\n（输出截断）\n` : out });
    });
  });
}

/* ---- wake --------------------------------------------------------------------------------------------------- */

async function precheck(bin: string): Promise<string | undefined> {
  const request = opsRequest(ROOT, env);
  const check = await checkCodex({ bin, home: learnerCodexHome(env) }, request.model!, request.effort!, { stateDir: join(STATE, "check") });
  if (!check.ok) return `codex 用不了：${check.error}`;
  const keys = await codexKeyCheck(bin, request, codexChildEnv(env, bin));
  if (!keys.ok) return `ops 权限配置没能挡住 key 文件，不运行：${keys.readable.length > 0 ? `读得到 ${keys.readable.join("、")}` : ""}${keys.error ? `（检查失败：${keys.error}）` : ""}`;
  return undefined;
}

async function wake(dryRun: boolean): Promise<number> {
  for (const dir of [paths.dir, paths.queue, paths.delivered, paths.broker, paths.wakes]) mkdirSync(dir, { recursive: true });
  const events = readQueue(paths.queue);
  const session = readSessionId(paths);
  if (!session && existsSync(paths.sessionFile)) {
    log("session-id is not a codex session id; not creating a new session over it (fix or remove ops/codex-ops/session-id)");
    return 1;
  }
  if (session && events.length === 0) return 0;
  const now = new Date();
  const message = session ? wakeMessage(events, now) : initMessage(readFileSync(paths.prompt, "utf8"), events, now);
  const request = opsRequest(ROOT, env);
  const bin = engineBinary("codex", env);
  const command = session ? resumeCommand(request, session, message, bin ?? "codex") : initCommand(request, message, bin ?? "codex");
  // The first turn always runs headless (it creates the session); later wakes go to the herdr TUI when ops=herdr.
  const mode = hostingMode(paths.dir, "ops", "CODEX_OPS_MODE", "exec", env);
  if (dryRun && session && mode === "herdr") {
    process.stdout.write(`===== herdr: agent ${herdrAgent()} = codex ${shellQuote(interactiveArgs(request, session))}（工作目录 ${ROOT}）=====\n===== 消息 =====\n${message}\n`);
    return 0;
  }
  if (dryRun) {
    process.stdout.write(`===== ${session ? `resume ${session}` : "init"}（工作目录 ${ROOT}）=====\n${shellQuote([command.command, ...command.args])}\n===== 消息 =====\n${command.stdin}\n`);
    return 0;
  }
  if (!bin) {
    log("codex is not installed");
    return 3;
  }
  const refused = await precheck(bin);
  if (refused) {
    log(refused);
    return 3;
  }
  if (session && mode === "herdr") {
    if (await herdrAvailable()) return wakeHerdr(events, session, message, now);
    log("ops=herdr but herdr does not answer: this wake runs headless (codex exec resume)");
  } else if (session && existsSync(tuiStateFile(paths.dir)) && (await herdrAvailable())) {
    // Rolled back to exec while the TUI may still be open on the same session: two writers on one session file.
    const tui = await runCommand(herdrBin(), ["agent", "get", herdrAgent()], 20_000);
    if (tui.ok) {
      log(`ops=exec but the ops TUI is still open in herdr (agent ${herdrAgent()}): close it first (bash ops/herdr-host.sh stop ${herdrAgent()}); the events stay queued`);
      return 75;
    }
  }

  const startedAt = Date.now();
  const logPath = join(paths.wakes, `${stamp(now)}-${session ? "wake" : "init"}.jsonl`);
  const write = (row: Record<string, unknown>): void => appendFileSync(logPath, `${JSON.stringify(row)}\n`);
  write({ type: "ops_wake", ts: now.toISOString(), session: session ?? null, events: events.map((e) => e.name), cwd: ROOT, command: [command.command, ...command.args], message: command.stdin });
  log(`${session ? "wake" : "init"}: ${events.length} event(s) ${events.map((e) => e.kind).join(",")} → codex (log ${logPath})`);

  const childEnv = codexChildEnv(env, bin);
  const child = spawn(command.command, command.args, { cwd: ROOT, env: childEnv, stdio: ["pipe", "pipe", "pipe"], detached: true });
  writeFileSync(join(paths.dir, "wake.pid"), `${child.pid ?? ""}\n`);
  const stopBroker = startBroker(paths, ROOT, log);
  const tracker = new SummaryTracker("codex", request.model);
  let threadId: string | undefined = session;
  const stdoutDone = new Promise<void>((done) => {
    const lines = createInterface({ input: child.stdout! });
    lines.on("line", (line) => {
      appendFileSync(logPath, `${line}\n`);
      tracker.feed(line, Date.now() - startedAt);
      if (!threadId) {
        try {
          const event = JSON.parse(line) as { type?: string; thread_id?: string };
          if (event.type === "thread.started" && event.thread_id) {
            threadId = event.thread_id;
            // Saved as soon as the session exists: a first turn that fails later is resumed, never recreated.
            writeFileSync(paths.sessionFile, `${threadId}\n`);
            log(`session created: ${threadId}`);
          }
        } catch {
          // not JSON
        }
      }
    });
    lines.on("close", () => done());
  });
  const stderrDone = new Promise<void>((done) => {
    const lines = createInterface({ input: child.stderr! });
    lines.on("line", (line) => write({ type: "ops_stderr", t_ms: Date.now() - startedAt, text: line }));
    lines.on("close", () => done());
  });
  child.stdin!.on("error", () => undefined);
  child.stdin!.end(command.stdin);

  const timeoutMin = Number(env["CODEX_OPS_WAKE_TIMEOUT_MIN"]) || DEFAULT_WAKE_TIMEOUT_MIN;
  let timedOut = false;
  const kill = (signal: NodeJS.Signals): void => {
    try {
      process.kill(-child.pid!, signal);
    } catch {
      child.kill(signal);
    }
  };
  let killTimer: NodeJS.Timeout | undefined;
  const timer = setTimeout(() => {
    timedOut = true;
    log(`wake over ${timeoutMin} min: stopping codex (PID ${child.pid})`);
    kill("SIGTERM");
    killTimer = setTimeout(() => kill("SIGKILL"), 10_000);
  }, timeoutMin * 60_000);
  const onSignal = (): void => kill("SIGTERM");
  process.once("SIGTERM", onSignal);
  process.once("SIGINT", onSignal);

  const [code, signal] = await new Promise<[number | null, NodeJS.Signals | null]>((done) => {
    child.on("error", (error) => {
      write({ type: "ops_error", message: error.message });
      done([null, null]);
    });
    child.on("close", (exit, sig) => done([exit, sig]));
  });
  await Promise.all([stdoutDone, stderrDone]);
  clearTimeout(timer);
  if (killTimer) clearTimeout(killTimer);
  await stopBroker();
  rmSync(join(paths.dir, "wake.pid"), { force: true });

  const summary = tracker.summary;
  const ok = code === 0 && !summary.isError && !timedOut;
  if (ok) for (const event of events) {
    try {
      renameSync(event.file, join(paths.delivered, event.name));
    } catch {
      // already moved
    }
  }
  const rollout = threadId ? findRollout(learnerCodexHome(env), threadId) : undefined;
  const growth = rollout ? sessionGrowth(readFileSync(rollout, "utf8")) : undefined;
  const row = {
    ts: new Date().toISOString(),
    kind: session ? "wake" : "init",
    session: threadId ?? null,
    events: events.map((e) => e.name),
    ok,
    exit: code,
    signal,
    timed_out: timedOut,
    wall_ms: Date.now() - startedAt,
    tokens: summary.tokens,
    context_tokens: growth?.contextTokens ?? null,
    compactions: growth?.compactions ?? null,
    rollout_bytes: growth?.bytes ?? null,
    errors: summary.errors.slice(0, 5),
    result: (summary.result ?? "").slice(0, 4000),
    log: logPath,
  };
  write({ type: "ops_summary", ...row });
  appendFileSync(paths.wakesLog, `${JSON.stringify(row)}\n`);
  const secrets = collectSecrets(secretFilesOf(ROOT), env, strippedEnvNames(env, "codex"));
  const redacted = redactSecrets(logPath, secrets) + redactSecrets(paths.wakesLog, secrets);
  if (redacted > 0) log(`replaced ${redacted} key value(s) in the wake logs with [REDACTED]`);
  log(`${row.kind} ${ok ? "done" : "FAILED"} in ${Math.round(row.wall_ms / 1000)} s (exit ${code}${signal ? `, ${signal}` : ""}${timedOut ? ", timed out" : ""}; context ${growth?.contextTokens ?? "?"} tokens, ${growth?.compactions ?? 0} compaction(s)): ${(summary.result ?? summary.errors.join(" | ")).replace(/\s+/g, " ").slice(0, 300)}`);
  if (!ok && AUTH_ERROR.test(summary.errors.join(" "))) {
    try {
      await refreshCodexAuth({ bin, home: learnerCodexHome(env), env: childEnv as Record<string, string>, stateDir: join(STATE, "auth") });
      log("codex login refused: asked codex to refresh its token; the events stay queued for the next tick");
    } catch (error) {
      log(`codex login refused and the token refresh failed (${error instanceof Error ? error.message.slice(0, 200) : String(error)}): Dai has to run codex login`);
    }
  }
  if (timedOut) return 124;
  return ok ? 0 : 1;
}

/* ---- wake through herdr ------------------------------------------------------------------------------------- */

/** HERDR_BIN, else herdr on PATH, else ~/.local/bin/herdr (cron's PATH does not have ~/.local/bin; herdr-host.sh does the same). */
const herdrBin = (): string => {
  if (env["HERDR_BIN"]) return env["HERDR_BIN"];
  for (const dir of (env["PATH"] ?? "").split(":")) if (dir && existsSync(join(dir, "herdr"))) return join(dir, "herdr");
  return join(env["HOME"] || homedir(), ".local", "bin", "herdr");
};
const herdrAgent = (): string => env["CODEX_OPS_HERDR_AGENT"] || "ops";
const hostScript = (): string => env["CODEX_OPS_HERDR_HOST"] || join(ROOT, "ops", "herdr-host.sh");

async function herdrAvailable(): Promise<boolean> {
  return (await runCommand("bash", [hostScript(), "available"], 30_000)).code === 0;
}

/**
 * One wake through the ops TUI in herdr (herdr.ts herdrWake): same queue, broker, logs and summary row as the headless
 * wake; the event stream in the wake log is the turn's rows of codex's session file, and the tokens come from its
 * token_usage_record. Exit 75 = deferred (the TUI is busy, shows a dialog, or holds unsent text): the events stay
 * queued and the scheduler does not count it as a failure.
 */
async function wakeHerdr(events: QueuedEvent[], session: string, message: string, now: Date): Promise<number> {
  const request = opsRequest(ROOT, env);
  const startedAt = Date.now();
  const logPath = join(paths.wakes, `${stamp(now)}-wake.jsonl`);
  const write = (row: Record<string, unknown>): void => appendFileSync(logPath, `${JSON.stringify(row)}\n`);
  const args = interactiveArgs(request, session);
  write({ type: "ops_wake", ts: now.toISOString(), mode: "herdr", session, events: events.map((e) => e.name), cwd: ROOT, command: [herdrBin(), "agent", "prompt", herdrAgent()], tui: ["codex", ...args], message });
  log(`wake (herdr): ${events.length} event(s) ${events.map((e) => e.kind).join(",")} → agent ${herdrAgent()} (log ${logPath})`);
  writeFileSync(join(paths.dir, "wake.pid"), `${process.pid}\n`);
  const stopBroker = startBroker(paths, ROOT, log);
  const timeoutMin = Number(env["CODEX_OPS_WAKE_TIMEOUT_MIN"]) || DEFAULT_WAKE_TIMEOUT_MIN;
  let result;
  try {
    result = await herdrWake({
      herdr: herdrBin(),
      hostScript: hostScript(),
      agent: herdrAgent(),
      session,
      args,
      codexHome: learnerCodexHome(env),
      message,
      marker: message.split("\n")[0]!,
      stateFile: tuiStateFile(paths.dir),
      timeoutMs: timeoutMin * 60_000,
      readyWaitMs: (Number(env["CODEX_OPS_HERDR_READY_MIN"]) || 10) * 60_000,
      pollMs: Number(env["CODEX_OPS_HERDR_POLL_MS"]) || 2000,
      submitWaitMs: Number(env["CODEX_OPS_HERDR_SUBMIT_MS"]) || undefined,
      log,
    });
  } finally {
    await stopBroker();
    rmSync(join(paths.dir, "wake.pid"), { force: true });
  }
  for (const line of result.turn?.rows ?? []) appendFileSync(logPath, `${line}\n`);
  const ok = result.code === 0;
  if (ok) for (const event of events) {
    try {
      renameSync(event.file, join(paths.delivered, event.name));
    } catch {
      // already moved
    }
  }
  const growth = result.rollout ? sessionGrowth(readFileSync(result.rollout, "utf8")) : undefined;
  const row = {
    ts: new Date().toISOString(),
    kind: "wake",
    mode: "herdr",
    session,
    pane: result.pane ?? null,
    events: events.map((e) => e.name),
    ok,
    exit: result.code,
    deferred: result.code === 75,
    timed_out: result.code === 124,
    wall_ms: Date.now() - startedAt,
    turn: result.turn?.turnId ?? null,
    tokens: result.turn?.tokens ?? { input: 0, output: 0, cacheRead: 0, cacheCreation: 0, reasoning: 0 },
    context_tokens: growth?.contextTokens ?? null,
    compactions: growth?.compactions ?? null,
    rollout_bytes: growth?.bytes ?? null,
    errors: result.reason ? [result.reason] : [],
    result: (result.turn?.lastMessage ?? "").slice(0, 4000),
    log: logPath,
  };
  write({ type: "ops_summary", ...row });
  appendFileSync(paths.wakesLog, `${JSON.stringify(row)}\n`);
  const secrets = collectSecrets(secretFilesOf(ROOT), env, strippedEnvNames(env, "codex"));
  const redacted = redactSecrets(logPath, secrets) + redactSecrets(paths.wakesLog, secrets);
  if (redacted > 0) log(`replaced ${redacted} key value(s) in the wake logs with [REDACTED]`);
  log(`wake (herdr) ${ok ? "done" : result.code === 75 ? "DEFERRED" : "FAILED"} in ${Math.round(row.wall_ms / 1000)} s (exit ${result.code}; context ${growth?.contextTokens ?? "?"} tokens, ${growth?.compactions ?? 0} compaction(s)): ${(result.turn?.lastMessage ?? result.reason ?? "").replace(/\s+/g, " ").slice(0, 300)}`);
  return result.code;
}

/* ---- other commands ----------------------------------------------------------------------------------------- */

function growthReport(): number {
  const session = readSessionId(paths);
  if (!session) {
    process.stdout.write("no session yet\n");
    return 0;
  }
  const rollout = findRollout(learnerCodexHome(env), session);
  if (!rollout) {
    process.stdout.write(`session ${session}: session file not found under the codex home\n`);
    return 1;
  }
  const g = sessionGrowth(readFileSync(rollout, "utf8"));
  process.stdout.write(
    `session ${session}: ${g.turns} turn(s), file ${(g.bytes / 1024).toFixed(0)} KiB, context ${g.contextTokens ?? "?"} / ${g.window ?? "?"} tokens, ${g.compactions} compaction(s)` +
      `${g.weeklyUsedPercent !== undefined ? `, cached weekly limit ${g.weeklyUsedPercent}% used` : ""}` +
      `${g.fiveHourUsedPercent !== undefined ? `, cached 5h limit ${g.fiveHourUsedPercent}% used` : ""}` +
      `${g.weeklyUsedPercent === undefined && g.fiveHourUsedPercent === undefined && g.usedPercent !== undefined ? `, cached primary ${g.usedPercent}% used (window unknown)` : ""}\n  ${rollout}\n`,
  );
  return 0;
}

/**
 * The daily snapshot's copy of the codex transcripts for the paper, key values replaced (ops prompt「论文数据快照」):
 * the ops session (rollout, wakes) and the learner (run logs, codex rollouts), into paper/materials/session/codex/
 * (ops/codex/archive.ts). Never prints a key: only paths and counts.
 */
function snapshotSession(): number {
  const session = readSessionId(paths);
  const result = archiveCodexTranscripts({
    root: ROOT,
    codexHome: learnerCodexHome(env),
    opsDir: paths.dir,
    opsSession: session,
    secrets: collectSecrets(secretFilesOf(ROOT), env, strippedEnvNames(env, "codex")),
  });
  process.stdout.write(
    `${result.outDir}: ${result.copied.length} file(s) copied, ${result.unchanged} unchanged, ${result.redacted} key value(s) redacted` +
      `${result.missingRollouts.length ? `; rollout not found for ${result.missingRollouts.join(", ")}` : ""}\n`,
  );
  if (session && result.missingRollouts.includes(session)) {
    log(`snapshot: session file of ${session} not found`);
    return 1;
  }
  return 0;
}

async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  switch (command) {
    case "wake":
      return wake(rest.includes("--dry-run"));
    case "precheck": {
      const bin = engineBinary("codex", env);
      if (!bin) {
        process.stderr.write("codex is not installed\n");
        return 3;
      }
      const refused = await precheck(bin);
      process.stdout.write(refused ? `${refused}\n` : "ok: codex usable, key files unreadable under the ops profile\n");
      return refused ? 3 : 0;
    }
    case "growth":
      return growthReport();
    case "probe": {
      // Runs a shell script under the ops profile, as the session's commands run (re-verify the sandbox after a codex update).
      const bin = engineBinary("codex", env);
      if (!bin || !rest[0]) {
        process.stderr.write("usage: tsx ops/codex/main.ts probe <script.sh>   (codex installed)\n");
        return 2;
      }
      const request = opsRequest(ROOT, env);
      const args = ["sandbox", "-C", ROOT, "-P", request.profile!, ...codexProfileOverrides(request), "--", "bash", rest[0]];
      const child = spawn(bin, args, { cwd: ROOT, env: codexChildEnv(env, bin), stdio: "inherit" });
      return new Promise<number>((done) => child.on("close", (code) => done(code ?? 1)));
    }
    case "snapshot-session":
      return snapshotSession();
    default:
      process.stderr.write("usage: tsx ops/codex/main.ts wake [--dry-run] | precheck | growth | snapshot-session | probe <script.sh>\n");
      return 2;
  }
}

if (process.argv[1] && /ops\/codex\/main\.ts$/.test(process.argv[1])) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      log(`runner crashed: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      process.exit(1);
    },
  );
}
