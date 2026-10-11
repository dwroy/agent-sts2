"""Commit the exact scanned candidate; record source provenance without claiming publication."""
import hashlib
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
CLOSEOUT = 'paper/materials/silent/20261011-114304-boss-calibration-closeout'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

for name in ('source-sandbox', 'source-gitleaks', 'ledger-check'):
    assert (HERE / f'{name}.exit').read_text().strip() == '0', name
assert not (HERE / 'source-commit.txt').exists()
summary = json.loads((HERE / 'precommit-summary.json').read_text())
prefix = 'experiments/boss-sim/silent/' + summary['artifact'] + '/'
allowed = {'knowledge/characters/silent/boss-trust.json', 'paper/materials/silent/boss-sim-calibration.md',
           'paper/materials/decision-log.md'}
paths = git('diff', '--cached', '--name-only').splitlines()
assert paths and all(p in allowed or p.startswith((prefix, CLOSEOUT + '/')) for p in paths)
scan_manifest = json.loads((HERE / 'staged-scan-manifest.json').read_text())
assert set(paths) == set(scan_manifest)
for rel, expected in scan_manifest.items():
    raw = subprocess.check_output(['git', 'show', ':' + rel], cwd=ROOT)
    assert hashlib.sha256(raw).hexdigest() == expected, rel
for path in (ROOT / prefix / 'audit-manifest.json', ROOT / CLOSEOUT / 'manifest.json'):
    for name, expected in json.loads(path.read_text()).items():
        rel = str((path.parent / name).relative_to(ROOT))
        assert scan_manifest[rel] == expected, rel
subprocess.run(['git', 'diff', '--cached', '--check', '--', *[p for p in paths if not p.endswith('.log')]], cwd=ROOT, check=True)
message = ('Refresh Silent boss validation with 42 completed outcomes\n\n'
           'Keep the published model, 107 tuning keys, cutoff and Platt mappings fixed.\n'
           'Replay the newly completed Silent fights and two controls; retain all quality gates and F49 limits.\n'
           'Preserve the foreign live merge blocker; no release or empty version is claimed.\n\n'
           'Co-Authored-By: Codex GPT-6 <noreply@openai.com>\n')
(HERE / 'commit-message.txt').write_text(message)
run = subprocess.run(['git', '-c', 'core.hooksPath=/dev/null', 'commit', '--file', str(HERE / 'commit-message.txt')], cwd=ROOT, capture_output=True, text=True)
(HERE / 'source-commit.log').write_text(run.stdout + run.stderr)
assert run.returncode == 0, run.stderr
source, tree = git('rev-parse', 'HEAD'), git('rev-parse', 'HEAD^{tree}')
(HERE / 'source-commit.txt').write_text(source + '\n')
with (HERE / 'check-live-final.log').open('w') as handle:
    checked = subprocess.run(['python3', str(HERE / 'check-live.py'), source], stdout=handle, stderr=subprocess.STDOUT)
(HERE / 'check-live-final.exit').write_text(str(checked.returncode) + '\n')
state = json.loads((HERE / 'live-release-state.json').read_text())
assert state.get('blocked'), 'Live became available: continue the authorized full locked publication workflow.'
assert state['merged'] is None
(HERE / 'ledger-source-date.log').write_text(subprocess.check_output(['date'], text=True))
update = {'id': summary['ledger'][0], 'by': 'learner:fix-batch', 'status': 'proposed',
          'where': {'commits': [source]},
          'note': f'{HERE.name}固定候选源{source}、候选树{tree}；沙箱/Python/调度/gitleaks通过。'
                  f'提交后锁内复核仍受阻：{state["blocked"]}。无实际合入/新版本/固定发布树，未标shipped。'}
write('ledger-source-update.json', update)
run = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'update'],
                     input=json.dumps(update, ensure_ascii=False), capture_output=True, text=True)
(HERE / 'ledger-source-update.log').write_text(run.stdout + run.stderr)
assert run.returncode == 0, run.stderr
with (HERE / 'ledger-final-check.log').open('w') as handle:
    checked = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'check'], stdout=handle, stderr=subprocess.STDOUT)
(HERE / 'ledger-final-check.exit').write_text(str(checked.returncode) + '\n')
assert checked.returncode == 0
result = {k: v for k, v in summary.items() if k not in ('item', 'source_implementation', 'blocker')}
result.update({'source_commit': source, 'candidate_tree': tree, 'observed_live': state,
               'commits': [summary['base'], source], 'main_sync': 'Clean at start; git merge --no-edit main was already up to date.',
               'report': str(HERE / 'report.md'),
               'calibration_report': str(ROOT / 'paper/materials/silent/boss-sim-calibration.md'),
               'artifact_path': str(ROOT / prefix),
               'fixes': [{'item': summary['item'], 'commit': source,
                          'source_implementation': summary['source_implementation'],
                          'source_files': ['agent/tools/boss-sim/refresh-silent.py',
                                           'agent/tools/boss-sim/silent_calibration.py',
                                           'agent/tools/boss-sim/trust.py',
                                           'agent/src/sim/boss-trust.ts'],
                          'changed_data': 'knowledge/characters/silent/boss-trust.json',
                          'test': '原sandbox含tsc；Python12；调度8；四控制起点；210模型SHA；全量开场来源；双幂等；gitleaks',
                          'fails_without_fix': False,
                          'fails_without_fix_reason': '授权校准数据刷新；无新生产代码或bug红绿测试。',
                          'actual_code_merge': None, 'release_commit': None, 'release_tree': None,
                          'version': None, 'ledger': summary['ledger']}],
               'skipped': [{'item': 'live合入、合后测试、发布版本与完整外部检查',
                            'reason': f'他人MERGE_HEAD={state.get("pending_merge_head")}，{len(state.get("conflict_paths", []))}个冲突；本批未修改live。无需Roy重新批准。'}]})
result['tests']['gitleaks'] = 0
write('result.json', result)
with (HERE / 'report.md').open('a') as handle:
    handle.write(f'\n固定候选提交：{source}；候选树：{tree}。提交后锁内复核仍为同一外来合并阻塞；实际发布树/版本均null。\n'
                 f'精确暂存快照gitleaks退出0；{summary["ledger"][0]}已CLI追加来源提交，最终ledger check退出0。\n'
                 '完整机器回报见同目录result.json，本批main同步提交见base，校准候选提交见source_commit。\n')
assert git('status', '--porcelain') == ''
print(json.dumps({'source': source, 'candidate_tree': tree, 'ledger': summary['ledger'], 'merged': None,
                  'tests': result['tests'], 'report': str(HERE / 'report.md')}, ensure_ascii=False))
