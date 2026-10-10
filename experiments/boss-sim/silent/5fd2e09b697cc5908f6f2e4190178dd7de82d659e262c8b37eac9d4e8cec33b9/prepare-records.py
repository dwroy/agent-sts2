"""Preserve the generated report and append this authorized calibration as fight/proposed via the ledger CLI."""
import collections
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
PROJECT = Path('/home/dw/Projects/agent-sts2')
trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = json.loads((HERE / 'previous-trust.json').read_text())
artifact = trust['refresh']['artifact']
generated = HERE / artifact
archive = ROOT / 'experiments/boss-sim/silent' / artifact
assert not archive.exists(), 'do not overwrite a previous archive'
extraction = json.loads((generated / 'extraction.json').read_text())
sources = [json.loads(line) for line in (generated / 'sources.jsonl').read_text().splitlines()]
new = json.loads((HERE / 'new-fights.json').read_text())
text = (generated / 'report.md').read_text()
text = text.replace('没有实际结局的房间', '没有可用实际结局开场的房间')
f49 = [r for r in sources if r.get('floor') == 49]
actual_f49 = sum(r.get('outcome') in ('won', 'died') for r in f49)
usable_f49 = sum(not r.get('excluded') for r in f49)
old_sentence = f'F49 实际结局 {usable_f49} 场；这个数量不足单独验证第二场 boss 的可靠性，仍只评估实际进入每战时的资源和单战胜败，没有评估 F48→F49 联合通关胜率。'
new_sentence = (f'F49 实际结局 {actual_f49} 次、可用开场 {usable_f49} 场、验证 '
                f"{ {s: (trust['stage_metrics'][s]['F49']['val'] or {}).get('n', 0) for s in ('t1', 'pre')} }；"
                '数量与失败指标分别见下表，仍只评估实际进入每战时的资源和单战胜败，没有评估 F48→F49 联合通关胜率。')
