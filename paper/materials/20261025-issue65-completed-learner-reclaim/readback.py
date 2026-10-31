"""Verify frozen #65 evidence without sealing, terminal calls or production writes."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile

WORKSPACE = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(WORKSPACE / "ops"))
import learner_tabs
import learner_tui


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-root", required=True, type=Path)
    args = parser.parse_args()
    root = args.evidence_root.resolve()
    handoff = root / "paper/materials/20261025-issue65-original-handoff-ops"
    raw = (handoff / "manifest.json").read_bytes()
    assert digest(raw) == "1b233098aba446b79d52d8d1b0dac6a03427116b986f6f0af23228dff1929192"
    manifest = json.loads(raw)
    assert digest((handoff / "handoff.md").read_bytes()) == "155e776cfffb33c614cb6972955002d1cbccc696782312760a678207b03dc3f3"
    for item in manifest["source_documents"]:
        raw = (root / item["path"]).read_bytes()
        assert len(raw) == item["bytes"] and digest(raw) == item["sha256"]
    frozen = {}
    for item in manifest["original_five_artifacts_rechecked"]:
        raw = (root / item["retained_copy"]).read_bytes()
        assert len(raw) == item["bytes"] and digest(raw) == item["sha256"]
        # Tests consume the retained copies; this only verifies originals stayed unchanged.
        assert Path(item["original_path"]).read_bytes() == raw
        frozen[item["kind"]] = raw
    receipt = json.loads(frozen["tui"])
    rows = [json.loads(line) for line in frozen["learner_log"].splitlines()]
    launches = [row for row in rows if row.get("type") == "learner_launch"]
    matches = [row for row in rows if row.get("type") == "learner_tui_session"
               and all(row.get(k) == receipt[k] for k in ("pane", "session", "rollout"))]
    assert len(launches) == 1 and "batch" not in launches[0]["params"]
    batch = manifest["original_batch"]
    row = json.loads((root / ".artifacts/ops-fix134331-20261025/originals/original-batch-row.json").read_bytes())
    assert digest(json.dumps(row, sort_keys=True, separators=(",", ":")).encode()) == manifest["original_business_row_sha256"]
    assert row["state"] == "failed" and row["rc"] == 0
    artifacts = WORKSPACE / ".artifacts/issue65"
    artifacts.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=artifacts) as temporary:
        directory = Path(temporary)
        (directory / "learn.json").write_text(json.dumps(dict(batches={batch: row})))
        binding = learner_tabs.ordinary_fix_binding(root, directory, receipt, launches[0], matches,
                                                  Path(receipt["artifacts"]["log"]))
    learner_tui.verify_native(receipt, source=io.StringIO(frozen["rollout"].decode()))
    print(json.dumps(dict(schema="issue65-frozen-original-readback-v1", batch=batch,
        handoff_manifest_sha256=digest((handoff / "manifest.json").read_bytes()),
        source_documents_verified=len(manifest["source_documents"]), frozen_originals_verified=len(frozen),
        business_row_sha256=manifest["original_business_row_sha256"], business_state="failed", rc=0,
        binding_kind=binding["kind"], original_native_verifier_passed=True,
        production_seal_reclaim_close_calls=0, scope="frozen binding and native stream; full seal only in synthetic fixed tests"), indent=2))


if __name__ == "__main__":
    main()
