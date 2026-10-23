import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../..", import.meta.url));
const wrapper = readFileSync(resolve(root, "ops/codex-ops-learner.sh"), "utf8");
const published = new Set(execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "--", "ops", "learner"],
  { cwd: root, encoding: "utf8" }).trim().split("\n"));

function scripts(text: string): string[] {
  // paths.sh is sourced relative to this wrapper; the other repo scripts use ROOT or OPS.
  const result = new Set(["ops/paths.sh"]);
  for (const match of text.matchAll(/\$(?:OPS|\{OPS\})\/([\w./-]+\.(?:py|sh|ts|mjs))\b/g)) result.add(`ops/${match[1]}`);
  for (const match of text.matchAll(/\$(?:ROOT|\{ROOT\})\/([\w./-]+\.(?:py|sh|ts|mjs))\b/g)) result.add(match[1]!);
  return [...result].sort();
}

function missing(text: string, files: Set<string>): string[] {
  return scripts(text).filter((path) => !files.has(path));
}

describe("learner wrapper published script closure", () => {
  it("ships every literal repo script referenced by the wrapper, including both task routes", () => {
    const required = scripts(wrapper);
    expect(required).toEqual(expect.arrayContaining(["ops/paths.sh", "ops/learner_tui.py", "ops/learner_entry.py",
      "ops/codex-learner.sh", "ops/codex-fast.sh", "ops/codex-ops-learn.py", "learner/run.ts"]));
    expect(missing(wrapper, published)).toEqual([]);
    for (const path of required) expect(statSync(resolve(root, path)).isFile(), path).toBe(true);
  });

  it("rejects the exact old unpublished seal reference and any omitted required script", () => {
    const withoutRecycler = new Set(published);
    withoutRecycler.delete("ops/learner_tabs.py");
    expect(missing(`${wrapper}\npython3 "$OPS/learner_tabs.py" seal\n`, withoutRecycler)).toEqual(["ops/learner_tabs.py"]);
    for (const path of scripts(wrapper)) {
      const incomplete = new Set(published);
      incomplete.delete(path);
      expect(missing(wrapper, incomplete)).toEqual([path]);
    }
  });
});
