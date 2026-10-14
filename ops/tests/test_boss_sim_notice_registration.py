"""Frozen B4 delivery identity; no gameplay, native sends or production ACK writes."""
import copy
import json
import unittest

from test_feature_notice_registration import FeatureNoticeRegistration, flow


class BossSimNoticeRegistration(unittest.TestCase):
    def setUp(self):
        self.fixture = FeatureNoticeRegistration(methodName='runTest')
        self.addCleanup(self.fixture.doCleanups)
        self.fixture.setUp()
        f = self.fixture
        feature = f.fixture
        self.root = f.f.root
        self.key = 'c' * 64
        batch = f.f.state['batches'][feature.batch]
        batch.pop('feature_request')
        batch['learner_task'] = 'boss-sim-batch'
        batch['key'] = self.key
        batch['boss_sim'] = {'key': self.key, 'character': 'silent', 'mode': 'b4', 'boss': 'QUEEN'}
        frozen = self.root / 'ops/codex-ops/boss-evidence.json'
        flow.atomic(frozen, batch['boss_sim'])
        batch['evidence_path'] = str(frozen)
        flow.atomic(f.f.state_path, f.f.state)
        log = self.root / feature.source['original_log']['path']
        events = [json.loads(line) for line in log.read_text().splitlines()]
        events[0]['task'] = 'boss-sim-batch'
        log.write_text('\n'.join(json.dumps(event) for event in events) + '\n')
        report = log.with_suffix('') / 'report.md'
        report.write_text('固定B4报告，保留原异议与反证。')
        message = self.root / 'native-message.txt'
        message.write_text('固定原B4转交\n' + feature.batch + '\n' + self.key + '\n' + flow.digest(report.read_bytes()))
        native = {'result': {'type': 'agent_prompted', 'agent': {'pane_id': 'fixed-pane'}}}
        self.native = f.f.artifact('native-delivery.json', native)
        self.receipt = {'delivery_token': f.notice_id, 'original_batch': feature.batch, 'stage': 'ops_forwarded',
                        'actor': 'ops', 'status': 'delivered', 'evidence': self.native}
        self.received = {'notice_id': f.notice_id, 'original_batch': feature.batch, 'stage': 'watcher_received',
                         'actor': 'watcher', 'status': 'delivered', 'evidence': feature.ref(message)}
        self.source = {'source_kind': 'boss-sim', 'evidence_key': self.key, 'batch': feature.batch,
                       'character': 'silent', 'worktree': str(feature.tree), 'thread_id': feature.thread,
                       'original_log': feature.ref(log), 'original_report': feature.ref(report),
                       'boss_evidence': feature.ref(frozen),
                       'native_delivery': {'message': feature.ref(message),
                                           'receipt': f.f.artifact('native-receipt.json', self.receipt),
                                           'received': f.f.artifact('native-received.json', self.received)}}
        f.source_ref = f.f.artifact('producer-source.json', self.source)

    def test_b4_binds_existing_evidence_key_and_legacy_native_id_without_impersonating_a_feature_parent(self):
        f = self.fixture
        before = f.f.state_path.read_bytes()
        raw_receipt = (self.root / 'native-receipt.json').read_bytes()
        self.assertEqual(f.register(), 0)
        notice = json.loads(f.path.read_bytes())
        self.assertEqual(notice['request_id'], self.key)
        self.assertEqual(notice['source_kind'], 'boss-sim')
        self.assertFalse(notice['watcher_received'])
        self.assertFalse(notice['roy_notified'])
        self.assertEqual(f.ack('ops_forwarded', 'native-receipt.json'), 0)
        self.assertEqual(f.ack('watcher_received', 'native-received.json'), 0)
        f.f.notice = json.loads(f.path.read_bytes())
        f.f.notice_path = f.path
        self.assertEqual(f.f.ack('roy_notified'), 0)
        saved = f.path.read_bytes()
        self.assertEqual(f.register(), 0)
        self.assertEqual(f.path.read_bytes(), saved)
        self.assertEqual(f.f.state_path.read_bytes(), before)
        self.assertEqual((self.root / 'native-receipt.json').read_bytes(), raw_receipt)

    def test_b4_rejects_wrong_input_thread_character_and_scope_before_registration(self):
        f = self.fixture
        before = f.f.state_path.read_bytes()
        for key, value in [('evidence_key', 'd' * 64), ('character', 'ironclad'),
                           ('thread_id', '01a13753-c032-73f0-aa3f-ddc0e14809ce'),
                           ('source_kind', 'feature'), ('batch', '20261014-061303-fix-batch')]:
            with self.subTest(key=key):
                f.source_ref = f.f.artifact('producer-source.json', {**self.source, key: value})
                with self.assertRaises(SystemExit):
                    f.register()
                self.assertFalse(f.path.exists())
                self.assertEqual(f.f.state_path.read_bytes(), before)
        changed = copy.deepcopy(self.source)
        changed['boss_evidence'] = f.f.artifact('other-evidence.json', {'key': self.key})
        f.source_ref = f.f.artifact('producer-source.json', changed)
        with self.assertRaises(SystemExit):
            f.register()
        self.assertFalse(f.path.exists())

    def test_b4_requires_exact_independent_read_text_and_keeps_actor_and_previous_stage_guards(self):
        f = self.fixture
        for key, value in [('notice_id', 'f' * 24), ('original_batch', 'other'),
                           ('status', 'queued'), ('actor', 'ops')]:
            with self.subTest(key=key):
                source = copy.deepcopy(self.source)
                source['native_delivery']['received'] = f.f.artifact('native-received.json', {**self.received, key: value})
                f.source_ref = f.f.artifact('producer-source.json', source)
                with self.assertRaises(SystemExit):
                    f.register()
                self.assertFalse(f.path.exists())
        self.source['native_delivery']['received'] = f.f.artifact('native-received.json', self.received)
        f.source_ref = f.f.artifact('producer-source.json', self.source)
        self.assertEqual(f.register(), 0)
        f.f.notice = json.loads(f.path.read_bytes())
        f.f.notice_path = f.path
        f.f.reject_without_writes(stage='watcher_received')
        f.f.reject_without_writes(payload_changes={'character': 'ironclad'})
        f.f.reject_without_writes(payload_changes={'actor': 'watcher'})
        self.assertEqual(f.ack('ops_forwarded', 'native-receipt.json'), 0)
        (self.root / 'native-delivery.json').write_text('{}')
        before = f.path.read_bytes()
        with self.assertRaises(SystemExit):
            f.ack('watcher_received', 'native-received.json')
        self.assertEqual(f.path.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
