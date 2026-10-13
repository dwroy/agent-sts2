import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { learnerLockScript, runLearnerLockFixture } from "./learner-lock-fixture.js";

const fixture = mkdtempSync(join(tmpdir(), "learner-lock-fixed-"));
afterAll(() => rmSync(fixture, { recursive: true, force: true }));

function launcher(name: string, body: string): string {
  const path = join(fixture, name);
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}

describe("learner state lock lifetime", () => {
  it("releases the state lock for full checks and preserves concurrent updates when recording results", async () => {
    const result = await runLearnerLockFixture(learnerLockScript);
    expect(result.stdout).toContain('"preserved": 99');
  });

  it("preserves real lock assertions after a six-second launcher delay", async () => {
    const command = launcher("delayed-python", 'sleep 6\nexec python3 "$@"');
    const result = await runLearnerLockFixture(learnerLockScript, command);
    expect(result.stdout).toContain('"preserved": 99');
  });

  it("rejects a nonzero fixture exit even when its output claims preservation", async () => {
    await expect(runLearnerLockFixture('import sys; print(\'{"preserved": 99}\'); sys.exit(9)'))
      .rejects.toMatchObject({ code: 9, stdout: '{"preserved": 99}\n' });
  });

  it("still terminates a hung fixture at the configured deadline", async () => {
    // exec leaves one child PID to terminate, with no orphaned interpreter or sleep process.
    const command = launcher("hung-python", "exec sleep 60");
    await expect(runLearnerLockFixture(learnerLockScript, command, 100))
      .rejects.toMatchObject({ killed: true, signal: "SIGTERM" });
  });
});
