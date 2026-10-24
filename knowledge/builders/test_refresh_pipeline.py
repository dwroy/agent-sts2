"""Fixed evidence for append checkpoints, cadence and publication; no live inputs."""
import fcntl
import ast
import importlib.util
import json
import os
import re
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import legacy_incremental as cache
from fight_value_incremental import training_due, trained
from incremental_evidence import FrozenLogIndex


def load(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), HERE / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class PipelineTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.logs = self.root / 'logs'
        self.logs.mkdir()
        self.env = patch.dict(os.environ, STS2_REFRESH_CACHE_DIR=str(self.root / 'cache'))
        self.env.start()

    def fresh(self):
        for ctx in cache._CONTEXTS.values():
            ctx.close()
        cache._CONTEXTS.clear()

    def tearDown(self):
        self.fresh()
        self.env.stop()
        self.temp.cleanup()

    def write(self, name, rows):
        path = self.logs / (name + '.jsonl')
        path.write_text(''.join(json.dumps(row, ensure_ascii=False, separators=(',', ':'))+'\n' for row in rows))
        return path

    def fv_parity(self, states, runs, reason=None):
        fv = load('build-fight-value')
        rows, full = self.root / 'rows.jsonl', self.root / 'full.jsonl'
        with patch.dict(os.environ, STS2_REFRESH_CACHE_DIR=''):
            expected = fv.extract(str(states), str(runs), None, str(full))
        self.fresh()
        actual = fv.extract(str(states), str(runs), None, str(rows))
        self.assertEqual(rows.read_bytes(), full.read_bytes())
        self.assertEqual((actual.rows, actual.fights, actual.by_asc),
                         (expected.rows, expected.fights, expected.by_asc))
        timing = cache.context(states).timings[-1]
        if reason is not None:
            self.assertEqual(timing['rebuild_reason'], reason)
        return timing

    def test_fight_resume_exact_bytes_across_all_synthetic_boundaries(self):
        mod = load('build-monster-db')
        lines = list(mod._synthetic_lines())
        runs = self.write('runs', [])
        states = self.logs / 'states.jsonl'
        # Includes SL resets, pending MAP attribution, interleaving and EOF deaths.
        for end in [1, 2, 5, 10, len(lines)//2, len(lines)]:
            states.write_text('\n'.join(lines[:end])+'\n')
            timing = self.fv_parity(states, runs)
            if end > 1:
                self.assertGreater(timing['from_offset'], 0)
        timing = self.fv_parity(states, runs)
        self.assertEqual(timing['processed_frames'], 0)
        self.assertEqual(timing['rebuild_reason'], None)

    def test_late_death_summary_and_revised_summary_match_full(self):
        mod = load('build-monster-db')
        lines = list(mod._synthetic_lines())
        states = self.logs / 'states.jsonl'
        states.write_text('\n'.join(lines[:5])+'\n')
        runs = self.write('runs', [])
        self.fv_parity(states, runs)
        self.write('runs', [dict(run_id='R1', floor=1, victory=False, death_fight='fixture')])
        self.fv_parity(states, runs)
        self.write('runs', [dict(run_id='R1', floor=2, victory=False, death_fight='fixture')])
        self.fv_parity(states, runs, 'completed_run_revised')

    def test_rotation_truncation_rewrite_and_corrupt_rows_rebuild(self):
        mod = load('build-monster-db')
        lines = list(mod._synthetic_lines())
        states = self.logs / 'states.jsonl'
        states.write_text('\n'.join(lines)+'\n')
        runs = self.write('runs', [])
        self.fv_parity(states, runs)
        replacement = states.with_suffix('.new')
        replacement.write_bytes(states.read_bytes())
        replacement.replace(states)
        self.fv_parity(states, runs, 'rotation_or_identity')
        states.write_text('\n'.join(lines[:10])+'\n')
        self.fv_parity(states, runs, 'truncated')
        states.write_bytes(states.read_bytes().replace(b'R1', b'Q1'))
        self.fv_parity(states, runs, 'prefix_changed')
        (self.root / 'rows.jsonl').write_text('damaged\n')
        self.fv_parity(states, runs, 'rows_changed')

    def test_card_append_retains_full_counts_order_faces_and_gaps(self):
        mod = load('build-card-upgrades')
        rows = [json.loads(line) for line in (HERE.parents[1] / 'agent/tests/card-upgrade-data/logged-faces.jsonl').read_text().splitlines()]
        path = self.logs / 'states.jsonl'
        for end in [2, len(rows)//2, len(rows), len(rows)+3]:
            self.write('states', (rows+rows[:3])[:end])
            with path.open('a') as out:
                out.write('bad\n')
            self.fresh()
            with patch.dict(os.environ, STS2_REFRESH_CACHE_DIR=''):
                expected_audit = {}
                expected = mod.build(path, audit=expected_audit)
            audit = {}
            actual = mod.build(path, audit=audit)
            self.assertEqual(actual, expected)
            self.assertEqual(audit, expected_audit)
        # A true append, then an unchanged process restart, decodes no old frames.
        with path.open('a') as out:
            out.write(json.dumps(rows[0])+'\n')
        self.fresh()
        with patch.dict(os.environ, STS2_REFRESH_CACHE_DIR=''):
            expected = mod.build(path)
        self.assertEqual(mod.build(path), expected)
        self.assertEqual(cache.context(path).timings[-1]['processed_frames'], 1)
        self.fresh()
        self.assertEqual(mod.build(path), expected)
        self.assertEqual(cache.context(path).timings[-1]['processed_frames'], 0)

    def test_index_checks_prefix_once_per_append_cycle_and_records_fallback(self):
        path = self.write('states', [dict(run_id='A')])
        index = FrozenLogIndex(self.root/'index', self.logs)
        index.update('states', path.stat().st_size)
        index.close()
        for _ in range(2):
            index = FrozenLogIndex(self.root/'index', self.logs)
            index.update('states', path.stat().st_size)
            self.assertEqual(index.stats['prefix_bytes_read'], 0)
            self.assertEqual(index.stats['decoded_rows'], 0)
            self.assertEqual(index.stats['unchanged_streams'], ['states'])
            index.close()
        with path.open('a') as out:
            out.write('{"run_id":"B"}\n')
        index = FrozenLogIndex(self.root/'index', self.logs)
        index.update('states', path.stat().st_size)
        self.assertEqual(index.stats['decoded_rows'], 1)
        self.assertGreater(index.stats['prefix_bytes_read'], 0)
        index.close()

    def test_cadence_unique_runs_idle_explicit_force_and_damaged_outputs(self):
        outputs = [self.root / name for name in ('model', 'gates', 'notes')]
        for path in outputs:
            path.write_text('old complete')
        stamp = self.root/'training.json'
        self.assertTrue(training_due(stamp, ['A'], outputs)[0])
        trained(stamp, ['A'], outputs)
        self.assertFalse(training_due(stamp, ['A']*20+['B'], outputs)[0])
        self.assertFalse(training_due(stamp, ['A'], outputs, idle=True)[0])
        self.assertTrue(training_due(stamp, ['A', 'B'], outputs, idle=True)[0])
        self.assertTrue(training_due(stamp, ['A'], outputs, force=True)[0])
        self.assertTrue(training_due(stamp, ['A', *map(str, range(10))], outputs)[0])
        outputs[0].write_text('damaged')
        self.assertTrue(training_due(stamp, ['A'], outputs)[0])

    def test_failed_fit_does_not_publish_any_partial_artifact_or_cadence(self):
        fv = load('build-fight-value')
        rows = self.write('training', [dict(asc=10, kind='boss', t=1, ts0='a', ts1='b', E={'hp':1}, S={'hp':1})])
        decisions = self.write('decisions', [])
        runs = self.write('runs', [dict(run_id='A', character='SILENT')])
        outputs = [self.root / name for name in ('model', 'notes', 'gates')]
        for path in outputs:
            path.write_text('old complete')
        argv = ['train', '--character', 'silent', '--rows', str(rows), '--runs', str(runs),
                '--decisions', str(decisions), '--out', str(outputs[0]), '--notes', str(outputs[1]), '--gates', str(outputs[2])]
        def fail(_rows, _decisions, out, notes, *_args):
            Path(out).write_text('half model')
            raise RuntimeError('fixed training failure')
        with patch.object(fv, 'train', side_effect=fail):
            with self.assertRaisesRegex(RuntimeError, 'fixed training failure'):
                fv.main(argv)
        self.assertEqual([p.read_text() for p in outputs], ['old complete']*3)
        self.assertFalse(rows.with_suffix('.training.json').exists())
        def complete(_rows, _decisions, out, notes, _trees, gates):
            for path in (out, notes, gates):
                Path(path).write_text('new complete')
        with patch.object(fv, 'train', side_effect=complete):
            fv.main(argv)
        self.assertEqual([p.read_text() for p in outputs], ['new complete']*3)
        self.assertTrue(rows.with_suffix('.training.json').exists())

    def test_publication_compute_unlocked_then_waits_for_original_lock(self):
        directory = self.root/'ops'; directory.mkdir()
        marker = self.root/'computed'; target = self.root/'published'; target.write_text('old')
        script = ('import sys; from pathlib import Path; '
                  'sys.path.insert(0,sys.argv[1]); from refresh_publish import write_text; '
                  'Path(sys.argv[2]).write_text("ready"); write_text(sys.argv[3], "new")')
        with (directory/'live-merge.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            child = subprocess.Popen([sys.executable, '-c', script, str(HERE), str(marker), str(target)],
                env={**os.environ, 'STS2_REFRESH_OPS_ROOT':str(self.root)})
            try:
                with self.assertRaises(subprocess.TimeoutExpired):
                    child.wait(timeout=.3)
                self.assertTrue(marker.exists())
                self.assertEqual(target.read_text(), 'old')
            finally:
                fcntl.flock(lock, fcntl.LOCK_UN)
            self.assertEqual(child.wait(timeout=10), 0)
        self.assertEqual(target.read_text(), 'new')
        receipt = json.loads((directory/'refresh-publication-timing.jsonl').read_text())
        self.assertGreater(receipt['wait_seconds'], 0)
        self.assertLess(receipt['held_seconds'], receipt['wait_seconds'])

    def test_heavy_adapter_uses_other_role_and_preserves_command(self):
        driver = load('refresh_driver')
        command = [sys.executable, 'refresh_driver.py', '--queue-entered']
        self.assertEqual(driver.queue_command(self.root, command)[0], command)
        adapter = self.root/'ops/board_heavy.py'; adapter.parent.mkdir()
        adapter.write_text('def queued_argv(root,role,argv):\n return ["queue",str(root),role,"--",*argv]\n')
        actual, status = driver.queue_command(self.root, command)
        self.assertEqual(actual, ['queue',str(self.root),'other','--',*command])
        self.assertEqual(status, 'enabled')

    def test_logdb_sync_covers_separate_live_and_ops_databases(self):
        driver = load('refresh_driver')
        live = self.root / 'live'
        with patch.object(driver, 'ROOT', live):
            steps = driver.logdb_sync_steps(self.root)
        self.assertEqual([name for name, _ in steps], ['logdb-sync', 'logdb-sync-ops-root'])
        for (_name, command), root in zip(steps, (live, self.root)):
            self.assertEqual(command, [root / 'data/logdb-venv/bin/python',
                live / 'agent/tools/logdb/sync.py', '--logs', root / 'logs',
                '--db', root / 'data/logdb', '--no-wait'])

    def test_logdb_sync_deduplicates_same_or_shared_database(self):
        driver = load('refresh_driver')
        live = self.root / 'live'
        with patch.object(driver, 'ROOT', self.root):
            self.assertEqual(len(driver.logdb_sync_steps(self.root)), 1)
        target = self.root / 'data/logdb'
        target.mkdir(parents=True)
        (live / 'data').mkdir(parents=True)
        (live / 'data/logdb').symlink_to(target, target_is_directory=True)
        with patch.object(driver, 'ROOT', live):
            self.assertEqual(len(driver.logdb_sync_steps(self.root)), 1)

    def test_normal_refresh_syncs_ops_database_before_consumers_without_new_entry(self):
        driver = load('refresh_driver')
        live = self.root / 'live'
        calls = []
        def step(_root, name, argv):
            calls.append((name, argv))
            return 0
        with patch.object(driver, 'ROOT', live), patch.object(driver, 'BUILDERS', live / 'knowledge/builders'), \
                patch.object(driver, 'step', side_effect=step), patch.dict(os.environ), \
                patch.object(sys, 'argv', ['refresh_driver.py', '--ops-root', str(self.root),
                                          '--character', 'silent', '--queue-entered']):
            self.assertEqual(driver.main(), 0)
        names = [name for name, _ in calls]
        self.assertEqual([n for n in names if n.startswith('logdb-sync')],
                         ['logdb-sync', 'logdb-sync-ops-root'])
        self.assertLess(names.index('logdb-sync-ops-root'), names.index('construction-opportunities:silent'))
        command = next(argv for name, argv in calls if name == 'logdb-sync-ops-root')
        self.assertIn('--no-wait', command)
        self.assertEqual(command[command.index('--db') + 1], self.root / 'data/logdb')

    def test_real_fit_full_and_incremental_models_and_gates_match_bytes(self):
        fv = load('build-fight-value')
        fixture = list(fv.bmd._synthetic_lines())
        lines = []
        for batch in range(8):
            for raw in fixture:
                row = json.loads(raw)
                rid = row['state'].get('run_id')
                if rid:
                    row['state']['run_id'] = f'{batch}_{rid}'
                lines.append(row)
        states = self.write('states', lines[:len(lines)//2])
        runs, decisions = self.write('runs', []), self.write('decisions', [])
        self.fv_parity(states, runs)
        self.write('states', lines)
        self.fv_parity(states, runs)
        self.assertGreaterEqual(len((self.root/'rows.jsonl').read_text().splitlines()), 40)
        for stem, rows in [('incremental', 'rows.jsonl'), ('full', 'full.jsonl')]:
            fv.train(str(self.root/rows), str(decisions), str(self.root/(stem+'.json')),
                     str(self.root/(stem+'.md')), 2, str(self.root/(stem+'-gates.json')))
        for suffix in ('.json', '-gates.json'):
            self.assertEqual((self.root/('incremental'+suffix)).read_bytes(),
                             (self.root/('full'+suffix)).read_bytes())
        def notes(stem):
            return [line for line in (self.root/(stem+'.md')).read_text().splitlines()
                    if not line.startswith('- Runtime of this training stage:')]
        self.assertEqual(notes('incremental'), notes('full'))

    def test_report_uses_deployed_live_entry_and_never_waits_for_refresh(self):
        tree = ast.parse((HERE.parents[1]/'ops/report.py').read_text())
        function = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'refresh_knowledge')
        namespace = dict(os=os, re=re, json=json, ROOT=str(self.root), LIVE=str(self.root))
        exec(compile(ast.Module(body=[function], type_ignores=[]), '<report-entry>', 'exec'), namespace)
        (self.root/'ops').mkdir()
        commands = []
        def spawn(argv, **_kw):
            commands.append(argv)
            return SimpleNamespace(pid=len(commands))
        with patch.object(subprocess, 'Popen', side_effect=spawn):
            old = namespace['refresh_knowledge']('silent')
            self.assertEqual(old['refresh_worker'], 'legacy')
            self.assertEqual(len(commands), 2)
            self.assertTrue(all('--all' not in argv for argv in commands))
            self.assertIn('--fight-value', commands[0])
            driver = self.root/'knowledge/builders/refresh_driver.py'
            driver.parent.mkdir(parents=True)
            driver.write_text('pass')
            commands.clear()
            current = namespace['refresh_knowledge']('silent')
            self.assertEqual(current['refresh_worker'], 'combined')
            self.assertEqual(len(commands), 1)
            self.assertIn('--all', commands[0])
            self.assertEqual(current['fight_value_pid'], current['pid'])
            self.assertFalse(current['admission_wait'])

    def test_other_builder_reindex_invalidates_both_persisted_aggregates(self):
        mod = load('build-monster-db')
        lines = list(mod._synthetic_lines())
        opening = json.loads(lines[0])
        opening['state']['run']['deck'] = [dict(card_id='FIXTURE_CARD', upgraded=False, energy_cost=1),
                                           dict(card_id='FIXTURE_CARD', upgraded=True, energy_cost=0)]
        lines[0] = json.dumps(opening, separators=(',', ':'))
        card = load('build-card-upgrades')
        states = self.logs/'states.jsonl'
        states.write_text('\n'.join(lines)+'\n')
        runs = self.write('runs', [])
        self.fv_parity(states, runs)
        original_cards = card.build(states)
        self.fresh()
        # Rewrite + append: size does not force truncation detection. Another
        # builder gets there first, so local rebuilt_streams will be empty.
        states.write_text('\n'.join(lines).replace('R1', 'Q1').replace('"energy_cost":1', '"energy_cost":3')+'\n'+lines[-1]+'\n')
        cache.context(states).ready(states)
        self.fresh()
        self.fv_parity(states, runs, 'prefix_changed')
        self.assertEqual(cache.context(states).index.stats['rebuilt_streams'], [])
        with patch.dict(os.environ, STS2_REFRESH_CACHE_DIR=''):
            expected = card.build(states)
        self.assertNotEqual(expected, original_cards)
        self.assertEqual(card.build(states), expected)
        self.assertEqual(cache.context(states).timings[-1]['from_offset'], 0)
        self.assertIsNotNone(cache.context(states).timings[-1]['rebuild_reason'])


if __name__ == '__main__':
    unittest.main()
