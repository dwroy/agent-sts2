"""Original engineering transaction plus the real S1 authority CAS, fixed fixtures only."""
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'ops'))
from ops.tests import test_fixed_producer_admission as original
import fixed_method_admission as admission
import publication_gate as gate
import stats_method_admission as stats
from stats_runtime import call, packed


class StatsAdmissionTest(unittest.TestCase):
    git = original.PublicationTest.git
    writing = original.PublicationTest.writing
    deploy = original.PublicationTest.deploy

    def setUp(self):
        original.PublicationTest.setUp(self)
        self.stats_dir = self.root / 'data/stats'
        call(ROOT, 'init', self.stats_dir)
        self.draft = self.root / 'stats-control-draft.json'
        self.draft.write_text(packed(dict(schema='stats-runtime-control-v1', root=str(self.root), enabled=True,
            directory=str(self.stats_dir), backend='shadow', methods={'outcome': '0' * 64}, retired_git_data=False)))
        self.ready = patch.object(stats, 'ready')
        self.ready.start()
        self.addCleanup(self.ready.stop)
        self.ticket = admission.prepare(self.root, self.dest, self.w, self.g, self.evidence, self.draft)
        self.ticket_path.write_text(packed(self.ticket))

    def test_original_publication_blocks_then_admits_stats_and_preserves_the_ticket(self):
        raw = self.ticket_path.read_bytes()
        with self.writing():
            blocked = call(ROOT, 'authority', self.stats_dir)
            self.assertTrue(blocked['blocked'])
            self.deploy()
        authority = call(ROOT, 'authority', self.stats_dir)
        self.assertFalse(authority['blocked'])
        self.assertEqual(authority['methods'], self.ticket['methods'])
        self.assertEqual(json.loads(self.control.read_text())['refresh'], [])
        self.assertEqual(json.loads((self.dest / 'stats-runtime.json').read_text())['methods'], self.ticket['methods'])
        self.assertEqual(self.ticket_path.read_bytes(), raw)
        gate.release(self.root, self.dest, 'issue84', self.marker['token'], __import__('os').getpid())

    def test_interrupted_source_body_retains_block_and_original_owner_can_resume(self):
        with self.assertRaisesRegex(RuntimeError, 'synthetic interruption'):
            with self.writing():
                self.deploy()
                raise RuntimeError('synthetic interruption')
        self.assertTrue(call(ROOT, 'authority', self.stats_dir)['blocked'])
        with self.writing(resume=True):
            pass
        self.assertFalse(call(ROOT, 'authority', self.stats_dir)['blocked'])

    def test_replaying_original_block_does_not_overwrite_admitted_successor(self):
        with self.writing():
            self.deploy()
        saved = json.loads(admission.transaction_path(self.dest, self.marker).read_text())
        authority = call(ROOT, 'authority', self.stats_dir)
        stats.transition(self.root, self.dest, saved['stats'], ROOT, 'block')
        self.assertEqual(call(ROOT, 'authority', self.stats_dir), authority)

    def test_changed_stats_control_rejects_before_source_body(self):
        draft = json.loads(self.draft.read_text())
        draft['backend'] = 'json'
        (self.dest / 'stats-runtime.json').write_text(packed(draft))
        with self.assertRaisesRegex(ValueError, 'CAS conflict'):
            with self.writing():
                self.fail('must not enter source writer')
        self.assertIsNone(call(ROOT, 'authority', self.stats_dir))


if __name__ == '__main__':
    unittest.main()
