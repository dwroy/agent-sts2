/**
 * The offline learner's launcher (docs/v4-architecture.md §1 "学习者", M4): renders a task brief
 * (learner/tasks/*.md) and hands it to a CLI agent (claude on the subscription login; codex once installed).
 *
 *   agent/node_modules/.bin/tsx learner/run.ts --engine claude --task postmortem --set runs=A,B,C --cwd <worktree>
 *     [--model opus] [--dry-run] [--max-turns N] [--timeout-min N] [--character silent] [--with-tools [--ascension N]]
 *
 * The character (--character, else CHARACTER, else ironclad; the game's character_id lower-cased) picks the knowledge
 * the task works on ({{character}}, {{experience_path}}, … in task.ts) and the runs it may name: a --set runs/run id
 * that logs/runs.jsonl records for another character is refused (a row without `character` is a legacy Ironclad run).
 *
 * The agent's whole event stream goes to learner/runs/<time>-<task>.jsonl, framed by a learner_launch line
 * (task, parameters, command, full prompt) and a learner_summary line; its temporary files go to the matching
 * learner/runs/<time>-<task>/ directory ({{scratch}}). Keys never reach the agent (childEnv) and never stay in
 * the log (redactSecrets).
 *
 * Exit codes: 0 done, 1 the agent failed, 2 usage/task error, 3 engine or tool server unavailable, 124 timeout.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, readSync, renameSync, rmSync, statSync, writeSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, relative, resolve, sep } from "node:path";
import { createInterface } from "node:readline";

import { PROJECT_ROOT as REPO_ROOT, workspaceRoot } from "../../agent/src/core/paths.js";
import { DEFAULT_KNOWLEDGE_DIR } from "../../agent/src/knowledge/render/data.js";
import { DEFAULT_CHARACTER, characterKey } from "../../agent/src/knowledge/files.js";
import { mcpLaunchSpec, type McpLaunchSpec } from "../../agent/src/brain/tools/mcp-launch.js";
import { checkCodex, type CodexCheck } from "../../agent/src/brain/engines/codex.js";
import { AUTH_ERROR, refreshCodexAuth } from "../../agent/src/brain/engines/codex-usage.js";
import { ENGINES, EngineUnavailableError, childEnv, codexChildEnv, codexKeyCheck, withCodexKeys, type KeyCheck, engineBinary, engineCommand, engineDefaults, learnerCodexHome, shellQuote, strippedEnvNames, unavailableMessage, type EngineName, type EngineRequest } from "./engines.js";
import { SummaryTracker, findRollout, formatSummary, progressLine, rolloutStats } from "./summary.js";
import { highestAscension, runCharacters } from "./runs.js";
import { LearnerUsageError, characterBuiltins, loadTask, parseSets, renderTask } from "./task.js";
import { captureStartupLease, StartupEvidence } from "./startup-recovery.js";

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
  /** codex's start-up check before a run (default: the brain's checkCodex: version, login, no $CODEX_HOME/AGENTS.md, model and effort in the catalog). */
  checkCodex?: (bin: string, home: string, model: string, effort: string) => Promise<CodexCheck>;
  /** codex's token refresh after a run refused on the login (default: the brain's refreshCodexAuth). */
  refreshCodexAuth?: (bin: string, home: string, env: Record<string, string>) => Promise<void>;
  /** The key-isolation pre-check before every codex run (default: engines.ts codexKeyCheck). */
  checkKeys?: (bin: string, request: EngineRequest, env: Record<string, string>) => Promise<KeyCheck>;
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
    checkCodex: (bin, home, model, effort) => checkCodex({ bin, home }, model, effort, { stateDir: join(LEARNER_CODEX_STATE, "check") }),
    refreshCodexAuth: (bin, home, env) => refreshCodexAuth({ bin, home, env, stateDir: join(LEARNER_CODEX_STATE, "auth") }),
    checkKeys: codexKeyCheck,
  };
}

/** SQLite state and logs of the learner's codex start-up checks and token refreshes (never CODEX_HOME's). */
const LEARNER_CODEX_STATE = join(tmpdir(), "jev-learner-codex-state");

