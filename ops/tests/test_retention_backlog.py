"""Fixed temporary repositories; no production data, sessions or game are touched."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parent))
import test_learner_retention as fixtures
r = fixtures.retention
import refresh_retention
import retention_metrics
import strategy_external_jobs as external
import strategy_backfill_jobs as shared


class Backlog(unittest.TestCase):
    setUp = fixtures.LearnerRetention.setUp
    git = fixtures.LearnerRetention.git
    save = fixtures.LearnerRetention.save
    run_cleanup = fixtures.LearnerRetention.run_cleanup

    def tui(self):
        self.batch.update(external_source='fixed-plan', external_lane='A')
        native = self.root / 'native.jsonl'
        rows = [
            dict(type='session_meta', payload=dict(id='thread', cwd=str(self.tree))),
            dict(type='event_msg', payload=dict(type='task_started', turn_id='turn')),
            dict(type='event_msg', payload=dict(type='user_message', message='marker\nfixed task')),
            dict(type='event_msg', payload=dict(type='task_complete', turn_id='turn', last_agent_message='report'))]
        native.write_text(''.join(json.dumps(row) + '\n' for row in rows))
        self.usage = self.scratch / 'run-usage.jsonl'
        self.usage.write_text(json.dumps(dict(type='learner_summary', exit_code=0, summary=dict(sessionId='thread'))) + '\n')
        self.referenced = self.scratch / 'receipt-reference.bin'
        self.referenced.write_bytes(b'consumer proof' * 20000)
        import learner_tui
        prompt = learner_tui.prompt_hash('marker\nfixed task')
        self.receipt = self.directory / 'learner' / ('learner-' + self.bid + '.tui.json')
        self.value = dict(state='session-ended', retirement_authorized=True, submitted=True, cwd=str(self.tree),
            submissions=[dict(marker='marker', prompt_sha256=prompt)],
            bindings=[dict(marker='marker', prompt_sha256=prompt, turn_id='turn')],
            pid=os.getpid(), birth='prior-process-birth',
            result=dict(code=0, stopped=True, session='thread', turn='turn', message='report', rollout=str(native)),
            artifacts=dict(log=str(self.usage), sha256=hashlib.sha256(self.usage.read_bytes()).hexdigest(), summary=True),
            original_dependency=dict(path=str(self.referenced)))
        r.atomic(self.receipt, self.value)
        self.save()

    def test_done_one_sweep_restores_without_closing_knowledge_or_request(self):
        self.report.update(commit=None, merged=None)
        self.batch['learning_request'] = 'still-open'
        self.save()
        result = r.sweep(self.root, self.directory, True, 4)
        self.assertEqual(result['results'][0]['state'], 'reclaimed')
        self.assertTrue((self.tree / '.git').exists())
        self.assertFalse((self.scratch / 'raw-states.jsonl').exists())
        self.assertEqual(r.load(self.directory / 'learn.json')['batches'][self.bid]['learning_request'], 'still-open')
        r.restore(self.root, self.directory, self.bid)
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)
        self.assertEqual(r.sweep(self.root, self.directory, True, 4)['results'][0]['state'], 'reclaimed')

    def test_original_launcher_restores_before_input_and_thread_validation(self):
        import learning_requests as flow
        thread = '11111111-2222-3333-4444-555555555555'
        self.original_stream.write_text('\n'.join(json.dumps(row) for row in [
            dict(type='learner_launch', engine='codex', cwd=str(self.tree)),
            dict(type='thread.started', thread_id=thread)]) + '\n')
        source = self.scratch / 'large-input.txt'
        source.write_bytes(b'original frozen input\n' * 10000)
        req = dict(schema='learning-request-v1', authorized_by='Roy', goal='experience-live', id='roy-fixed', revision=1,
                   character='silent', original_batch=self.bid, worktree=str(self.tree.relative_to(self.root)),
                   thread_id=thread, requirements=['fixed-requirement'],
                   original_log=dict(path=str(self.original_stream), sha256=r.sha_file(self.original_stream)),
                   input=dict(path=str(source), sha256=r.sha_file(source)))
        self.assertEqual(self.run_cleanup()['state'], 'reclaimed')
        self.assertFalse(source.exists())
        path = self.root / 'notes/learning-requests/roy-fixed.json'
        r.atomic(path, req)
        with patch.dict(os.environ, CODEX_OPS_DIR=str(self.directory)):
            with r.locks([self.directory / 'learn.lock']):
                loaded, _ = flow.read_request(self.root, path, learn_locked=True, restore_original=True)
        self.assertEqual(loaded, req)
        self.assertEqual(r.sha_file(source), req['input']['sha256'])
        self.assertTrue((self.tree / '.git').exists())

    def test_lane_and_global_worker_retirement_survive_compression(self):
        self.tui()
        before = self.receipt.read_bytes(), self.receipt.stat().st_mtime_ns
        self.run_cleanup(False)
        self.assertEqual((self.receipt.read_bytes(), self.receipt.stat().st_mtime_ns), before)
        self.assertEqual(external.lane_owners(self.state, lambda _: False, self.directory), [])
        usage, referenced = self.usage.read_bytes(), self.referenced.read_bytes()
        self.assertEqual(self.run_cleanup()['state'], 'reclaimed')
        self.assertEqual(self.usage.read_bytes(), usage)
        self.assertEqual(self.referenced.read_bytes(), referenced)
        manifest = r.load(self.directory / 'retention/archives' / (self.bid + '.manifest.json'))
        self.assertNotIn(str(self.usage.relative_to(self.root)), [row['path'] for row in manifest['files']])
        shared.retired(self.bid, self.batch, self.directory)
        self.assertEqual(external.lane_owners(self.state, lambda _: False, self.directory), [])
        self.assertEqual(external.active_external(self.state, lambda _: False, self.directory), [])
        self.assertFalse((self.scratch / 'raw-states.jsonl').exists())

    def test_missing_runtime_proof_skips_batch_with_visible_bytes(self):
        self.tui()
        self.usage.unlink()
        result = r.sweep(self.root, self.directory, True, 4)
        self.assertEqual(result['results'], [])
        reason = next(reason for reason in result['retained_summary'] if reason.startswith('runtime proof incompatible'))
        self.assertGreater(result['retained_summary'][reason]['bytes'], len(self.raw))
        self.assertEqual(len(external.active_external(self.state, lambda _: False, self.directory)), 1)
        self.assertTrue((self.scratch / 'raw-states.jsonl').exists())

    def test_legacy_checkout_only_receipt_upgrades_and_restores_checkout(self):
        batch, tree, scratch, proof = r.admission(self.root, self.directory, self.state, self.bid)
        r.remove_checkout(self.root, self.directory, self.bid, tree, scratch, True)
        path = self.directory / 'retention/archives' / (self.bid + '.manifest.json')
        old = dict(schema='learner-retention-v1', state='checkout_reclaimed', root=str(self.root),
                   scratch=str(scratch.relative_to(self.root)), proof=proof)
        r.atomic(path, old)
        self.assertEqual(r.sweep(self.root, self.directory, True, 4)['results'][0]['state'], 'reclaimed')
        self.assertEqual(r.load(path)['previous_manifest'], old)
        r.restore(self.root, self.directory, self.bid)
        self.assertTrue((tree / '.git').exists())
        self.assertEqual((scratch / 'raw-states.jsonl').read_bytes(), self.raw)

    def test_launch_binds_missing_report_path_without_bypassing_lease(self):
        self.report.pop('report')
        launch = dict(type='learner_launch', cwd=str(self.tree), task='fix-batch',
                      params=dict(batch=self.bid, scratch=str(self.scratch)))
        self.original_stream.write_text(json.dumps(launch) + '\n')
        self.save()
        root_stream = self.root / 'learner/runs' / self.original_stream.name
        root_stream.parent.mkdir(parents=True)
        self.original_stream.rename(root_stream)
        self.original_stream = root_stream
        with (self.directory / 'learner' / (self.bid + '.out')).open('a') as stream:
            stream.write('日志：' + str(root_stream) + '\n')
        self.assertEqual(self.run_cleanup()['state'], 'reclaimed')
        self.assertTrue((self.tree / '.git').exists())
        r.restore(self.root, self.directory, self.bid)
        self.assertEqual((self.scratch / 'raw-states.jsonl').read_bytes(), self.raw)

    def test_dynamic_budget_drains_more_than_four_done_batches(self):
        for i in range(7):
            bid = f'20261013-01000{i}-fix-batch'
            scratch = self.tree / 'learner/runs' / f'20261013-01010{i}-fix-batch'
            scratch.mkdir(parents=True)
            (scratch / 'report.md').write_text('fixed report, no knowledge acceptance')
            (scratch / 'process.bin').write_bytes(b'fixed disposable sample\n' * 10000)
            self.state['batches'][bid] = dict(self.batch)
            report = dict(task='fix-batch', commit=None, merged=None, report=str(scratch / 'report.md'))
            (self.directory / 'learner' / (bid + '.out')).write_text('```json\n' + json.dumps(report) + '\n```\n')
        r.atomic(self.directory / 'learn.json', self.state)
        result = r.sweep(self.root, self.directory, True, 4)
        self.assertEqual(len(result['results']), 7)
        self.assertEqual(result['limit'], 7)
        for i in range(7):
            scratch = self.tree / 'learner/runs' / f'20261013-01010{i}-fix-batch'
            self.assertFalse((scratch / 'process.bin').exists())
            self.assertTrue((scratch / 'report.md').exists())

    def test_reason_growth_and_disk_alerts_are_persistent_and_deduplicated(self):
        start = dt.datetime(2026, 10, 1, tzinfo=dt.timezone.utc)
        result = dict(retained={'lease busy': 2}, retained_bytes={'lease busy': 100})
        usage = retention_metrics.shutil.disk_usage(self.root)
        with patch.object(retention_metrics.shutil, 'disk_usage', return_value=usage._replace(free=149_000_000_000)):
            retention_metrics.summarize(self.root, self.directory, result, True, r, start)
            result['retained_bytes']['lease busy'] = 200
            retention_metrics.summarize(self.root, self.directory, result, True, r, start + dt.timedelta(hours=24))
            self.assertEqual(result['retained_summary']['lease busy'], dict(batches=2, bytes=200))
            inbox = self.directory / 'inbox-claude.md'
            self.assertIn('growing for 24h', inbox.read_text())
            before = inbox.read_bytes()
            retention_metrics.summarize(self.root, self.directory, result, True, r, start + dt.timedelta(hours=24, minutes=5))
            self.assertEqual(inbox.read_bytes(), before)

    def refresh_dir(self, name, status, ended):
        path = self.directory / 'v6-refresh/silent' / ('refresh-' + name)
        path.mkdir(parents=True)
        r.atomic(path / 'receipt.json', dict(schema='v6-refresh-receipt-v1', directory=str(path), character='silent',
                                          status=status, ended_at=ended.isoformat()))
        (path / 'step.stdout').write_text('original stdout')
        (path / 'step.stderr').write_text('original stderr')
        (path / 'intermediate.json').write_bytes(b'large fixed generated sample' * 1000)
        return path

    def test_refresh_history_and_failed_cap_and_plan(self):
        now = dt.datetime(2026, 10, 26, tzinfo=dt.timezone.utc)
        published = self.refresh_dir('published', 'published', now)
        failures = [self.refresh_dir(str(i), 'failed', now - dt.timedelta(hours=i)) for i in range(22)]
        expired = self.refresh_dir('expired', 'failed', now - dt.timedelta(days=8))
        plan = refresh_retention.sweep(self.root, self.directory, False, now)
        self.assertEqual(len(plan['results']), 4)
        self.assertTrue((published / 'intermediate.json').exists())
        result = refresh_retention.sweep(self.root, self.directory, True, now)
        self.assertEqual(len(result['results']), 4)
        for path in [published, *failures[20:], expired]:
            self.assertEqual({p.name for p in path.iterdir()}, {'receipt.json', 'step.stdout', 'step.stderr'})
        for path in failures[:20]:
            self.assertTrue((path / 'intermediate.json').exists())
        self.assertEqual(refresh_retention.sweep(self.root, self.directory, True, now)['results'], [])

    def test_refresh_active_and_symlinked_intermediates_are_preserved(self):
        now = dt.datetime.now(dt.timezone.utc)
        path = self.refresh_dir('active', 'published', now)
        with patch.object(refresh_retention.w, 'active', return_value=True):
            self.assertEqual(refresh_retention.sweep(self.root, self.directory, True)['results'], [])
        link = path / 'alias'
        link.symlink_to(self.root / 'logs/states.jsonl')
        self.assertEqual(refresh_retention.sweep(self.root, self.directory, True)['results'], [])
        self.assertTrue((path / 'intermediate.json').exists())


if __name__ == '__main__':
    unittest.main()
