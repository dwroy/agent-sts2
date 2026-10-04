/**
 * Command lines for the learner's CLI agents (docs/v4-architecture.md §1, M4): headless `claude -p` on the local
 * subscription login, and `codex exec` on the ChatGPT subscription login. The prompt
 * always goes in on stdin, so its size never hits the argv limit and it never shows in `ps`.
 *
 * Permissions are derived from the task's tool list and confined to the project root:
 *   claude: --restricted (file tools confined to the working directories, user/project settings and their hooks
 *           ignored), --permission-mode dontAsk (anything not pre-approved is denied, never prompted),
 *           --tools = exactly the task's built-in tools, --allowedTools with Read/Edit rules under the root,
 *           --disallowedTools for key files, pushes, installs, play and pkill; --strict-mcp-config so only our
 *           tool server (with --with-tools) is loaded.
 *   codex:  --sandbox read-only / workspace-write (+ --add-dir root), approvals never, on the brain's codex plumbing
 *           (engines/codex.ts: program lookup, CODEX_HOME, disabled features, the start-up check).
 * The child environment never carries our keys (childEnv).
 */
import { accessSync, constants, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { delimiter, join } from "node:path";

import { CODEX_DISABLED_FEATURES, codexEnv } from "../../agent/src/brain/engines/codex.js";
import { runAgent } from "../../agent/src/brain/engines/process.js";
import type { McpLaunchSpec } from "../../agent/src/brain/tools/mcp-launch.js";
import { PROJECT_ROOT as REPO_ROOT } from "../../agent/src/core/paths.js";
import { DEFAULT_CODEX_EFFORT, DEFAULT_CODEX_MODEL, resolveCodexBin, resolveCodexHome } from "../../agent/src/core/config.js";
import { MCP_SERVER_NAME } from "../../agent/src/brain/tools/mcp-launch.js";
import type { TaskTool } from "./task.js";

export const ENGINES = ["claude", "codex"] as const;
export type EngineName = (typeof ENGINES)[number];

export interface EngineRequest {
  engine: EngineName;
  /** Absolute working directory of the agent (inside projectRoot). */
  cwd: string;
  /** Absolute project root (~/Projects/sts2-jev): the only tree the agent may touch. */
  projectRoot: string;
  tools: TaskTool[];
  model?: string;
  /** Reasoning effort: claude --effort, codex model_reasoning_effort. */
  effort?: string;
  maxTurns?: number;
  /** Our stdio MCP tool server (--with-tools). */
  mcp?: McpLaunchSpec;
  /**
   * codex: the home directory and codex's login home whose key files the permission profile makes unreadable
   * (defaults: os.homedir(), ~/.codex), and key files found on disk to deny by name as well (codexKeyFiles).
   */
  home?: string;
  codexHome?: string;
  keyFiles?: string[];
  /** The launcher's repository (default: this checkout), whose main checkout's .env files are denied too (keyRoots). */
  repo?: string;
}

export interface CommandLine {
  command: string;
  args: string[];
  /** Written to the child's stdin, then stdin is closed. */
  stdin: string;
}

/** The engine binary is missing: the launcher prints the message and exits 3. */
export class EngineUnavailableError extends Error {
  override readonly name = "EngineUnavailableError";
}

/* ---- environment ------------------------------------------------------------------------------- */

/**
 * Variables never passed to an agent: our API keys (DeepSeek, TypeSafe/Jev, OpenRouter), API-key auth that
 * would replace the subscription login, generic secrets, and the parent Claude Code session's own variables
 * (a learner run is a fresh top-level session, not a child of whoever started the launcher).
 */
const STRIP_PREFIXES = ["DEEPSEEK_", "TYPESAFE_", "JEV_", "OPENROUTER_", "CLAUDE_CODE_"];
const STRIP_NAMES = new Set(["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "OPENAI_API_KEY", "CODEX_API_KEY", "CLAUDECODE", "CLAUDE_PID", "CLAUDE_EFFORT"]);
const STRIP_PATTERN = /(API_?KEY|SECRET|PASSWORD|PASSWD|TOKEN)/i;
/** Subscription login in env form (`claude setup-token`): kept for claude only. */
const CLAUDE_KEEP = new Set(["CLAUDE_CODE_OAUTH_TOKEN"]);

export function strippedEnvNames(env: NodeJS.ProcessEnv, engine: EngineName): string[] {
  return Object.keys(env)
    .filter((name) => {
      if (engine === "claude" && CLAUDE_KEEP.has(name)) return false;
      return STRIP_NAMES.has(name) || STRIP_PREFIXES.some((prefix) => name.startsWith(prefix)) || STRIP_PATTERN.test(name);
    })
    .sort();
}

/** The agent's environment: the parent's minus strippedEnvNames, plus the engine's own switches. */
export function childEnv(env: NodeJS.ProcessEnv, engine: EngineName): NodeJS.ProcessEnv {
  const drop = new Set(strippedEnvNames(env, engine));
  const out: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(env)) if (!drop.has(name) && value !== undefined) out[name] = value;
  if (engine === "claude") {
    // The user's auto-memory belongs to the interactive sessions; the task brief is the learner's whole context.
    out["CLAUDE_CODE_DISABLE_AUTO_MEMORY"] = "1";
  }
  return out;
}

/* ---- binaries ---------------------------------------------------------------------------------- */

/**
 * The engine's program: LEARNER_<ENGINE>_BIN (tests use a fake codex/claude), else the first on PATH; codex also where
 * the brain finds it (config.ts resolveCodexBin: ~/.local/node/bin/codex, the npm install). Undefined when missing.
 */
export function engineBinary(engine: EngineName, env: NodeJS.ProcessEnv): string | undefined {
  const override = env[`LEARNER_${engine.toUpperCase()}_BIN`];
  const candidates = override
    ? [override]
    : engine === "codex"
      ? [resolveCodexBin({ ...env, BRAIN_CODEX_BIN: undefined })]
      : (env["PATH"] ?? "").split(delimiter).filter(Boolean).map((dir) => join(dir, engine));
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // not here
    }
  }
  return undefined;
}

