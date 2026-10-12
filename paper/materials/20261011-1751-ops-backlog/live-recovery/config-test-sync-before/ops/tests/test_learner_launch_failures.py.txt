"""Fixed launcher/finish fixtures: no models, credentials, production state or play."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, patch

REPO = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("launch_failure_checks", REPO / "ops/learner_checks.py")
checks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(checks)


class FastLauncher(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / "ops").mkdir()
        (self.root / "agent/node_modules/.bin").mkdir(parents=True)
        (self.root / "bin").mkdir()
        for name in ("paths.sh", "codex-ops-learner.sh", "codex-fast.sh"):
            shutil.copy2(REPO / "ops" / name, self.root / "ops" / name)
        self.wrapper = self.root / "ops/codex-fast.sh"
        self.native = self.root / "bin/codex"
        self.write_executable(self.native, "#!/usr/bin/python3\nimport json,sys\nprint(json.dumps(sys.argv[1:]))\n")
        self.write_executable(self.root / "agent/node_modules/.bin/tsx",
                              '#!/bin/bash\nexec "$LEARNER_CODEX_BIN" sandbox -c \'model="fixture"\' '
                              '-c \'model_reasoning_effort="xhigh"\' -c \'service_tier="default"\' -- /fixture/check\n')
        (self.root / "ops/codex-ops-learn.py").write_text("# Fixed completion stub; no dispatch or production state.\n")
        self.env = {"HOME": str(self.root / "home"), "PATH": str(self.root / "bin") + ":/usr/bin:/bin",
                    "CODEX_OPS_ROOT": str(self.root), "CODEX_OPS_NO_DRAIN": "1"}

    def write_executable(self, path, content):
        path.write_text(content)
        path.chmod(0o755)

    def launch(self, **env):
        result = subprocess.run(["bash", str(self.root / "ops/codex-ops-learner.sh"),
                                 "20260101-000001-experience-update", "FIXTURE000001", "silent",
                                 "experience-update", str(self.root)],
                                env={**self.env, **env}, capture_output=True, text=True, timeout=10)
        err = self.root / "ops/codex-ops/learner/20260101-000001-experience-update.err"
        self.assertEqual(result.returncode, 0, result.stderr + (err.read_text() if err.exists() else ""))
        args = json.loads((err.with_suffix(".out")).read_text())
        self.assertEqual(args.count('service_tier="priority"'), 1)
        self.assertNotIn('service_tier="default"', args)
        self.assertIn('model="fixture"', args)
        self.assertIn('model_reasoning_effort="xhigh"', args)
        self.assertEqual(args[-2:], ["--", "/fixture/check"])

    def test_explicit_native_override_is_kept(self):
        self.launch(LEARNER_CODEX_BIN=str(self.native), STS2_CODEX_FAST_BIN="/unselected/codex")

    def test_nested_dispatch_reuses_the_original_native(self):
        self.launch(LEARNER_CODEX_BIN=str(self.wrapper), STS2_CODEX_FAST_BIN=str(self.native))

    def test_already_recursive_environment_recovers_the_native_from_path(self):
        self.launch(LEARNER_CODEX_BIN=str(self.wrapper), STS2_CODEX_FAST_BIN=str(self.wrapper))

    def test_symlink_to_wrapper_is_not_treated_as_native(self):
        alias = self.root / "fast-alias"
        alias.symlink_to(self.wrapper)
        self.launch(LEARNER_CODEX_BIN=str(alias), STS2_CODEX_FAST_BIN=str(self.native))

    def test_direct_recursive_native_and_alias_fail_closed(self):
        alias = self.root / "fast-alias"
        alias.symlink_to(self.wrapper)
        for native in (self.wrapper, alias):
            result = subprocess.run(["bash", str(self.wrapper), "sandbox"],
                                    env={**self.env, "STS2_CODEX_FAST_BIN": str(native)},
                                    capture_output=True, text=True, timeout=5)
            self.assertEqual(result.returncode, 2)
            self.assertIn("recursive Codex Fast launcher", result.stderr)


class MissingReports(unittest.TestCase):
    def finish(self, rc, report):
        batch = {"task": "experience-update", "character": "silent",
                 "proposal_policy": "Roy-2026-10-07-learning"}
        proposals = Mock()
        proposals.links.return_value = ["missing string code_proposals array"]
        proposals.experience_audit.return_value = ["missing source commit for proposal audit"]
        proposals.no_change.return_value = None
        events, notices = [], []
        with patch.object(checks, "read_report", return_value=report), \
                patch.object(checks, "proposal_tools", return_value=proposals), \
                patch.object(checks.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)):
            checks.finish_write_batch("fixed", batch, rc, "/fixture", "/reports",
                                      lambda kind, message: events.append((kind, message)), notices.append,
                                      run_checks=False)
        return batch, proposals, events, notices

    def test_preflight_or_timeout_without_report_does_not_enqueue_gameplay_repair(self):
        for rc in (3, 124):
            batch, tools, events, notices = self.finish(rc, {})
            self.assertEqual(batch["state"], "failed")
            self.assertEqual(batch["rc"], rc)
            self.assertEqual(batch["report"], {})
            self.assertEqual(batch["proposal_audit_errors"], [])
            self.assertNotIn("proposal_repair_needed", batch)
            self.assertNotIn("checks_pending", batch)
            self.assertEqual(batch["completion_failure"]["stderr"], "/reports/fixed.err")
            tools.links.assert_not_called()
            tools.experience_audit.assert_not_called()
            self.assertEqual(notices, [])
            self.assertIn("/reports/fixed.err", events[0][1])

    def test_zero_exit_without_report_still_fails_the_protocol(self):
        batch, tools, _, notices = self.finish(0, {})
        self.assertEqual(batch["state"], "failed")
        self.assertTrue(batch["proposal_repair_needed"])
        self.assertNotIn("completion_failure", batch)
        self.assertTrue(notices)
        tools.links.assert_called_once()
        tools.experience_audit.assert_called_once()

    def test_nonzero_exit_with_real_output_keeps_link_audit_and_actual_merge_fact(self):
        merged = "a" * 40
        batch, tools, _, notices = self.finish(1, {"task": "experience-update", "merged": merged})
        self.assertEqual(batch["state"], "failed")
        self.assertEqual(batch["merged"], merged)
        self.assertTrue(batch["checks_pending"])
        self.assertTrue(batch["proposal_repair_needed"])
        self.assertTrue(notices)
        tools.links.assert_called_once()
        tools.experience_audit.assert_called_once()


if __name__ == "__main__":
    unittest.main()
