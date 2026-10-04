/**
 * The offline learner's launcher (docs/v4-architecture.md §1 "学习者", M4): renders a task brief
 * (learner/tasks/*.md) and hands it to a CLI agent (claude on the subscription login; codex once installed).
 *
 *   agent/node_modules/.bin/tsx learner/run.ts --engine claude --task postmortem --set runs=A,B,C --cwd <worktree>
 *     [--model opus] [--dry-run] [--max-turns N] [--timeout-min N] [--with-tools [--ascension N]]
 *
 * The agent's whole event stream goes to learner/runs/<time>-<task>.jsonl, framed by a learner_launch line
 * (task, parameters, command, full prompt) and a learner_summary line; its temporary files go to the matching
 * learner/runs/<time>-<task>/ directory ({{scratch}}). Keys never reach the agent (childEnv) and never stay in
 * the log (redactSecrets).
 *
 * Exit codes: 0 done, 1 the agent failed, 2 usage/task error, 3 engine or tool server unavailable, 124 timeout.
 */
import { spawn } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";

import { PROJECT_ROOT as REPO_ROOT, workspaceRoot } from "../../agent/src/core/paths.js";
import { DEFAULT_KNOWLEDGE_DIR } from "../../agent/src/knowledge/render/data.js";
import { mcpLaunchSpec, type McpLaunchSpec } from "../../agent/src/brain/tools/mcp-launch.js";
import { ENGINES, EngineUnavailableError, childEnv, engineBinary, engineCommand, shellQuote, strippedEnvNames, unavailableMessage, type EngineName, type EngineRequest } from "./engines.js";
import { SummaryTracker, formatSummary, progressLine } from "./summary.js";
import { LearnerUsageError, loadTask, parseSets, renderTask } from "./task.js";

/** This checkout (the launcher's own repository: core/paths.ts PROJECT_ROOT). */
export const REPO = REPO_ROOT;
/**
 * The workspace the agent works in (core/paths.ts workspaceRoot: STS2_WORKSPACE, else this checkout): its notes/, logs/
 * and worktrees (.worktrees/) are inside it.
 */
export const PROJECT_ROOT = workspaceRoot();

