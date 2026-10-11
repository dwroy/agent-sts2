"""Seal the fixed-model refresh and the independently verified publication blocker."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CLOSEOUT = ROOT / 'paper/materials/silent/20261011-024306-boss-calibration-closeout'

def read(name):
    return json.loads((HERE / name).read_text())

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

for name in ('source-sandbox', 'python-fixtures', 'dispatch-fixtures', 'finish-pinned',
             'audit-board', 'audit-sources', 'ledger-check'):
    assert (HERE / f'{name}.exit').read_text().strip() == '0', name
state = read('live-release-state.json')
assert state['lock_acquired'] and state.get('pending_merge_head') and state['previous_unchanged']
assert state['merged'] is None
trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = read('previous-live-trust.json')
extraction = read('dataset/extraction.json')
new, added = read('new-fights.json'), read('new-since-live.json')
ledger = (HERE / 'ledger-id.txt').read_text().strip()
base = (HERE / 'base.txt').read_text().strip()
log = (HERE / 'source-sandbox.log').read_text()
files = sum(map(int, re.findall(r'Test Files\s+(\d+) passed', log)))
cases = sum(map(int, re.findall(r'Tests\s+(\d+) passed', log)))
assert files and cases and not re.search(r'(?:Test Files|Tests).*\d+ failed', log)
criteria = {}
for start, use in (('t1', 'b2'), ('pre', 'b3')):
    accepted = []
    limit = trust['overall'][start]['brier'] * 1.25
    for key, boss in trust['bosses'].items():
        item = boss[start]
        passes = (item['n'] >= 10 and item['brier'] <= limit
                  and abs(item['mean_pred'] - item['actual_win']) <= 0.15
                  and item['leak_ratio'] is not None and 0.7 <= item['leak_ratio'] <= 1.3)
        assert passes == (not item['failed']), (key, start)
        assert item['missing'] == max(0, 10 - item['n'])
        if passes:
            accepted.append(key)
    assert accepted == trust['trusted_' + use]
    criteria[start] = {'four_criteria_match': True, 'trusted': accepted, 'brier_limit': limit}
write('criteria-audit.json', criteria)
tests = {'tsc': 0, 'vitest': 0, 'files': files, 'cases': cases,
         'python': 0, 'python_cases': 12, 'dispatch': 0, 'dispatch_cases': 8,
         'control_replays_equal': 4, 'idempotency': True,
         'live': None, 'external_full': None}
reason = (f"锁内live={state['initial_live']}，他人MERGE_HEAD={state['pending_merge_head']}，"
          f"{len(state['conflict_paths'])}个未解冲突；本批未改live索引/刷新，未启动自己的合并。")
timestamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
(HERE / 'closeout-date.log').write_text(timestamp + '\n')
b2, b3 = trust['overall']['t1'], trust['overall']['pre']
summary = {'task': 'fix-batch', 'base': base,
           'item': 'Roy 已授权新功能：静默 boss 模拟校准',
           'source_implementation': 'cdf75af64fb5b118a5a808ecb3b05e2a05991c36',
           'model_commit': trust['source']['simulator_base'],
           'merged': None, 'actual_code_merge': None, 'release_commit': None,
           'release_tree': None, 'version': None, 'ledger': [ledger], 'ledger_status': 'proposed',
           'code_proposals': [], 'implementation_domains': [], 'tests': tests,
           'observed_live': state, 'blocker': reason, 'artifact': trust['refresh']['artifact'],
           'existing_live_calibration': read('existing-live-calibration.json'),
           'sample_counts': {k: extraction[k] for k in ('finished_runs', 'attempts', 'written', 'usable_by_asc', 'exclusions')},
           'new_since_live': len(added), 'new_since_candidate': len(new),
           'split': {k: trust['split'][k] for k in ('cutoff_ts', 'tune_n', 'val_n')},
           'boss_trust': trust['bosses'],
           'a10': {s: trust['residuals'][s]['val']['A10'] for s in ('t1', 'pre')},
           'f49': {s: trust['stage_metrics'][s]['F49']['val'] for s in ('t1', 'pre')},
           'refresh_entry': 'agent/tools/boss-sim/refresh-silent.py --previous <live>/knowledge/characters/silent/boss-trust.json',
           'cadence': '每小时:13/:43及learner完成事件检查；升阶或新增20次实际boss结局触发。'}
write('precommit-summary.json', summary)
receipt = f'''
## 本批测试与实际发布状态

{timestamp}：固定模型候选已完成，尚未发布。{reason}
这是已有合并现场阻塞，无需Roy重新批准；只有原合并拥有者完成/撤回其合并后才能继续本批锁内发布。
没有本批源码合入可回退，刷新和原冲突全保留；实际源码合入、固定发布commit/tree、新eval版本均null。
现有live仍为S1.boss-calibration11。本批账本{ledger}只经CLI记fight/proposed及来源提交，shipped交运维确认。

开工git status干净，git merge --no-edit main为Already up to date；base={base}。
最终原沙箱入口含tsc退出0、{files}文件/{cases}用例通过；Python12校准和8调度固定夹具通过。
生产源码、测试及固定排除名单不变。全套外部检查交实际合入后的调度器，未冒称运行。
固定模型210输入SHA、399完整开场状态、978来源offset/len/SHA核实，两控制战四起点除耗时外完全一致。
107调参keys、UTC切点、Platt与模型选择均不变；同内容与更新previous门槛两种幂等检查通过。
预检判断仍按四指标，A0–4/A5–9各0独立验证且各差10场；F49数量已足、质量仍不达标。
A10输入审计中48项攻击伤害取A10记录，TEST_SUBJECT/BIG_POUNCE一项沿固定模型的A9估值；不冒称本批已验证其机制。
A10汇总打穿比B2/B3为{trust['residuals']['t1']['val']['A10']['leak_ratio']}/{trust['residuals']['pre']['val']['A10']['leak_ratio']}；原门槛逐boss分别执行，不能把整体胜率残差合格当作全体可信。

本批直接先以原character_extract.py冻结数据，再按210输入SHA恢复已发布固定模型，用原refresh入口的
--dataset/--results/--provenance参数完成刷新。没有启动当前生产模型的不同参数回放。
第一次准备脚本提前于提取结束读取fights/extraction文件，FileNotFoundError/exit1原记录和脚本保留；
待提取exit0后复用已恢复模型并核210项SHA，准备重跑通过，未消费部分模拟结果。
Python/调度固定夹具和沙箱测试的TMPDIR始终位于本scratch/tmp。

本批只有静默校准数据、来源、论文及记录变化；不修其他队列bug、不改费用/药水/保血/目标/SL阈值。
code_proposals=[]、implementation_domains=[]。现有实现cdf75af64和固定模型7e1193cef均核为live祖先。
本表只验证固定模型，不证明后续生产模型变化或整局通关收益。

后续按锁内完整流程先保存刷新含新增数据、检查重叠/预检、合入固定源、合后沙箱测试，再登记唯一eval版本及通知。
合后失败须保留日志并回退本批合入、保留原刷新。原件与最终源提交回执见scratch/result.json及source-commit.txt。
'''
for path in (HERE / 'report.md', ROOT / 'paper/materials/silent/boss-sim-calibration.md'):
    with path.open('a') as handle:
        handle.write(receipt)
(HERE / 'handoff-ops.md').write_text(receipt)
evidence = '；'.join(f"{r['run_id']} A{r['asc']} F{r['floor']} 尝试{r['attempt']} T1–{r['turns']} {r['outcome']}" for r in new)
a10 = [trust['residuals'][s]['val']['A10']['gap'] * 100 for s in ('t1', 'pre')]
with (ROOT / 'paper/materials/decision-log.md').open('a') as handle:
    handle.write(f"\n- {timestamp} Codex学习者 / {HERE.name}：Roy授权静默boss固定模型校准刷新候选，{extraction['finished_runs']}完局/{extraction['attempts']}尝试/{extraction['written']}可用，较live新增{len(added)}实际结局；107调参/UTC切点/Platt/7e1193cef模型保持，验证{previous['split']['val_n']}→{trust['split']['val_n']}（成功{b2['n']}）。2控制战及{evidence}重放核实；B2/B3 Brier{b2['brier']}/{b3['brier']}、可信{len(trust['trusted_b2'])}/{len(trust['trusted_b3'])}，A10残差{a10[0]:+.1f}/{a10[1]:+.1f}百分点；F49与低阶限制保持。原沙箱tsc0/{files}文件{cases}例、Python12/调度8例通过；首次准备早于提取完成的FileNotFoundError/exit1原件保留，提取完成后复跑准备通过；未消费部分模拟结果。{reason}无新版本或shipped；{ledger}只CLI fight/proposed及来源提交。指纹{trust['refresh']['artifact']}；完整回执{CLOSEOUT.relative_to(ROOT)}/。\n")
assert not CLOSEOUT.exists()
CLOSEOUT.mkdir()
names = ['precommit-summary.json', 'report.md', 'base.txt', 'live-release-state.json', 'live-status.txt',
         'existing-live-calibration.json', 'artifact-integrity.json', 'candidate-vs-live.json',
         'boss-trust-table.json', 'criteria-audit.json', 'closeout.py', 'handoff-ops.md', 'commands.md',
         'check-live.py', 'test-dispatch-fixtures.py', 'commit-and-report.py', 'stage-and-scan.py', 'closeout-date.log', 'initial-prepare-failure.json']
for stem in ('source-sandbox', 'python-fixtures', 'dispatch-fixtures', 'check-live', 'check-live-precommit', 'ledger-check',
             'extract', 'audit-board', 'audit-sources', 'prepare-pinned-initial', 'prepare-pinned', 'pinned-replay', 'finish-pinned'):
    names.extend([stem + '.log', stem + '.exit'])
for name in names:
    shutil.copyfile(HERE / name, CLOSEOUT / name)
(CLOSEOUT / 'manifest.json').write_text(json.dumps({p.name: sha(p) for p in sorted(CLOSEOUT.iterdir())}, indent=1) + '\n')
print(json.dumps({'ledger': ledger, 'tests': tests, 'closeout': str(CLOSEOUT), 'merged': None}, ensure_ascii=False))
