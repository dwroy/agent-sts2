/** The single-instance lock exists because two loops driving one game is a real failure mode. */

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { acquireLock, readLock } from "../src/core/util/lock.js";

const dirs: string[] = [];

function lockPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "jev-sts2-lock-"));
  dirs.push(dir);
  return join(dir, "loop.lock");
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // best effort
    }
  }
});

describe("acquireLock", () => {
  it("acquires a free lock and releases it", () => {
    const path = lockPath();
    const lock = acquireLock(path, "play");
    expect(lock.ok).toBe(true);
    expect(readLock(path)?.pid).toBe(process.pid);
    if (lock.ok) lock.release();
    expect(readLock(path)).toBeNull();
  });

  it("refuses while another live process holds it", () => {
    const path = lockPath();
    const first = acquireLock(path, "play (pid 1)");
    expect(first.ok).toBe(true);

    const second = acquireLock(path, "shadow");
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.holder.pid).toBe(process.pid);
      expect(second.holder.command).toContain("play");
    }
    if (first.ok) first.release();
  });

  it("takes over when forced", () => {
    const path = lockPath();
    const first = acquireLock(path, "play");
    const second = acquireLock(path, "shadow", { force: true });
    expect(second.ok).toBe(true);
    expect(readLock(path)?.command).toBe("shadow");
    if (first.ok) first.release();
    if (second.ok) second.release();
  });

  it("ignores a stale lock from a dead process", () => {
    const path = lockPath();
    writeFileSync(path, JSON.stringify({ pid: 999_999, startedAt: "", command: "ghost" }), "utf8");
    const lock = acquireLock(path, "play");
    expect(lock.ok).toBe(true);
    if (lock.ok) lock.release();
  });

  it("does not remove a lock owned by someone else", () => {
    const path = lockPath();
    writeFileSync(path, JSON.stringify({ pid: process.pid + 1, startedAt: "", command: "other" }), "utf8");
    const lock = acquireLock(path, "play", { force: true });
    expect(lock.ok).toBe(true);
    if (lock.ok) {
      // Simulate another process taking the lock afterwards.
      writeFileSync(path, JSON.stringify({ pid: process.pid + 1, startedAt: "", command: "other" }), "utf8");
      lock.release();
    }
    expect(readLock(path)?.command).toBe("other");
  });
});
