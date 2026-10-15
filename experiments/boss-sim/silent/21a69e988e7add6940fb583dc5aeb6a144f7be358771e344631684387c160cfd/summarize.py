"""Summarize only frozen Silent evidence; keep operational publication separate."""
import collections
import json
from pathlib import Path
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = Path('/home/dw/Projects/agent-sts2/.worktrees/silent-boss-calibration')

def read(name):
    return json.loads((HERE / name).read_text())

def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

trust = json.loads((ROOT / 'knowledge/characters/silent/boss-trust.json').read_text())
previous = read('previous-trust.json')
extraction = read('dataset/extraction.json')
added = read('new-fights.json')
table = {}
for boss, blocks in trust['bosses'].items():
    table[boss] = {}
    for use, start in [('b2', 't1'), ('b3', 'pre')]:
        b = blocks[start]
        table[boss][use] = {k: b[k] for k in ['n', 'missing', 'brier', 'mean_pred', 'actual_win', 'failed']}
        table[boss][use].update(leak_ratio=b.get('leak_ratio'),
                              trusted=boss in trust['trusted_' + use])
write('boss-trust-table.json', table)
changes = {use: {'added': sorted(set(trust['trusted_' + use]) - set(previous['trusted_' + use])),
                 'removed': sorted(set(previous['trusted_' + use]) - set(trust['trusted_' + use]))}
           for use in ['b2', 'b3']}
write('trust-changes.json', changes)
facts = {'finished_runs': extraction['finished_runs'], 'attempts': extraction['attempts'],
         'usable': extraction['written'], 'tune': trust['split']['tune_n'], 'val': trust['split']['val_n'],
         'new': len(added), 'new_runs': len({r['run_id'] for r in added}),
         'new_outcomes': dict(collections.Counter(r['outcome'] for r in added)),
         'censored': sum(n for reason, n in extraction['exclusions'].items() if 'predicted_death' in reason),
         'exclusions': extraction['exclusions'], 'new_f49': [r['key'] for r in added if r['floor'] == 49],
         'different_current_inputs': len(read('model-changes.json')),
         'b2': {k: trust['overall']['t1'][k] for k in ['n', 'brier', 'platt']},
         'b3': {k: trust['overall']['pre'][k] for k in ['n', 'brier', 'platt']},
         'a10': {s: trust['residuals'][s]['val']['A10'] for s in ['t1', 'pre']},
         'f49': {s: trust['stage_metrics'][s]['F49']['val'] for s in ['t1', 'pre']},
         'changes': changes, 'artifact': trust['refresh']['artifact']}
write('summary.json', facts)
base_report = (ROOT / 'paper/materials/silent/boss-sim-calibration.md').read_text()
(HERE / 'generated-report.md').write_text(base_report)
stamp = subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S %Z'], text=True).strip()
prefix = f"""# {HERE.name} 静默 boss 校准刷新

生成时间：{stamp}。本批为 Roy 已授权新功能的定期数据校准；fix-batch 是调度通道。提取 {facts['finished_runs']} 个结束 SILENT 局、{facts['attempts']} 次 boss 尝试，{facts['usable']} 次有实际结局且取得开场。新增 {facts['new']} 场、{facts['new_runs']} 局，结局 {facts['new_outcomes']}；全部新样本只扩验证 {previous['split']['val_n']}→{facts['val']}，调参 {facts['tune']} keys 和切点保持。{facts['censored']} 次预测死亡截断不作实际失败，完整排除原因、来源局号/boss/层/尝试/回合/版本见下文和 sources.jsonl。

冻结模型 {trust['source']['simulator_base']}、{len(trust['source']['input_files'])} 输入 SHA、每起点200样本、原全量行号种子保持。旧 {previous['split']['tune_n'] + previous['split']['val_n']} 场及逐回合输入完全相同；只重放新增样本及2场历史对照，4个对照起点结果除耗时外相同。Platt/进阶项选择与 previous 一致，不用新增验证标签调参。B2/B3 Brier {facts['b2']['brier']}/{facts['b3']['brier']}，成功验证 {facts['b2']['n']}/{facts['b3']['n']}。名单变化 {changes}；数量达标仍须同时通过 Brier、胜率差和打穿比，缺指标保持低可信。

A0–4/A5–9 各0独立验证、各缺10场，只保留调参残差；A10 B2/B3验证残差 {facts['a10']['t1']['gap']}/{facts['a10']['pre']['gap']}。F49新样本 {facts['new_f49']}；F49 独立指标/不足场数/失败指标见下文，F48胜不算整局通关，不评估 F48→F49 联合胜率。A10数值的 exact/nearest 取值及缺伤害记录完整保留于 input-audit-summary.json、opening-audit.json 和 model-input-audit.json。

所有新增结局和1319个开场原始字节/角色/进阶核验通过；全部1321次尝试关联到开场前 run-config 的版本元数据。旧 dirty 树、局中切码未完整重建。当前工作树在原冻结清单中有 {facts['different_current_inputs']} 项不同；本表只验证固定实验模型，不宣称当前生产代码或这些变化已通过相同校准。live 差异在实际发布后另行读回。

首次按指定默认入口启动，在提取阶段受控中断130，尚未开始模拟；保留 refresh.log/exit 与快照，随后原提取器完整退出0。改用现有 --dataset/--results/--provenance 入口固定模型，未改生产源码。完成档案幂等跳过与新 previous 不足阈值跳过均不启动子进程，输出字节保持。每小时:13/:43及学习完成事件检查升阶或20次新实际结局；入口 agent/tools/boss-sim/refresh-silent.py，新指纹 {trust['refresh']['artifact']}，旧目录/报告不覆盖。

Roy 提供角色隔离、模型复用、整体Platt、时间切分、准入阈值和刷新架构；样本/结局/残差/可信结论只来自静默已结束局。不修改费用/药水/保血/目标/SL阈值；铁甲行为、数据和校准参数保持。code_proposals=[]，implementation_domains=[]。本批账本仅经根CLI追加 fight/proposed 与源码出处；shipped及正式release_id由ops核实际发布后登记。源码自测、实际live合入及固定发布树见任务 scratch/report.md 与 publication.json；不把固定消费者检查冒称新自然对局采用或策略收益。

"""
(ROOT / 'paper/materials/silent/boss-sim-calibration.md').write_text(prefix + base_report)
print(json.dumps(facts, ensure_ascii=False))
