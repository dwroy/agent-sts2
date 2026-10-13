"""Fixed startup contracts and durable deduplication; no native game or network."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import subprocess
import tempfile
import unittest
from unittest.mock import patch

OPS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(OPS))
spec = importlib.util.spec_from_file_location('regent_solo', OPS / 'regent-launch-solo.py')
solo = importlib.util.module_from_spec(spec);spec.loader.exec_module(solo)
from instance_env import binding_env
from regent_lane_env import lane_env


class SoloTests(unittest.TestCase):
    def test_actual_fresh_shell_consumes_own_lane_then_bound_game(self):
        with tempfile.TemporaryDirectory() as path:
            root=Path(path)/'.worktrees/regent-climb';ops=root/'ops';ops.mkdir(parents=True)
            for name in ['paths.sh','instance_env.py','regent_lane_env.py']:
                (ops/name).write_bytes((OPS/name).read_bytes())
            (ops/'regent-lane.json').write_text(json.dumps({'request_id':'roy-20261013-isolated-character-climb','character':'REGENT'}))
            (ops/'instance-binding.json').write_text(json.dumps({'process_id':20,'base_url':'http://127.0.0.1:18181','native_profile_id':1}))
            command='. "$FIXTURE_PATH"; printf "%s\\n" "$LIVE" "$CHARACTER" "$STS2_BASE_URL" "$STS2_EXPECTED_PROCESS_ID"'
            child=subprocess.run(['bash','-c',command],capture_output=True,text=True,env={'PATH':os.environ['PATH'],'FIXTURE_PATH':str(ops/'paths.sh')})
            self.assertEqual(child.returncode,0,child.stderr)
            self.assertEqual(child.stdout.splitlines(),[str(root),'REGENT','http://127.0.0.1:18181','20'])

    def test_fresh_shell_restores_own_live_role_and_credential_references_without_keys(self):
        value=lane_env('/project/.worktrees/regent-climb', {'request_id':'roy-20261013-isolated-character-climb','character':'REGENT'})
        self.assertEqual(value['STS2_LIVE'], '/project/.worktrees/regent-climb')
        self.assertEqual(value['CHARACTER'], 'REGENT')
        self.assertEqual(value['STS2_EXPECTED_PROCESS_ID'], '0')
        self.assertEqual(value['BRAIN_ENGINE'], 'codex')
        self.assertNotIn('TYPESAFE_API_KEY', value)
        for root in ['/project', '/project/.worktrees/live']:
            with self.assertRaises(ValueError): lane_env(root, {'request_id':'roy-20261013-isolated-character-climb','character':'REGENT'})

    def test_manifest_cannot_select_another_game_port_root_or_client(self):
        root = Path('/fixed/regent')
        own = root / 'ops/codex-ops/regent-native'
        value = {'request_id': 'roy-20261013-isolated-character-climb', 'client_id': '2026101302', 'api_port': 18181,
                 'runtime_root': str(root), 'original_creation_time': '2026-10-13T00:00:00Z',
                 'native_directory': solo.NATIVE_WINDOWS_DIR,
                 'mod_settings': str(own / 'settings-regent.json'), 'native_log': str(own / 'game.log')}
        with patch.object(solo, 'windows_path', side_effect=str):
            solo.validate_manifest(value, root)
            for change in [{'api_port': 8080}, {'client_id': '1'}, {'runtime_root': '/silent'}, {'native_log': 'C:/unrelated'}]:
                with self.assertRaises(ValueError): solo.validate_manifest({**value, **change}, root)

    def test_previously_submitted_task_is_never_relaunched_when_receipt_is_delayed(self):
        with tempfile.TemporaryDirectory() as path:
            root = Path(path);own = root / 'ops/codex-ops/regent-native';own.mkdir(parents=True)
            content = b'{}';(own / 'manifest.json').write_bytes(content);(own / 'task-submitted.json').write_text('{}')
            with patch.object(solo, 'validate_manifest'), patch.object(solo.subprocess, 'run') as run:
                result = solo.launch(root, hashlib.sha256(content).hexdigest())
                self.assertEqual(result['status'], 'task_already_submitted');run.assert_not_called()

    def test_failed_receipt_never_launches_or_rewrites_the_original_game(self):
        with tempfile.TemporaryDirectory() as path:
            root = Path(path);own = root / 'ops/codex-ops/regent-native';own.mkdir(parents=True)
            content = b'{}';(own / 'manifest.json').write_bytes(content)
            (own / 'native-launch.json').write_text('{"status":"failed"}')
            with patch.object(solo, 'validate_manifest'), patch.object(solo.subprocess, 'run') as run:
                self.assertEqual(solo.launch(root, hashlib.sha256(content).hexdigest())['status'], 'failed')
                run.assert_not_called()

    def test_binding_rejects_redirects_auth_and_invalid_profile_without_exporting_extras(self):
        value = {'process_id': 20, 'base_url': 'http://127.0.0.1:18181', 'native_profile_id': 1, 'private': 'never-export'}
        result = binding_env(value)
        self.assertNotIn('private', result);self.assertEqual(result['STS2_EXPECTED_NATIVE_PROFILE_ID'], '1')
        for change in [{'base_url':'http://example.com:8080'}, {'base_url':'http://secret@127.0.0.1:8080'}, {'process_id':0}, {'native_profile_id':{}}]:
            with self.assertRaises(ValueError): binding_env({**value, **change})


if __name__ == '__main__': unittest.main()
