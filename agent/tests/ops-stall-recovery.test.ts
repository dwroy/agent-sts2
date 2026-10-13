import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { runStallFixture, type StallExecutor } from "./stall-subprocess-fixture.js";

const fixture = mkdtempSync(join(tmpdir(), "stall-fixed-"));
afterAll(() => rmSync(fixture, { recursive: true, force: true }));
mkdirSync(join(fixture, "logs/console"), { recursive: true });
mkdirSync(join(fixture, "ops"));
mkdirSync(join(fixture, "bin"));
copyFileSync("../ops/stall-check.sh", join(fixture, "ops/stall-check.sh"));
copyFileSync("../ops/process_scope.py", join(fixture, "ops/process_scope.py"));
copyFileSync("../ops/instance_gate.py", join(fixture, "ops/instance_gate.py"));
writeFileSync(join(fixture, "ops/paths.sh"), `ROOT='${fixture}'\nOPS="$ROOT/ops"\nLIVE="$ROOT/.worktrees/live"\nLOGS="$ROOT/logs"\n`);
for (const [command, body] of Object.entries({
  date: "printf '1000\\n'",
  pgrep: "exit 1",
  curl: `printf '%s\\n' '{"data":{"screen":"COMBAT","available_actions":[]}}'`,
})) {
  const file = join(fixture, "bin", command);
  writeFileSync(file, `#!/bin/sh\n${body}\n`);
  chmodSync(file, 0o755);
}

async function check(consoleLines: string, decisionEpoch: number, consoleEpoch = 990, timeout = 10_000) {
  const console = join(fixture, "logs/console/fixed.log");
  writeFileSync(console, consoleLines + "\n");
  utimesSync(console, consoleEpoch, consoleEpoch);
  writeFileSync(join(fixture, "logs/decisions.jsonl"), JSON.stringify({ ts: new Date(decisionEpoch * 1000).toISOString() }) + "\n");
  const result = await runStallFixture(join(fixture, "ops/stall-check.sh"),
    { ...process.env, PATH: `${fixture}/bin:${process.env.PATH}` }, timeout);
  return result.stdout;
}

async function withLauncher(body: string, run: () => Promise<void>) {
  const launcher = join(fixture, "bin/bash");
  writeFileSync(launcher, `#!/bin/sh\n${body}\n`);
  chmodSync(launcher, 0o755);
  try {
    await run();
  } finally {
    rmSync(launcher);
  }
}

describe("stall check mod request recovery", () => {
  const failed = "cannot reach the STS2-Agent mod: request timed out";
  it("does not flag a single failed action followed by a current decision", async () => {
    expect(await check(`${failed}\nCodex deciding event`, 990)).toMatch(/^OK/);
  });
  it("requires repeated unreachable requests and stale decisions, and clears on recovery", async () => {
    expect(await check(`${failed}\nretry\n${failed}`, 800)).toMatch(/^STALL: .*console reports unreachable/);
    expect(await check(`${failed}\nretry\n${failed}\nCodex deciding`, 995)).toMatch(/^OK/);
    expect(await check(`${failed}`, 800)).toMatch(/^OK/);
  });
  it("keeps real stuck-loop, gate and silence alerts", async () => {
    expect(await check("stuck for 25 polls", 990)).toMatch(/^STALL/);
    expect(await check("gate rejected 3 times", 990)).toMatch(/^STALL/);
    expect(await check("waiting", 990, 500)).toMatch(/^STALL: .*console silent 500s/);
  });
  it("checks the real script and deterministically verifies startup beyond the former five-second limit", async () => {
    // Separate the fixed startup deadline contract from host scheduling of the real shell.
    let now = 0;
    const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
    const execute: StallExecutor = async (_command, _args, options) => {
      now += 6_000;
      if (options.timeout < 6_000) {
        throw Object.assign(new Error("fixed startup exceeded deadline"), { killed: true, signal: "SIGTERM" });
      }
      return { stdout: "fixed launch complete", stderr: "" };
    };
    try {
      await expect(runStallFixture("fixed-script", {}, undefined, execute)).resolves.toMatchObject({ stdout: "fixed launch complete" });
      await expect(runStallFixture("fixed-script", {}, 5_000, execute)).rejects.toMatchObject({
        timeoutMs: 5_000, elapsedMs: 6_000, killed: true, signal: "SIGTERM",
      });
    } finally {
      clock.mockRestore();
    }
    expect(await check(`${failed}\nretry\n${failed}`, 800)).toMatch(/^STALL: .*console reports unreachable/);
  });
  it("retains exit, signal, stderr and timing evidence in a readable subprocess failure", async () => {
    let now = 1_000;
    const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
    const cause = Object.assign(new Error("fixed child failed"), { code: 9, killed: false, signal: null,
      stdout: "OK\n", stderr: "fixed diagnostic\n" });
    const execute: StallExecutor = async () => { now = 7_000; throw cause; };
    try {
      await expect(runStallFixture("fixed-script", {}, 10_000, execute)).rejects.toMatchObject({
        code: 9, signal: null, killed: false, stdout: "OK\n", stderr: "fixed diagnostic\n",
        timeoutMs: 10_000, elapsedMs: 6_000, cause,
        message: expect.stringContaining('"stderr":"fixed diagnostic\\n"'),
      });
    } finally {
      clock.mockRestore();
    }
  });
  it("rejects a failed subprocess even when it prints OK", async () => {
    await withLauncher("printf 'OK\\n'\nexit 9", async () => {
      await expect(check("waiting", 990)).rejects.toMatchObject({ code: 9, stdout: "OK\n",
        timeoutMs: 10_000, killed: false, signal: null, message: expect.stringContaining('"code":9') });
    });
  });
  it("still terminates a hung subprocess at the configured deadline", async () => {
    // exec leaves one child PID for execFile to terminate, with no orphaned sleep process.
    await withLauncher("exec sleep 60", async () => {
      await expect(check("waiting", 990, 990, 100)).rejects.toMatchObject({ killed: true, signal: "SIGTERM",
        timeoutMs: 100, message: expect.stringContaining('"killed":true') });
    });
  });
});
