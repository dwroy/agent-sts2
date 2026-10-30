"""Durable replacement intents, ordered coverage and bounded download continuation."""
import json
import os
from pathlib import Path
import sys
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

PROJECT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT / 'ops'))
import board_download as download
import board_queue_control as control
import board_queue_custody as custody
import board_refresh_queue as refresh


class Control(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.put('.agents/merge-queue.json', '{}')

    def put(self, name, value):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(value)
        return path

    def test_disabled_does_not_create_custody_refresh_or_machine_state(self):
        self.assertEqual(control.evaluate(self.root, 'tick')['decision'], 'allow')
        self.assertFalse((self.root / 'ops').exists())

    def test_unknown_hold_defers_without_sealing_or_spawning(self):
        refresh.hold(self.root, 'unknown-origin')
        with patch.object(refresh, 'enabled', return_value=True), patch.object(custody, 'observe', return_value=None):
            self.assertEqual(control.evaluate(self.root, 'before-seal')['decision'], 'defer')

    def test_disabling_control_cannot_bypass_an_unfinished_hold(self):
        refresh.hold(self.root, 'in-flight')
        with self.assertRaisesRegex(ValueError, 'cannot be bypassed'):
            refresh.enabled(self.root)

    def test_unregistered_machine_queue_before_k_is_unknown_and_prevents_release(self):
        self.put('ops/knowledge-refresh.lock', '')
        refresh.hold(self.root, 'fixture')
        claim = dict(id='old-queued', root=str(self.root), role='other', task='python3 old/refresh_driver.py --all',
                     runner_pid=99999999, runner_start='0', boot_id='fixed')
        with patch('board_heavy.claims', return_value=[claim]):
            status = refresh.drain(self.root, 'fixture')
            self.assertFalse(status['clear'])
            self.assertIn('unregistered-machine-claim:old-queued', status['unknown'])

    def test_failed_cleanup_never_releases_an_unsettled_publication(self):
        self.put('ops/codex-ops/PUBLICATION_ADMISSION.json', 'unknown original transaction')
        with patch.dict(os.environ, CODEX_OPS_DIR=str(self.root / 'ops/codex-ops')):
            with self.assertRaisesRegex(ValueError, 'publication unfinished'):
                control.failed_cleanup(self.root, self.root / '.state/batch/custody.json', {})

    def test_compensation_is_fresh_ordered_coalesced_and_unknown_exit_keeps_debt(self):
        self.put('knowledge/builders/refresh_driver.py', '# fixed all source\n')
        self.put('ops/refresh-costs.py', '# fixed cost source\n')
        self.put('ops/global_build_funnel.py', '# fixed funnel source\n')
        commands = {
            'all': [sys.executable, str(self.root / 'knowledge/builders/refresh_driver.py'), '--all', '--ops-root', str(self.root), '--queue-entered'],
            'cost': [sys.executable, str(self.root / 'ops/refresh-costs.py'), '--root', str(self.root), '--code-root', str(self.root / '.worktrees/live')],
            'funnel': [sys.executable, str(self.root / 'ops/global_build_funnel.py'), '--root', str(self.root), '--character', 'silent'],
        }
        base = refresh.directory(self.root)
        for number, kind in enumerate(('funnel', 'cost', 'all', 'all')):
            command = commands[kind]
            row = dict(id=str(number), command=command, ordinary=refresh.classify(self.root, command), source_cycle='old-cycle')
            self.put(str((base / 'debts' / (str(number) + '.json')).relative_to(self.root)), json.dumps(dict(
                id=str(number), kind=kind, original=row, state='pending', created_at=number)))
        launches = []
        def launch(command, **kwargs):
            launches.append((command, kwargs))
            return SimpleNamespace(pid=99999999)
        with patch.object(control.subprocess, 'Popen', side_effect=launch), \
                patch.object(refresh, 'queued_argv', side_effect=lambda root, command: command), \
                patch.dict(os.environ, dict(STS2_REFRESH_CYCLE='old-cycle', MAS_QUEUE_LEASE_FDS='old')):
            first = control.replay_debts(self.root)
            self.assertEqual(launches[0][0][1], commands['all'][1])
            self.assertNotIn('--queue-entered', launches[0][0])
            self.assertNotIn('STS2_REFRESH_CYCLE', launches[0][1]['env'])
            self.assertNotIn('MAS_QUEUE_LEASE_FDS', launches[0][1]['env'])
            aliases = [json.loads(path.read_text()) for path in (base / 'debts').glob('*.json')]
            self.assertEqual(sum(row.get('replacement') == first['request'] for row in aliases), 2)
            self.assertEqual(control.replay_debts(self.root)['state'], 'replacement-intent-unresolved')
            self.assertEqual(len(launches), 1)
            request = dict(id=first['request'], actor=dict(pid=99999999, start='0', boot_id='fixed'), stage='finished', exit_code=1)
            self.put(str((base / 'requests' / (first['request'] + '.json')).relative_to(self.root)), json.dumps(request))
            self.assertEqual(control.replay_debts(self.root)['state'], 'replacement-failed-or-unknown')
            self.assertEqual(len(launches), 1)
            request['exit_code'] = 0
            self.put(str((base / 'requests' / (first['request'] + '.json')).relative_to(self.root)), json.dumps(request))
            second = control.replay_debts(self.root)
            self.assertEqual(launches[-1][0][1], commands['cost'][1])
            request.update(id=second['request'])
            self.put(str((base / 'requests' / (second['request'] + '.json')).relative_to(self.root)), json.dumps(request))
            control.replay_debts(self.root)
            self.assertEqual(launches[-1][0][1], commands['funnel'][1])

    def test_download_continuation_reduces_page_budget_and_cannot_change_command(self):
        source = self.put('eval/spire_codex.py', '# fixed downloader source\n')
        command = [sys.executable, str(source), 'download', '--max-pages', '20']
        raw = self.root / 'private-raw'
        checkpoint = dict(index_sha256='a' * 64, cycle='fixed', shard=0, page=11, remaining_pages=10)
        with patch.object(download, 'enabled', return_value=True), \
                patch.object(download, 'higher_priority', return_value=[dict(id='merge')]), \
                patch.object(download, 'inherited', return_value=()):
            self.assertTrue(download.boundary(self.root, command, raw, checkpoint))
            path = download.record_path(self.root, command, raw)
            row = json.loads(path.read_text())
            self.assertEqual(row['command'][-1], '10')
            row['resume_nonce'] = 'fixed-intent'
            custody.atomic(path, row)
            with patch.dict(os.environ, dict(STS2_DOWNLOAD_YIELD_ID=row['id'], STS2_DOWNLOAD_RESUME_NONCE='fixed-intent')):
                with self.assertRaisesRegex(ValueError, 'command/intent changed'):
                    download.boundary(self.root, command, raw, checkpoint)
                next_checkpoint = dict(checkpoint, page=16, remaining_pages=5, index_sha256='b' * 64)
                self.assertTrue(download.boundary(self.root, row['command'], raw, next_checkpoint))
                self.assertEqual(json.loads(path.read_text())['command'][-1], '5')

    def test_download_starvation_notifies_once_without_claim_or_capacity_change(self):
        self.put('ops/codex-ops/download-yields/fixture.json', json.dumps(dict(id='fixed', state='yielded', no_progress_since=1)))
        with patch.object(download.time, 'time', return_value=90000):
            download.starvation(self.root)
            first = (self.root / 'ops/inbox-dev.md').read_text()
            download.starvation(self.root)
            self.assertEqual((self.root / 'ops/inbox-dev.md').read_text(), first)
            self.assertIn('24h', first)
            self.assertFalse((self.root / 'machine').exists())

    def test_terminal_receipt_replays_after_a_lost_release_response(self):
        for phase, decision in (('released', 'settled'), ('failed-released', 'failed-custody')):
            terminal = dict(phase=phase, epoch='original', job_sha256='a' * 64, outcome_sha256='b' * 64)
            with patch.object(refresh, 'enabled', return_value=True), patch.object(custody, 'observe', return_value=terminal):
                for _ in range(2):
                    result = control.evaluate(self.root, 'post-result')
                    self.assertEqual(result['decision'], decision)
                    self.assertEqual(result['custody'], terminal)
                self.assertEqual(control.evaluate(self.root, 'before-seal')['decision'], 'allow')

    def test_failed_release_preserves_actual_adoption_outcome_and_cannot_revive(self):
        path = self.root / '.state/batch/custody-outcome.json'
        adopted = dict(schema='sts2-custody-outcome-v1', job='a' * 64, candidate='b' * 40,
                       epoch='original', kind='adopted', publication_sha256='c' * 64)
        custody.save_outcome(path, adopted)
        failed = dict(adopted, kind='failed', failure='keeper lost after actual adoption')
        custody.save_outcome(path, failed)
        current = json.loads(path.read_text())
        self.assertEqual(current['prior_outcome_sha256'], custody.digest(adopted))
        archive = path.parent / 'custody-outcome-history' / (custody.digest(adopted) + '.json')
        self.assertEqual(json.loads(archive.read_text()), adopted)
        with self.assertRaisesRegex(ValueError, 'cannot be revived'):
            custody.save_outcome(path, adopted)
        self.assertEqual(json.loads(path.read_text()), current)

    def test_busy_metadata_guard_retains_unadmitted_request_without_cpu_claim_or_loss(self):
        source = self.put('ops/refresh-costs.py', '# fixed cost source\n')
        command = [sys.executable, str(source), '--root', str(self.root), '--code-root', str(self.root / '.worktrees/live')]
        script = ('import json,sys\nfrom pathlib import Path\nfrom unittest.mock import patch\n'
                  'sys.path.insert(0,sys.argv[1])\nimport board_refresh_queue as refresh\n'
                  'with patch("board_heavy.queued_argv",side_effect=lambda root,role,command:command):\n'
                  ' raise SystemExit(refresh.submit(Path(sys.argv[2]),json.loads(sys.argv[3])))\n')
        with refresh.barrier(self.root):
            result = subprocess.run([sys.executable, '-B', '-c', script, str(PROJECT / 'ops'),
                                     str(self.root), json.dumps(command)], capture_output=True, timeout=5)
            self.assertEqual(result.returncode, 75, result.stderr.decode())
        path, row = list(refresh.records(self.root))[0]
        self.assertEqual(row['stage'], 'deferred')
        self.assertTrue(row['admission_pending'])
        self.assertFalse((self.root / 'machine').exists())
        self.assertEqual(refresh.recover_requests(self.root), 1)
        self.assertFalse(json.loads(path.read_text())['admission_pending'])
        self.assertEqual(json.loads((refresh.directory(self.root) / 'debts' / (row['id'] + '.json')).read_text())['state'], 'pending')
        before = path.read_bytes()
        with patch.dict(os.environ, STS2_REFRESH_REPLAY_ID=row['id']), \
                patch('board_heavy.queued_argv', side_effect=lambda root, role, command: command):
            with self.assertRaises(FileExistsError):
                refresh.submit(self.root, command)
        self.assertEqual(path.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
