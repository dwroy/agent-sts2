"""Launch only the registered offline Regent window, once, through its desktop task."""
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
from urllib.request import urlopen

from instance_env import binding_env
_spec = importlib.util.spec_from_file_location('regent_inspection', Path(__file__).with_name('regent-launch-inspect.py'))
_probe = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_probe)
lane_guard = _probe.lane_guard


TASK = 'sts2-regent-roy20261013'
WIN = '/mnt/c/Windows/System32/'


def windows_path(path):
    return subprocess.check_output(['wslpath', '-w', str(path)], text=True).strip()


def validate_manifest(m, root):
    if (m.get('request_id') != 'roy-20261013-isolated-character-climb' or m.get('client_id') != '2026101302'
            or m.get('api_port') != 18181 or not isinstance(m.get('original_creation_time'), str)
            or m.get('runtime_root') != str(root)):
        raise ValueError('manifest is outside the fixed Regent lane')
    native = root / 'ops/codex-ops/native-game'
    own = root / 'ops/codex-ops/regent-native'
    if (m.get('native_directory') != windows_path(native) or m.get('mod_settings') != windows_path(own / 'settings-regent.json')
            or m.get('native_log') != windows_path(own / 'game.log')):
        raise ValueError('native paths differ from the fixed private workspace')


def fetch(route):
    with urlopen('http://127.0.0.1:18181' + route, timeout=5) as response:
        envelope = json.load(response)
    if envelope.get('ok') is not True or not isinstance(envelope.get('data'), dict):
        raise ValueError('new instance has an invalid envelope')
    return envelope['data']


def launch(root, sha):
    own = root / 'ops/codex-ops/regent-native'
    own.mkdir(exist_ok=True)
    with (own / 'launch.lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        source = (own / 'manifest.json').read_bytes()
        if hashlib.sha256(source).hexdigest() != sha:
            raise ValueError('manifest SHA differs')
        m = json.loads(source)
        validate_manifest(m, root)
        receipt = own / 'native-launch.json'
        started = own / 'task-submitted.json'
        if not receipt.exists():
            if started.exists():
                return {'status': 'task_already_submitted', 'new_launch': False}
            script = root / 'ops/regent-launch-solo.ps1'
            if hashlib.sha256(script.read_bytes()).hexdigest() != m.get('launcher_sha256'):
                raise ValueError('launcher differs from the fixed tested manifest')
            command = 'powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "' + windows_path(script) + '"'
            started.write_text(json.dumps({'manifest_sha256': sha, 'status': 'submitting'}))
            try:
                for args in [['/create', '/tn', TASK, '/tr', command, '/sc', 'once', '/st', '23:59', '/it'], ['/run', '/tn', TASK]]:
                    result = subprocess.run([WIN + 'schtasks.exe', *args], capture_output=True, timeout=20)
                    if result.returncode:
                        raise ValueError('private desktop task failed; inspect its retained receipt')
                for _ in range(50):
                    if receipt.exists():
                        row = json.loads(receipt.read_text(encoding='utf-8-sig'))
                        if row.get('status') != 'launching': break
                    time.sleep(0.2)
            finally:
                subprocess.run([WIN + 'schtasks.exe', '/delete', '/tn', TASK, '/f'], capture_output=True, timeout=20)
        if not receipt.exists():
            return {'status': 'desktop_task_pending', 'new_launch': False}
        row = json.loads(receipt.read_text(encoding='utf-8-sig'))
        if row.get('status') != 'started':
            return row
        if row.get('desktop_session') != 1:
            raise ValueError('new game is not in the visible desktop session')
        health = None
        for _ in range(45):
            try:
                health = fetch('/health')
                if health.get('service') == 'sts2-ai-agent' and health.get('process_id') == row.get('pid') and health.get('api_port') == 18181:
                    break
                raise ValueError('new health identity differs')
            except (OSError, ValueError):
                health = None
                time.sleep(1)
        if health is None:
            return {**row, 'status': 'started_api_not_verified'}
        state = fetch('/state')
        profile = state.get('native_profile_id')
        if profile is None:
            return {**row, 'status': 'started_profile_not_verified'}
        binding = {'process_id': row['pid'], 'base_url': 'http://127.0.0.1:18181', 'native_profile_id': profile,
                   'client_id': m['client_id'], 'client_root': row['client_root'], 'request_id': m['request_id']}
        binding_env(binding)
        target = root / 'ops/instance-binding.json'
        tmp = target.with_suffix('.json.tmp');tmp.write_text(json.dumps(binding, indent=2) + '\n');tmp.replace(target)
        return {**row, 'status': 'new_instance_bound_not_playing', 'native_profile_id': profile, 'screen': state.get('screen'),
                'mod_version': health.get('mod_version'), 'game_version': health.get('game_version'), 'autoplay_started': False}


def main():
    if len(sys.argv) != 2 or not re.fullmatch('[0-9a-f]{64}', sys.argv[1]):
        raise ValueError('requires the fixed manifest SHA256')
    root = Path(__file__).resolve().parent.parent
    lane_guard(root, os.environ)
    print(json.dumps(launch(root, sys.argv[1]), ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, OSError, subprocess.SubprocessError):
        print('Regent launch refused or unverified; inspect own retained receipts, never launch again blindly.', file=sys.stderr)
        sys.exit(78)
