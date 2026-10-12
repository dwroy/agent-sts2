import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

/** Only the observed CLI failure before thread creation is replayable. Unknown output fails closed. */
export class StartupEvidence {
  private lines: string[] = [];
  private bytes = 0;
  private output = false;

  stdout(): void { this.output = true; }

  stderr(line: string): void {
    this.bytes += Buffer.byteLength(line);
    if (this.bytes <= 65_536) this.lines.push(line);
  }

  transientBeforeSession(): boolean {
    if (this.output || this.bytes > 65_536) return false;
    const failure = "failed to load AGENTS.md instructions for environment `local`: fs sandbox helper failed with status exit status: 1: error building bubblewrap command: Fatal error: ripgrep unreadable glob scan failed for ";
    const missing = /^rg: \/[^\r\n]+: No such file or directory \(os error 2\)(?: \(code -32603\))?$/;
    let sessionFailure = false;
    let threadFailure = false;
    for (const line of this.lines) {
      if (!line.trim()) continue;
      // These two startup telemetry events precede session creation in the frozen evidence.
      if (/^\S+\s+INFO codex_otel\.trace_safe: event.name="codex.conversation_starts" /.test(line)) continue;
      if (/^\S+\s+INFO codex_otel\.trace_safe: event.name="codex.api_request" .* endpoint="\/models" /.test(line)) continue;
      if (missing.test(line)) continue;
      const prefix = line.startsWith("Error: thread/start: thread/start failed: error creating thread: ")
        ? "thread"
        : /^\S+\s+ERROR codex_core::session: Failed to create session: /.test(line) ? "session" : null;
      const at = line.indexOf(failure);
      if (!prefix || at < 0) return false;
      const detail = line.slice(at + failure.length);
      const rg = detail.indexOf(": rg: /");
      if (!detail.startsWith("/") || rg < 0 || !missing.test(detail.slice(rg + 2))) return false;
      if (prefix === "thread") threadFailure = true;
      else sessionFailure = true;
    }
    return sessionFailure && threadFailure;
  }
}

export interface StartupLease {
  batch: string;
  identity: string;
  current(): boolean;
}

/** Bind retries to the scheduler's existing registration and the original live owner PID. */
export function captureStartupLease(env: NodeJS.ProcessEnv, root: string, cwd: string): StartupLease | undefined {
  const batch = env["LEARNER_BATCH_ID"];
  const file = env["LEARNER_STATE_FILE"];
  if (!batch || !/^[0-9]{8}-[0-9]{6}-(?:s2-)?[a-z-]+$/.test(batch) || !file || !isAbsolute(file)) return undefined;
  const rel = relative(resolve(root, "ops"), resolve(file));
  if (rel.startsWith("..") || isAbsolute(rel) || !rel.endsWith("/learn.json")) return undefined;
  const snapshot = (): string | undefined => {
    try {
      const state = JSON.parse(readFileSync(file, "utf8"));
      const value = state.batches?.[batch];
      if (!value || value.state !== "running" || resolve(value.worktree ?? root) !== resolve(cwd)
          || !Number.isSafeInteger(value.pid) || value.pid <= 0 || value.cancelled || value.finished || value.rc !== undefined) return undefined;
      const stat = readFileSync(`/proc/${value.pid}/stat`, "utf8");
      const fields = stat.slice(stat.lastIndexOf(")") + 2).trim().split(/\s+/);
      if (!fields[19] || ["Z", "X"].includes(fields[0]!)) return undefined;
      return createHash("sha256").update(JSON.stringify([value, fields[19]])).digest("hex");
    } catch {
      // Missing registration, owner, or read access never authorizes a replay.
      return undefined;
    }
  };
  const identity = snapshot();
  return identity ? { batch, identity, current: () => snapshot() === identity } : undefined;
}
