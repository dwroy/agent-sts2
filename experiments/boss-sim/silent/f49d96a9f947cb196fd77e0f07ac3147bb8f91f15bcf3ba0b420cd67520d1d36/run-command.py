"""Run one offline command and preserve its exact command, output and exit status."""
import json
import os
from pathlib import Path
import subprocess
import sys

HERE = Path(__file__).resolve().parent
label, directory, *command = sys.argv[1:]
env = {**os.environ, 'PATH': str(Path.home() / '.local/node/bin') + ':' + os.environ['PATH'],
       'TMPDIR': str(HERE), 'npm_config_offline': 'true', 'CHARACTER': 'silent'}
(HERE / (label + '.command.json')).write_text(json.dumps({'cwd': directory, 'command': command}, indent=1) + '\n')
with (HERE / (label + '.log')).open('w') as handle:
    result = subprocess.run(command, cwd=directory, env=env, stdout=handle, stderr=subprocess.STDOUT)
(HERE / (label + '.exit')).write_text(str(result.returncode) + '\n')
print(json.dumps({'command': label, 'exit': result.returncode}), flush=True)
sys.exit(result.returncode)
