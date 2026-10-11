"""Exercise the existing eight calibration dispatch fixtures with their required tree directories."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[3]
spec = importlib.util.spec_from_file_location('fixed_dispatch', ROOT/'ops/tests/test_silent_calibration_dispatch.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
original = module.CalibrationDispatch.setUp

def set_up(self):
    original(self)
    for task in module.jobs.FEATURE_REQUESTS:
        Path(self.root,'.worktrees',task).mkdir(parents=True,exist_ok=True)

module.CalibrationDispatch.setUp = set_up
suite = unittest.defaultTestLoader.loadTestsFromTestCase(module.CalibrationDispatch)
result = unittest.TextTestRunner(verbosity=2).run(suite)
raise SystemExit(not result.wasSuccessful())
