/**
 * Where the project's directories are (docs/layout.md), resolved from this file's own location, never from the cwd:
 *
 *   <root>/agent/       this TypeScript package (this file is agent/src/core/paths.ts)
 *   <root>/knowledge/   the knowledge data (common/, characters/<id>/, builders/)
 *   <root>/logs/        raw logs (not in git)
 *   <root>/data/        rebuildable data: game-data.json, the log database and its venv (not in git)
 *
 * A path given in the environment or the config (DECISION_LOG=logs/decisions.jsonl in an .env) resolves against the
 * project root, as the old code root (the cwd every run started in) held logs/ itself: fromRoot. An absolute path is
 * used as given.
 *
 * No node:fs here: tests that mock node:fs import this module before their mock factory runs.
 */
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The project root: the directory holding agent/, knowledge/, logs/ and data/. */
export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
/** This package (package.json, src/, tests/, tools/; the default .env). */
export const AGENT_DIR = join(PROJECT_ROOT, "agent");
export const LOGS_DIR = join(PROJECT_ROOT, "logs");
export const DATA_DIR = join(PROJECT_ROOT, "data");
export const KNOWLEDGE_DIR = join(PROJECT_ROOT, "knowledge");

/** `path` as given when absolute, else against the project root (not the cwd). */
export function fromRoot(path: string): string {
  return isAbsolute(path) ? path : resolve(PROJECT_ROOT, path);
}

/**
 * The workspace: where notes/ (the post-mortems) and ops/ are read from. STS2_WORKSPACE, else the project root. A
 * worktree of this repo has its own, stale copies of notes/ and ops/: a run from one sets STS2_WORKSPACE to the main
 * checkout.
 */
export function workspaceRoot(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env["STS2_WORKSPACE"]?.trim();
  return configured ? resolve(configured) : PROJECT_ROOT;
}