assert old_sentence in text
text = text.replace(old_sentence, new_sentence)
reuse = json.loads((HERE / 'result-reuse-audit.json').read_text())
appendix = (
    '\n## 本批刷新核验与限制\n\n'
    f"22次新实际结局（{dict(collections.Counter(r['outcome'] for r in new))}）触发；"
    '固定调参107场和UTC切点不变，新样本只把验证214扩至236。'
    f"旧模型等价范围审计复用{reuse['reused_fights']}场；12场潜在升级路径影响旧样本与22场新样本在当前固定模型上重放，"
    '保留原数据集行号与200样本种子；不是把旧源码的所有输出直接当作当前模型已验证。'
    '输入、代码差异、卡牌全图/生成牌/药水池审计和原始4项配对重放见result-reuse-audit.json、reuse-input-audit.json及其脚本。\n\n'
    'A10开场332个敌人部件的HP/开场取A10记录；48项攻击定义取A10，实验体BIG_POUNCE仍由A9近级估计。'
    '无伤害记录的招式逐项保留，不能把没有数值说成已验证。A0–4和A5–9验证仍为0场，'
    '各需至少10场才能有独立分段验证；不移动切点来补数。F49仍17次实际死亡、16可用开场、14验证，'
    '数量已达到10，失败来自残差/打穿等指标；并未验证F48→F49联合通关。\n\n'
    '原初始全量重放经自己的执行会话中断exit130，partial结果和日志保留，随后采用逐输入等价审计与受影响/新增重放。'
    '原补充调度discover共44例、18失败（旧夹具未创建现行入口所需独占工作树），原件保留；'
    'scratch夹具适配仅建立规定目录，8项校准调度测试全部通过，不改生产调度器或其他队列。'
    '必需沙箱tsc+vitest源258文件2654例通过，Python校准12项通过；合后测试/固定发布树见任务report.md。\n\n'
    '这是Roy已授权新功能的周期刷新，账本kind=fight、status=proposed；不是bug-infra。'
    '只调整静默统计映射/可信数据，未新增出牌、药水、SL或终局策略规则，未改变费用/药水/保血/目标/SL阈值；'
    '不产生新的策略代码提案，已有校准实现cdf75af64fb5b118a5a808ecb3b05e2a05991c36的实际live祖先关系在锁内核实。\n'
)
text += appendix
(ROOT / 'paper/materials/silent/boss-sim-calibration.md').write_text(text)
(HERE / 'report.md').write_text(text + '\n## 发布状态\n\n源码与数据自测已通过；锁内live合入和合后检查尚未执行，此稿不登记shipped。\n')
shutil.copytree(generated, archive)
game_data = Path('/home/dw/Projects/agent-sts2/data/game-data.json')
expected_game_data = trust['source']['input_files'][str(game_data)]
game_bytes = game_data.read_bytes()
assert hashlib.sha256(game_bytes).hexdigest() == expected_game_data
(archive / 'game-data-input.json').write_bytes(game_bytes)
copy_names = [
    'previous-trust.json', 'new-fights.json', 'replay-identifiers.json', 'model-changes.json',
    'result-reuse-audit.json', 'reuse-input-audit.json', 'reuse-input-audit.log', 'reuse-input-audit.exit',
    'audit-reuse-inputs.ts', 'prepare-refresh.py', 'finish-refresh.py', 'prepare-records.py',
    'publish-live.py', 'opening-audit.json', 'model-input-audit.json', 'input-audit-summary.json',
    'first-hit-audit-identifiers.json', 'input-audit.log', 'input-audit.exit', 'new-source-integrity.json',
    'idempotency-audit.json', 'historical-replay-comparison.json', 'source-sandbox.log', 'source-sandbox.exit', 'python-fixed.log', 'python-fixed.exit',
    'python-fixed-scratch.log', 'python-fixed-scratch.exit',
    'dispatch-fixed.log', 'dispatch-fixed.exit', 'dispatch-adapted-fixtures.log', 'dispatch-adapted-fixtures.exit',
    'test-dispatch-fixtures.py', 'dispatch-fixture-limitation.md', 'initial-interruption.md',
    'refresh.log', 'prepare-refresh.log', 'prepare-refresh.exit', 'replay.log', 'replay.exit', 'finish-refresh.log',
    'finish-refresh.exit', 'finish-refresh-verification.log', 'finish-refresh-verification.exit',
    'finish-pipeline.sh', 'finish-pipeline.log', 'finish-pipeline-interrupted.exit', 'finish-pipeline-cancelled.md',
]
for name in copy_names:
    shutil.copyfile(HERE / name, archive / name)
initial = HERE / '19c6dc4bc392dba31c1604e532a201984df395329d54c22acca27a46cc4f5cb8'
shutil.copyfile(initial / 'results/results-0.jsonl', archive / 'initial-interrupted-results.jsonl')
shutil.copyfile(initial / 'backtest.log', archive / 'initial-backtest.log')
(archive / 'initial-refresh.exit').write_text('130\n')
shutil.copyfile(ROOT / 'paper/materials/silent/boss-sim-calibration.md', archive / 'published-report.md')
subprocess.run(['git', 'show', 'HEAD:paper/materials/silent/boss-sim-calibration.md'], cwd=ROOT, check=True,
               stdout=(archive / 'previous-published-report.md').open('w'))
(archive / 'README.md').write_text(
    '# 静默boss校准固定批次\n\n任务20261010-024304-silent-boss-calibration，Roy授权新功能定期刷新；'
    '185完局/869尝试/343可用，107调参/236验证。309历史结果有逐图等价审计，12潜在受影响旧战与22新战重放；'
    'provenance.json保存模型指纹，completed.json封存生成报告与输入，published-report.md保留语义口径补充，'
    '原全量重放中断130与旧调度夹具失败均留存。旧指纹目录不覆盖。\n')
