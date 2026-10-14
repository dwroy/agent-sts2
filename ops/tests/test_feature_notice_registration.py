"""Frozen native delivery provenance; registration never sends or fills real ACKs."""
import copy
import json
import sys
import unittest
from unittest.mock import patch

from test_feature_notice_ack import FeatureNoticeAck, flow


class FeatureNoticeRegistration(unittest.TestCase):
    def setUp(self):
        self.fixture = FeatureNoticeAck(methodName='runTest')
        self.addCleanup(self.fixture.doCleanups)
        self.fixture.setUp()
        feature = self.fixture
        self.f = feature.fixture
        self.notice_id = 'e3da4e7e53c43cf7f2549c27'
        sent = self.f.root / 'native-message.txt'
        sent.write_text('固定转交前文\n' + self.f.notice['message'] + '\n固定转交后文')
        self.native = {'notice_id': self.notice_id, 'source_feature_request': feature.source['feature_request'],
                       'source_batch': feature.batch, 'transport_exit': 0, 'target_pane': 'fixed-pane',
                       'message_sha256': flow.digest(sent.read_bytes()),
                       'transport_response': {'result': {'type': 'agent_prompted',
                                                         'agent': {'pane_id': 'fixed-pane'}}}}
        self.evidence = self.f.artifact('native-delivery.json', self.native)
        self.receipt = {'notice_id': self.notice_id, 'stage': 'ops_forwarded', 'actor': 'ops',
                        'status': 'delivered', 'evidence': self.evidence}
        self.receipt_ref = self.f.artifact('native-receipt.json', self.receipt)
        self.source = {**feature.source, 'native_delivery': {'receipt': self.receipt_ref,
                                                           'message': feature.ref(sent)}}
        self.source_ref = self.f.artifact('producer-source.json', self.source)
        self.path = self.f.notice_path.with_name(self.notice_id + '.json')

    def register(self):
        with patch.object(sys, 'argv', ['flow', 'register-feature', '--source', self.source_ref['path'],
                                      '--notice', self.notice_id]):
            return flow.main()

    def ack(self, stage, receipt_path):
        with patch.object(sys, 'argv', ['flow', 'ack', '--notice', self.notice_id,
                                      '--stage', stage, '--receipt', receipt_path]):
            return flow.main()

    def test_producer_registers_original_native_id_and_existing_actor_receipts_without_resending(self):
        before = self.f.state_path.read_bytes()
        originals = {p: p.read_bytes() for p in self.f.root.glob('native-*') if p.is_file()}
        self.assertEqual(self.register(), 0)
        notice = json.loads(self.path.read_bytes())
        self.assertEqual(notice['id'], self.notice_id)
        self.assertEqual(notice['message'], self.f.notice['message'])
        self.assertFalse(any(notice[stage] for stage in ('ops_forwarded', 'watcher_received', 'roy_notified')))
        self.assertFalse((self.f.directory / 'queue').exists())
        self.assertFalse((self.f.root / 'ops/inbox-dev.md').exists())
        frozen = self.f.root / notice['source_evidence']['path']
        self.assertEqual(frozen.parent.name, 'sources')
        self.assertEqual(json.loads(flow.artifact(self.f.root, notice['source_evidence'])), self.source)
        (self.f.root / self.source_ref['path']).unlink()
        self.assertEqual(self.ack('ops_forwarded', self.receipt_ref['path']), 0)
        self.f.notice = json.loads(self.path.read_bytes())
        self.f.notice_path = self.path
        for stage in ('watcher_received', 'roy_notified'):
            self.assertEqual(self.f.ack(stage), 0)
        saved = self.path.read_bytes()
        self.source_ref = self.f.artifact('producer-source.json', self.source)
        self.assertEqual(self.register(), 0)
        self.assertEqual(self.path.read_bytes(), saved)
        self.assertEqual(self.f.state_path.read_bytes(), before)
        self.assertEqual({p: p.read_bytes() for p in originals}, originals)
        self.assertEqual(len(list(self.path.parent.glob('*.json'))), 1)

    def test_registration_rejects_forged_native_provenance_without_partial_notice_or_state(self):
        before = self.f.state_path.read_bytes()
        for key, value in [('notice_id', 'a' * 24), ('source_feature_request', 'other'),
                           ('source_batch', '20261014-061303-fix-batch'), ('transport_exit', 1),
                           ('message_sha256', 'a' * 64), ('target_pane', 'other'),
                           ('transport_response', {'result': {'type': 'queued'}})]:
            with self.subTest(key=key):
                self.f.artifact('native-delivery.json', {**self.native, key: value})
                self.receipt['evidence'] = self.f.artifact('native-delivery.json', {**self.native, key: value})
                self.source['native_delivery']['receipt'] = self.f.artifact('native-receipt.json', self.receipt)
                self.source_ref = self.f.artifact('producer-source.json', self.source)
                with self.assertRaises(SystemExit):
                    self.register()
                self.assertFalse(self.path.exists())
                self.assertEqual(self.f.state_path.read_bytes(), before)
        self.receipt['evidence'] = self.f.artifact('native-delivery.json', self.native)
        self.source['native_delivery']['receipt'] = self.f.artifact('native-receipt.json', self.receipt)
        original = copy.deepcopy(self.source)
        for key, value in [('thread_id', '01a13753-c032-73f0-aa3f-ddc0e14809ce'),
                           ('character', 'ironclad'), ('feature_request', 'unknown')]:
            with self.subTest(source=key):
                self.source_ref = self.f.artifact('producer-source.json', {**original, key: value})
                with self.assertRaises(SystemExit):
                    self.register()
                self.assertFalse(self.path.exists())
                self.assertEqual(self.f.state_path.read_bytes(), before)

    def test_json_pretty_printing_preserves_all_original_values_and_rejects_semantic_changes(self):
        message = self.f.root / self.source['original_message']['path']
        original = [{'claim': '固定原观点', 'finding': '固定异议', 'values': [1, '原字']}]
        message.write_text(json.dumps(original, ensure_ascii=False, indent=1))
        self.source['original_message'] = self.fixture.ref(message)
        sent = self.f.root / self.source['native_delivery']['message']['path']
        sent.write_text('固定前文\n' + json.dumps(original, ensure_ascii=False, indent=2) + '\n固定后文')
        self.native['message_sha256'] = flow.digest(sent.read_bytes())
        self.receipt['evidence'] = self.f.artifact('native-delivery.json', self.native)
        self.source['native_delivery']['receipt'] = self.f.artifact('native-receipt.json', self.receipt)
        self.source['native_delivery']['message'] = self.fixture.ref(sent)
        self.source_ref = self.f.artifact('producer-source.json', self.source)
        self.assertEqual(self.register(), 0)
        self.assertEqual(json.loads(self.path.read_bytes())['message'], message.read_text())
        self.assertFalse(flow.contains_original(message.read_bytes(), b'{"claim":"changed"}'))
        changed = copy.deepcopy(original)
        changed[0]['values'][0] = True
        self.assertFalse(flow.contains_original(message.read_bytes(), json.dumps(changed).encode()))

    def test_native_notice_retries_original_id_and_keeps_actor_stage_and_frozen_source_guards(self):
        self.assertEqual(self.register(), 0)
        saved = self.path.read_bytes()
        self.f.notice = json.loads(saved)
        self.f.notice_path = self.path
        self.f.reject_without_writes(stage='watcher_received')
        self.f.reject_without_writes(payload_changes={'character': 'ironclad'})
        self.f.reject_without_writes(payload_changes={'status': 'queued'})
        self.f.reject_without_writes()  # An unrelated same-ID receipt is not the original native delivery.
        self.assertEqual(self.ack('ops_forwarded', self.receipt_ref['path']), 0)
        state = json.loads(self.f.state_path.read_bytes())
        with patch('learning_requests.time.time', return_value=3600):
            flow.reconcile(state, self.f.root, self.f.root / 'ops', 'silent', lambda _: False, 'fixed', None)
            flow.reconcile(state, self.f.root, self.f.root / 'ops', 'silent', lambda _: False, 'fixed', None)
        self.assertEqual(len(list(self.path.parent.glob('*.json'))), 1)
        self.assertEqual(len(list((self.f.directory / 'queue').glob('*.md'))), 1)
        self.assertFalse((self.f.root / 'ops/inbox-dev.md').exists())
        notice = json.loads(self.path.read_bytes())
        self.assertEqual(notice['id'], self.notice_id)
        self.assertFalse(notice['watcher_received'])
        self.assertFalse(notice['roy_notified'])
        self.source_ref = self.f.artifact('producer-source.json', {**self.source, 'extra': 'changed'})
        before = self.path.read_bytes()
        with self.assertRaises(SystemExit):
            self.register()
        self.assertEqual(self.path.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
