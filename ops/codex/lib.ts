/**
 * The codex ops session's runner, pure parts (Dai 2026-10-04 21:00: the ops session runs on codex, gpt-6.1-sol; Claude
 * keeps only the dev session). docs/codex-ops.md has the design; ops/codex-ops.sh is the scheduler around it.
 *
 * - One codex session with continuity: created once from the ops prompt (initCommand: `codex exec … -`), then every wake
 *   is `codex exec resume <session id> -` with the scheduler's events as the message (resumeCommand). Both run on the
 *   learner's codex plumbing (learner/lib/engines.ts codexCommand: --ignore-user-config, --ignore-rules, approvals never,
 *   web search off, the brain's disabled features minus the shell / code mode) and a permission profile named "ops"
 *   built like the learner's write profile (codexPermissions: everything readable, the project root + tmp writable, key
 *   files / every .env / codex's auth.json unreadable, no network). Codex auto-compacts the session at
 *   AUTO_COMPACT_TOKENS (gpt-6.1-sol's window is 272k).
 * - The sandbox has its own PID namespace, no network (not even 127.0.0.1) and no Windows interop (2026-10-04 probes),
 *   so everything that needs them (process control, the mod's HTTP state, schtasks.exe, the learner's nested codex)
 *   is an allow-listed broker action (ACTIONS): the model runs `bash ops/codex-ops-do.sh <action> [arg]`, which drops a
 *   request file; the wake process, outside the sandbox, validates it (validateRequest) and runs
 *   `bash ops/codex-ops-actions.sh <action> [arg]`.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { DEFAULT_CODEX_EFFORT, DEFAULT_CODEX_MODEL } from "../../agent/src/core/config.js";
import { codexCommand, mainCheckout, withCodexKeys, type CommandLine, type EngineRequest } from "../../learner/lib/engines.js";
import type { TaskTool } from "../../learner/lib/task.js";

/** The ops session's codex permission profile (`-c default_permissions="ops"`, `codex sandbox -P ops`). */
export const OPS_PROFILE = "ops";
/** Tools as the learner names them: with Bash / Edit / Write the profile is the writable one (project root + tmp). */
export const OPS_TOOLS: TaskTool[] = ["Read", "Grep", "Glob", "Bash", "Edit", "Write"];
/** Codex compacts the session's history above this many tokens (model_auto_compact_token_limit; window 272k). */
export const AUTO_COMPACT_TOKENS = 200_000;
/** A wake that runs longer is stopped (process group, SIGTERM then SIGKILL); its events stay queued. */
export const DEFAULT_WAKE_TIMEOUT_MIN = 120;

export interface OpsPaths {
  root: string;
  /** Runtime state (git-ignored): ops/codex-ops/ unless CODEX_OPS_DIR. */
  dir: string;
  queue: string;
  delivered: string;
  broker: string;
  wakes: string;
  sessionFile: string;
  wakesLog: string;
  schedulerLog: string;
  prompt: string;
  inbox: string;
  forDai: string;
}

export function opsPaths(root: string, env: NodeJS.ProcessEnv = process.env): OpsPaths {
  const dir = env["CODEX_OPS_DIR"] || join(root, "ops", "codex-ops");
  return {
    root,
    dir,
    queue: join(dir, "queue"),
    delivered: join(dir, "delivered"),
    broker: join(dir, "broker"),
    wakes: join(dir, "wakes"),
    sessionFile: join(dir, "session-id"),
    wakesLog: join(dir, "wakes.jsonl"),
    schedulerLog: join(dir, "scheduler.log"),
    prompt: env["CODEX_OPS_PROMPT"] || join(root, "ops", "ops-session-silent-codex-prompt.md"),
    inbox: join(root, "ops", "inbox-dev.md"),
    forDai: join(root, "notes", "for-dai.md"),
  };
}

/**
 * The scheduler's own files, which run outside the sandbox (cron, the broker).
 * Dai authorised ops and learners to edit them on 2026-10-05; key and git configuration rules still apply.
 */
