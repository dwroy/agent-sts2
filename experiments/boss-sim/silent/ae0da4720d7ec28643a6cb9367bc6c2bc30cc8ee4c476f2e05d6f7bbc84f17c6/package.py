"""Freeze only this batch's compact evidence after required candidate checks."""
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

for name in ('source-sandbox','python-fixtures','python-automation','candidate-consumer','fixed-consumer-fixtures'):
    assert (HERE/(name+'.exit')).read_text().strip() == '0', name
log = (HERE/'source-sandbox.log').read_text()
cases = [int(n) for n in re.findall(r'Tests\s+(\d+) passed',log)]
files = [int(n) for n in re.findall(r'Test Files\s+(\d+) passed',log)]
assert len(cases) == len(files) == 2
tests = {'tsc':0,'vitest':0,'cases':sum(cases),'files':sum(files),'suite_cases':cases,'suite_files':files,
         'workers':1,'fixed_consumer_fixtures':{'files':4,'cases':9},'python_calibration':12,'python_automation':57,'candidate_consumer_checks':28,
         'source_sandbox_sha256':sha(HERE/'source-sandbox.log'),
         'first_complete_sandbox':{'exit':1,'passed_files':436,'passed_cases':4098,'failure':'check-imports scans untracked historical incomplete copy; 65 references'},
         'historical_copy_restored':json.loads((HERE/'historical-copy-restored.json').read_text())['restored']}
write(HERE/'tests-summary.json',tests)
trust = json.loads((ROOT/'knowledge/characters/silent/boss-trust.json').read_text())
identity = trust['refresh']['artifact']
archive = HERE/identity
ledger = (HERE/'ledger-id.txt').read_text().strip()
report = ROOT/'paper/materials/silent/boss-sim-calibration.md'
prefix = ('首次完整沙箱退出1：436文件4098项通过，唯一check-imports误扫20261012历史不完整副本的65条缺引用；原日志保留。1096项历史文件/链接逐SHA保全、临时点目录改名后按原入口全量复验，已恢复全部原路径、字节与链接；源码、断言、时限和排除名单未改。\n\n'
          + f'固定候选自测：tsc 0；原沙箱 vitest 0，{tests["files"]} 文件、{tests["cases"]} 项通过；'
          f'Python校准12项、调度/刷新57项，实际候选B2/B3读取28项通过。账本 {ledger} 仅proposed；'
          '完整外部检查及shipped由原调度器/ops核实际发布后处理。\n\n')
report.write_text(prefix+report.read_text())
(archive/'report.md').write_bytes(report.read_bytes())
names = ['setup.py','fixed-model-code-vs-source.patch','prepare-data.py','finish.py','summarize.py','package.py','audit-sources.py','audit-versions.py',
         'read-consumer.mts','notify.py','previous-trust.json','pinned-input-integrity.json','reuse-audit.json',
         'replay-identifiers.json','model-changes.json','opening-audit.json','first-hit-identifiers.json',
         'model-input-audit.json','input-audit-summary.json','opening-source-integrity.json',
         'new-outcome-integrity.json','source-audit-summary.json','fight-code-provenance.json',
         'version-audit-summary.json','control-replay-comparison.json','idempotency-audit.json',
         'refresh-command.json','generated-report.md','summary.json','boss-trust-table.json','trust-changes.json',
         'source-sandbox.log','source-sandbox.exit','tests-summary.json','python-fixtures.log','python-fixtures.exit',
         'python-fixtures-initial.log','python-automation.log','python-automation.exit','python-automation-initial.log',
         'replay.log','replay.exit','replay-checkpoint.exit','checkpoint.json','resume-identifiers.json','replay-shard0.log','replay-shard0.exit','replay-shard1.log','replay-shard1.exit','candidate-consumer-read.json','candidate-consumer.log','candidate-consumer.exit',
         'report.draft.md','ledger-item.json','ledger-add.log','phase-note.md','previous-ledger-contradiction.json','previous-ledger-update.log','previous-ledger-audit.json','refresh.log','refresh.exit','extract.log','extract.exit',
         'fixed-consumer-fixtures.log','fixed-consumer-fixtures.exit','boss-input-audit.log',
         'source-sandbox-first-failed.log','source-sandbox-first-failed.exit','preserve-history.py',
         'historical-copy-preservation.json','historical-copy-restored.json','import-preflight.log','import-preflight.exit']
for name in names:
    assert (HERE/name).is_file(),name
    shutil.copyfile(HERE/name,archive/name)
completed = json.loads((archive/'completed.json').read_text())
completed['report_sha256'] = sha(archive/'report.md')
completed['files_sha256'] = {p.name:sha(p) for p in archive.iterdir() if p.is_file() and p.name!='completed.json'}
write(archive/'completed.json',completed)
destination = ROOT/'experiments/boss-sim/silent'/identity
assert not destination.exists(),'never overwrite a historical archive'
shutil.copytree(archive,destination)
write(HERE/'packaged.json',{'artifact':identity,'destination':str(destination),'files':len(list(destination.iterdir())),
                          'bytes':sum(p.stat().st_size for p in destination.iterdir() if p.is_file()),'tests':tests,'ledger':ledger})
print(json.dumps({'artifact':identity,'tests':tests,'ledger':ledger}))
