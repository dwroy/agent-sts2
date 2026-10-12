import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { codexCommand, type EngineRequest } from "../../learner/lib/engines.js";
import { parseArgs } from "../../learner/lib/launcher.js";

it("resumes the explicit thread with the same learner isolation and never --last", () => {
  const request: EngineRequest = { engine: "codex", cwd: "/p/wt", projectRoot: "/p", tools: ["Read", "Bash", "Write"] };
  const original = codexCommand(request, "fixed input");
  const thread = "11111111-2222-3333-4444-555555555555";
  const resumed = codexCommand({ ...request, resumeThread: thread }, "fixed input");
  const options = original.args.slice(1, -1);
  options.splice(options.indexOf("--cd"), 2);
  expect(resumed.args).toEqual(["exec", "resume", ...options, thread, "-"]);
  expect(resumed.stdin).toBe(original.stdin);
  expect(resumed.args).not.toContain("--last");
  expect(resumed.args).not.toContain("--dangerously-bypass-approvals-and-sandbox");
  expect(() => codexCommand({ ...request, resumeThread: "--last" }, "input")).toThrow();
  expect(() => parseArgs(["--engine", "claude", "--task", "x", "--cwd", "/p", "--resume-thread", thread])).toThrow();
});

it("learning requirements survive report completion, interruptions and disagreements", () => {
  const result = spawnSync("nice", ["-n", "19", "python3", "-B", "../ops/tests/test_learning_requests.py"], {
    encoding: "utf8", timeout: 30_000,
  });
  expect(result.status, result.stderr).toBe(0);
  expect(result.stderr).toMatch(/Ran \d+ tests/);
});
