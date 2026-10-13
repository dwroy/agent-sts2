"""Fixed metadata and role isolation; no Windows, network, credentials or game access."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("inspect_regent", Path(__file__).parents[1] / "regent-launch-inspect.py")
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class ProbeTests(unittest.TestCase):
    def test_refuses_a_foreign_process_even_with_similar_fields(self):
        row = {"pid": probe.ORIGINAL_PID, "executable": probe.GAME_EXE, "flag_names": ["--mods"],
               "command_line": "never-export-this", "api_key": "private-test-value"}
        self.assertNotIn("command_line", probe.process_metadata([row])[0])
        self.assertNotIn("api_key", probe.process_metadata([row])[0])
        with self.assertRaises(ValueError):
            probe.process_metadata([{**row, "pid": 999}])
        with self.assertRaises(ValueError):
            probe.process_metadata([{**row, "executable": "unrelated.exe"}])
        with self.assertRaises(ValueError):
            probe.process_metadata([{**row, "flag_names": ["--key private-test-value"]}])

    def test_mod_health_must_match_the_registered_original_process_and_port(self):
        h = {"service": "sts2-ai-agent", "process_id": probe.ORIGINAL_PID, "api_port": 8080,
             "credentials": {"key": "private-test-value"}}
        self.assertNotIn("credentials", probe.health_metadata({"ok": True, "data": h}))
        for changes in [{"process_id": 99}, {"api_port": 8081}, {"service": "other"}]:
            with self.assertRaises(ValueError):
                probe.health_metadata({"ok": True, "data": {**h, **changes}})

    def test_state_exports_only_architecture_identity(self):
        data = {"native_profile_id": 2, "session": {"mode": "singleplayer", "settings": {"key": "private-test-value"}},
                "run": {"character_id": "SILENT", "cards": ["other-role-fact"]}, "player": {"hp": 70}}
        result = probe.state_metadata({"ok": True, "data": data})
        self.assertEqual(result["native_profile_id"], 2)
        self.assertEqual(result["character_id"], "SILENT")
        self.assertNotIn("private-test-value", json.dumps(result))
        self.assertNotIn("other-role-fact", json.dumps(result))
        self.assertNotIn("hp", json.dumps(result))
        self.assertIsNone(probe.state_metadata({"ok": True, "data": {**data, "native_profile_id": {"key": "private-test-value"}}})["native_profile_id"])

    def test_other_role_or_workspace_is_rejected_before_any_probe(self):
        with tempfile.TemporaryDirectory() as path:
            root = Path(path); (root / "ops/codex-ops").mkdir(parents=True)
            (root / "ops/codex-ops/bootstrap-owner.json").write_text(json.dumps({"request_id": probe.REQUEST}))
            env = {"CHARACTER": "REGENT", "CODEX_OPS_ROOT": path, "STS2_WORKSPACE": path, "STS2_LIVE": path}
            probe.lane_guard(root, env)
            for change in [{"CHARACTER": "SILENT"}, {"STS2_LIVE": path + "/other"}, {"CODEX_OPS_ROOT": path + "/other"}]:
                with self.assertRaises(ValueError): probe.lane_guard(root, {**env, **change})


if __name__ == "__main__":
    unittest.main()
