"""Fixed locks and runtime metadata; no installs or active workspaces."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ops"))
import shared_tools as tools
import worktree_checkout as checkout


class SharedTools(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.tree = self.root / ".worktrees/feature"
        self.tree.mkdir(parents=True)
        for root in (self.root, self.tree):
            (root / "agent").mkdir()
            (root / "agent/package.json").write_text('{"name":"fixed"}')
            (root / "agent/package-lock.json").write_text(json.dumps({"packages": {"node_modules/fixed": {"version": "1", "integrity": "fixed"}}}))
        (self.root / "agent/node_modules").mkdir()
        (self.root / "agent/node_modules/.package-lock.json").write_bytes((self.root / "agent/package-lock.json").read_bytes())
        self.runtime = patch.object(tools.subprocess, "check_output", return_value='{"node":"v22.0.0","abi":"127","platform":"linux","arch":"x64"}')
        self.runtime.start()
        self.addCleanup(self.runtime.stop)

    def test_matching_locks_share_existing_provider_and_record_abi(self):
        before = (self.root / "agent/node_modules").stat().st_mode
        result = tools.attach(self.root, self.tree)
        self.assertTrue((self.tree / "agent/node_modules").is_symlink())
        self.assertEqual((self.tree / "agent/node_modules").resolve(), self.root / "agent/node_modules")
        self.assertEqual(result["tools"]["node"]["runtime"]["abi"], "127")
        self.assertEqual(before, (self.root / "agent/node_modules").stat().st_mode)
        self.assertEqual(tools.attach(self.root, self.tree)["tools"]["node"]["state"], "existing_verified_link")

    def test_different_target_lock_refuses_before_link_or_install(self):
        (self.tree / "agent/package-lock.json").write_text('{"packages":{}}')
        with self.assertRaisesRegex(ValueError, "mismatch"):
            tools.attach(self.root, self.tree)
        self.assertFalse((self.tree / "agent/node_modules").exists())

    def test_installed_package_mismatch_is_not_hidden_by_equal_root_locks(self):
        (self.root / "agent/node_modules/.package-lock.json").write_text('{"packages":{"node_modules/fixed":{"version":"2"}}}')
        with self.assertRaisesRegex(ValueError, "installed dependency differs"):
            tools.attach(self.root, self.tree)
        self.assertFalse((self.tree / "agent/node_modules").exists())
        (self.root / "agent/node_modules/.package-lock.json").write_text('{"packages":{}}')
        with self.assertRaisesRegex(ValueError, "empty"):
            tools.attach(self.root, self.tree)

    def test_private_or_foreign_dependency_is_preserved(self):
        p = self.tree / "agent/node_modules"
        p.mkdir()
        (p / "private").write_text("fixed retained copy")
        with self.assertRaises(ValueError):
            tools.attach(self.root, self.tree)
        self.assertEqual((p / "private").read_text(), "fixed retained copy")
        (p / "private").unlink()
        p.rmdir()
        p.symlink_to(self.root / "other")
        with self.assertRaises(ValueError):
            tools.attach(self.root, self.tree)
        self.assertTrue(p.is_symlink())

    def test_restore_preflight_does_not_materialize_links(self):
        result = tools.attach(self.root, self.tree, apply=False)
        self.assertEqual(result["tools"]["node"]["state"], "verified")
        self.assertFalse((self.tree / "agent/node_modules").exists())

    def test_sparse_profile_keeps_current_ledger_without_historical_snapshots(self):
        self.assertTrue(checkout.cold("paper/materials/old-batch/large.jsonl"))
        self.assertTrue(checkout.cold("paper/data/history/old.csv"))
        self.assertFalse(checkout.cold("paper/materials/STATE-2026-10-18.md"))
        self.assertFalse(checkout.cold("paper/materials/learning/ledger.jsonl"))
        self.assertIn("!/experiments/*", checkout.sparse_patterns())


if __name__ == "__main__":
    unittest.main()
