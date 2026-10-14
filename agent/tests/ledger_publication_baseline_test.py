"""Fixed physical/Git ledger divergence; no production ledger or game data is read."""
import importlib.util
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("publication_ledger", ROOT / "learner/ledger.py")
ledger = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ledger)

ADD = {"op": "add", "id": "silent-0094", "ts": "2026-10-09T00:00:00+08:00",
       "by": "learner:test", "character": "silent", "asc": 10, "kind": "bug-infra",
       "claim": "固定发布一致性夹具", "first_run": "SILENT000001", "prior": "unknown",
       "evidence": [{"run": "SILENT000001", "floor": 3, "turn": 1}], "status": "observed"}
PROPOSED = {"op": "update", "id": "silent-0094", "ts": "2026-10-10T19:57:57+08:00",
            "by": "learner:experience-update", "status": "proposed"}
SHIPPED = {"op": "update", "id": "silent-0094", "ts": "2026-10-11T01:00:00+08:00",
           "by": "ops", "status": "shipped", "version": "S1.fixed"}


def write_rows(path, rows):
    path.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows))


class PublicationBaselineTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.path = self.root / "paper/materials/learning/ledger.jsonl"
        self.path.parent.mkdir(parents=True)
        self.canonical = [ADD, PROPOSED, SHIPPED]
        write_rows(self.path, self.canonical)
        for args in (("init", "-q"), ("add", "paper"), ("commit", "-qm", "Fixed ledger baseline")):
            subprocess.run(["git", "-C", str(self.root), *args], check=True, capture_output=True)
        for target, value in (("REPO", str(self.root)), ("load_runs", {"SILENT000001": {"character": "SILENT", "ascension": 10}}),
                              ("load_versions", {"S1.fixed"}), ("now_local", "2026-10-15T06:00:00+08:00")):
            p = patch.object(ledger, target, return_value=value) if target != "REPO" else patch.object(ledger, target, value)
            p.start()
            self.addCleanup(p.stop)

    def update(self, **fields):
        return {"id": "silent-0094", "by": "learner:fix-batch", **fields}

    def test_stale_proposed_prefix_cannot_demote_committed_shipping(self):
        write_rows(self.path, [ADD, PROPOSED])
        original = self.path.read_bytes()
        # Even an earlier valid trace in the same batch must not leak out on rejection.
        with self.assertRaisesRegex(ledger.LedgerError, "silent-0094.*status divergence"):
            ledger.append("update", [self.update(note="本批追溯"), self.update(status="proposed")], str(self.path))
        self.assertEqual(self.path.read_bytes(), original)
        self.assertEqual(ledger.committed_status_snapshot(str(self.path))[1]["silent-0094"]["status"], "shipped")
        # Trace-only rows remain possible and do not invent a new release or reconcile old bytes.
        ledger.append("update", [self.update(note="已发现分歧，保留原件供运维核对")], str(self.path))
        self.assertTrue(self.path.read_bytes().startswith(original))
        self.assertNotIn("status", ledger.read_rows(str(self.path))[-1][1])

    def test_same_status_with_different_shipping_time_still_requires_review(self):
        write_rows(self.path, [ADD, PROPOSED, {**SHIPPED, "ts": "2026-10-12T01:00:00+08:00"}])
        original = self.path.read_bytes()
        with self.assertRaisesRegex(ledger.LedgerError, "status divergence"):
            ledger.append("update", [self.update(status="shipped", version="S1.fixed")], str(self.path))
        self.assertEqual(self.path.read_bytes(), original)

    def test_consistent_prefix_keeps_existing_lifecycle_and_batch_order(self):
        original = self.path.read_bytes()
        ledger.append("update", [self.update(status="proposed", note="新的学习产物"),
                                 self.update(status="accepted")], str(self.path))
        item = ledger.fold(ledger.read_rows(str(self.path)))["silent-0094"]
        self.assertEqual(item["status"], "accepted")
        self.assertEqual(item["shipped_at"], SHIPPED["ts"])
        self.assertEqual(item["version"], SHIPPED["version"])
        self.assertTrue(self.path.read_bytes().startswith(original))
        # A later writer may continue the valid append-only suffix before Git catches up.
        ledger.append("update", [self.update(status="retired")], str(self.path))
        self.assertEqual(ledger.fold(ledger.read_rows(str(self.path)))["silent-0094"]["status"], "retired")

    def test_other_items_and_custom_ledgers_are_not_blocked_by_one_drift(self):
        other = {**ADD, "id": "ironclad-0001", "character": "ironclad"}
        write_rows(self.path, [ADD, PROPOSED, other])
        ledger.append("update", [{"id": "ironclad-0001", "by": "learner:test", "status": "proposed"}], str(self.path))
        self.assertEqual(ledger.fold(ledger.read_rows(str(self.path)))["silent-0094"]["status"], "proposed")
        fixture = self.root / "custom.jsonl"
        write_rows(fixture, [ADD, PROPOSED])
        ledger.append("update", [self.update(status="accepted")], str(fixture))
        self.assertEqual(ledger.fold(ledger.read_rows(str(fixture)))["silent-0094"]["status"], "accepted")

    def test_head_change_or_unreadable_baseline_writes_nothing(self):
        original = self.path.read_bytes()
        real_git = ledger.ledger_git
        reads = 0

        def changing_head(*args):
            nonlocal reads
            result = real_git(*args)
            if args[0] == "rev-parse":
                reads += 1
                if reads == 2:
                    return "f" * 40
            return result

        with patch.object(ledger, "ledger_git", side_effect=changing_head):
            with self.assertRaisesRegex(ledger.LedgerError, "baseline changed"):
                ledger.append("update", [self.update(status="proposed")], str(self.path))
        self.assertEqual(self.path.read_bytes(), original)
        with patch.object(ledger.subprocess, "run", side_effect=OSError("fixed failure")):
            with self.assertRaisesRegex(ledger.LedgerError, "cannot verify"):
                ledger.append("update", [self.update(status="proposed")], str(self.path))
        self.assertEqual(self.path.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
