"""Run the actual staged outcome/catalog recipe without any production input."""
from contextlib import redirect_stderr, redirect_stdout
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / 'ops'))
from ops.tests.fixed_producer_fixture import install
from fixed_producer_methods import method
from stats_runtime import call, packed, sha
import stats_refresh as refresh


class StatsRefreshTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='s1-real-recipe-')
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for producer in ('outcome', 'catalog'):
            install(self.root, producer)
        (self.root / 'agent/node_modules').symlink_to(ROOT / 'agent/node_modules', target_is_directory=True)
        for rel in ['logs', 'data/logdb', 'data/logdb-venv', 'ops/codex-ops', 'knowledge/characters/silent', 'knowledge/common']:
            (self.root / rel).mkdir(parents=True, exist_ok=True)
        for name in ['states', 'decisions', 'runs']:
            (self.root / 'logs' / (name + '.jsonl')).write_text('')
        (self.root / 'logs/runs.jsonl').write_text(packed(dict(run_id='FIXTURE00001', character='SILENT',
            ascension=10, floor=1, victory=False, ended='2026-01-01T00:00:00Z')) + '\n')
        (self.root / 'knowledge/common/move-model.json').write_text('{"schema":"fixture","monsters":{}}')
        (self.root / 'knowledge/characters/silent/outcome-stats.json').write_text('{"fixed_fixture":true}')
        self.runtime = self.root / 'data/stats'
        self.methods = {name: method(self.root, name, self.root) for name in ['outcome', 'catalog']}
        call(self.root, 'init', self.runtime)
        m, d = self.root / 'methods.json', self.root / 'dependencies.json'
        m.write_text(packed(self.methods)); d.write_text('{}')
        self.baseline = call(self.root, 'seed', self.runtime, source=self.root, methods=m, dependencies=d, request='fixture-seed')['version']
        record = self.root / 'admit.json'
        record.write_text(packed(dict(request='fixture-admit', expected=None, methods=self.methods, blocked=False, evidence_sha256='a' * 64)))
        call(self.root, 'admit', self.runtime, record=record)
        self.state = self.root / 'ops/codex-ops'
        (self.state / 'stats-runtime.json').write_text(packed(dict(schema='stats-runtime-control-v1', root=str(self.root), enabled=True,
            directory=str(self.runtime), backend='shadow', methods=self.methods, retired_git_data=False)))
        self.env = patch.dict(os.environ, {'CODEX_OPS_DIR': str(self.state)})
        self.env.start(); self.addCleanup(self.env.stop)

    def run_driver(self, argv, **kwargs):
        # Same original main/step code, but no extra idle driver process. At most
        # this test and one original builder execute at once.
        spec = importlib.util.spec_from_file_location('fixed_stats_driver_fixture', argv[1])
        driver = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(driver)
        old_path = sys.path[:]
        try:
            sys.path.insert(0, str(Path(argv[1]).parent))
            with patch.dict(os.environ, kwargs['env'], clear=True), patch.object(sys, 'argv', argv[1:]), \
                    redirect_stdout(kwargs['stdout']), redirect_stderr(kwargs['stderr']):
                # Redirect only the children: the original driver also prints
                # text to Python stdout, which needs a text stream.
                import io
                with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()):
                    code = driver.main()
        finally:
            sys.path[:] = old_path
        return SimpleNamespace(returncode=code)

    def test_original_recipe_publishes_one_complete_version_and_never_writes_source_A(self):
        before = {str(p.relative_to(self.root)): p.read_bytes() for p in (self.root / 'knowledge').rglob('*.json')}
        with refresh.worker(self.root), patch('stats_launch.prepare', return_value={'status': 'fixture-ready'}):
            result = refresh.execute(self.root, self.root, 'actual-recipe', {'only_producer': 'outcome'}, ['silent'], self.run_driver)
        self.assertEqual(result['status'], 'published')
        self.assertNotEqual(result['version'], self.baseline)
        self.assertEqual(call(self.root, 'current', self.runtime)['version'], result['version'])
        members = call(self.root, 'manifest', self.runtime, version=result['version'])['files']
        self.assertIn('catalog.json', members)
        self.assertIn('characters/silent/outcome-stats.json', members)
        self.assertNotEqual(members['characters/silent/outcome-stats.json'], sha(before['knowledge/characters/silent/outcome-stats.json']))
        for key, raw in before.items():
            self.assertEqual((self.root / key).read_bytes(), raw)
        with patch.object(refresh, 'freeze_code', side_effect=AssertionError('must not rerun')):
            duplicate = refresh.execute(self.root, self.root, 'actual-recipe', {'only_producer': 'outcome'}, ['silent'])
        self.assertEqual(duplicate['status'], 'already_published')
        # A committed request can have lost its terminal health event. Replay
        # completes that original event without inventing fresh data.
        replay = refresh.run(self.root, self.root, 'actual-recipe', {'only_producer': 'outcome'}, ['silent'])
        self.assertEqual(replay['status'], 'already_published')
        event = self.state / 'refresh-health-events' / (sha(packed(['outcome:silent', 'actual-recipe']).encode()) + '.json')
        body = json.loads(event.read_text())
        self.assertEqual(body['status'], 'succeeded')
        self.assertFalse(body['published'])

    def test_failed_original_recipe_leaves_current_and_retains_attempt(self):
        with refresh.worker(self.root), self.assertRaisesRegex(ValueError, 'pipeline failed'):
            refresh.execute(self.root, self.root, 'failed-recipe', {'only_producer': 'outcome'}, ['silent'],
                            lambda *a, **kw: SimpleNamespace(returncode=1))
        self.assertEqual(call(self.root, 'current', self.runtime)['version'], self.baseline)
        receipt = json.loads((self.root / 'data/stats-refresh' / sha(b'failed-recipe') / 'receipt.json').read_text())
        self.assertEqual(receipt['status'], 'failed')


if __name__ == '__main__':
    unittest.main()
