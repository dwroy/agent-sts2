import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { expect, it } from "vitest";

it("fake herdr releases an exited unreaped pane while preserving live foreground identity", () => {
  const dir = mkdtempSync(join(tmpdir(), "fake-herdr-process-"));
  try {
    const script = `
import json, os, subprocess, sys

fake, directory = sys.argv[1:]
pane = "w1:p1"
state_path = os.path.join(directory, "state.json")
env = dict(os.environ, FAKE_HERDR_DIR=directory)

def invoke(*args):
    return subprocess.run([sys.executable, fake, *args], env=env, capture_output=True, text=True, check=True)

def foreground(pid):
    with open(state_path, "w") as handle:
        json.dump({"n": 1, "workspaces": {"w1": {"label": "test"}}, "agents": {},
                   "panes": {pane: {"ws": "w1", "tab": "w1:t1", "cwd": directory,
                                    "pid": pid, "log": os.path.join(directory, "pane.log")}}}, handle)
    return json.loads(invoke("pane", "process-info", "--pane", pane).stdout)["result"]["process_info"]

live = foreground(os.getpid())
missing = foreground(2147483647)
child = os.fork()
if child == 0:
    os.setsid()
    os._exit(0)
try:
    # Wait for exit without reaping: no sleep or scheduler timing determines the state.
    os.waitid(os.P_PID, child, os.WEXITED | os.WNOWAIT)
    exited = foreground(child)
    closed = invoke("pane", "close", pane)
    with open(state_path) as handle:
        remaining = json.load(handle)["panes"]
    print(json.dumps({"parent": os.getpid(), "live": live, "missing": missing,
                      "exited": exited, "close_status": closed.returncode, "remaining": remaining}))
finally:
    os.waitpid(child, 0)
`;
    const result = spawnSync("python3", ["-c", script, resolve("tests/fixtures-herdr/fake-herdr.py"), dir], {
      encoding: "utf8",
      timeout: 10_000,
    });
    expect(result.status, result.stderr).toBe(0);
    const probe = JSON.parse(result.stdout);
    expect(probe.live.foreground_process_group_id).toBe(probe.parent);
    expect(probe.live.foreground_process_group_id).not.toBe(probe.live.shell_pid);
    expect(probe.missing.foreground_process_group_id).toBe(probe.missing.shell_pid);
    expect(probe.exited.foreground_process_group_id).toBe(probe.exited.shell_pid);
    expect(probe.close_status).toBe(0);
    expect(probe.remaining).toEqual({});
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
