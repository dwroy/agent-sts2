"""Commit one verified data batch and append its source through the authorized ledger CLI."""
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


for name in ('source-sandbox', 'source-gitleaks', 'ledger-check'):
    assert (HERE / f'{name}.exit').read_text().strip() == '0', name
assert not (HERE / 'source-commit.txt').exists()
summary = json.loads((HERE / 'precommit-summary.json').read_text())
artifact_prefix = 'experiments/boss-sim/silent/' + summary['artifact'] + '/'
closeout_prefix = 'paper/materials/silent/20261010-231305-boss-calibration-closeout/'
allowed = {'knowledge/characters/silent/boss-trust.json', 'paper/materials/silent/boss-sim-calibration.md',
           'paper/materials/decision-log.md'}
paths = git('diff', '--cached', '--name-only').splitlines()
assert paths and all(p in allowed or p.startswith((artifact_prefix, closeout_prefix)) for p in paths)
# Preserve the verbatim test log, including its terminal blank line.
subprocess.run(['git', 'diff', '--cached', '--check', '--', '.',
                ':(exclude)paper/materials/silent/20261010-231305-boss-calibration-closeout/source-sandbox.log'],
               cwd=ROOT, check=True)
r = subprocess.run(['git', 'commit', '-m',
    'Refresh Silent boss validation with 26 completed outcomes\n\n'
    'Keep the published model, 107 tuning keys and Platt mappings fixed.\n'
    'Replay UV5YK5721RPB and two controls; preserve F49 limits and the foreign live merge blocker.\n\n'
    'Co-Authored-By: Codex GPT-6 <noreply@openai.com>'], cwd=ROOT, capture_output=True, text=True)
(HERE / 'source-commit.log').write_text(r.stdout + r.stderr)
assert r.returncode == 0, r.stderr
source = git('rev-parse', 'HEAD')
tree = git('rev-parse', 'HEAD^{tree}')
(HERE / 'source-commit.txt').write_text(source + '\n')

# Preserve the first locked observation in the commit; recheck actual live for the final handoff.
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
          'note': f'{HERE.name}候选源{source}，固定候选树{tree}；沙箱/Python/调度/密钥扫描通过。'
                  f'再次锁内检查仍未发布：{state["blocked"]}。仅proposed，实际源码合入/发布树/新版本均null，shipped由运维核实际后登记。'}
(HERE / 'ledger-source-update.json').write_text(json.dumps(update, ensure_ascii=False, indent=1) + '\n')
r = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'update'],
                   input=json.dumps(update, ensure_ascii=False), capture_output=True, text=True)
(HERE / 'ledger-source-update.log').write_text(r.stdout + r.stderr)
assert r.returncode == 0, r.stderr
with (HERE / 'ledger-final-check.log').open('w') as log:
    check = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'check'], stdout=log, stderr=subprocess.STDOUT)
(HERE / 'ledger-final-check.exit').write_text(str(check.returncode) + '\n')
assert check.returncode == 0

result = {k: v for k, v in summary.items() if k not in ('source_status', 'item', 'source_implementation', 'blocker')}
result.update({'source_commit': source, 'candidate_tree': tree, 'observed_live': state,
               'commits': [source], 'main_sync': 'Already up to date',
               'report': str(HERE / 'report.md'), 'calibration_report': 'paper/materials/silent/boss-sim-calibration.md',
               'fixes': [{'item': summary['item'], 'commit': source,
                          'source_implementation': summary['source_implementation'],
                          'test': 'agent/tools/test-sandbox.sh; Python12校准夹具; 调度8夹具; 两控制战四起点; 双幂等; gitleaks',
                          'fails_without_fix': False,
                          'fails_without_fix_reason': '授权校准数据刷新，无新增生产代码，不冒造bug红绿。',
                          'actual_code_merge': None, 'release_commit': None, 'release_tree': None,
                          'version': None, 'ledger': summary['ledger']}],
               'skipped': [{'item': 'live合入、发布版本、合后测试及完整外部检查',
                            'reason': f'{state.get("pending_merge_head")}已有他人未完成合并、{len(state.get("conflict_paths", []))}冲突；本批未写live。无需Roy再次批准。'},
                           {'item': '未达标boss和F49准入',
                            'reason': '数量已足但误差指标失败；A0–4/A5–9独立验证各0、各差10场；固定切点保持。'}]})
result['tests']['gitleaks'] = 0
result['tests']['ledger_check'] = 0
(HERE / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
with (HERE / 'report.md').open('a') as out:
    out.write(f'\n## 最终源码回执\n\n{timestamp}；本批唯一提交 {source}，候选树 {tree}。'
              f'提交前最终gitleaks退出0；台账{summary["ledger"][0]}已CLI追加此来源提交并保持proposed，最终check退出0。'
              f'提交后再次锁内核实live={state.get("initial_live")}，MERGE_HEAD={state.get("pending_merge_head")}，'
              f'{len(state.get("conflict_paths", []))}个冲突保持；未实际合入，固定发布树/版本均null。'
              '机器回报为同目录result.json，源码合入和完整外部检查交实际后续发布流程。\n')
assert not git('status', '--porcelain'), 'Unexpected uncommitted files; retain and inspect'
(HERE / 'final-verification.json').write_text(json.dumps({'source': source, 'candidate_tree': tree,
    'worktree_clean': True, 'merged': None, 'release_tree': None, 'version': None,
    'ledger': summary['ledger'], 'code_proposals': [], 'implementation_domains': [], 'tests': result['tests']}, indent=1) + '\n')
print(json.dumps({'source': source, 'candidate_tree': tree, 'merged': None,
                  'ledger': summary['ledger'], 'worktree_clean': True}, ensure_ascii=False))
