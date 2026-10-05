import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { characterBuiltins, loadTask, renderTask } from "../../learner/lib/task.js";
import { validateRequest } from "../../ops/codex/lib.js";

describe("strategy learning dispatch", () => {
  it("dispatches ten postmortems and an ascension change once, retaining a busy shared worktree trigger", () => {
    const script = `
import importlib.util,json
from unittest.mock import patch
from types import SimpleNamespace
s=importlib.util.spec_from_file_location("jobs","../ops/learner_jobs.py")
m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
state={"batches":{},"ascension":{"silent":2}};calls=[]
def start(argv,**kw): calls.append(argv);return SimpleNamespace(pid=123)
def check(stamp): return m.strategy_job(state,"/fixture","/scripts","silent",lambda pid:True,stamp)
with patch.object(m,"available",return_value=True),patch.object(m.subprocess,"Popen",side_effect=start):
 initial=check("initial")
 for i in range(10): state["batches"][str(i)]={"task":"postmortem","character":"silent","state":"done","runs":[f"SILENT{i:06}"]}
 state["batches"]["other"]={"character":"ironclad","state":"done","runs":["IRON00000001"]}
 state["batches"]["fix"]={"task":"fix-batch","state":"running","pid":99}
 blocked=check("blocked")
 state["batches"]["fix"]["state"]="done"
 first=check("ten");duplicate=check("duplicate")
 batch=state["batches"][first[0]];batch.update(state="done")
 consumed=check("consumed")
 state["ascension"]["silent"]=3
 advanced=check("advanced")
 assert m.busy(state,"fix-batch",lambda pid:True)
print(json.dumps(dict(initial=initial,blocked=blocked,first=first,duplicate=duplicate,consumed=consumed,advanced=advanced,calls=calls)))
`;
    const result = spawnSync("python3", ["-B", "-c", script], { encoding: "utf8", timeout: 5000 });
    expect(result.status, result.stderr).toBe(0);
    const data = JSON.parse(result.stdout);
    for (const field of ["initial", "blocked", "duplicate", "consumed"]) expect(data[field]).toBeNull();
    expect(data.first[0]).toBe("ten-strategy-proposal");
    expect(data.advanced[0]).toBe("advanced-strategy-proposal");
    expect(data.calls).toHaveLength(2);
    expect(data.calls[0].slice(-2)).toEqual(["strategy-proposal", "/fixture/.worktrees/codex-dev"]);
    expect(data.calls[0][3].split(",")).toHaveLength(10);
  });

  it("renders a character-isolated evidence task at high effort with the live release protocol", () => {
    const spec = loadTask("strategy-proposal", "../learner/tasks");
    const task = renderTask(spec, { runs: "SILENT000001" }, {
      cwd: "/fixture/wt", worktree: "/fixture/wt", project_root: "/fixture", logs_dir: "/fixture/logs",
      scratch: "/fixture/scratch", task: "strategy-proposal", ...characterBuiltins("silent"),
    });
    expect(spec.efforts.codex).toBe("high");
    expect(task.values.merge).toBe("live");
    for (const text of ["knowledge/characters/silent", "账本 id", "flock /fixture/ops/live-merge.lock", "保留刷新数据", "eval/versions.json", "不删选项", "游戏知识只能从对局里学"]) expect(task.prompt).toContain(text);
    expect(task.prompt).not.toMatch(/\{\{|characters\/ironclad/);
    expect(validateRequest({ action: "strategy-proposal", args: ["SILENT000001"] }).ok).toBe(true);
  });
});
