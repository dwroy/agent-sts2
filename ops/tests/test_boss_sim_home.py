"""Fixed launch metadata only: no real credentials, panes, learners or network."""
import importlib.util
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("ops_report_home", ROOT / "ops/report.py")
report = importlib.util.module_from_spec(spec)
spec.loader.exec_module(report)


class BossSimHome(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.state = self.root / "ops/codex-ops"
        self.state.mkdir(parents=True)
        self.home = self.root / "selected-home"
        self.home.mkdir()
        # Only existence is inspected, as by codex-ops.sh; this is never a login.
        (self.home / "auth.json").touch()
        self.selector = self.state / "codex-home"
        self.selector.write_text(str(self.home) + "\n")

    def dispatch(self, env):
        with patch.dict(os.environ, env, clear=True), patch.object(report, "ROOT", str(self.root)), \
                patch.object(report, "LIVE", "/fixture/live"), patch.object(report.subprocess, "run") as run:
            report.boss_sim_check("SILENT")
        return run

    def assert_herdr_launch(self, env, *, fixed_command=False):
        import sys
        sys.path.insert(0, str(ROOT / "ops"))
        import learner_jobs
        launch_env = {**env, "CODEX_OPS_LEARNER_HOST": "herdr"}
        if fixed_command:
            launch_env["LEARNER_CMD"] = "/fixture/fixed-command"
        output = "w1:p2 34567\n" if fixed_command else "w1:p2\n"
        argv = ["bash", "/fixture/wrapper"]
        with patch.dict(os.environ, launch_env, clear=True), \
                patch.object(learner_jobs.subprocess, "run", return_value=subprocess.CompletedProcess([], 0, output, "")) as start, \
                patch.object(learner_jobs.subprocess, "Popen") as supervisor:
            supervisor.return_value.pid = 34567
            self.assertEqual(learner_jobs.start_learner(argv, str(self.root), "/fixture/scripts", str(self.state), "fixed"), (34567, "w1:p2"))
        if fixed_command:
            supervisor.assert_not_called()
            command = start.call_args.args[0]
            self.assertEqual(command[:4], ["bash", "/fixture/scripts/herdr-host.sh", "run", "fixed"])
            index = command.index("LEARNER_CODEX_HOME=" + env["LEARNER_CODEX_HOME"])
            self.assertEqual(command[index - 1], "--env")
            self.assertIn("--close-on-exit", command)
            self.assertEqual(command[-3:], ["--", *argv])
        else:
            start.assert_called_once_with(["bash", "/fixture/scripts/herdr-host.sh", "open-pane", "fixed"],
                                          cwd=str(self.root), stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=90)
            supervisor.assert_called_once_with(["nice", "-n", "19", *argv], cwd=str(self.root),
                                               env={**launch_env, "LEARNER_HERDR_PANE": "w1:p2", "LEARNER_HERDR_LABEL": "fixed",
                                                    "LEARNER_TUI_RECEIPT": str(self.state / "learner/fixed.tui.json")},
                                               stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True)
            self.assertEqual((self.state / "learner/fixed.pid").read_text(), "34567\n")

    def test_selected_project_home_overrides_inherited_global_home_and_reaches_herdr(self):
        call = self.dispatch({"HOME": str(self.root), "CODEX_HOME": "/fixture/global-home"})
        env = call.call_args.kwargs["env"]
        self.assertEqual(env["LEARNER_CODEX_HOME"], str(self.home))
        self.assertEqual(env["CODEX_HOME"], "/fixture/global-home")
        self.assertEqual(call.call_args.args[0][-3:], ["boss-check", "--character", "silent"])
        self.assertEqual(call.call_args.kwargs["timeout"], 120)
        self.assert_herdr_launch(env)

    def test_explicit_learner_home_remains_authoritative(self):
        call = self.dispatch({"LEARNER_CODEX_HOME": "/fixture/explicit", "CODEX_HOME": "/fixture/global"})
        self.assertEqual(call.call_args.kwargs["env"]["LEARNER_CODEX_HOME"], "/fixture/explicit")
        self.assert_herdr_launch(call.call_args.kwargs["env"])

    def test_explicit_fixed_command_keeps_legacy_herdr_environment_forwarding(self):
        for override in ({}, {"LEARNER_CODEX_HOME": "/fixture/explicit"}):
            with self.subTest(override=override):
                call = self.dispatch({"CODEX_HOME": "/fixture/global", **override})
                env = call.call_args.kwargs["env"]
                self.assertEqual(env["LEARNER_CODEX_HOME"], override.get("LEARNER_CODEX_HOME", str(self.home)))
                self.assert_herdr_launch(env, fixed_command=True)

    def test_alternate_state_directory_uses_its_own_selector(self):
        other = self.root / "other-state"
        other.mkdir()
        (other / "codex-home").write_text(str(self.home) + "\n")
        self.selector.write_text("relative-invalid\n")
        call = self.dispatch({"CODEX_OPS_DIR": str(other)})
        self.assertEqual(call.call_args.kwargs["env"]["LEARNER_CODEX_HOME"], str(self.home))

    def test_invalid_selector_never_dispatches_even_with_an_explicit_override(self):
        for selected in ("relative-home", str(self.root / "missing"), str(self.root)):
            with self.subTest(selected=selected):
                self.selector.write_text(selected + "\n")
                call = self.dispatch({"LEARNER_CODEX_HOME": "/fixture/explicit"})
                call.assert_not_called()
        self.assertIn("invalid project Codex home selector", (self.root / "ops/boss-sim-dispatch.log").read_text())

    def test_no_selector_keeps_inherited_home_or_project_isolated_default(self):
        self.selector.unlink()
        for env, expected in (({"CODEX_HOME": "/fixture/inherited"}, "/fixture/inherited"),
                              ({"HOME": str(self.root)}, str(self.root / ".codex-sts2"))):
            with self.subTest(env=env):
                call = self.dispatch(env)
                self.assertEqual(call.call_args.kwargs["env"]["LEARNER_CODEX_HOME"], expected)


if __name__ == "__main__":
    unittest.main()
