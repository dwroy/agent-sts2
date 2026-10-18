"""Fixed source/publication identities from batch 20261018-011241, without gameplay inputs."""
import copy
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch


spec = importlib.util.spec_from_file_location("cherry_checks", Path(__file__).parents[1] / "learner_checks.py")
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)
BATCH = "20261018-011241-strategy-proposal"


class CherryPickRecheck(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="learner-cherry-pick-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.live = self.root / ".worktrees/live"
        self.source_tree = self.root / ".worktrees/codex-strategy-silent-fixed"
        self.live.mkdir(parents=True)
        self.git(self.live, "init", "-q")
        for name in ("agent/src/fixed.ts", "agent/src/removed.ts"):
            self.write(self.live / name, "baseline\n")
        self.git(self.live, "add", ".")
        self.git(self.live, "commit", "-qm", "Fixed baseline")
        self.git(self.live, "worktree", "add", "-qb", "source", str(self.source_tree))
        self.write(self.source_tree / "agent/src/fixed.ts", "fixed source\n")
        (self.source_tree / "agent/src/removed.ts").unlink()
        self.write(self.source_tree / "knowledge/characters/silent/fixed.json", '{"fixed": true}\n')
        self.git(self.source_tree, "add", ".")
        self.git(self.source_tree, "commit", "-qm", "Fixed source")
        self.source = self.git(self.source_tree, "rev-parse", "HEAD")
        self.write(self.live / "unrelated.txt", "Preserved live record\n")
        self.git(self.live, "add", ".")
        self.git(self.live, "commit", "-qm", "Unrelated live record")
        self.git(self.live, "cherry-pick", self.source)
        self.published = self.git(self.live, "rev-parse", "HEAD")
        self.assertNotEqual(self.source, self.published)
        self.assertNotEqual(subprocess.run(["git", "-C", str(self.live), "merge-base", "--is-ancestor",
                                          self.source, "HEAD"]).returncode, 0)
        (self.root / "ops").mkdir()
        self.out = self.root / "reports"
        self.out.mkdir()
        self.report = {"task": "strategy-proposal", "character": "silent", "source_commit": self.source,
                       "merged": self.published, "fixes": ["限定源码窄合，保留原报告与失败。"]}
        self.batch = {"task": "strategy-proposal", "character": "silent", "worktree": str(self.source_tree),
                      "state": "failed", "rc": 0, "merged": None, "checks": {"rc": 1, "merged": self.source}}

    def write(self, path, text):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)

    def git(self, tree, *args):
        return subprocess.check_output(["git", "-C", str(tree), *args], text=True, stderr=subprocess.DEVNULL).strip()

    def recheck(self, expected, repeat=False):
        report_path = self.out / (BATCH + ".out")
        report_path.write_text("```json\n" + json.dumps(self.report) + "\n```\n")
        report_bytes, batch_before = report_path.read_bytes(), copy.deepcopy(self.batch)
        actual_run = subprocess.run
        commands, events = [], []

        def run(argv, **kwargs):
            if argv == ["bash", "-c", checks.FULL_CHECK_COMMAND]:
                commands.append(argv)
                return subprocess.CompletedProcess(argv, 0)
            return actual_run(argv, **kwargs)

        with patch.object(checks.subprocess, "run", side_effect=run):
            code = checks.recheck_write_batch(BATCH, self.batch, str(self.root), str(self.out),
                                             lambda *event: events.append(event), lambda *args: None)
            self.assertEqual(code, expected)
            if repeat:
                self.assertEqual(checks.recheck_write_batch(BATCH, self.batch, str(self.root), str(self.out),
                                                          lambda *event: events.append(event), lambda *args: None), code)
        self.assertEqual(report_path.read_bytes(), report_bytes)
        self.assertEqual({key: self.batch[key] for key in batch_before}, batch_before)
        self.assertEqual(len(commands), int(expected == 0))
        self.assertEqual(len(events), int(expected == 0))
        if expected:
            self.assertNotIn("fallback_checks", self.batch)

    def test_rechecks_exact_cherry_pick_and_records_original_source_separately(self):
        self.recheck(0, repeat=True)
        receipt = self.batch["fallback_checks"][0]
        self.assertEqual(receipt["commits"], [self.published])
        proof = receipt["source_publications"][0]
        self.assertEqual((proof["source"], proof["published"], proof["worktree"]),
                         (self.source, self.published, str(self.source_tree)))
        self.assertEqual(set(proof["paths"]), {"agent/src/fixed.ts", "agent/src/removed.ts",
                                              "knowledge/characters/silent/fixed.json"})

    def test_later_source_ancestry_does_not_replace_the_original_publication_mapping(self):
        self.git(self.live, "merge", "--no-ff", "-s", "ours", "source", "-m", "Later history integration")
        self.assertEqual(subprocess.run(["git", "-C", str(self.live), "merge-base", "--is-ancestor",
                                         self.source, "HEAD"]).returncode, 0)
        self.recheck(0)
        self.assertEqual(self.batch["fallback_checks"][0]["source_publications"][0]["published"], self.published)

    def test_rejects_dirty_or_later_changed_original_source(self):
        path = self.source_tree / "agent/src/fixed.ts"
        path.write_text("dirty source\n")
        self.recheck(2)
        self.git(self.source_tree, "commit", "-qam", "Later source change")
        self.recheck(2)

    def test_rejects_foreign_or_missing_source_worktrees(self):
        for tree in (None, str(self.live), str(self.root), str(self.root / ".worktrees/missing")):
            with self.subTest(tree=tree):
                self.batch["worktree"] = tree
                self.recheck(2)
        self.batch["worktree"] = str(self.source_tree)
        self.git(self.source_tree, "checkout", "--detach", self.source + "^")
        self.recheck(2)

    def test_rejects_dirty_live_and_changed_or_reverted_publication(self):
        path = self.live / "knowledge/characters/silent/fixed.json"
        path.write_text('{"fixed": false}\n')
        self.recheck(2)
        self.git(self.live, "add", ".")
        self.git(self.live, "commit", "-qm", "Later live change")
        self.recheck(2)
        self.report["merged"] = self.git(self.live, "rev-parse", "HEAD")
        self.recheck(2)

    def test_rejects_unchanged_publication_and_unpublished_commits(self):
        self.write(self.live / "later.txt", "Unrelated later publication\n")
        self.git(self.live, "add", ".")
        self.git(self.live, "commit", "-qm", "Unrelated publication")
        self.report["merged"] = self.git(self.live, "rev-parse", "HEAD")
        self.recheck(2)
        self.report["merged"] = self.source
        self.recheck(2)

    def test_rejects_changed_file_modes_and_untracked_validation_inputs(self):
        path = self.live / "agent/src/fixed.ts"
        path.chmod(0o755)
        self.recheck(2)
        path.chmod(0o644)
        self.write(self.source_tree / "agent/src/untracked.ts", "Uncommitted input\n")
        self.recheck(2)
        (self.source_tree / "agent/src/untracked.ts").unlink()
        self.write(self.live / "agent/src/removed.ts", "Reintroduced deleted source\n")
        self.recheck(2)


if __name__ == "__main__":
    unittest.main()
