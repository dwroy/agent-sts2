"""Wait for original replay completion, then run unmodified calibration and acceptance."""
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path

S = Path(__file__).resolve().parent
ROOT = S.parents[2]
BASE = '261af56e0022cc0012b80870bd3f52bd121d45c2'
EVIDENCE = Path('/home/dw/Projects/agent-sts2/ops/codex-ops/learner/20261008-112135-fix-batch.boss-evidence.json')


def count(name):
    path = S / name
    return path.read_bytes().count(b'\n') if path.exists() else 0


def completed(name, marker):
    path = S / name
    return path.exists() and marker in path.read_text()


def run(phase, command, expected):
    with (S / (phase + '.log')).open('w') as handle:
        result = subprocess.run(command, cwd=ROOT, stdout=handle, stderr=subprocess.STDOUT)
    receipt = {'phase': phase, 'rc': result.returncode, 'expected_rc': expected, 'command': command}
    (S / (phase + '.receipt.json')).write_text(json.dumps(receipt, indent=1)+'\n')
    print(json.dumps(receipt), flush=True)
    if result.returncode != expected:
        raise RuntimeError(f'{phase} failed; retain original log and receipt')


try:
    last = 0
    while not (completed('before-backtest.agent.log', ': 233 fights ->') and completed('after-queen-backtest.log', ': 15 fights ->')):
        if time.monotonic() - last >= 60:
            print(json.dumps({'phase': 'original replay', 'before_rows': count('before-results/results-0.jsonl'), 'before_expected': 466,
                              'after_queen_rows': count('after-queen-results/results-0.jsonl'), 'after_expected': 30}), flush=True)
            last = time.monotonic()
        time.sleep(5)
    assert count('before-results/results-0.jsonl') == 466
    assert count('after-queen-results/results-0.jsonl') == 30
    assert hashlib.sha256(EVIDENCE.read_bytes()).hexdigest() == '6661d598df1747524ca8eb5d65dfdb64f8078e9dcfd351f50ed36ce693f6c77f'
    assert json.loads(EVIDENCE.read_text())['dispatch_base'] == BASE
    assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip() == BASE
    run('finalize-pair', ['nice', '-n', '19', sys.executable, str(S / 'finalize-pair.py')], 0)
    run('tune-analysis', ['nice', '-n', '19', sys.executable, str(S / 'tune-analysis.py')], 0)
    command = ['nice', '-n', '19', sys.executable, str(ROOT / 'agent/tools/boss-sim/acceptance.py'),
               '--character', 'silent', '--boss', 'QUEEN', '--mode', 'b5', '--before', str(S / 'before-trust.json'),
               '--after', str(S / 'after-trust.json'), '--base', BASE, '--head', BASE, '--evidence', str(EVIDENCE),
               '--root', str(ROOT), '--scratch', str(S / 'acceptance'), '--out', str(S / 'acceptance.json')]
    run('acceptance', command, 1)
    gate = json.loads((S / 'acceptance.json').read_text())
    assert not gate['accepted'] and gate['isolation']['passed']
    assert gate['isolation']['base'] == gate['isolation']['head'] == BASE
    print(json.dumps({'phase': 'calculation complete', 'outcome': 'rejected', 'reasons': gate['reasons'], 'isolation': True}), flush=True)
except Exception as error:
    (S / 'finish-calculation.failure.json').write_text(json.dumps({'error': str(error), 'source_changed': False}, indent=1)+'\n')
    raise
