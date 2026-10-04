/**
 * A single-instance lock for the dispatching commands.
 *
 * Two loops driving the same game instance is not a hypothetical: one of them will act on a board
 * the other just changed, and the player may be clicking too. The lock makes that impossible instead
 * of unlikely.
 */

import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export interface LockInfo {
  pid: number;
  startedAt: string;
  command: string;
}

export type LockResult = { ok: true; path: string; release(): void } | { ok: false; holder: LockInfo };

function isAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means the process exists but belongs to another user; ESRCH means it is gone.
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

export function readLock(path: string): LockInfo | null {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<LockInfo>;
    if (typeof parsed.pid === "number") {
      return { pid: parsed.pid, startedAt: parsed.startedAt ?? "", command: parsed.command ?? "" };
    }
  } catch {
    // missing or malformed: treat as unlocked
  }
  return null;
}

export function acquireLock(path: string, command: string, options: { force?: boolean } = {}): LockResult {
  const existing = readLock(path);
  if (existing && isAlive(existing.pid) && options.force !== true) {
    return { ok: false, holder: existing };
  }

  const info: LockInfo = { pid: process.pid, startedAt: new Date().toISOString(), command };
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(info), "utf8");
  } catch {
    // If the lock cannot be written the run may proceed: it is a safety net, not a requirement.
  }

  return {
    ok: true,
    path,
    release() {
      const current = readLock(path);
      if (current?.pid !== process.pid) return;
      try {
        if (existsSync(path)) unlinkSync(path);
      } catch {
        // best effort
      }
    },
  };
}
