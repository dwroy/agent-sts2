"""Fixed legacy continuation proofs; no real deliveries or acknowledgements."""
import copy
import json
import unittest

from test_ordinary_notice_ack import OrdinaryNoticeAck, flow


class LegacyContinuationNoticeAck(unittest.TestCase):
    def setUp(self):
        self.f = OrdinaryNoticeAck(methodName='runTest')
        self.addCleanup(self.f.doCleanups)
        self.f.setUp()
        f = self.f
        self.batch = '20261015-001829-fix-batch'
        self.parent = '20261014-061302-fix-batch'
        self.thread = '01a13753-c032-73f0-aa3f-ddc0e14809cd'
        self.request = 'v5-boss-revalidation-20261014-approved-supplement'
        self.tree = f.root / '.worktrees/silent-calibration'
        self.scratch = f.root / 'learner/runs/fixed-continuation'
        self.scratch.mkdir(parents=True)
        self.frozen = f.artifact('approved-input.json', {'supplement_id': self.request,
            'parent_batch': self.parent, 'same_thread': self.thread})
        self.evidence = f.artifact('counterexamples.json', {'original': '固定原反证'})
        self.source = {'supplement_id': self.request, 'parent_batch': self.parent,
                       'thread': self.thread, 'evidence': self.evidence}
        self.source_ref = f.artifact('learner/runs/fixed-continuation/producer.json', self.source)
        original = flow.artifact(f.root, self.source_ref)
        f.notice.update(source_kind='legacy-continuation', request_id=self.request,
                        source_batch=self.batch, character='silent', original_parent_batch=self.parent,
                        original_thread=self.thread, message=original.decode(), request_sha256=flow.digest(original),
                        source_evidence=self.source_ref, counterexamples=self.evidence)
        f.notice['id'] = flow.digest(flow.canonical([
            f.notice['request_sha256'], f.notice['kind'], f.notice['message']]))[:24]
        f.notice_path = f.notice_path.with_name(f.notice['id'] + '.json')
        f.state['batches'][self.parent] = {'task': 'fix-batch', 'character': 'silent',
                                          'worktree': str(self.tree), 'state': 'done'}
        f.state['batches'][self.batch] = {'task': 'fix-batch', 'character': 'silent',
            'worktree': str(self.tree), 'state': 'failed', 'rc': 0, 'merged': None,
            'continuation_parent_batch': self.parent, 'resume_thread': self.thread,
            'continuation_supplement_id': self.request, 'continuation_input': self.frozen,
            'report': {'report': str(self.scratch / 'report.md')}}
        command = ['codex', 'exec', 'resume', '--json', self.thread, '-']
        command_sha = flow.digest(json.dumps([command[0], command[1:], str(self.tree)],
                                            ensure_ascii=False, separators=(',', ':')).encode())
        identity = {'batch': self.batch, 'input_sha256': 'a' * 64, 'command_sha256': command_sha}
        self.events = [
            {'type': 'learner_launch', 'engine': 'codex', 'task': 'fix-batch', 'cwd': str(self.tree),
             'params': {'scratch': str(self.scratch)}, 'command': command,
             'prompt': self.request + ' ' + self.frozen['sha256']},
            {'type': 'learner_startup_attempt', **identity},
            {'type': 'thread.started', 'thread_id': self.thread},
            {'type': 'learner_resume_ack', 'thread_id': self.thread, 'first_message_sha256': 'b' * 64, **identity}]
        self.write_events()
        flow.atomic(f.state_path, f.state)

    def write_events(self):
        self.scratch.with_suffix('.jsonl').write_text('\n'.join(json.dumps(row) for row in self.events) + '\n')

    def test_existing_legacy_identity_accepts_independent_actor_receipts_without_rewriting_failed_batch(self):
        f = self.f
        flow.atomic(f.notice_path, f.notice)
        before_state = f.state_path.read_bytes()
        before_log = self.scratch.with_suffix('.jsonl').read_bytes()
        for stage in ('ops_forwarded', 'watcher_received', 'roy_notified'):
            for _ in range(2):
                self.assertEqual(f.ack(stage, {'character': 'silent'}), 0)
        self.assertEqual(f.state_path.read_bytes(), before_state)
        self.assertEqual(self.scratch.with_suffix('.jsonl').read_bytes(), before_log)
        saved = json.loads(f.notice_path.read_bytes())
        self.assertTrue(all(saved[stage] for stage in ('ops_forwarded', 'watcher_received', 'roy_notified')))
        self.assertNotIn(self.request, f.state['learning_requests'])

    def test_forged_registry_frozen_input_and_producer_words_are_rejected_atomically(self):
        f = self.f
        baseline = copy.deepcopy(f.state)
        for key, value in [('character', 'ironclad'), ('resume_thread', '0' * 36),
                           ('continuation_parent_batch', 'missing'), ('continuation_supplement_id', 'unknown'),
                           ('feature_request', 'fake-parent'), ('worktree', str(f.root / 'other')),
                           ('continuation_input', {'path': 'approved-input.json', 'sha256': 'c' * 64})]:
            with self.subTest(key=key):
                f.state = copy.deepcopy(baseline)
                f.state['batches'][self.batch][key] = value
                flow.atomic(f.state_path, f.state)
                f.reject_without_writes()
        f.state = baseline
        flow.atomic(f.state_path, baseline)
        for changes in ({'character': 'ironclad'}, {'actor': 'watcher'}, {'status': 'queued'}):
            f.reject_without_writes(payload_changes=changes)
        f.notice['source_evidence']['sha256'] = 'd' * 64
        f.reject_without_writes()

    def test_missing_or_cross_batch_native_consumption_and_collided_logs_are_rejected(self):
        original = copy.deepcopy(self.events)
        for change in ('missing-ack', 'wrong-input', 'wrong-command', 'wrong-batch', 'wrong-thread', 'wrong-prompt', 'collision'):
            with self.subTest(change=change):
                self.events = copy.deepcopy(original)
                if change == 'missing-ack': self.events.pop()
                elif change == 'wrong-input': self.events[-1]['input_sha256'] = 'e' * 64
                elif change == 'wrong-command': self.events[0]['command'][-2] = 'other'
                elif change == 'wrong-batch': self.events[-1]['batch'] = self.parent
                elif change == 'wrong-thread': self.events[-1]['thread_id'] = 'other'
                elif change == 'wrong-prompt': self.events[0]['prompt'] = self.request
                else: self.events.append(copy.deepcopy(self.events[0]))
                self.write_events()
                self.f.reject_without_writes()

    def test_actor_stage_and_preceding_delivery_guards_remain_required(self):
        f = self.f
        f.reject_without_writes(stage='watcher_received')
        flow.atomic(f.notice_path, f.notice)
        self.assertEqual(f.ack('ops_forwarded'), 0)
        f.notice = json.loads(f.notice_path.read_bytes())
        f.reject_without_writes(stage='roy_notified')
        f.reject_without_writes(stage='watcher_received', payload_changes={'actor': 'ops'})
        f.reject_without_writes(stage='watcher_received', payload_changes={'character': 'ironclad'})


if __name__ == '__main__':
    unittest.main()