export const USAGE = `usage: agent/node_modules/.bin/tsx learner/run.ts --engine claude|codex --task <name|path.md> --cwd <dir> [--set name=value ...]
         [--model M] [--effort E] [--max-turns N] [--timeout-min N] [--dry-run] [--character ID] [--with-tools [--ascension N] [--knowledge-dir D]]
tasks: learner/tasks/*.md (postmortem, experience-update, fix-batch, smoke)`;

export interface LauncherOptions {
  engine: EngineName;
  task: string;
  cwd: string;
  sets: string[];
  model?: string;
  effort?: string;
  maxTurns?: number;
  timeoutMin?: number;
  dryRun: boolean;
  withTools: boolean;
  ascension?: number;
  knowledgeDir?: string;
  /** Knowledge id (characterKey of the flag); undefined = CHARACTER / ironclad (resolveCharacter). */
  character?: string;
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
      case "--effort": options.effort = value(); break;
      case "--max-turns": options.maxTurns = wholeNumber(arg, value()); break;
      case "--timeout-min": options.timeoutMin = wholeNumber(arg, value()); break;
      case "--ascension": {
        // 0 is a real ascension (a new character climbs from A0).
        const raw = value();
        if (!/^\d+$/.test(raw)) throw new LearnerUsageError(`${arg} 要一个不小于 0 的整数`);
        options.ascension = Number(raw);
        break;
      }
      case "--character": {
        const raw = value();
        const id = characterKey(raw);
        if (!id) throw new LearnerUsageError(`--character 要一个角色 id（如 ironclad、silent），不是「${raw}」`);
        options.character = id;
        break;
      }
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

/** The run's character: --character, else CHARACTER from the environment, else the Ironclad. */
export function resolveCharacter(options: Pick<LauncherOptions, "character">, env: NodeJS.ProcessEnv): string {
  return options.character ?? characterKey(env["CHARACTER"]) ?? DEFAULT_CHARACTER;
}

/**
 * The ascension the tool server answers for when --ascension is not given: TARGET_ASCENSION when it is a number;
 * unset, 9 (as before). Any other value ("climb": each character climbs from A0, +1 per win) is the highest ascension
 * this character has played in runs.jsonl, or 0 when it has played none.
 */
export function defaultAscension(env: NodeJS.ProcessEnv, character: string, runsFile: string): number {
  const raw = env["TARGET_ASCENSION"];
  if (raw === undefined) return 9;
  if (/^\s*\d+\s*$/.test(raw)) return Number(raw);
  return highestAscension(runsFile, character) ?? 0;
}

/**
 * Our stdio MCP tool server, started the way agent/src/brain/tools/mcp-launch.ts says. The server (agent/src/brain/tools/mcp-server.ts)
 * is built on the v4-brain branch; until it is merged here, --with-tools stops with an explanation.
 */
export function toolServerSpec(options: LauncherOptions, projectRoot: string, env: NodeJS.ProcessEnv): McpLaunchSpec {
  const character = resolveCharacter(options, env);
  const spec = mcpLaunchSpec({
    ascension: options.ascension ?? defaultAscension(env, character, join(projectRoot, "logs", "runs.jsonl")),
    knowledgeDir: options.knowledgeDir ? resolve(options.knowledgeDir) : DEFAULT_KNOWLEDGE_DIR,
    logsDir: join(projectRoot, "logs"),
  });
  const missing = spec.args.filter((arg) => /(mcp-server\.ts|\/tsx)$/.test(arg) && !existsSync(arg));
  if (missing.length > 0) {
    throw new EngineUnavailableError(
      `--with-tools 用不了：找不到 ${missing.join("、")}。stdio MCP 服务器（agent/src/brain/tools/mcp-server.ts）在 v4-brain 分支上开发，合入 v4、再合到这个分支后才能用；现在先不带 --with-tools 运行。`,
    );
  }
  // The post-mortems the kb_postmortem tool reads: the workspace's notes/lessons.md. The server reads the character's
  // knowledge (knowledge/files.ts knowledgeCharacter: CHARACTER); named whenever it is not the default or the
  // environment already names one, so an Ironclad launch keeps its old command line.
  const characterEnv: Record<string, string> = character !== DEFAULT_CHARACTER || env["CHARACTER"] !== undefined ? { CHARACTER: character } : {};
  return { ...spec, env: { ...spec.env, KNOWLEDGE_LESSONS_FILE: join(projectRoot, "notes", "lessons.md"), ...characterEnv } };
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

/** Redacts in bounded byte chunks; long-lived rollouts exceed V8's string limit. */
export function redactSecrets(path: string, secrets: string[]): number {
  if (secrets.length === 0 || !existsSync(path)) return 0;
  const tokens = [...new Set(secrets.filter(Boolean))].map((s) => Buffer.from(s)).sort((a, b) => b.length - a.length);
  if (tokens.length === 0) return 0;
  const keep = tokens[0]!.length - 1;
  const dir = mkdtempSync(`${path}.redact-`);
  const temporary = join(dir, "redacted");
  let input: number | undefined;
  let output: number | undefined;
  let found = 0;
  try {
    input = openSync(path, "r");
    output = openSync(temporary, "wx", statSync(path).mode & 0o777);
    const emit = (bytes: Buffer): void => {
      for (let written = 0; written < bytes.length;) written += writeSync(output!, bytes, written, bytes.length - written);
    };
    const chunk = Buffer.alloc(64 * 1024);
    const replacement = Buffer.from("[REDACTED]");
    let carry = Buffer.alloc(0);
    for (;;) {
      const n = readSync(input, chunk, 0, chunk.length, null);
      const bytes = Buffer.concat([carry, chunk.subarray(0, n)]);
      const boundary = n === 0 ? bytes.length : Math.max(0, bytes.length - keep);
      let start = 0;
      while (start < boundary) {
        let next = boundary;
        let matched: Buffer | undefined;
        for (const token of tokens) {
          const at = bytes.indexOf(token, start);
          if (at >= 0 && at < next) { next = at; matched = token; }
        }
        if (!matched) break;
        emit(bytes.subarray(start, next));
        emit(replacement);
        start = next + matched.length;
        found++;
      }
      if (start < boundary) { emit(bytes.subarray(start, boundary)); start = boundary; }
      carry = Buffer.from(bytes.subarray(start));
      if (n === 0) break;
    }
    closeSync(input); input = undefined;
    closeSync(output); output = undefined;
    // Leave unchanged logs (including their mtime) alone; failures preserve the original.
    if (found > 0) renameSync(temporary, path);
    return found;
  } finally {
    if (input !== undefined) closeSync(input);
    if (output !== undefined) closeSync(output);
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Refuses run ids (--set runs=… / run=…) that runs.jsonl records for another character. Ids it does not have are
 * left to the task (the post-mortem skips unfinished runs and says so).
 */
export function checkRunCharacters(sets: Record<string, string>, character: string, runsFile: string): void {
  const ids = [sets["runs"], sets["run"]].filter((value): value is string => !!value).flatMap((value) => value.split(",")).map((id) => id.trim()).filter(Boolean);
  if (ids.length === 0) return;
  const known = runCharacters(runsFile);
  const other = ids.filter((id) => known.has(id) && known.get(id) !== character);
  if (other.length > 0) {
    throw new LearnerUsageError(`这些局不是 ${character} 的（logs/runs.jsonl 的 character）：${other.map((id) => `${id}=${known.get(id)}`).join(", ")}；用 --character 指定角色，每次只给一个角色的局`);
  }
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
    const character = resolveCharacter(options, deps.env);
    const builtins = { cwd, worktree: cwd, project_root: deps.projectRoot, logs_dir: join(deps.projectRoot, "logs"), scratch, task: spec.name, ...characterBuiltins(character) };
    const sets = parseSets(options.sets);
    checkRunCharacters(sets, character, join(deps.projectRoot, "logs", "runs.jsonl"));
    const rendered = renderTask(spec, sets, builtins);
    const model = options.model ?? spec.models[options.engine] ?? engineDefaults(options.engine).model;
    const effort = options.effort ?? spec.efforts[options.engine] ?? engineDefaults(options.engine).effort;
    const maxTurns = options.maxTurns ?? spec.maxTurns;
    const request: EngineRequest = withCodexKeys({
      engine: options.engine,
      cwd,
      projectRoot: deps.projectRoot,
      tools: spec.tools,
      // Commits need the main checkout's git directory (a worktree's metadata lives there): writable, its hooks and
      // config read-only, as the ops session's profile (2026-10-04: fix-batch could not merge main, ORIG_HEAD.lock).
      extraRules: learnerGitRules(deps.projectRoot, cwd),
      ...(model ? { model } : {}),
      ...(effort ? { effort } : {}),
      ...(maxTurns !== undefined ? { maxTurns } : {}),
      ...(options.withTools ? { mcp: toolServerSpec(options, deps.projectRoot, deps.env) } : {}),
    }, deps.env);
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
  if (request.engine === "codex" && deps.checkCodex) {
    const check = await deps.checkCodex(binary, learnerCodexHome(deps.env), request.model!, request.effort!);
    if (!check.ok) {
      deps.err(`codex 用不了：${check.error}\n`);
      return 3;
    }
  }
  if (request.engine === "codex" && deps.checkKeys) {
    const keys = await deps.checkKeys(binary, request, codexChildEnv(deps.env, binary));
    if (!keys.ok) {
      deps.err(`codex 的权限配置没能挡住 key 文件，不运行：${keys.readable.length > 0 ? `读得到 ${keys.readable.join("、")}` : ""}${keys.error ? `（检查失败：${keys.error}）` : ""}\n`);
      return 3;
    }
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

  let tracker = new SummaryTracker(request.engine, request.model);
  const env = request.engine === "codex" ? codexChildEnv(deps.env, binary) : childEnv(deps.env, request.engine);
  const lease = request.engine === "codex" ? captureStartupLease(deps.env, deps.projectRoot, request.cwd) : undefined;
  const inputSha = createHash("sha256").update(command.stdin).digest("hex");
  const commandSha = createHash("sha256").update(JSON.stringify([command.command, command.args, request.cwd])).digest("hex");
  let child: ChildProcess | undefined;
  const stop = (signal: NodeJS.Signals): void => {
    if (!child) return;
    try {
      if (child.pid !== undefined) process.kill(-child.pid, signal);
      else child.kill(signal);
    } catch {
      child.kill(signal);
    }
  };
  const ms = (): number => deps.now().getTime() - started.getTime();
  const elapsed = (): string => {
    const seconds = Math.round((deps.now().getTime() - started.getTime()) / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  };
  let timedOut = false;
  let cancelled = false;
  let killTimer: NodeJS.Timeout | undefined;
  const timer = prepared.timeoutMin
    ? setTimeout(() => {
        timedOut = true;
        deps.err(`[${elapsed()}] 超过 ${prepared.timeoutMin} 分钟，终止 PID ${child?.pid ?? "?"}\n`);
        stop("SIGTERM");
        killTimer = setTimeout(() => stop("SIGKILL"), 10_000);
      }, prepared.timeoutMin * 60_000)
    : undefined;
  const onSignal = (): void => {
    cancelled = true;
    stop("SIGTERM");
    killTimer ??= setTimeout(() => stop("SIGKILL"), 10_000);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);

  let exitCode: number | null = null;
  let signal: NodeJS.Signals | null = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    // Keep the same command, prompt, environment and outer deadline; never replay a started session.
    const evidence = new StartupEvidence();
    tracker = new SummaryTracker(request.engine, request.model);
    child = spawn(command.command, command.args, { cwd: request.cwd, env, stdio: ["pipe", "pipe", "pipe"], detached: true });
    const attemptChild = child;
    const attemptStart = deps.now().toISOString();
    const identity = { attempt, batch: lease?.batch ?? null, lease: lease?.identity ?? null, input_sha256: inputSha, command_sha256: commandSha };
    log({ type: "learner_startup_attempt", ts: attemptStart, pid: child.pid ?? null, ...identity });
    deps.err(`学习者 ${request.engine} / ${prepared.taskName} 已启动（尝试 ${attempt}，PID ${child.pid ?? "?"}），日志 ${logPath}\n`);
    const stdoutDone = new Promise<void>((done) => {
      const lines = createInterface({ input: attemptChild.stdout! });
      lines.on("line", (line) => {
        evidence.stdout();
        appendFileSync(logPath, `${line}\n`);
        const event = tracker.feed(line, ms());
        const progress = event && progressLine(request.engine, event);
        if (progress) deps.err(`${progress.split("\n").map((text) => `[${elapsed()}] ${text}`).join("\n")}\n`);
      });
      lines.on("close", () => done());
    });
    const stderrDone = new Promise<void>((done) => {
      const lines = createInterface({ input: attemptChild.stderr! });
      lines.on("line", (line) => {
        evidence.stderr(line);
        log({ type: "learner_stderr", attempt, t_ms: ms(), text: line });
      });
      lines.on("close", () => done());
    });
    attemptChild.stdin!.on("error", () => undefined); // the agent may exit before reading everything
    attemptChild.stdin!.end(command.stdin);

    [exitCode, signal] = await new Promise<[number | null, NodeJS.Signals | null]>((done) => {
      attemptChild.on("error", (error) => {
        log({ type: "learner_error", message: error.message });
        evidence.stdout(); // A spawn error is not the observed session-creation failure.
      });
      // 'close', unlike 'exit', also waits for the old child's stdio to close.
      attemptChild.on("close", (code, sig) => done([code, sig]));
    });
    await Promise.all([stdoutDone, stderrDone]);
    child = undefined;
    const retryable = request.engine === "codex" && exitCode === 1 && signal === null && evidence.transientBeforeSession();
    log({ type: "learner_startup_exit", ts: deps.now().toISOString(), pid: attemptChild.pid ?? null,
      ...identity, exit_code: exitCode, signal, timed_out: timedOut, cancelled, retryable });
    if (!retryable || attempt === 3 || timedOut || cancelled || !lease?.current()) break;
    await new Promise<void>((done) => setTimeout(done, 250));
    if (timedOut || cancelled || !lease.current()) break;
    log({ type: "learner_startup_retry", ts: deps.now().toISOString(), ...identity, next_attempt: attempt + 1 });
    deps.err(`[${elapsed()}] 会话创建前沙箱目录短暂消失；原进程已退出，批次有效，重试启动 ${attempt + 1}/3\n`);
  }
  if (timer) clearTimeout(timer);
  if (killTimer) clearTimeout(killTimer);
  process.removeListener("SIGINT", onSignal);
  process.removeListener("SIGTERM", onSignal);

  const wallMs = deps.now().getTime() - started.getTime();
  const summary = tracker.summary;
  const rollout = request.engine === "codex" && summary.sessionId ? findRollout(learnerCodexHome(deps.env), summary.sessionId) : undefined;
  if (rollout) summary.rollout = rolloutStats(rollout);
  log({ type: "learner_summary", ts: deps.now().toISOString(), exit_code: exitCode, signal, timed_out: timedOut, cancelled, wall_ms: wallMs, summary });
  const redacted = redactSecrets(logPath, collectSecrets(deps.secretFiles, deps.env, stripped));
  deps.out(`${summary.result ? `${summary.result}\n\n` : ""}${formatSummary(summary, { task: prepared.taskName, exitCode, signal, timedOut, wallMs, logPath, redacted })}\n`);
  if (request.engine === "codex" && summary.isError && deps.refreshCodexAuth && AUTH_ERROR.test(summary.errors.join(" "))) {
    // As the brain does after a refusal on the login: ask codex to refresh its token once; the task is not re-run by itself.
    try {
      await deps.refreshCodexAuth(binary, learnerCodexHome(deps.env), env as Record<string, string>);
      deps.err("codex 登录被拒：已请 codex 刷新登录令牌，请重新运行这个任务\n");
    } catch (error) {
      deps.err(`codex 登录被拒，刷新令牌也失败（${error instanceof Error ? error.message.slice(0, 200) : String(error)}）：需要 Dai 重新 \`codex login\`\n`);
    }
  }
  if (timedOut) return 124;
  if (cancelled) return 1;
  return exitCode === 0 && !summary.isError ? 0 : 1;
}

/**
 * The git rules of a learner run (write tasks only): the main checkout's .git writable, its hooks and config read-only,
 * and, when cwd is a worktree, its own git directory (.git/worktrees/<name>) by name — codex keeps the working
 * directory's git dir read-only unless granted exactly (2026-10-04 probe with `codex sandbox -P learner`).
 */
export function learnerGitRules(projectRoot: string, cwd?: string): Record<string, "read" | "write" | "none"> {
  const git = join(projectRoot, ".git");
  const rules: Record<string, "read" | "write" | "none"> = { [git]: "write", [join(git, "hooks")]: "read", [join(git, "config")]: "read" };
  if (cwd) {
    try {
      const pointer = readFileSync(join(cwd, ".git"), "utf8").match(/^gitdir:\s*(.+)$/m)?.[1]?.trim();
      if (pointer) rules[resolve(cwd, pointer)] = "write";
    } catch {
      // cwd is the main checkout (a .git directory) or not a git checkout: nothing more to grant
    }
  }
  return rules;
}
