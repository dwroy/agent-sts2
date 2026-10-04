/**
 * The codex transcripts archived for the paper by the daily snapshot (ops/codex-ops.sh tick snapshot → main.ts
 * snapshot-session; paper/materials/learning/README.md). Copies, with every key value replaced by [REDACTED]
 * (learner/lib/launcher.ts collectSecrets / redactSecrets, the same as the wake and learner logs):
 *
 *   ops/codex-ops/wakes/*.jsonl, wakes.jsonl          → <out>/ops/wakes/, <out>/ops/wakes.jsonl
 *   the ops session's codex rollout                    → <out>/ops/rollout-<session id>.jsonl
 *   learner/runs/*.jsonl (the main checkout and every   → <out>/learner/runs/<name>   (claude-engine runs included)
 *     worktree under .worktrees/ and .claude/worktrees/)
 *   each codex learner run's rollout (its thread id)    → <out>/learner/rollouts/rollout-<thread id>.jsonl
 *
 * Incremental: <out>/MANIFEST.json remembers each copy's source, size and mtime; an unchanged source is not copied
 * again. Copies are written 0600 (paper/materials/session/ is out of git and backed up to the Windows drive).
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

import { redactSecrets } from "../../learner/lib/launcher.js";
import { findRollout } from "../../learner/lib/summary.js";

export interface ArchiveOptions {
  /** The project root (main checkout). */
  root: string;
  /** The codex home whose sessions/ hold the rollouts (the learner's and the ops session's). */
  codexHome: string;
  /** The ops runtime dir (ops/codex-ops). */
  opsDir: string;
  /** The ops session id, if any. */
  opsSession?: string;
  /** Key values to redact (collectSecrets). */
  secrets: string[];
  /** Where to copy (default <root>/paper/materials/session/codex). */
  outDir?: string;
}

export interface ArchiveResult {
  outDir: string;
  copied: string[];
  unchanged: number;
  redacted: number;
  missingRollouts: string[];
}

interface ManifestEntry {
  source: string;
  size: number;
  mtimeMs: number;
}

const THREAD_ID = /"thread_id"\s*:\s*"([0-9a-f-]{36})"/;

function list(dir: string): string[] {
  try {
    return readdirSync(dir).sort();
  } catch {
    return [];
  }
}

/** learner/runs/ of the main checkout and of every worktree (each a {origin, dir}). */
export function learnerRunDirs(root: string): { origin: string; dir: string }[] {
  const dirs = [{ origin: "main", dir: join(root, "learner", "runs") }];
  for (const parent of [join(root, ".worktrees"), join(root, ".claude", "worktrees")]) {
    for (const name of list(parent)) dirs.push({ origin: name, dir: join(parent, name, "learner", "runs") });
  }
  return dirs.filter((d) => existsSync(d.dir));
}

/** The codex thread id a learner run log names (its thread.started event), if any. */
export function learnerThreadId(path: string): string | undefined {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
  for (const line of text.split("\n")) {
    if (!line.includes("thread.started")) continue;
    const match = THREAD_ID.exec(line);
    if (match) return match[1];
  }
  return undefined;
}

export function archiveCodexTranscripts(options: ArchiveOptions): ArchiveResult {
  const outDir = options.outDir ?? join(options.root, "paper", "materials", "session", "codex");
  const manifestPath = join(outDir, "MANIFEST.json");
  let manifest: Record<string, ManifestEntry> = {};
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Record<string, ManifestEntry>;
  } catch {
    manifest = {};
  }
  const result: ArchiveResult = { outDir, copied: [], unchanged: 0, redacted: 0, missingRollouts: [] };

  const copy = (source: string, rel: string): void => {
    let stat;
    try {
      stat = statSync(source);
    } catch {
      return;
    }
    if (!stat.isFile()) return;
    const target = join(outDir, rel);
    const seen = manifest[rel];
    if (seen && seen.source === source && seen.size === stat.size && seen.mtimeMs === stat.mtimeMs && existsSync(target)) {
      result.unchanged++;
      return;
    }
    mkdirSync(join(target, ".."), { recursive: true });
    copyFileSync(source, target);
    chmodSync(target, 0o600);
    result.redacted += redactSecrets(target, options.secrets);
    manifest[rel] = { source, size: stat.size, mtimeMs: stat.mtimeMs };
    result.copied.push(rel);
  };

  // The ops session: its wakes and its rollout.
  for (const name of list(join(options.opsDir, "wakes"))) if (name.endsWith(".jsonl")) copy(join(options.opsDir, "wakes", name), join("ops", "wakes", name));
  copy(join(options.opsDir, "wakes.jsonl"), join("ops", "wakes.jsonl"));
  if (options.opsSession) {
    const rollout = findRollout(options.codexHome, options.opsSession);
    if (rollout) copy(rollout, join("ops", `rollout-${options.opsSession}.jsonl`));
    else result.missingRollouts.push(options.opsSession);
  }

  // The learner: every run log, and the codex rollout of each codex run.
  const taken = new Map<string, string>();
  for (const { origin, dir } of learnerRunDirs(options.root)) {
    for (const name of list(dir)) {
      if (!name.endsWith(".jsonl")) continue;
      const source = join(dir, name);
      // Two worktrees with a log of the same name: the later one gets its origin in the name.
      const rel = taken.has(name) && taken.get(name) !== source ? join("learner", "runs", `${basename(name, ".jsonl")}-${origin}.jsonl`) : join("learner", "runs", name);
      taken.set(name, taken.get(name) ?? source);
      copy(source, rel);
      const thread = learnerThreadId(source);
      if (!thread) continue;
      const rollout = findRollout(options.codexHome, thread);
      if (rollout) copy(rollout, join("learner", "rollouts", `rollout-${thread}.jsonl`));
      else result.missingRollouts.push(thread);
    }
  }

  mkdirSync(outDir, { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 1)}\n`);
  return result;
}
