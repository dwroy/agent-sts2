import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const tmp = mkdtempSync(join(tmpdir(), "autoplay-console-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

function paneFixture(name: string, busy: boolean, launch = "wJ:pAB 12345", rc = 0) {
  const root = join(tmp, name);
  const ops = join(root, "ops");
  mkdirSync(ops, { recursive: true });
  for (const file of ["autoplay-pane.sh", "paths.sh"]) copyFileSync(join(repo, "ops", file), join(ops, file));
  writeFileSync(join(root, "status.json"), JSON.stringify([
    { label: "autoplay", pane_id: "wJ:p2", alive: true, busy },
    { label: "ops", pane_id: "wJ:p5", alive: true, busy: true },
  ]));
  writeFileSync(join(root, "launch.txt"), launch);
  writeFileSync(join(ops, "herdr-host.sh"), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$CODEX_OPS_ROOT/calls.txt"
case "$1" in
  run) cat "$CODEX_OPS_ROOT/launch.txt"; exit ${rc} ;;
  status) cat "$CODEX_OPS_ROOT/status.json" ;;
  close) echo closed ;;
esac
`);
  const result = spawnSync("bash", [join(ops, "autoplay-pane.sh")], {
    env: { ...process.env, CODEX_OPS_ROOT: root, CODEX_OPS_DIR: join(ops, "codex-ops"), HERDR_BIN: "/usr/bin/false" },
    encoding: "utf8", timeout: 10_000,
  });
  return { result, calls: readFileSync(join(root, "calls.txt"), "utf8") };
}

describe("autoplay's log pane", () => {
  it("reads the existing log pane using the host binary fallback without starting or closing jobs", () => {
    const root = join(tmp, "read");
    const ops = join(root, "ops");
    const dir = join(ops, "codex-ops");
    const home = join(root, "home");
    mkdirSync(dir, { recursive: true });
    mkdirSync(join(home, ".local/bin"), { recursive: true });
    for (const file of ["autoplay-pane.sh", "paths.sh"]) copyFileSync(join(repo, "ops", file), join(ops, file));
    writeFileSync(join(dir, "herdr.json"), JSON.stringify({ panes: { "autoplay-log": { pane_id: "wJ:pAB" } } }));
    const binary = join(home, ".local/bin/herdr");
    writeFileSync(binary, `#!/bin/bash
[ "$*" = 'pane read wJ:pAB --source recent-unwrapped --lines 200' ] || exit 2
printf 'live console decision\\n'
`);
    chmodSync(binary, 0o755);
    const env = { ...process.env, HOME: home, PATH: "/usr/bin:/bin", CODEX_OPS_ROOT: root, CODEX_OPS_DIR: dir };
    delete env.HERDR_BIN;
    const result = spawnSync("bash", [join(ops, "autoplay-pane.sh"), "--read"], { env, encoding: "utf8", timeout: 10_000 });
    expect(result.status, result.stderr).toBe(0);
    expect(readFileSync(join(dir, "autoplay-log-view.txt"), "utf8")).toBe("live console decision\n");
    expect(readFileSync(join(dir, "autoplay-log-view.err"), "utf8")).toBe("");
  });

  it("accepts opaque pane IDs and closes only the old idle autoplay tab after launch", () => {
    const { result, calls } = paneFixture("idle", false);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim()).toBe("wJ:pAB 12345");
    expect(calls).toContain("run autoplay-log --pidfile");
    expect(calls).toContain("autoplay.sh --tail-console");
    expect(calls).toContain("close autoplay --pane wJ:p2");
    expect(calls).not.toContain("close ops");
  });

  it("preserves an occupied old tab", () => {
    const { result, calls } = paneFixture("busy", true);
    expect(result.status, result.stderr).toBe(0);
    expect(calls).not.toContain("close ");
  });

  it.each([["failed", "wJ:pAB 12345", 4], ["ambiguous", "unexpected reply", 0]])(
    "keeps old tabs and reports a %s launch without falling back to another loop",
    (name, launch, rc) => {
      const { result, calls } = paneFixture(name as string, false, launch as string, rc as number);
      expect(result.status).not.toBe(0);
      expect(calls).not.toContain("close ");
    },
  );

  it("tails existing history, new lines, and the next run; stops its viewer on exit", () => {
    const root = join(tmp, "tail");
    const ops = join(root, "ops");
    const logs = join(root, "logs");
    mkdirSync(ops, { recursive: true });
    mkdirSync(join(logs, "console"), { recursive: true });
    const script = `
set -eu
OPS="$1"; LOGS="$2"
. "$3"
printf 'old loop history\\n' > "$OPS/autoplay.log"
printf 'first run history\\n' > "$LOGS/console/first.log"
ln -s first.log "$LOGS/console/current"
start_console_tail
printf '%s' "$autoplay_console_pid" > "$OPS/viewer.pid"
printf 'new decision\\n' >> "$LOGS/console/first.log"
sleep 1.2
printf 'next run decision\\n' > "$LOGS/console/next.log"
ln -s next.log "$LOGS/console/.next"
mv -Tf "$LOGS/console/.next" "$LOGS/console/current"
sleep 2.2
exit 75
`;
    const result = spawnSync("bash", ["-c", script, "tail-test", ops, logs, join(repo, "ops/autoplay-console.sh")], {
      encoding: "utf8", timeout: 10_000,
    });
    expect(result.status, result.stderr).toBe(75);
    expect(result.stdout).toContain("old loop history");
    expect(result.stdout).toContain("first run history");
    expect(result.stdout).toContain("new decision");
    expect(result.stdout).toContain("next run decision");
    const pid = readFileSync(join(ops, "viewer.pid"), "utf8");
    expect(spawnSync("bash", ["-c", 'kill -0 "$1" 2>/dev/null', "check", pid]).status).not.toBe(0);
  });

  it("keeps following writes when the current alias first appears as an empty file", () => {
    const root = join(tmp, "late-empty");
    const ops = join(root, "ops");
    const logs = join(root, "logs");
    mkdirSync(ops, { recursive: true });
    mkdirSync(join(logs, "console"), { recursive: true });
    const result = spawnSync("bash", ["-c", `
set -eu
OPS="$1"; LOGS="$2"
. "$3"
start_console_tail
sleep 0.2
touch "$LOGS/console/run.log"
ln -s run.log "$LOGS/console/current"
sleep 1.2
printf 'decision after initially empty alias\\n' >> "$LOGS/console/run.log"
sleep 1.2
`, "late-empty", ops, logs, join(repo, "ops/autoplay-console.sh")], { encoding: "utf8", timeout: 10_000 });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("decision after initially empty alias");
  });
});
