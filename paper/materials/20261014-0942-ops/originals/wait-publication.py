"""Wait for the authorized live lock, preserving the first busy receipt."""
import fcntl
import os
from pathlib import Path
import subprocess
import time

HERE = Path(__file__).resolve().parent
receipt = HERE / 'publication.json'
backup = HERE / 'publication.lock-busy.json'
if receipt.exists() and not backup.exists():
    backup.write_bytes(receipt.read_bytes())
lock = Path('/home/dw/Projects/agent-sts2/ops/live-merge.lock').open('a')
started = time.monotonic()
while True:
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        break
    except BlockingIOError:
        print('Waiting for the existing live lock owner; elapsed ' + str(round(time.monotonic() - started)) + 's.', flush=True)
        time.sleep(10)
os.set_inheritable(lock.fileno(), True)
env = {**os.environ, 'CALIBRATION_WAITED_LOCK_FD': str(lock.fileno())}
os.execvpe('python3', ['python3', str(HERE / 'publish.py'), (HERE / 'source-commit.txt').read_text().strip()], env)
