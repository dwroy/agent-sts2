"""Fixed local Git and JSONL fixtures; never read production logs or refresh data."""
import contextlib
import csv
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("paper_dataset", ROOT / "ops/paper_dataset.py")
dataset = importlib.util.module_from_spec(spec)
spec.loader.exec_module(dataset)


class GitSnapshot(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.git("init", "-q")
        tree = self.git("mktree", input="")
        self.first = self.git("commit-tree", tree, "-m", "first")
        self.second = self.git("commit-tree", tree, "-p", self.first, "-m", "second")
        self.third = self.git("commit-tree", tree, "-p", self.second, "-m", "third")
        self.git("update-ref", "refs/heads/main", self.first)
        self.git("update-ref", "refs/remotes/upstream/main", self.first)
        # Detached HEAD must be in the cut even when no branch reaches it.
        self.git("update-ref", "--no-deref", "HEAD", self.second)
        self.logs = self.root / "logs"
        self.logs.mkdir()
        (self.logs / "console").mkdir()
        for name in dataset.JSONL_SOURCES:
            (self.logs / name).write_text("")
        run = "FIXTURE00001"
        (self.logs / "decisions.jsonl").write_text(json.dumps({
            "ts": "2026-10-01T00:00:00.000Z", "mode": "play", "floor": 1,
            "label": "map/route-follow", "decider": "code", "fingerprint": json.dumps({"run": run}),
        }) + "\n")
        (self.logs / "runs.jsonl").write_text(json.dumps({
            "run_id": run, "character": "SILENT", "ascension": 10, "victory": False, "decisions": 1,
        }) + "\n")
        self.notes = self.root / "notes"
        self.notes.mkdir()
        (self.notes / "lessons.md").write_text("")
        self.data = self.root / "paper/data"

    def git(self, *args, input=None):
        return subprocess.run(["git", "-C", str(self.repo), *args], input=input, text=True,
                              capture_output=True, check=True, env={**os.environ,
                              "GIT_AUTHOR_NAME": "Fixture", "GIT_AUTHOR_EMAIL": "fixture@example.invalid",
                              "GIT_COMMITTER_NAME": "Fixture", "GIT_COMMITTER_EMAIL": "fixture@example.invalid",
                              "GIT_AUTHOR_DATE": "2026-10-01T00:00:00Z", "GIT_COMMITTER_DATE": "2026-10-01T00:00:00Z"}).stdout.strip()

    def run_main(self, git_run=None):
        with contextlib.ExitStack() as stack:
            for name, value in {"JEV": str(self.repo), "LOGS": str(self.logs), "AUTOPLAY": str(self.root / "absent-autoplay.log"),
                                "NOTES": str(self.notes), "DATA": str(self.data)}.items():
                stack.enter_context(patch.object(dataset, name, value))
            stack.enter_context(patch.object(dataset.sys, "argv", ["paper_dataset.py", "--no-raw"]))
            stack.enter_context(patch.object(dataset, "write_readme"))
            stack.enter_context(patch.object(dataset, "learning_curve", return_value=True))
            stack.enter_context(patch.object(dataset, "component_costs", return_value=True))
            stack.enter_context(patch.object(dataset, "scan_for_keys", return_value=[]))
            if git_run:
                stack.enter_context(patch.object(dataset.subprocess, "run", side_effect=git_run))
            stack.enter_context(contextlib.redirect_stdout(io.StringIO()))
            # Exercise the actual CLI exit, including the original entry point in the negative control.
            source = (ROOT / "ops/paper_dataset.py").read_text()
            namespace = dict(dataset.__dict__, __name__="__main__")
            cli = source[source.index('if __name__ == "__main__":'):]
            with self.assertRaises(SystemExit) as exited:
                exec(cli, namespace)
            return exited.exception.code

    def test_ref_movement_after_export_uses_same_cut_and_upstream_membership(self):
        original_run = subprocess.run
        moved = False

        def moving_run(argv, **kwargs):
            nonlocal moved
            result = original_run(argv, **kwargs)
            if "log" in argv and not moved:
                moved = True
                for ref in ("refs/heads/main", "refs/remotes/upstream/main"):
                    original_run(["git", "-C", str(self.repo), "update-ref", ref, self.third], check=True)
            return result

        self.assertEqual(self.run_main(moving_run), 0)
        self.assertTrue(moved)
        summary = json.loads((self.data / "summary.json").read_text())
        verification = json.loads((self.data / "verification.json").read_text())
        with (self.data / "commits.csv").open() as handle:
            rows = list(csv.DictReader(handle))
        self.assertEqual({r["full_hash"] for r in rows}, {self.first, self.second})
        self.assertEqual({r["full_hash"] for r in rows if r["in_origin_main"] == "1"}, {self.first})
        self.assertEqual(summary["commits"]["ref_snapshot"]["HEAD"], self.second)
        self.assertEqual(summary["commits"]["ref_snapshot"]["refs/remotes/upstream/main"], self.first)
        self.assertTrue(verification["checks"]["commits == git rev-list --all --count"])

    def test_actual_count_mismatch_preserves_failure_and_returns_nonzero(self):
        original_run = subprocess.run

        def wrong_count(argv, **kwargs):
            result = original_run(argv, **kwargs)
            if "rev-list" in argv and "--count" in argv:
                return subprocess.CompletedProcess(argv, 0, "999\n", "")
            return result

        self.assertEqual(self.run_main(wrong_count), 1)
        check = json.loads((self.data / "verification.json").read_text())
        self.assertFalse(check["checks"]["commits == git rev-list --all --count"])
        self.assertEqual(check["row_counts"]["commits.csv"], 2)

    def test_other_source_check_failure_also_returns_nonzero(self):
        with patch.object(dataset, "write_csv", wraps=dataset.write_csv) as write:
            original = write._mock_wraps
            write.side_effect = lambda path, header, rows: original(path, header, rows) + (1 if path.endswith("escalations.csv") else 0)
            self.assertEqual(self.run_main(), 1)
        check = json.loads((self.data / "verification.json").read_text())
        self.assertFalse(check["checks"]["escalations rows == records with escalation"])

    def test_stable_refs_succeed(self):
        self.assertEqual(self.run_main(), 0)

    def test_detached_head_of_another_worktree_is_included_in_all_history(self):
        self.git("worktree", "add", "--detach", str(self.root / "linked-worktree"), self.third)
        self.assertEqual(self.run_main(), 0)
        summary = json.loads((self.data / "summary.json").read_text())
        with (self.data / "commits.csv").open() as handle:
            rows = list(csv.DictReader(handle))
        self.assertEqual({r["full_hash"] for r in rows}, {self.first, self.second, self.third})
        self.assertEqual(summary["commits"]["total"], 3)


if __name__ == "__main__":
    unittest.main()
