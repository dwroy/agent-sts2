"""Independent fixed-input checks at the actual CLI and #20 adapter boundaries."""
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
PROJECT = ROOT.parents[1]
BUILDERS = ROOT / 'knowledge/builders'
SOURCE20 = PROJECT / '.worktrees/integrator-20-r3-20261022'
KIT = PROJECT / '.artifacts/integrator-20-r3-20261022/kit'
sys.path.insert(0, str(BUILDERS))


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    sys.modules[name] = value
    spec.loader.exec_module(value)
    return value


class Contracts(unittest.TestCase):
    def test_actual_all_cli_counts_only_new_character_runs_and_idle(self):
        fv = module('review40_fv', BUILDERS / 'build-fight-value.py')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for file in ['states', 'decisions', 'game', 'rows']:
                (root / file).write_text('{}' if file == 'game' else '')
            runs = [dict(run_id='S0', character='SILENT', victory=True)]
            calls = []

            def fit(_rows, _decisions, out, notes, _trees, gates):
                calls.append(len(calls) + 1)
                for target in [out, notes, gates]:
                    Path(target).write_text('complete-generation-' + str(len(calls)))

            argv = ['all', '--character', 'silent']
            for flag, filename in [('states', 'states'), ('runs', 'runs'),
                                   ('decisions', 'decisions'), ('game-data', 'game'),
                                   ('rows', 'rows'), ('out', 'model'),
                                   ('notes', 'notes'), ('gates', 'gates')]:
                argv += ['--' + flag, str(root / filename)]

            def refresh(extra=()):
                (root / 'runs').write_text(''.join(json.dumps(r) + '\n' for r in runs))
                with contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(fv.main(argv + list(extra)), 0)

            with patch.dict(os.environ, STS2_REFRESH_CACHE_DIR='', STS2_REFRESH_OPS_ROOT=''), \
                    patch.object(fv, 'extract', return_value=SimpleNamespace(rows=0, fights=0, by_asc={})), \
                    patch.object(fv, 'train', side_effect=fit):
                refresh()
                self.assertEqual(len(calls), 1)
                original = [(root / f).read_bytes() for f in ['model', 'notes', 'gates']]
                runs += [dict(run_id='I' + str(i), character='IRONCLAD', victory=True) for i in range(12)]
                runs += [dict(run_id='S' + str(i), character='SILENT', victory=True) for i in range(1, 10)]
                refresh()
                self.assertEqual(len(calls), 1)
                self.assertEqual(original, [(root / f).read_bytes() for f in ['model', 'notes', 'gates']])
                runs.append(dict(run_id='S10', character='SILENT', victory=True))
                refresh()
                self.assertEqual(len(calls), 2)
                runs.append(dict(run_id='S11', character='SILENT', victory=True))
                refresh(['--idle'])
                self.assertEqual(len(calls), 3)
                receipt = json.loads((root / 'rows.training.json').read_text())
                self.assertEqual(set(receipt['runs']), {'S' + str(i) for i in range(12)})

    def test_exact_issue20_adapter_and_kit_in_private_single_slot_fixture(self):
        import yaml
        driver = module('review40_driver', BUILDERS / 'refresh_driver.py')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'ops').mkdir()
            (root / '.agents').mkdir()
            (root / 'kit').mkdir()
            for filename in ['board_heavy.py', 'issue_session_support.py']:
                shutil.copyfile(SOURCE20 / 'ops' / filename, root / 'ops' / filename)
            for filename in ['heavy.py', 'board.py', 'watchdog.py']:
                shutil.copyfile(KIT / filename, root / 'kit' / filename)
            data = yaml.safe_load((SOURCE20 / '.agents/board.yaml').read_text())
            data['dispatcher']['install'] = 'kit'
            (root / 'probe.py').write_text('print(\'{"running":false,"pids":[],"legacy":[]}\')')
            data['dispatcher']['heavy'].update(enabled=False, stopped_slots=1,
                probe=[sys.executable, '{root}/probe.py'])
            config = root / '.agents/board.yaml'
            command = [sys.executable, '-c', 'from pathlib import Path; Path("executed").write_text("one")']
            config.write_text(json.dumps(data))
            off, state = driver.queue_command(root, command)
            self.assertEqual(state, 'disabled')
            self.assertEqual(off, command)
            self.assertFalse((root / 'executed').exists())
            data['dispatcher']['heavy']['enabled'] = True
            config.write_text(json.dumps(data))
            queued, state = driver.queue_command(root, command)
            self.assertEqual(state, 'enabled')
            self.assertEqual(queued[queued.index('other') + 2:], command)
            self.assertEqual(queued.count(str(root / 'ops/board_heavy.py')), 1)
            result = subprocess.run(queued, cwd=root, capture_output=True, text=True, timeout=15)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((root / 'executed').read_text(), 'one')
            records = list((root / 'ops/codex-ops/heavy/records').glob('*.json'))
            self.assertEqual(len(records), 1)
            row = json.loads(records[0].read_text())
            self.assertEqual(row['role'], 'other')
            self.assertEqual(row['state'], 'running')  # exec replaces the lease owner; no invented finish ACK.


if __name__ == '__main__':
    unittest.main()
