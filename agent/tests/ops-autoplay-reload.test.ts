import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { ACTIONS, validateRequest } from "../../ops/codex/lib.js";

const scratch = mkdtempSync(join(tmpdir(), "autoplay-reload-test-"));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe("autoplay reload with a continuing play process", () => {
  it.each([
    "same_play_is_transferred_after_new_shell_acknowledges_and_receipt_pins_versions",
    "rejects_foreign_owners_wrong_paths_and_missing_exact_processes",
    "refuses_report_stop_after_and_duplicate_loops_or_play",
    "node_launchers_are_not_independent_play_owners",
    "pidfile_mismatch_and_preflight_failure_leave_old_loop_running",
    "precommit_failures_restore_old_loop_and_preserve_play",
    "a_late_old_exit_keeps_old_owner_and_stages_takeover_with_an_explicit_failure",
    "identity_checks_reject_pid_reuse_before_signalling",
    "a_new_exit_after_retiring_old_explicitly_recovers_the_same_play",
    "old_loop_resumes_even_if_restoring_the_pidfile_fails",
  ])("%s", (name) => {
    const result = spawnSync("python3", ["-B", "tests/autoplay_reload_test.py", `ReloadTests.test_${name}`], {
      encoding: "utf8", timeout: 5000,
    });
    expect(result.status, result.stdout + result.stderr).toBe(0);
    expect(result.stderr).toContain("OK");
  });

  it("allows exactly two explicit PIDs through the broker", () => {
    expect(ACTIONS["autoplay-reload"]).toEqual({ args: 2, ms: 30_000 });
    expect(validateRequest({ action: "autoplay-reload", args: ["10", "20"] }).ok).toBe(true);
    for (const args of [[], ["10"], ["10", "20", "30"], ["1", "20"], ["10", "10"], ["01", "20"], ["10", "0"], ["main", "20"], ["10;kill", "20"]]) {
      expect(validateRequest({ action: "autoplay-reload", args }).ok, JSON.stringify(args)).toBe(false);
    }
  });

  it("forwards the exact PIDs and configured paths through the dedicated action", () => {
    const source = readFileSync("../ops/codex-ops-actions.sh", "utf8");
    const branch = source.split("  autoplay-reload)\n")[1]!.split("  autoplay-stop)\n")[0]!.replace(/;;\s*$/, "");
    const script = `
ROOT=/fixture; OPS=/fixture/ops; LIVE=/fixture/.worktrees/live; DIR=/fixture/ops/codex-ops
exec() { "$@"; }
nice() { [ "$1" = -n ] && [ "$2" = 19 ] || return 5; shift 2; "$@"; }
python3() { printf '%s\\n' "$@"; }
${branch}
`;
    const invoke = (...args: string[]) => spawnSync("bash", ["-c", script, "fixture-action", "autoplay-reload", ...args], {
      encoding: "utf8", timeout: 5000,
    });
    const good = invoke("10", "20");
    expect(good.status, good.stderr).toBe(0);
    expect(good.stdout.trim().split("\n")).toEqual([
      "/fixture/ops/autoplay-reload.py", "/fixture", "/fixture/.worktrees/live", "/fixture/ops/codex-ops", "10", "20",
    ]);
    expect(invoke("10").status).toBe(2);
    expect(invoke("1", "20").status).toBe(2);
    expect(invoke("10", "10").status).toBe(2);
  });

  it("acknowledges WAIT_PID before entering the loop and refuses a missing or ended play PID", () => {
    const source = readFileSync("../ops/autoplay.sh", "utf8");
    const block = source.split("# AUTOPLAY_READY: acknowledge")[1]!.split('CONSOLE="$LOGS/console"')[0]!;
    const prelude = block.slice(block.indexOf("\n") + 1);
    for (const [waitPid, alive, expected] of [["20", true, 0], ["", true, 1], ["20", false, 1]] as const) {
      const ready = join(scratch, `ready-${waitPid}-${alive}`);
      const release = ready + ".release";
      writeFileSync(release, "permitted");
      const result = spawnSync("bash", ["-c", `
AUTOPLAY_READY="$1"; WAIT_PID="$2"; fixture_alive="$3"
AUTOPLAY_RELEASE="$1.release"; AUTOPLAY_ACTIVE="$1.active"; AUTOPLAY_RELOAD_PARENT=99; AUTOPLAY_RELOAD_OLD=0; AUTOPLAY_RELOAD_OLD_START=0
kill() { [ "$fixture_alive" = alive ]; }
${prelude}
`, "fixture-ready", ready, waitPid, alive ? "alive" : "ended"], { encoding: "utf8", timeout: 5000 });
      expect(result.status, result.stderr).toBe(expected);
      if (expected === 0) expect(readFileSync(ready, "utf8").trim()).toMatch(/^[0-9]+$/);
      else expect(() => readFileSync(ready)).toThrow();
    }
  });

  it("keeps the new shell behind its barrier until the permitted old shell has exited", () => {
    const source = readFileSync("../ops/autoplay.sh", "utf8");
    const block = source.split("# AUTOPLAY_READY: acknowledge")[1]!.split('CONSOLE="$LOGS/console"')[0]!;
    const fixture = join(scratch, "barrier");
    mkdirSync(join(fixture, "proc", "10"), { recursive: true });
    const stat = join(fixture, "proc", "10", "stat");
    writeFileSync(stat, `10 (bash) ${["T", ...Array(18).fill("0"), "100"].join(" ")}\n`);
    writeFileSync(join(fixture, "release"), "permitted");
    const prelude = block.slice(block.indexOf("\n") + 1).replaceAll("/proc/", `${fixture}/proc/`);
    const result = spawnSync("bash", ["-c", `
AUTOPLAY_READY="$1/ready"; AUTOPLAY_ACTIVE="$1/active"; AUTOPLAY_RELEASE="$1/release"
AUTOPLAY_RELOAD_PARENT=99; AUTOPLAY_RELOAD_OLD=10; AUTOPLAY_RELOAD_OLD_START=100; WAIT_PID=20
kill() { return 0; }
sleep() {
  [ -f "$fixture_dir/ready" ] && [ ! -f "$fixture_dir/active" ] || exit 8
  printf 'blocked until old exits\\n'
  rm "$fixture_dir/proc/10/stat"
}
fixture_dir="$1"
${prelude}
`, "fixture-barrier", fixture], { encoding: "utf8", timeout: 5000 });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("blocked until old exits\n");
    expect(readFileSync(join(fixture, "active"), "utf8")).toEqual(readFileSync(join(fixture, "ready"), "utf8"));
  });

  it("restores the verified old shell when its broker dies before permitting takeover", () => {
    const source = readFileSync("../ops/autoplay.sh", "utf8");
    const block = source.split("# AUTOPLAY_READY: acknowledge")[1]!.split('CONSOLE="$LOGS/console"')[0]!;
    const fixture = join(scratch, "broker-exit");
    mkdirSync(join(fixture, "proc", "10"), { recursive: true });
    writeFileSync(join(fixture, "proc", "10", "stat"), `10 (bash) ${["T", ...Array(18).fill("0"), "100"].join(" ")}\n`);
    const prelude = block.slice(block.indexOf("\n") + 1).replaceAll("/proc/", `${fixture}/proc/`);
    const result = spawnSync("bash", ["-c", `
AUTOPLAY_READY="$1/ready"; AUTOPLAY_ACTIVE="$1/active"; AUTOPLAY_RELEASE="$1/release"
AUTOPLAY_RELOAD_PARENT=99; AUTOPLAY_RELOAD_OLD=10; AUTOPLAY_RELOAD_OLD_START=100; WAIT_PID=20
fixture_dir="$1"
kill() {
  if [ "$1" = -CONT ]; then printf '%s' "$2" > "$fixture_dir/restored"; return 0; fi
  [ "$2" != 99 ]
}
${prelude}
`, "fixture-broker-exit", fixture], { encoding: "utf8", timeout: 5000 });
    expect(result.status, result.stderr).toBe(1);
    expect(readFileSync(join(fixture, "restored"), "utf8")).toBe("10");
    expect(() => readFileSync(join(fixture, "active"))).toThrow();
  });
});
