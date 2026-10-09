"""Run calibration dispatch cases with the required dedicated directories present in fixed fixtures."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('fixed_dispatch', ROOT / 'ops/tests/test_silent_calibration_dispatch.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
original = module.CalibrationDispatch.setUp

def set_up(self):
    original(self)
    # The current dispatcher explicitly requires dedicated trees to exist before inspecting availability.
    for task in module.jobs.FEATURE_REQUESTS:
        Path(self.root, '.worktrees', task).mkdir(parents=True, exist_ok=True)

module.CalibrationDispatch.setUp = set_up
suite = unittest.defaultTestLoader.loadTestsFromTestCase(module.CalibrationDispatch)
result = unittest.TextTestRunner(verbosity=2).run(suite)
raise SystemExit(not result.wasSuccessful())
