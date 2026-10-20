import { writeFileSync } from "node:fs";
import { join } from "node:path";

/** Seed the fake protocol state; workspace migration still runs the real host script. */
export function duplicateWorkspaceFixture(world: { dir: string; fake: string }, busyPid: number) {
  const cwd = join(world.dir, "proj");
  const oldPane = "w1:p1";
  const busyPane = "w1:p2";
  const opsPane = "w2:p3";
  const pane = (ws: string, n: number, label: string, pid: number | null) => ({
    ws, tab: `${ws}:t${n}`, cwd, label, pid, log: join(world.fake, `pane${n}.log`),
  });
  writeFileSync(join(world.fake, "state.json"), JSON.stringify({
    n: 3,
    workspaces: { w1: { label: "sts2-test" }, w2: { label: "sts2-test" } },
    panes: {
      [oldPane]: pane("w1", 1, "learner-next", null),
      [busyPane]: pane("w1", 2, "learner-active", busyPid),
      [opsPane]: pane("w2", 3, "ops", null),
    },
    agents: {},
  }));
  writeFileSync(join(cwd, "ops", "codex-ops", "herdr.json"), JSON.stringify({
    workspace_id: "w1", workspace_label: "sts2-test",
    panes: {
      "learner-next": { pane_id: oldPane },
      "learner-active": { pane_id: busyPane },
      ops: { pane_id: opsPane },
    },
  }));
  return { oldPane, busyPane, opsPane };
}
