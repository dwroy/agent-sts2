import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// N1ZEBMHZM4KC / 20261012-075824: merge blocked before learning; floor/turn do not apply.
const blocked = {
  task: "experience-update", status: "blocked", commit: null, merged: null,
  added: 0, updated: 0, retired: 0, mechanisms: [], code_proposals: [], implementation_domains: [],
  ledger: { added: [], proposed: [], retired: [] },
};

function finish(report: object, rc = 0) {
  const script = `
import importlib.util, json, subprocess, sys
from unittest.mock import patch, Mock
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec); spec.loader.exec_module(mod)
    return mod
checks = load("checks", "../ops/learner_checks.py")
dispatch = load("dispatch", "../ops/proposal_dispatch.py")
report, rc = json.loads(sys.argv[1])
batch = {"task": "experience-update", "character": "silent", "runs": ["N1ZEBMHZM4KC"],
         "proposal_policy": "Roy-2026-10-07-learning", "retry_at": 123, "attempts": 1}
events, notices, reads = [], [], []
lib = Mock()
lib.QUEUE = "queue.jsonl"
lib.fold.return_value = {}
lib.report_links.return_value = []
lib.audit_experience.return_value = ["fixed lesson missing proposal link"]
def run(argv, **kwargs):
    reads.append(argv)
    return subprocess.CompletedProcess(argv, 0, '{"entries": []}')
with patch.object(checks, "read_report", return_value=report), \\
     patch.object(checks, "proposal_tools", return_value=dispatch), \\
     patch.object(dispatch, "library", return_value=lib), \\
     patch.object(dispatch.subprocess, "run", side_effect=run):
    checks.finish_write_batch("fixed", batch, rc, "/fixture", "/reports",
                              lambda kind, message: events.append(kind), notices.append, run_checks=False)
print(json.dumps({"batch": batch, "notices": notices, "events": events,
                  "source_audits": lib.audit_experience.call_count, "reads": reads}))
`;
  const result = spawnSync("python3", ["-B", "-c", script, JSON.stringify([report, rc])], {
    encoding: "utf8", timeout: 5000,
  });
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

describe("blocked experience proposal repair", () => {
  it.each([0, 1, 3])("keeps an empty blocked attempt failed without scheduling proposal repair (exit %s)", (rc) => {
    const result = finish(blocked, rc);
    expect(result.batch).toMatchObject({ state: "failed", rc, merged: null, report: blocked,
      proposal_audit_errors: [], retry_at: 123, attempts: 1, runs: ["N1ZEBMHZM4KC"] });
    expect(result.batch.proposal_repair_needed).toBeUndefined();
    expect(result.batch.checks_pending).toBeUndefined();
    expect(result.notices).toEqual([]);
    expect(result.events).toEqual(["experience-done"]);
    expect(result.reads).toEqual([]);
  });

  it.each([
    { added: 1 }, { updated: 1 }, { retired: 1 }, { added: false }, { added: undefined },
    { status: "success" }, { commit: undefined }, { commit: "invalid" }, { merged: "a".repeat(40) },
    { code_proposals: ["p"] }, { implementation_domains: ["combat"] }, { mechanisms: ["m"] },
    { ledger: { added: ["silent-0001"], proposed: [], retired: [] } }, { ledger: undefined },
  ])("still rejects missing source when output or an incomplete report is claimed: %j", (change) => {
    const result = finish({ ...blocked, ...change });
    expect(result.batch.proposal_audit_errors).toContain("missing source commit for proposal audit");
    expect(result.batch.proposal_repair_needed).toBe(true);
    expect(result.batch.state).toBe("failed");
  });

  it("audits a real source despite blocked status and zero claimed counts", () => {
    const commit = "b".repeat(40);
    const result = finish({ ...blocked, commit });
    expect(result.source_audits).toBe(1);
    expect(result.reads.map((args: string[]) => args.at(-1))).toEqual([
      `${commit}^:knowledge/characters/silent/experience.json`,
      `${commit}:knowledge/characters/silent/experience.json`,
    ]);
    expect(result.batch.proposal_audit_errors).toEqual(["fixed lesson missing proposal link"]);
    expect(result.batch.proposal_repair_needed).toBe(true);
  });
});
