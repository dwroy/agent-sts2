"""Exercise the actual statistics launcher with a complete pin and kernel locks."""
import argparse
import ast
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source-ref', required=True)
parser.add_argument('--expected-held', type=int, choices=(0, 2), required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
root = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(root / 'ops'))
from issue_session_support import Board
from board_queue_pin import verify
import board_heavy

fixture = Path(tempfile.mkdtemp(prefix='report-fds-', dir=root / '.cache'))
(fixture / '.agents').mkdir()
(fixture / 'ops').mkdir()
config = Board(root).data
machine = fixture / 'machine'
config['dispatcher']['heavy'] = dict(enabled=True, machine_state=str(machine))
config['dispatcher']['install'] = 'kit'
(fixture / '.agents/board.yaml').write_text(json.dumps(config))
pin = root / '.agents/board-kit-pin.json'
shutil.copyfile(pin, fixture / '.agents/board-kit-pin.json')
for name in json.loads(pin.read_text())['files']:
    target = fixture / 'kit' / name
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(root / '.cache/board-kit-51c289c' / name, target)
verified = verify(fixture, 'kit')
source = ((root / 'ops/report.py').read_bytes() if args.source_ref == 'worktree' else
          subprocess.check_output(['git', '-C', str(root), 'show', args.source_ref + ':ops/report.py']))
node = next(n for n in ast.parse(source).body
            if isinstance(n, ast.FunctionDef) and n.name == 'background_statistics')
namespace = dict(ROOT=str(fixture), os=os, subprocess=subprocess)
exec(compile(ast.Module(body=[node], type_ignores=[]), 'fixed:ops/report.py', 'exec'), namespace)
ident = 'c' * 32
for name in ('leases', 'slots', 'records'):
    (machine / name).mkdir(parents=True)
birth = lambda pid: Path('/proc', str(pid), 'stat').read_text().rsplit(')', 1)[1].split()[19]
boot = Path('/proc/sys/kernel/random/boot_id').read_text().strip()
(machine / 'records' / (ident + '.json')).write_text(json.dumps(dict(
    root=str(fixture), repo=config['repo'], state='running', slot=0,
    boot_id=boot, runner_pid=os.getpid(), runner_start=birth(os.getpid()))))
script = fixture / 'child.py'
script.write_text('''from pathlib import Path
import json, os, sys, time
root = Path(sys.argv[1])
fds = {}
for p in Path('/proc/self/fd').iterdir():
    try:
        fds[p.name] = dict(target=os.readlink(p), inode=os.fstat(int(p.name)).st_ino,
                           fdinfo=Path('/proc/self/fdinfo', p.name).read_text())
    except FileNotFoundError: pass
(root / 'ready.json').write_text(json.dumps(dict(pid=os.getpid(), fds=fds)))
deadline = time.monotonic() + 10
while not (root / 'exit').exists() and time.monotonic() < deadline:
    time.sleep(.01)
''')
paths = [machine / 'leases' / ident, machine / 'slots/0']
handles = [path.open('a') for path in paths]
for handle in handles:
    fcntl.flock(handle, fcntl.LOCK_EX)
valid = board_heavy.resource_fds(fixture)
assert set(valid) == {h.fileno() for h in handles}
with (fixture / 'child.log').open('w') as log:
    child = namespace['background_statistics']([sys.executable, str(script), str(fixture)], log)
    try:
        deadline = time.monotonic() + 5
        while not (fixture / 'ready.json').exists() and child.poll() is None and time.monotonic() < deadline:
            time.sleep(.01)
        ready = json.loads((fixture / 'ready.json').read_text())
        child_birth = birth(child.pid)
        for handle in handles:
            handle.close()
        blocked = []
        for path in paths:
            with path.open('a') as probe:
                try:
                    fcntl.flock(probe, fcntl.LOCK_EX | fcntl.LOCK_NB)
                except BlockingIOError:
                    blocked.append(str(path.relative_to(fixture)))
        alive = child.poll() is None and birth(child.pid) == child_birth
        assert alive and len(blocked) == args.expected_held
        inherited = [row for row in ready['fds'].values() if row['target'] in {str(p) for p in paths}]
        assert len(inherited) == args.expected_held
        for row in inherited:
            assert row['inode'] == Path(row['target']).stat().st_ino and ' FLOCK ' in row['fdinfo']
        result = dict(source_ref=args.source_ref, report_sha256=hashlib.sha256(source).hexdigest(),
                      fixture=str(fixture), kit=verified, actual_popen=True, actual_kernel_flock=True,
                      valid_parent_fds=list(valid), child_pid=child.pid, child_birth=child_birth,
                      boot_id=boot, ready=ready, blocked_after_parent_closes=blocked,
                      child_still_running=alive, production_operations=0, real_project_shadow=False)
    finally:
        (fixture / 'exit').touch()
        rc = child.wait(timeout=10)
        for handle in handles:
            if not handle.closed:
                handle.close()
assert rc == 0 and not Path('/proc', str(child.pid)).exists()
for path in paths:
    with path.open('a') as probe:
        fcntl.flock(probe, fcntl.LOCK_EX | fcntl.LOCK_NB)
result.update(child_rc=rc, child_exited=True, both_locks_released_after_exit=True)
args.output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(dict(output=str(args.output), child_pid=child.pid, held=len(blocked), exited=True)))