first = min(new, key=lambda r: r['first_ts'])
claim = (f'Roy授权静默boss定期校准本批22新实际结局（16胜/6死亡），185完局/869尝试/343可用开场；'
         f"固定107调参与UTC切点，验证214→236。B2/B3实际拟合{trust['overall']['t1']['tune_n']}/{trust['overall']['pre']['tune_n']}、"
         f"验证{trust['overall']['t1']['n']}/{trust['overall']['pre']['n']}，Brier "
         f"{trust['overall']['t1']['brier']}/{trust['overall']['pre']['brier']}；"
         f"可信{trust['trusted_b2']}/{trust['trusted_b3']}，逐boss沿原四门槛，缺场与失败指标保留。"
         'F49仍17次实际死亡/16开场/14验证，未评估联合通关；未改变策略阈值。')
row = {'character': 'silent', 'by': 'learner:fix-batch', 'kind': 'fight', 'claim': claim,
       'first_run': first['run_id'], 'prior': 'unknown',
       'prior_note': '校准刷新，不从对局动作推断agent是否已经理解打法；Roy提供架构要求而非游戏事实。',
       'status': 'proposed',
       'evidence': [{'run': r['run_id'], 'floor': r['floor'], 'turn': 1, 'role': 'support',
                     'note': f"A{r['asc']} {r['encounter']} 第{r['attempt']}次/{r['turns']}回合实际{r['outcome']}；固定来源{r['key']}"} for r in new],
       'where': {'knowledge': ['knowledge/characters/silent/boss-trust.json'],
                 'proposal': [str(HERE / 'report.md')],
                 'changelog': ['paper/materials/silent/boss-sim-calibration.md', f'experiments/boss-sim/silent/{artifact}']},
       'note': '来源任务20261010-024304-silent-boss-calibration；新功能周期刷新，待运维核实实际发布后登记shipped；code_proposals=[]/implementation_domains=[]。'}
payload = json.dumps(row, ensure_ascii=False)
(HERE / 'ledger-proposal.json').write_text(payload + '\n')
date_result = subprocess.run(['date'], text=True, capture_output=True, check=True)
(HERE / 'ledger-date.log').write_text(date_result.stdout)
result = subprocess.run(['python3', str(PROJECT / 'learner/ledger.py'), 'add'], input=payload, text=True, capture_output=True)
(HERE / 'ledger-add.log').write_text(result.stdout + result.stderr)
(HERE / 'ledger-add.exit').write_text(str(result.returncode) + '\n')
assert result.returncode == 0, result.stderr
ledger_id = result.stdout.strip()
assert re.fullmatch(r'silent-\d{4,}', ledger_id), result.stdout
(HERE / 'ledger-id.txt').write_text(ledger_id + '\n')
text += (f'\n本批账本 `{ledger_id}`（fight/proposed，来源任务20261010-024304-silent-boss-calibration）；'
         f'完整新来源与封存报告目录 `experiments/boss-sim/silent/{artifact}/`。实际发布回执在任务scratch/report.md。\n')
(ROOT / 'paper/materials/silent/boss-sim-calibration.md').write_text(text)
(archive / 'published-report.md').write_text(text)
(HERE / 'report.md').write_text(text + '\n## 发布状态\n\n锁内live合入与合后检查待执行；账本只登记proposed。\n')
for name in ('ledger-proposal.json', 'ledger-add.log', 'ledger-add.exit', 'ledger-id.txt', 'ledger-date.log'):
    shutil.copyfile(HERE / name, archive / name)
(archive / 'audit-manifest.json').write_text(json.dumps({
    p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in archive.iterdir() if p.is_file() and p.name != 'audit-manifest.json'
}, ensure_ascii=False, indent=1) + '\n')
print(json.dumps({'artifact': artifact, 'archive': str(archive), 'ledger': ledger_id}, ensure_ascii=False))