function entries(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

/**
 * The files whose key values must never stay in a log: the key files in the home directory (and its env backups
 * ~/.sts2-jev-env*), and every .env (or *.env) in the workspace, in its agent/, in each directory directly under it
 * (the old sibling worktrees: jev-sts2-v3/.env) and its agent/, and in each .worktrees/<name>/ and its agent/. Listed
 * whether or not they exist (collectSecrets skips a missing one).
 */
export function secretFilesOf(workspace: string, home: string = homedir()): string[] {
  const files = [join(home, ".jev_api_keys"), join(home, ".deepseek_api_key"), ...entries(home).filter((name) => name.startsWith(".sts2-jev-env")).map((name) => join(home, name))];
  const dirs = [workspace, join(workspace, "agent")];
  for (const name of entries(workspace)) if (name !== "node_modules") dirs.push(join(workspace, name), join(workspace, name, "agent"));
  for (const name of entries(join(workspace, ".worktrees"))) dirs.push(join(workspace, ".worktrees", name), join(workspace, ".worktrees", name, "agent"));
  for (const dir of dirs) {
    files.push(join(dir, ".env"));
    for (const name of entries(dir)) if (name !== ".env" && name.endsWith(".env")) files.push(join(dir, name));
  }
  return [...new Set(files)];
}

export interface LauncherDeps {
  env: NodeJS.ProcessEnv;
  projectRoot: string;
  tasksDir: string;
  runsDir: string;
  /** Files whose key values must never stay in a log. */
  secretFiles: string[];
  now: () => Date;
  out: (text: string) => void;
  err: (text: string) => void;
}

export function defaultDeps(): LauncherDeps {
  return {
    env: process.env,
    projectRoot: PROJECT_ROOT,
    tasksDir: join(REPO, "learner", "tasks"),
    runsDir: join(REPO, "learner", "runs"),
    secretFiles: secretFilesOf(PROJECT_ROOT),
    now: () => new Date(),
    out: (text) => process.stdout.write(text),
    err: (text) => process.stderr.write(text),
  };
}

export const USAGE = `usage: agent/node_modules/.bin/tsx learner/run.ts --engine claude|codex --task <name|path.md> --cwd <dir> [--set name=value ...]
         [--model M] [--max-turns N] [--timeout-min N] [--dry-run] [--with-tools [--ascension N] [--knowledge-dir D]]
tasks: learner/tasks/*.md (postmortem, experience-update, fix-batch, smoke)`;

export interface LauncherOptions {
  engine: EngineName;
  task: string;
  cwd: string;
  sets: string[];
  model?: string;
  maxTurns?: number;
  timeoutMin?: number;
  dryRun: boolean;
  withTools: boolean;
  ascension?: number;
  knowledgeDir?: string;
  help: boolean;
}

function wholeNumber(flag: string, raw: string | undefined): number {
  if (raw === undefined || !/^\d+$/.test(raw) || Number(raw) <= 0) throw new LearnerUsageError(`${flag} 要一个正整数`);
  return Number(raw);
}

export function parseArgs(argv: string[]): LauncherOptions {
  const options: Partial<LauncherOptions> & { sets: string[]; dryRun: boolean; withTools: boolean; help: boolean } = { sets: [], dryRun: false, withTools: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    const value = (): string => {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) throw new LearnerUsageError(`${arg} 后面要跟一个值`);
      i += 1;
      return next;
    };
    switch (arg) {
      case "--engine": {
        const engine = value();
        if (!(ENGINES as readonly string[]).includes(engine)) throw new LearnerUsageError(`--engine 只能是 ${ENGINES.join(" / ")}，不是「${engine}」`);
        options.engine = engine as EngineName;
        break;
      }
      case "--task": options.task = value(); break;
      case "--cwd": options.cwd = value(); break;
      case "--set": options.sets.push(value()); break;
      case "--model": options.model = value(); break;
      case "--max-turns": options.maxTurns = wholeNumber(arg, value()); break;
      case "--timeout-min": options.timeoutMin = wholeNumber(arg, value()); break;
      case "--ascension": options.ascension = wholeNumber(arg, value()); break;
      case "--knowledge-dir": options.knowledgeDir = value(); break;
      case "--dry-run": options.dryRun = true; break;
      case "--with-tools": options.withTools = true; break;
      case "-h":
      case "--help": options.help = true; break;
      default: throw new LearnerUsageError(`不认识的参数「${arg}」`);
    }
  }
  if (options.help) return { engine: "claude", task: "", cwd: "", ...options } as LauncherOptions;
  if (!options.engine) throw new LearnerUsageError("缺少 --engine");
  if (!options.task) throw new LearnerUsageError("缺少 --task");
  if (!options.cwd) throw new LearnerUsageError("缺少 --cwd（agent 的工作目录，要在项目目录里）");
  if (!options.withTools && (options.ascension !== undefined || options.knowledgeDir !== undefined)) throw new LearnerUsageError("--ascension / --knowledge-dir 只和 --with-tools 一起用");
  return options as LauncherOptions;
}

