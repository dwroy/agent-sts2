"""Frozen delivery-chain fixtures; never acknowledge a real notification."""
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import test_ordinary_notice_ack as fixtures
import learning_requests as flow


class PriorDeliveryProofs(unittest.TestCase):
    setUp = fixtures.OrdinaryNoticeAck.setUp
    artifact = fixtures.OrdinaryNoticeAck.artifact
    ack = fixtures.OrdinaryNoticeAck.ack

    def chain(self, registered=False, through='ops_forwarded'):
        if registered:
            self.notice.pop('notification_only', None)
            self.notice.pop('registered_learning_request', None)
            self.state['learning_requests'][self.proposal_id] = {
                'state': 'awaiting_delivery', 'notices': [self.notice['id']]}
            flow.atomic(self.state_path, self.state)
        flow.atomic(self.notice_path, self.notice)
        stages = ('ops_forwarded', 'watcher_received', 'roy_notified')
        for stage in stages[:stages.index(through) + 1]:
            self.assertEqual(self.ack(stage), 0)

    def reject_unchanged(self, stage):
        before = self.notice_path.read_bytes(), self.state_path.read_bytes()
        with self.assertRaises(SystemExit):
            self.ack(stage)
        self.assertEqual((self.notice_path.read_bytes(), self.state_path.read_bytes()), before)

    def test_changed_previous_receipt_or_delivery_bytes_are_rejected_before_persistence(self):
        for registered in (False, True):
            for filename in ('ops_forwarded.receipt.json', 'ops_forwarded.delivery.json'):
                with self.subTest(registered=registered, filename=filename):
                    self.chain(registered)
                    (self.root / filename).write_text('{}')
                    self.reject_unchanged('watcher_received')

    def test_correct_sha_does_not_authorize_a_forged_previous_actor_or_stage(self):
        for key, value in (('actor', 'watcher'), ('stage', 'watcher_received'),
                           ('notice_id', 'f' * 24), ('status', 'queued')):
            with self.subTest(key=key):
                self.chain()
                receipt = self.root / 'ops_forwarded.receipt.json'
                payload = json.loads(receipt.read_bytes())
                payload[key] = value
                flow.atomic(receipt, payload)
                notice = json.loads(self.notice_path.read_bytes())
                notice['ops_forwarded']['sha256'] = flow.digest(receipt.read_bytes())
                flow.atomic(self.notice_path, notice)
                self.reject_unchanged('watcher_received')

    def test_roy_delivery_rechecks_ops_proof_after_watcher_confirmation(self):
        for registered in (False, True):
            with self.subTest(registered=registered):
                self.chain(registered, through='watcher_received')
                (self.root / 'ops_forwarded.delivery.json').write_text('{}')
                self.reject_unchanged('roy_notified')

    def test_missing_or_malformed_previous_reference_is_rejected_without_writes(self):
        for ref in (True, {'path': 'missing.json', 'sha256': 'a' * 64}):
            with self.subTest(ref=ref):
                self.chain()
                notice = json.loads(self.notice_path.read_bytes())
                notice['ops_forwarded'] = ref
                flow.atomic(self.notice_path, notice)
                self.reject_unchanged('watcher_received')

    def test_valid_immutable_chain_keeps_registered_completion_and_ordinary_scope(self):
        for registered in (False, True):
            with self.subTest(registered=registered):
                self.chain(registered, through='roy_notified')
                state = json.loads(self.state_path.read_bytes())
                self.assertEqual(state['learning_requests'].get(self.proposal_id),
                                 {'state': 'completed', 'notices': [self.notice['id']]} if registered else None)
                self.assertEqual(state['learning_requests']['other-request'], self.state['learning_requests']['other-request'])


if __name__ == '__main__':
    unittest.main()
