"""Seal this candidate with test evidence and the observed foreign merge blocker."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
LIVE = Path('/home/dw/Projects/agent-sts2/.worktrees/live')
CLOSEOUT = ROOT / 'paper/materials/silent/20261011-114304-boss-calibration-closeout'

def read(name):
    return json.loads((HERE / name).read_text())

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

def git(*args):
    return subprocess.check_output(['git', *args], cwd=LIVE, text=True).strip()

for name in ('source-sandbox', 'python-fixtures', 'dispatch-fixtures', 'finish-pinned',
             'audit-board', 'audit-sources', 'ledger-check', 'prepare-pinned', 'pinned-replay', 'extract'):
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
implementation = 'cdf75af64fb5b118a5a808ecb3b05e2a05991c36'
existing = {'implementation': implementation, 'model': trust['source']['simulator_base'],
            'artifact': previous['refresh']['artifact']}
for key in ('implementation', 'model'):
    existing[key + '_is_live_ancestor'] = subprocess.run(
        ['git', 'merge-base', '--is-ancestor', existing[key], 'HEAD'], cwd=LIVE).returncode == 0
    assert existing[key + '_is_live_ancestor']
versions = json.loads(git('show', 'HEAD:eval/versions.json'))
if isinstance(versions, dict):
    versions = versions['versions']
existing['latest_existing_version'] = [v for v in versions if v['name'].startswith('S1.boss-calibration')][-1]
write('existing-live-calibration.json', existing)
tests = {'tsc': 0, 'vitest': 0, 'files': files, 'cases': cases,
         'python': 0, 'python_cases': 12, 'dispatch': 0, 'dispatch_cases': 8,
         'control_replays_equal': 4, 'idempotency': True, 'live': None, 'external_full': None}
reason = (f"锁内live={state['initial_live']}，他人MERGE_HEAD={state['pending_merge_head']}，"
          f"{len(state['conflict_paths'])}个未解冲突；本批未改live索引/刷新，未启动自己的合并。")
timestamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
(HERE / 'closeout-date.log').write_text(timestamp + '\n')
b2, b3 = trust['overall']['t1'], trust['overall']['pre']
summary = {'task': 'fix-batch', 'base': base,
           'item': 'Roy 已授权新功能：静默 boss 模拟校准', 'source_implementation': implementation,
           'model_commit': trust['source']['simulator_base'],
           'merged': None, 'actual_code_merge': None, 'release_commit': None,
           'release_tree': None, 'version': None, 'ledger': [ledger], 'ledger_status': 'proposed',
           'code_proposals': [], 'implementation_domains': [], 'tests': tests,
           'observed_live': state, 'blocker': reason, 'artifact': trust['refresh']['artifact'],
           'existing_live_calibration': existing,
           'sample_counts': {k: extraction[k] for k in ('finished_runs', 'attempts', 'written', 'usable_by_asc', 'exclusions')},
           'new_since_live': len(added), 'new_since_candidate': len(new),
           'split': {k: trust['split'][k] for k in ('cutoff_ts', 'tune_n', 'val_n')},
           'boss_trust': trust['bosses'],
           'a10': {s: trust['residuals'][s]['val']['A10'] for s in ('t1', 'pre')},
           'f49': {s: trust['stage_metrics'][s]['F49']['val'] for s in ('t1', 'pre')},
           'refresh_entry': 'agent/tools/boss-sim/refresh-silent.py --previous <live>/knowledge/characters/silent/boss-trust.json',
           'cadence': '每小时:13/:43及learner完成事件检查；升阶或新增20次实际boss结局触发。'}
write('precommit-summary.json', summary)
integrity = read('opening-source-integrity.json')
receipt = f'''
## 本批测试与实际发布状态

{timestamp}：候选刷新和自测已完成，尚未发布。{reason}
这是已有合并现场阻塞，无需Roy重新批准；需由原合并拥有者完成/撤回其合并后续办。
没有本批合入可回退，原刷新和冲突保持。实际合入、固定发布commit/tree、新eval版本均null；
现有live校准版本{existing['latest_existing_version']['name']}。账本{ledger}只经CLI记fight/proposed及来源提交，shipped由运维核实际发布。

开工工作树干净；git merge --no-edit main 返回 Already up to date；base={base}。
原沙箱入口含tsc退出0、{files}文件/{cases}用例通过；Python12校准及8调度固定夹具通过。
生产源码/测试/排除名单保持，完整外部检查交实际发布后的调度器，未冒称运行。
210项固定模型输入SHA、{extraction['written']}完整开场state、{integrity['verified_openings']}来源offset/len/SHA核实；
两个控制战的四起点除耗时外相同。107调参keys、UTC切点、Platt和模型选择均不变；两种幂等跳过均通过。
首次prepare-pinned先于提取结束执行，因缺dataset/fights.jsonl退出1；原日志/退出码保留，提取完成后再次准备通过。未使用未完成模拟结果。

H9ERYJLBL4UC 的 F17/F33 实胜与 F48 第六试实死分别入样本；不将前两场胜利计为整局通关。
A0–4/A5–9各0独立验证且各差10场；F49数量已足、质量仍不达标。
A10伤害来源48项取A10，TEST_SUBJECT/BIG_POUNCE一项沿固定模型的A9估值；不声称本批验证了该机制。
A10残差B2/B3为{summary['a10']['t1']['gap']*100:+.1f}/{summary['a10']['pre']['gap']*100:+.1f}百分点，
打穿比为{summary['a10']['t1']['leak_ratio']}/{summary['a10']['pre']['leak_ratio']}；准入按逐boss四指标执行。
只验证固定模型{trust['source']['simulator_base']}，不证明后续生产模型变化、策略收益或F48→F49联合通关率。

本批只改静默校准数据、来源、论文及记录，不修其他队列或改策略阈值。
code_proposals=[]、implementation_domains=[]；已有实现和固定模型均核为live祖先。
锁内后续须保存刷新含新增数据、检查重叠、预检、合入固定源、合后测试，再登记唯一版本及通知；
合后失败保留日志并回退本次合入、保留刷新。最终源提交和机器回报在scratch/source-commit.txt、result.json。
'''
for path in (HERE / 'report.md', ROOT / 'paper/materials/silent/boss-sim-calibration.md'):
    with path.open('a') as handle:
        handle.write(receipt)
(HERE / 'handoff-ops.md').write_text(receipt)
evidence = '；'.join(f"{r['run_id']} A{r['asc']} F{r['floor']} 尝试{r['attempt']} T1–{r['turns']} {r['outcome']}" for r in new)
with (ROOT / 'paper/materials/decision-log.md').open('a') as handle:
    handle.write(f"\n- {timestamp} Codex学习者 / {HERE.name}：Roy授权静默boss固定模型校准刷新候选，{extraction['finished_runs']}完局/{extraction['attempts']}尝试/{extraction['written']}可用，较live新增{len(added)}实际结局；107调参/UTC切点/Platt/7e1193cef模型保持，验证{previous['split']['val_n']}→{trust['split']['val_n']}（成功{b2['n']}）。2控制战及{evidence}重放核实；B2/B3 Brier{b2['brier']}/{b3['brier']}、可信{len(trust['trusted_b2'])}/{len(trust['trusted_b3'])}，A10残差{summary['a10']['t1']['gap']*100:+.1f}/{summary['a10']['pre']['gap']*100:+.1f}百分点；F49与低阶限制保持。tsc/原沙箱{files}文件{cases}例、Python12/调度8例通过；原固定模型重放通过。{reason}无新版本或shipped；{ledger}仅CLI fight/proposed及来源提交。指纹{trust['refresh']['artifact']}；回执{CLOSEOUT.relative_to(ROOT)}/。\n")
assert not CLOSEOUT.exists()
CLOSEOUT.mkdir()
names = ['precommit-summary.json', 'report.md', 'base.txt', 'live-release-state.json', 'live-status.txt',
         'existing-live-calibration.json', 'artifact-integrity.json', 'candidate-vs-live.json',
         'boss-trust-table.json', 'final-boss-table.json', 'criteria-audit.json', 'closeout.py', 'handoff-ops.md', 'commands.md',
         'prepare-pinned-first-failed.log', 'prepare-pinned-first-failed.exit', 'check-live.py', 'test-dispatch-fixtures.py', 'commit-and-report.py', 'stage-and-scan.py', 'closeout-date.log']
for stem in ('source-sandbox', 'python-fixtures', 'dispatch-fixtures', 'check-live', 'ledger-check',
             'extract', 'audit-board', 'audit-sources', 'prepare-pinned', 'pinned-replay',
             'finish-pinned'):
    names.extend([stem + '.log', stem + '.exit'])
for name in names:
    shutil.copyfile(HERE / name, CLOSEOUT / name)
(CLOSEOUT / 'manifest.json').write_text(json.dumps({p.name: hashlib.sha256(p.read_bytes()).hexdigest()
    for p in sorted(CLOSEOUT.iterdir())}, indent=1) + '\n')
print(json.dumps({'ledger': ledger, 'tests': tests, 'closeout': str(CLOSEOUT), 'merged': None}, ensure_ascii=False))
