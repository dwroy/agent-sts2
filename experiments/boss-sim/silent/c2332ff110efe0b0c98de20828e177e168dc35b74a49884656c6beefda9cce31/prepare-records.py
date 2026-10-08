"""Archive the refresh evidence and propose the new statistical finding through the ledger CLI."""
import collections
import hashlib
import json
from pathlib import Path
import shutil

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
TASK = HERE.name
trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = json.loads((HERE / 'previous-trust.json').read_text())
artifact = trust['refresh']['artifact']
archive = HERE / artifact
parent = ROOT / 'experiments/boss-sim/silent' / previous['refresh']['artifact']
new = json.loads((HERE / 'new-fights.json').read_text())
counts = collections.Counter(r['outcome'] for r in new)
integrity = json.loads((HERE / 'opening-source-integrity.json').read_text())
scope = json.loads((HERE / 'input-audit-summary.json').read_text())
reuse = json.loads((HERE / 'result-reuse-audit.json').read_text())
extraction = json.loads((archive / 'extraction.json').read_text())
f49 = {s: (trust['stage_metrics'][s]['F49']['val'] or {}).get('n', 0) for s in ('t1', 'pre')}
report = ROOT / 'paper/materials/silent/boss-sim-calibration.md'
text = report.read_text().replace('没有实际结局的房间', '没有可用实际结局开场的房间')
text = text.replace(f"F49 实际结局 {integrity['f49_usable']} 场；这个数量不足单独验证第二场 boss 的可靠性，",
                    f"F49 实际结局 {integrity['f49_actual_outcomes']} 次、可用开场 {integrity['f49_usable']} 场、验证 {f49}；数量缺口与失败指标见下表，")
extras = (
    '\n## 本批输入及重放审计\n\n'
    f"任务 {TASK} 为 Roy 已授权新功能的定期校准刷新。新增20次实际结局（{counts['won']}胜/{counts['died']}死），"
    f"只扩展验证 {previous['split']['val_n']}→{trust['split']['val_n']}；107调参keys、UTC切点、各起点整体Platt及进阶项选择保持，未用验证集拟合。\n\n"
    f"{integrity['openings_verified']} 个开场已按原始 states 偏移、长度及SHA256逐一核实，我方状态与日志完全一致。"
    f"旧{reuse['reused_fights']}场输入、原始行序、回合记录、数值源码、模型数据及game-data与上批相同。差异仅经验文本；"
    f"离线模拟输入在经验题面文字生成前捕获。{reuse['checked_replays_except_ms']}条历史重放除耗时外完全一致；"
    f"复用上批{reuse['reused_fights'] * 2}条封存结果，完整重放全部20新场的t1/pre共40条，逐战seed仍按完整数据原始行号计算。"
    '这是增量验证，没有冒称全量重新模拟；初始全量重放主动中断130，原部分结果、审计脚本探索失败及日志保留。\n\n'
    f"A10 HP来源统计 {scope['a10_hp_asc_sources']}，开场进阶来源 {scope['a10_opening_asc_sources']}；"
    f"后续招式有伤害记录的来源 {scope['a10_move_damage_asc_sources']}。实验体BIG_POUNCE仍由A9估，"
    f"无伤害记录的{len(scope['a10_no_damage_records'])}个招式条目不能当成已验证伤害机制。"
    f"{scope['corrected_first_hit']}个开场按既有boss模型修正首击数值，未添加新机制。完整逐部件/招式来源见opening-audit.json与model-input-audit.json。\n\n"
    f"F49实际结局{integrity['f49_actual_outcomes']}、可用开场{integrity['f49_usable']}、验证{f49}。"
    'TXZ6RVMQA09D F49有died结局但缺首回合手牌帧，因此排除；rooms_without_actual_outcome字段表示没有可用实际结局开场，不能解释为都没有实际结局。'
    'F48赢只表示该战胜利；未验证F48→F49联合通关概率。\n\n'
    '本批只同步静默boss-trust、论文报告及新指纹目录，其他角色数据和费用/药水/保血/目标/SL阈值保持。'
    '本表验证所列固定模型，live后续代码/知识刷新照锁内流程保留，不冒称其已经过同一次回放；下一次定期刷新固定新的模型指纹。'
    '复用既有实现cdf75af64fb5b118a5a808ecb3b05e2a05991c36，无新增策略经验或结构不一致提案，code_proposals与implementation_domains为空。\n'
)
report.write_text(text + extras)
(archive / 'published-report.md').write_bytes(report.read_bytes())
names = ('previous-trust.json', 'result-reuse-audit.json', 'opening-source-integrity.json', 'opening-audit.json',
         'first-hit-audit-identifiers.json', 'model-input-audit.json', 'input-audit-summary.json', 'new-fights.json',
         'new-keys.json', 'model-changes.json', 'idempotency-audit.json', 'refresh.log', 'refresh.exit',
         'initial-interruption.md', 'exploration-errors.md', 'prepare-refresh-v2.log', 'prepare-refresh.log',
         'prepare-refresh.py', 'audit-inputs.py', 'finish-refresh.py', 'prepare-records.py',
         'new-replay.log', 'new-replay.exit', 'source-python-fixed.log', 'source-python-fixed.exit',
         'source-dispatch-fixed.log', 'source-dispatch-fixed.exit', 'finish-refresh.log', 'finish-refresh.exit')
