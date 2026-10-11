"""Seal the verified candidate and a read-only live blocker before its source commit."""
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')


def read(name):
    return json.loads((HERE / name).read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


for name in ('source-sandbox', 'python-fixtures', 'dispatch-fixtures', 'finish-pinned', 'ledger-check', 'candidate-gitleaks'):
    assert (HERE / f'{name}.exit').read_text().strip() == '0', name
state = read('live-release-state.json')
assert state.get('blocked') and state.get('pending_merge_head') and state['previous_unchanged']
assert state['lock_acquired'] and state['merged'] is None
log = (HERE / 'source-sandbox.log').read_text()
files = sum(map(int, re.findall(r'Test Files\s+(\d+) passed', log)))
cases = sum(map(int, re.findall(r'Tests\s+(\d+) passed', log)))
assert files and cases and not re.search(r'(?:Test Files|Tests).*\d+ failed', log)
ledger = (HERE / 'ledger-id.txt').read_text().strip()
base = (HERE / 'base.txt').read_text().strip()
trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
extraction = read('dataset/extraction.json')
archive = ROOT / 'experiments/boss-sim/silent' / trust['refresh']['artifact']
closeout = ROOT / 'paper/materials/silent/20261010-231305-boss-calibration-closeout'
assert not closeout.exists()
closeout.mkdir()
reason = (f"锁内 live={state['initial_live']}，已有他人 MERGE_HEAD={state['pending_merge_head']}、"
          f"{len(state['conflict_paths'])} 个冲突。本批未写 live；未保存刷新或开始自己的合并预检，"
          "不能覆盖既有未完成合并。没有需要 Roy 再批准的事项。")
timestamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
(HERE / 'closeout-date.log').write_text(timestamp + '\n')
tests = {'tsc': 0, 'vitest': 0, 'files': files, 'cases': cases,
         'python': 0, 'python_cases': 12, 'dispatch': 0, 'dispatch_cases': 8,
         'control_replays_equal': 4, 'idempotency': True, 'gitleaks_candidate': 0,
         'live': None, 'external_full': None}
summary = {'task': 'fix-batch', 'base': base, 'source_commit': None,
           'source_status': 'precommit snapshot; final source is in scratch/source-commit.txt and result.json',
           'item': 'Roy 已授权新功能：静默 boss 模拟校准',
           'source_implementation': 'cdf75af64fb5b118a5a808ecb3b05e2a05991c36',
           'merged': None, 'actual_code_merge': None, 'release_commit': None,
           'release_tree': None, 'version': None, 'ledger': [ledger], 'ledger_status': 'proposed',
           'code_proposals': [], 'implementation_domains': [], 'tests': tests,
           'observed_live': state, 'blocker': reason, 'artifact': trust['refresh']['artifact'],
           'existing_live_calibration': read('existing-live-calibration.json'),
           'sample_counts': {k: extraction[k] for k in ('finished_runs', 'attempts', 'written', 'usable_by_asc', 'exclusions')},
           'new_since_live': len(read('new-since-live.json')),
           'split': {k: trust['split'][k] for k in ('cutoff_ts', 'tune_n', 'val_n')},
           'boss_trust': trust['bosses'],
           'a10': {s: trust['residuals'][s]['val']['A10'] for s in ('t1', 'pre')},
           'f49': {s: trust['stage_metrics'][s]['F49']['val'] for s in ('t1', 'pre')},
           'refresh_entry': 'agent/tools/boss-sim/refresh-silent.py --previous <live>/knowledge/characters/silent/boss-trust.json',
           'cadence': '每小时 :13/:43 及 learner 完成事件检查；升阶或新增20次实际boss结局触发，切点/调参/模型固定，新样本只延伸验证。'}
(HERE / 'precommit-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
report = (HERE / 'report.md').read_text()
report += f'''\n## 本批发布检查与测试回执\n
{timestamp}：候选完成、自测通过，实际未上线。{reason}

固定模型/消费实现复用 cdf75af64fb5b118a5a808ecb3b05e2a05991c36（已核为 live 祖先），
本批只刷新静默校准数据。主线同步结果为 Already up to date，基线 {base}。
源提交由本次提交完成后写入 scratch/source-commit.txt、result.json 并通过 ledger CLI 追加；
本文件是提交前封存，不能将基线或候选 tree 冒称本批实际 live 发布。

原沙箱入口 tsc0、{files} 文件 {cases} 例通过；Python12例、调度8例通过。
所有测试使用固定数据，没有真实 LLM 调用；无本批失败/中断测试，旧批历史不改写。
两场控制战四起点除耗时外相同，固定模型210输入SHA一致；归档角色隔离和内容指纹核验通过。
同内容重跑及更新previous后的门槛不足路径均未启动拟合/模拟子进程，输出字节相同。

实际源码合入、固定发布commit/tree、eval版本均为null；{ledger}保持fight/proposed。
live已有未完成合并，未执行本批知识刷新保存、预检、源码合入或合后测试，也未回退他人工作。
运维需先处理原合并，再沿发布锁保存刷新、查重叠、预检、合入固定本批提交、测试及唯一版本登记；
实际发布后由运维登记shipped，完整外部检查交调度器。本批无需再请示Roy，不发布空版本。
'''
(HERE / 'report.md').write_text(report)
with (ROOT / 'paper/materials/decision-log.md').open('a') as out:
    out.write(f'\n- {timestamp} Codex学习者 / {HERE.name}：Roy已授权静默boss固定模型刷新候选，'
              f'215完局/966尝试/390可用，较live新增26实际结局；107调参/UTC切点/Platt/7e1193cef模型不变，'
              f'验证257→283（成功281），387场缓存与2控制+UV5YK5721RPB A10 F17 T1–9新战重放核实。'
              f'B2/B3 Brier0.1106/0.1119、各7可信，A10残差+5.7/+6.0百分点；F49仍低可信、低阶各0验证。'
              f'tsc/沙箱{files}文件{cases}例、Python12/调度8例通过；210输入SHA、964开场来源及幂等核验通过。'
              f'锁内live {state["initial_live"]}仍有他人MERGE_HEAD {state["pending_merge_head"]}及{len(state["conflict_paths"])}冲突，'
              f'未写live/未合入/无新eval版本或shipped；{ledger}仅CLI fight/proposed，源码提交回执见本批scratch/source-commit.txt。'
              f'不改策略阈值/其他角色/其他队列；固定指纹{trust["refresh"]["artifact"]}，测试与阻塞封存{closeout.relative_to(ROOT)}/。\n')
names = ['precommit-summary.json', 'report.md', 'live-release-state.json', 'live-status.txt',
         'check-live.py', 'check-live.log', 'check-live.exit', 'base.txt', 'existing-live-calibration.json',
         'source-sandbox.log', 'source-sandbox.exit', 'python-fixtures.log', 'python-fixtures.exit',
         'dispatch-fixtures.log', 'dispatch-fixtures.exit', 'ledger-check.log', 'ledger-check.exit',
         'closeout-date.log', 'artifact-integrity.json', 'seal-precommit.py',
         'candidate-scope-audit.json', 'candidate-gitleaks.log', 'candidate-gitleaks.exit', 'candidate-gitleaks.json',
         'commands.md', 'commit-and-report.py']
for name in names:
    shutil.copyfile(HERE / name, closeout / name)
(closeout / 'manifest.json').write_text(json.dumps({p.name: sha(p) for p in sorted(closeout.iterdir())}, indent=1) + '\n')
print(json.dumps({'ledger': ledger, 'tests': tests, 'closeout': str(closeout), 'merged': None}, ensure_ascii=False))
