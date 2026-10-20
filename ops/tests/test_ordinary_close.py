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

    def test_candidate_source_failure_does_not_poison_valid_peer(self):
        self.assertTrue(self.offer())
        self.assertTrue(self.offer("20261018-170001"))
        path = self.directory / "ordinary-close/20261018-170000.json"
        row = self.receipt()
        row["original_batch"]["ordinary_baseline"]["head"] = "0" * 40
        ops_current.save(path, row)
        self.process()
        self.assertEqual(self.receipt()["state"], "attention")
        good = self.receipt("20261018-170001")
        self.assertEqual(good["state"], "closed", good)
        self.assertEqual(self.git("rev-parse", "HEAD"), good["records"]["commit"])
        self.assertEqual((self.root / "dataset.counter").read_text(), "1")
        self.assertEqual(len(self.events), 1)
        records = [json.loads(line) for line in (self.root / "paper/materials/ordinary-completions.jsonl").read_text().splitlines()]
        self.assertEqual([record["batch"] for record in records], ["20261018-170001"])
        self.process()
        self.assertEqual((self.root / "dataset.counter").read_text(), "1")
        self.assertEqual(len(self.events), 1)

    def test_predataset_attention_reenters_original_guards_with_failure_history(self):
        self.assertTrue(self.offer())
        path = self.directory / "ordinary-close/20261018-170000.json"
        old = self.receipt()
        old.update(state="attention", reason="original group source drift", finished="fixed original time",
                   event={"id": "original-event"}, ops_event_enqueued=True)
        ops_current.save(path, old)
        self.process()
        row = self.receipt()
        self.assertEqual(row["state"], "closed", row)
        self.assertEqual(row["attempt_history"], [old])
        self.assertEqual(row["original_batch"], old["original_batch"])
        self.assertEqual(row["report"], old["report"])
        self.assertEqual((self.root / "dataset.counter").read_text(), "1")
        self.assertEqual(self.events, [])
        self.process()
        self.assertEqual((self.root / "dataset.counter").read_text(), "1")

    def test_predataset_reentry_preserves_all_original_guards_and_does_not_repeat_wakes(self):
        for guard in ("source", "report", "ledger", "notice"):
            with self.subTest(guard=guard):
                batch_id = "guard-" + guard
                self.assertTrue(self.offer(batch_id))
                path = self.directory / f"ordinary-close/{batch_id}.json"
                row = self.receipt(batch_id)
                row.update(state="attention", reason="original failure", event="original-event", ops_event_enqueued=True)
                if guard == "source":
                    row["original_batch"]["ordinary_baseline"]["head"] = "0" * 40
                elif guard == "report":
                    row["proof"]["report_sha256"] = "0" * 64
                elif guard == "ledger":
                    row["runs"] = ["MISSING00001"]
                else:
                    ops_current.save(self.directory / "learning-notices/new.json", {"kind": "disagreement"})
                ops_current.save(path, row)
                original = path.read_bytes()
                self.process()
                self.process()
                self.assertEqual(path.read_bytes(), original)
                self.assertFalse((self.root / "dataset.counter").exists())
                self.assertEqual(self.events, [])
                path.unlink()

    def test_interrupted_candidate_does_not_block_peer_and_never_retries_dataset(self):
        self.assertTrue(self.offer())
        self.assertTrue(self.offer("20261018-170001"))
        path = self.directory / "ordinary-close/20261018-170000.json"
        row = self.receipt()
        row["state"] = "running"
        ops_current.save(path, row)
        self.process()
        self.assertEqual(self.receipt()["state"], "attention")
        self.assertEqual(self.receipt("20261018-170001")["state"], "closed")
        self.process()
        self.assertEqual(self.receipt()["state"], "attention")
        self.assertEqual((self.root / "dataset.counter").read_text(), "1")
        self.assertEqual(len(self.events), 1)

    def test_any_dataset_side_effect_marker_prevents_attention_reentry(self):
        self.assertTrue(self.offer())
        path = self.directory / "ordinary-close/20261018-170000.json"
        original = self.receipt()
        for marker in ("started", "dataset_attempts", "dataset", "records", "log"):
            with self.subTest(marker=marker):
                row = {**original, "state": "attention", "reason": "original interrupted close"}
                log = path.with_suffix(".dataset.log")
                if marker == "log":
                    log.write_text("original partial output")
                else:
                    row[marker] = None
                ops_current.save(path, row)
                raw = path.read_bytes()
                self.process()
                self.assertEqual(path.read_bytes(), raw)
                self.assertFalse((self.root / "dataset.counter").exists())
                self.assertEqual(self.events, [])
                log.unlink(missing_ok=True)

    def test_postdataset_candidate_failure_is_isolated_and_never_replayed(self):
        self.assertTrue(self.offer())
        self.assertTrue(self.offer("20261018-170001"))
        real_check = close.eligible
        checked = []

        def check(root, directory, batch, report):
            checked.append(report["report"])
            if (self.root / "dataset.counter").exists() and batch.get("fail_after_dataset"):
                raise ValueError("fixed late candidate failure")
            return real_check(root, directory, batch, report)

        path = self.directory / "ordinary-close/20261018-170000.json"
        row = self.receipt()
        row["original_batch"]["fail_after_dataset"] = True
        ops_current.save(path, row)
        with patch.object(close, "eligible", side_effect=check):
            self.process()
        self.assertEqual(self.receipt()["state"], "attention")
        self.assertEqual(self.receipt("20261018-170001")["state"], "closed")
        self.assertEqual(len(self.events), 1)
        self.assertGreaterEqual(len(checked), 4)
        self.process()
        self.assertEqual(self.receipt()["state"], "attention")
        self.assertEqual((self.root / "dataset.counter").read_text(), "1")

    def test_final_git_candidate_guard_rejects_only_its_own_private_record(self):
        self.assertTrue(self.offer())
        self.assertTrue(self.offer("20261018-170001"))
        real_commit = close.controlled_commit
        calls = []

        def commit(*args, **kwargs):
            calls.append(1)
            # Simulate a report changing after post-dataset validation, before final Git verification.
            real_eligible = close.eligible

            def eligible(root, directory, batch, report):
                if len(calls) == 1 and batch is not None and batch.get("late_failure"):
                    raise ValueError("fixed final Git candidate failure")
                return real_eligible(root, directory, batch, report)

            with patch.object(close, "eligible", side_effect=eligible):
                return real_commit(*args, **kwargs)

        path = self.directory / "ordinary-close/20261018-170000.json"
        row = self.receipt()
        row["original_batch"]["late_failure"] = True
        ops_current.save(path, row)
        with patch.object(close, "controlled_commit", side_effect=commit):
            self.process()
        self.assertEqual(len(calls), 2)
        self.assertEqual(self.receipt()["state"], "attention")
        good = self.receipt("20261018-170001")
        self.assertEqual(good["state"], "closed", good)
        self.assertEqual(self.git("rev-parse", "HEAD"), good["records"]["commit"])
        records = [json.loads(line) for line in (self.root / "paper/materials/ordinary-completions.jsonl").read_text().splitlines()]
        self.assertEqual([record["batch"] for record in records], ["20261018-170001"])
        self.assertEqual((self.root / "dataset.counter").read_text(), "1")
        self.assertEqual(len(self.events), 1)

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

    def test_reclaimed_worktree_cannot_fall_back_to_enclosing_main_git(self):
        tree = self.root / '.worktrees/codex-strategy-silent-fixed'
        self.git('worktree', 'add', '-qb', 'reclaimed-source', str(tree))
        original = tree / 'learner/runs/fixed/report.md'
        original.parent.mkdir(parents=True)
        original.write_text('固定无源码报告')
        batch = {**self.batch, 'task': 'strategy-proposal', 'worktree': str(tree),
                 'no_change_proposals': {'base': self.head}}
        report = {**self.report, 'task': 'strategy-proposal', 'base': self.head, 'report': str(original)}
        # Keep enclosing main clean, reproducing Git's otherwise-valid fallback identity.
        (self.root / '.git/info/exclude').write_text('.worktrees/\n')
        marker = tree / '.git'
        raw = marker.read_bytes()
        marker.unlink()
        try:
            self.assertEqual(self.git('-C', str(tree), 'rev-parse', '--show-toplevel'), str(self.root))
            self.assertFalse(self.offer('reclaimed', batch, report))
            self.assertFalse((self.root / 'dataset.counter').exists())
        finally:
            marker.write_bytes(raw)


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
