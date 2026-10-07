import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// Fixed output contract from batch 20261007-154303; no scheduler state or engine calls.
const report = {
  task: "ascension-audit", character: "silent", level: 10, complete: true,
  runs: ["MGA0CZDDKC0P", "25226ZFLNR1J", "JLN5SK17W4FQ", "JMH5C51RLN4E", "9TG1RP5LFAAK",
    "JQPT83P8KDSZ", "4D4J8USKCPAV", "TD1HVGS7H6LB", "PJ2LL9KU7FHD", "S9UZAK0JP0C0"],
  coverage: ["floors", "combat_counts", "healing", "campfires", "rules", "assumptions"],
  code_proposals: ["silent-proposal-aab73fcff1c56b8e", "silent-proposal-09d5c7776e88d756", "silent-proposal-4cc200cc9747f4a8"],
  report: "/fixture/.worktrees/ascension-audit-silent-a10-1/learner/runs/audit/report.md",
};

function parse(output: string) {
  const script = `
import importlib.util, json, sys
from unittest.mock import patch
spec = importlib.util.spec_from_file_location("audit", "../ops/ascension_audit.py")
mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
with patch.object(mod.Path, "read_text", return_value=sys.argv[1]):
    print(json.dumps(mod.read_report("/fixture/report.out")))
`;
  const result = spawnSync("python3", ["-B", "-c", script, output], { encoding: "utf8", timeout: 5000 });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

describe("ascension audit completion output", () => {
  it("reads the leading audit JSON before the launcher summary", () => {
    expect(parse(" \n" + JSON.stringify(report) + "\n\n== 学习者 codex / ascension-audit ==\n状态：success；退出码 0\n")).toEqual(report);
  });

  it("reads a bare audit object with no summary", () => {
    expect(parse(JSON.stringify(report))).toEqual(report);
  });

  it("prefers the last valid fenced audit and ignores a broken final block", () => {
    const last = { ...report, complete: false };
    expect(parse(JSON.stringify(report) + `\n\`\`\`json\n${JSON.stringify(last)}\n\`\`\`\n\`\`\`json\n{broken\n\`\`\``)).toEqual(last);
  });

  it.each(["", "{broken", "null", "[]", JSON.stringify([report]), JSON.stringify(JSON.stringify(report)),
    JSON.stringify({ ...report, task: "fix-batch" }), "回报示例：\n" + JSON.stringify(report),
    "== launcher ==\n" + JSON.stringify(report)])("rejects unsupported or embedded reports: %s", (output) => {
    expect(parse(output)).toEqual({});
  });
});
