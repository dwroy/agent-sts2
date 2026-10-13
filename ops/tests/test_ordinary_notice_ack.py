"""Fixed delivery proofs only: no real notices, acknowledgements, models or network."""
import copy
import json
import os
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import learning_requests as flow


class OrdinaryNoticeAck(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.directory = self.root / 'ops/codex-ops'
        self.directory.mkdir(parents=True)
        self.proposal_id = 'silent-proposal-' + '1' * 16
        self.sha = 'a' * 64
        self.source = {'proposal_id': self.proposal_id, 'batch': '20261013-000000-strategy-proposal',
                       'original_proposal_sha256': self.sha}
        self.notice = {'request_id': self.proposal_id, 'request_sha256': self.sha,
                       'message': '固定异议，仅通知', 'kind': 'disagreement',
                       'notification_only': True, 'registered_learning_request': False,
                       'source_batch': self.source['batch'], 'ops_forwarded': False,
                       'watcher_received': False, 'roy_notified': False}
        self.notice['id'] = flow.digest(flow.canonical([self.sha, self.notice['kind'], self.notice['message']]))[:24]
        self.notice['source_evidence'] = self.artifact('source.json', self.source)
        self.notice_path = self.directory / 'learning-notices' / (self.notice['id'] + '.json')
        self.state = {'batches': {}, 'learning_requests': {'other-request': {'state': 'running', 'sentinel': 1}}}
        self.state_path = self.directory / 'learn.json'
        flow.atomic(self.state_path, self.state)
        self.registry = {self.proposal_id: {'character': 'silent', 'proposal_sha256': self.sha}}
        library = patch('proposal_dispatch.library', return_value=SimpleNamespace(
            QUEUE='fixed-registry', fold=lambda _: self.registry))
        library.start(); self.addCleanup(library.stop)
        env = patch.dict(os.environ, {'CODEX_OPS_ROOT': str(self.root), 'CODEX_OPS_DIR': str(self.directory)})
        env.start(); self.addCleanup(env.stop)

    def artifact(self, name, value):
        path = self.root / name
        flow.atomic(path, value)
        return {'path': name, 'sha256': flow.digest(path.read_bytes())}

    def ack(self, stage='ops_forwarded', payload_changes=None):
        evidence = self.artifact(stage + '.delivery.json', {'actual_fixed_delivery': stage})
        payload = {'notice_id': self.notice['id'], 'stage': stage,
                   'actor': 'ops' if stage == 'ops_forwarded' else 'watcher',
                   'status': 'delivered', 'evidence': evidence}
        payload.update(payload_changes or {})
        receipt = self.root / (stage + '.receipt.json')
        flow.atomic(receipt, payload)
        with patch.object(sys, 'argv', ['flow', 'ack', '--notice', self.notice['id'],
                                      '--stage', stage, '--receipt', str(receipt)]):
            return flow.main()

    def reject_without_writes(self, stage='ops_forwarded', payload_changes=None):
        flow.atomic(self.notice_path, self.notice)
        before_notice = self.notice_path.read_bytes()
        before_state = self.state_path.read_bytes()
        with self.assertRaises((SystemExit, ValueError, KeyError, OSError)):
            self.ack(stage, payload_changes)
        self.assertEqual(self.notice_path.read_bytes(), before_notice)
        self.assertEqual(self.state_path.read_bytes(), before_state)

    def test_ordinary_delivery_chain_never_creates_or_closes_a_learning_parent(self):
        flow.atomic(self.notice_path, self.notice)
        before = self.state_path.read_bytes()
        for stage in ('ops_forwarded', 'watcher_received', 'roy_notified'):
            self.assertEqual(self.ack(stage), 0)
            notice = json.loads(self.notice_path.read_bytes())
            self.assertTrue(notice[stage])
            self.assertEqual(self.state_path.read_bytes(), before)

    def test_unknown_or_implicit_scope_is_rejected_before_persisting(self):
        for mode in ('implicit', 'unknown', 'forged-source', 'wrong-character', 'wrong-proposal-sha'):
            with self.subTest(mode=mode):
                original = copy.deepcopy(self.notice)
                original_registry = copy.deepcopy(self.registry)
                if mode == 'implicit':
                    self.notice.pop('notification_only')
                elif mode == 'unknown':
                    self.registry.clear()
                elif mode == 'forged-source':
                    source = dict(self.source, proposal_id='silent-proposal-' + '2' * 16)
                    self.notice['source_evidence'] = self.artifact('forged-source.json', source)
                elif mode == 'wrong-character':
                    self.registry[self.proposal_id]['character'] = 'other'
                else:
                    self.registry[self.proposal_id]['proposal_sha256'] = 'b' * 64
                self.reject_without_writes()
                self.notice = original; self.registry = original_registry

    def test_second_strategy_slot_preserves_batch_identity_and_delivery_guards(self):
        before = self.state_path.read_bytes()
        for batch in ('20261013-224302-s2-strategy-proposal', '20261013-224302-strategy-proposal-s2'):
            with self.subTest(batch=batch):
                self.source['batch'] = batch
                self.notice['source_batch'] = batch
                self.notice['source_evidence'] = self.artifact('source.json', self.source)
                for stage in ('ops_forwarded', 'watcher_received', 'roy_notified'):
                    self.notice[stage] = False
                self.reject_without_writes(stage='watcher_received')
                for stage in ('ops_forwarded', 'watcher_received', 'roy_notified'):
                    self.assertEqual(self.ack(stage), 0)
                saved = json.loads(self.notice_path.read_bytes())
                self.assertEqual(saved['source_batch'], batch)
                self.assertEqual(saved['source_evidence'], self.notice['source_evidence'])
                self.assertEqual(self.state_path.read_bytes(), before)

        for batch in ('20261013-224302-s3-strategy-proposal', '20261013-224302-s2-postmortem',
                      '20261013-224302-s2-experience-update', '20261013-224302-s2-strategy-proposal-s2',
                      '20261013-224302-s2-strategy-proposal-extra', 'prefix-20261013-224302-s2-strategy-proposal'):
            with self.subTest(invalid_batch=batch):
                self.source['batch'] = batch
                self.notice['source_batch'] = batch
                self.notice['source_evidence'] = self.artifact('source.json', self.source)
                self.reject_without_writes()

        # A valid shape must still match the exact frozen source batch.
        self.notice['source_batch'] = '20261013-224302-s2-strategy-proposal'
        self.source['batch'] = '20261013-224303-s2-strategy-proposal'
        self.notice['source_evidence'] = self.artifact('source.json', self.source)
        self.reject_without_writes()

    def test_wrong_actor_and_character_and_missing_stage_and_bad_evidence_sha_are_rejected(self):
        self.reject_without_writes(payload_changes={'actor': 'watcher'})
        self.reject_without_writes(payload_changes={'character': 'other'})
        self.reject_without_writes(payload_changes={'evidence': {'path': 'ops_forwarded.delivery.json', 'sha256': 'b' * 64}})
        self.reject_without_writes(stage='watcher_received')
        self.notice['source_evidence']['sha256'] = 'b' * 64
        self.reject_without_writes()

    def test_registered_request_still_requires_every_notice_delivery(self):
        self.notice.pop('notification_only'); self.notice.pop('registered_learning_request')
        other_id = 'f' * 24
        other_path = self.notice_path.with_name(other_id + '.json')
        flow.atomic(other_path, {'roy_notified': False})
        self.state['learning_requests'][self.proposal_id] = {'state': 'awaiting_delivery',
                                                            'notices': [self.notice['id'], other_id]}
        flow.atomic(self.state_path, self.state)
        flow.atomic(self.notice_path, self.notice)
        for stage in ('ops_forwarded', 'watcher_received', 'roy_notified'):
            self.assertEqual(self.ack(stage), 0)
        self.assertEqual(json.loads(self.state_path.read_bytes())['learning_requests'][self.proposal_id]['state'], 'awaiting_delivery')
        flow.atomic(other_path, {'roy_notified': {'path': 'fixed', 'sha256': self.sha}})
        self.assertEqual(self.ack('roy_notified'), 0)
        self.assertEqual(json.loads(self.state_path.read_bytes())['learning_requests'][self.proposal_id]['state'], 'completed')


if __name__ == '__main__':
    unittest.main()
