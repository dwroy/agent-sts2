"""Fixed terminal exits and missing markers; the run stub never invokes play."""
from pathlib import Path
import json
import shutil
import subprocess
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]


class MissingFaultMarker(unittest.TestCase):
    def fixture(self, exit_code, marker=None, write_terminal=False, log_failure=False):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            ops = root / "ops"
            ops.mkdir()
            logs = root / "logs"
            logs.mkdir()
            for name in ("paths.sh", "autoplay.sh", "brain_wait.py", "publication_gate.py"):
                shutil.copy2(REPO / "ops" / name, ops / name)
            if marker is not None:
                (logs / "brain-wait.json").write_text(json.dumps(marker))
            if log_failure:
                (ops / "autoplay.log").mkdir()
            terminal = 'printf \'%s\\n\' \'{"state":"fault","question_id":"fixed"}\' > "$LOGS/brain-wait.json"\n' if write_terminal else ""
            run = ops / "run.sh"
            run.write_text('#!/bin/bash\nprintf \'call\\n\' >> "$LOGS/calls"\n' + terminal + f'exit {exit_code}\n')
            run.chmod(0o755)
            hook = root / "fixed-shell.sh"
            hook.write_text('sleep() { touch "$LOGS/slept"; exit 87; }\n')
            result = subprocess.run(["nice", "-n", "19", "bash", str(ops / "autoplay.sh")],
                                    env={"PATH": "/usr/bin:/bin", "BASH_ENV": str(hook)},
                                    capture_output=True, text=True, timeout=5)
            return result, (logs / "calls").read_text(), (logs / "slept").exists(), (
                json.loads((logs / "brain-wait.json").read_text()) if (logs / "brain-wait.json").exists() else None)

    def test_missing_marker_exits_with_terminal_status_without_sleeping_or_restarting(self):
        for code in (75, 78):
            with self.subTest(code=code):
                result, calls, slept, marker = self.fixture(code)
                self.assertEqual(result.returncode, code, result.stderr)
                self.assertIn("awaiting explicit recovery", result.stderr)
                self.assertIn("marker missing or stale", result.stderr)
                self.assertEqual(calls, "call\n")
                self.assertFalse(slept)
                self.assertIsNone(marker)

    def test_old_resumed_marker_and_failed_loop_log_do_not_hide_terminal_exit(self):
        old = {"state": "resumed", "question_id": "old", "run_id": "OLD-RUN"}
        result, calls, slept, marker = self.fixture(78, old, log_failure=True)
        self.assertEqual(result.returncode, 78, result.stderr)
        self.assertIn("brain blocked (exit 78)", result.stderr)
        self.assertEqual(calls, "call\n")
        self.assertFalse(slept)
        self.assertEqual(marker, old)

    def test_successfully_written_terminal_marker_keeps_existing_explicit_hold(self):
        result, calls, slept, marker = self.fixture(75, write_terminal=True)
        self.assertEqual(result.returncode, 87, result.stderr)
        self.assertTrue(slept)
        self.assertEqual(calls, "call\n")
        self.assertEqual(marker["state"], "fault")


if __name__ == "__main__":
    unittest.main()
