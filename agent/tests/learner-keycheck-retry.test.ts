import { afterEach, expect, it, vi } from "vitest";

const runAgent = vi.hoisted(() => vi.fn());
vi.mock("../../agent/src/brain/engines/process.js", async (original) => ({
  ...await original<typeof import("../../agent/src/brain/engines/process.js")>(), runAgent,
}));
import { codexKeyCheck, transientKeyScanFailure, type EngineRequest } from "../../learner/lib/engines.js";

const missing = "error building bubblewrap command: Fatal error: ripgrep unreadable glob scan failed for /fixed-home: rg: /fixed-home/other-project/.aws: No such file or directory (os error 2)\nrg: /fixed-home/other-project/.codex: No such file or directory (os error 2)";
const failure = { code: 1, signal: null, stdout: "", stderr: missing };
const request: EngineRequest = { engine: "codex", cwd: "/fixture", projectRoot: "/fixture", repo: "/fixture", home: "/fixed-home", codexHome: "/fixed-home/account", tools: ["Read"], keyFiles: ["/fixture/key"] };
afterEach(() => runAgent.mockReset());

it("retries only a construction-time ENOENT with identical policy, environment and total timeout signal", async () => {
  runAgent.mockResolvedValueOnce(failure).mockResolvedValueOnce({ code: 0, stdout: "", stderr: "" });
  const result = await codexKeyCheck("codex", request, { PATH: "/bin" });
  expect(result).toMatchObject({ ok: true, checked: 1, startupRetry: { attempts: 2, reason: "glob_scan_missing_path", firstError: missing } });
  expect(runAgent).toHaveBeenCalledTimes(2);
  expect(runAgent.mock.calls[0]).toEqual(runAgent.mock.calls[1]);
  expect(runAgent.mock.calls[1]![1]).not.toContain("danger-full-access");
});

it("keeps repeated construction failure closed after one retry", async () => {
  runAgent.mockResolvedValue(failure);
  expect(await codexKeyCheck("codex", request, {})).toMatchObject({ ok: false, startupRetry: { attempts: 2 } });
  expect(runAgent).toHaveBeenCalledTimes(2);
});

it("never retries or suppresses a readable credential result", async () => {
  runAgent.mockResolvedValue({ code: 0, stdout: "/fixture/key\n", stderr: "" });
  expect(await codexKeyCheck("codex", request, {})).toEqual({ ok: false, readable: ["/fixture/key"] });
  expect(runAgent).toHaveBeenCalledTimes(1);
});

it.each([
  { ...failure, stdout: "/fixture/key\n" },
  { ...failure, stderr: missing + "\nrg: /another: Permission denied (os error 13)" },
  { ...failure, stderr: "child failed: No such file or directory (os error 2)" },
  { ...failure, code: null },
])("does not retry unrelated or ambiguous failures %#", async (result) => {
  expect(transientKeyScanFailure(result)).toBe(false);
  runAgent.mockResolvedValue(result);
  expect((await codexKeyCheck("codex", request, {})).ok).toBe(false);
  expect(runAgent).toHaveBeenCalledTimes(1);
});

it("does not start a second sandbox after the original timeout expired", async () => {
  runAgent.mockResolvedValue(failure);
  expect(await codexKeyCheck("codex", request, {}, 20)).toMatchObject({ ok: false, startupRetry: { attempts: 1 } });
  expect(runAgent).toHaveBeenCalledTimes(1);
});
