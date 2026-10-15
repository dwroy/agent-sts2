"""Freeze this batch's compact reproducible artifacts after fixed candidate checks."""
import hashlib
import json
from pathlib import Path
import re
import shutil

HERE = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

for name in ('source-sandbox', 'python-fixtures', 'python-dispatch', 'python-automation', 'candidate-consumer'):
    assert (HERE / (name + '.exit')).read_text().strip() == '0', name
log = (HERE / 'source-sandbox.log').read_text()
counts = [int(n) for n in re.findall(r'Tests\s+(\d+) passed', log)]
files = [int(n) for n in re.findall(r'Test Files\s+(\d+) passed', log)]
assert len(counts) == len(files) == 2, 'both sandbox suites must finish'
summary = {'tsc': 0, 'vitest': 0, 'cases': sum(counts), 'files': sum(files),
           'suite_cases': counts, 'suite_files': files, 'workers': 1,
           'python_calibration': {'cases': 12, 'exit': 0},
           'python_dispatch': {'cases': 48, 'exit': 0},
           'python_automation': {'cases': 45, 'exit': 0},
           'candidate_consumers': 28, 'log_sha256': sha(HERE / 'source-sandbox.log'),
           'initial_candidate_not_ready_interruption': 130,
           'first_completed_failure': {'exit': 1, 'passed_cases': 4074, 'passed_files': 431,
               'only_failure': 'check-imports scanned an untracked historical partial copy'},
           'historical_copy_restored': True}
write(HERE / 'tests-summary.json', summary)
trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
identity = trust['refresh']['artifact']
archive = HERE / identity
ledger = (HERE / 'ledger-id.txt').read_text().strip()
report = ROOT / 'paper/materials/silent/boss-sim-calibration.md'
assert json.loads((HERE / 'historical-copy-restored.json').read_text())['verified_entries'] == 1096
text = (f'固定候选自测：tsc 0；原沙箱入口 vitest 0，{summary["files"]} 文件、'
        f'{summary["cases"]} 项通过；Python校准12/派发48/自动化45项通过；'
        f'实际候选B2/B3消费者28项通过。账本 {ledger} 只proposed；完整外部检查交调度器。\n\n'
        + report.read_text())
text = '首次完整原沙箱退出1：431文件4074项通过，唯一check-imports误扫历史不完整副本；原日志、首次跨挂载移动错误及预检失败保留。1096项历史文件/链接逐SHA保全，临时同树重命名后按原入口完整重跑；所有历史字节及原路径已经恢复。源码、固定夹具、预算、断言、时限和排除名单均未修改。\n\n' + text
report.write_text(text)
(archive / 'report.md').write_bytes(report.read_bytes())
names = ['prepare-data.py', 'finish.py', 'summarize.py', 'package.py', 'audit-sources.py',
         'audit-versions.py', 'read-consumer.mts', 'previous-trust.json', 'previous-report.md',
         'pinned-input-integrity.json', 'reuse-audit.json', 'replay-identifiers.json',
         'resume-identifiers.json', 'checkpoint.json', 'source-code-diff.patch', 'model-changes.json',
         'opening-audit.json', 'first-hit-identifiers.json', 'model-input-audit.json',
         'input-audit-summary.json', 'opening-source-integrity.json', 'new-outcome-integrity.json',
         'source-audit-summary.json', 'fight-code-provenance.json', 'version-audit-summary.json',
         'control-replay-comparison.json', 'idempotency-audit.json', 'refresh-command.json',
         'generated-report.md', 'summary.json', 'boss-trust-table.json', 'trust-changes.json',
         'phase-note.md', 'launcher-identity.json', 'source-sandbox-initial.log',
         'source-sandbox-initial.exit', 'source-sandbox.log', 'source-sandbox.exit',
         'tests-summary.json', 'python-fixtures.log', 'python-fixtures-final.log',
         'python-fixtures.exit', 'python-dispatch.log', 'python-dispatch.exit',
         'python-automation.log', 'python-automation.exit', 'replay-checkpoint.log',
         'replay-checkpoint.exit', 'replay-shard0.log', 'replay-shard0.exit',
         'replay-shard1.log', 'replay-shard1.exit', 'candidate-consumer-read.json',
         'candidate-consumer.log', 'candidate-consumer.exit', 'ledger-item.json',
         'ledger-add.log', 'ledger-check.log', 'refresh.log', 'refresh.exit',
         'extract.log', 'extract.exit', 'report.draft.md', 'cadence-snapshot.json',
         'fixed-consumer-fixtures.log', 'fixed-consumer-fixtures.exit', 'notify.py',
         'source-sandbox-first-failed.log', 'source-sandbox-first-failed.exit',
         'historical-copy-preservation.json', 'historical-copy-restored.json', 'restore-history.py',
         'historical-move-first-failed.md', 'import-preflight-first-failed.log',
         'import-preflight-first-failed.exit', 'import-preflight.log', 'import-preflight.exit']
for name in names:
    assert (HERE / name).is_file(), name
    shutil.copyfile(HERE / name, archive / name)
completed = json.loads((archive / 'completed.json').read_text())
completed['report_sha256'] = sha(archive / 'report.md')
completed['files_sha256'] = {p.name: sha(p) for p in archive.iterdir()
    if p.is_file() and p.name not in ('completed.json', 'audit-manifest.json')}
write(archive / 'completed.json', completed)
write(archive / 'audit-manifest.json', {p.name: sha(p) for p in archive.iterdir()
    if p.is_file() and p.name != 'audit-manifest.json'})
destination = ROOT / 'experiments/boss-sim/silent' / identity
assert not destination.exists(), 'never replace a historical archive'
shutil.copytree(archive, destination)
write(HERE / 'packaged.json', {'artifact': identity, 'destination': str(destination),
    'files': len(list(destination.iterdir())), 'tests': summary, 'ledger': ledger,
    'size': sum(p.stat().st_size for p in destination.iterdir() if p.is_file())})
print(json.dumps({'artifact': identity, 'tests': summary, 'ledger': ledger}))
