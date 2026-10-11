"""Preserve a concrete live blocker, complete report and scheduler handoff."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
state = json.loads((HERE / 'live-release-state.json').read_text())
assert state.get('blocked') and state['merged'] is None
source = (HERE / 'source-commit.txt').read_text().strip()
base = (HERE / 'base.txt').read_text().strip()
ledger = (HERE / 'ledger-id.txt').read_text().strip()
trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
timestamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
(HERE / 'closeout-date.log').write_text(timestamp + '\n')
closeout = ROOT / 'paper/materials/silent/20261010-224307-boss-calibration-closeout'
assert not closeout.exists()
closeout.mkdir()
line = (f'- {timestamp} Codex学习者 / {HERE.name}：Roy已授权新功能静默boss定期校准候选，'
        '214完局/965尝试/389可用，较live新增25实际结局；固定107调参/UTC切点/Platt/7e1193cef模型，'
        '验证257→282（成功280），210输入SHA核实、2控制战4起点等价，386缓存复用+1新战3R3LY2HVPPG0 A10 F17 T1–17实胜；'
        'B2/B3 Brier0.1110/0.1123、各7可信，A10残差+5.7/+6.0百分点，F49低可信及低阶各0验证限制保持。'
        f'源{source}，tsc/沙箱265文件2681例、Python12/调度8例及gitleaks均0；'
        f'锁内live {state.get("initial_live")}仍有他人MERGE_HEAD {state.get("pending_merge_head")}及{len(state.get("conflict_paths",[]))}冲突，'
        f'未改live/未合入/无新eval版本或shipped；{ledger}仅CLI fight/proposed与来源提交，完整外部检查待实际合入后由调度器补跑。'
        '未改策略阈值/其他角色/其他队列，历史失败和旧候选保持；回执paper/materials/silent/20261010-224307-boss-calibration-closeout/。\n')
with (ROOT / 'paper/materials/decision-log.md').open('a') as out:
    out.write('\n' + line)
reason = (f'锁内核实live={state.get("initial_live")}，已有他人MERGE_HEAD={state.get("pending_merge_head")}、'
          f'{len(state.get("conflict_paths",[]))}个冲突；本批没有写live，不能保存刷新或开始自己的预检/合入。'
          '阻塞为既有未完成合并，无需Roy另行批准校准方式。')
note = {'id': ledger, 'by': 'learner:fix-batch', 'status': 'proposed',
        'note': f'源{source}自测通过；{reason} 未登记shipped，无新版本。'}
(HERE / 'ledger-blocker-update.json').write_text(json.dumps(note, ensure_ascii=False, indent=1) + '\n')
r = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'update'], input=json.dumps(note, ensure_ascii=False), text=True, capture_output=True)
(HERE / 'ledger-blocker-update.log').write_text(r.stdout + r.stderr)
assert r.returncode == 0, r.stderr
result = {'task': 'fix-batch', 'base': base, 'fixes': [{
    'item': 'Roy 已授权新功能：静默 boss 模拟校准', 'commit': source,
    'test': 'agent/tools/test-sandbox.sh; agent/tools/boss-sim/test_silent_calibration.py; agent/tests/silent-boss-calibration.test.ts; 固定刷新/控制重放/调度夹具',
    'fails_without_fix': False, 'fails_without_fix_reason': '授权数据刷新，无新增生产代码，不伪造bug红绿；旧模型及策略保持，历史指标保留。',
    'ledger': [ledger], 'source_implementation': 'cdf75af64fb5b118a5a808ecb3b05e2a05991c36',
    'actual_code_merge': None, 'release_commit': None, 'release_tree': None, 'version': None}],
    'skipped': [{'item': 'live合入、发布版本、合后与完整外部检查', 'reason': reason},
                {'item': 'F49及未达标boss可信准入', 'reason': '保留原四门槛；验证数量已足但误差/打穿比失败。低阶两段验证各0、各差10，不改固定切点。'}],
    'merged': None, 'tests': {'tsc': 0, 'vitest': 0, 'files': 265, 'cases': 2681,
        'python': 0, 'python_cases': 12, 'dispatch': 0, 'dispatch_cases': 8, 'gitleaks': 0,
        'control_replays_equal': 4, 'idempotency': True, 'live': None, 'external_full': None},
    'code_proposals': [], 'implementation_domains': [],
    'report': str(HERE / 'report.md'), 'calibration_report': 'paper/materials/silent/boss-sim-calibration.md',
    'artifact': trust['refresh']['artifact'], 'source_commit': source,
    'actual_code_merge': None, 'release_commit': None, 'release_tree': None, 'version': None,
    'observed_live': state, 'ledger': [ledger],
    'existing_live_calibration': json.loads((HERE / 'existing-live-calibration.json').read_text()),
    'sample_counts': {'finished_runs': 214, 'attempts': 965, 'usable': 389, 'new_since_live': 25,
        'tune': 107, 'validation': 282, 'successful_tune': 106, 'successful_validation': 280},
    'boss_trust': trust['bosses'],
    'a10': {s: trust['residuals'][s]['val']['A10'] for s in ('t1','pre')},
    'f49': {s: trust['stage_metrics'][s]['F49']['val'] for s in ('t1','pre')},
    'refresh_entry': 'agent/tools/boss-sim/refresh-silent.py --previous <live>/knowledge/characters/silent/boss-trust.json',
    'cadence': 'ops/learner_jobs.py:calibration_job，每小时:13/:43及完成事件检查；升阶或新增20实际boss结局触发；固定模型/切点/调参keys，新样本只延伸验证。',
    'commits': {'main_merge': base, 'candidate': source}}
(HERE / 'result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
report = (HERE / 'report.md').read_text()
report += f'''\n## 本批最终发布与验证回执\n\n{timestamp}：候选已提交并自测通过，实际未上线。{reason}\n
源码/数据提交：{source}；main合并基线：{base}；复用实现：cdf75af64fb5b118a5a808ecb3b05e2a05991c36。
固定发布commit/tree、实际源码合入、eval版本均为null；本批账本{ledger}仍fight/proposed，未标shipped。
源沙箱tsc0、265文件2681例通过；Python12例、调度8例、gitleaks通过。main同步前的同入口检查也通过。
Python第一次固定夹具用默认临时目录，原日志保留；随后指定本任务TMPDIR重跑12例通过。没有测试失败或放宽断言。
两场控制战四起点除耗时外相同，内容重复/阈值不足均幂等跳过。旧3场各两起点no-solve仍有缺预测。
锁内未创建本批MERGE_HEAD、未回退他人工作或覆盖知识刷新；无实际合入，因此未运行合后/外部完整检查。
运维后续只据源提交和指纹数据按原live流程续办，保留当前刷新和并行记录；完整外部检查交调度器。
本任务没有等待Roy审批项。完整机器回报见本目录result.json，锁内状态live-release-state.json，所有失败/旧报告保持。
'''
(HERE / 'report.md').write_text(report)
names = ['result.json','report.md','live-release-state.json','live-status.txt','check-live.py','check-live.log','check-live.exit',
         'source-commit.txt','source-commit.log','base.txt','base-before-merge.txt','main-at-merge.txt','main-merge-conflict.txt',
         'main-merge-commit.log','main-merge-sandbox.log','main-merge-sandbox.exit','main-merge-gitleaks.log','main-merge-gitleaks.exit',
         'source-sandbox.log','source-sandbox.exit','source-gitleaks.log','source-gitleaks.exit',
         'source-with-logs-gitleaks.log','source-with-logs-gitleaks.exit',
         'python-fixtures-initial.log','python-fixtures.log','python-fixtures.exit','dispatch-fixtures.log','dispatch-fixtures.exit',
         'ledger-source-update.json','ledger-source-update.log','ledger-blocker-update.json','ledger-blocker-update.log',
         'ledger-check.log','ledger-check.exit','closeout-date.log','commit-candidate.py','record-blocked.py',
         'existing-live-calibration.json','candidate-scope-audit.json','trust-table-summary.json']
for name in names:
    shutil.copyfile(HERE / name, closeout / name)
(closeout / 'manifest.json').write_text(json.dumps({p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(closeout.iterdir())},indent=1)+'\n')
print(json.dumps({'source': source, 'ledger': ledger, 'merged': None, 'blocked': reason}, ensure_ascii=False))
