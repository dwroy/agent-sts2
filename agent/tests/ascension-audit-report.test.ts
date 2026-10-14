import { describe, expect, it } from "vitest";
import { auditOutputFixture } from "./ascension-audit-output-fixture.js";

// Fixed output contract from batch 20261007-154303; no scheduler state or engine calls.
const report = {
  task: "ascension-audit", character: "silent", level: 10, complete: true,
  runs: ["MGA0CZDDKC0P", "25226ZFLNR1J", "JLN5SK17W4FQ", "JMH5C51RLN4E", "9TG1RP5LFAAK",
    "JQPT83P8KDSZ", "4D4J8USKCPAV", "TD1HVGS7H6LB", "PJ2LL9KU7FHD", "S9UZAK0JP0C0"],
  coverage: ["floors", "combat_counts", "healing", "campfires", "rules", "assumptions"],
  code_proposals: ["silent-proposal-aab73fcff1c56b8e", "silent-proposal-09d5c7776e88d756", "silent-proposal-4cc200cc9747f4a8"],
  report: "/fixture/.worktrees/ascension-audit-silent-a10-1/learner/runs/audit/report.md",
};

const leading = " \n" + JSON.stringify(report) + "\n\n== 学习者 codex / ascension-audit ==\n状态：success；退出码 0\n";
const bare = JSON.stringify(report);
const last = { ...report, complete: false };
const fenced = bare + `\n\`\`\`json\n${JSON.stringify(last)}\n\`\`\`\n\`\`\`json\n{broken\n\`\`\``;
const unsupported = ["", "{broken", "null", "[]", JSON.stringify([report]), JSON.stringify(JSON.stringify(report)),
  JSON.stringify({ ...report, task: "fix-batch" }), "回报示例：\n" + bare, "== launcher ==\n" + bare];
const parse = auditOutputFixture([leading, bare, fenced, ...unsupported]);

describe("ascension audit completion output", () => {
  it("reads the leading audit JSON before the launcher summary", async () => {
    expect(await parse(leading)).toEqual(report);
  });

  it("reads a bare audit object with no summary", async () => {
    expect(await parse(bare)).toEqual(report);
  });

  it("prefers the last valid fenced audit and ignores a broken final block", async () => {
    expect(await parse(fenced)).toEqual(last);
  });

  it.each(unsupported)("rejects unsupported or embedded reports: %s", async (output) => {
    expect(await parse(output)).toEqual({});
  });
});
