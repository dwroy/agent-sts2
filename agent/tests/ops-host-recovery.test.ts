import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, it } from "vitest";
import { initCommand, interactiveArgs, opsExecution, opsRequest, resumeCommand, validateRequest } from "../../ops/codex/lib.js";
import { codexCommand, withCodexKeys } from "../../learner/lib/engines.js";
import { assistRequest } from "../../ops/codex/assist.js";

const root = mkdtempSync(join(tmpdir(), "ops-host-recovery-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const runtime = join(root, "ops/codex-ops");
mkdirSync(runtime, { recursive: true });
const env = { HOME: root, CODEX_HOME: join(root, "account"), CODEX_OPS_EXECUTION: "host" };
const session = "01a12bec-c83f-7c21-b76f-eb8e5304eb8f";

it("uses explicit host access on all main ops launch paths, without conflicting sandbox profiles", () => {
  const request = opsRequest(root, env);
  for (const args of [initCommand(request, "fixed", "codex").args,
    resumeCommand(request, session, "fixed", "codex").args, interactiveArgs(request, session)]) {
    expect(args).toContain("danger-full-access");
    expect(args).toContain('approval_policy="never"');
    expect(args.some((arg) => /^(default_permissions|permissions\.ops\.filesystem)=/.test(arg))).toBe(false);
    expect(args).toContain("gpt-6-astra");
    expect(args).toContain('model_reasoning_effort="xhigh"');
  }
});

it("keeps learners and read-only assistants sandboxed even when inheriting the ops setting", () => {
  const learner = withCodexKeys({ engine: "codex", cwd: root, projectRoot: root, tools: ["Bash", "Edit"] }, env);
  for (const request of [learner, assistRequest(root, root, env)]) {
    const command = codexCommand(request, "fixed");
    expect(command.args).not.toContain("danger-full-access");
    expect(command.args.some((arg) => arg.startsWith("default_permissions="))).toBe(true);
    expect(command.args.some((arg) => arg.includes('"none"'))).toBe(true);
  }
});

it("defaults to sandbox, persists an explicit project choice and rejects invalid settings", () => {
  expect(opsExecution(root, {})).toBe("sandbox");
  writeFileSync(join(runtime, "execution-mode"), "host\n");
  expect(opsExecution(root, {})).toBe("host");
  expect(opsExecution(root, { CODEX_OPS_EXECUTION: "sandbox" })).toBe("sandbox");
  writeFileSync(join(runtime, "execution-mode"), "invalid\n");
  expect(() => opsExecution(root, {})).toThrow("invalid");
  rmSync(join(runtime, "execution-mode"));
});

it("accepts exactly one run ID for recovery", () => {
  expect(validateRequest({ action: "report-run", args: ["AAA000000001"] }).ok).toBe(true);
  for (const args of [[], ["../escape"], ["AAA000000001,AAA000000002"], ["AAA000000001", "extra"]]) {
    expect(validateRequest({ action: "report-run", args }).ok).toBe(false);
  }
});

it("recovers original and resumed segments once with the original report implementation", async () => {
  const result = await new Promise<{ code: number | null; out: string }>((resolve, reject) => {
    const child = spawn("python3", ["-B", "../ops/tests/test_report_run.py"]);
    let out = "";
    child.stdout.on("data", (data: Buffer) => { out += data.toString(); });
    child.stderr.on("data", (data: Buffer) => { out += data.toString(); });
    child.on("error", reject); child.on("close", (code) => resolve({ code, out }));
  });
  expect(result.code, result.out).toBe(0);
  expect(result.out).toContain("Ran 7 tests");
});
