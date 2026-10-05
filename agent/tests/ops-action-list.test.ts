import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { ACTIONS } from "../../ops/codex/lib.js";

it("documents every broker action in the request script, including strategy dispatch and fallback checks", () => {
  const script = readFileSync("../ops/codex-ops-do.sh", "utf8");
  const actionList = script.split("\n").filter((line) => line.startsWith("#")).join("\n");
  for (const action of Object.keys(ACTIONS)) {
    expect(actionList, action).toContain(action);
  }
  const guide = readFileSync("../docs/codex-ops.md", "utf8");
  expect(guide).toContain("strategy-proposal <ids>");
  expect(guide).toContain("learner-recheck <批次 id>");
});
