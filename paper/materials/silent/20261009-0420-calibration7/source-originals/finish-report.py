"""Write the final handoff from fixed publication evidence, without marking shipped."""
import json
from pathlib import Path
import re
import subprocess

S = Path(__file__).resolve().parent
WORK = S.parents[2]
ROOT = Path('/home/dw/Projects/agent-sts2')
LIVE = ROOT / '.worktrees/live'
state = json.loads((S / 'live-release-state.json').read_text())
request = json.loads((S / 'release-request.json').read_text())
assert state['sandbox_exit'] == 0 and (S / 'publication-integrity.json').exists()
artifact = request['artifact']
archive = WORK / 'experiments/boss-sim/silent' / artifact
trust = json.loads((archive / 'boss-trust.json').read_text())
extraction = json.loads((archive / 'extraction.json').read_text())
tests = {}
for label in ['source-sandbox', 'source-final-sandbox', 'source-python-fixed', 'source-dispatch-fixed', 'live-sandbox', 'source-release-gitleaks', 'source-staged-final-gitleaks', 'live-integration-gitleaks']:
    tests[label] = int((S / (label + '.exit')).read_text())
    assert tests[label] == 0
live_log = (S / 'live-sandbox.log').read_text()
files = re.findall(r'Test Files\s+(\d+) passed', live_log)
cases = re.findall(r'Tests\s+(\d+) passed', live_log)
assert files and cases
tests.update({'tsc': 0, 'sandbox_test_files': sum(map(int, files)), 'sandbox_test_cases': sum(map(int, cases)),
              'python_calibration_cases': 12, 'python_dispatch_cases': 44, 'idempotency': 'same archive and insufficient-trigger skips verified; no subprocess',
              'full_external': '由调度器在沙箱外补跑，尚未声称通过'})
bosstable = []
for key, boss in sorted(trust['bosses'].items()):
    row = {'boss': key, 'name': boss['name']}
    for channel, start in [('B2', 't1'), ('B3', 'pre')]:
        metrics = boss[start]
        row[channel] = {field: metrics[field] for field in ['n', 'missing', 'brier', 'mean_pred', 'actual_win', 'leak_ratio', 'failed']}
        row[channel]['trusted'] = not metrics['failed']
    bosstable.append(row)
f49 = {}
for channel, start in [('B2', 't1'), ('B3', 'pre')]:
    val = trust['stage_metrics'][start]['F49']['val']
    f49[channel] = {'n': val['n'], 'missing': max(0, 10 - val['n']), 'mean_pred': val['mean_pred'],
                    'actual_win': val['actual_win'], 'brier': val['brier'], 'leak_ratio': val['leak']['enemy_ratio'],
                    'reason': trust['stage_low'][channel.lower()]['49']}
commits = {'implementation_reused': 'cdf75af64fb5b118a5a808ecb3b05e2a05991c36',
           'initial_source': '4b82145428abb718c39d7bf76fbbb28bccd8a8d5',
           'final_source': state['source'], 'live_before': state['before_code'], 'saved_refresh': state['refresh_commit'],
           'actual_merge': state['merged'], 'fixed_publication': state['publication']}