export const SCHEDULER_FILES = [
  "ops/codex",
  "ops/codex-ops.sh",
  "ops/codex-ops-actions.sh",
  "ops/codex-ops-do.sh",
  "ops/codex-ops-learn.py",
  "ops/codex-ops-learner.sh",
  "ops/learner_checks.py",
  "ops/learner_jobs.py",
  "ops/paths.sh",
  "ops/paths.py",
  "ops/stall-check.sh",
  "ops/stop.sh",
];

/**
 * The ops profile's rules on top of the learner's write profile: commits in the main checkout and its worktrees
 * (.worktrees/step, live; their git dirs are all under <main checkout>/.git) need .git writable; its hooks and config stay
 * read-only (a hook or core.hooksPath would run in whoever commits next, outside the sandbox). The scheduler's files
 * (SCHEDULER_FILES) were read-only too until Dai, 2026-10-05: codex may change its own broker and scheduler.
 */
export function opsExtraRules(root: string): Record<string, "read" | "write" | "none"> {
  const git = join(mainCheckout(root), ".git");
  const rules: Record<string, "read" | "write" | "none"> = { [git]: "write", [join(git, "hooks")]: "read", [join(git, "config")]: "read" };
  return rules;
}

/** The codex request of the ops session: cwd = project root, the "ops" profile with the key files found on disk. */
export function opsRequest(root: string, env: NodeJS.ProcessEnv, opts: { model?: string; effort?: string } = {}): EngineRequest {
  return withCodexKeys(
    {
      engine: "codex",
      cwd: root,
      projectRoot: root,
      tools: OPS_TOOLS,
      profile: OPS_PROFILE,
      extraRules: opsExtraRules(root),
      model: opts.model ?? env["CODEX_OPS_MODEL"] ?? DEFAULT_CODEX_MODEL,
      effort: opts.effort ?? env["CODEX_OPS_EFFORT"] ?? DEFAULT_CODEX_EFFORT,
    },
    env,
  );
}

/**
 * `codex exec … -` that starts the session: the learner's command line (codexCommand) with the ops profile and the
 * compaction limit; the stdin is the ops prompt alone (not the learner's preamble, which maps a task's tool names).
 */
export function initCommand(request: EngineRequest, prompt: string, bin: string): CommandLine {
  const base = codexCommand(request, "", bin);
  if (base.args.at(-1) !== "-") throw new Error("codexCommand no longer ends with '-'");
  return { command: base.command, args: [...base.args.slice(0, -1), "-c", `model_auto_compact_token_limit=${AUTO_COMPACT_TOKENS}`, "-"], stdin: prompt };
}

/**
 * `codex exec resume <id> … -`: the same options (resume takes -c, --model, --disable, --json, --ignore-*), minus --cd,
 * which resume does not accept (the process is started in the project root instead). The profile and every -c setting
 * are passed again on each wake: codex does not keep them with the session (verified 2026-10-04: a resumed turn ran
 * under the profile, home read-only, no 127.0.0.1).
 */
export function resumeCommand(request: EngineRequest, sessionId: string, message: string, bin: string): CommandLine {
  if (!SESSION_ID.test(sessionId)) throw new Error(`not a codex session id: ${sessionId.slice(0, 60)}`);
  const init = initCommand(request, message, bin);
  const options = init.args.slice(1, -1);
  const cd = options.indexOf("--cd");
  if (cd >= 0) options.splice(cd, 2);
  return { command: init.command, args: ["exec", "resume", ...options, sessionId, "-"], stdin: message };
}

/**
 * The interactive TUI's arguments for the same session (CODEX_OPS_MODE=herdr; docs/codex-ops.md「herdr 托管」):
 * `codex resume <options> <session id>` (or `codex <options>` without an id, for a throwaway test session), passed to
 * `herdr agent start ops --kind codex --pane <id> -- <these>`. The options are initCommand's minus what only `codex
 * exec` has (--json, --ignore-user-config, --ignore-rules; the TUI rejects them) and the trailing '-', plus --no-daemon
 * so the turn runs in the pane's own process (not in a shared app-server started under another configuration).
 * Without --ignore-user-config the TUI reads ~/.codex/config.toml; every setting that matters here is passed with -c and
 * wins over it (profile, model, effort, approval_policy=never, compaction), and the hooks feature stays disabled.
 */
