"""Fixed process and mod identities; never connect to or stop a live game."""
import importlib.util
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


OPS = Path(__file__).resolve().parents[1]


def module(name):
    spec = importlib.util.spec_from_file_location(name, OPS / (name + ".py"))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


scope = module("process_scope")
gate = module("instance_gate")
checks = module("learner_checks")


class ProcessScopeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / "project"
        self.second = self.root / ".worktrees/regent-climb"
        self.live = self.root / ".worktrees/live"
        self.second_live = self.second
        for p in [self.root, self.second, self.live / "agent", self.second_live / "agent"]:
            p.mkdir(parents=True, exist_ok=True)
        self.proc = self.base / "proc"

    def process(self, pid, cwd, argv):
        directory = self.proc / str(pid)
        directory.mkdir(parents=True)
        (directory / "cwd").symlink_to(cwd, target_is_directory=True)
        (directory / "cmdline").write_bytes(b"\0".join(a.encode() for a in argv) + b"\0")

    def test_two_controllers_are_not_interchangeable(self):
        self.process(10, self.live / "agent", ["node", "src/index.ts", "play"])
        self.process(20, self.second_live / "agent", ["node", "src/index.ts", "play"])
        self.assertTrue(scope.belongs(10, self.root, self.live, self.proc, "play"))
        self.assertFalse(scope.belongs(20, self.root, self.live, self.proc, "play"))
        self.assertTrue(scope.belongs(20, self.second, self.second_live, self.proc, "play"))
        self.assertFalse(scope.belongs(10, self.second, self.second_live, self.proc, "play"))

    def test_nested_ops_checkout_does_not_belong_to_primary(self):
        self.process(20, self.second, ["bash", str(self.second / "ops/autoplay.sh")])
        self.assertFalse(scope.belongs(20, self.root, self.live, self.proc))
        self.assertTrue(scope.belongs(20, self.second, self.second_live, self.proc, "autoplay"))

    def test_primary_ops_absolute_and_relative_scripts_are_owned(self):
        self.process(10, self.root, ["bash", "ops/autoplay.sh"])
        self.process(11, self.root, ["python3", str(self.root / "ops/report.py"), "RUN"])
        self.assertTrue(scope.belongs(10, self.root, self.live, self.proc, "autoplay"))
        self.assertTrue(scope.belongs(11, self.root, self.live, self.proc, "report"))
        self.assertFalse(scope.belongs(11, self.root, self.live, self.proc, "autoplay"))

    def test_missing_and_reused_nonproject_pids_are_refused(self):
        self.process(10, self.root, ["python3", "unrelated.py"])
        self.assertFalse(scope.belongs(10, self.root, self.live, self.proc))
        self.assertFalse(scope.belongs(99, self.root, self.live, self.proc))

    def test_refresh_builders_are_visible_only_in_their_own_lane(self):
        self.process(10, self.root, ["node", "knowledge/builders/outcome-stats.ts"])
        self.process(20, self.second, ["node", "knowledge/builders/outcome-stats.ts"])
        self.assertTrue(scope.belongs(10, self.root, self.live, self.proc))
        self.assertFalse(scope.belongs(20, self.root, self.live, self.proc))
        self.assertTrue(scope.belongs(20, self.second, self.second_live, self.proc))

    def test_scheduler_character_comes_from_the_lane_environment(self):
        result = subprocess.run([sys.executable, "-B", str(OPS / "codex-ops-learn.py"), "status"],
                                env={**os.environ, "CHARACTER": "REGENT", "CODEX_OPS_ROOT": str(self.second),
                                     "CODEX_OPS_DIR": str(self.second / "ops/codex-ops")},
                                capture_output=True, text=True, timeout=5)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("finished regent runs", result.stdout)

    def test_full_checks_resolve_the_same_lane_merge_target(self):
        with patch.dict(os.environ, {"STS2_LIVE": str(self.second)}):
            self.assertEqual(checks.live_dir(str(self.second)), str(self.second))
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(checks.live_dir(str(self.root)), str(self.live))


class InstanceGateTests(unittest.TestCase):
    def test_expected_process_and_port_are_required(self):
        h = {"service": "sts2-ai-agent", "process_id": 20, "api_port": 8081}
        gate.validate_health(h, "http://127.0.0.1:8081", 20)
        with self.assertRaises(ValueError):
            gate.validate_health(h, "http://127.0.0.1:8081", 10)
        with self.assertRaises(ValueError):
            gate.validate_health(h, "http://127.0.0.1:8080", 20)

    def test_wrong_or_missing_profile_is_refused(self):
        gate.validate_profile({"native_profile_id": 2}, "2")
        with self.assertRaises(ValueError):
            gate.validate_profile({"native_profile_id": 1}, "2")
        with self.assertRaises(ValueError):
            gate.validate_profile({}, "2")


if __name__ == "__main__":
    unittest.main()
