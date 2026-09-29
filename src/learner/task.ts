/**
 * Offline learner task files (docs/v4-architecture.md §1 "学习者", M4). A task is an engine-neutral Markdown
 * brief (learner/tasks/<name>.md) with {{placeholder}} parameters, preceded by a small front matter:
 *
 *   ---
 *   title: 复盘
 *   tools: Read, Grep, Glob, Bash          (built-in tools the agent may use; decides the permissions)
 *   timeout_min: 120                       (optional defaults for --timeout-min / --max-turns / --model)
 *   max_turns: 400
 *   default.code_dir: {{project_root}}/jev-sts2-v3   (a parameter's default; may use the built-ins)
 *   ---
 *
 * Built-in parameters (cwd, worktree, project_root, logs_dir, scratch, task) come from the launcher; the rest
 * come from --set name=value. A placeholder with no value, or a --set nobody uses, is an error.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";

/** Bad command line, task file or parameters: the launcher prints the message and exits 2. */
export class LearnerUsageError extends Error {
  override readonly name = "LearnerUsageError";
}

/** Built-in tools a task may ask for; each maps to permission rules in engines.ts. */
export const TASK_TOOLS = ["Read", "Grep", "Glob", "Bash", "Edit", "Write"] as const;
export type TaskTool = (typeof TASK_TOOLS)[number];

export interface TaskSpec {
  name: string;
  path: string;
  title: string;
  tools: TaskTool[];
  timeoutMin?: number;
  maxTurns?: number;
  model?: string;
  /** Parameter defaults, still holding built-in placeholders. */
  defaults: Record<string, string>;
  /** The brief after the front matter. */
  body: string;
}

/** Parameters the launcher fills; --set may override only `worktree` and `logs_dir`. */
export const BUILTIN_PARAMS = ["cwd", "worktree", "project_root", "logs_dir", "scratch", "task"] as const;
const FIXED_BUILTINS = new Set(["cwd", "project_root", "scratch", "task"]);

const PLACEHOLDER = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g;
const PARAM_NAME = /^[a-z][a-z0-9_]*$/;

/** Placeholder names in order of first appearance. */
export function placeholdersOf(text: string): string[] {
  const names: string[] = [];
  for (const match of text.matchAll(PLACEHOLDER)) if (!names.includes(match[1]!)) names.push(match[1]!);
  return names;
}

/** Replaces every {{name}}; throws LearnerUsageError listing all names without a (non-empty) value. */
export function fillTemplate(text: string, values: Record<string, string>): string {
  const missing = placeholdersOf(text).filter((name) => !values[name]);
  if (missing.length > 0) {
    throw new LearnerUsageError(`缺少参数：${missing.join(", ")}（用 ${missing.map((name) => `--set ${name}=…`).join(" ")} 给出）`);
  }
  return text.replace(PLACEHOLDER, (_all, name: string) => values[name]!);
}

function positiveInt(raw: string, key: string, path: string): number {
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) throw new LearnerUsageError(`${path}: ${key} 要是正整数，现在是「${raw}」`);
  return Number(raw);
}

