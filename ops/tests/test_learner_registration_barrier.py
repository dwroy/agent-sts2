"""Fixed parent/child registration interleaving; no real engine, network or credentials."""
import fcntl
import json
from pathlib import Path
import subprocess
import time
import unittest

import test_learner_launch_failures as fixtures


class RegistrationBarrier(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.LearnerLauncher()
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.root = self.fixture.root
        self.state_dir = self.root / "ops/codex-ops"
        self.state_dir.mkdir(parents=True)
        self.state = self.state_dir / "learn.json"
        self.state.write_text('{"batches": {}}')
        self.batch = "20261015-191301"
        self.gate = self.root / "gate-entered"
        self.started = self.root / "launcher-started"
        self.flock = self.root / "home/.local/node/bin/flock"
        self.flock.parent.mkdir(parents=True)
        self.fixture.write_executable(self.flock,
            "#!/usr/bin/python3\nimport os, pathlib, sys\n"
            f"pathlib.Path({str(self.gate)!r}).write_text('entered')\n"
            "os.execv('/usr/bin/flock', ['flock', *sys.argv[1:]])\n")
        self.fixture.write_executable(self.root / "agent/node_modules/.bin/tsx",
            "#!/usr/bin/python3\nimport json, os, pathlib, sys\n"
            f"pathlib.Path({str(self.started)!r}).write_text(json.dumps({{\n"
            " 'batch': os.environ['LEARNER_BATCH_ID'],\n"
            " 'registration': json.loads(pathlib.Path(os.environ['LEARNER_STATE_FILE']).read_text())['batches'],\n"
            " 'args': sys.argv[1:]}))\n")

    def start(self):
        proc = subprocess.Popen(["bash", str(self.root / "ops/codex-ops-learner.sh"),
            self.batch, "RQCHNN0W72KF", "silent"],
            env={**self.fixture.env, "LEARNER_CODEX_BIN": str(self.fixture.native)},
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

        def finish():
            if proc.poll() is None:
                proc.terminate()
            proc.communicate(timeout=10)

        self.addCleanup(finish)
        return proc

    def test_waits_for_parent_registration_before_capturing_the_original_postmortem_lease(self):
        # Match cmd_tick: hold learn.lock, spawn the wrapper, then persist the batch.
        with (self.state_dir / "learn.lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            proc = self.start()
            deadline = time.monotonic() + 5
            while not self.gate.exists() and not self.started.exists() and proc.poll() is None:
                self.assertLess(time.monotonic(), deadline, "wrapper never reached the registration gate")
                time.sleep(0.01)
            self.assertTrue(self.gate.exists(), "launcher ran before synchronizing with the parent's registration")
            self.assertFalse(self.started.exists(), "learner started inside the parent's unsaved transaction")
            registration = {"state": "running", "pid": proc.pid, "runs": ["RQCHNN0W72KF"], "character": "silent"}
            saved = {"batches": {self.batch: registration}}
            self.state.write_text(json.dumps(saved))
            fcntl.flock(lock, fcntl.LOCK_UN)
        _, stderr = proc.communicate(timeout=10)
        self.assertEqual(proc.returncode, 0, stderr)
        launch = json.loads(self.started.read_text())
        self.assertEqual(launch["batch"], self.batch)
        self.assertEqual(launch["registration"], saved["batches"])
        self.assertEqual(launch["args"][0], str(self.root / "learner/run.ts"))
        for flag, value in (("--cwd", str(self.root)), ("--model", "gpt-6.1-sol"), ("--effort", "xhigh")):
            self.assertEqual(launch["args"][launch["args"].index(flag) + 1], value)
        rows = [json.loads(line) for line in (self.state_dir / "learner" / (self.batch + ".err.entry.jsonl")).read_text().splitlines()]
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["batch"], self.batch)
        self.assertRegex(rows[0]["lease"], r"^[a-f0-9]{64}$")
        self.assertEqual(self.state.read_text(), json.dumps(saved))

    def test_registration_lock_timeout_starts_no_learner_and_preserves_state(self):
        # Return the real flock timeout status immediately; never spend 120 seconds in a fixture.
        self.fixture.write_executable(self.flock,
            "#!/usr/bin/python3\nimport pathlib, sys\n"
            f"pathlib.Path({str(self.gate)!r}).write_text('timeout')\nsys.exit(1)\n")
        proc = self.start()
        _, stderr = proc.communicate(timeout=10)
        self.assertEqual(proc.returncode, 75, stderr)
        self.assertTrue(self.gate.exists())
        self.assertFalse(self.started.exists())
        self.assertEqual(self.state.read_text(), '{"batches": {}}')
        err = self.state_dir / "learner" / (self.batch + ".err")
        self.assertIn("registration lock wait timed out", err.read_text())
        self.assertFalse(Path(str(err) + ".entry.jsonl").exists())


if __name__ == "__main__":
    unittest.main()
