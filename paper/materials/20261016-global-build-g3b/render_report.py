#!/usr/bin/env python3
"""Render every frozen stratum, including unscorable groups; never publish admission data."""
import csv
import gzip
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent


def main():
    result = json.loads((BASE / 'evaluation-r2/admission-audit.json').read_bytes())
    manifest = json.loads((BASE / 'inputs-r2/manifest.json').read_bytes())
    assert result['input_manifest_sha256'] == json.loads((BASE / 'active-input.json').read_bytes())['manifest_sha256']
    groups = result['groups']
    anchor_meta = {}
    with gzip.open(BASE / 'inputs-r2/construction-records.jsonl.gz', 'rt') as stream:
        for row in map(json.loads, stream):
            anchor_meta[row['_source']['off']] = {'run': row['run_id'], 'anchor_floor': row['floor'],
                                                 'horizon': row['construction'].get('horizon')}
    dimensions = ('components', 'actual_casts', 'cast_dispatch_proxies', 'actual_casts_scope', 'survival', 'run_result',
                  'functional', 'aliveAndFunctional', 'terminalWin_prediction')
    observed_rows = 0
    seen_observations = set()
    with gzip.open(BASE / 'learner-results/anchor-core-verification.jsonl.gz', 'rt') as stream, (BASE / 'observations.csv').open('w', newline='') as output:
        writer = csv.DictWriter(output, fieldnames=['source_off', 'run', 'core', 'anchor_floor', 'horizon', 'disposition', *dimensions])
        writer.writeheader()
        for row in map(json.loads, stream):
            key = (row['source_off'], row['core'])
            assert key not in seen_observations
            seen_observations.add(key)
            observations = row.get('observations') or {}
            writer.writerow({'source_off': row['source_off'], 'core': row['core'], **anchor_meta[row['source_off']],
                             'disposition': row['disposition'], **{k: json.dumps(observations.get(k), ensure_ascii=False) for k in dimensions}})
            observed_rows += 1
    columns = ['character', 'core', 'ascension', 'metric', 'horizon', 'model', 'policy', 'template_sha256',
               'forecast_rows', 'numeric_prediction_rows', 'potential_bound_runs', 'n', 'independent_runs', 'positives', 'negatives',
               'brier', 'baseline_brier', 'bias', 'minimum_more_qualified_independent_runs', 'admitted', 'failures',
               'input_dispositions', 'missing_prediction_bindings', 'evaluator_exclusions']
    with (BASE / 'groups.csv').open('w', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=columns)
        writer.writeheader()
        for row in groups:
            writer.writerow({k: ';'.join(row[k]) if k == 'failures' else json.dumps(row[k], ensure_ascii=False) if k in
                             ('input_dispositions', 'missing_prediction_bindings', 'evaluator_exclusions') else row.get(k) for k in columns})
    passing = [r for r in groups if r['admitted']]
    candidates = [r for r in groups if r['metric'] == 'conditionalSignature' and r['model'] and r['policy']
                  and r['template_sha256'] and r['numeric_prediction_rows'] > 0]
    text = ['# G3b 前瞻构筑概率校准报告', '',
            f"原父 `roy-20261016-global-build`，只交本次 G3b 离线校准报告。截止 `{manifest['at']}`；原学习者逐帧结果与排除理由见 `learner-results/`，原 ops 同 owner/thread 的真实接续见 `ops-dispatch/`。", '',
            f"**准入结果：{len(passing)}/{len(candidates)} 个绑定完整且有数值的 conditionalSignature 候选组通过。** 清单共列 {len(groups)} 个分组，含缺绑定的历史占位组与不可晋级/原概率未知的其他指标；这些只登记缺口，不冒充相同已知模型的可评分组。原 evaluator 实际评分 {result['scored_groups']} 组；不合并进阶、指标、截止层、模型、政策或模板。",
            '通过原统计入场线的精确组为 Silent A10 / P / F17、P / F33、D / F33，均仅为 conditionalSignature。完整绑定为 model=`observed-opportunity-window4-v1`、policy=`completion-choice-v1`、template_sha256=`76e91c950bfd87d820093bdd7dd4b3f11db15256ea2b6e0bb41b9f1ec89f998c`。其他9个绑定完整候选组不通过，另外84个清单组没有合格数值标签或指标不可晋级。', '',
            '**发布边界待决定：全部184条合格标签只覆盖Boss前一层且无后续政策选择的窗口；不能据此称更早楼层的成型概率已校准。** 现有 admission 只按核心/进阶/指标/截止层/模型/政策/模板放行，没有锚点层数或剩余选择窗口字段。原统计闸不改，3个通过组及此边界一并交原ops；是否仍按现有整组入口转advisory，或保留shadow等待可覆盖前瞻窗口的材料，由Roy/Claude决定。watcher不创建通过校准文件或修改线上配置，本文不是发布回执。', '',
            f"本轮包含 {len(manifest['selected_runs'])} 局、{manifest['counts']['construction_records']} 条原 construction 记录、{manifest['counts']['forecast_rows']} 条选项×核心×指标展开预测。展开行不是独立局。四模板原状态均为 candidate，组件签名不是核心资格。", '',
            '原入场线：每精确组至少10个合格独立局；实际正负结果均有；Brier严格小于组内常数基线 prevalence×(1−prevalence)；|bias|≤0.1。仅 conditionalSignature 可转 advisory。原 evaluator 按记录计算 Brier/偏差，另按 run 去重计算独立局，保留同局相关性和条件窗口选择偏差限制，不称因果收益。', '',
            '## 原统计线与实际支持窗口', '',
            '|通过组|独立局/记录|正/负|Brier|常数基线|偏差|',
            '|---|---:|---:|---:|---:|---:|']
    for row in passing:
        text.append(f"|{row['core']} / A{row['ascension']} / F{row['horizon']}|{row['independent_runs']}/{row['n']}|{row['positives']}/{row['negatives']}|{row['brier']:.6f}|{row['baseline_brier']:.6f}|{row['bias']:.6f}|")
    text += ['', '匹配标签的锚点只在F16→F17（每核心24条/23局）、F32→F33（16条/14局）、F47→F48（6条/5局）。原学习者逐条policy.choices_checked均为0，全部预测为0或1（169条0、15条1），所以这里的Brier0不能证明存在剩余供给或真实选择时的前瞻预测能力。时间先后门槛确已满足，但尚无合格的更早窗口标签。此为实际覆盖限制，不改写原入场线、原标签或分数。原数据见 `evaluation-r2/supported-window-metadata.json`。', '',
            '现有 `agent/src/construction/admission.ts` 的组匹配没有锚点floor/剩余机会条件，`adapter.ts`会把通过组用于相同截止层的其他锚点；因此仅附报告文字不能实现窗口隔离。本轮不擅自修改准入接口或新增阈值，也不把该未验证外推称为已校准。`ops-publication-request.json`只交3个统计通过组及待决边界，不含其他失败组；线上仍以ops实际回执为准。', '',
            '## 四类实际证据与边界', '',
            '|维度|解释与使用边界|', '|---|---|',
            '|组件持有|仅原模板签名终点；达点且条件完整才是条件签名的二元标签。死亡/变线/变政策/缺证不填 false。|',
            '|实际施放|单列具名牌真实施放及其原帧；只是兑现代理，不从持牌预支施放。|',
            '|存活|单列截止存活/死亡与 SL 分支；存活不等于核心可运转，死亡也不当条件集齐失败。|',
            '|整局结果|单列真正终局；过幕 Boss 不等于整局胜，不反向替换任何成型标签。|', '',
            '各类实际结果只引用原学习者 `report.md`、`coverage.json`、`outcomes.jsonl` 及其原件。未核实项保持 unknown。aliveAndFunctional/terminalWin 没有原生数值时不以实际持有、施放或存活补出预测；核心资格、第三幕/最终连战/生产模型可信度不因此通过。', '',
            f'原学习者四类观察已分别导出为 [observations.csv](observations.csv)，共 {observed_rows} 条原锚点×核心记录。实际施放与 `cast_dispatch_proxies` 另列，按原 `actual_casts_scope` 解释，不将派发代理升格为真实施放；空对象不是“实际施放0次”的证明。`run_result` 保留原SL分支核实范围，原物理整局记录另见 `inputs-r2/runs.json`，不能倒填成每个预测分支的通关标签。r2新增缺绑定前缀只有元数据排除，不补造其四类观察。', '',
            '## 逐组结果', '',
            '绑定 `完整` 表示原预测含原生模型、政策与模板摘要，仍不等于实际路线/政策/SL 合格；`缺失` 的历史记录不倒填。Brier/基线/偏差的“—”表示没有可评分标签，绝非0。完整模型/政策/模板 SHA 与各项失败代码保存在 [groups.csv](groups.csv) 和 `evaluation-r2/admission-audit.json`。', '',
            '|核心|进阶|指标|截止层|绑定|记录 n|独立局|正/负|Brier|常数基线|偏差|最少还缺合格独立局|通过|不合格原因|',
            '|---|---:|---|---:|---|---:|---:|---|---:|---:|---:|---:|---|---|']
    def num(x):
        return '—' if x is None else f'{x:.6f}'
    failure_names = {'metric_not_eligible_for_advisory': '指标不可晋级', 'all_logged_probabilities_unknown': '原概率未知',
                     'missing_prospective_binding': '缺绑定', 'fewer_than_10_qualified_independent_runs': '独立局不足10',
                     'missing_positive_or_negative_outcomes': '正负不足', 'no_qualified_labels_to_score': '无合格标签',
                     'brier_not_better_than_constant_baseline': 'Brier不优于基线', 'absolute_bias_exceeds_0.1': '偏差超限'}
    for row in groups:
        binding = '完整' if row['model'] and row['policy'] and row['template_sha256'] else '缺失'
        why = '、'.join(failure_names.get(code, code) for code in row['failures']) or '—'
        text.append(f"|{row['core']}|{row['ascension']}|{row['metric']}|{row['horizon']}|{binding}|{row['n']}|{row['independent_runs']}|{row['positives']}/{row['negatives']}|{num(row['brier'])}|{num(row['baseline_brier'])}|{num(row['bias'])}|{row['minimum_more_qualified_independent_runs']}|{'是' if row['admitted'] else '否'}|{why}|")
    text += ['', '缺口列仅为 max(0,10−合格独立局数) 的最低数量差，不能保证正负结果或性能闸达标。缺口可由既有窗口补证或后续真正前瞻样本补齐，不等于必须另开该数量的对局；本轮不启动补样本。若是绑定缺失/原预测null，补旧局结局不能修复。尚未核验的窗口不是负样本，未选候选不配实际结局。逐组路线/政策/SL/其他排除数量及原预测缺绑定项目另列于CSV，不将未核验冒作实际偏离。', '',
             '## 匹配、排除与复现', '',
             f"原学习者标签绑定的输入 SHA：`{result['learner_label_manifest_sha256']}`。当前完整预测输入 SHA：`{result['input_manifest_sha256']}`；matched-input SHA：`{result['matched_input_sha256']}`。", '',
             '只给实际执行选项配结果。原 evaluator 的去重 identity 没有 option 维度，未选候选保持排除；不将 current 基准自动视作实选，不重命名决策制造样本。原行 offset/length/SHA、时间先后、路线/政策/SL/终点引用及同模板/进阶绑定均保留。', '',
             f"展开行分类（不是独立局）：`{json.dumps(result['dispositions'], ensure_ascii=False)}`。详细行级分类见 `evaluation-r2/match-ledger.jsonl.gz`；原 evaluator 的实际拒绝理由见 `evaluation-r2/evaluator-report.json`。", '',
             '上述是watcher输入匹配的优先排除分类，不是对每个null指标重新作游戏判断。非conditionalSignature的原概率均null；未在outcomes.jsonl列出的行先记缺绑定、其次原概率未知。原学习者对这些行的实选/未选等独立覆盖记录另保留在 `learner-results/expanded-row-coverage.jsonl.gz`，不据本分类将其实际路线/选择状态改写。评分输入只给184个真实匹配结果，其余outcome为空；该展示口径不改变评分。', '',
             '复现命令见 `evaluation-r2/command.json`；先将 `evaluation-r2/matched-input.jsonl.gz` 解压到该命令的输入路径并核对原SHA，再用新输出路径评分，保原报告。使用未改动的原 `eval/construction.py`，未重跑预测/机会模拟，不调用模型API或开局。偏差为平均预测−实际；正值是高估。表格显示6位小数，门槛使用原精度，CSV保留数值。', '',
             '## 输入范围修正与历史', '',
             '初版由watcher把UTC无时区TIMESTAMP列与TIMESTAMPTZ常量比较，在Asia/Shanghai会话下造成8小时筛选偏移；不是已证实的索引缺失或生产bug。类型与两个实际起点见scope-query-diagnosis.json。旧 inputs/、旧首审失败及原登记完整保留；inputs-r2/从原JSONL最早construction-v1行开始，沿用同一13:43:17截点和源字节边界。原145264展开行逐值不变，新增22688行全缺前瞻绑定，不能增加合格样本。原r1学习者输入/运行未热改，其帧结果精确复用；r2前缀只有缺绑定元数据补充，不冒学习者重新核过这批结局。', '',
             'run-plans原流身份键为run，首版投影按run_id误为空；旧空投影保留，另补同截点383原计划及原行SHA（support-run-plans*），不称原来无计划。实际路线仍由原学习者核原帧。', '',
             '## 下一步与本轮停止', '',
             '本次报告交付后停止。建议保留shadow，先由Roy/Claude决定是否接受无剩余选择窗口向更早楼层外推；如要求窗口隔离或补充前瞻样本，应另行明确派活，本轮不实现或采集。3个统计通过组已整理给原ops，其余组不转advisory。G2单测试叶修复已由原131302精确a55384宿主aggregate0闭环，既有9e105失败保持；G2自然/on、G1a自然、G3a/G3c/G5与原量化/0332/学习入库等宽父均不借本报告关闭或启动。', '']
    (BASE / 'report.md').write_text('\n'.join(text))
    print(json.dumps({'groups': len(groups), 'passing': len(passing), 'report': str(BASE / 'report.md')}))


if __name__ == '__main__':
    main()