export function interactiveArgs(request: EngineRequest, sessionId?: string): string[] {
  if (sessionId !== undefined && !SESSION_ID.test(sessionId)) throw new Error(`not a codex session id: ${sessionId.slice(0, 60)}`);
  const args = initCommand(request, "", "codex").args;
  const head = args.slice(0, 5);
  if (head.join(" ") !== "exec --json --ignore-user-config --ignore-rules --cd") throw new Error(`codexCommand changed its leading options: ${head.join(" ")}`);
  const options = args.slice(4, -1); // from --cd <dir> to the last option, without the '-'
  return sessionId ? ["resume", ...options, "--no-daemon", sessionId] : [...options, "--no-daemon"];
}

/**
 * How a kind of process is hosted (docs/codex-ops.md「herdr 托管」): the environment variable, else `<key>=<value>` in
 * <state dir>/hosting (a file, so the switch needs no crontab edit), else the default. Keys: ops (exec | herdr),
 * learners and autoplay (setsid | herdr); the same reader is in ops/learner_jobs.py and ops/codex-ops-actions.sh.
 */
export function hostingMode(dir: string, key: string, envName: string, fallback: string, env: NodeJS.ProcessEnv = process.env): string {
  let value = (env[envName] ?? "").trim();
  if (!value) {
    try {
      for (const line of readFileSync(join(dir, "hosting"), "utf8").split("\n")) {
        const at = line.indexOf("=");
        if (at > 0 && line.slice(0, at).trim() === key) value = line.slice(at + 1).trim();
      }
    } catch {
      // no file: the default
    }
  }
  return value || fallback;
}

export const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function readSessionId(paths: OpsPaths): string | undefined {
  if (!existsSync(paths.sessionFile)) return undefined;
  const id = readFileSync(paths.sessionFile, "utf8").trim();
  return SESSION_ID.test(id) ? id : undefined;
}

/* ---- events ------------------------------------------------------------------------------------------------- */

/** A queued event: ops/codex-ops/queue/<epoch ns>-<kind>.md, the file's text is the event (written by codex-ops.sh). */
export interface QueuedEvent {
  file: string;
  name: string;
  kind: string;
  text: string;
}

const EVENT_FILE = /^(\d+)-([a-z][a-z0-9-]*)\.md$/;

/** The queued events, oldest first (the names start with the enqueue time in ns). */
export function readQueue(queueDir: string): QueuedEvent[] {
  let names: string[];
  try {
    names = readdirSync(queueDir);
  } catch {
    return [];
  }
  return names
    .filter((name) => EVENT_FILE.test(name))
    .sort((a, b) => {
      const [x, y] = [BigInt(EVENT_FILE.exec(a)![1]!), BigInt(EVENT_FILE.exec(b)![1]!)];
      return x < y ? -1 : x > y ? 1 : 0;
    })
    .map((name) => {
      const file = join(queueDir, name);
      let text = "";
      try {
        text = readFileSync(file, "utf8").trim();
      } catch {
        // gone meanwhile
      }
      return { file, name, kind: EVENT_FILE.exec(name)![2]!, text };
    });
}

