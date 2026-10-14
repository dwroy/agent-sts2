"""Wait without extra workers, finish the frozen refresh, then exec sandbox checks."""
import json
import os
from pathlib import Path
import subprocess
import time

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
while not (HERE / 'replay.exit').exists():
    time.sleep(5)
assert (HERE / 'replay.exit').read_text().strip() == '0'
with (HERE / 'finish.log').open('w') as handle:
    result = subprocess.run(['nice', '-n', '19', 'python3', str(HERE / 'finish.py')],
                            stdout=handle, stderr=subprocess.STDOUT)
(HERE / 'finish.exit').write_text(str(result.returncode) + '\n')
assert result.returncode == 0, 'finish failed; preserve finish.log'
env = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'],
       'TMPDIR': str(HERE), 'SANDBOX_WORKERS': '1', 'npm_config_offline': 'true'}
directory = HERE / '.source-check/agent'
(HERE / 'source-sandbox.command.json').write_text(json.dumps({'cwd': str(directory),
       'command': ['nice', '-n', '19', 'bash', 'tools/test-sandbox.sh'],
       'SANDBOX_WORKERS': '1'}, indent=1) + '\n')
os.chdir(directory)
with (HERE / 'source-sandbox.log').open('w') as handle:
    os.dup2(handle.fileno(), 1)
    os.dup2(handle.fileno(), 2)
# Replace the coordinator so the standard test script retains its process cap.
os.execvpe('bash', ['bash', 'tools/test-sandbox.sh'], env)
