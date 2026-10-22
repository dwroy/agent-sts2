import importlib.util
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[3]
WORK = Path(os.environ.get('REVIEW_WORKTREE', str(ROOT / '.worktrees/integrator-20-20261022')))
sys.path.insert(0, str(WORK / 'ops'))
spec = importlib.util.spec_from_file_location('original_launch_tests', WORK / 'ops/tests/test_launch_runtime.py')
original = importlib.util.module_from_spec(spec)
spec.loader.exec_module(original)
launch = original.launch

class BehaviorBoundary(original.LaunchPublication):
    def test_parent_sim_and_ranking_policy_cannot_enter_pinned_launch(self):
        self.pin()
        injected = {'SIM_ADAPTIVE': 'off', 'SIM_FAILURE_EXIT': 'off', 'S_BUILD_RANK': 'on', 'S_READINESS': 'on'}
        with patch.dict(os.environ, injected):
            _, env, _ = launch.selection(self.root, self.live, 'run')
        leaked = {key: env[key] for key in injected if key in env}
        self.assertEqual(leaked, {}, 'Unpublished parent game policy crossed publication boundary')

    def test_sim_policy_can_be_published_explicitly(self):
        files = {'ops/launch-settings.json': json.dumps({'SIM_ADAPTIVE': 'shadow', 'SIM_FAILURE_EXIT': 'on'}).encode()}
        self.assertEqual(launch.launch_settings(files), {'SIM_ADAPTIVE': 'shadow', 'SIM_FAILURE_EXIT': 'on'})

    def test_ranking_policy_can_be_published_explicitly(self):
        files = {'ops/launch-settings.json': json.dumps({'S_BUILD_RANK': 'shadow', 'S_READINESS': 'shadow'}).encode()}
        self.assertEqual(launch.launch_settings(files), {'S_BUILD_RANK': 'shadow', 'S_READINESS': 'shadow'})

if __name__ == '__main__':
    suite = unittest.TestSuite()
    suite.addTests(unittest.defaultTestLoader.loadTestsFromTestCase(original.LaunchPublication))
    for name in ('test_parent_sim_and_ranking_policy_cannot_enter_pinned_launch', 'test_sim_policy_can_be_published_explicitly', 'test_ranking_policy_can_be_published_explicitly'):
        suite.addTest(BehaviorBoundary(name))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    sys.exit(not result.wasSuccessful())
