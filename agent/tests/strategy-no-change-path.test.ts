import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import evidence from "./strategy-no-change-evidence.json";

// Preserved output from batch 20261007-170244; never reads live proposal or knowledge data.
function accept(scenario: string) {
  const script = `
import copy, importlib.util, json, sys, tempfile
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location("dispatch", "../ops/proposal_dispatch.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
with tempfile.TemporaryDirectory(prefix="proposal-path-") as d:
    root=Path(d);tree=root/".worktrees/codex-dev"
    allowed=tree/"learner/runs/20261007-170245-strategy-proposal";allowed.mkdir(parents=True)
    path=allowed/"report.md";path.write_text("固定无源码变更报告。")
    report=json.loads(sys.argv[2]);report["report"]=str(path)
    batch={"task":"strategy-proposal","character":"silent","worktree":str(tree),
           "proposal_ids":[row["id"] for row in report["proposal_results"]]}
    scenario=sys.argv[1];base=report["base"];status=""
    if scenario in ("root","sibling","outside","wrong_suffix","symlink_file","traversal"):
        other={"root":root/"learner/runs/report.md","sibling":root/".worktrees/other/learner/runs/report.md",
               "outside":root/"other/report.md","wrong_suffix":allowed/"report.txt",
               "symlink_file":root/"other/report.md","traversal":tree/"report.md"}[scenario]
        other.parent.mkdir(parents=True,exist_ok=True);other.write_text("固定越界反例")
        report["report"]=str(other)
        if scenario=="symlink_file":
            link=allowed/"escaped.md";link.symlink_to(other);report["report"]=str(link)
        if scenario=="traversal": report["report"]=str(allowed/"../../../report.md")
    if scenario=="symlink_runs":
        import shutil
        shutil.rmtree(tree/"learner/runs");outside=root/"outside";outside.mkdir()
        (outside/"report.md").write_text("固定反例")
        (tree/"learner/runs").symlink_to(outside,target_is_directory=True)
        report["report"]=str(tree/"learner/runs/report.md")
    if scenario=="relative_path": report["report"]="learner/runs/report.md"
    if scenario=="relative_tree": batch["worktree"]=".worktrees/codex-dev"
    if scenario=="missing_tree": batch.pop("worktree")
    if scenario=="tree_outside": batch["worktree"]=str(root)
    if scenario=="missing_file": report["report"]=str(allowed/"missing.md")
    if scenario=="dirty": status=" M fixed.txt"
    if scenario=="wrong_base": base="f"*40
    if scenario=="short_base": report["base"]="c992b530"
    if scenario=="missing_result": report["proposal_results"].pop()
    if scenario=="implemented": report["proposal_results"][0]["state"]="implemented"
    if scenario=="no_reason": report["proposal_results"][0]["reason"]=" "
    if scenario=="nonempty_fixes": report["fixes"]=[{"commit":"f"*40}]
    if scenario=="merged": report["merged"]=base
    if scenario=="wrong_task": batch["task"]="fix-batch"
    if scenario in ("repair","repair_missing_links"):
        batch.pop("proposal_ids");batch["proposal_repair"]="fixed-repair"
        report["proposal_results"]=[]
        if scenario=="repair_missing_links": report["code_proposals"]=[]
    before=copy.deepcopy(batch)
    def git(argv,**kwargs):
        assert argv[:3]==["git","-C",batch["worktree"]]
        return base+"\\n" if argv[3:]==["rev-parse","HEAD"] else status
    with patch.object(mod.subprocess,"check_output",side_effect=git):
        result=mod.no_change(report,batch,str(root))
    print(json.dumps({"accepted":result,"batch_unchanged":batch==before}))
`;
  const result = spawnSync("python3", ["-B", "-c", script, scenario, JSON.stringify(evidence)],
    { encoding: "utf8", timeout: 5000 });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

describe("registered no-change strategy report directory", () => {
  it("accepts the observed 28 dispositions under the batch worktree", () => {
    const result = accept("valid");
    expect(result.accepted).toMatchObject({ base: evidence.base, dispositions: evidence.proposal_results });
    expect(result.batch_unchanged).toBe(true);
  });

  it("accepts a proposal-link repair report under the registered worktree", () => {
    expect(accept("repair").accepted).toMatchObject({ base: evidence.base, dispositions: [] });
  });

  it.each(["root", "sibling", "outside", "wrong_suffix", "symlink_file", "traversal", "symlink_runs",
    "relative_path", "relative_tree", "missing_tree", "tree_outside", "missing_file", "dirty", "wrong_base",
    "short_base", "missing_result", "implemented", "no_reason", "nonempty_fixes", "merged", "wrong_task",
    "repair_missing_links"])("retains the %s rejection", (scenario) => {
    const result = accept(scenario);
    expect(result.accepted).toBeNull();
    expect(result.batch_unchanged).toBe(true);
  });
});
