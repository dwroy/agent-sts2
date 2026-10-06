import hashlib
import json
import os
from pathlib import Path
import subprocess

scratch = Path(__file__).parent
root = Path('/home/dw/Projects/agent-sts2/.worktrees/codex-dev')
source = root / 'agent/src/hand/screens/rest.ts'
final = source.read_bytes()
scratch.joinpath('rest-final.ts').write_bytes(final)
baseline = subprocess.check_output(['git', 'show', 'b8894feb36d805e13d15911830610e6bd3c8fec3:agent/src/hand/screens/rest.ts'], cwd=root)
environment = dict(os.environ, TMPDIR=str(scratch), npm_config_offline='true')
environment['PATH'] = str(Path.home() / '.local/node/bin') + ':' + environment['PATH']
command = ['nice', '-n', '19', 'npx', 'vitest', 'run', 'tests/silent-humidifier-rest.test.ts', '--pool=threads', '--maxWorkers=4']
results = {}
try:
    source.write_bytes(baseline)
    with scratch.joinpath('source-withdrawn.log').open('w') as output:
        results['withdrawn'] = subprocess.run(command, cwd=root / 'agent', env=environment, stdout=output, stderr=subprocess.STDOUT).returncode
    scratch.joinpath('source-withdrawn.exit').write_text(str(results['withdrawn']) + '\n')
finally:
    source.write_bytes(final)
assert results['withdrawn'] != 0, '撤源码没有失败，不提交'
with scratch.joinpath('source-restored.log').open('w') as output:
    results['restored'] = subprocess.run(command, cwd=root / 'agent', env=environment, stdout=output, stderr=subprocess.STDOUT).returncode
scratch.joinpath('source-restored.exit').write_text(str(results['restored']) + '\n')
results['source_sha256'] = hashlib.sha256(final).hexdigest()
assert source.read_bytes() == final
scratch.joinpath('red-green.json').write_text(json.dumps(results, indent=2) + '\n')
print(json.dumps(results, ensure_ascii=False))
assert results['restored'] == 0
