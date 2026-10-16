import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { runStallFixture } from "./stall-subprocess-fixture.js";

const fixture = mkdtempSync(join(tmpdir(), "stall-between-runs-"));
afterAll(() => rmSync(fixture, { recursive: true, force: true }));
for (const directory of ["ops", "logs/console", "bin"]) mkdirSync(join(fixture, directory), { recursive: true });
copyFileSync("../ops/stall-check.sh", join(fixture, "ops/stall-check.sh"));
writeFileSync(join(fixture, "ops/paths.sh"), `ROOT='${fixture}'\nOPS="$ROOT/ops"\nLIVE="$ROOT/.worktrees/live"\nLOGS="$ROOT/logs"\n`);
// Freeze command inputs; never inspect real controllers or call the game/network.
writeFileSync(join(fixture, "ops/process_scope.py"), `import json, sys
from pathlib import Path
sys.stdin.read()
state = json.loads(Path(__file__).with_name("fixed-state.json").read_text())
if state[sys.argv[sys.argv.index("--kind") + 1]]:
    print("123 fixed scoped process")
`);
for (const kind of ["brain", "sim"]) {
  writeFileSync(join(fixture, `ops/${kind}_wait.py`), `import json
from pathlib import Path
active = json.loads(Path(__file__).with_name("fixed-state.json").read_text())["${kind}"]
if active:
    print("OK (fixed ${kind} wait)")
raise SystemExit(0 if active else 1)
`);
}
for (const [command, body] of Object.entries({
  date: "printf '1000\\n'",
  pgrep: "printf '123\\n'",
  curl: `printf '%s\\n' '{"data":{"screen":"GAME_OVER","available_actions":[]}}'`,
})) {
  const path = join(fixture, "bin", command);
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
}

const finalized = "17:22:42 GAME_OVER run/finalize -> continue_game_over\n  stopped: run 1 ended (defeat); stopping as requested";
async function check(options: { console?: string; quiet?: number; noDecision?: number;
  report?: boolean; play?: boolean; brain?: boolean; sim?: boolean } = {}) {
  writeFileSync(join(fixture, "ops/fixed-state.json"), JSON.stringify({ report: options.report ?? true,
    play: options.play ?? false, brain: options.brain ?? false, sim: options.sim ?? false }));
  const console = join(fixture, "logs/console/fixed.log");
  writeFileSync(console, `${options.console ?? finalized}\n`);
  const consoleEpoch = 1000 - (options.quiet ?? 439);
  utimesSync(console, consoleEpoch, consoleEpoch);
  writeFileSync(join(fixture, "logs/decisions.jsonl"), JSON.stringify({
    ts: new Date((1000 - (options.noDecision ?? 439)) * 1000).toISOString(),
  }) + "\n");
  const result = await runStallFixture(join(fixture, "ops/stall-check.sh"),
    { ...process.env, PATH: `${fixture}/bin:${process.env.PATH}` });
  return result.stdout;
}

describe("stall check between completed runs", () => {
  it("accepts the 7X58 F24 finalized console while its report runs at 439 seconds", async () => {
    expect(await check()).toBe("OK (between runs)\n");
    expect(await check({ console: finalized.replace("defeat", "victory") })).toBe("OK (between runs)\n");
  });
  it("still flags a finalized run with no report process", async () => {
    expect(await check({ report: false })).toMatch(/^STALL: .*console silent 439s/);
  });
  it("does not let an unrelated report hide a quiet active or unfinished run", async () => {
    expect(await check({ play: true })).toMatch(/^STALL: .*console silent 439s/);
    expect(await check({ console: "COMBAT waiting" })).toMatch(/^STALL: .*console silent 439s/);
    expect(await check({ console: "stopped: model unavailable" })).toMatch(/^STALL: .*console silent 439s/);
  });
  it("keeps the stale-decision bound for a report that does not finish", async () => {
    expect(await check({ quiet: 901, noDecision: 901 })).toMatch(/^STALL: .*no decision for 901s/);
    expect(await check({ noDecision: 900 })).toBe("OK (between runs)\n");
  });
  it("keeps stuck-loop and repeated unreachable alerts during report overlap", async () => {
    expect(await check({ console: `${finalized}\nstuck for 25 polls` })).toMatch(/^STALL: .*console reports stuck/);
    const failed = "cannot reach the STS2-Agent mod: request timed out";
    expect(await check({ console: `${finalized}\n${failed}\n${failed}` })).toMatch(/^STALL: .*console reports unreachable/);
  });
  it("preserves the existing brain and simulation wait guards", async () => {
    expect(await check({ quiet: 901, noDecision: 901, brain: true })).toBe("OK (fixed brain wait)\n");
    expect(await check({ quiet: 901, noDecision: 901, sim: true })).toBe("OK (fixed sim wait)\n");
  });
});
