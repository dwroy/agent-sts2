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
prefix = f'''# {HERE.name} 静默 boss 校准周期刷新

生成时间：{stamp}。Roy 已授权新功能，fix-batch 仅为调度通道，本批不是 bug-infra。冻结 {facts['finished_runs']} 个结束 SILENT 局、{facts['attempts']} 次 boss 尝试、{facts['usable']} 个实际结局且取得开场的样本；新增 {facts['new']} 场（{facts['new_outcomes']}）、{facts['new_runs']} 局，均 A10。{facts['censored']} 次预测死亡截断及1个实际结局缺开场排除，来源不删除、不补造实际失败。

固定模型 {trust['source']['simulator_base']}、210输入SHA、200样本和原全量行号种子保持；旧502场和逐回合输入完全相同。新增20场加2个历史对照重放，四个对照结果除耗时外一致。固定107调参keys和UTC切点 {trust['split']['cutoff_ts']} 不变，验证395→415；每起点成功验证 {facts['b2']['n']}/{facts['b3']['n']}，旧模拟失败继续保留。整体Platt及进阶项选择与previous完全一致，不以新增验证标签调参。

逐boss四指标可信 {len(trust['trusted_b2'])}/{len(trust['trusted_b3'])}；名单变化 {changes}。准入标准保持验证≥10、Brier≤整体1.25倍、预测/实际胜率差≤15个百分点、模拟/日志打穿比0.7–1.3；各boss实际场数、缺口和全部失败指标见下表及boss-trust-table.json。低阶A0–4/A5–9独立验证各0场，各差10场，只有调参残差。A10 B2/B3残差 {facts['a10']['t1']['gap']}/{facts['a10']['pre']['gap']}。

F49新增3个实际结局（LKC9YXKZWTKR尝试1 T1–16 won；Q10YYQ5DUPJA尝试6 T1–6 died；9GTFF6DC500L尝试6 T1–8 won），同一整体映射单列范围；其低信度理由和数量缺口仍按四指标判断，不用其他层样本替代F49验证。F48胜利只算该战胜利，未评估F48→F49联合通关率。A10数值实际来源见input-audit-summary.json；缺级仍沿原最近级输入，不拟合boss侧。

1281个开场按原日志offset/length/SHA/角色/进阶核验，2个缺开场排除；全部1283次尝试关联开场前run-config元数据，fight-code-provenance.json保留实际启动/续跑版本。源表中的current/dirty字段不改写成新HEAD，完整历史dirty树和局中切码仍未重建。SL结局事件与末帧HP可处于不同结算时点，沿原提取器保留两值，不据差异添加机制。

当前生产相对固定模型有 {facts['different_current_inputs']} 项输入不同，本表只验证固定实验，不宣称这些改动已重新校准。旧报告、来源和失败日志保留；裸刷新在重放前中断130，首次单独提取启动因沙箱glob扫描竞态未执行，提取重试0；首次未生成候选前的tsc完成、vitest受控中断130。重放保留检查点并两片继续，原种子不变，最多四个后台OS进程且nice19。最终固定自测和实际live发布独立记于本批report.md/publication.json，未以初稿宣称通过、shipped或自然采用。

定期入口 agent/tools/boss-sim/refresh-silent.py；ops/learner_jobs.py:calibration_job 每小时:13/:43及学习完成事件检查升阶或20新won/died boss尝试。新样本只扩验证，本批沿既有--dataset/--results/--provenance入口固定模型；完成档案幂等跳过和新previous不足阈值跳过均不启动子进程、输出字节不变。新指纹目录 {trust['refresh']['artifact']} 不覆盖任何旧目录。

Roy给的是架构、方法和准入标准；样本/结局/残差/可信结论来自静默结束局。复用已有实现 cdf75af64fb5b118a5a808ecb3b05e2a05991c36，不改源码、策略或费用/药水/保血/目标/SL阈值；铁甲统计/Platt/数据不参与。code_proposals=[]、implementation_domains=[]；学习台账只经根CLI记fight/proposed和来源提交，shipped与正式release_id由ops核实际发布后登记。

'''
(ROOT / 'paper/materials/silent/boss-sim-calibration.md').write_text(prefix + base_report)
print(json.dumps(facts, ensure_ascii=False))