final = {
    'task': 'fix-batch', 'base': request['baseline'],
    'fixes': [{'item': 'Roy 已授权新功能：静默 boss 模拟校准', 'commit': state['source'],
               'implementation_commit': commits['implementation_reused'], 'actual_merge': state['merged'],
               'publication': state['publication'], 'publication_tree': state['publication_tree'],
               'version': state['version'], 'ledger_id': 'silent-0325',
               'test': '源和锁内合后 sandbox tsc+vitest通过，Python固定12+44例及幂等通过',
               'fails_without_fix': False, 'note': '本批为20新实结局触发的数据校准刷新，复用已有实现；不是bug-infra，未改策略阈值。'}],
    'skipped': [{'item': 'A0–4 / A5–9 独立验证', 'reason': '固定切分下均n=0，分别只有38/52调参样本；低可信限制保留。'},
                {'item': 'F49可信准入', 'reason': '实际12/可用11/验证9，还差1场且误差与打穿比不达标。'},
                {'item': '旧模拟错误', 'reason': 'K3676LU8B0UH:48:2:6525158984 两起点no solve原样保留，不修其他队列bug。'}],
    'merged': state['merged'], 'publication': state['publication'], 'publication_tree': state['publication_tree'],
    'tested_tree': state['tested_tree'], 'version': state['version'], 'all_commits': commits, 'tests': tests,
    'extraction': {k: extraction[k] for k in ['character', 'finished_runs', 'attempts', 'written', 'usable_runs', 'usable_outcomes', 'usable_by_asc', 'exclusions', 'boss_rooms', 'snapshot_ended_max']},
    'split': {'cutoff_utc': trust['split']['cutoff_ts'], 'tune_keys': 107, 'successful_tune_per_start': 106, 'validation_previous': 154, 'validation_now': 174, 'new_actual_events': 20, 'new_won': 14, 'new_died': 6, 'tune_and_cutoff_unchanged': True},
    'platt': {start: trust['overall'][start]['platt'] for start in ['t1', 'pre']},
    'validation_brier': {start: trust['overall'][start]['brier'] for start in ['t1', 'pre']},
    'criteria': trust['criteria'], 'boss_trust_table': bosstable,
    'residuals': trust['residuals'], 'F49': f49,
    'refresh': {'entry': 'agent/tools/boss-sim/refresh-silent.py', 'scheduler': 'ops/learner_jobs.py:calibration_job',
                'when': '每小时:13/:43及学习批次完成事件；升阶或新增20次真实boss结局触发',
                'isolation': '只同步静默；固定切点/tune keys，新样本只延伸验证；新指纹目录保留旧目录',
                'idempotency': '同输入和0新事件重跑均已核实跳过，不发布空版本'},
    'evidence_runs': request['evidence_runs'], 'archive': str(archive),
    'paper_report': str(WORK / 'paper/materials/silent/boss-sim-calibration.md'), 'report': str(S / 'report.md'),
    'ledger': {'id': 'silent-0325', 'kind': 'fight', 'status': 'proposed', 'shipped': '仅运维核实实际发布后经CLI登记'},
    'code_proposals': [], 'implementation_domains': [],
    'limitations': ['SL预测必死为截断，不冒造实败；校准以实际结局尝试为条件。',
                    'A10 B2/B3残差+7.4/+7.5个百分点；B3整体打穿比1.302略超1.3，不声称所有范围可信。',
                    'TEST_SUBJECT BIG_POUNCE沿既有A9估值；F49单战与F48→F49联合通关分开。',
                    'B3沿既有pre/redeal方法；B2独立中途校准未验证。'],
    'preserved_checks': ['初次全量回放主动中断exit130；旧261战数值与输入、seed等价审计后复用，20新战40行均完整重放。',
                         '首轮gitleaks1为文件SHA256误报；初始提交未被阻止的流程错误及原件保留，更名后完整归档和暂存扫描0，未放宽规则。',
                         '普通merge-tree预检记录并行记录冲突；两父合入只应用69个任务路径，其余live blob逐项保持，合后固定树核验通过。'],
    'integrity': json.loads((S / 'publication-integrity.json').read_text())
}
(S / 'final.json').write_text(json.dumps(final, ensure_ascii=False, indent=2) + '\n')
publication_update = {'id': 'silent-0325', 'status': 'proposed', 'by': 'learner:silent-boss-calibration',
                      'where': {'commits': list(dict.fromkeys(commits.values()))},
                      'note': f'已核实实际合入{state["merged"]}、固定发布{state["publication"]}/树{state["publication_tree"]}、{state["version"]}；source/live沙箱及固定Python通过，通知Roy双写完成。仅更新proposed及来源，shipped交运维核实；完整外部检查交调度器。'}
(S / 'ledger-publication-update.json').write_text(json.dumps(publication_update, ensure_ascii=False, indent=1) + '\n')
paper = (WORK / 'paper/materials/silent/boss-sim-calibration.md').read_text()
handoff = '# 本批完成记录\n\nRoy已授权新功能：静默boss模拟校准定期刷新。复用既有实现，不冒标bug-infra；只经CLI proposed，实际shipped由运维登记。\n\n'
handoff += f'版本 {state["version"]}；源码 {state["source"]}；实际合入 {state["merged"]}；固定发布 {state["publication"]}；发布树 {state["publication_tree"]}。\n\n'
handoff += f'锁内原live {state["before_code"]}；当时刷新已保存，无待保存文件。逐项保留其他live blob。源和live tsc/vitest0，合后{tests["sandbox_test_files"]}文件/{tests["sandbox_test_cases"]}用例，Python12+44固定例通过；完整外部尚待调度器。\n\n'
handoff += '原回放中断、探索脚本错误、首轮散列误报及未阻止初始提交、普通预检并行记录冲突均保留；后续全量和暂存扫描0，没有降低扫描/准入规则。全部提交、来源和检查详见同目录final.json、publication-integrity.json、live-release-state.json与原始日志。\n\n'
(S / 'report.md').write_text(handoff + paper + '\n\n最终机器报告：final.json。\n')
print(json.dumps({'report': str(S / 'report.md'), 'final': str(S / 'final.json'), 'tests': tests}, ensure_ascii=False))
