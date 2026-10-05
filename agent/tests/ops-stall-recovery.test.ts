import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

const fixture = mkdtempSync(join(tmpdir(), "stall-fixed-"));
afterAll(() => rmSync(fixture, { recursive: true, force: true }));
mkdirSync(join(fixture, "logs/console"), { recursive: true });
mkdirSync(join(fixture, "ops"));
mkdirSync(join(fixture, "bin"));
copyFileSync("../ops/stall-check.sh", join(fixture, "ops/stall-check.sh"));
writeFileSync(join(fixture, "ops/paths.sh"), `ROOT='${fixture}'\nLOGS="$ROOT/logs"\n`);
for (const [command, body] of Object.entries({
  date: "printf '1000\\n'",
  pgrep: "exit 1",
  curl: `printf '%s\\n' '{"data":{"screen":"COMBAT","available_actions":[]}}'`,
})) {
  const file = join(fixture, "bin", command);
  writeFileSync(file, `#!/bin/sh\n${body}\n`);
  chmodSync(file, 0o755);
}

function check(consoleLines: string, decisionEpoch: number, consoleEpoch = 990) {
  const console = join(fixture, "logs/console/fixed.log");
  writeFileSync(console, consoleLines + "\n");
  utimesSync(console, consoleEpoch, consoleEpoch);
  writeFileSync(join(fixture, "logs/decisions.jsonl"), JSON.stringify({ ts: new Date(decisionEpoch * 1000).toISOString() }) + "\n");
  const result = spawnSync("bash", [join(fixture, "ops/stall-check.sh")], {
    encoding: "utf8", timeout: 5000, env: { ...process.env, PATH: `${fixture}/bin:${process.env.PATH}` },
  });
  expect(result.status, result.stderr).toBe(0);
  return result.stdout;
}

describe("stall check mod request recovery", () => {
  const failed = "cannot reach the STS2-Agent mod: request timed out";
  it("does not flag a single failed action followed by a current decision", () => {
    expect(check(`${failed}\nCodex deciding event`, 990)).toMatch(/^OK/);
  });
  it("requires repeated unreachable requests and stale decisions, and clears on recovery", () => {
    expect(check(`${failed}\nretry\n${failed}`, 800)).toMatch(/^STALL: .*console reports unreachable/);
    expect(check(`${failed}\nretry\n${failed}\nCodex deciding`, 995)).toMatch(/^OK/);
    expect(check(`${failed}`, 800)).toMatch(/^OK/);
  });
  it("keeps real stuck-loop, gate and silence alerts", () => {
    expect(check("stuck for 25 polls", 990)).toMatch(/^STALL/);
    expect(check("gate rejected 3 times", 990)).toMatch(/^STALL/);
    expect(check("waiting", 990, 500)).toMatch(/^STALL: .*console silent 500s/);
  });
});
