"""Read-only candidate seal probe. Never persist a seal, invoke tick, finish or close a tab."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--root", type=Path, required=True)
parser.add_argument("--candidate", type=Path, required=True)
args = parser.parse_args()
root, candidate = args.root.resolve(), args.candidate.resolve()
sys.path.insert(0, str(candidate / "ops"))
import learner_tabs as tabs
import learner_tui as tui

# Model deployment of both exact candidate leaves. No verifier is stubbed out.
tabs.native_verifier = lambda _: tui.verify_native
directory = root / "ops/codex-ops"
samples = json.loads((candidate / "ops/tests/fixtures/issue63-seal-failures.json").read_bytes())["samples"]
results = []
for sample in samples:
    batch = sample["batch"]
    worker = tabs.LearnerTabs(root, directory, dry=True)
    row, host = worker.current(batch)
    path = worker.receipt_path(batch, ".tui.json", row)
    if tabs.sha(path) != sample["source_receipt_sha256"]:
        raise ValueError("original receipt changed; retain and inspect")
    receipt = tabs.load(path)
    tracked = [worker.state, worker.host, path]
    before = {str(p): tabs.sha(p) for p in tracked}
    proof = worker.seal_proof(batch, row, host, receipt["wrapper"]["supervisor"]["birth"])
    results.append(dict(batch=batch, read_only=True, apply=False, seal_written=False, close_attempted=False,
                        current_state=row["state"], rc=row["rc"], artifact_count=len(proof["files"]),
                        native_pid_absent=tabs.birth(receipt["pid"]) is None,
                        supervisor_pid_absent=tabs.birth(row["pid"]) is None,
                        terminal_identity_and_empty_input="passed", candidate_seal_proof="passed",
                        state_host_and_tui_unchanged=before == {str(p): tabs.sha(p) for p in tracked}))
print(json.dumps(results, indent=2))
