"""Run real refresh entry points in fresh processes over isolated fixed evidence."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = Path(__file__).resolve().parent


class EntrypointTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.ops_root = Path(self.temp.name)
        self.live = self.ops_root / 'live'
        self.builders = self.live / 'knowledge/builders'
        self.builders.mkdir(parents=True)
        for source in HERE.iterdir():
            if source.suffix in ('.py', '.sh') and not source.name.startswith('test_'):
                shutil.copyfile(source, self.builders / source.name)
        helpers = self.ops_root / 'ops'
        helpers.mkdir(parents=True)
        for name in ('refresh_health.py', 'learning_runtime.py', 'learning_runtime_store.py', 'learning_runtime_data.py',
                     'stats_runtime.py', 'stats_launch.py'):
            shutil.copyfile(HERE.parents[1] / 'ops' / name, helpers / name)
        learner = self.live / 'learner'
        learner.mkdir()
        shutil.copyfile(HERE.parents[1] / 'learner/evidence_identity.py', learner / 'evidence_identity.py')
        for name in ('logs', 'data', 'notes', 'knowledge/common', 'knowledge/characters/silent'):
            (self.live / name).mkdir(parents=True, exist_ok=True)
        (self.live / 'data/game-data.json').write_text(json.dumps({'collections': {'cards': [], 'monsters': []}}))
        for stream in ('runs', 'states', 'decisions', 'brain'):
            (self.live / 'logs' / (stream + '.jsonl')).write_text('')
        # report.py starts refresh.sh from the ops checkout; refresh.sh/driver do
        # not cd or add PYTHONPATH. No parent test module or sys.path is inherited.
        self.env = {k: v for k, v in os.environ.items()
                    if not k.startswith(('PYTHON', 'STS2_REFRESH_'))}
        self.env.update(PYTHONPATH='', PYTHONDONTWRITEBYTECODE='1', CODEX_OPS_DIR=str(self.ops_root / 'ops/codex-ops'),
                        STS2_REFRESH_OPS_ROOT=str(self.ops_root),
                        STS2_REFRESH_CACHE_DIR=str(self.ops_root / 'ops/legacy-refresh-cache'))
        for key in ('OMP_NUM_THREADS', 'OPENBLAS_NUM_THREADS', 'MKL_NUM_THREADS', 'NUMEXPR_NUM_THREADS'):
            self.env[key] = '1'

    def call(self, argv, success=True, env=None):
        result = subprocess.run([str(a) for a in argv], cwd=self.ops_root,
                                env=env or self.env, capture_output=True, text=True, timeout=25)
        if success:
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return result

    def python(self, name, *args, **kwargs):
        return self.call([sys.executable, self.builders / (name + '.py'), *args], **kwargs)

    def fixture(self):
        spec = importlib.util.spec_from_file_location('entrypoint_fixture', HERE / 'build-monster-db.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        rows = [json.loads(line) for line in module._synthetic_lines()]
        for row in rows:
            if isinstance(row['state'].get('run'), dict):
                row['state']['run']['character_id'] = 'SILENT'
        runs = sorted({row['state']['run_id'] for row in rows if row['state'].get('run_id')})
        self.write('runs', [dict(run_id=rid, character='SILENT', ascension=8) for rid in runs])
        return rows, runs

    def write(self, stream, rows, mode='w'):
        with (self.live / 'logs' / (stream + '.jsonl')).open(mode) as out:
            out.writelines(json.dumps(row, separators=(',', ':')) + '\n' for row in rows)

    def test_production_fight_refresh_cold_append_warm_and_missing_dependency(self):
        states, runs = self.fixture()
        self.write('states', states[:len(states)//2])
        # A verified previous generation exercises the production `all` path
        # without forcing training or inventing learned model values.
        outputs = [self.live / 'knowledge/characters/silent' / name
                   for name in ('fight-value.json', 'fight-value-gates.json')]
        outputs.append(self.live / 'notes/fight-value-backtest-silent.md')
        for path in outputs:
            path.write_text('{}\n')
        training = self.live / 'data/fight-value-rows-silent.training.json'
        training.write_text(json.dumps(dict(runs=runs, outputs={str(p): hashlib.sha256(p.read_bytes()).hexdigest()
                                                               for p in outputs})))
        command = ['bash', self.builders / 'refresh.sh', '--ops-root', self.ops_root,
                   '--fight-value', '--character', 'silent']
        frames = []
        for phase in ('cold', 'append', 'warm'):
            if phase == 'append':
                self.write('states', states[len(states)//2:], mode='a')
            result = self.call(command)
            self.assertIn('train: deferred; previous completed model retained', result.stdout)
            self.assertEqual([p.read_bytes() for p in outputs], [b'{}\n'] * 3)
            receipts = [json.loads(line) for line in (self.ops_root / 'ops/refresh-timing.jsonl').read_text().splitlines()]
            self.assertEqual(receipts[-1]['failed_steps'], [])
            self.assertEqual(next(r for r in reversed(receipts) if r.get('name') == 'fight-value:silent')['exit_code'], 0)
            cache_logs = list((self.ops_root / 'ops/legacy-refresh-cache').glob('*/timing.jsonl'))
            self.assertEqual(len(cache_logs), 1)
            timing = json.loads(cache_logs[0].read_text().splitlines()[-1])
            append = next(p for p in timing['phases'] if p['name'] == 'fight-value:append')
            frames.append(append['processed_frames'])
            if phase != 'cold':
                self.assertIsNone(append['rebuild_reason'])
                self.assertGreater(append['from_offset'], 0)
        self.assertEqual(frames, [len(states)//2, len(states)-len(states)//2, 0])
        rows = self.live / 'data/fight-value-rows-silent.jsonl'
        self.assertGreater(len(rows.read_text().splitlines()), 0)
        full = self.live / 'data/full.jsonl'
        self.python('build-fight-value', 'extract', '--character', 'silent', '--rows', full,
                    env={**self.env, 'STS2_REFRESH_CACHE_DIR': ''})
        self.assertEqual(rows.read_bytes(), full.read_bytes())
        # A missing dependency must surface through the real shell and driver,
        # even on a warm cache, rather than become a false successful refresh.
        (self.live / 'learner/evidence_identity.py').unlink()
        failed = self.call(command, success=False)
        self.assertNotEqual(failed.returncode, 0)
        self.assertIn("ModuleNotFoundError: No module named 'evidence_identity'", failed.stderr)
        last = json.loads((self.ops_root / 'ops/refresh-timing.jsonl').read_text().splitlines()[-1])
        self.assertEqual(last['failed_steps'], ['fight-value:silent'])

    def test_other_refresh_builders_start_in_separate_production_processes(self):
        states, _runs = self.fixture()
        self.write('states', states)
        for name, args, output in (
            ('build-monster-db', ['--quiet'], 'knowledge/common/monster-db.json'),
            ('build-card-upgrades', [], 'knowledge/common/card-upgrades.json'),
            ('build-outcome-stats', ['--character', 'silent', '--quiet'], 'knowledge/characters/silent/outcome-stats.json'),
            ('build-room-costs', ['--character', 'silent'], 'knowledge/characters/silent/room-costs.json'),
            ('build-boss-damage', ['--character', 'silent'], 'knowledge/characters/silent/boss-damage.json'),
            ('build-construction-opportunities', ['--character', 'silent'], 'knowledge/characters/silent/construction-opportunities.json'),
            ('build-catalog', ['--knowledge-root', self.live / 'knowledge'], 'knowledge/catalog.json'),
        ):
            with self.subTest(builder=name):
                self.python(name, *args)
                self.assertTrue((self.live / output).is_file(), output)
        # These entry points need additional historical/DB/runtime fixtures for
        # execution. Check their startup imports here; existing suites test work.
        for name in ('monster-db-check', 'build-potion-equivalents', 'refresh-v6-history', 'build-combo-metrics'):
            with self.subTest(startup=name):
                self.python(name, '--help')


if __name__ == '__main__':
    unittest.main()
