import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Dai's Codex learning-loop roles", () => {
  it.each(["AGENTS.md", "docs/learning-protocol.md", "docs/codex-ops.md", "ops/ops-session-silent-codex-prompt.md"])("%s keeps self-tested learner merges and Claude's observer role", (file) => {
    const text = readFileSync(`../${file}`, "utf8");
    expect(text).toContain("不另设审核");
    expect(text).toMatch(/Claude[^\n]*只观察/);
    expect(text).toContain("自行合入");
    expect(text).toContain("test-sandbox.sh");
    expect(text).toContain("learner-checks");
  });
});
