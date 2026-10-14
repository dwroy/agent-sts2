import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

OPS = Path(__file__).resolve().parents[2] / 'ops'
sys.path.insert(0, str(OPS))
spec = importlib.util.spec_from_file_location('sim_wait', OPS / 'sim_wait.py')
w = importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)


class SimWait(unittest.TestCase):
    def test_live_progress_only(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'sim-wait.json'
            row = dict(ts='2026-01-01T00:01:00+00:00', progress_ts='2026-01-01T00:01:00+00:00',
                       active=True, run='fixed', floor=3, label='boss-lines', pid=123,
                       samples_done=300, previous_samples=100, requested=600)
            def check(value, now=1767225660, alive=True):
                path.write_text(json.dumps(value))
                return w.live_wait(directory, directory, directory, now=now, alive=lambda pid: alive)
            self.assertEqual(check(row), row)
            self.assertIsNone(check(row, now=1767225840))
            self.assertIsNone(check(row, alive=False))
            for change in ({'active': False}, {'previous_samples': 300}, {'samples_done': 0},
                           {'samples_done': 601}, {'samples_done': '300'}, {'pid': '123'},
                           {'progress_ts': '2025-12-31T23:57:00+00:00'}):
                self.assertIsNone(check({**row, **change}))


if __name__ == '__main__':
    unittest.main()