for name in names:
    shutil.copyfile(HERE / name, archive / name)
initial = HERE / 'c9ad3bd34190c8c6d4ca9f0d2e682d930deefb6c7d85edba4f7fdafa188f6b1c'
shutil.copyfile(initial / 'results/results-0.jsonl', archive / 'initial-interrupted-results.jsonl')
shutil.copyfile(parent / 'published-report.md', archive / 'previous-published-report.md')
shutil.copyfile(Path('/home/dw/Projects/agent-sts2/data/game-data.json'), archive / 'game-data-input.json')
(archive / 'README.md').write_text(
    f'# 静默boss校准固定批次\n\n任务{TASK}，Roy授权新功能定期刷新；'
    f"{extraction['finished_runs']}完局/{extraction['attempts']}尝试/{extraction['written']}可用，"
    f"107调参/{trust['split']['val_n']}验证；20新实际结局触发，旧目录不覆盖。\n\n"
    'provenance.json保存源码及数据指纹，result-reuse-audit.json记载历史复用边界。'
    'report.md保留原生成报告，published-report.md含审计与统计口径勘误；previous-published-report.md保留上批。'
    'completed.json封存原生成文件，audit-manifest.json封存本批审计材料。仅SILENT完局，SL截断不是实败。\n')
b2, b3 = trust['overall']['t1'], trust['overall']['pre']
claim = (f"Roy授权静默boss校准刷新新增20次实际结局（{counts['won']}胜/{counts['died']}死），"
         f"153完局705尝试281可用；固定107调参与切点，验证154→174。"
         f"B2/B3实际拟合{b2['tune_n']}/{b3['tune_n']}、验证{b2['n']}/{b3['n']}，"
         f"Brier {b2['brier']}/{b3['brier']}，原四门槛达标{len(trust['trusted_b2'])}/{len(trust['trusted_b3'])}项；"
         f"A10残差{trust['residuals']['t1']['val']['A10']['gap']}/{trust['residuals']['pre']['val']['A10']['gap']}。"
         f"F49实际12/可用11/验证{f49}，数量不足及失败指标保持；A0–4/A5–9验证均0。旧结果数值等价核实后复用，不改策略阈值。")
payload = {'character': 'silent', 'kind': 'fight', 'claim': claim, 'first_run': new[0]['run_id'],
           'prior': 'unknown', 'prior_note': '旧校准已有；新样本的准入及残差由本批核实，不推定策略收益。Roy只授权架构，不提供游戏事实。',
           'status': 'proposed', 'by': 'learner:silent-boss-calibration',
           'evidence': [{'run': r['run_id'], 'floor': r['floor'], 'turn': 1, 'role': 'support',
                         'note': f"新增实际结局{r['outcome']}，A{r['asc']}，尝试{r['attempt']}，局级代码{r['code']}；key={r['key']}；任务{TASK}"} for r in new],
           'where': {'knowledge': ['knowledge/characters/silent/boss-trust.json'], 'proposal': ['paper/materials/silent/boss-sim-calibration.md']},
           'note': '授权新功能定期校准，kind=fight而非bug-infra；仅CLI proposed，shipped由运维核实际发布后登记。未新增出牌/药水/SL/终局/结构不一致经验或代码提案。'}
(HERE / 'ledger-add.json').write_text(json.dumps(payload, ensure_ascii=False, indent=1) + '\n')
print(claim)