export function unavailableMessage(engine: EngineName): string {
  return engine === "codex"
    ? "codex 未安装：需要 Dai 安装并登录（安装 Codex CLI，然后 `codex login` 用 ChatGPT 账号登录；学习者只用订阅登录态，不用 API key）"
    : "claude 未安装或不在 PATH 里：需要 Claude Code CLI，并已用订阅账号登录（`claude auth`）";
}

/* ---- claude ------------------------------------------------------------------------------------ */

/** Home-relative key files and other paths no learner may read, whatever the task. */
const SECRET_READ_DENY = ["Read(~/.jev_api_keys)", "Read(~/.deepseek_api_key)", "Read(~/.sts2-jev-env*)", "Read(//**/.env)", "Read(//**/.env.local)", "Read(//**/sts2.dll)", "Read(//**/*.pck)"];
const SECRET_EDIT_DENY = ["Edit(//**/.env)", "Edit(//**/.env.local)"];
/** Shell commands no task needs; deny rules win over the Bash allow. */
export const BASH_DENY = [
  "Bash(git push:*)",
  "Bash(pkill:*)",
  "Bash(killall:*)",
  "Bash(npm install:*)",
  "Bash(npm i:*)",
  "Bash(npm ci:*)",
  // The game loop, every way it starts: from agent/ or the project root, the entry or the moved wiring (core/index.ts).
  "Bash(npm run play:*)",
  "Bash(npm run dev:*)",
  "Bash(npm --prefix agent run play:*)",
  "Bash(npm --prefix agent run dev:*)",
  "Bash(npm run --prefix agent play:*)",
  "Bash(npx tsx src/index.ts play:*)",
  "Bash(npx tsx agent/src/index.ts play:*)",
  "Bash(npx tsx src/core/index.ts play:*)",
  "Bash(npx tsx agent/src/core/index.ts play:*)",
  "Bash(tsx src/index.ts play:*)",
  "Bash(tsx agent/src/index.ts play:*)",
  "Bash(node --import tsx src/index.ts play:*)",
  "Bash(node --import tsx agent/src/index.ts play:*)",
  "Bash(git clean:*)",
  "Bash(sudo:*)",
  "Bash(ssh:*)",
  "Bash(ssh.exe:*)",
  "Bash(env)",
  "Bash(printenv:*)",
  "Bash(curl:*)",
  "Bash(wget:*)",
];

