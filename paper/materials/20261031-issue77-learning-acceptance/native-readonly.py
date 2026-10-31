"""Inspect original six batches without apply, terminal control or scheduler writes."""
import datetime
import hashlib
import json
from pathlib import Path
import sys

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO / "ops"))
from own_learning_slot import batch_status, process_birth
from learner_tui import recover_completed

root = Path("/home/dw/Projects/agent-sts2")
directory = root / "ops/codex-ops"
state = json.loads((directory / "learn.json").read_bytes())
batches = ["20261031-172959-strategy-proposal", "20261031-173043-strategy-proposal",
           "20261031-173045-strategy-proposal", "20261031-173359-strategy-proposal",
           "20261031-173624-strategy-proposal"]
fix = "20261031-171303-fix-batch"
original = {b: state["batches"][b] for b in batches + [fix]}
paths = [directory / "learner" / ("learner-" + b + ".tui.json") for b in original]
paths += [directory / "learner" / (b + ".out") for b in original]
hashes = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in paths}
results = [batch_status(b, original[b], directory, lambda p: process_birth(p) is not None) for b in batches]
receipt = directory / "learner" / ("learner-" + fix + ".tui.json")
preflight = recover_completed(root, directory, fix, hashes[str(receipt)], apply=False)
after = json.loads((directory / "learn.json").read_bytes())
assert all(after["batches"][b] == row for b, row in original.items())
assert all(hashlib.sha256(Path(p).read_bytes()).hexdigest() == value for p, value in hashes.items())
out = dict(at=datetime.datetime.now(datetime.timezone.utc).isoformat(), read_only=True,
           production_batch_rows_unchanged=True, original_receipt_output_hashes_unchanged=True,
           batches=results, fix_recovery=preflight, source_hashes=hashes)
(Path(__file__).parent / "native-readonly.json").write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(dict(content_pending_released=sum(not row["occupies"] for row in results),
                     fix_preflight=preflight["state"], production_unchanged=True)))
