/**
 * third_party/jev-sts2 (docs/third-party.md): upstream jev-sts2 as a git submodule pinned at 002e873 and never edited.
 * - .gitmodules names it with the upstream URL and `ignore = none` (any change shows in git status);
 * - the index pins the submodule at 002e873;
 * - when it is checked out: HEAD is 002e873 and nothing in it is changed or added, and every file docs/upstream-files.tsv
 *   marks identical is byte for byte the submodule's;
 * - our code (agent/src, agent/tools, learner/, eval/, knowledge/builders) never names third_party: nothing imports from
 *   it or writes into it.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { PROJECT_ROOT } from "../src/core/paths.js";

const PIN = "002e8739dd0f2625fc7bc859ccd4828de88416cf";
const SUB = join(PROJECT_ROOT, "third_party", "jev-sts2");
const git = (...args: string[]): string => execFileSync("git", ["-C", PROJECT_ROOT, ...args], { encoding: "utf8", env: { PATH: process.env["PATH"] ?? "/usr/bin:/bin", HOME: process.env["HOME"] ?? "/", LC_ALL: "C" } });
const checkedOut = existsSync(join(SUB, ".git"));

function codeFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === "restructure-check" || name.startsWith(".")) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? codeFiles(path) : /\.(ts|mts|mjs|js|py|sh)$/.test(name) ? [path] : [];
  });
}

describe("third_party/jev-sts2", () => {
  it("is the upstream submodule, every change visible", () => {
    const modules = readFileSync(join(PROJECT_ROOT, ".gitmodules"), "utf8");
    expect(modules).toContain('[submodule "third_party/jev-sts2"]');
    expect(modules).toMatch(/\n\s*path = third_party\/jev-sts2\n/);
    expect(modules).toMatch(/\n\s*url = https:\/\/github\.com\/DiscreteTom\/jev-sts2\n/);
    expect(modules).toMatch(/\n\s*ignore = none\n/);
  });

  it("is pinned at 002e873", () => {
    expect(git("ls-files", "-s", "third_party/jev-sts2").trim()).toBe(`160000 ${PIN} 0\tthird_party/jev-sts2`);
  });

  it.skipIf(!checkedOut)("checked out, it is 002e873 untouched", () => {
    expect(execFileSync("git", ["-C", SUB, "rev-parse", "HEAD"], { encoding: "utf8" }).trim()).toBe(PIN);
    expect(execFileSync("git", ["-C", SUB, "status", "--porcelain", "--untracked-files=all", "--ignored=no"], { encoding: "utf8" })).toBe("");
  });

  it.skipIf(!checkedOut)("the files docs/upstream-files.tsv calls identical are the submodule's, byte for byte", () => {
    const rows = readFileSync(join(PROJECT_ROOT, "docs", "upstream-files.tsv"), "utf8").split("\n").filter((line) => line && !line.startsWith("#")).map((line) => line.split("\t"));
    expect(rows.length).toBe(git("-C", SUB, "ls-files").trim().split("\n").length);
    const identical = rows.filter((row) => row[3] === "identical");
    expect(identical.length).toBeGreaterThan(0);
    for (const [upstream, ours] of identical) expect(readFileSync(join(PROJECT_ROOT, ours!)).equals(readFileSync(join(SUB, upstream!))), ours).toBe(true);
  });

  it("our code never names it: no import from it, no write into it", () => {
    const trees = ["agent/src", "agent/tools", "learner", "eval", "knowledge/builders"].map((tree) => join(PROJECT_ROOT, tree));
    const offenders = trees.flatMap(codeFiles).filter((file) => readFileSync(file, "utf8").includes("third_party"));
    expect(offenders).toEqual([]);
  });
});