export interface ClaudePermissions {
  tools: string[];
  allowed: string[];
  disallowed: string[];
}

/** Permission flags for a task's tools, confined to the project root. */
export function claudePermissions(tools: TaskTool[], projectRoot: string, withMcp: boolean): ClaudePermissions {
  const root = `/${projectRoot.replace(/\/+$/, "")}/**`; // "//abs/path/**" = absolute pattern
  const allowed: string[] = [];
  if (tools.includes("Read")) allowed.push(`Read(${root})`);
  if (tools.includes("Grep")) allowed.push("Grep");
  if (tools.includes("Glob")) allowed.push("Glob");
  // Edit rules also govern Write (a Write(path) rule is never consulted).
  if (tools.includes("Edit") || tools.includes("Write")) allowed.push(`Edit(${root})`);
  if (tools.includes("Bash")) allowed.push("Bash");
  if (withMcp) allowed.push(`mcp__${MCP_SERVER_NAME}`);
  const disallowed = [...SECRET_READ_DENY];
  if (tools.includes("Edit") || tools.includes("Write")) disallowed.push(...SECRET_EDIT_DENY);
  if (tools.includes("Bash")) disallowed.push(...BASH_DENY);
  return { tools: [...tools], allowed, disallowed };
}

/** The --mcp-config JSON for our stdio tool server. */
export function claudeMcpConfig(spec: McpLaunchSpec): string {
  return JSON.stringify({ mcpServers: { [MCP_SERVER_NAME]: { type: "stdio", command: spec.command, args: spec.args, env: spec.env } } });
}

export function claudeCommand(request: EngineRequest, prompt: string, binary = "claude"): CommandLine {
  const permissions = claudePermissions(request.tools, request.projectRoot, !!request.mcp);
  const args = [
    "-p",
    "--output-format", "stream-json",
    "--verbose",
    "--restricted",
    "--permission-mode", "dontAsk",
    "--permission-prompts", "none",
    "--tools", permissions.tools.join(","),
    "--allowedTools", ...permissions.allowed,
    "--disallowedTools", ...permissions.disallowed,
    "--add-dir", request.projectRoot,
    "--strict-mcp-config",
  ];
  if (request.mcp) args.push("--mcp-config", claudeMcpConfig(request.mcp));
  if (request.model) args.push("--model", request.model);
  if (request.effort) args.push("--effort", request.effort);
  if (request.maxTurns !== undefined) args.push("--max-turns", String(request.maxTurns));
  return { command: binary, args, stdin: prompt };
}

/* ---- codex ------------------------------------------------------------------------------------- */

/** A TOML value for `codex exec -c key=value` (JSON strings are valid TOML basic strings). */
function toml(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(toml).join(", ")}]`;
  if (value && typeof value === "object") return `{ ${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)} = ${toml(item)}`).join(", ")} }`;
  return String(value);
}

/**
 * The brain's features that the learner keeps on: it works with tools (the shell, and the catalog's own tool mode that
 * runs them), which the brain switches off. Every other feature the brain disables (hooks, memories, plugins, apps,
 * multi-agent, browser and computer use, image tools, goals, shell snapshots of the user's rc files, the shared
 * app-server daemon, endless reconnects, ...) is off for the learner too, so a learner run sees the task, the repo's
 * AGENTS.md and its own tool results, nothing of the machine's codex setup.
 */
