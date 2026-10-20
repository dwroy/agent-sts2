import { expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";

vi.mock("node:child_process", () => ({ spawnSync: vi.fn(() => ({ status: 0, stderr: "" })) }));
// Replay the wrapper with no child processes and check each actual subprocess request.
import "./learner-retention.test.js";

it("assigns the original deadline separately to every retention safety case", () => {
  const calls = vi.mocked(spawnSync).mock.calls;
  expect(calls).toHaveLength(15);
  const names = calls.map(([, args]) => args?.[2]);
  expect(new Set(names).size).toBe(15);
  expect(names.every((name) => typeof name === "string" && name.startsWith("LearnerRetention.test_"))).toBe(true);
  for (const [command, , options] of calls) {
    expect(command).toBe("python3");
    expect(options).toMatchObject({ timeout: 30_000 });
  }
});
