import { execFile } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterAll, describe, expect, it } from "vitest";

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

const execFileAsync = promisify(execFile);

async function check(consoleLines: string, decisionEpoch: number, consoleEpoch = 990, timeout = 10_000) {
  const console = join(fixture, "logs/console/fixed.log");
  writeFileSync(console, consoleLines + "\n");
  utimesSync(console, consoleEpoch, consoleEpoch);
  writeFileSync(join(fixture, "logs/decisions.jsonl"), JSON.stringify({ ts: new Date(decisionEpoch * 1000).toISOString() }) + "\n");
  // Allow shell startup to share the host with play, within the suite's 15-second test limit.
  // Await the child so Vitest can enforce its own deadline as well; execFile rejects failures.
  const result = await execFileAsync("bash", [join(fixture, "ops/stall-check.sh")], {
    encoding: "utf8", timeout, env: { ...process.env, PATH: `${fixture}/bin:${process.env.PATH}` },
  });
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
  it("checks the real script after shell startup exceeds the former five-second limit", async () => {
    // Reproduce scheduling delay without changing the fixed decision/console timestamps.
    await withLauncher('sleep 6\nexec /bin/bash "$@"', async () => {
      expect(await check(`${failed}\nretry\n${failed}`, 800)).toMatch(/^STALL: .*console reports unreachable/);
    });
  });
  it("rejects a failed subprocess even when it prints OK", async () => {
    await withLauncher("printf 'OK\\n'\nexit 9", async () => {
      await expect(check("waiting", 990)).rejects.toMatchObject({ code: 9, stdout: "OK\n" });
    });
  });
  it("still terminates a hung subprocess at the configured deadline", async () => {
    // exec leaves one child PID for execFile to terminate, with no orphaned sleep process.
    await withLauncher("exec sleep 60", async () => {
      await expect(check("waiting", 990, 990, 100)).rejects.toMatchObject({ killed: true, signal: "SIGTERM" });
    });
  });
});
