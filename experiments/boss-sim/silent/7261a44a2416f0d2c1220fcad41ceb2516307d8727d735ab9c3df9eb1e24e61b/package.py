"""Freeze the new content-addressed experiment after actual source checks pass."""
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

assert (HERE / 'source-sandbox.exit').read_text().strip() == '0'
assert (HERE / 'python-calibration.exit').read_text().strip() == '0'
assert (HERE / 'python-dispatch.exit').read_text().strip() == '0'
assert (HERE / 'python-automation.exit').read_text().strip() == '0'
assert (HERE / 'candidate-consumer.exit').read_text().strip() == '0'
assert json.loads((HERE / 'candidate-consumer-read.json').read_text())['checks'] == 28
log = (HERE / 'source-sandbox.log').read_text()
counts = [int(n) for n in re.findall(r'Tests\s+(\d+) passed', log)]
files = [int(n) for n in re.findall(r'Test Files\s+(\d+) passed', log)]
assert len(counts) == len(files) == 2, 'both the main suite and paths must pass'
summary = {'tsc': 0, 'vitest': 0, 'cases': sum(counts), 'files': sum(files),
           'suite_cases': counts, 'suite_files': files, 'workers': 1,
           'python_calibration': {'cases': 12, 'exit': 0},
           'python_dispatch': {'cases': 48, 'exit': 0},
           'python_automation': {'cases': 45, 'exit': 0},
           'log_sha256': sha(HERE / 'source-sandbox.log'),
           'interrupted_initial': 130, 'second_launch_failed_before_start': True,
           'first_completed_failure': {'tsc': 0, 'vitest': 1, 'files_passed': 399, 'cases_passed': 3868, 'failed_case': 'check-imports on preserved historical partial copy'},
           'historical_copy_preserved': True,
           'second_completed_failure': {'tsc': 0, 'vitest': 1, 'files_passed': 399, 'cases_passed': 3868, 'failed_case': 'boss-lines-planner SL retry missing whole_fight_sim_trust; same candidate passed this case in first run; cause unproven'}}
write(HERE / 'tests-summary.json', summary)
trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
identity = trust['refresh']['artifact']
archive = HERE / identity
assert archive.is_dir()
ledger = (HERE / 'ledger-id.txt').read_text().strip()
report = ROOT / 'paper/materials/silent/boss-sim-calibration.md'
text = report.read_text()
text = text.replace('学习台账只经根CLI记fight/proposed和来源提交',
                    f'学习台账 {ledger} 只经根CLI记fight/proposed和来源提交')
text = f'固定自测：tsc 0；完整沙箱入口 vitest 0，{summary["files"]} 文件、{summary["cases"]} 项通过；Python校准12、派发48、自动批次45项通过。B2/B3候选实际消费者读回28项通过。所有初稿/中断/启动错误保留，完整外部检查交调度器。\n\n' + text
text = '第二次完整原入口同样退出1：导入检查通过，既有boss-lines-planner的SL重试题缺whole_fight_sim_trust；同一未改候选在第一轮通过该用例，原因未证。本次完整重跑只用现有单worker设置，所有原失败保留。\n\n' + text
text = '本次完整原入口首次退出1：399文件/3868项通过，唯一check-imports误扫未跟踪的历史不完整副本。1096条文件/链接按SHA保全、临时移位后以相同源码/固定夹具/断言/预算/排除名单完整重跑；副本已逐SHA恢复。原失败和首次重跑包装器路径错误127保留，未修其他队列bug。\n\n' + text
report.write_text(text)
(archive / 'report.md').write_bytes(report.read_bytes())
names = ['prepare.py', 'finish.py', 'summarize.py', 'audit-sources.py', 'audit-versions.py',
         'previous-trust.json', 'previous-report.md', 'pinned-input-integrity.json', 'reuse-audit.json',
         'new-fights.json', 'replay-identifiers.json', 'resume-identifiers.json', 'checkpoint.json',
         'package.py', 'read-consumer.mts', 'source-code-diff.patch', 'live-import-preflight.json', 'live-import-preflight.log',
         'model-changes.json', 'opening-audit.json', 'first-hit-identifiers.json', 'model-input-audit.json',
         'input-audit-summary.json', 'opening-source-integrity.json', 'new-outcome-integrity.json',
         'source-audit-summary.json', 'fight-code-provenance.json', 'version-audit-summary.json',
         'control-replay-comparison.json', 'idempotency-audit.json', 'refresh-command.json',
         'generated-report.md', 'summary.json', 'boss-trust-table.json', 'boss-trust-table.initial.json',
         'trust-changes.json', 'questions.json', 'launch-failures.md', 'report.draft.md',
         'source-sandbox.initial.log', 'source-sandbox.initial.exit', 'source-sandbox.launch2.txt',
         'source-sandbox.first-failed.log', 'source-sandbox.first-failed.exit',
         'source-sandbox.second-failed.log', 'source-sandbox.second-failed.exit',
         'source-sandbox.wrapper-path-error.log', 'source-sandbox.wrapper-path-error.exit',
         'historical-copy-preservation.json', 'scope-invariants.json',
         'source-sandbox.log', 'source-sandbox.exit', 'tests-summary.json',
         'python-calibration.log', 'python-calibration.exit', 'python-dispatch.log', 'python-dispatch.exit',
         'python-automation.log', 'python-automation.exit', 'replay.command.json',
         'replay.checkpoint.log', 'replay.checkpoint.exit', 'replay-shard0.log', 'replay-shard0.exit',
         'replay-shard1.log', 'replay-shard1.exit', 'candidate-consumer-read.json', 'candidate-consumer.initial.log', 'candidate-consumer.initial.exit',
         'package.initial-failed.log', 'paper-report.package-initial-failed.md', 'ledger-item.json',
         'ledger-add.log', 'ledger-check.log']
for name in names:
    assert (HERE / name).is_file(), name
    shutil.copyfile(HERE / name, archive / name)
completed = json.loads((archive / 'completed.json').read_text())
completed['report_sha256'] = sha(archive / 'report.md')
completed['files_sha256'] = {p.name: sha(p) for p in archive.iterdir()
                             if p.is_file() and p.name not in ['completed.json', 'audit-manifest.json']}
write(archive / 'completed.json', completed)
write(archive / 'audit-manifest.json', {p.name: sha(p) for p in archive.iterdir()
                                      if p.is_file() and p.name != 'audit-manifest.json'})
destination = ROOT / 'experiments/boss-sim/silent' / identity
assert not destination.exists(), 'do not overwrite an immutable archive'
shutil.copytree(archive, destination)
write(HERE / 'packaged.json', {'artifact': identity, 'destination': str(destination),
                             'files': len(list(destination.iterdir())), 'tests': summary,
                             'ledger': ledger, 'size': sum(p.stat().st_size for p in destination.iterdir())})
print(json.dumps({'artifact': identity, 'tests': summary, 'ledger': ledger}))
