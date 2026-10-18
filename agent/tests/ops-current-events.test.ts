import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { wakeMessage } from "../../ops/codex/lib.js";

it("guards ordinary completion, records, source changes and short checklist using fixed local inputs", () => {
  const result = spawnSync("python3", ["-B", "../ops/tests/test_ordinary_close.py"], { encoding: "utf8", timeout: 120_000 });
  expect(result.status, result.stdout + result.stderr).toBe(0);
}, 125_000);

it("applies the approved short context policy only at an original wake boundary", () => {
  const text = wakeMessage([], new Date("2026-10-18T08:13:00Z"));
  expect(text).toContain("notes/ops-current.md");
  expect(text).toContain("自然唤醒边界");
  for (const name of ["ops-session-prompt.md", "ops-session-silent-prompt.md", "ops-session-v4-prompt.md", "ops-session-silent-codex-prompt.md"]) {
    const prompt = readFileSync(resolve("../ops", name), "utf8");
    expect(prompt).toContain("300–500字");
    expect(prompt).toContain("不热切");
    expect(prompt).not.toContain("先读：paper/materials/decision-log.md 最后 40 行");
  }
});
