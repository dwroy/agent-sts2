"""Fixed manual launch and role proofs; never acknowledge production notices."""
import copy
import json
import sys
import unittest
from unittest.mock import patch

import test_ordinary_notice_ack as ordinary
flow = ordinary.flow


class ManualNoticeAck(unittest.TestCase):
    def setUp(self):
        self.f = ordinary.OrdinaryNoticeAck(methodName='runTest')
        self.addCleanup(self.f.doCleanups)
        self.f.setUp()
        f = self.f
        self.tree = f.root / '.worktrees/manual-v6'
        self.scratch = f.root / 'learner/runs/fixed-manual'
        self.original = {'items': [{'finding': '固定异议，不代表已发布', 'unknown': True}]}
        self.source = {'schema': 'manual-learning-notice-v1', 'request_id': 'roy-fixed-v6',
                       'task': 'v6-direction-experience', 'batch': 'v6-direction-fixed',
                       'character': 'silent', 'thread_id': '11111111-2222-3333-4444-555555555555',
                       'worktree': str(self.tree)}
        self.source['original_message'] = f.artifact('learner/runs/fixed-manual/disagreements.json', self.original)
        self.source['input'] = f.artifact('ops/codex-ops/learner/manual.inputs.json',
            {key: self.source[key] for key in ('request_id', 'task', 'batch', 'character')})
        self.events = [
            {'type': 'learner_launch', 'engine': 'codex', 'task': self.source['task'],
             'cwd': str(self.tree), 'prompt': 'Roy授权 ' + self.source['request_id'],
             'params': {'batch': self.source['batch'], 'worktree': str(self.tree),
                        'scratch': str(self.scratch), 'evidence': str(f.root / self.source['input']['path'])}},
            {'type': 'thread.started', 'thread_id': self.source['thread_id']},
            {'type': 'learner_summary', 'exit_code': 0}]
        self.write_events()
        for key in ('notification_only', 'registered_learning_request', 'source_batch', 'source_evidence'):
            f.notice.pop(key)
        f.notice.update(kind='learner-dissent', request_id=self.source['request_id'],
                        request_sha256=self.source['original_message']['sha256'],
                        message='固定转交前文\n' + json.dumps(self.original, ensure_ascii=False, indent=2))
        self.identify()

    def identify(self):
        n = self.f.notice
        n['id'] = flow.digest(flow.canonical([n['request_sha256'], n['kind'], n['message']]))[:24]
        self.f.notice_path = self.f.notice_path.with_name(n['id'] + '.json')

    def write_events(self):
        path = self.scratch.with_suffix('.jsonl')
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('\n'.join(json.dumps(row) for row in self.events) + '\n')
        self.source['original_log'] = {'path': str(path.relative_to(self.f.root)),
                                       'sha256': flow.digest(path.read_bytes())}

    def ack(self, stage, changes=None, with_source=True):
        f = self.f
        evidence = f.artifact(stage + '.delivery.json', {'actual_fixed_delivery': stage})
        receipt = f.artifact(stage + '.receipt.json', {
            'notice_id': f.notice['id'], 'stage': stage, 'actor': 'ops' if stage == 'ops_forwarded' else 'watcher',
            'status': 'delivered', 'evidence': evidence, **(changes or {})})
        argv = ['flow', 'ack', '--notice', f.notice['id'], '--stage', stage, '--receipt', receipt['path']]
        if with_source:
            ref = f.artifact('manual-source.json', self.source)
            argv += ['--source', ref['path']]
        with patch.object(sys, 'argv', argv):
            return flow.main()

    def reject(self, stage='ops_forwarded', changes=None, with_source=True):
        f = self.f
        flow.atomic(f.notice_path, f.notice)
        before = f.notice_path.read_bytes(), f.state_path.read_bytes()
        with self.assertRaises((SystemExit, ValueError, KeyError, OSError)):
            self.ack(stage, changes, with_source)
        self.assertEqual((f.notice_path.read_bytes(), f.state_path.read_bytes()), before)

    def test_original_manual_launch_accepts_independent_roles_without_scope_or_parent_rewrite(self):
        for task in ('v6-direction-experience', 'v6-reflex-distill', 'v6-build-cores'):
            for hash_input in (False, True):
                with self.subTest(task=task, hash_input=hash_input):
                    self.source['task'] = self.events[0]['task'] = task
                    if task == 'v6-build-cores':
                        self.f.notice['kind'] = 'disagreement'
                        self.original = ['固定第一项异议', '固定第二项异议']
                        self.source['original_message'] = self.f.artifact(
                            'learner/runs/fixed-manual/disagreements.json', self.original)
                        self.f.notice['message'] = '学习者异议原文：' + json.dumps(self.original, ensure_ascii=False) + '。来源保持。'
                    self.source['input'] = self.f.artifact('ops/codex-ops/learner/manual.inputs.json',
                        {key: self.source[key] for key in ('request_id', 'task', 'batch', 'character')})
                    self.write_events()
                    self.f.notice['request_sha256'] = self.source['input' if hash_input else 'original_message']['sha256']
                    self.identify()
                    for stage in ('ops_forwarded', 'watcher_received', 'roy_notified'):
                        self.f.notice[stage] = False
                    flow.atomic(self.f.notice_path, self.f.notice)
                    before = self.f.state_path.read_bytes()
                    log_before = self.scratch.with_suffix('.jsonl').read_bytes()
                    for stage in ('ops_forwarded', 'watcher_received', 'roy_notified'):
                        self.assertEqual(self.ack(stage), 0)
                    saved = json.loads(self.f.notice_path.read_bytes())
                    self.assertTrue(all(saved[stage] for stage in ('ops_forwarded', 'watcher_received', 'roy_notified')))
                    self.assertNotIn('notification_only', saved)
                    self.assertNotIn('source_kind', saved)
                    self.assertEqual(self.f.state_path.read_bytes(), before)
                    self.assertEqual(self.scratch.with_suffix('.jsonl').read_bytes(), log_before)

    def test_scope_identity_actor_stage_and_delivery_guards_still_reject(self):
        self.reject(with_source=False)
        self.reject(stage='watcher_received')
        original_source = self.source
        for malformed in ([], None, 'not an object'):
            self.source = malformed
            self.reject()
        self.source = original_source
        for changes in ({'actor': 'watcher'}, {'status': 'queued'}, {'character': 'ironclad'},
                        {'notice_id': 'f' * 24}, {'evidence': {'path': 'missing', 'sha256': 'a' * 64}}):
            self.reject(changes=changes)
        for key, value in (('source_kind', 'feature'), ('notification_only', True),
                           ('registered_learning_request', False)):
            self.f.notice[key] = value
            self.reject()
            self.f.notice.pop(key)
        self.f.state['learning_requests'][self.source['request_id']] = {'state': 'running'}
        flow.atomic(self.f.state_path, self.f.state)
        self.reject()

    def test_wrong_batch_thread_input_character_task_and_original_words_are_rejected(self):
        original = copy.deepcopy(self.source)
        for key, value in (('request_id', 'other-request'), ('batch', 'other-batch'),
                           ('thread_id', '22222222-2222-3333-4444-555555555555'),
                           ('character', 'ironclad'), ('task', 'postmortem'),
                           ('worktree', str(self.f.root / 'outside'))):
            self.source = {**original, key: value}
            self.reject()
        self.source = copy.deepcopy(original)
        self.source['input'] = self.f.artifact('ops/codex-ops/learner/foreign.inputs.json', {})
        self.reject()
        self.source = copy.deepcopy(original)
        self.source['original_message'] = self.f.artifact('learner/runs/fixed-manual/foreign.json', {'changed': True})
        self.reject()
        self.source = original
        self.f.notice['message'] = '固定转交前文，但不含原异议'
        self.identify()
        self.reject()

    def test_failed_ambiguous_launches_and_changed_frozen_bytes_are_rejected(self):
        original = copy.deepcopy(self.events)
        for events in (original[:-1], original + [original[0]],
                       original[:-1] + [{'type': 'learner_summary', 'exit_code': 1}],
                       original + [{'type': 'thread.started', 'thread_id': 'other'}]):
            self.events = events
            self.write_events()
            self.reject()
        self.events = original
        self.write_events()
        self.scratch.with_suffix('.jsonl').write_text('changed frozen log')
        self.reject()

    def test_external_symlink_and_traversal_sources_are_rejected(self):
        original = copy.deepcopy(self.source)
        link = self.f.root / 'learner/runs/alias.jsonl'
        link.symlink_to(self.scratch.with_suffix('.jsonl'))
        self.source['original_log']['path'] = str(link.relative_to(self.f.root))
        self.reject()
        self.source = copy.deepcopy(original)
        self.source['original_message']['path'] = str(self.scratch / '../fixed-manual/disagreements.json')
        self.reject()
        self.source = copy.deepcopy(original)
        self.source['original_log']['path'] = '/outside/events.jsonl'
        self.reject()


if __name__ == '__main__':
    unittest.main()
