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

    def test_missing_runtime_or_provider_has_a_clear_allocation_error(self):
        with patch.object(tools.subprocess, 'check_output', side_effect=FileNotFoundError('node')):
            with self.assertRaisesRegex(ValueError, 'Node runtime unavailable on PATH'):
                tools.attach(self.root, self.tree)
        (self.root / 'agent/node_modules/.package-lock.json').unlink()
        (self.root / 'agent/node_modules').rmdir()
        with self.assertRaisesRegex(ValueError, 'shared Node provider missing'):
            tools.attach(self.root, self.tree, require_node=True)
        self.assertFalse((self.tree / 'agent/node_modules').is_symlink())

    def test_nonissue_optional_provider_remains_optional(self):
        (self.root / 'agent/node_modules/.package-lock.json').unlink()
        (self.root / 'agent/node_modules').rmdir()
        self.assertNotIn('node', tools.attach(self.root, self.tree)['tools'])

    def test_sparse_profile_keeps_current_ledger_without_historical_snapshots(self):
        self.assertTrue(checkout.cold("paper/materials/old-batch/large.jsonl"))
        self.assertTrue(checkout.cold("paper/data/history/old.csv"))
        self.assertFalse(checkout.cold("paper/materials/STATE-2026-10-18.md"))
        self.assertFalse(checkout.cold("paper/materials/learning/ledger.jsonl"))
        self.assertIn("!/experiments/*", checkout.sparse_patterns())


class AllocationResume(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.directory = self.root / 'ops/codex-ops'
        self.tree = self.root / '.worktrees/issue-33-fixture'
        self.git('init', '-b', 'main'); self.git('config', 'commit.gpgsign', 'false')
        (self.root / '.gitignore').write_text('.worktrees/\nops/codex-ops/\nagent/node_modules\n')
        (self.root / 'agent').mkdir()
        (self.root / 'agent/package.json').write_text('{"name":"fixed"}')
        (self.root / 'agent/package-lock.json').write_text(json.dumps(dict(packages={
            'node_modules/fixed': dict(version='1', integrity='fixed')})))
        self.git('add', '.'); self.git('commit', '-m', 'fixed source')
        self.base = self.git('rev-parse', 'HEAD').strip()
        self.receipt = self.directory / 'retention/allocations/issue-33-fixture.json'
        mock = patch('worktree_retention.active', return_value=False); mock.start(); self.addCleanup(mock.stop)
        mock = patch.object(checkout.retention, 'require_host_process_view'); mock.start(); self.addCleanup(mock.stop)
        mock = patch.object(tools.subprocess, 'check_output', return_value='{"node":"v22.0.0","abi":"127","platform":"linux","arch":"x64"}')
        mock.start(); self.addCleanup(mock.stop)

    def git(self, *args):
        result = subprocess.run(['git', '-C', str(self.root), *args], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result.stdout

    def provider(self):
        modules = self.root / 'agent/node_modules'; modules.mkdir()
        (modules / '.package-lock.json').write_bytes((self.root / 'agent/package-lock.json').read_bytes())

    def test_allocator_fails_before_prepare_then_explicitly_resumes_its_failed_receipt(self):
        with self.assertRaisesRegex(ValueError, 'shared Node provider missing'):
            checkout.create(self.root, self.directory, self.tree, self.base, require_node=True)
        original = json.loads(self.receipt.read_text())
        self.assertEqual(original['state'], 'allocation_failed')
        self.assertFalse(self.tree.exists())
        with self.assertRaisesRegex(ValueError, 'shared Node provider missing'):
            checkout.resume(self.root, self.directory, self.tree, self.base)
        self.provider()
        result = checkout.resume(self.root, self.directory, self.tree, self.base, require_node=True)
        self.assertEqual(result['state'], 'allocated')
        self.assertEqual(result['resume_history'][0]['error'], original['error'])
        self.assertTrue((self.tree / 'agent/node_modules').is_symlink())
        self.assertEqual((self.tree / 'agent/node_modules').resolve(), self.root / 'agent/node_modules')
        self.assertEqual(checkout.resume(self.root, self.directory, self.tree, self.base, require_node=True)['state'], 'allocated')

    def test_noninteractive_missing_node_fails_allocate_and_retains_specific_reason(self):
        self.provider()
        with patch.object(tools.subprocess, 'check_output', side_effect=FileNotFoundError('node')):
            with self.assertRaisesRegex(ValueError, 'Node runtime unavailable on PATH'):
                checkout.create(self.root, self.directory, self.tree, self.base, require_node=True)
        self.assertIn('PATH', json.loads(self.receipt.read_text())['error'])
        self.assertEqual(checkout.resume(self.root, self.directory, self.tree, self.base, require_node=True)['state'], 'allocated')

    def test_resume_rejects_rebound_receipt_or_dirty_existing_workspace(self):
        self.provider(); checkout.create(self.root, self.directory, self.tree, self.base, require_node=True)
        (self.tree / 'unfinished').write_text('preserve')
        with self.assertRaisesRegex(ValueError, 'workspace changed'):
            checkout.resume(self.root, self.directory, self.tree, self.base, require_node=True)
        self.assertEqual((self.tree / 'unfinished').read_text(), 'preserve')
        record = json.loads(self.receipt.read_text()); record['base'] = 'a' * 40
        self.receipt.write_text(json.dumps(record))
        with self.assertRaisesRegex(ValueError, 'receipt identity'):
            checkout.resume(self.root, self.directory, self.tree, self.base, require_node=True)


if __name__ == "__main__":
    unittest.main()
