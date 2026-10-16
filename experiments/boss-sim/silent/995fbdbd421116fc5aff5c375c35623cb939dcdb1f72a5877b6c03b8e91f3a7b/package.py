"""Retain this batch's compact frozen evidence without replacing earlier archives."""
import hashlib
import json
from pathlib import Path
import re
import shutil

HERE = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

for label in ('source-sandbox','python-fixtures','python-automation','python-dispatch','candidate-consumer'):
    assert (HERE/(label+'.exit')).read_text().strip() == '0', label
log = (HERE/'source-sandbox.log').read_text()
cases = [int(n) for n in re.findall(r'Tests\s+(\d+) passed',log)]
files = [int(n) for n in re.findall(r'Test Files\s+(\d+) passed',log)]
assert len(cases) == len(files) == 2
wrappers = json.loads((HERE/'sandbox-python-wrapper-equivalents.json').read_text())
assert all(r['exit'] == 0 and r['stdout_empty'] for r in wrappers.values())
main_log=(HERE/'main-supported-sandbox.log').read_text()
main_full={'files':sum(map(int,re.findall(r'Test Files\s+(\d+) passed',main_log))),'cases':sum(map(int,re.findall(r'Tests\s+(\d+) passed',main_log))),'tsc':0,'vitest':0}
assert (HERE/'main-supported-sandbox.exit').read_text().strip()=='0'
tests = {'main_full_unchanged_code':main_full,'source_scope':'Focused calibration fixtures after data refresh; runtime code unchanged from the preceding full suite.','tsc':0,'vitest':0,'files':sum(files),'cases':sum(cases),'suite_files':files,'suite_cases':cases,
    'workers':1,'source_log_sha256':sha(HERE/'source-sandbox.log'),
    'additional_cli_exclusions':['tests/global-build-health.test.ts','tests/global-build-funnel.test.ts'],
    'direct_python_wrapper_equivalents':wrappers,
    'standard_attempts':{'merge-main-sandbox':130,'main-sandbox':130,'observed_failure':'spawnSync /usr/bin/python3 EPERM; Python child succeeded'},
    'python_calibration':12,'python_automation':57,'python_dispatch':48,'candidate_consumer_checks':28,
    'full_external_checks':'pending original scheduler; standard sandbox attempts are not reported as passed'}
(HERE/'tests-summary.json').write_text(json.dumps(tests,ensure_ascii=False,indent=1)+'\n')
trust = json.loads((ROOT/'knowledge/characters/silent/boss-trust.json').read_text())
identity = trust['refresh']['artifact']
archive = HERE/identity
report = ROOT/'paper/materials/silent/boss-sim-calibration.md'
ledger = (HERE/'ledger-id.txt').read_text().strip()
prefix = (f'候选固定检查：前置main整合代码全量可执行集合通过，运行时代码保持；数据刷新后原脚本定向校准夹具tsc0/Vitest0（{tests["files"]} 文件/{tests["cases"]} 项），'
    '命令行额外排除main新增的global-build-health/global-build-funnel两个Node子进程包装；对应Python固定夹具直接执行0且stdout为空。'
    '原固定排除名单、源码、断言、时限均未修改，标准入口中断130/包装EPERM不报通过；完整无排除外检交原调度器。'
    f'Python校准12项、自动化57项、派发48项及候选消费者28项通过；账本{ledger}仅proposed。\n\n')
report.write_text(prefix+report.read_text())
(archive/'report.md').write_bytes(report.read_bytes())
names = ['calibration-finish.log','calibration-finish.exit','summarize.log','runtime-code-unchanged.json','merge-main-inputs.json','replay-resume-pre.exit','backfill-frozen.py','backfill.log','backfill.exit','index-lag-recovery.json','initial-extraction.json','initial-missing-indexed-frames.json','initial-source-audit-summary.json','initial-version-audit-summary.json','initial-fight-code-provenance.json','resume-pre-identifiers.json','resume-all-identifiers.json','publish.py','finalize-publication.py','verify-publication.py','notify.py','report-final.py','setup.py','restore-model.py','restore-model.log','prepare-data.py','finish.py','summarize.py','package.py',
    'audit-sources.py','audit-versions.py','read-consumer.mts','previous-trust.json','previous-report.md',
    'pinned-input-integrity.json','model-restoration.json','model-changes.json','fixed-model-code-vs-source.patch',
    'reuse-audit.json','replay-identifiers.json','resume-identifiers.json','replay-checkpoint.json',
    'opening-audit.json','first-hit-identifiers.json','model-input-audit.json','input-audit-summary.json',
    'opening-source-integrity.json','new-outcome-integrity.json','source-audit-summary.json',
    'fight-code-provenance.json','version-audit-summary.json','missing-indexed-frames.json',
    'control-replay-comparison.json','idempotency-audit.json','refresh-command.json','generated-report.md',
    'summary.json','boss-trust-table.json','trust-changes.json','cadence-snapshot.json',
    'refresh.log','refresh.exit','extract.log','extract.exit','replay.log','replay.exit','replay-resume.log','replay-resume.exit',
    'boss-input-audit.log','python-fixtures.log','python-fixtures.exit','python-automation.log','python-automation.exit',
    'python-dispatch.log','python-dispatch.exit',
    'candidate-consumer.log','candidate-consumer.exit','candidate-consumer-read.json',
    'source-sandbox.log','source-sandbox.exit','tests-summary.json','sandbox-limits.md',
    'sandbox-python-wrapper-equivalents.json','global_build_health_test.py.stdout','global_build_health_test.py.stderr',
    'global_build_funnel_test.py.stdout','global_build_funnel_test.py.stderr',
    'merge-main-sandbox.log','merge-main-sandbox.exit','main-sandbox.log','main-sandbox.exit',
    'main-supported-sandbox.log','main-supported-sandbox.exit','import-preflight.log','import-preflight.exit',
    'main-merge-conflict-resolution.json','preserve-history.py','historical-copy-preservation.json','historical-copy-restored.json',
    'ledger-item.json','ledger-add.log','report.draft.md']
for name in names:
    assert (HERE/name).is_file(), name
    shutil.copyfile(HERE/name,archive/name)
completed = json.loads((archive/'completed.json').read_text())
completed['report_sha256'] = sha(archive/'report.md')
completed['files_sha256'] = {p.name:sha(p) for p in archive.iterdir() if p.is_file() and p.name!='completed.json'}
(archive/'completed.json').write_text(json.dumps(completed,ensure_ascii=False,indent=1)+'\n')
destination = ROOT/'experiments/boss-sim/silent'/identity
assert not destination.exists(), 'never overwrite an earlier archive'
shutil.copytree(archive,destination)
(HERE/'packaged.json').write_text(json.dumps({'artifact':identity,'destination':str(destination),'files':len(list(destination.iterdir())),
    'bytes':sum(p.stat().st_size for p in destination.iterdir() if p.is_file()),'tests':tests,'ledger':ledger},ensure_ascii=False,indent=1)+'\n')
print(json.dumps({'artifact':identity,'tests':tests,'ledger':ledger}))
