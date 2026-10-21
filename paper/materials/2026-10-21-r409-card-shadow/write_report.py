"""Render the frozen shadow evaluation, preserving denominators and limitations."""
import gzip
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent


def pct(a, b):
    return f'{a}/{b}（{a/b:.1%}）' if b else f'{a}/{b}'


def timing(v):
    return '无样本' if not v else f"{v['p50']:.1f} / {v['p90']:.1f} / {v['max']:.1f} ms；超过 5 s：{v['over_5000']}/{v['n']}"


def main():
    report = json.loads((HERE/'analysis-summary.json').read_text())
    rows = json.loads((HERE/'analysis-results.json').read_text())
    questions = json.load(gzip.open(HERE/'frozen/questions.json.gz', 'rt'))
    qmap = {q['key']: q for q in questions}
    s, e = report['all'], report['production_eligible']
    cutoff = json.loads((HERE/'frozen/extraction.json').read_text())['cutoff']
    cohort = json.loads((HERE/'frozen/cohort.json').read_text())
    lines = [
        '# R409 大脑拿牌局的 Jev 影子评估', '',
        '本轮不支持把“Nova 正常返回”当作拿牌质量通过。所有真实帧均完成 A/B 回放，真实 Nova 请求未超过 60 次；以下数值用于 Roy 决策，不构成实际拿牌收益或线上自然缓存命中率的证明。CARD 保持 brain，未执行任何游戏动作。', '',
        '## 范围与复现', '',
        '- 原指派：Claude 2026-10-21 07:5x，原 owner v6-w4w6 / codex1 / native thread 01a15382-68eb-7093-b677-040c9b45767f。',
        '- R409 实际 live 基线 `cf4aff4ceebd958ad70b1512cc886c45bd8092aa`，行为提交 `6242b3a7381944436ef6d62f1a3901c1036369e7`。运行其独立代码镜像，未改生产源码。',
        f'- 日志冻结截止 `{cutoff}`（北京时间 08:00:18）；CESK 仅含截止前已发生的奖励题。85 条 reward/card 中，严格战后三选一 83 题全部回放；7XS 的 F22、F43 不符合三选一/战斗来源门，保留排除记录。',
        '- 六局合计超过 60 题，因此真实请求按每局题量比例、最大余数分配，再等距抽取题序（含首尾）；抽样不读 A/B、选择结果或胜负。全部 83 题有离线指标，60 题有真实 Jev 回答。',
        '- 真实 Nova：`typesafe/jev-1.14`，项目 JevClient / Decisions 协议，choice 候选在 criteria；独立请求预算 5000 ms、零重试。没有 ModClient、动作派发或 live 日志写入。',
        '- 数据用当前 live 知识的只读冻结快照，而非倒填历史时点知识。逐文件按实际读到的字节冻结，未持发布锁，不能证明跨文件原子快照；冻结后独立校验其 SHA。源码、原始帧、实际大脑动作、完整题面/响应、A/B 审计均保留。',
        '- 回放前按真实历史状态重建 routePlan/lastMap 和战后来源；六局没有可恢复的合法 V6 方向计划，题面 direction_weights 保持生产缺省 `{}`，未编造方向权重。',
        '- B 使用 R409 的 `startCardBackground`：在每道题原有大脑等待窗口内最多给 5000 ms，再由纯缓存 getter 读取；A 使用 `evaluateCard`，随后原 `buildV6CardPick` 和 `constructionQuestion`。这是受控的奖励大脑等待回放，并非重演原局全部后台调度；若切 CARD=jev，该奖励脑等待本身会消失，不能据此声称相同线上 B 命中率。',
        '- 安全门已判 unknown 的题也做了只请求影子观察；实际生产会交回大脑，不会采用该影子 Jev 选择。所有下列可排序分母均排除缺失指标的题，不把未知计零。', '',
        '| 局号 | 全部合格题 | 真实 Nova | 生产安全门通过 | A 可完整诊断/已答 | Jev 与脑同选 |',
        '|---|---:|---:|---:|---:|---:|']
    for run in cohort['per_run']:
        v = report['per_run'][run]
        lines.append(f"| {run} | {v['situations']} | {v['nova_answered']}/{v['nova_selected']} | {v['production_eligible_all']} | {v['rankable_answered']} | {v['same_brain_choice']}/{v['nova_answered']} |")
    lines += ['', '## 五指标诊断规则', '',
        '只比较题面已经给出的同种子 option−skip 配对差；本幕 Boss 权重 1/2，本幕精英池均分另外 1/2。这是诊断汇总，不是新增生产公式，不是精英出现概率，不乘凑齐概率 P。另列 Boss 权重 0、1/4、1/2、3/4、1 的敏感性。', '',
        '确定一个可复核“最优”集合：先最小化死亡率差，再最小化掉血差；若所有选项、目标的样本都输，再依次最小化输时剩敌血、最大化每回合伤害、最大化存活回合；若全赢，则最大化每回合伤害、最小化回合。混合胜负时，输时剩血是条件量、回合优劣方向不统一，不强行并入全局顺序。没有任一所需指标或 n<2 则记不可排序。报告同时给 Pareto 相容率，避免把词典序偏好当作唯一游戏价值。', '',
        '“均值严格逆指标”指另一个选项在全部适用指标均不差、至少一项严格更好；死亡/掉血/输时剩血越小越好，DPT 越大越好，回合按上述全输/全赢条件判断。另列仅死亡/掉血/DPT 三指标的支配情况，不藏掉条件指标冲突。', '',
        '上述支配比较使用明确权重汇总。另做不加权的更严格检查：每一个 Boss/精英目标的适用字段都不得更差、至少一处更好，才记“逐目标支配”，避免把目标之间的取舍也称为没有任何依据的逆选。', '',
        '不把两个候选各自对 skip 的 SE 拼成已知的候选间配对 SE。只做保守敏感性筛查：汇总 SE 上界为加权 SE 之和；候选间上界再相加，全部指标的差加 2 倍上界仍不劣、至少一项严格优，才列“2SE 仍支配”。该规则不是已校准置信区间；很多目标仅 n=2，零例死亡/全死的 SE=0 也不等于真实风险确定。', '',
        'B 作为独立长期证据，不与 A 或 P 相乘，也不构造 A/B 总分。A 的支配或词典序不一致不等同于整体错误；逐例保留候选推进的组合和 B，供判断是否存在长期取舍。', '',
        '## 选择结果', '',
        f"- Nova 已答 {s['nova_answered']}/{s['nova_selected']}；错误 {len(s['nova_errors'])}。生产安全门通过 {pct(s['production_eligible_all'], s['situations'])}，已请求子集中通过 {s['production_eligible_selected']}/{s['nova_answered']}。",
        f"- A 可完整诊断 {s['rankable_answered']}/{s['nova_answered']}；Jev 命中上述最优 {pct(s['jev_best'], s['rankable_answered'])}，同一子集大脑 {pct(s['brain_best_same_answered_cohort'], s['rankable_answered'])}。Jev Pareto 相容 {pct(s['jev_pareto_compatible'], s['rankable_answered'])}。",
        f"- 仅生产安全门通过的已答题：Jev 命中诊断最优 {pct(e['jev_best'], e['rankable_answered'])}，大脑 {pct(e['brain_best_same_answered_cohort'], e['rankable_answered'])}；适用字段汇总均值支配 {len(e['jev_mean_dominated'])}/{e['nova_answered']} 题，2SE 仍支配 {len(e['jev_two_se_dominated'])} 题。双方同选 {pct(e['same_brain_choice'], e['nova_answered'])}；Jev/脑跳过分别 {e['jev_skip']}/{e['nova_answered']}、{e['brain_skip_paired']}/{e['nova_answered']}。",
        f"- 五指标中适用字段的汇总均值支配 {len(s['jev_mean_dominated'])}/{s['nova_answered']} 题，其中全部选项可完整诊断的 {sum(bool(r['primary'].get('jev_mean_dominated_by')) for r in rows if r['jev_choice'] and r['primary']['best'] is not None)}/{s['rankable_answered']} 题；保守 2SE 筛查后 {len(s['jev_two_se_dominated'])} 题；仅三主指标支配 {len(s['jev_three_metric_dominated'])} 题。另有选项缺值不妨碍已知两个候选之间出现支配，但不把该题放入全题最优分母。均值反例不能因 2SE 筛查不显著而抹去。",
        f"- 不依赖 Boss/精英权重的逐目标均值支配：{len(s['jev_targetwise_mean_dominated'])} 题，原件键 `{s['jev_targetwise_mean_dominated']}`。",
        f"- Jev 与大脑实际同选 {pct(s['same_brain_choice'], s['nova_answered'])}。不一致题按 A 的关系：`{json.dumps(s['disagreement_relations'], ensure_ascii=False)}`。取舍或未知没有强判谁更优。",
        f"- 同一真实请求子集：Jev 跳过 {pct(s['jev_skip'], s['nova_answered'])}，大脑跳过 {pct(s['brain_skip_paired'], s['nova_answered'])}；对应拿牌分别 {s['nova_answered']-s['jev_skip']}、{s['nova_answered']-s['brain_skip_paired']}。全部 83 题大脑跳过 {s['brain_skip_all']}。",
        f"- Jev 跳过时存在五指标均值支配 skip 的牌：{len(s['jev_skips_with_mean_better_card'])} 题；2SE 仍支配 {len(s['jev_skips_with_two_se_better_card'])} 题。",
        f"- 全部选项本幕 Boss 样本死亡率都为 1：{s['A_current_boss_all_dead']}/{s['situations']}；可诊断已答题中全部 Boss/精英样本都输 {s['all_loss_rankable']}/{s['rankable_answered']}。这保留了先前精英偏差诊断的限制，不能拿这些均值证明真实胜负或选牌收益。", '',
        '| Boss 诊断权重（精英均分余量） | Jev 最优一致 | 大脑最优一致（相同题） |', '|---|---:|---:|']
    for weight in ('0', '0.25', '0.5', '0.75', '1'):
        subset = [r for r in rows if r['jev_choice'] and r['sensitivity'][weight] is not None]
        lines.append(f"| {weight} | {sum(r['jev_choice'] in r['sensitivity'][weight] for r in subset)}/{len(subset)} | {sum(r['brain_choice'] in r['sensitivity'][weight] for r in subset)}/{len(subset)} |")
    lines += ['',
        '## B 与耗时', '',
        f"- 缓存有 n≥2 且掉血结果的题 {pct(s['B_numeric_questions'], s['situations'])}；实际 criteria 出现数值 B 的题 {pct(s['B_shown_numeric_questions'], s['situations'])}。前者 {s['B_numeric_rows']} 行 / {s['B_expected_rows']} 个理论组合×未来目标槽位，未计算和缺模型均不补零；后者只展示本选项推进的组合，故可低于缓存有值率。",
        f"- 生产安全门通过题内：B 缓存有值 {e['B_numeric_questions']}/{e['situations']}；criteria 有值 {e['B_shown_numeric_questions']}/{e['situations']}。", '',
        '| 分段（p50 / p90 / 最大） | 实测 |', '|---|---|']
    for key, label in [('A_ms', 'A 提供方（含输入准备）'), ('packing_ms', '题面构造'), ('foreground_ms', '前台 A+题面'), ('background_ms', 'B 后台窗口，独立计时'), ('jev_ms', '真实 Nova 请求')]:
        lines.append(f"| {label} | {timing(s['timing_ms'][key])} |")
    lines += [f"| 安全门通过题的前台 A+题面 | {timing(e['timing_ms']['foreground_ms'])} |", '',
        f"实际 wire 最大 {s['wire_max_bytes']} B，限额 24,000 B；A/B 所有已展示指标按生产有效数字格式与原审计严格核对，差异 {s['display_mismatches']}。无放宽精度或新增样本预算。前台时间不包含历史日志重建，也不包含单列的 B 后台窗口；包含生产输入准备、A 计算和题面压缩，不能只用 A 内部模拟时间声称满足 5 秒。",
        '最慢题为 MGB1D1T0Y8G0 F12：A 5894.9 ms、题面构造 18736.2 ms，前台合计 24631.0 ms；CLCR F5 题面构造 2601.9 ms。未采性能栈/同期进程 CPU，不把墙钟异常确定归因为算法或机器负载；原段计时与完整输入保留。本任务只读，没有借此改生产实现或追加请求。',
        '', 'unknown 原因是条目标签计数，非独立对局、非互斥归因：', '',
        '```json', json.dumps({'A': s['A_unknown_reasons'], 'B': s['B_unknown_reasons']}, ensure_ascii=False, indent=2), '```', '',
        '## 均值反例与分歧原件', '']
    for r in rows:
        d = r['primary']
        if not d.get('jev_mean_dominated_by'):
            continue
        lines += [f"### {r['key']}", '',
            f"大脑 {r['brain_choice']}；Jev {r['jev_choice']}，confidence={r['confidence']}；五指标均值支配方 {d['jev_mean_dominated_by']}；2SE 仍支配 {d['jev_two_se_dominated_by']}。", '',
            '| 选项 | 加权配对差：死亡 / 掉血 / DPT / 回合 / 输时剩血 |', '|---|---|']
        for k in dict.fromkeys([r['jev_choice'], r['brain_choice'], *d['jev_mean_dominated_by']]):
            m = d['options'][k]['metrics']
            values = ' / '.join('unknown' if m[x] is None else f"{m[x]['mean']:.6g}" for x in ('death_rate', 'hp_loss', 'damage_per_turn', 'turns', 'losing_enemy_hp_fraction'))
            action = qmap[r['key']]['frame']['state']['reward']['card_options'][int(k[4:])] if k.startswith('card') else 'skip'
            lines.append(f"| {k} `{json.dumps(action, ensure_ascii=False)}` | {values} |")
        lines += ['', f"完整结果/criteria：`results/{r['key']}.json.gz`。模型只返回 choice/probabilities/confidence，未提供文字理由，不代编理由。", '']
        original = json.load(gzip.open(HERE/'results'/f"{r['key']}.json.gz", 'rt'))
        lines += ['所选项和支配方在实际 criteria 中的独立 B 信息（只列已展示组合，不代替缺失值）：', '', '```json',
            json.dumps({k: json.loads(original['prompt']['questions']['pick']['criteria'][k])['B_progress'] for k in dict.fromkeys([r['jev_choice'], *d['jev_mean_dominated_by']])}, ensure_ascii=False, indent=2), '```', '']
    lines += ['## 判断与限制', '',
        '本轮证实 R409 criteria 与 B 缓存消费能够运行，真实 Nova 请求和字节预算可接受；仍有均值支配反例、低样本/模型偏差、缺模型题及准备超 5 秒问题。不建议仅凭本次一致率自动切回 Jev；保持 CARD=brain，由 Roy 结合逐题证据决定。未改设计口径、知识、阈值、配置或 live。', '',
        '这不是随机选牌干预实验，不证明 Jev 或大脑造成后续早死；同一模型指标是诊断参照而非真实质量标签。六局内题目相关，83/60 不是独立局样本。不将 B 再计算当作自然采用或收益。', '',
        '复现：先按 `frozen/runtime-data.tar.gz` 和 `frozen/runtime-data-manifest.json` 恢复私有数据镜像，再用精确 R409 代码与生产 test helper；`shadow.mts` 默认会发真实请求，不应为核报告重复运行。离线核对只需 `python3 analyse.py`、`python3 verify.py`、`python3 write_report.py`。脚本、原件 SHA、逐题 CSV 和敏感性在同目录；完整网络原件不含鉴权头或 key。', '',
        '本次仅材料和只读回放脚本，未跑产品全检；除本次授权的最多 60 次 Nova 请求，没有额外模型请求、学习派发、对局或发布动作。', '']
    (HERE/'report.md').write_text('\n'.join(lines))


if __name__ == '__main__':
    main()
