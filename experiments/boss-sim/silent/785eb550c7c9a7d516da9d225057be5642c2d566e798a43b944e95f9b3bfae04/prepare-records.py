"""Retain calibration evidence and prepare a statistical ledger proposal."""
import collections
import hashlib
import json
from pathlib import Path
import shutil

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]

def read(name):
    return json.loads((HERE / name).read_text())

trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = read('previous-trust.json')
archive = HERE / trust['refresh']['artifact']
parent = ROOT / 'experiments/boss-sim/silent' / previous['refresh']['artifact']
new = read('new-fights.json')
counts = collections.Counter(r['outcome'] for r in new)
integrity = read('opening-source-integrity.json')
scope = read('input-audit-summary.json')
reuse = read('result-reuse-audit.json')
extraction = json.loads((archive / 'extraction.json').read_text())
f49 = {s: (trust['stage_metrics'][s]['F49']['val'] or {}).get('n', 0) for s in ('t1', 'pre')}
report = ROOT / 'paper/materials/silent/boss-sim-calibration.md'
text = report.read_text().replace('没有实际结局的房间', '没有可用实际结局开场的房间')
text = text.replace(
    f"F49 实际结局 {integrity['f49_usable']} 场；这个数量不足单独验证第二场 boss 的可靠性，",
    f"F49 实际结局 {integrity['f49_actual_outcomes']} 次、可用开场 {integrity['f49_usable']} 场、验证 {f49}；不足与失败指标见下表，")
extra = (
    '\n## 本批来源与增量重放审计\n\n'
    f"任务 {HERE.name} 为 Roy 已授权新功能定期刷新，20次新实际结局（{counts['won']}胜/{counts['died']}死）触发；"
    f"固定107调参keys和UTC切点，仅扩验证174→{trust['split']['val_n']}。各起点Platt和进阶项选择与上批逐项相同。\n\n"
    f"301个开场按原始states偏移、长度、SHA256和角色/进阶逐一核实，战斗入口HP/最大HP与第一帧逐项一致，我方状态与日志一致。"
    f"旧281场输入、行序、回合记录及数值源码/模型数据/game-data均相同；差异只有经验文本，"
    f"模拟器不读取这些文本。{reuse['checked_replays_except_ms']}条历史重放所有非耗时字段完全一致。"
    '复用上批562条封存结果，完整重放20新场t1/pre共40条，逐战seed仍按全数据原始行号。'
    '这是增量验证，不冒称全量重放；初始全量重放主动中断130，原结果和日志保留。\n\n'
    f"A10 HP进阶来源 {scope['a10_hp_asc_sources']}、开场进阶来源 {scope['a10_opening_asc_sources']}，"
    f"有伤害记录的后续招式进阶来源 {scope['a10_move_damage_asc_sources']}；实验体BIG_POUNCE仍由A9估。"
    f"{len(scope['a10_no_damage_records'])}个无伤害记录的招式不能当成已验证机制。"
    f"{scope['corrected_first_hit']}个开场沿既有模型修正首击数值，未补新机制。\n\n"
    f"F49实际结局{integrity['f49_actual_outcomes']}、可用开场{integrity['f49_usable']}、验证{f49}。"
    'TXZ6RVMQA09D F49有died但缺首回合手牌帧而排除；rooms_without_actual_outcome实际表示没有可用实际结局开场。'
    'F48战胜不代表整局通关，F48→F49联合通关概率未验证。A0–4、A5–9验证均0，保留该样本外限制。\n\n'
    '复用已上线实现cdf75af64fb5b118a5a808ecb3b05e2a05991c36及调度入口；本批仅发布静默统计校准数据，'
    '没有新增出牌/药水/保血/目标/SL/终局规则或结构不一致，code_proposals与implementation_domains为空。'
    'live后续知识刷新依锁内流程保留；本表验证固定模型，不冒称刷新后的模型已经同次验证。\n\n'
    '本批实际CLI账本为silent-0337（kind=fight/proposed）；ledger-proposal.json为执行原件，'
    'ledger-payload-draft.json仅为保留草稿，未重复add。来源提交随后用CLI追加，shipped由运维核实际发布后登记。\n')
