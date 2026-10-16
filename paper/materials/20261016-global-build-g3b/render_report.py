#!/usr/bin/env python3
"""Render every frozen stratum, including unscorable groups; never publish admission data."""
import csv
import json
from pathlib import Path

BASE = Path(__file__).resolve().parent


def main():
    result = json.loads((BASE / 'evaluation-r2/admission-audit.json').read_bytes())
    manifest = json.loads((BASE / 'inputs-r2/manifest.json').read_bytes())
    assert result['input_manifest_sha256'] == json.loads((BASE / 'active-input.json').read_bytes())['manifest_sha256']
    groups = result['groups']
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
    text = ['# G3b 前瞻构筑概率校准报告', '',
            f"原父 `roy-20261016-global-build`，只交本次 G3b 离线校准报告。截止 `{manifest['at']}`；原学习者逐帧结果与排除理由见 `learner-results/`，原 ops 同 owner/thread 的真实接续见 `ops-dispatch/`。", '',
            f"**准入结果：{len(passing)}/{len(groups)} 个精确组通过。** 原 evaluator 实际评分 {result['scored_groups']} 组；分组不合并进阶、指标、截止层、模型、政策或模板。",
            '没有通过组时不创建通过文件，不发布 `construction-calibration.json`，不修改线上配置。通过组也只交原 ops 核原件和发布，本文不是发布回执。', '',
            f"本轮包含 {len(manifest['selected_runs'])} 局、{manifest['counts']['construction_records']} 条原 construction 记录、{manifest['counts']['forecast_rows']} 条选项×核心×指标展开预测。展开行不是独立局。四模板原状态均为 candidate，组件签名不是核心资格。", '',
            '原入场线：每精确组至少10个合格独立局；实际正负结果均有；Brier严格小于组内常数基线 prevalence×(1−prevalence)；|bias|≤0.1。仅 conditionalSignature 可转 advisory。原 evaluator 按记录计算 Brier/偏差，另按 run 去重计算独立局，保留同局相关性和条件窗口选择偏差限制，不称因果收益。', '',
            '## 四类实际证据与边界', '',
            '|维度|解释与使用边界|', '|---|---|',
            '|组件持有|仅原模板签名终点；达点且条件完整才是条件签名的二元标签。死亡/变线/变政策/缺证不填 false。|',
            '|实际施放|单列具名牌真实施放及其原帧；只是兑现代理，不从持牌预支施放。|',
            '|存活|单列截止存活/死亡与 SL 分支；存活不等于核心可运转，死亡也不当条件集齐失败。|',
            '|整局结果|单列真正终局；过幕 Boss 不等于整局胜，不反向替换任何成型标签。|', '',
            '各类实际结果只引用原学习者 `report.md`、`coverage.json`、`outcomes.jsonl` 及其原件。未核实项保持 unknown。aliveAndFunctional/terminalWin 没有原生数值时不以实际持有、施放或存活补出预测；核心资格、第三幕/最终连战/生产模型可信度不因此通过。', '',
            '## 逐组结果', '',
            '绑定 `完整` 表示原预测含原生模型、政策与模板摘要，仍不等于实际路线/政策/SL 合格；`缺失` 的历史记录不倒填。Brier/基线/偏差的“—”表示没有可评分标签，绝非0。完整模型/政策/模板 SHA 与各项失败代码保存在 [groups.csv](groups.csv) 和 `evaluation-r2/admission-audit.json`。', '',
            '|核心|进阶|指标|截止层|绑定|记录 n|独立局|正/负|Brier|常数基线|偏差|最少还缺合格独立局|通过|',
            '|---|---:|---|---:|---|---:|---:|---|---:|---:|---:|---:|---|']
    def num(x):
        return '—' if x is None else f'{x:.6f}'
    for row in groups:
        binding = '完整' if row['model'] and row['policy'] and row['template_sha256'] else '缺失'
        text.append(f"|{row['core']}|{row['ascension']}|{row['metric']}|{row['horizon']}|{binding}|{row['n']}|{row['independent_runs']}|{row['positives']}/{row['negatives']}|{num(row['brier'])}|{num(row['baseline_brier'])}|{num(row['bias'])}|{row['minimum_more_qualified_independent_runs']}|{'是' if row['admitted'] else '否'}|")
    text += ['', '缺口列仅为 max(0,10−合格独立局数) 的最低数量差，不能保证正负结果或性能闸达标。缺口可由既有窗口补证或后续真正前瞻样本补齐，不等于必须另开该数量的对局；本轮不启动补样本。若是绑定缺失/原预测null，补旧局结局不能修复。尚未核验的窗口不是负样本，未选候选不配实际结局。逐组路线/政策/SL/其他排除数量及原预测缺绑定项目另列于CSV，不将未核验冒作实际偏离。', '',
             '## 匹配、排除与复现', '',
             f"原学习者标签绑定的输入 SHA：`{result['learner_label_manifest_sha256']}`。当前完整预测输入 SHA：`{result['input_manifest_sha256']}`；matched-input SHA：`{result['matched_input_sha256']}`。", '',
             '只给实际执行选项配结果。原 evaluator 的去重 identity 没有 option 维度，未选候选保持排除；不将 current 基准自动视作实选，不重命名决策制造样本。原行 offset/length/SHA、时间先后、路线/政策/SL/终点引用及同模板/进阶绑定均保留。', '',
             f"展开行分类（不是独立局）：`{json.dumps(result['dispositions'], ensure_ascii=False)}`。详细行级分类见 `evaluation-r2/match-ledger.jsonl.gz`；原 evaluator 的实际拒绝理由见 `evaluation-r2/evaluator-report.json`。", '',
             '复现命令见 `evaluation-r2/command.json`；使用未改动的原 `eval/construction.py`，未重跑预测/机会模拟，不调用模型API或开局。', '',
             '## 输入范围修正与历史', '',
             '初版 no-sync 索引起点遗漏原JSONL前缀，旧 inputs/、旧首审失败及原登记完整保留；inputs-r2/从原JSONL最早construction-v1行开始，沿用同一13:43:17截点和源字节边界。原145264展开行逐值不变，新增22688行全缺前瞻绑定，不能增加合格样本。原r1学习者输入/运行未热改，其帧结果精确复用；r2前缀只有缺绑定元数据补充，不冒学习者重新核过这批结局。', '',
             'run-plans原流身份键为run，首版投影按run_id误为空；旧空投影保留，另补同截点383原计划及原行SHA（support-run-plans*），不称原来无计划。实际路线仍由原学习者核原帧。', '',
             '## 下一步与本轮停止', '',
             '按逐组缺口继续保留原 shadow。后续补证或采集方式由 Claude/Roy 另行指派，当前不改模型、政策、模板或准入线；不自行开启G3a/G3c/G5、G2自然门槛或额外实验。若存在通过组，只沿原 ops 逐组核原件并发布；没有通过组不创建通过文件。G2宿主/单测试叶修复仍由原 ops 原131302链闭环。原量化/0332/学习入库等宽父不因本报告关闭。', '']
    (BASE / 'report.md').write_text('\n'.join(text))
    print(json.dumps({'groups': len(groups), 'passing': len(passing), 'report': str(BASE / 'report.md')}))


if __name__ == '__main__':
    main()