/** Parses a task file's text (front matter required). */
export function parseTask(text: string, name: string, path: string): TaskSpec {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!match) throw new LearnerUsageError(`${path}: 缺少开头的 --- front matter ---`);
  const spec: TaskSpec = { name, path, title: name, tools: [], defaults: {}, body: match[2]!.trim() + "\n" };
  let sawTools = false;
  for (const rawLine of match[1]!.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon < 0) throw new LearnerUsageError(`${path}: front matter 行没有「键: 值」：${line}`);
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key === "title") spec.title = value;
    else if (key === "tools") {
      sawTools = true;
      for (const tool of value.split(",").map((item) => item.trim()).filter(Boolean)) {
        if (!(TASK_TOOLS as readonly string[]).includes(tool)) throw new LearnerUsageError(`${path}: 不认识的工具「${tool}」，可用：${TASK_TOOLS.join(", ")}`);
        if (!spec.tools.includes(tool as TaskTool)) spec.tools.push(tool as TaskTool);
      }
    } else if (key === "timeout_min") spec.timeoutMin = positiveInt(value, key, path);
    else if (key === "max_turns") spec.maxTurns = positiveInt(value, key, path);
    else if (key === "model") spec.model = value;
    else if (key.startsWith("default.")) {
      const param = key.slice("default.".length);
      if (!PARAM_NAME.test(param)) throw new LearnerUsageError(`${path}: 参数名「${param}」只能用小写字母、数字和下划线`);
      if (FIXED_BUILTINS.has(param)) throw new LearnerUsageError(`${path}: 「${param}」是内置参数，不能设默认值`);
      spec.defaults[param] = value;
    } else throw new LearnerUsageError(`${path}: 不认识的 front matter 键「${key}」`);
  }
  if (!sawTools || spec.tools.length === 0) throw new LearnerUsageError(`${path}: front matter 要写 tools`);
  return spec;
}

/** A task by name (learner/tasks/<name>.md) or by path. */
export function loadTask(nameOrPath: string, tasksDir: string): TaskSpec {
  const looksLikePath = nameOrPath.includes("/") || nameOrPath.endsWith(".md");
  const path = looksLikePath ? (isAbsolute(nameOrPath) ? nameOrPath : resolve(nameOrPath)) : join(tasksDir, `${nameOrPath}.md`);
  if (!existsSync(path)) throw new LearnerUsageError(`找不到任务说明 ${path}`);
  return parseTask(readFileSync(path, "utf8"), basename(path, ".md"), path);
}

/** Parses repeated --set name=value arguments (the value may contain '=' and ','). */
export function parseSets(pairs: string[]): Record<string, string> {
  const sets: Record<string, string> = {};
  for (const pair of pairs) {
    const at = pair.indexOf("=");
    const name = at < 0 ? pair : pair.slice(0, at);
    if (at < 0 || !PARAM_NAME.test(name)) throw new LearnerUsageError(`--set 要写成 name=value（name 用小写字母、数字、下划线）：${pair}`);
    if (name in sets) throw new LearnerUsageError(`--set ${name} 给了两次`);
    sets[name] = pair.slice(at + 1);
  }
  return sets;
}

export interface RenderedTask {
  prompt: string;
  /** Every value used, for the log (no secrets ever go into parameters). */
  values: Record<string, string>;
}

/**
 * The final prompt: built-ins, then the task's defaults (expanded with the built-ins), then --set. Throws on a
 * missing parameter, on a --set that no placeholder uses, and on a --set of a fixed built-in.
 */
export function renderTask(spec: TaskSpec, sets: Record<string, string>, builtins: Record<string, string>): RenderedTask {
  for (const name of Object.keys(sets)) {
    if (FIXED_BUILTINS.has(name)) throw new LearnerUsageError(`「${name}」由启动器决定，不能用 --set 改${name === "cwd" ? "（用 --cwd）" : ""}`);
  }
  const used = new Set(placeholdersOf(spec.body));
  // Defaults may name other parameters ({{project_root}}); those count as used too.
  for (const [name, value] of Object.entries(spec.defaults)) if (used.has(name)) for (const inner of placeholdersOf(value)) used.add(inner);
  const unused = Object.keys(sets).filter((name) => !used.has(name));
  if (unused.length > 0) throw new LearnerUsageError(`任务 ${spec.name} 用不到这些参数：${unused.join(", ")}（任务的参数：${[...used].join(", ")}）`);

  const values: Record<string, string> = { ...builtins };
  for (const [name, value] of Object.entries(spec.defaults)) if (used.has(name)) values[name] = fillTemplate(value, builtins);
  for (const [name, value] of Object.entries(sets)) if (value !== "") values[name] = value;
  const prompt = fillTemplate(spec.body, values);
  const shown: Record<string, string> = {};
  for (const name of used) if (values[name] !== undefined) shown[name] = values[name]!;
  return { prompt, values: shown };
}
