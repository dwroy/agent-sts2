"""Commit the verified candidate and register its immutable source, never a release."""
import hashlib
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
CLOSEOUT = 'paper/materials/silent/20261011-011304-boss-calibration-closeout'

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

for name in ('source-sandbox', 'source-gitleaks', 'ledger-check'):
    assert (HERE / f'{name}.exit').read_text().strip() == '0', name
assert not (HERE / 'source-commit.txt').exists()
summary = json.loads((HERE / 'precommit-summary.json').read_text())
artifact_prefix = 'experiments/boss-sim/silent/' + summary['artifact'] + '/'
allowed = {'knowledge/characters/silent/boss-trust.json', 'paper/materials/silent/boss-sim-calibration.md',
           'paper/materials/decision-log.md'}
paths = git('diff', '--cached', '--name-only').splitlines()
assert paths and all(p in allowed or p.startswith((artifact_prefix, CLOSEOUT + '/')) for p in paths)
# Every manifest entry must be staged, including verbatim logs ignored by the default rules.
verified = {}
for manifest_path in (ROOT / artifact_prefix / 'audit-manifest.json', ROOT / CLOSEOUT / 'manifest.json'):
    manifest = json.loads(manifest_path.read_text())
    for name, expected in manifest.items():
        rel = str((manifest_path.parent / name).relative_to(ROOT))
        raw = subprocess.check_output(['git', 'show', ':' + rel], cwd=ROOT)
        assert hashlib.sha256(raw).hexdigest() == expected, rel
        verified[rel] = expected
write('index-archive-integrity.json', {'verified': len(verified), 'files_sha256': verified})
# Keep terminal blank lines in original command logs instead of editing evidence.
checks = [p for p in paths if not p.endswith('.log')]
subprocess.run(['git', 'diff', '--cached', '--check', '--', *checks], cwd=ROOT, check=True)
message = ('Refresh Silent boss validation with 31 completed outcomes\n\n'
           'Freeze the published model, 107 tuning keys and Platt mappings.\n'
           'Replay N3YHJMV1ATFR F17/F33 and two controls; retain the Knowledge Demon leak failure and F49 limits.\n'
           'Preserve the foreign live merge blocker without publishing an empty version.\n\n'
           'Co-Authored-By: Codex GPT-6 <noreply@openai.com>')
r = subprocess.run(['git', 'commit', '-m', message], cwd=ROOT, capture_output=True, text=True)
(HERE / 'source-commit.log').write_text(r.stdout + r.stderr)
assert r.returncode == 0, r.stderr
source, tree = git('rev-parse', 'HEAD'), git('rev-parse', 'HEAD^{tree}')
(HERE / 'source-commit.txt').write_text(source + '\n')
with (HERE / 'check-live-final.log').open('w') as log:
    check = subprocess.run(['python3', str(HERE / 'check-live.py'), source], stdout=log, stderr=subprocess.STDOUT)
(HERE / 'check-live-final.exit').write_text(str(check.returncode) + '\n')
state = json.loads((HERE / 'live-release-state.json').read_text())
assert state.get('blocked'), 'Live became available: continue the authorized locked publication workflow'
assert state['merged'] is None
timestamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
(HERE / 'ledger-source-date.log').write_text(timestamp + '\n')
update = {'id': summary['ledger'][0], 'by': 'learner:fix-batch', 'status': 'proposed',
          'where': {'commits': [source]},
          'note': f'{HERE.name}候选源{source}、固定候选树{tree}；沙箱/Python/调度/gitleaks通过。'
                  f'提交后再次锁内核实：{state["blocked"]}。没有实际合入、固定发布树或新版本；shipped由运维核实实际发布。'}
write('ledger-source-update.json', update)
r = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'update'],
                   input=json.dumps(update, ensure_ascii=False), capture_output=True, text=True)
(HERE / 'ledger-source-update.log').write_text(r.stdout + r.stderr)
assert r.returncode == 0, r.stderr
with (HERE / 'ledger-final-check.log').open('w') as log:
    checked = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'check'], stdout=log, stderr=subprocess.STDOUT)
(HERE / 'ledger-final-check.exit').write_text(str(checked.returncode) + '\n')
assert checked.returncode == 0
result = {k: v for k, v in summary.items() if k not in ('item', 'source_implementation', 'blocker')}
result.update({'source_commit': source, 'candidate_tree': tree, 'observed_live': state,
               'commits': [(HERE / 'merge-main-commit.txt').read_text().strip(), source],
               'main_sync': 'Merged main; only append-only decision-log conflict, both parent histories retained.',
               'report': str(HERE / 'report.md'),
               'calibration_report': str(ROOT / 'paper/materials/silent/boss-sim-calibration.md'),
               'fixes': [{'item': summary['item'], 'commit': source,
                          'source_implementation': summary['source_implementation'],
                          'test': '原sandbox含tsc；Python12；调度8；两控制战四起点；固定模型SHA；双幂等；gitleaks',
                          'fails_without_fix': False,
                          'fails_without_fix_reason': '授权校准数据刷新，没有新生产代码，不冒造bug红绿。',
                          'actual_code_merge': None, 'release_commit': None, 'release_tree': None,
                          'version': None, 'ledger': summary['ledger']}],
               'skipped': [{'item': 'live合入、发布版本、合后测试与完整外部检查',
                            'reason': f'他人MERGE_HEAD={state.get("pending_merge_head")}、{len(state.get("conflict_paths", []))}未解冲突；本批未写live。无需Roy重新批准。'},
                           {'item': '未达标boss和F49准入',
                            'reason': '验证数量已足但误差指标失败；A0–4/A5–9独立验证各0、各差10场，切点不移动。'}]})
result['tests'].update(gitleaks=0, ledger_check=0, archived_files_staged=len(verified))
write('result.json', result)
receipt = (f'\n## 最终源码回执\n\n{timestamp}：本批校准源{source}，固定候选树{tree}；'
           f'合main提交{result["commits"][0]}。暂存档案{len(verified)}项SHA逐字节验证、最终gitleaks0。'
           f'账本{summary["ledger"][0]}已CLI追加来源提交并保持proposed，最终check0。'
           f'再次持锁核实live={state.get("initial_live")}，MERGE_HEAD={state.get("pending_merge_head")}，'
           f'{len(state.get("conflict_paths", []))}个冲突；未实际合入，固定发布树/新版本均null。'
           '最终机器回执result.json；完整外部检查交实际合入后的调度器。\n')
with (HERE / 'report.md').open('a') as out:
    out.write(receipt)
assert not git('status', '--porcelain'), 'Unexpected uncommitted files; retain and inspect'
write('final-verification.json', {'source': source, 'candidate_tree': tree, 'worktree_clean': True,
      'merged': None, 'release_tree': None, 'version': None, 'ledger': summary['ledger'],
      'code_proposals': [], 'implementation_domains': [], 'tests': result['tests']})
print(json.dumps({'source': source, 'candidate_tree': tree, 'merged': None,
                  'ledger': summary['ledger'], 'worktree_clean': True}, ensure_ascii=False))
