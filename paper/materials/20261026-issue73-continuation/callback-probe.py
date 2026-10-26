"""Real completion subprocesses against the admitted isolated original-data backup.

Only the already independently audited source-proof boundary is substituted;
the candidate, artifact bytes, publisher, Git checks, proposal audit, binding,
completion receipt and durable queue projection run their actual code.
"""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "ops"))
import knowledge_runtime
from knowledge_completion_events import enqueue_once

OUT = Path(__file__).resolve().parent
FROZEN = ROOT / ".artifacts/issue73-frozen"
TREE = ROOT / ".artifacts/issue73-callback-tree-final"
RUNTIME = ROOT / ".artifacts/issue73-callback-runtime-last"
STATE = ROOT / ".artifacts/issue73-callback-state-final"
assert not TREE.exists(), "retain old probe; do not overwrite its tree"
TREE.mkdir()


def git(*args):
    return subprocess.check_output(["git", "-C", str(TREE), *args], text=True, stderr=subprocess.PIPE).strip()


git("init")
(TREE / ".gitignore").write_text("learner/runs/\n")
git("add", ".gitignore")
git("commit", "--no-gpg-sign", "-m", "isolated fixed completion fixture")
head = git("rev-parse", "HEAD")
candidate = json.loads((FROZEN / "candidate.json").read_bytes())
path = TREE / "learner/runs/fixed/knowledge-candidate.json"
path.parent.mkdir(parents=True)
path.write_bytes((FROZEN / "candidate.json").read_bytes())
approval = json.loads((FROZEN / "approval.json").read_text())
proof = {"destination_files": approval, "dispositions": []}
batch = {"worktree": str(TREE), "character": candidate["character"], "external_source": "fixed-audited-source",
         "knowledge_attempts": [{"state": "pending", "error": "CalledProcessError"}],
         "knowledge_runtime": {"schema": "knowledge-runtime-selection-v1", "root": str(ROOT), "enabled": True,
                               "directory": str(RUNTIME), "control_sha256": "a" * 64, "source": "explicit"}}
report = {"task": "strategy-proposal", "character": candidate["character"], "knowledge_candidate": str(path),
          "base": head, "commit": None, "merged": None, "implementation_domains": [], "code_proposals": []}
before = json.loads(json.dumps(batch))
notices = []


def enqueue(kind, text, request=None):
    return enqueue_once(STATE, kind, text, request)


for _ in range(2):
    # Lose the entire mutable batch update after the first successful callback.
    batch = json.loads(json.dumps(before))
    with patch("strategy_backfill_jobs.report_proof", return_value=proof):
        knowledge_runtime.complete(candidate["id"], batch, report, 0, str(ROOT), enqueue, notices.append)
    assert batch["state"] == "done", batch
    assert batch["knowledge_attempts"][0] == before["knowledge_attempts"][0]
    assert batch["knowledge_publication"]["candidate"] == candidate["id"]
    assert batch["knowledge_publication"]["publication_candidate"].startswith("continuation:")
    assert len(list((STATE / "queue").glob("*.md"))) == 1
assert not notices, notices
raw = path.read_bytes()
assert hashlib.sha256(raw).hexdigest() == "88dc35cd2a74f4849106153b7ead92109786f2491b9d20dd4470849043a80616"
result = {"isolated": True, "real_python_callback_and_cli": True, "source_proof_boundary": "fixed previously audited artifacts; substituted proof lookup",
          "replayed_after_lost_batch_state": True, "queue_events": 1, "original_error_unchanged": True,
          "original_candidate_raw_sha256": hashlib.sha256(raw).hexdigest(), "receipt": batch["knowledge_publication"], "notices": notices}
(OUT / "callback-readback.json").write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"isolated": True, "batch": batch["state"], "events": 1, "real_callback": True}))