const LEARNER_KEEPS_FEATURES = new Set<string>(["shell_tool", "unified_exec", "code_mode_host"]);
export const LEARNER_CODEX_DISABLED_FEATURES = CODEX_DISABLED_FEATURES.filter((feature) => !LEARNER_KEEPS_FEATURES.has(feature));

/**
 * The -c overrides of a learner run. Unlike the brain's (engines/codex.ts codexConfig), project docs stay on: codex
 * reads the repo's AGENTS.md from the git root down to --cd. Web search is off: game knowledge may come only from
 * the run logs (docs/learning-protocol.md). The shell is not a login shell (no rc files).
 */
export function codexLearnerConfig(opts: { effort: string }): string[] {
  return [
    `approval_policy=${toml("never")}`,
    `web_search=${toml("disabled")}`,
    `model_reasoning_effort=${toml(opts.effort)}`,
    "allow_login_shell=false",
    // No skills catalogue in front of the task (the brain's settings; the 2026-10-04 smoke run had one).
    "skills.include_instructions=false",
    "skills.bundled.enabled=false",
    "check_for_update_on_startup=false",
    `history.persistence=${toml("none")}`,
    "analytics.enabled=false",
  ];
}

/**
 * The launcher's note in front of a codex task (docs/learning-protocol.md §7: the launcher translates the task's
 * engine-neutral tool names). The 2026-10-04 smoke run without it: codex looked for tools named Read and Grep, found
 * none, and took "不运行任何命令" as forbidding the shell, so it read nothing.
 */
export function codexPreamble(tools: TaskTool[], writes: boolean): string {
  const allowed = tools.join("、");
  const lines = [
    "【启动器说明（codex）】任务说明里的工具名是通用叫法，在这里这样对应：Read = 用只读的 shell 命令看文件（sed -n '起,止p'、head、tail；大文件不许整份输出），Grep = rg 或 grep，Glob = rg --files、ls 或 find" +
      (writes ? "，Bash = shell 命令，Edit / Write = apply_patch（或 shell 写文件）。" : "。"),
    `本任务允许的工具：${allowed}。` +
      (writes
        ? "沙箱：工作目录、项目目录和临时目录可写，不联网；key 文件和 .env 读不到。"
        : "沙箱只读、不联网，key 文件和 .env 读不到。任务里「不运行任何命令」「只读」指不运行会改动文件或状态的命令；上面这些只读查看命令就是 Read / Grep / Glob 本身，可以用。"),
  ];
  return `${lines.join("\n")}\n\n`;
}

/** The name of the learner's codex permission profile (`-c default_permissions=…`, `codex sandbox -P …`). */
export const LEARNER_PROFILE = "learner";

/** Key-file names in a home directory (AGENTS.md「安全」); ~/.sts2-jev-env* is matched as a glob. */
const HOME_KEY_FILES = [".jev_api_keys", ".deepseek_api_key"];