/** YYYYMMDD-HHMMSS in local time: the run's file stem. */
export function stamp(date: Date): string {
  const p = (n: number): string => String(n).padStart(2, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

function inside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === "" || (!rel.startsWith("..") && !rel.startsWith(sep) && rel !== "..");
}

/**
 * Our stdio MCP tool server, started the way agent/src/brain/tools/mcp-launch.ts says. The server (agent/src/brain/tools/mcp-server.ts)
 * is built on the v4-brain branch; until it is merged here, --with-tools stops with an explanation.
 */
export function toolServerSpec(options: LauncherOptions, projectRoot: string, env: NodeJS.ProcessEnv): McpLaunchSpec {
  const spec = mcpLaunchSpec({
    ascension: options.ascension ?? Number(env["TARGET_ASCENSION"] ?? 9),
    knowledgeDir: options.knowledgeDir ? resolve(options.knowledgeDir) : DEFAULT_KNOWLEDGE_DIR,
    logsDir: join(projectRoot, "logs"),
  });
  const missing = spec.args.filter((arg) => /(mcp-server\.ts|\/tsx)$/.test(arg) && !existsSync(arg));
  if (missing.length > 0) {
    throw new EngineUnavailableError(
      `--with-tools 用不了：找不到 ${missing.join("、")}。stdio MCP 服务器（agent/src/brain/tools/mcp-server.ts）在 v4-brain 分支上开发，合入 v4、再合到这个分支后才能用；现在先不带 --with-tools 运行。`,
    );
  }
  // The post-mortems the kb_postmortem tool reads: the workspace's notes/lessons.md.
  return { ...spec, env: { ...spec.env, KNOWLEDGE_LESSONS_FILE: join(projectRoot, "notes", "lessons.md") } };
}

/** Variable names that hold where a key is or what it is for, not the key itself. */
const NOT_SECRET_NAME = /(_FILE|_PATH|_DIR|_URL|_HOST|_MODEL)$/i;
const SECRET_NAME = /KEY|TOKEN|SECRET|PASSWORD/i;

/**
 * Key values from the key files and the stripped variables (never printed; only used to scan logs). A value
 * counts when it is at least 16 characters, has no whitespace, and is not a path or a URL (the smoke run
 * found ".env: DEEPSEEK_API_KEY_FILE=~/.deepseek_api_key" otherwise redacting the task text).
 */
export function collectSecrets(files: string[], env: NodeJS.ProcessEnv, stripped: string[]): string[] {
  const secrets = new Set<string>();
  const add = (raw: string | undefined): void => {
    const value = (raw ?? "").trim().replace(/^(['"])(.*)\1$/, "$2");
    if (value.length >= 16 && !/\s/.test(value) && !/^[~./]/.test(value) && !value.includes("://")) secrets.add(value);
  };
  for (const file of files) {
    let text: string;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    const isEnvFile = /\.env$/.test(file);
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const at = trimmed.indexOf("=");
      if (at < 0) {
        if (!isEnvFile) add(trimmed);
        continue;
      }
      const name = trimmed.slice(0, at).replace(/^export\s+/, "").trim();
      if (NOT_SECRET_NAME.test(name)) continue;
      if (!isEnvFile || SECRET_NAME.test(name)) add(trimmed.slice(at + 1));
    }
  }
  for (const name of stripped) if (SECRET_NAME.test(name) && !NOT_SECRET_NAME.test(name)) add(env[name]);
  return [...secrets];
}

/** Replaces every secret in the file with [REDACTED]; returns how many were found. */
export function redactSecrets(path: string, secrets: string[]): number {
  if (secrets.length === 0 || !existsSync(path)) return 0;
  let text = readFileSync(path, "utf8");
  let found = 0;
  for (const secret of secrets) {
    const parts = text.split(secret);
    if (parts.length > 1) {
      found += parts.length - 1;
      text = parts.join("[REDACTED]");
    }
  }
  if (found > 0) writeFileSync(path, text);
  return found;
}

/** Runs the launcher; returns the process exit code. */
export async function main(argv: string[], overrides: Partial<LauncherDeps> = {}): Promise<number> {
  const deps = { ...defaultDeps(), ...overrides };
  let options: LauncherOptions;
  let prepared: { request: EngineRequest; prompt: string; values: Record<string, string>; taskName: string; timeoutMin?: number; logPath: string; scratch: string };
  try {
    options = parseArgs(argv);
    if (options.help) {
      deps.out(`${USAGE}\n`);
      return 0;
    }
    const cwd = resolve(options.cwd);
    if (!existsSync(cwd) || !statSync(cwd).isDirectory()) throw new LearnerUsageError(`--cwd ${cwd} 不是目录`);
    if (!inside(deps.projectRoot, cwd)) throw new LearnerUsageError(`--cwd ${cwd} 不在项目目录 ${deps.projectRoot} 里`);
    const spec = loadTask(options.task, deps.tasksDir);
    const stem = `${stamp(deps.now())}-${spec.name}`;
    const scratch = join(deps.runsDir, stem);
    const builtins = { cwd, worktree: cwd, project_root: deps.projectRoot, logs_dir: join(deps.projectRoot, "logs"), scratch, task: spec.name };
    const rendered = renderTask(spec, parseSets(options.sets), builtins);
    const model = options.model ?? spec.model;
    const maxTurns = options.maxTurns ?? spec.maxTurns;
    const request: EngineRequest = {
      engine: options.engine,
      cwd,
      projectRoot: deps.projectRoot,
      tools: spec.tools,
      ...(model ? { model } : {}),
      ...(maxTurns !== undefined ? { maxTurns } : {}),
      ...(options.withTools ? { mcp: toolServerSpec(options, deps.projectRoot, deps.env) } : {}),
    };
    const timeoutMin = options.timeoutMin ?? spec.timeoutMin;
    prepared = { request, prompt: rendered.prompt, values: rendered.values, taskName: spec.name, ...(timeoutMin !== undefined ? { timeoutMin } : {}), logPath: `${scratch}.jsonl`, scratch };
  } catch (error) {
    if (error instanceof LearnerUsageError) {
      deps.err(`${error.message}\n${USAGE}\n`);
      return 2;
    }
    if (error instanceof EngineUnavailableError) {
      deps.err(`${error.message}\n`);
      return 3;
    }
    throw error;
  }

  const { request, prompt, logPath, scratch } = prepared;
  const binary = engineBinary(request.engine, deps.env);
  const command = engineCommand(request, prompt, binary ?? request.engine);
  const stripped = strippedEnvNames(deps.env, request.engine);

  if (options.dryRun) {
    deps.out(`===== 最终提示（${prepared.taskName}，${prompt.length} 字）=====\n${prompt}\n`);
    deps.out(`===== 命令行（工作目录 ${request.cwd}；提示从 stdin 传入）=====\n${shellQuote([command.command, ...command.args])}\n`);
    deps.out(`===== 子进程环境去掉的变量（${stripped.length} 个，只列名字）=====\n${stripped.join(" ") || "（无）"}\n`);
    deps.out(`超时：${prepared.timeoutMin ?? "无"} 分钟；日志将写到 ${logPath}\n`);
    if (!binary) deps.err(`注意：${unavailableMessage(request.engine)}\n`);
    return 0;
  }
  if (!binary) {
    deps.err(`${unavailableMessage(request.engine)}\n`);
    return 3;
  }

  mkdirSync(scratch, { recursive: true });
  const started = deps.now();
  const log = (event: Record<string, unknown>): void => appendFileSync(logPath, `${JSON.stringify(event)}\n`);
  log({
    type: "learner_launch",
    ts: started.toISOString(),
    engine: request.engine,
    task: prepared.taskName,
    params: prepared.values,
    cwd: request.cwd,
    command: [command.command, ...command.args],
    timeout_min: prepared.timeoutMin ?? null,
    stripped_env: stripped,
    prompt,
  });

  const tracker = new SummaryTracker(request.engine);
  const child = spawn(command.command, command.args, { cwd: request.cwd, env: childEnv(deps.env, request.engine), stdio: ["pipe", "pipe", "pipe"] });
  const elapsed = (): string => {
    const seconds = Math.round((deps.now().getTime() - started.getTime()) / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };
  deps.err(`学习者 ${request.engine} / ${prepared.taskName} 已启动（PID ${child.pid ?? "?"}），日志 ${logPath}\n`);

  let timedOut = false;
  let killTimer: NodeJS.Timeout | undefined;
  const timer = prepared.timeoutMin
    ? setTimeout(() => {
        timedOut = true;
        deps.err(`[${elapsed()}] 超过 ${prepared.timeoutMin} 分钟，终止 PID ${child.pid}\n`);
        child.kill("SIGTERM");
        killTimer = setTimeout(() => child.kill("SIGKILL"), 10_000);
      }, prepared.timeoutMin * 60_000)
    : undefined;
  const onSignal = (): void => {
    child.kill("SIGTERM");
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  const stdoutDone = new Promise<void>((done) => {
    const lines = createInterface({ input: child.stdout! });
    lines.on("line", (line) => {
      appendFileSync(logPath, `${line}\n`);
      const event = tracker.feed(line);
      const progress = event && progressLine(request.engine, event);
      if (progress) deps.err(`${progress.split("\n").map((text) => `[${elapsed()}] ${text}`).join("\n")}\n`);
    });
    lines.on("close", () => done());
  });
  const stderrDone = new Promise<void>((done) => {
    const lines = createInterface({ input: child.stderr! });
    lines.on("line", (line) => log({ type: "learner_stderr", text: line }));
    lines.on("close", () => done());
  });
  child.stdin!.on("error", () => undefined); // the agent may exit before reading everything
  child.stdin!.end(command.stdin);

  const [exitCode, signal] = await new Promise<[number | null, NodeJS.Signals | null]>((done) => {
    child.on("error", (error) => {
      log({ type: "learner_error", message: error.message });
      done([null, null]);
    });
    child.on("close", (code, sig) => done([code, sig]));
  });
  await Promise.all([stdoutDone, stderrDone]);
  if (timer) clearTimeout(timer);
  if (killTimer) clearTimeout(killTimer);
  process.removeListener("SIGINT", onSignal);
  process.removeListener("SIGTERM", onSignal);

  const wallMs = deps.now().getTime() - started.getTime();
  const summary = tracker.summary;
  log({ type: "learner_summary", ts: deps.now().toISOString(), exit_code: exitCode, signal, timed_out: timedOut, wall_ms: wallMs, summary });
  const redacted = redactSecrets(logPath, collectSecrets(deps.secretFiles, deps.env, stripped));
  deps.out(`${summary.result ? `${summary.result}\n\n` : ""}${formatSummary(summary, { task: prepared.taskName, exitCode, signal, timedOut, wallMs, logPath, redacted })}\n`);
  if (timedOut) return 124;
  return exitCode === 0 && !summary.isError ? 0 : 1;
}
