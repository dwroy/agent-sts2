/**
 * Running a CLI agent (claude, codex) for one brain call: a clean environment, an empty working directory,
 * the prompt on stdin, stdout/stderr collected, killed by PID when the call is aborted.
 */
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Variables a CLI agent may inherit: the basics a process needs (PATH, HOME for its login, locale, proxies,
 * CA bundles). Everything else is dropped: our keys (DEEPSEEK_*, TYPESAFE_*, JEV_*, BRAIN_*), any
 * *_API_KEY / *_TOKEN, and the variables of a Claude Code session this process may run under.
 */
const INHERITED = new Set([
  "PATH", "HOME", "USER", "LOGNAME", "SHELL", "LANG", "LANGUAGE", "TZ", "TMPDIR", "TERM",
  "XDG_CONFIG_HOME", "XDG_DATA_HOME", "XDG_CACHE_HOME", "XDG_STATE_HOME", "XDG_RUNTIME_DIR",
  "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "no_proxy", "all_proxy",
  "NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR",
  // Where the agents keep their own login and settings, when moved from the default.
  "CLAUDE_CONFIG_DIR", "CODEX_HOME",
]);

/** The child's environment: the inherited basics (LC_* too) plus `extra`. */
export function agentEnv(extra: Record<string, string> = {}, from: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(from)) {
    if (value === undefined) continue;
    if (INHERITED.has(key) || key.startsWith("LC_")) env[key] = value;
  }
  return { ...env, ...extra };
}

export interface AgentRun {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  ms: number;
}

/** The program could not be started at all (ENOENT: not found, EACCES: not executable, ...). */
export class AgentStartError extends Error {
  constructor(
    readonly bin: string,
    readonly code: string,
    detail: string,
  ) {
    super(`${bin} could not start: ${detail}`);
    this.name = "AgentStartError";
  }
}

/** A fresh empty directory for one call (removed by the caller with removeDir). */
export function makeWorkDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

/** The stable per-process working directory in use (one call at a time uses it; others get a random one). */
const stableInUse = new Set<string>();

/**
 * An empty working directory for one call at a stable path per process and prefix (created empty, removed by
 * release). Claude Code writes its working directory into the model's context, so a random path per call
 * changes the prompt and defeats the prompt cache; a stable one keeps the prefix identical between calls. A call
 * that overlaps another gets a random directory.
 */
export function stableWorkDir(prefix: string): { dir: string; release(): void } {
  const dir = join(tmpdir(), `${prefix}${process.pid}`);
  if (stableInUse.has(dir)) {
    const random = makeWorkDir(prefix);
    return { dir: random, release: () => removeDir(random) };
  }
  stableInUse.add(dir);
  removeDir(dir);
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    release: () => {
      removeDir(dir);
      stableInUse.delete(dir);
    },
  };
}

export function removeDir(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // a temp dir left behind is harmless
  }
}

/** Runs the agent to completion; an abort kills it (SIGTERM, then SIGKILL) and rejects. */
export function runAgent(bin: string, args: string[], opts: { cwd: string; env: Record<string, string>; stdin: string; signal?: AbortSignal }): Promise<AgentRun> {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    if (opts.signal?.aborted) {
      reject(new Error(`${bin} aborted before start`));
      return;
    }
    const child = spawn(bin, args, { cwd: opts.cwd, env: opts.env, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let killTimer: NodeJS.Timeout | undefined;
    let aborted = false;
    const onAbort = (): void => {
      aborted = true;
      child.kill("SIGTERM");
      killTimer = setTimeout(() => child.kill("SIGKILL"), 3_000);
    };
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString("utf8")));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString("utf8")));
    child.on("error", (error) => {
      opts.signal?.removeEventListener("abort", onAbort);
      clearTimeout(killTimer);
      reject(new AgentStartError(bin, String((error as NodeJS.ErrnoException).code ?? "error"), error.message));
    });
    child.on("close", (code, signal) => {
      opts.signal?.removeEventListener("abort", onAbort);
      clearTimeout(killTimer);
      if (aborted) reject(new Error(`${bin} aborted after ${Date.now() - started} ms`));
      else resolve({ code, signal, stdout, stderr, ms: Date.now() - started });
    });
    child.stdin.on("error", () => {
      // the agent exited before reading its prompt: reported through close
    });
    child.stdin.end(opts.stdin);
  });
}
