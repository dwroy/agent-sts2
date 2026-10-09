"""Verify the fixed publication and write the scheduler's completion receipt."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')
state = json.loads((HERE / 'live-release-state.json').read_text())
trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = json.loads((HERE / 'previous-trust.json').read_text())
artifact = ROOT / 'experiments/boss-sim/silent' / trust['refresh']['artifact']

def git(*args):
    return subprocess.check_output(['git', *args], cwd=LIVE, text=True).strip()

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def counts(name):
    text = re.sub(r'\x1b\[[0-9;]*m', '', (HERE / name).read_text())
    return {
        'files': sum(map(int, re.findall(r'Test Files\s+(\d+) passed', text))),
        'cases': sum(map(int, re.findall(r'\n\s*Tests\s+(\d+) passed', text))),
    }

assert state['sandbox_exit'] == 0 and not state.get('rolled_back')
assert not state['overlap']
if state['live_model_input_mismatches']:
    assert state['live_refresh_scope']['refreshed_numeric_model_validated'] is False
assert state['other_paths_byte_equivalent']
assert git('rev-parse', state['publication'] + '^{tree}') == state['publication_tree']
assert git('rev-parse', state['merged'] + '^{tree}') == state['tested_tree']
for commit in (state['source'], state['implementation'], state['merged']):
    subprocess.run(['git', 'merge-base', '--is-ancestor', commit, state['publication']], cwd=LIVE, check=True)
for path in state['paths']:
    assert git('rev-parse', state['source'] + ':' + path) == git('rev-parse', state['publication'] + ':' + path), path
assert set(git('diff', '--name-only', state['merged'], state['publication']).splitlines()) == {
    'eval/versions.json', 'paper/materials/decision-log.md'}
versions = json.loads(git('show', state['publication'] + ':eval/versions.json'))['versions']
assert sum(v['name'] == state['version'] for v in versions) == 1
assert next(v for v in versions if v['name'] == state['version'])['commit'] == state['merged']
manifest = json.loads((artifact / 'audit-manifest.json').read_text())
assert all(sha(artifact / name) == value for name, value in manifest.items())
sealed = json.loads((artifact / 'completed.json').read_text())
assert sha(artifact / 'boss-trust.json') == sealed['trust_sha256']
assert sha(artifact / 'report.md') == sealed['report_sha256']
assert all(sha(artifact / name) == value for name, value in sealed['files_sha256'].items())
assert trust['split']['tune'] == previous['split']['tune']
assert trust['split']['cutoff_ts'] == previous['split']['cutoff_ts']
assert trust['split']['val'][:len(previous['split']['val'])] == previous['split']['val']
assert trust['criteria'] == previous['criteria']
for key, start in (('trusted_b2', 't1'), ('trusted_b3', 'pre')):
    assert sorted(trust[key]) == sorted(b for b,v in trust['bosses'].items() if not v[start]['failed'])
for name in ('source-sandbox', 'live-sandbox', 'python-fixed-scratch', 'dispatch-adapted-fixtures',
             'source-gitleaks', 'live-merge-gitleaks', 'live-release-gitleaks'):
    assert (HERE / (name + '.exit')).read_text().strip() == '0', name
source_tests, live_tests = counts('source-sandbox.log'), counts('live-sandbox.log')
assert source_tests['cases'] > 0 and live_tests['cases'] > 0
ledger = (HERE / 'ledger-id.txt').read_text().strip()
extraction = json.loads((artifact / 'extraction.json').read_text())
boss_table = []
for boss, value in trust['bosses'].items():
    row = {'boss': boss}
    for label, start in (('B2', 't1'), ('B3', 'pre')):
        m = value[start]
        row[label] = {k:m[k] for k in ('n', 'missing', 'brier', 'leak_ratio', 'failed')}
        row[label]['gap_pp'] = round(100 * (m['mean_pred'] - m['actual_win']), 1) if m['n'] else None
        row[label]['trusted'] = not m['failed']
    boss_table.append(row)
errors = trust['errors']
commits = {k:state[k] for k in ('source', 'implementation', 'merged', 'publication')}
if state.get('refresh_commit'):
    commits['saved_live_refresh'] = state['refresh_commit']
receipt = {
    'task': 'fix-batch', 'base': state['base'],
    'fixes': [{'item': 'Roy 已授权新功能：静默 boss 模拟校准', 'commit': state['source'],
               'test': '固定数据：沙箱tsc+vitest、Python校准12例、适配实际目录条件的校准调度8例、冻结切分及两种幂等跳过',
               'fails_without_fix': False,
               'note': '已上线新功能的周期数据刷新，不冒标bug；复用既有实现，新增22次实际结局。'}],
    'skipped': [
        {'item': '其他队列bug，包括silent-0213', 'reason': '本任务只授权静默boss校准刷新。'},
        {'item': '模拟不支持的开场', 'reason': errors},
        {'item': '原补充调度discover', 'reason': '44例18失败；原夹具缺少现行入口要求的工作树目录。原日志保留，scratch只适配夹具后的8项校准测试通过，未修其他调度代码。'},
    ],
    'merged': state['merged'], 'publication': state['publication'],
    'publication_tree': state['publication_tree'], 'tested_tree': state['tested_tree'],
    'version': state['version'], 'commits': commits,
    'tests': {'tsc': 0, 'vitest': 0, 'cases': live_tests['cases'], 'files': live_tests['files'],
              'source': source_tests, 'python_calibration': {'exit': 0, 'cases': 12},
              'dispatch_adapted_fixtures': {'exit': 0, 'cases': 8},
              'dispatch_original': {'exit': 1, 'cases': 44, 'failures': 18},
              'gitleaks': 0, 'full_external': '交调度器补跑，尚未核实'},
    'ledger': {'id': ledger, 'kind': 'fight', 'status': 'proposed', 'shipped': '由运维确认实际发布后登记'},
    'code_proposals': [], 'implementation_domains': [],
    'data': {'finished_runs': extraction['finished_runs'], 'attempts': extraction['attempts'],
             'usable_openings': extraction['written'], 'new_actual_outcomes': 22,
             'tune_candidates': len(trust['split']['tune']), 'validation_candidates': len(trust['split']['val']),
             'successful_tune': {s:trust['overall'][s]['tune_n'] for s in ('t1','pre')},
             'successful_validation': {s:trust['overall'][s]['n'] for s in ('t1','pre')},
             'cutoff_utc': trust['split']['cutoff_ts'], 'historical_reused': 309, 'historical_replayed': 12},
    'trusted': {'B2': trust['trusted_b2'], 'B3': trust['trusted_b3']}, 'boss_table': boss_table,
    'A10': {'residuals': {s:trust['residuals'][s]['val']['A10'] for s in ('t1','pre')},
            'low_trust': trust['ascension_low'],
            'input_scope': '332部件HP/开场取A10，48项攻击定义取A10；实验体BIG_POUNCE取A9近级值。',
            'F49': {'actual_deaths': 17, 'usable_openings': 16, 'validation_n': 14,
                    'metrics': {s:trust['stage_metrics'][s]['F49']['val'] for s in ('t1','pre')},
                    'low_trust': trust['stage_low'], 'joint_F48_F49_validated': False}},
    'sample_shortage': {'A0_4_validation': {'n': 0, 'missing_for_10': 10},
                        'A5_9_validation': {'n': 0, 'missing_for_10': 10}},
    'refresh': {'entry': 'agent/tools/boss-sim/refresh-silent.py',
                'trigger': '升阶或新增20次实际结局boss尝试；SL无实际结局不计数。',
                'schedule': '调度每小时:13/:43及learner完成事件',
                'idempotency': json.loads((HERE / 'idempotency-audit.json').read_text())},
    'report': str(HERE / 'report.md'),
    'paper_report': str(ROOT / 'paper/materials/silent/boss-sim-calibration.md'),
    'archive': str(artifact), 'live_refresh_preserved': state['refresh_paths'],
    'preserved_refresh_scope': state.get('live_refresh_scope'),
    'initial_full_replay': {'exit': 130, 'reason': '改用输入等价审计与受影响/新增重放；原部分结果和失败日志保留。'},
}
(HERE / 'report.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
(HERE / 'final-verification.json').write_text(json.dumps({
    'source_and_implementation_are_live_ancestors': True, 'exact_task_blobs_published': True,
    'archive_manifest_and_completed_hashes_valid': True, 'frozen_split_and_criteria': True,
    'other_live_paths_and_refreshes_preserved': True, 'unique_version': state['version'],
    'fixed_publication': state['publication'], 'fixed_publication_tree': state['publication_tree'],
    'live_head_at_verification': git('rev-parse', 'HEAD'),
}, ensure_ascii=False, indent=1) + '\n')
paper = (ROOT / 'paper/materials/silent/boss-sim-calibration.md').read_text()
(HERE / 'report.md').write_text(paper + '\n## 实际发布与测试回执\n\n'
    + '本批已自行合入并完成合后沙箱检查；账本仅proposed，shipped由运维核实。'
    + f"实际版本{state['version']}，源{state['source']}，实际合入{state['merged']}，"
    + f"固定发布{state['publication']}，发布树{state['publication_tree']}。"
    + '逐blob、来源祖先、原刷新、唯一版本和归档封存校验全部通过。完整外部检查交调度器。\n\n'
    + '完整机器回执见同目录report.json；原失败、gitleaks与合后检查日志保留。\n\n'
    + '```json\n' + json.dumps(receipt, ensure_ascii=False, indent=2) + '\n```\n')
print(json.dumps({'version': state['version'], 'source_tests': source_tests, 'live_tests': live_tests,
                  'ledger': ledger, 'publication': state['publication'], 'publication_tree': state['publication_tree']}, ensure_ascii=False))
