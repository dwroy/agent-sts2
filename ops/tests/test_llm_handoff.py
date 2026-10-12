"""Provider-neutral handoff and real launcher boundaries using fixed, offline fixtures."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ops"))
from llm_handoff import Handoff, locked
from llm_switch import cron_home, validate_profile, CodexAdapter
from ops_assist import Assist


class Protocol(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.tx = Handoff(self.root, "fixture")
        self.tx.prepare({"session": "old"}, {"engine": "fixture-provider"}, {"ok": True})
        self.ready = {"active_workers": [], "ops_idle": True, "checkpoint_ready": True, "inventory_complete": True}
        self.adapter = Mock()
        self.adapter.backup.return_value = {"old": "config"}
        self.adapter.activate.return_value = {"new": "config"}

    def activate(self):
        self.tx.begin()
        self.tx.activate(self.adapter, self.ready)
        self.tx.verified({"ok": True, "new_session": "new", "target_digest": self.tx.read()["target_digest"]})

    def test_success_preserves_manual_pause_and_stop(self):
        pause = self.tx.runtime / "PAUSE"
        pause.write_text("manual pause")
        stop = self.root / "ops/STOP"
        stop.write_text("manual cancellation")
        self.activate()
        self.assertEqual(self.tx.release()["phase"], "complete")
        self.assertEqual(pause.read_text(), "manual pause")
        self.assertEqual(stop.read_text(), "manual cancellation")
        self.assertFalse((self.tx.runtime / "LLM_DRAIN").exists())

    def test_crash_during_begin_retains_ownership(self):
        state = self.tx.read()
        state["owned_flags"] = ["ops/codex-ops/LLM_DRAIN"]
        self.tx.save(state)
        (self.tx.runtime / "LLM_DRAIN").write_text("fixture\n")
        state = self.tx.begin()
        self.assertEqual(state["owned_flags"].count("ops/codex-ops/LLM_DRAIN"), 1)
        self.assertNotIn("ops/codex-ops/LLM_DRAIN", state["preserved_flags"])
        self.assertFalse((self.root / "ops/STOP").exists())
        self.assertEqual(self.tx.begin(), state)

    def test_duplicate_request_and_another_drain_refused(self):
        with self.assertRaises(ValueError): self.tx.prepare({}, {"engine": "changed"}, {"ok": True})
        (self.tx.runtime / "LLM_DRAIN").write_text("another\n")
        with self.assertRaises(ValueError): self.tx.begin()
        self.assertFalse((self.tx.runtime / "PAUSE").exists())

    def test_busy_unknown_and_missing_checkpoint_cannot_activate(self):
        self.tx.begin()
        for field, value in (("active_workers", [{"pid": 123}]), ("ops_idle", False),
                             ("checkpoint_ready", False), ("inventory_complete", False)):
            with self.subTest(field=field), self.assertRaises(ValueError):
                self.tx.activate(self.adapter, {**self.ready, field: value})
        self.adapter.activate.assert_not_called()
        self.assertEqual(self.tx.observe(self.ready)["phase"], "ready")
        self.assertEqual(self.tx.observe({**self.ready, "ops_idle": False})["phase"], "draining")

    def test_target_tamper_refused(self):
        self.tx.begin()
        state = self.tx.read()
        state["target"]["engine"] = "changed"
        self.tx.save(state)
        with self.assertRaises(ValueError): self.tx.activate(self.adapter, self.ready)
        self.adapter.activate.assert_not_called()

    def test_failed_activation_rolls_back_without_releasing_admission(self):
        self.tx.begin()
        self.adapter.activate.side_effect = RuntimeError("activation")
        self.adapter.rollback.side_effect = RuntimeError("rollback")
        with self.assertRaisesRegex(RuntimeError, "activation"):
            self.tx.activate(self.adapter, self.ready)
        self.assertEqual(self.tx.read()["phase"], "failed")
        self.assertFalse(self.tx.read()["rolled_back"]["configuration_restored"])
        self.assertTrue((self.tx.runtime / "LLM_DRAIN").exists())
        with self.assertRaises(ValueError): self.tx.release()

    def test_foreign_or_unverified_session_cannot_release(self):
        self.tx.begin()
        state = self.tx.activate(self.adapter, self.ready)
        for receipt in ({"ok": False}, {"ok": True, "new_session": "old", "target_digest": state["target_digest"]},
                        {"ok": True, "new_session": "new", "target_digest": "wrong"}):
            with self.assertRaises(ValueError): self.tx.verified(receipt)
        with self.assertRaises(ValueError): self.tx.release()

    def test_ownership_change_does_not_partially_release(self):
        self.activate()
        (self.tx.runtime / "PAUSE").write_text("another owner")
        with self.assertRaises(ValueError): self.tx.release()
        self.assertTrue((self.tx.runtime / "LLM_DRAIN").exists())

    def test_concurrent_controller_cannot_take_lock(self):
        with locked(self.tx.runtime / "llm-switch.lock"):
            with self.assertRaises(BlockingIOError):
                with locked(self.tx.runtime / "llm-switch.lock"): pass

    def test_cron_updates_only_project_account(self):
        cron = 'OTHER_HOME=keep\n# BEGIN agent-sts2 codex-ops\nLEARNER_CODEX_HOME=/old\n*/5 job\n# END agent-sts2 codex-ops\nother-job\n'
        changed = cron_home(cron, "/new")
        self.assertEqual(changed, cron.replace("/old", "/new"))
        self.assertEqual(cron_home(changed, "/old"), cron)
        with self.assertRaises(ValueError): cron_home(cron + cron, "/new")

    def test_no_implicit_provider_or_model_fallback(self):
        profile = dict(engine="unknown", account="fixture", model="gpt-6-astra", effort="xhigh", service_tier="default",
                       learner_home="/unavailable", brain_home="/unavailable", handoff="notes/test.md")
        with self.assertRaisesRegex(ValueError, "adapter"): validate_profile(profile)
        profile.update(engine="codex", model="another-model")
        with self.assertRaisesRegex(ValueError, "model policy"): validate_profile(profile)

    def test_auxiliary_dispatch_stops_before_reconcile(self):
        self.tx.begin()
        manager = Assist(self.root, self.tx.runtime)
        with patch.object(manager, "reconcile") as reconcile:
            with self.assertRaisesRegex(ValueError, "drain"): manager.dispatch("fixture")
            reconcile.assert_not_called()

    def test_real_launchers_defer_before_any_game_or_broker_work(self):
        ops = self.root / "ops"
        for name in ("paths.sh", "run.sh", "autoplay.sh", "codex-ops-actions.sh"):
            shutil.copy(ROOT / "ops" / name, ops / name)
        self.tx.begin()
        env = {"PATH": os.environ["PATH"], "HOME": str(self.root)}
        for name, args, expected in (("run.sh", [], 76), ("autoplay.sh", [], 0),
                                     ("codex-ops-actions.sh", ["autoplay-start"], 75),
                                     ("codex-ops-actions.sh", ["ops-assist", "fixture"], 75)):
            result = subprocess.run(["bash", str(ops / name), *args], env=env, capture_output=True, text=True, timeout=5)
            self.assertEqual(result.returncode, expected, result.stderr)
        self.assertFalse((self.root / "ops/STOP").exists())

    def test_brain_selector_is_passed_to_next_play(self):
        ops = self.root / "ops"
        for name in ("paths.sh", "run.sh"): shutil.copy(ROOT / "ops" / name, ops / name)
        live = self.root / "live/agent"
        live.mkdir(parents=True)
        home = self.root / "brain"
        home.mkdir()
        (home / "auth.json").write_text("not a credential")
        (self.tx.runtime / "brain-home").write_text(str(home) + "\n")
        bin_dir = self.root / ".local/node/bin"
        bin_dir.mkdir(parents=True)
        for name, body in {"git": "exit 0", "curl": "exit 0", "npx": 'printf "%s" "$BRAIN_CODEX_HOME" > "$HOME/observed"'}.items():
            exe = bin_dir / name
            exe.write_text("#!/bin/sh\n" + body + "\n")
            exe.chmod(0o755)
        env = {"PATH": str(bin_dir) + ":/usr/bin:/bin", "HOME": str(self.root), "STS2_LIVE": str(live.parent)}
        result = subprocess.run(["bash", str(ops / "run.sh")], env=env, capture_output=True, text=True, timeout=5)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.root / "observed").read_text(), str(home))
        (self.tx.runtime / "brain-home").write_text("relative\n")
        (self.root / "observed").unlink()
        refused = subprocess.run(["bash", str(ops / "run.sh")], env=env, capture_output=True, timeout=5)
        self.assertEqual(refused.returncode, 3)
        self.assertFalse((self.root / "observed").exists())

    def test_drain_during_play_keeps_one_completion_report(self):
        ops = self.root / "ops"
        for name in ("paths.sh", "autoplay.sh"): shutil.copy(ROOT / "ops" / name, ops / name)
        logs = self.root / "logs"
        (logs / "console").mkdir(parents=True)
        (logs / "decisions.jsonl").write_text(json.dumps({"fingerprint": json.dumps({"run": "FIXTURE"})}) + "\n")
        (logs / "console/fixed.log").write_text("stopped: run 1 ended (defeat)\n")
        (ops / "brain_wait.py").write_text("raise SystemExit(1)\n")
        (ops / "report.py").write_text('import os\nfrom pathlib import Path\np=Path(os.environ["LOGS"])\n(p/"runs.jsonl").write_text(\'{"run_id": "FIXTURE"}\\n\')\nwith (p/"reports").open("a") as f: f.write("reported\\n")\n')
        launcher = ops / "run.sh"
        launcher.write_text('#!/bin/sh\ntouch "$(dirname "$0")/codex-ops/LLM_DRAIN"\nexit 0\n')
        launcher.chmod(0o755)
        bin_dir = self.root / "bin"
        bin_dir.mkdir()
        (bin_dir / "sleep").write_text("#!/bin/sh\nexit 0\n")
        (bin_dir / "sleep").chmod(0o755)
        result = subprocess.run(["bash", str(ops / "autoplay.sh")],
                                env={"PATH": str(bin_dir) + ":/usr/bin:/bin", "HOME": str(self.root)},
                                capture_output=True, text=True, timeout=5)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((logs / "reports").read_text(), "reported\n")
        self.assertFalse((ops / "STOP").exists())

    def test_reused_pane_exports_target_home_before_session_start(self):
        home = str(self.root / "home with 'quote;$(false)")
        calls = []
        def fake_command(args):
            calls.append(args)
            if args[1:3] == ["pane", "process-info"]:
                return json.dumps({"result": {"process_info": {"foreground_process_group_id": 12, "shell_pid": 12}}})
            self.assertEqual(args[1:4], ["pane", "run", "fixed-pane"])
            result = subprocess.run(["bash", "-c", args[4]], capture_output=True, text=True, timeout=3)
            self.assertEqual(result.returncode, 0, result.stderr)
            return ""
        with patch("llm_switch.command", side_effect=fake_command):
            marker = CodexAdapter(self.tx).configure_pane("fixed-pane", home, "target")
        self.assertEqual(Path(marker).read_text(), home + "\n")
        self.assertEqual(len(calls), 2)


if __name__ == "__main__": unittest.main()
