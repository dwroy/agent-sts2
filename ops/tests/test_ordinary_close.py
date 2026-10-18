"""Fixed Git/ledger/dataset fixtures; no production logs, credentials, models or games."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "ops"))
import ordinary_close as close
import ops_current


class OrdinaryClose(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.directory = self.root / "ops/codex-ops"
        self.directory.mkdir(parents=True)
        self.git("init", "-q")
        for name in ("learner", "notes", "paper/materials/learning", "paper/data", "agent/src", "knowledge/builders", "eval"):
            (self.root / name).mkdir(parents=True, exist_ok=True)
        shutil.copy(REPO / "learner/ledger.py", self.root / "learner/ledger.py")
        shutil.copy(REPO / "knowledge/builders/characters.py", self.root / "knowledge/builders/characters.py")
        (self.root / ".gitignore").write_text("ops/codex-ops/\nlearner/runs/\n__pycache__/\n*.counter\n")
        (self.root / "agent/src/fixed.ts").write_text("export const fixed = 1;\n")
        (self.root / "notes/lessons.md").write_text("## SILENT000001\n固定证据。\n")
        self.item = {"op": "add", "id": "silent-0001", "ts": "2026-10-18T00:00:00Z", "character": "silent", "kind": "other", "claim": "固定记录测试，不是游戏结论。", "evidence": [{"run": "SILENT000001", "floor": 1}], "first_run": "SILENT000001", "prior": "unknown", "status": "observed", "by": "learner:postmortem", "where": {"lessons": ["SILENT000001"]}}
        (self.root / close.RECORDS[1]).write_text(json.dumps(self.item) + "\n")
        (self.root / close.RECORDS[2]).write_text("")
        (self.root / "eval/versions.json").write_text(json.dumps([{"release_id": "V5-R1", "commit": "f" * 40}]))
        (self.root / "ops/inbox-dev.md").write_text("固定原件\n")
        (self.root / "paper/data/fixed.csv").write_text("before\n")
        (self.root / "ops/paper_dataset.py").write_text("from pathlib import Path\np=Path('dataset.counter');p.write_text(p.read_text()+'1' if p.exists() else '1')\nPath('paper/data/fixed.csv').write_text('after\\n')\n")
        self.git("add", ".")
        self.git("commit", "-qm", "Fixed fixture")
        self.head = self.git("rev-parse", "HEAD")
        self.report_path = self.root / "learner/runs/fixed/report.md"
        self.report_path.parent.mkdir(parents=True)
        self.report_path.write_text("固定完整原报告\n")
        self.batch = {"task": "postmortem", "character": "silent", "state": "done", "rc": 0, "runs": ["SILENT000001"], "missing": [], "ordinary_baseline": close.baseline(self.root, self.directory)}
        self.report = {"task": "postmortem", "appended": ["SILENT000001"], "skipped": [], "bugs": [], "ledger": {"check": 0}, "code_proposals": [], "report": str(self.report_path)}
        self.env = patch.dict(os.environ, {"LEDGER_RUNS": "none", "LEDGER_VERSIONS": "none"})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.events = []

    def git(self, *args, input=None):
        return subprocess.check_output(["git", "-C", str(self.root), *args], input=input, text=True, stderr=subprocess.DEVNULL).strip()

    def offer(self, batch_id="20261018-170000", batch=None, report=None):
        return close.offer(self.root, self.directory, batch_id, batch or self.batch, report or self.report, "learner-done", "原完成事件")

    def process(self):
        close.close_pending(self.root, self.directory, lambda kind, text: self.events.append((kind, text)))

    def receipt(self, batch_id="20261018-170000"):
        return json.loads((self.directory / f"ordinary-close/{batch_id}.json").read_text())

    def test_clean_real_validator_single_dataset_commit_and_no_wake(self):
        (self.root / "unrelated.txt").write_text("并行未提交原件")
        self.assertTrue(self.offer())
        self.process()
        receipt = self.receipt()
        self.assertEqual(receipt["state"], "closed", receipt)
        self.assertEqual(receipt["ledger"], {"problems": 0, "items": 1})
        self.assertFalse(receipt["ops_event_enqueued"])
        self.assertEqual(self.events, [])
        self.assertEqual((self.root / "dataset.counter").read_text(), "1")
        self.assertEqual(self.git("rev-parse", "HEAD"), receipt["records"]["commit"])
        self.assertNotIn("unrelated.txt", self.git("show", "--pretty=", "--name-only", "HEAD"))
        self.assertEqual(self.git("diff", "--cached", "--name-only"), "")
        self.assertTrue(self.offer())
        self.process()
        self.assertEqual((self.root / "dataset.counter").read_text(), "1")

    def test_two_candidates_share_one_dataset(self):
        self.assertTrue(self.offer())
        self.assertTrue(self.offer("20261018-170001"))
        self.process()
        self.assertEqual(self.receipt()["records"]["commit"], self.receipt("20261018-170001")["records"]["commit"])
        self.assertEqual((self.root / "dataset.counter").read_text(), "1")

    def test_original_finish_cli_closes_clean_postmortem_without_enqueue(self):
        batch_id = "20261018-170000"
        batch = {**self.batch, "state": "running"}
        batch.pop("rc")
        ops_current.save(self.directory / "learn.json", {"batches": {batch_id: batch}, "runs": {}})
        (self.directory / "LLM_DRAIN").write_text("fixed fixture: no new dispatch\n")
        out = self.directory / f"learner/{batch_id}.out"
        out.parent.mkdir()
        out.write_text("```json\n" + json.dumps(self.report) + "\n```\n")
        env = {**os.environ, "CODEX_OPS_ROOT": str(self.root), "CODEX_OPS_DIR": str(self.directory), "CODEX_OPS_NO_DRAIN": "1"}
        command = ["python3", "-B", str(REPO / "ops/codex-ops-learn.py"), "finish", "--batch", batch_id, "--rc", "0"]
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual(self.receipt()["state"], "closed")
        self.assertEqual(list((self.directory / "queue").glob("*.md")), [])
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / "dataset.counter").read_text(), "1")

    def test_original_fix_finish_uses_existing_no_change_guard_before_suppressing_event(self):
        from types import SimpleNamespace
        import learner_checks
        live = self.root / ".worktrees/live"
        tree = self.root / ".worktrees/codex-fix-silent-20261018-170000"
        self.git("worktree", "add", "-qb", "live", str(live))
        self.git("worktree", "add", "-qb", "fix", str(tree))
        batch = {**self.batch, "task": "fix-batch", "worktree": str(tree), "state": "running"}
        original = tree / "learner/runs/fixed/report.md"
        original.parent.mkdir(parents=True)
        original.write_text("固定无改动报告")
        report = {"task": "fix-batch", "fixes": [], "merged": None, "base": self.head,
                  "tests": {"tsc": 0, "vitest": 0, "cases": 1}, "report": str(original)}
        out = self.directory / "learner"
        out.mkdir()
        (out / "20261018-170000.out").write_text("```json\n" + json.dumps(report) + "\n```\n")
        tools = SimpleNamespace(links=lambda *a: [], experience_audit=lambda *a: [], no_change=lambda *a: None)
        with patch.object(learner_checks, "proposal_tools", return_value=tools):
            learner_checks.finish_write_batch("20261018-170000", batch, 0, str(self.root), str(out),
                                             lambda *args: self.events.append(args), self.fail, run_checks=False)
        self.assertEqual(batch["state"], "done")
        self.assertIn("no_changes", batch)
        self.assertEqual(self.events, [])
        self.process()
        self.assertEqual(self.receipt()["state"], "closed")

    def test_failure_missing_evidence_and_scientific_boundaries_keep_original_event(self):
        for key, value in (("rc", 1), ("state", "failed"), ("feature_request", "silent-0332"), ("research_request", "h0"), ("implementation_request", "new"), ("checks_pending", True), ("ordinary_baseline", None), ("merged", self.head)):
            batch = {**self.batch, key: value}
            with self.subTest(key=key):
                self.assertFalse(self.offer(batch=batch))
        for key, value in (("bugs", [{"new": True}]), ("disagreements", ["原异议"]), ("skipped", [{"run": "SILENT000001"}]), ("appended", []), ("needs_decision", True), ("ledger", {"check": None})):
            with self.subTest(key=key):
                self.assertFalse(self.offer(report={**self.report, key: value}))

    def test_original_questions_and_new_notice_are_never_hidden(self):
        questions = self.report_path.parent / "questions.json"
        questions.write_text('[{"finding":"异议"}]')
        self.assertFalse(self.offer())
        questions.unlink()
        notice = self.directory / "learning-notices/new.json"
        notice.parent.mkdir()
        notice.write_text("{}")
        self.assertFalse(self.offer())

    def test_changed_source_and_missing_original_report_fail_closed(self):
        (self.root / "agent/src/fixed.ts").write_text("new source")
        self.assertFalse(self.offer())
        self.git("checkout", "--", "agent/src/fixed.ts")
        self.report_path.unlink()
        self.assertFalse(self.offer())

    def test_ledger_missing_run_and_invalid_rows_wake_without_dataset(self):
        for raw in ("", "not-json\n"):
            with self.subTest(raw=raw):
                (self.root / close.RECORDS[1]).write_text(raw)
                self.batch["ordinary_baseline"] = close.baseline(self.root, self.directory)
                self.assertTrue(self.offer())
                self.process()
                self.assertEqual(self.receipt()["state"], "attention")
                self.assertFalse((self.root / "dataset.counter").exists())
                (self.directory / "ordinary-close/20261018-170000.json").unlink()
        self.assertEqual(len(self.events), 2)

    def test_new_notice_after_offer_and_interrupted_close_do_not_retry_dataset(self):
        self.assertTrue(self.offer())
        path = self.directory / "ordinary-close/20261018-170000.json"
        row = self.receipt()
        row["state"] = "running"
        ops_current.save(path, row)
        self.process()
        self.assertEqual(self.receipt()["state"], "attention")
        self.process()
        self.assertEqual(len(self.events), 1)
        self.assertFalse((self.root / "dataset.counter").exists())

    def test_new_contradictory_evidence_and_notice_after_offer_wake_ops(self):
        original = (self.root / close.RECORDS[1]).read_bytes()
        with (self.root / close.RECORDS[1]).open("a") as handle:
            handle.write(json.dumps({"evidence": [{"role": "contradict"}]}) + "\n")
        self.assertFalse(self.offer())
        (self.root / close.RECORDS[1]).write_bytes(original)
        self.assertTrue(self.offer())
        ops_current.save(self.directory / "learning-notices/new.json", {"kind": "disagreement"})
        self.process()
        self.assertEqual(self.receipt()["state"], "attention")
        self.assertFalse((self.root / "dataset.counter").exists())

    def test_staged_parallel_records_are_preserved_and_wake_ops(self):
        (self.root / "other.txt").write_text("并行暂存")
        self.git("add", "other.txt")
        before = self.git("diff", "--cached", "--binary")
        self.assertTrue(self.offer())
        self.process()
        self.assertEqual(self.receipt()["state"], "attention")
        self.assertEqual(self.git("diff", "--cached", "--binary"), before)
        self.assertEqual(self.git("rev-parse", "HEAD"), self.head)

    def test_dataset_failure_preserves_exit_and_wakes_once_without_record_commit(self):
        (self.root / "ops/paper_dataset.py").write_text("raise SystemExit(7)\n")
        self.git("add", "ops/paper_dataset.py")
        self.git("commit", "-qm", "Fixed failing dataset")
        head = self.git("rev-parse", "HEAD")
        self.batch["ordinary_baseline"] = close.baseline(self.root, self.directory)
        self.assertTrue(self.offer())
        self.process()
        self.assertEqual(self.receipt()["state"], "attention")
        self.assertIn("dataset exit 7", self.receipt()["reason"])
        self.assertEqual(self.git("rev-parse", "HEAD"), head)
        self.process()
        self.assertEqual(len(self.events), 1)

    def test_corrupt_receipt_keeps_original_and_wakes_once_instead_of_disappearing(self):
        path = self.directory / "ordinary-close/20261018-170000.json"
        path.parent.mkdir()
        path.write_bytes(b"broken original\n")
        self.assertFalse(self.offer())
        self.process()
        self.process()
        self.assertEqual(path.read_bytes(), b"broken original\n")
        self.assertEqual(len(self.events), 1)
        self.assertEqual(json.loads(path.with_suffix(".invalid.json").read_text())["state"], "attention")
        self.assertFalse((self.root / "dataset.counter").exists())

    def test_parallel_record_change_rejects_stale_commit_and_leaves_index_unlocked(self):
        path = self.root / "paper/data/fixed.csv"
        path.write_text("first cut\n")
        with self.assertRaisesRegex(ValueError, "parallel record change"):
            close.controlled_commit(self.root, self.directory, ["paper/data/fixed.csv"], "Fixed record",
                                    lambda: path.write_text("parallel newer cut\n"))
        self.assertEqual(path.read_text(), "parallel newer cut\n")
        self.assertEqual(self.git("rev-parse", "HEAD"), self.head)
        self.assertEqual(self.git("diff", "--cached", "--name-only"), "")
        self.assertFalse((self.root / ".git/index.lock").exists())

    def test_strategy_null_checks_preserved_but_dirty_tree_rejected(self):
        tree = self.root / ".worktrees/codex-strategy-silent-fixed"
        self.git("worktree", "add", "-qb", "source", str(tree))
        batch = {**self.batch, "task": "strategy-proposal", "worktree": str(tree), "no_change_proposals": {"base": self.head}}
        original = tree / "learner/runs/fixed/report.md"
        original.parent.mkdir(parents=True)
        original.write_text("固定策略原报告")
        report = {**self.report, "task": "strategy-proposal", "base": self.head, "report": str(original), "tests": {"tsc": None, "vitest": None, "cases": None}}
        before = copy.deepcopy(report)
        self.assertTrue(self.offer(batch=batch, report=report))
        self.assertEqual(report, before)
        (tree / "new.txt").write_text("untracked")
        self.assertFalse(self.offer("other", batch, report))

    def test_current_is_bounded_hash_linked_and_never_fills_other_role_ack(self):
        live = self.root / ".worktrees/live"
        self.git("worktree", "add", "-qb", "live", str(live))
        state = {"batches": {"original": {"state": "running", "pid": 42, "task": "fix-batch", "worktree": str(self.root / ".worktrees/fix")}}, "learning_requests": {"h0": {"state": "blocked", "owner": "original"}}}
        ops_current.save(self.directory / "learn.json", state)
        state["batches"]["historical"] = {"state": "lost", "pid": 99}
        ops_current.save(self.directory / "learn.json", state)
        ops_current.save(self.directory / "herdr-ops.json", {"pane": "wJ:p5", "session": "fixed-original"})
        ops_current.atomic(self.directory / "queue/.123-stall.md", b"abandoned temporary")
        ops_current.atomic(self.directory / "queue/124-stall.md", b"actual original event")
        ops_current.atomic(self.root / "ops/inbox-dev.md", "- 2026-10-18 17:00:00 CST [Roy] 固定新指令原件\n".encode())
        ops_current.save(self.directory / "pending-integrations/closed.json", {"completed": True})
        ops_current.save(self.directory / "pending-integrations/open.json", {"completed": False, "phase": "fixed pending"})
        ops_current.save(self.root / "paper/materials/20261017-human-pace-control/checkpoint.json", {"request": "roy-20261017-human-pace", "owner_session": "continued", "original_owner": "original"})
        for n in range(100):
            ops_current.save(self.directory / f"learning-notices/{n:024}.json", {"id": str(n), "kind": "disagreement", "watcher_received": False, "roy_notified": False})
        current = ops_current.generate(self.root, self.directory)
        text = (self.root / "notes/ops-current.md").read_text()
        self.assertLessEqual(len(text.encode()), 12288)
        self.assertEqual(current["main"], self.head)
        self.assertEqual(current["release"], "V5-R1")
        self.assertEqual(len(current["pending_notices"]), 100)
        self.assertEqual(len(current["queued_events"]), 1)
        self.assertEqual(len(current["active_batches"]), 1)
        self.assertEqual(len(current["historical_lost"]), 1)
        self.assertEqual(len(current["not_marked_completed_transactions"]), 1)
        self.assertEqual(current["human_pace"]["original_owner"], "original")
        self.assertIn("固定新指令", text)
        self.assertEqual(json.loads((self.directory / "learn.json").read_text()), state)
        self.assertFalse(json.loads((self.directory / "learning-notices/000000000000000000000000.json").read_text())["roy_notified"])
        self.assertIn("current.json SHA256", text)


if __name__ == "__main__":
    unittest.main()