/** "2026-10-04 21:30" in the machine's time zone (CST), as decision-log writes it. */
export function localStamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The message of one wake: every queued event, numbered, and the reminder of how a wake ends. */
export function wakeMessage(events: QueuedEvent[], now: Date): string {
  const lines = [`【调度器事件】${localStamp(now)}（CST），共 ${events.length} 件：`, ""];
  events.forEach((event, i) => lines.push(`${i + 1}. [${event.kind}] ${event.text}`, ""));
  lines.push(
    "按 prompt 处理这些事件。沙箱外的操作用 `bash ops/codex-ops-do.sh <动作> [参数]`。要汇报的写进 ops/inbox-dev.md（给 Dai 定的同时写 notes/for-dai.md），写时间前先跑 `date`。",
    "处理完就结束这一轮，不要 sleep 或轮询等待：调度器有新事件会再叫醒你。最后用一两句话总结这一轮做了什么（这段回答记进 ops/codex-ops/wakes.jsonl，没人实时看）。",
  );
  return lines.join("\n");
}

/** The first message of the session: the ops prompt, then any events already queued. */
export function initMessage(prompt: string, events: QueuedEvent[], now: Date): string {
  const head = `${prompt.trim()}\n\n---\n【调度器】这是运维会话的第一轮（${localStamp(now)} CST）：按「开工」做。以后每一轮都是调度器发来的事件消息。`;
  return events.length > 0 ? `${head}\n\n${wakeMessage(events, now)}` : head;
}

/* ---- broker ------------------------------------------------------------------------------------------------- */

/**
 * The actions the ops model may ask for outside its sandbox (ops/codex-ops-actions.sh implements them; the script
 * re-checks its own arguments). args = how many arguments; ms = the broker's time limit.
 */
export const ACTIONS: Record<string, { args: number; ms: number }> = {
  procs: { args: 0, ms: 30_000 },
  "stall-check": { args: 0, ms: 60_000 },
  "mod-state": { args: 0, ms: 30_000 },
  "autoplay-start": { args: 0, ms: 60_000 },
  "autoplay-reload": { args: 2, ms: 30_000 },
  "autoplay-stop": { args: 0, ms: 30_000 },
  "play-stop": { args: 0, ms: 30_000 },
  kill: { args: 1, ms: 30_000 },
  "launch-game": { args: 0, ms: 240_000 },
  "win-procs": { args: 0, ms: 60_000 },
  "win-kill": { args: 1, ms: 60_000 },
  postmortem: { args: 1, ms: 30_000 },
  "experience-update": { args: 1, ms: 30_000 },
  "fix-batch": { args: 0, ms: 30_000 },
  "boss-sim-check": { args: 0, ms: 120_000 },
  "codex-brain-cache-probe": { args: 0, ms: 1_260_000 },
  "strategy-proposal": { args: 1, ms: 30_000 },
  "learner-merge": { args: 1, ms: 30_000 },
  "learner-recheck": { args: 1, ms: 3_700_000 },
  "eval-metrics": { args: 2, ms: 600_000 },
  "learner-status": { args: 0, ms: 30_000 },
  "scheduler-status": { args: 0, ms: 30_000 },
};

/** An argument: a PID or a comma-separated list of run ids (no spaces, no shell characters, no leading dash). */
export const ARG = /^[A-Za-z0-9][A-Za-z0-9,._:-]{0,199}$/;

export type BrokerRequest = { ok: true; action: string; args: string[] } | { ok: false; error: string };

