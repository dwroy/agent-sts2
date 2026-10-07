import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import secondEvidence from "./ascension-audit-second-evidence.json";

// All files and leases belong to temporary fixed fixtures, never the real scheduler.
function finish(scenario: string) {
  const script = `
import copy, importlib.util, json, sys, tempfile
from pathlib import Path
spec=importlib.util.spec_from_file_location("audit", "../ops/ascension_audit.py")
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
scenario=sys.argv[1]
with tempfile.TemporaryDirectory(prefix="audit-path-") as d:
    root=Path(d);tree=root/".worktrees/ascension-audit-silent-a10-1"
    allowed=tree/"learner/runs/fixed";allowed.mkdir(parents=True)
    path=allowed/"report.md";path.write_text("固定审计报告，未知项保留。")
    batch={"task":"ascension-audit","audit_key":"silent:A10","character":"silent","state":"running","runs":["MGA0CZDDKC0P"],"worktree":str(tree)}
    request={"batch":"fixed","level":10,"attempts":1,"state":"running","worktree":str(tree)}
    state={"batches":{"fixed":batch},"ascension_audits":{"silent:A10":request}}
    report={"task":"ascension-audit","character":"silent","level":10,"complete":True,"runs":batch["runs"],"code_proposals":[],
            "coverage":["floors","combat_counts","healing","campfires","rules","assumptions"],"report":str(path)}
    if scenario=="second_original":
        report=json.loads(sys.argv[2])
        original=Path(report["report"]);parts=original.parts
        path=root.joinpath(*parts[parts.index(".worktrees"):]);path.parent.mkdir(parents=True)
        path.write_text("固定第二次审计报告，未验证项保留。")
        tree=root/".worktrees/ascension-audit-silent-a10-2"
        report["report"]=str(path)
        batch.update(worktree=str(tree),runs=report["runs"])
        request["worktree"]=str(tree)
    check=lambda r,b:[];rc=0
    if scenario in ("root", "sibling", "outside", "wrong_suffix", "symlink_file", "traversal"):
        other={"root":root/"learner/runs/report.md","sibling":root/".worktrees/other/learner/runs/report.md",
               "outside":root/"unrelated/report.md","wrong_suffix":allowed/"report.txt","symlink_file":root/"unrelated/report.md",
               "traversal":tree/"report.md"}[scenario]
        other.parent.mkdir(parents=True,exist_ok=True);other.write_text("固定越界反例")
        report["report"]=str(other)
        if scenario=="symlink_file":
            link=allowed/"escaped.md";link.symlink_to(other);report["report"]=str(link)
        if scenario=="traversal": report["report"]=str(allowed/"../../../report.md")
    if scenario=="symlink_runs":
        import shutil
        shutil.rmtree(tree/"learner/runs")
        outside=root/"outside";outside.mkdir();(outside/"report.md").write_text("固定反例")
        (tree/"learner/runs").symlink_to(outside,target_is_directory=True)
        report["report"]=str(tree/"learner/runs/report.md")
    if scenario=="missing_file": report["report"]=str(allowed/"missing.md")
    if scenario=="missing_tree": batch.pop("worktree")
    if scenario=="outside_tree": batch["worktree"]=request["worktree"]=str(root)
    if scenario=="wrong_registered_tree": request["worktree"]=str(root/".worktrees/other")
    if scenario=="relative_tree": batch["worktree"]=".worktrees/ascension-audit-silent-a10-1"
    if scenario=="coverage": report["coverage"]=["floors"]
    if scenario=="foreign_run": report["runs"]=["OTHER0000001"]
    if scenario=="proposal": check=lambda r,b:["missing code proposal"]
    if scenario=="learner_exit": rc=1
    if scenario=="late": request["batch"]="newer"
    before=copy.deepcopy(request);out=root/"out";out.mkdir()
    (out/"fixed.out").write_text("\x60\x60\x60json\\n"+json.dumps(report)+"\\n\x60\x60\x60\\n")
    events=[];mod.finish(state,"fixed",rc,str(root),str(out),lambda k,t:events.append(k),lambda t:None,proposal_check=check)
    print(json.dumps({"batch":batch,"request":request,"before":before,"events":events}))
`;
  const result = spawnSync("python3", ["-B", "-c", script, scenario, JSON.stringify(secondEvidence)], { encoding: "utf8", timeout: 5000 });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

describe("registered ascension audit report directory", () => {
  it("accepts the preserved report in this batch's registered independent worktree", () => {
    const result = finish("valid");
    expect(result.batch.state).toBe("done");
    expect(result.request).toMatchObject({ state: "done", report_sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });

  it("accepts the preserved second audit output from batch 20261007-171303", () => {
    const result = finish("second_original");
    expect(result.batch.state).toBe("done");
    expect(result.batch.report.runs).toEqual(secondEvidence.runs);
    expect(result.batch.report.code_proposals).toEqual(secondEvidence.code_proposals);
    expect(result.request).toMatchObject({ state: "done", report_sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });

  it.each(["root", "sibling", "outside", "wrong_suffix", "symlink_file", "traversal", "symlink_runs",
    "missing_file", "missing_tree", "outside_tree", "wrong_registered_tree", "relative_tree"])("rejects the %s report directory", (scenario) => {
    const result = finish(scenario);
    expect(result.batch.state).toBe("failed");
    expect(result.batch.errors).toContain("missing preserved report inside learner/runs");
    expect(result.request.report_sha256).toBeUndefined();
  });

  it.each(["coverage", "foreign_run", "proposal", "learner_exit"])("retains the %s completion guard", (scenario) => {
    expect(finish(scenario).batch.state).toBe("failed");
  });

  it("preserves the newer retry lease when an old batch finishes late", () => {
    const result = finish("late");
    expect(result.batch.state).toBe("late-finish");
    expect(result.request).toEqual(result.before);
  });
});
