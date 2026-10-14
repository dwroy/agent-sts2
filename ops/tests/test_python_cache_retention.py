"""Tracked-source cache fixtures in temporary repositories, without production reclamation."""
from pathlib import Path
import unittest
from unittest.mock import patch

from test_learner_retention import LearnerRetention, retention
from test_worktree_retention import WorkspaceRetention, resource


class PythonCacheRetention(unittest.TestCase):
    def learner(self):
        fixture = LearnerRetention(methodName='runTest')
        self.addCleanup(fixture.doCleanups)
        fixture.setUp()
        (fixture.root / 'fixture.py').write_text('fixed = 1\n')
        with (fixture.root / '.gitignore').open('a') as handle:
            handle.write('**/__pycache__/\n')
        fixture.git('add', 'fixture.py', '.gitignore')
        fixture.git('commit', '-m', 'Fixed tracked Python source')
        for tree in (fixture.tree, fixture.live):
            fixture.git('-C', str(tree), 'merge', '--ff-only', 'main')
        fixture.head = fixture.git('rev-parse', 'HEAD').strip()
        fixture.report.update(commit=fixture.head, merged=fixture.head)
        fixture.batch['checks']['merged'] = fixture.head
        fixture.save()
        return fixture

    def cache(self, tree, name):
        path = tree / '__pycache__' / name
        path.parent.mkdir(exist_ok=True)
        path.write_bytes(b'fixed reconstructible bytecode')
        return path

    def test_settled_learner_retires_known_bytecode_and_keeps_sources_originals_and_branch(self):
        f = self.learner()
        caches = [self.cache(f.tree, name) for name in
                  ('fixture.cpython-314.pyc', 'fixture.cpython-314.opt-1.pyc', 'fixture.cpython-314.opt-2.pyc')]
        before_source = (f.root / 'fixture.py').read_bytes()
        plan = f.run_cleanup(False)
        self.assertEqual(plan['state'], 'eligible')
        self.assertEqual(len(plan['proof']['discarded_python_cache']), 3)
        self.assertTrue(all(p.exists() for p in caches))
        self.assertEqual(f.run_cleanup()['state'], 'reclaimed')
        self.assertFalse(any(p.exists() for p in caches))
        self.assertEqual((f.root / 'fixture.py').read_bytes(), before_source)
        self.assertTrue(f.original_stream.exists())
        self.assertEqual(f.git('rev-parse', f.tree.name).strip(), f.head)

    def test_unknown_bytecode_links_and_active_owners_remain_retained(self):
        f = self.learner()
        known = self.cache(f.tree, 'fixture.cpython-314.pyc')
        for name in ('missing.cpython-314.pyc', 'fixture.pyc', 'fixture.unknown-314.pyc'):
            with self.subTest(name=name):
                unknown = self.cache(f.tree, name)
                with self.assertRaisesRegex(ValueError, 'outside bound scratch'):
                    f.run_cleanup()
                self.assertTrue(known.exists() and unknown.exists())
                unknown.unlink()
        link = known.with_name('fixture.cpython-314.opt-1.pyc')
        link.symlink_to(f.root / 'README.md')
        with self.assertRaisesRegex(ValueError, 'symlink'):
            f.run_cleanup()
        self.assertTrue(link.is_symlink() and known.exists())
        link.unlink()
        with patch.object(retention, 'active_cwd', return_value=True):
            with self.assertRaisesRegex(ValueError, 'active'):
                f.run_cleanup()
        self.assertTrue(known.exists() and (f.tree / '.git').exists())

    def test_workspace_inventory_retains_unknown_cache_instead_of_discarding_it(self):
        f = WorkspaceRetention(methodName='runTest')
        self.addCleanup(f.doCleanups)
        f.setUp()
        unknown = f.cache.with_name('missing.cpython-314.pyc')
        unknown.write_bytes(b'unknown evidence must remain')
        with self.assertRaisesRegex(ValueError, 'unknown Python bytecode'):
            resource.reclaim(f.root, f.directory, f.tree.name)
        self.assertTrue(unknown.exists() and f.cache.exists() and (f.tree / '.git').exists())


if __name__ == '__main__':
    unittest.main()
