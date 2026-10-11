"""Seal this calibration candidate and preserve the foreign live merge blocker."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CLOSEOUT = ROOT / 'paper/materials/silent/20261011-011304-boss-calibration-closeout'

def read(name):
    return json.loads((HERE / name).read_text())

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

for name in ('merge-main-sandbox', 'merge-main-gitleaks', 'source-sandbox',
             'python-fixtures', 'dispatch-fixtures', 'finish-pinned', 'ledger-check',
             'candidate-gitleaks', 'audit-board', 'audit-sources'):
    assert (HERE / f'{name}.exit').read_text().strip() == '0', name
state = read('live-release-state.json')
assert state.get('blocked') and state.get('pending_merge_head') and state['previous_unchanged']
assert state['lock_acquired'] and state['merged'] is None
trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = read('previous-live-trust.json')
extraction = read('dataset/extraction.json')
integrity = read('opening-source-integrity.json')
new, added = read('new-fights.json'), read('new-since-live.json')
ledger = (HERE / 'ledger-id.txt').read_text().strip()
base = (HERE / 'base.txt').read_text().strip()
log = (HERE / 'source-sandbox.log').read_text()
files = sum(map(int, re.findall(r'Test Files\s+(\d+) passed', log)))
cases = sum(map(int, re.findall(r'Tests\s+(\d+) passed', log)))
assert files and cases and not re.search(r'(?:Test Files|Tests).*\d+ failed', log)
tests = {'tsc': 0, 'vitest': 0, 'files': files, 'cases': cases, 'python': 0,
         'python_cases': 12, 'dispatch': 0, 'dispatch_cases': 8,
         'control_replays_equal': 4, 'idempotency': True,
         'gitleaks_candidate': 0, 'live': None, 'external_full': None,
         'first_source_attempt': {'exit': 1, 'passed': 2669, 'failed': 1,
             'test': 'check-imports.test.ts', 'error': 'ENOENT during concurrent temporary-directory removal',
             'log': str(CLOSEOUT / 'source-sandbox-attempt1.log')},
         'rerun_change': 'TMPDIR moved to scratch/.test-tmp; original fixed sandbox script and exclusions unchanged'}
reason = (f"锁内live={state['initial_live']}，已有他人MERGE_HEAD={state['pending_merge_head']}、"
          f"{len(state['conflict_paths'])}个冲突。本批未写live，未保存刷新、开始自己的预检或合并；保留他人现场。")
timestamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
(HERE / 'closeout-date.log').write_text(timestamp + '\n')
summary = {'task': 'fix-batch', 'base': base, 'item': 'Roy 已授权新功能：静默 boss 模拟校准',
           'source_implementation': 'cdf75af64fb5b118a5a808ecb3b05e2a05991c36',
           'merged': None, 'actual_code_merge': None, 'release_commit': None,
           'release_tree': None, 'version': None, 'ledger': [ledger],
           'ledger_status': 'proposed', 'code_proposals': [], 'implementation_domains': [],
           'tests': tests, 'observed_live': state, 'blocker': reason,
           'artifact': trust['refresh']['artifact'],
           'existing_live_calibration': read('existing-live-calibration.json'),
           'sample_counts': {k: extraction[k] for k in ('finished_runs', 'attempts', 'written', 'usable_by_asc', 'exclusions')},
           'new_since_live': len(added), 'split': {k: trust['split'][k] for k in ('cutoff_ts', 'tune_n', 'val_n')},
           'boss_trust': trust['bosses'],
           'a10': {s: trust['residuals'][s]['val']['A10'] for s in ('t1', 'pre')},
           'f49': {s: trust['stage_metrics'][s]['F49']['val'] for s in ('t1', 'pre')},
           'refresh_entry': 'agent/tools/boss-sim/refresh-silent.py --previous <live>/knowledge/characters/silent/boss-trust.json',
           'cadence': '每小时:13/:43及learner完成事件检查；升阶或新增20次实际boss结局触发。'}
write('precommit-summary.json', summary)
receipt = f'''
## 本批发布检查与测试回执

{timestamp}：候选完成，自测通过，实际尚未发布。{reason}
这属于合入阻塞，无需Roy再次授权。完整外部检查交实际合入后的调度器。

开工工作树干净，基线{base}；git merge --no-edit main仅decision-log追加冲突，保留双方全部历史。
合main提交{(HERE / 'merge-main-commit.txt').read_text().strip()}；该次提交前沙箱与gitleaks均退出0。
本批最终tsc0、原固定沙箱{files}文件{cases}例通过；Python12校准与调度8固定夹具通过。
首轮源码自测tsc0、2669通过/1失败：check-imports.test.ts遍历scratch时sl-gaps临时目录被另一测试删除，stat触发ENOENT。
原日志与exit1完整保留；将TMPDIR改为scratch内.test-tmp，使原导入遍历器跳过动态临时目录，再跑原入口。
未改生产代码、测试代码、原排除名单或门槛，不冒称首次全过；失败发生在源码自测阶段，没有live合入可回退。
两控制战四起点除耗时外完全一致；210固定模型输入SHA与{integrity['verified_openings']}个开场来源校验通过。
同内容重跑、更新previous后不足20结局均跳过，无模拟或拟合子进程，输出字节不变。
固定数据测试没有真实LLM调用，原沙箱排除项保留；候选gitleaks0，最终暂存内容另扫。

复用实现cdf75af64fb5b118a5a808ecb3b05e2a05991c36已核为live祖先。本批不新增生产代码、机制或策略阈值，
不改其他角色，不处理silent-0213。只有静默校准数据、报告、实验原件和本批记录变化。
实际源码合入、固定发布commit/tree及新eval版本均null；{ledger}仅CLI登记fight/proposed及来源提交，未登记shipped。
现有live仍为S1.boss-calibration11，不把候选称为已发布。固定模型仅验证7e1193cef，不验证后续生产模型变化。

后续须先由原合并拥有者处理既有冲突，再在live锁内保存刷新（含新增数据）、查双方重叠、预检、合入固定候选源，
合后沙箱通过并视需要仅重建静默后复测，再登记唯一版本、双通知与运维shipped。
若本批合后失败须保留日志并只回退本批代码、保留刷新；本次没有自己的合入可回退。
所有初稿/原始日志保留，最终来源和机器回执见scratch/source-commit.txt、result.json。
'''
for path in (HERE / 'report.md', ROOT / 'paper/materials/silent/boss-sim-calibration.md'):
    with path.open('a') as handle:
        handle.write(receipt)
(HERE / 'handoff-ops.md').write_text(receipt)
b2, b3 = trust['overall']['t1'], trust['overall']['pre']
a10 = [trust['residuals'][s]['val']['A10']['gap'] * 100 for s in ('t1', 'pre')]
evidence = '；'.join(f"{r['run_id']} A{r['asc']} F{r['floor']} 尝试{r['attempt']} T1–{r['turns']} {r['outcome']}" for r in new)
with (ROOT / 'paper/materials/decision-log.md').open('a') as handle:
    handle.write(f"\n- {timestamp} Codex学习者 / {HERE.name}：Roy已授权静默boss固定模型刷新候选，{extraction['finished_runs']}完局/{extraction['attempts']}尝试/{extraction['written']}可用，较live新增{len(added)}实际结局；107调参/UTC切点/Platt/7e1193cef模型不变，验证{previous['split']['val_n']}→{trust['split']['val_n']}（成功{b2['n']}）。2控制战及{evidence}重放核实；B2/B3 Brier{b2['brier']}/{b3['brier']}、可信{len(trust['trusted_b2'])}/{len(trust['trusted_b3'])}，A10残差{a10[0]:+.1f}/{a10[1]:+.1f}百分点；F49低可信、低阶各0验证保持。tsc/固定沙箱{files}文件{cases}例、Python12/调度8例通过；首轮导入遍历临时目录竞态exit1原件保留，TMPDIR在scratch子目录隔离后原入口复跑；210输入SHA、{integrity['verified_openings']}开场来源与幂等核验通过。锁内live {state['initial_live']}仍有他人MERGE_HEAD {state['pending_merge_head']}及{len(state['conflict_paths'])}冲突，未写live/未合入/无新版本或shipped；{ledger}仅CLI fight/proposed及来源提交。固定指纹{trust['refresh']['artifact']}；测试、合main追加冲突保留双方及发布阻塞封存{CLOSEOUT.relative_to(ROOT)}/。\n")
assert not CLOSEOUT.exists()
CLOSEOUT.mkdir()
names = ['precommit-summary.json', 'report.md', 'base.txt', 'main-incoming.txt', 'merge-main-commit.txt',
         'live-release-state.json', 'live-release-state-initial.json', 'live-status.txt',
         'existing-live-calibration.json', 'candidate-scope-audit.json', 'artifact-integrity.json', 'merge-history-check.json',
         'candidate-vs-live.json', 'boss-trust-table.json', 'criteria-audit.json', 'closeout.py', 'handoff-ops.md', 'commands.md',
         'check-live.py', 'test-dispatch-fixtures.py', 'commit-and-report.py', 'closeout-date.log',
         'source-sandbox-attempt1.log', 'source-sandbox-attempt1.exit', 'test-environment-adjustment.json']
for stem in ('merge-main-sandbox', 'merge-main-gitleaks', 'source-sandbox', 'python-fixtures',
             'dispatch-fixtures', 'check-live', 'candidate-gitleaks', 'ledger-check',
             'extraction', 'audit-board', 'audit-sources'):
    names.extend([stem + '.log', stem + '.exit'])
names += ['merge-main-gitleaks.json', 'candidate-gitleaks.json']
for name in names:
    shutil.copyfile(HERE / name, CLOSEOUT / name)
(CLOSEOUT / 'manifest.json').write_text(json.dumps({p.name: sha(p) for p in sorted(CLOSEOUT.iterdir())}, indent=1) + '\n')
print(json.dumps({'ledger': ledger, 'tests': tests, 'closeout': str(CLOSEOUT), 'merged': None}, ensure_ascii=False))
