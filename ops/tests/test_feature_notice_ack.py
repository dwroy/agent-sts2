"""Frozen feature delivery proofs; no real ACKs, models or network."""
import copy
import json
from pathlib import Path
import unittest

from test_ordinary_notice_ack import OrdinaryNoticeAck, flow


class FeatureNoticeAck(unittest.TestCase):
    def setUp(self):
        self.fixture = OrdinaryNoticeAck(methodName='runTest')
        self.addCleanup(self.fixture.doCleanups)
        self.fixture.setUp()
        f = self.fixture
        self.batch = '20261014-061302-fix-batch'
        self.tree = f.root / '.worktrees/silent-boss-calibration'
        self.thread = '01a13753-c032-73f0-aa3f-ddc0e14809cd'
        log = self.tree / 'learner/runs/fixed-feature.jsonl'
        log.parent.mkdir(parents=True)
        log.write_text('\n'.join(json.dumps(event) for event in [
            {'type': 'learner_launch', 'engine': 'codex', 'cwd': str(self.tree), 'task': 'silent-boss-calibration'},
            {'type': 'thread.started', 'thread_id': self.thread}]) + '\n')
        message = log.with_suffix('') / 'message.md'
        message.parent.mkdir()
        message.write_text('固定校准反证；未声明 watcher 已读或 Roy 已知。')
        self.source = {'feature_request': 'silent-calibration-' + 'b' * 24, 'batch': self.batch,
                       'character': 'silent', 'worktree': str(self.tree), 'thread_id': self.thread,
                       'original_log': self.ref(log), 'original_message': self.ref(message)}
        f.notice.update(request_id=self.source['feature_request'], source_kind='feature',
                        character='silent', source_batch=self.batch, message=message.read_text(),
                        request_sha256=flow.digest(message.read_bytes()),
                        source_evidence=f.artifact('feature-source.json', self.source))
        f.notice['id'] = flow.digest(flow.canonical([
            f.notice['request_sha256'], f.notice['kind'], f.notice['message']]))[:24]
        f.notice_path = f.notice_path.with_name(f.notice['id'] + '.json')
        f.state['batches'][self.batch] = {'task': 'fix-batch', 'learner_task': 'silent-boss-calibration',
                                        'character': 'silent', 'feature_request': self.source['feature_request'],
                                        'worktree': str(self.tree), 'state': 'done',
                                        'report': {'report': str(message.parent / 'report.md')}}
        flow.atomic(f.state_path, f.state)

    def ref(self, path):
        return {'path': str(path.relative_to(self.fixture.root)), 'sha256': flow.digest(path.read_bytes())}

    def test_registered_feature_delivery_is_idempotent_and_never_creates_a_learning_parent(self):
        f = self.fixture
        flow.atomic(f.notice_path, f.notice)
        before = f.state_path.read_bytes()
        for stage in ('ops_forwarded', 'watcher_received', 'roy_notified'):
            for _ in range(2):
                # Original receipts bind the character through the notice rather than repeating it.
                self.assertEqual(f.ack(stage), 0)
        saved = json.loads(f.notice_path.read_bytes())
        self.assertTrue(all(saved[stage] for stage in ('ops_forwarded', 'watcher_received', 'roy_notified')))
        self.assertEqual(f.state_path.read_bytes(), before)

    def test_wrong_feature_batch_thread_character_and_original_words_are_rejected_before_writes(self):
        f = self.fixture
        for key, value in [('feature_request', 'unknown'), ('batch', '20261014-061303-fix-batch'),
                           ('thread_id', '01a13753-c032-73f0-aa3f-ddc0e14809ce'),
                           ('character', 'ironclad'), ('worktree', str(f.root / '.worktrees/other')),
                           ('original_log', {'path': 'missing', 'sha256': 'a' * 64}),
                           ('original_message', {'path': 'missing', 'sha256': 'a' * 64})]:
            with self.subTest(key=key):
                f.notice['source_evidence'] = f.artifact('feature-source.json', {**self.source, key: value})
                f.reject_without_writes(payload_changes={'character': 'silent'})
        f.notice['source_evidence'] = f.artifact('feature-source.json', self.source)
        for key, value in [('feature_request', 'other'), ('learner_task', 'unknown'), ('character', 'ironclad')]:
            with self.subTest(registry_key=key):
                before = copy.deepcopy(f.state)
                f.state['batches'][self.batch][key] = value
                flow.atomic(f.state_path, f.state)
                f.reject_without_writes(payload_changes={'character': 'silent'})
                f.state = before
                flow.atomic(f.state_path, f.state)
        original = f.notice['message']
        f.notice['message'] += '伪造后缀'
        f.notice['id'] = flow.digest(flow.canonical([
            f.notice['request_sha256'], f.notice['kind'], f.notice['message']]))[:24]
        f.notice_path = f.notice_path.with_name(f.notice['id'] + '.json')
        f.reject_without_writes(payload_changes={'character': 'silent'})
        self.assertNotEqual(f.notice['message'], original)

    def test_feature_delivery_keeps_stage_actor_sha_and_character_guards(self):
        f = self.fixture
        f.reject_without_writes(stage='watcher_received', payload_changes={'character': 'silent'})
        for changes in ({'character': 'ironclad'}, {'character': 'silent', 'actor': 'watcher'},
                        {'character': 'silent', 'status': 'queued'},
                        {'character': 'silent', 'evidence': {'path': 'missing', 'sha256': 'a' * 64}}):
            f.reject_without_writes(payload_changes=changes)


if __name__ == '__main__':
    unittest.main()
