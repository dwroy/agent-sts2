"""Fixed fake jobs: no games, model calls, hosting, credentials or live writes."""
import copy
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import learning_requests as flow


class FlowTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.directory = self.root / 'ops/codex-ops'
        self.directory.mkdir(parents=True)
        self.env = patch.dict(os.environ, {'CODEX_OPS_DIR': str(self.directory)})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.tree = self.root / '.worktrees/original'
        self.tree.mkdir(parents=True)
        (self.tree / '.git').write_text('gitdir: fake')
        self.thread = '11111111-2222-3333-4444-555555555555'
        self.req = {'schema': 'learning-request-v1', 'authorized_by': 'Roy', 'goal': 'experience-live',
                    'id': 'roy-learning-test', 'revision': 1, 'character': 'silent',
                    'original_batch': 'old', 'worktree': '.worktrees/original', 'thread_id': self.thread,
                    'requirements': ['damage-per-turn'], 'learner_home': '/fake/learner'}
        self.req['original_log'] = self.artifact('original.jsonl', '\n'.join(json.dumps(e) for e in [
            {'type': 'learner_launch', 'engine': 'codex', 'cwd': str(self.tree)},
            {'type': 'thread.started', 'thread_id': self.thread}]))
        self.req['input'] = self.artifact('input.md', 'Learn from fixed evidence')
        self.path = self.root / 'notes/learning-requests/roy-learning-test.json'
        self.write_request()
        self.state = {'batches': {'old': {'state': 'done', 'task': 'strategy-proposal',
                        'pid': 9, 'character': 'silent', 'worktree': str(self.tree), 'runs': ['A' * 12]}}}
        self.starts = []
        self.writer = patch('learner_jobs.external_writer', return_value=False)
        self.writer.start()
        self.addCleanup(self.writer.stop)

    def artifact(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
        return {'path': name, 'sha256': flow.digest(path.read_bytes())}

    def write_request(self):
        flow.atomic(self.path, self.req)

    def start(self, *args):
        self.starts.append(args)
        return 100, 'fake-pane'

    def tick(self, stamp='20261012-210000', live=(100,)):
        return flow.reconcile(self.state, self.root, self.root / 'ops', 'silent',
                              lambda pid: pid in live, stamp, self.start)

    def report(self, outcome='continue', **fields):
        return {'learning_result': {'request_id': self.req['id'], 'revision': self.req['revision'],
                'input_sha256': self.req['input']['sha256'], 'outcome': outcome,
                'checkpoint': 'new results at results.json, next verify live', **fields}}

    def finish(self, report, rc=0):
        flow.finish(self.state, self.root, self.directory, self.record()['batch'], rc, report)

    def record(self):
        return self.state['learning_requests'][self.req['id']]

    def test_report_done_continues_same_owner_once_without_rewriting_old(self):
        before = copy.deepcopy(self.state['batches']['old'])
        self.assertIsNotNone(self.tick())
        self.tick()
        self.assertEqual(len(self.starts), 1)
        batch = self.state['batches'][self.record()['batch']]
        self.assertEqual(batch['worktree'], str(self.tree))
        self.assertEqual(self.state['batches']['old'], before)
        self.assertEqual(self.record()['state'], 'running')

    def test_live_original_or_full_slots_do_not_spawn(self):
        self.state['batches']['old']['state'] = 'running'
        self.tick(live=(9,))
        self.assertEqual(self.starts, [])
        self.state['batches']['old']['state'] = 'done'
        self.state['batches']['a'] = {'task': 'strategy-proposal', 'state': 'running', 'pid': 1}
        self.state['batches']['b'] = {'task': 'strategy-proposal', 'state': 'running', 'pid': 2}
        self.tick(live=(1, 2))
        self.assertEqual(self.starts, [])

    def test_pending_owner_wait_becomes_visible_without_duplicate_dispatch(self):
        self.state['batches']['old']['state'] = 'running'
        self.tick(live=(9,))
        self.record()['pending_since'] = 1
        self.tick(live=(9,))
        self.assertEqual(self.starts, [])
        self.assertEqual(self.record()['state'], 'pending')
        self.assertEqual(len(list((self.directory / 'learning-notices').glob('*.json'))), 1)

    def test_frozen_input_change_and_wrong_thread_fail_closed(self):
        (self.root / 'input.md').write_text('changed')
        self.tick()
        self.assertEqual(self.record()['state'], 'blocked')
        self.assertEqual(self.starts, [])
        self.assertEqual(len(list((self.directory / 'queue').glob('*.md'))), 1)
        self.tick()
        self.assertEqual(len(list((self.directory / 'queue').glob('*.md'))), 1)

    def test_thread_provenance(self):
        self.req['thread_id'] = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
        self.write_request()
        self.tick()
        self.assertEqual(self.record()['state'], 'blocked')
        self.assertEqual(self.starts, [])

    def test_process_gone_without_receipt_is_visible(self):
        self.tick()
        self.tick(live=())
        self.assertEqual(self.record()['state'], 'blocked')
        self.assertEqual(len(list((self.directory / 'learning-notices').glob('*.json'))), 1)

    def test_report_success_does_not_complete_learning(self):
        self.tick()
        self.finish({'research_complete': True, 'merged': None})
        self.assertEqual(self.record()['state'], 'blocked')

    def test_partial_continues_and_identical_progress_alerts(self):
        self.tick()
        self.finish(self.report())
        self.assertEqual(self.record()['state'], 'pending')
        self.record()['retry_at'] = 0
        self.tick('20261012-220000', live=())
        self.finish(self.report())
        self.assertEqual(self.record()['state'], 'blocked')
        self.assertIn('无新增进度', self.record()['reason'])

    def test_new_revision_during_running_is_not_closed_by_old_result(self):
        self.tick()
        old = self.report()
        self.req['revision'] = 2
        self.write_request()
        self.tick()
        self.finish(old)
        self.assertEqual(self.record()['state'], 'pending')
        self.assertEqual(self.record()['revision'], 2)
        self.assertEqual(len(self.starts), 1)

    def test_disagreement_is_preserved_and_delivery_retried(self):
        self.tick()
        question = {'claim': 'old lesson', 'finding': 'counterexample', 'evidence': ['A' * 12],
                    'recommendation': 'qualify scope'}
        self.finish(self.report('questioned', reason='evidence conflicts', questions=[question]))
        self.assertEqual(self.record()['state'], 'questioned')
        self.assertEqual(self.record()['questions'], [question])
        notices = list((self.directory / 'learning-notices').glob('*.json'))
        self.assertEqual(len(notices), 2)
        for p in notices:
            notice = json.loads(p.read_text())
            self.assertFalse(notice['roy_notified'])
            notice['last_queued_at'] = 1
            flow.atomic(p, notice)
        count = len(list((self.directory / 'queue').glob('*.md')))
        self.tick()
        self.assertEqual(len(list((self.directory / 'queue').glob('*.md'))), count + 2)
        self.assertEqual(len(self.starts), 1)

    def test_supplement_arriving_before_finish_without_a_tick_stays_pending(self):
        self.tick()
        old = self.report()
        self.req['revision'] = 2
        self.write_request()
        self.finish(old)
        self.assertEqual(self.record()['state'], 'pending')
        self.assertEqual(self.record()['revision'], 2)

    def test_completed_requires_actual_entries_and_consumer_receipt(self):
        report = self.report('complete')
        with self.assertRaisesRegex(ValueError, 'commit'):
            flow.verify_experience(self.root, self.req, report)
        report['merged'] = 'a' * 40
        entry = {'id': 'lesson', 'status': 'active', 'evidence': ['A' * 12], 'lesson': 'supported observation'}
        path = self.root / '.worktrees/live/knowledge/characters/silent/experience.json'
        flow.atomic(path, {'version': 'test.1', 'entries': [entry]})
        report['learning_result']['coverage'] = {'damage-per-turn': [{'id': 'lesson', 'sha256': flow.digest(flow.canonical(entry))}]}
        report['learning_result']['consumer_receipt'] = self.artifact('consumer.json', json.dumps({
            'request_id': self.req['id'], 'revision': 1, 'character': 'silent', 'experience_version': 'test.1',
            'kind': 'fixed-consumer', 'status': 'passed', 'evidence': [self.artifact('probe.txt', 'actual fixed input/output')]}))
        with patch('learning_requests.subprocess.run') as run:
            run.return_value.returncode = 0
            self.assertEqual(flow.verify_experience(self.root, self.req, report)['outcome'], 'complete')
            report['learning_result']['coverage']['damage-per-turn'][0]['sha256'] = 'bad'
            with self.assertRaisesRegex(ValueError, 'hash mismatch'):
                flow.verify_experience(self.root, self.req, report)

    def test_verified_learning_waits_for_all_delivery_acknowledgements(self):
        self.tick()
        report = self.report('complete')
        report['merged'] = 'a' * 40
        with patch('learning_requests.verify_experience', return_value=report['learning_result']), patch('learner_checks.proposal_tools') as proposals:
            proposals.return_value.links.return_value = []
            self.finish(report)
        self.assertEqual(self.record()['state'], 'awaiting_delivery')
        flow.atomic(self.directory / 'learn.json', self.state)
        notice = self.record()['notices'][0]
        evidence = self.artifact('actual-message.txt', 'delivered fixed message')
        with patch.dict(os.environ, {'CODEX_OPS_ROOT': str(self.root)}):
            for stage, actor in [('ops_forwarded', 'ops'), ('watcher_received', 'watcher'), ('roy_notified', 'watcher')]:
                receipt = self.root / (stage + '.json')
                flow.atomic(receipt, {'notice_id': notice, 'stage': stage, 'actor': actor,
                                     'status': 'delivered', 'evidence': evidence})
                with patch.object(sys, 'argv', ['flow', 'ack', '--notice', notice, '--stage', stage, '--receipt', str(receipt)]):
                    self.assertEqual(flow.main(), 0)
                state = json.loads((self.directory / 'learn.json').read_bytes())
                self.assertEqual(state['learning_requests'][self.req['id']]['state'],
                                 'completed' if stage == 'roy_notified' else 'awaiting_delivery')

    def test_changed_revision_without_increment_is_blocked(self):
        self.tick()
        self.finish(self.report())
        self.req['requirements'].append('startup-cost')
        self.write_request()
        self.tick()
        self.assertEqual(self.record()['state'], 'blocked')


if __name__ == '__main__':
    unittest.main()