function entriesOf(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** The main checkout a worktree belongs to (the path before /.claude/worktrees/ or /.worktrees/); the path itself otherwise. */
export function mainCheckout(path: string): string {
  const at = path.search(/\/\.(claude\/)?worktrees\//);
  return at > 0 ? path.slice(0, at) : path.replace(/\/+$/, "");
}

/**
 * The trees whose .env files a learner run must not read: the project root, its main checkout, and the main checkout of
 * the launcher's own repository (a probe run from a worktree with STS2_WORKSPACE pointing at it still must not read
 * .worktrees/live/agent/.env: 2026-10-04 write probe). Nested roots are dropped.
 */
export function keyRoots(projectRoot: string, repo: string = REPO_ROOT): string[] {
  const roots = [...new Set([projectRoot, mainCheckout(projectRoot), mainCheckout(repo)].map((root) => root.replace(/\/+$/, "")))];
  return roots.filter((root) => !roots.some((other) => other !== root && root.startsWith(`${other}/`)));
}

/**
 * The key files that exist now, by absolute path: ~/.jev_api_keys, ~/.deepseek_api_key, ~/.sts2-jev-env*, codex's
 * login (<codex home>/auth.json), and every .env / *.env in the project root, its agent/, each directory directly
 * under it and its agent/, .worktrees/* and .worktrees/*\/agent, .claude/worktrees/* and .claude/worktrees/*\/agent.
 * (for each of keyRoots). The profile denies these by name on top of its globs; the launcher's pre-check tries to read
 * each of them.
 */
export function codexKeyFiles(projectRoot: string, home: string = homedir(), codexHome: string = join(home, ".codex"), repo: string = REPO_ROOT): string[] {
  const files = [...HOME_KEY_FILES.map((name) => join(home, name)), ...entriesOf(home).filter((name) => name.startsWith(".sts2-jev-env")).map((name) => join(home, name)), join(codexHome, "auth.json")];
  for (const root of keyRoots(projectRoot, repo)) files.push(...envFilesUnder(root));
  return [...new Set(files)].filter(isFile);
}

function envFilesUnder(projectRoot: string): string[] {
  const files: string[] = [];
  const dirs = [projectRoot, join(projectRoot, "agent")];
  for (const name of entriesOf(projectRoot)) if (name !== "node_modules" && name !== "logs") dirs.push(join(projectRoot, name), join(projectRoot, name, "agent"));
  for (const parent of [join(projectRoot, ".worktrees"), join(projectRoot, ".claude", "worktrees")]) {
    for (const name of entriesOf(parent)) dirs.push(join(parent, name), join(parent, name, "agent"));
  }
  for (const dir of dirs) for (const name of entriesOf(dir)) if (name === ".env" || name.endsWith(".env")) files.push(join(dir, name));
  return files;
}

type Access = "read" | "write" | "none";
type FilesystemRules = Record<string, Access | number | Record<string, Access>>;

/**
 * How deep codex expands the `**` deny globs on Linux (it warns without a cap). The deepest .env the launcher knows of is
 * .claude/worktrees/<name>/agent/.env (5 levels under the project root); deeper ones are still denied by name when the
 * launcher finds them (codexKeyFiles) and checked before each run.
 */
export const GLOB_SCAN_MAX_DEPTH = 8;

/**
 * The learner's codex permission profile (`permissions.learner.filesystem`, codex-cli 0.160), replacing --sandbox so that
 * key files can be made unreadable (Dai 2026-10-04: codex's read-only and workspace-write sandboxes read everything):
 * - everything readable (":root"), nothing writable — the read-only sandbox;
 * - write tasks also: the working directory (":project_roots"), the project root and the temp directories (":tmpdir",
 *   ":slash_tmp") writable — workspace-write plus --add-dir <project root>;
 * - unreadable ("none") in both: ~/.jev_api_keys, ~/.deepseek_api_key, ~/.sts2-jev-env*, codex's auth.json (codex reads
 *   its login in its own process, outside the sandbox), every .env / *.env anywhere under the project root (globs), and
 *   each key file found on disk by name (request.keyFiles).
 * Network stays off (the profile has no network section). Verified 2026-10-04 with `codex sandbox -P learner`.
 */
export function codexPermissions(request: EngineRequest): FilesystemRules {
  const home = request.home ?? homedir();
  const codexHome = request.codexHome ?? join(home, ".codex");
  const writes = request.tools.some((tool) => tool === "Bash" || tool === "Edit" || tool === "Write");
  const root = request.projectRoot.replace(/\/+$/, "");
  const rules: FilesystemRules = { ":root": "read", glob_scan_max_depth: GLOB_SCAN_MAX_DEPTH };
  if (writes) {
    rules[":project_roots"] = { ".": "write" };
    rules[":tmpdir"] = "write";
    rules[":slash_tmp"] = "write";
  }
  rules[root] = { ...(writes ? { ".": "write" as const } : {}), "**/.env": "none", "**/*.env": "none" };
  for (const other of keyRoots(root, request.repo)) if (other !== root) rules[other] = { "**/.env": "none", "**/*.env": "none" };
  const homeRules: Record<string, Access> = { ".sts2-jev-env*": "none" };
  for (const name of HOME_KEY_FILES) homeRules[name] = "none";
  rules[home] = homeRules;
  rules[join(codexHome, "auth.json")] = "none";
  for (const file of request.keyFiles ?? []) if (!(file in rules)) rules[file] = "none";
  return rules;
}

/** The -c overrides that define the profile (exec adds default_permissions; `codex sandbox` takes -P). */
export function codexProfileOverrides(request: EngineRequest): string[] {
  return ["-c", `permissions.${LEARNER_PROFILE}.filesystem=${toml(codexPermissions(request))}`];
}

/**
 * The launcher's pre-check: `codex sandbox -P learner` runs a shell under the same profile that tries to open each key
 * file (zero bytes read, nothing printed but the names of the files it could open). Any name on stdout = isolation broken.
 */
export function codexKeyCheckCommand(request: EngineRequest, files: string[], binary = "codex"): CommandLine {
  const script = 'for f in "$@"; do if head -c 0 -- "$f" 2>/dev/null; then printf "%s\\n" "$f"; fi; done';
  return { command: binary, args: ["sandbox", "-C", request.cwd, "-P", LEARNER_PROFILE, ...codexProfileOverrides(request), "--", "sh", "-c", script, "sh", ...files], stdin: "" };
}

/**
 * `codex exec` on the brain's plumbing (engines/codex.ts): --json (JSONL events on stdout), --ignore-user-config (no
 * config.toml: no profiles, MCP servers, plugins or notify of the interactive setup; the login still comes from
 * CODEX_HOME), --ignore-rules, --cd, the `learner` permission profile in place of --sandbox (codexPermissions:
 * read-only for tasks that only read, writable cwd + project root + tmp otherwise; key files unreadable), --model, the -c overrides above (approvals never, the reasoning
 * effort), our MCP server as `-c mcp_servers.gkb.*`, the features the learner does not need disabled, and `-` =
 * prompt on stdin. The model and the effort are always sent (launcher defaults: config.ts DEFAULT_CODEX_MODEL /
 * DEFAULT_CODEX_EFFORT). The session is kept (not --ephemeral): `codex exec resume <thread id>` continues it. Codex
 * has no turn limit flag; the launcher's timeout still applies.
 */
export function codexCommand(request: EngineRequest, prompt: string, binary = "codex"): CommandLine {
  const writes = request.tools.some((tool) => tool === "Bash" || tool === "Edit" || tool === "Write");
  const args = ["exec", "--json", "--ignore-user-config", "--ignore-rules", "--cd", request.cwd];
  args.push("-c", `default_permissions=${toml(LEARNER_PROFILE)}`, ...codexProfileOverrides(request));
  args.push("--model", request.model ?? DEFAULT_CODEX_MODEL);
  for (const setting of codexLearnerConfig({ effort: request.effort ?? DEFAULT_CODEX_EFFORT })) args.push("-c", setting);
  if (request.mcp) {
    const key = `mcp_servers.${MCP_SERVER_NAME}`;
    args.push("-c", `${key}.command=${toml(request.mcp.command)}`, "-c", `${key}.args=${toml(request.mcp.args)}`);
    if (Object.keys(request.mcp.env).length > 0) args.push("-c", `${key}.env=${toml(request.mcp.env)}`);
    // Our tools only read the knowledge base and the logs; without this every call waits for an approval that
    // approval_policy=never turns into a refusal (2026-10-04 probe: "kb_runs ... needs approval").
    args.push("-c", `${key}.default_tools_approval_mode=${toml("approve")}`);
  }
  for (const feature of LEARNER_CODEX_DISABLED_FEATURES) args.push("--disable", feature);
  args.push("-");
  return { command: binary, args, stdin: codexPreamble(request.tools, writes) + prompt };
}

/** A codex request with the home, codex home and key files its permission profile denies (from the launcher's env). */
export function withCodexKeys(request: EngineRequest, env: NodeJS.ProcessEnv): EngineRequest {
  if (request.engine !== "codex") return request;
  const home = env["HOME"] || homedir();
  const codexHome = learnerCodexHome({ ...env, HOME: home });
  return { ...request, home, codexHome, keyFiles: codexKeyFiles(request.projectRoot, home, codexHome) };
}

export type KeyCheck = { ok: true; checked: number } | { ok: false; readable: string[]; error?: string };

/**
 * The pre-check before every codex run: under the run's own profile (`codex sandbox -P learner`), can any existing key
 * file be opened? ok only when the sandbox ran (exit 0) and opened none. Only file names are ever reported.
 */
export async function codexKeyCheck(bin: string, request: EngineRequest, env: Record<string, string>, timeoutMs = 30_000): Promise<KeyCheck> {
  const files = request.keyFiles ?? [];
  if (files.length === 0) return { ok: true, checked: 0 };
  const cmd = codexKeyCheckCommand(request, files, bin);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const run = await runAgent(cmd.command, cmd.args, { cwd: request.cwd, env, stdin: "", signal: controller.signal });
    const readable = run.stdout.split("\n").map((line) => line.trim()).filter((line) => files.includes(line));
    if (run.code !== 0) return { ok: false, readable, error: `codex sandbox exited ${run.code ?? run.signal}: ${run.stderr.trim().split("\n").slice(-2).join(" | ").slice(0, 300)}` };
    return readable.length === 0 ? { ok: true, checked: files.length } : { ok: false, readable };
  } catch (error) {
    return { ok: false, readable: [], error: error instanceof Error ? error.message.slice(0, 300) : String(error) };
  } finally {
    clearTimeout(timer);
  }
}

/** Where codex keeps its login: LEARNER_CODEX_HOME, else CODEX_HOME, else ~/.codex (config.ts resolveCodexHome). */
export function learnerCodexHome(env: NodeJS.ProcessEnv): string {
  return resolveCodexHome({ ...env, BRAIN_CODEX_HOME: env["LEARNER_CODEX_HOME"] });
}

/**
 * The codex child's environment: ours without keys (childEnv), then the brain's codexEnv on top of it (CODEX_HOME,
 * codex's trace-safe log filter on stderr, the program's directory first in PATH for the npm launcher's node).
 */
export function codexChildEnv(env: NodeJS.ProcessEnv, bin: string): Record<string, string> {
  const base: Record<string, string> = {};
  for (const [name, value] of Object.entries(childEnv(env, "codex"))) if (value !== undefined) base[name] = value;
  return codexEnv(bin, learnerCodexHome(env), base);
}

/**
 * The engine's defaults under --model / --effort and the task's model.<engine> / effort.<engine>: codex gpt-6.1-sol
 * at xhigh (Dai 2026-10-04); claude the CLI's own.
 */
export function engineDefaults(engine: EngineName): { model?: string; effort?: string } {
  return engine === "codex" ? { model: DEFAULT_CODEX_MODEL, effort: DEFAULT_CODEX_EFFORT } : {};
}

export function engineCommand(request: EngineRequest, prompt: string, binary?: string): CommandLine {
  return request.engine === "claude" ? claudeCommand(request, prompt, binary) : codexCommand(request, prompt, binary);
}

/** A command line as one shell-quoted string, for --dry-run and the log. */
export function shellQuote(parts: string[]): string {
  return parts.map((part) => (/^[\w@%+=:,./-]+$/.test(part) ? part : `'${part.replace(/'/g, `'\\''`)}'`)).join(" ");
}
