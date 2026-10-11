"""Commit the checked candidate and record its source without claiming publication."""
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
for name in ('source-sandbox', 'source-with-logs-gitleaks', 'python-fixtures', 'dispatch-fixtures', 'finish-pinned', 'ledger-check'):
    assert (HERE / f'{name}.exit').read_text().strip() == '0', name
assert not (HERE / 'source-commit.txt').exists()
paths = subprocess.check_output(['git', 'diff', '--cached', '--name-only'], cwd=ROOT, text=True).splitlines()
assert paths and all(p.startswith('experiments/boss-sim/silent/') or p in (
    'knowledge/characters/silent/boss-trust.json', 'paper/materials/silent/boss-sim-calibration.md') for p in paths)
r = subprocess.run(['git', 'commit', '-m',
    'Refresh Silent boss validation with 25 completed outcomes\n\nKeep the published model, 107 tuning keys and Platt mappings fixed.\n'
    'Replay 3R3LY2HVPPG0 A10 F17 T1-17 and two exact controls; retain SL censoring and F49 limits.\n\n'
    'Co-Authored-By: OpenAI GPT-6 <noreply@openai.com>'], cwd=ROOT, capture_output=True, text=True)
(HERE / 'source-commit.log').write_text(r.stdout + r.stderr)
assert r.returncode == 0, r.stderr
source = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
(HERE / 'source-commit.txt').write_text(source + '\n')
ledger = (HERE / 'ledger-id.txt').read_text().strip()
item = {'id': ledger, 'by': 'learner:fix-batch', 'status': 'proposed', 'where': {'commits': [source]},
        'note': f'{HERE.name}固定校准数据及来源已提交；自测265文件2681例、Python12、调度8例及gitleaks通过。待锁内合入；不登记shipped或游戏版本。'}
(HERE / 'ledger-source-update.json').write_text(json.dumps(item, ensure_ascii=False, indent=1) + '\n')
(HERE / 'ledger-source-date.log').write_text(subprocess.check_output(['date'], text=True))
r = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'update'], input=json.dumps(item, ensure_ascii=False), capture_output=True, text=True)
(HERE / 'ledger-source-update.log').write_text(r.stdout + r.stderr)
assert r.returncode == 0, r.stderr
print(source)