export function validateRequest(raw: unknown): BrokerRequest {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: "请求不是 JSON 对象" };
  const { action, args } = raw as { action?: unknown; args?: unknown };
  if (typeof action !== "string" || !Object.prototype.hasOwnProperty.call(ACTIONS, action)) {
    return { ok: false, error: `没有这个动作：${String(action).slice(0, 40)}（可用：${Object.keys(ACTIONS).join(" ")}）` };
  }
  const list = args === undefined ? [] : args;
  if (!Array.isArray(list) || !list.every((arg) => typeof arg === "string")) return { ok: false, error: "args 必须是字符串数组" };
  const spec = ACTIONS[action]!;
  if (list.length !== spec.args) return { ok: false, error: `${action} 要 ${spec.args} 个参数，给了 ${list.length} 个` };
  const bad = list.find((arg) => !ARG.test(arg));
  if (bad !== undefined) return { ok: false, error: `参数不合格：${bad.slice(0, 40)}` };
  if (action === "autoplay-reload" && (list.some((arg) => !/^[1-9][0-9]{0,9}$/.test(arg)
      || Number(arg) <= 1 || Number(arg) > 2_147_483_647) || list[0] === list[1])) {
    return { ok: false, error: "autoplay-reload 要两个不同的有效 PID：旧 autoplay、当前 play" };
  }
  if (action === "eval-metrics") {
    if (!/^(ironclad|silent|regent|necrobinder|defect)$/.test(list[0]!)) return { ok: false, error: "eval-metrics 要一个已知角色的知识 id" };
    if (!/^(0|[1-9][0-9]{0,2})$/.test(list[1]!)) return { ok: false, error: "eval-metrics 进阶要是 0–999 的整数（不带前导零）" };
  }
  if (action === "strategy-proposal" && !/^[0-9A-Z]{12}(,[0-9A-Z]{12}){0,9}$/.test(list[0]!)) {
    return { ok: false, error: "strategy-proposal 要 1–10 个 12 位局号" };
  }
  if (action === "learner-recheck" && !/^[0-9]{8}-[0-9]{6}-(experience-update|fix-batch|strategy-proposal)$/.test(list[0]!)) {
    return { ok: false, error: "learner-recheck 要写入任务的完整批次 id" };
  }
  return { ok: true, action, args: list };
}

/** Broker files: <id>.req (written by codex-ops-do.sh), claimed as <id>.run, answered as <id>.res. */
export const REQUEST_ID = /^[0-9]+-[0-9]+$/;

/* ---- session growth ----------------------------------------------------------------------------------------- */

export interface SessionGrowth {
  bytes: number;
  /** The context of the last model call (token_count last_token_usage.input_tokens): what the next wake starts from. */
  contextTokens?: number;
  window?: number;
  /** Compactions recorded in the session file (a "compacted" row or a context_compacted event). */
  compactions: number;
  /** Turns (task_started events): the first turn plus one per wake. */
  turns: number;
  /** Cached primary observation; its duration may be unknown. */
  usedPercent?: number;
  weeklyUsedPercent?: number;
  fiveHourUsedPercent?: number;
}

/** How big the ops session has grown, from codex's own session file ($CODEX_HOME/sessions/…/rollout-…-<id>.jsonl). */
export function sessionGrowth(text: string): SessionGrowth {
  const growth: SessionGrowth = { bytes: Buffer.byteLength(text), compactions: 0, turns: 0 };
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let row: { type?: string; payload?: Record<string, unknown> };
    try {
      row = JSON.parse(line) as typeof row;
    } catch {
      continue;
    }
    const kind = String(row.payload?.["type"] ?? "");
    if (row.type === "compacted" || kind === "context_compacted") growth.compactions += 1;
    if (kind === "task_started") growth.turns += 1;
    if (kind === "token_count") {
      const info = row.payload?.["info"] as { last_token_usage?: { input_tokens?: number }; model_context_window?: number } | null | undefined;
      if (info?.last_token_usage?.input_tokens !== undefined) growth.contextTokens = info.last_token_usage.input_tokens;
      if (info?.model_context_window !== undefined) growth.window = info.model_context_window;
      const limits = row.payload?.["rate_limits"] as Record<string, { used_percent?: number; window_minutes?: number }> | null | undefined;
      if (limits?.primary?.used_percent !== undefined) growth.usedPercent = limits.primary.used_percent;
      // Slots can swap after plan changes; identify each window by its reported duration.
      if (limits) {
        delete growth.weeklyUsedPercent;
        delete growth.fiveHourUsedPercent;
        for (const slot of ["primary", "secondary"]) {
          const w = limits[slot];
          if (typeof w?.used_percent !== "number" || !Number.isFinite(w.used_percent)) continue;
          if (w.window_minutes === 10080) growth.weeklyUsedPercent = w.used_percent;
          if (w.window_minutes === 300) growth.fiveHourUsedPercent = w.used_percent;
        }
      }
    }
  }
  return growth;
}