report.write_text(text + extra)
(archive / 'published-report.md').write_bytes(report.read_bytes())
for name in ('previous-trust.json', 'result-reuse-audit.json', 'opening-source-integrity.json',
             'opening-audit.json', 'first-hit-audit-identifiers.json', 'model-input-audit.json',
             'input-audit-summary.json', 'new-fights.json', 'validation-identifiers.json',
             'model-changes.json', 'idempotency-audit.json', 'refresh.log', 'refresh.exit',
             'initial-interruption.md', 'prepare-refresh.py', 'prepare-refresh.log', 'prepare-refresh.exit',
             'audit-inputs.py', 'input-integrity.log', 'input-integrity.exit', 'finish-refresh.py',
             'input-integrity-extended.log', 'input-integrity-extended.exit',
             'summarize-inputs.py', 'input-summary.log', 'input-summary.exit', 'finish-pipeline.sh',
             'finish-refresh.log', 'finish-refresh.exit', 'prepare-records.py',
             'new-replay.log', 'new-replay.exit', 'opening-audit.log', 'opening-audit.exit',
             'source-python-fixed.log', 'source-python-fixed.exit', 'source-dispatch-fixed.log',
             'source-dispatch-fixed.exit', 'source-sandbox.log', 'source-sandbox.exit'):
    shutil.copyfile(HERE / name, archive / name)
for name in ('ledger-proposal.json', 'ledger-add.log', 'ledger-add.exit', 'ledger-id.txt'):
    shutil.copyfile(HERE / name, archive / name)
initial = HERE / 'f28d9fcd355540452ebc2ec583e8c83d44aa6dca486ee679a943d99b22fd2c6a'
shutil.copyfile(initial / 'results/results-0.jsonl', archive / 'initial-interrupted-results.jsonl')
shutil.copyfile(initial / 'backtest.log', archive / 'initial-backtest.log')
shutil.copyfile(parent / 'published-report.md', archive / 'previous-published-report.md')
shutil.copyfile(Path('/home/dw/Projects/agent-sts2/data/game-data.json'), archive / 'game-data-input.json')
(archive / 'README.md').write_text(
    f"# 静默boss校准固定批次\n\n任务{HERE.name}，Roy授权新功能定期刷新；"
    f"166完局/760尝试/301可用，107调参/{trust['split']['val_n']}验证。"
    'provenance.json记录固定模型与增量复用审计；report.md保留原生成报告，published-report.md补充本批核验。'
    'completed.json封存生成文件，audit-manifest.json封存追加审计；旧指纹目录和旧报告保持。\n')
b2, b3 = trust['overall']['t1'], trust['overall']['pre']
claim = (
    f"Roy授权静默boss校准刷新新增20次实际结局（{counts['won']}胜/{counts['died']}死），"
    f"166完局760尝试301可用；固定107调参与切点，验证174→{trust['split']['val_n']}。"
    f"B2/B3实际拟合{b2['tune_n']}/{b3['tune_n']}、验证{b2['n']}/{b3['n']}，"
    f"Brier {b2['brier']}/{b3['brier']}，原四门槛达标{len(trust['trusted_b2'])}/{len(trust['trusted_b3'])}项；"
    f"A10残差{trust['residuals']['t1']['val']['A10']['gap']}/{trust['residuals']['pre']['val']['A10']['gap']}。"
    f"F49实际13/可用12/验证{f49}，失败指标保持低信度；A0–4/A5–9验证均0。"
    '旧结果数值等价核实后复用，不改策略阈值。')
payload = {'character': 'silent', 'kind': 'fight', 'claim': claim, 'first_run': new[0]['run_id'],
           'prior': 'unknown', 'prior_note': '旧校准已有；新样本残差与准入由本批核实。Roy只授权架构，不提供游戏事实。',
           'status': 'proposed', 'by': 'learner:silent-boss-calibration',
           'evidence': [{'run': r['run_id'], 'floor': r['floor'], 'turn': 1, 'role': 'support',
                         'note': f"新增实际结局{r['outcome']}，A{r['asc']}，尝试{r['attempt']}，代码{r['code']}；key={r['key']}；任务{HERE.name}"} for r in new],
           'where': {'knowledge': ['knowledge/characters/silent/boss-trust.json'],
                     'proposal': ['paper/materials/silent/boss-sim-calibration.md']},
           'note': 'Roy授权新功能定期校准，kind=fight非bug-infra；仅CLI proposed，shipped交运维核实际发布。未新增策略经验或结构不一致提案。'}
(HERE / 'ledger-payload-draft.json').write_text(json.dumps(payload, ensure_ascii=False, indent=1) + '\n')
print(claim)
