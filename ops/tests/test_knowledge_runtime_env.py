"""Fixed project configuration/transport tests; no model, game, tick or production database."""
from contextlib import nullcontext
import importlib.util
import io
import json
import os
from pathlib import Path
import shlex
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

OPS = Path(__file__).parents[1]
sys.path.insert(0, str(OPS))
import knowledge_runtime_env as control
import learner_jobs


class RuntimeEnvironmentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.directory = self.root / "ops/codex-ops"
        self.directory.mkdir(parents=True)
        self.runtime = self.root / "data/runtime with 'quote'"
        self.file = self.directory / "knowledge-runtime.json"

    def configure(self, enabled=True, **extra):
        value = {"schema": "knowledge-runtime-control-v1", "root": str(self.root), "enabled": enabled,
                 "runtime_dir": str(self.runtime), **extra}
        self.file.write_text(json.dumps(value))

    def test_missing_and_disabled_are_read_only_and_keep_default_off(self):
        original = {"OTHER": "unchanged"}
        selected = control.apply(self.root, self.directory, env=original)
        self.assertIsNone(selected[control.RUNTIME])
        self.assertNotIn(control.RUNTIME, original)
        self.assertEqual(original["OTHER"], "unchanged")
        self.assertFalse((self.root / "data").exists())
        self.configure(False)
        selected = control.snapshot(self.root, self.directory, env={control.RUNTIME: str(self.runtime)})
        self.assertIsNone(selected[control.RUNTIME])
        self.assertFalse(self.runtime.exists())

    def test_one_file_selects_identical_dispatcher_and_new_run_values(self):
        self.configure()
        parent, game = {}, {}
        dispatch = control.apply(self.root, self.directory, env=parent)
        selected = control.apply(self.root, self.directory, env=game)
        self.assertEqual(dispatch, selected)
        self.assertEqual(parent[control.RUNTIME], str(self.runtime))
        self.assertEqual(len(parent[control.SHA]), 64)
        self.assertFalse(self.runtime.exists())

    def test_wrapper_finish_preserve_selection_and_next_tick_reads_new_control(self):
        self.configure()
        parent = {}
        before = control.apply(self.root, self.directory, env=parent)
        self.configure(False)
        self.assertEqual(control.apply(self.root, self.directory, env=parent.copy(), preserve=True), before)
        self.assertIsNone(control.apply(self.root, self.directory, env=parent.copy())[control.RUNTIME])
        self.file.unlink()
        self.assertIsNone(control.snapshot(self.root, self.directory, env=parent)[control.RUNTIME])

    def test_disabled_wrapper_is_not_reclassified_when_control_is_enabled(self):
        parent = {}
        before = control.apply(self.root, self.directory, env=parent)
        self.configure()
        self.assertEqual(control.snapshot(self.root, self.directory, env=parent, preserve=True), before)
        self.assertEqual(control.snapshot(self.root, self.directory, env=parent)[control.RUNTIME], str(self.runtime))

    def test_legacy_explicit_environment_remains_supported_without_control(self):
        selected = control.snapshot(self.root, self.directory, env={control.RUNTIME: str(self.runtime)})
        self.assertEqual(selected[control.RUNTIME], str(self.runtime))
        self.assertEqual(selected[control.SOURCE], "explicit")
        outside_state = self.root.parent / "missing-fixture-state"
        self.assertIsNone(control.snapshot(self.root, outside_state, env={})[control.RUNTIME])

    def test_invalid_or_foreign_control_fails_closed_without_opening_database(self):
        for change in [{"root": str(self.root.parent)}, {"enabled": "true"}, {"runtime_dir": str(self.root.parent)}, {"schema": "unknown"}, {"extra": True}]:
            self.configure(**change)
            with self.assertRaises(ValueError):
                control.snapshot(self.root, self.directory, env={})
        self.file.write_text("{")
        with self.assertRaises(ValueError):
            control.snapshot(self.root, self.directory, env={})
        self.assertFalse(self.runtime.exists())
        self.file.unlink()
        target = self.root / "ordinary-fixture.json"
        target.write_text("{}")
        self.file.symlink_to(target)
        with self.assertRaises(OSError):
            control.snapshot(self.root, self.directory, env={})

    def test_shell_exports_quote_paths_and_reach_child_environment(self):
        self.configure()
        selected = control.snapshot(self.root, self.directory, env={})
        exports = "\n".join("unset " + key if value is None else "export " + key + "=" + shlex.quote(value) for key, value in selected.items())
        script = exports + "\nexec " + shlex.quote(sys.executable) + " -c " + shlex.quote("import os,json; print(json.dumps({k:os.environ.get(k) for k in " + repr(list(selected)) + "}))")
        child = subprocess.run(["bash", "-c", script], capture_output=True, text=True, check=True)
        self.assertEqual(json.loads(child.stdout), selected)

    def test_original_sets_id_and_native_host_transports_keep_all_selected_fields(self):
        self.configure()
        selected = control.snapshot(self.root, self.directory, env={})
        with patch.dict(os.environ, {**selected, "LEARNER_CMD": "fixture"}, clear=False), \
                patch.object(learner_jobs.publication_gate, "learners_held", return_value=False), \
                patch.object(learner_jobs.publication_gate, "candidates_only", return_value=False):
            with patch.object(learner_jobs, "hosting", return_value="setsid"), patch.object(learner_jobs.subprocess, "Popen") as popen:
                popen.return_value.pid = 123
                learner_jobs.start_learner(["bash", "fixture-wrapper.sh"], str(self.root), str(OPS), str(self.directory), "fixed")
                for key, value in selected.items():
                    self.assertEqual(popen.call_args.kwargs["env"][key], value)
            with patch.object(learner_jobs, "hosting", return_value="herdr"), patch.object(learner_jobs.subprocess, "run") as run:
                run.return_value = subprocess.CompletedProcess([], 0, stdout="fixture:p1 123\n", stderr="")
                learner_jobs.start_learner(["bash", "fixture-wrapper.sh"], str(self.root), str(OPS), str(self.directory), "fixed")
                argv = run.call_args.args[0]
                for key, value in selected.items():
                    self.assertIn(key + "=" + value, argv)
            os.environ.pop("LEARNER_CMD", None)
            with patch.object(learner_jobs, "hosting", return_value="herdr"), \
                    patch.object(learner_jobs.subprocess, "run") as run, patch.object(learner_jobs.subprocess, "Popen") as popen:
                run.return_value = subprocess.CompletedProcess([], 0, stdout="fixture:p1\n", stderr="")
                popen.return_value.pid = 123
                learner_jobs.start_learner(["bash", "fixture-wrapper.sh"], str(self.root), str(OPS), str(self.directory), "fixed")
                for key, value in selected.items():
                    self.assertEqual(popen.call_args.kwargs["env"][key], value)

    def test_actual_scheduler_cli_applies_control_before_dispatch_and_preserves_finish(self):
        self.configure()
        with patch.dict(os.environ, {"CODEX_OPS_ROOT": str(self.root), "CODEX_OPS_DIR": str(self.directory)}, clear=False):
            spec = importlib.util.spec_from_file_location("knowledge_env_scheduler_fixture", OPS / "codex-ops-learn.py")
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            captured = []
            def observed(_args):
                captured.append({key: os.environ.get(key) for key in (control.RUNTIME, control.SHA, control.ROOT, control.SOURCE)})
                return 0
            with patch.object(module, "state_lock", return_value=nullcontext()), \
                    patch.object(module, "account_draining", return_value=False), \
                    patch.object(module.publication_gate, "candidates_only", return_value=False), \
                    patch.object(module.ordinary_close, "close_pending"), \
                    patch.object(module, "load_state", return_value={"batches": {"fixed": {}}}), \
                    patch.object(module, "cmd_tick", observed), patch.object(module, "cmd_finish", observed):
                with patch.object(sys, "argv", ["scheduler", "tick"]):
                    self.assertEqual(module.main(), 0)
                self.configure(False)
                with patch.object(sys, "argv", ["scheduler", "finish", "--batch", "fixed", "--rc", "0"]):
                    self.assertEqual(module.main(), 0)
                self.assertEqual(captured[0], captured[1])
                with patch.object(sys, "argv", ["scheduler", "tick"]):
                    self.assertEqual(module.main(), 0)
                self.assertIsNone(captured[-1][control.RUNTIME])
                self.file.write_text("{")
                with patch.object(sys, "argv", ["scheduler", "tick"]), patch.object(sys, "stdout", new_callable=io.StringIO) as output:
                    self.assertEqual(module.main(), 78)
                    self.assertIn("invalid_knowledge_runtime_control", output.getvalue())
                self.assertEqual(len(captured), 3)

    def test_original_dispatch_write_persists_the_exact_child_selection(self):
        self.configure()
        state = {"batches": {}}
        child = []
        def start(*_args):
            child.append({key: os.environ.get(key) for key in (control.RUNTIME, control.ROOT, control.SHA, control.SOURCE)})
            return 123, None
        import ordinary_close
        with patch.dict(os.environ, {"CODEX_OPS_DIR": str(self.directory)}, clear=False), \
                patch.object(learner_jobs.publication_gate, "learners_held", return_value=False), \
                patch.object(learner_jobs.publication_gate, "candidates_only", return_value=False), \
                patch.object(learner_jobs, "busy", return_value=False), patch.object(learner_jobs, "available", return_value=True), \
                patch.object(ordinary_close, "baseline", return_value={}), patch.object(learner_jobs, "start_learner", side_effect=start):
            result = learner_jobs.dispatch_write(state, str(self.root), str(OPS), "experience-update", "ironclad", ["FIXTURE00001"], "fixed", "ops", lambda _: False, "20261025-015001")
        batch = json.loads(json.dumps(state))["batches"][result[0]]
        with control.bound_batch(self.root, batch, env={}) as restored:
            self.assertEqual(restored, child[0])
        self.assertEqual(batch["knowledge_runtime"]["directory"], str(self.runtime))

    def test_recovery_does_not_follow_an_original_directory_redirected_to_another_store(self):
        self.configure()
        self.runtime.mkdir(parents=True)
        with patch.dict(os.environ, {}, clear=True):
            original = control.capture(self.root, self.directory)
        other = self.root / "data/other-runtime"
        other.mkdir()
        self.runtime.rmdir()
        self.runtime.symlink_to(other, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "redirected"):
            with control.bound_batch(self.root, {"knowledge_runtime": original}, env={}):
                self.fail("must hold before any publisher can open the other store")


if __name__ == "__main__":
    unittest.main()
