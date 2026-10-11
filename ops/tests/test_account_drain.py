"""Account drain fixtures: real command routing/completion, no models or production state."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ops"))
spec = importlib.util.spec_from_file_location("account_drain_scheduler", ROOT / "ops/codex-ops-learn.py")
scheduler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(scheduler)


class AccountDrain(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.state_file = self.root / "learn.json"
        for key, value in {"DIR": str(self.root), "STATE": str(self.state_file)}.items():
            p = patch.object(scheduler, key, value)
            p.start()
            self.addCleanup(p.stop)
        (self.root / "ACCOUNT_DRAIN").write_text("manual fixture\n")

    def test_all_dispatch_commands_defer_without_mutating_state(self):
        before = '{"batches": {"existing": {"state": "running", "pid": 123}}}\n'
        self.state_file.write_text(before)
        for command in ("tick", "dispatch", "write", "boss-check"):
            with self.subTest(command=command), patch.object(sys, "argv", ["scheduler", command]):
                self.assertEqual(scheduler.main(), 75)
                self.assertEqual(self.state_file.read_text(), before)

    def complete(self, task):
        batch = {"task": task, "state": "running", "character": "silent", "runs": ["FIXTURE00001"]}
        if task == "boss": batch.update(task="fix-batch", learner_task="boss-sim-batch", boss_sim=True)
        state = {"batches": {"fixture": batch}, "runs": {}}
        args = SimpleNamespace(batch="fixture", rc=0, character="silent")
        def finish(*unused, **kwargs): batch.update(state="done", rc=0)
        with patch.object(scheduler, "load_state", return_value=state), \
             patch.object(scheduler, "save_state") as save, \
             patch.object(scheduler, "postmortem_ids", return_value={"FIXTURE00001"}), \
             patch.object(scheduler, "read_report", return_value={}), \
             patch.object(scheduler.proposal_dispatch, "links", return_value=[]), \
             patch.object(scheduler, "ledger_lines", return_value=[]), \
             patch.object(scheduler, "enqueue") as enqueue, \
             patch.object(scheduler, "check_jobs") as jobs, \
             patch.object(scheduler, "check_ascension_audits") as asc, \
             patch.object(scheduler.ascension_audit, "finish", side_effect=finish), \
             patch.object(scheduler.boss_sim_jobs, "finish", side_effect=finish), \
             patch.object(scheduler.boss_sim_jobs, "check") as boss:
            self.assertEqual(scheduler.cmd_finish(args), 0)
            self.assertEqual(batch["state"], "done")
            save.assert_called()
            if task == "postmortem": enqueue.assert_called_once()
            return jobs.call_count, asc.call_count, boss.call_count

    def test_completion_is_saved_without_followup_dispatch(self):
        for task in ("postmortem", "ascension-audit", "boss"):
            with self.subTest(task=task): self.assertEqual(self.complete(task), (0, 0, 0))

    def test_removing_marker_restores_existing_followup(self):
        (self.root / "ACCOUNT_DRAIN").unlink()
        self.assertEqual(self.complete("postmortem"), (1, 1, 0))
        self.assertEqual(self.complete("boss"), (0, 0, 1))

    def test_scheduler_routes_to_selected_home_without_changing_session(self):
        home = self.root / "codex1"
        home.mkdir()
        (home / "auth.json").write_text("fixture, not a credential")
        (self.root / "codex-home").write_text(str(home) + "\n")
        (self.root / "queue").mkdir()
        (self.root / "queue/event.md").write_text("fixed event")
        (self.root / "session-id").write_text("fixed-existing-session\n")
        fake = self.root / "tsx"
        fake.write_text('#!/bin/sh\nprintf "%s\\n" "$LEARNER_CODEX_HOME" > "$CODEX_OPS_DIR/observed-home"\nexit 75\n')
        fake.chmod(0o755)
        env = {"HOME": str(self.root), "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
               "CODEX_OPS_ROOT": str(ROOT), "CODEX_OPS_DIR": str(self.root), "CODEX_OPS_TSX": str(fake), "CODEX_HOME": "/old/inherited/home"}
        result = subprocess.run(["bash", str(ROOT / "ops/codex-ops.sh"), "drain"], env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / "observed-home").read_text().strip(), str(home))
        self.assertEqual((self.root / "session-id").read_text(), "fixed-existing-session\n")
        self.assertTrue((self.root / "queue/event.md").exists())
        (self.root / "codex-home").write_text("relative/path\n")
        refused = subprocess.run(["bash", str(ROOT / "ops/codex-ops.sh"), "drain"], env=env, capture_output=True, text=True)
        self.assertEqual(refused.returncode, 3)


if __name__ == "__main__": unittest.main()
