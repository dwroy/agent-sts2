import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function defaultTempParent() {
  const project = fileURLToPath(new URL("../..", import.meta.url));
  try {
    const common = execFileSync("git", ["-C", project, "rev-parse", "--path-format=absolute", "--git-common-dir"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    // The common checkout keeps AF_UNIX paths short even in deeply nested worktrees.
    return join(dirname(common), ".cache", "t");
  } catch {
    return resolve(project, ".cache", "t");
  }
}

export function cleanupTempScope(directory, token) {
  if (!directory || !token) return;
  const marker = join(directory, ".sts2-temp-owner");
  try {
    if (readFileSync(marker, "utf8") !== token) throw new Error("temporary directory owner mismatch");
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  rmSync(directory, { recursive: true, force: true });
}

export function createTempScope(env = process.env, parent = defaultTempParent()) {
  // Explicit caller-owned scratch is never removed or redirected.
  if (env.TMPDIR?.trim()) return { directory: null, token: null, env: {}, cleanup() {} };
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const directory = mkdtempSync(join(parent, "s-"));
  const token = randomUUID();
  writeFileSync(join(directory, ".sts2-temp-owner"), token, { mode: 0o600, flag: "wx" });
  return { directory, token, env: { TMPDIR: directory, TMP: directory, TEMP: directory },
    cleanup() { cleanupTempScope(directory, token); } };
}
