#!/usr/bin/env python3
"""Aggregate the bounded evidence without consulting runtime code or prior reports."""
import collections
import csv
import datetime as dt
import gzip
import hashlib
import json
import math
from pathlib import Path

OUT = Path(__file__).resolve().parent
DATA = json.loads(gzip.decompress((OUT / 'projected-evidence.json.gz').read_bytes()))
MANIFEST = json.loads((OUT / 'input-manifest.json').read_text())
GROUPS = ['V5', 'V6-brain', 'V6-Jev']
TITLES = {'V5': 'V5 近 20 局', 'V6-brain': 'V6 大脑拿牌（R404/R406/R408/R409/R410）',
          'V6-Jev': 'V6 Jev 拿牌（R405/R407）'}


def stamp(s):
    return dt.datetime.fromisoformat(s.replace('Z', '+00:00')).timestamp()


def local(s):
    return dt.datetime.fromtimestamp(stamp(s), dt.timezone(dt.timedelta(hours=8))).strftime('%m-%d %H:%M:%S')


def quantiles(xs):
    xs = sorted(xs)
    return {k: xs[max(0, math.ceil(len(xs) * p) - 1)] if xs else None
            for k, p in [('p50', .5), ('p90', .9), ('max', 1)]}


def fmt(x):
    return '—' if x is None else f'{x:.2f}'


def qtext(q):
    return '/'.join(fmt(q[k]) for k in ['p50', 'p90', 'max'])


def counter(xs):
    return dict(sorted(collections.Counter(xs).items()))


def distribution(c):
    labels = {'codex': '脑', 'jev': 'Jev', 'code': '代码', 'code-fallback': '代码兜底'}
    return '、'.join(f'{labels.get(k, k)} {v}' for k, v in c.items()) or '0'


def step_ms(d):
    elapsed = (stamp(d['ts']) - stamp(d['observed_ts'])) * 1000
    assert elapsed >= -1, d['decision_id']
    return max(0, elapsed) + (d['latency_ms'].get('action') or 0)


def actual_fallback(d):
    return bool(d['fallback'] or d['time_budget'].get('fallback') or d['decider'] == 'code-fallback')


def metrics(rs):
    dd = [d for r in rs for d in r['decisions']]
    bb = [b for r in rs for b in r['brain']]
    cc = [c for r in rs for c in r['calls']]
    cards = [d for d in dd if d['label'] == 'reward/card']
    ss = [s for r in rs for s in r['sl']]
    floors = [r['terminal']['floor'] for r in rs if r['terminal']]
    duration = [(stamp(r['terminal']['ended']) - stamp(r['start'])) / 60 for r in rs if r['terminal']]
    con = collections.Counter()
    for r in rs:
        con.update(r['console_counts'])
    return {
        'runs': len(rs), 'complete': len(floors), 'victories': sum(bool(r['terminal'] and r['terminal']['victory']) for r in rs),
        'floor_mean': sum(floors) / len(floors) if floors else None, 'floor': quantiles(floors),
        'reach': {str(f): sum(x >= f for x in floors) for f in [17, 33, 48, 49]},
        'duration_min': quantiles(duration), 'duration_total_min': sum(duration),
        'decisions': len(dd), 'decision_unique_ids': len({(r['run_id'], d['decision_id']) for r in rs for d in r['decisions']}),
        'card_records': len(cards), 'card_deciders': counter(d['decider'] for d in cards),
        'card_without_action': sum(not d['chosen']['action'] for d in cards),
        'card_action_deciders': counter(d['decider'] for d in cards if d['chosen']['action']),
        'brain_records': len(bb), 'brain_unique_questions': len({(r['run_id'], b['question_id']) for r in rs for b in r['brain']}),
        'brain_total_s': sum(b['latency_ms'] for b in bb) / 1000,
        'brain_s': quantiles([b['latency_ms'] / 1000 for b in bb]),
        'brain_labels': counter(b['label'] for b in bb), 'brain_unaccepted': sum(b['accepted'] is False for b in bb),
        'call_records': len(cc), 'call_outcomes': counter(c['outcome'] for c in cc),
        'call_ms_total_s': sum(c['ms'] for c in cc) / 1000,
        'step_s': quantiles([step_ms(d) / 1000 for d in dd]),
        'step_by_label': {label: {'n': sum(d['label'] == label for d in dd),
                                **quantiles([step_ms(d) / 1000 for d in dd if d['label'] == label])}
                          for label in sorted({d['label'] for d in dd})},
        'action_failed': sum(d['action_error'] for d in dd),
        'budget_timeout': sum(bool(d['time_budget'].get('timed_out')) for d in dd),
        'fallback': sum(actual_fallback(d) for d in dd),
        'fallback_true': sum(bool(d['fallback']) for d in dd),
        'fallback_reasons': counter(d['time_budget']['fallback'] for d in dd if d['time_budget'].get('fallback')),
        'sl_records': len(ss), 'sl_results': counter(s['result'] for s in ss),
        'sl_reloads': sum(s['reload'] for s in ss),
        'sl_runs': sum(any(s['reload'] for s in r['sl']) for r in rs),
        'boss_attempts': counter(f"{'first' if s['attempt'] == 1 else 'retry'}:{s['result']}"
                                 for s in ss if s['fight_kind'] == 'boss'),
        'console': dict(sorted(con.items())),
        'v6_card_pick_records': sum(len(r['v6']) for r in rs),
        'v6_unknown_count': sum((v['unknown'] or {}).get('count', 0) for r in rs for v in r['v6']),
        'v6_unknown_total': sum((v['unknown'] or {}).get('total', 0) for r in rs for v in r['v6']),
        'v6_degradation': counter(x for r in rs for v in r['v6'] for x in (v['degradation'] or [])),
    }


PER_RUN = {rid: metrics([r]) for rid, r in DATA.items()}
SUMMARY = {g: metrics([r for r in DATA.values() if r['group'] == g]) for g in GROUPS}
(OUT / 'summary.json').write_text(json.dumps({'groups': SUMMARY, 'runs': PER_RUN}, ensure_ascii=False, indent=2) + '\n')

fields = ['run_id', 'group', 'release', 'start_local', 'ended_local', 'floor', 'death_fight', 'duration_min',
          'decisions', 'decision_unique_ids', 'card_deciders', 'card_without_action', 'brain_records', 'brain_unique_questions',
          'brain_total_s', 'brain_p50_s', 'brain_p90_s', 'brain_max_s', 'call_records', 'call_ms_total_s',
          'step_p50_s', 'step_p90_s', 'step_max_s', 'brain_unaccepted', 'call_abnormal', 'action_failed',
          'budget_timeout', 'fallback', 'fallback_true', 'fallback_reasons', 'sl_reloads', 'first_sl_floor', 'console']
with (OUT / 'per-run.csv').open('w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=fields, lineterminator='\n')
    w.writeheader()
    for rid, r in DATA.items():
        m = PER_RUN[rid]
        t = r['terminal']
        row = {k: m[k] for k in fields if k in m}
        row.update(run_id=rid, group=r['group'], release=r['release'], start_local=local(r['start']),
                   ended_local=local(t['ended']) if t else '', floor=t['floor'] if t else '',
                   death_fight='、'.join(t['death_fight'] or []) if t else '',
                   duration_min=m['duration_total_min'], first_sl_floor=min((s['floor'] for s in r['sl'] if s['reload']), default=''),
                   call_abnormal=sum(c['outcome'] != 'answered' for c in r['calls']))
        for prefix in ['brain', 'step']:
            row.update({f'{prefix}_{k}_s': v for k, v in m[f'{prefix}_s'].items()})
        for k, v in list(row.items()):
            if isinstance(v, dict):
                row[k] = json.dumps(v, ensure_ascii=False, sort_keys=True)
        w.writerow(row)

lines = ['# Issue #6：V6 监控与 V5 对照', '',
         '数据读取范围仅为 `logs/` 与 `eval/versions.json`；不运行对局、不修改运行配置或 live。所有样本均为 Silent A10。', '',
         '## 结论', '']
v5, brain, jev = (SUMMARY[g] for g in GROUPS)
lines += [f"V5 最近 20 局、V6 大脑拿牌 {brain['runs']} 局、V6 Jev 拿牌 {jev['runs']} 局均无通关。终局平均层数分别为 {fmt(v5['floor_mean'])}、{fmt(brain['floor_mean'])}、{fmt(jev['floor_mean'])}；到达 F48 的局数分别为 {v5['reach']['48']}/20、{brain['reach']['48']}/{brain['runs']}、{jev['reach']['48']}/{jev['runs']}。这批观察不能证明某一拿牌决策者更强：版本、局长、遭遇和 SL 均未控制，Jev 组样本也较少。", '',
          f"V6 大脑组的 `reward/card` 实际动作由大脑执行 {brain['card_action_deciders'].get('codex', 0)} 次、Jev 执行 {brain['card_action_deciders'].get('jev', 0)} 次；另有 {brain['card_without_action']} 条无动作记录。Jev 组实际动作由 Jev 执行 {jev['card_action_deciders'].get('jev', 0)} 次、大脑执行 {jev['card_action_deciders'].get('codex', 0)} 次。R404 虽配置写 `card=jev`，实际记录全部由大脑决策；遵照任务分组归入大脑组。", '',
          '## 样本与统计口径', '',
          f"- 决策等日志按 {local(MANIFEST['cut_utc'])}（北京时间）采样时的各文件字节长度冻结；`runs.jsonl` 于 {local(MANIFEST['terminal_index_refreshed_utc'])} 单独补读冻结。R410 的终局记录延后可见，补读后确认 TS0BHDLAH8ME 于 {local(DATA['TS0BHDLAH8ME']['terminal']['ended'])} 结束于 F17；其 406 条决策已完整包含在原采样内。后续新增局不纳入本报告。",
          '- V5 是 V6 切入前最近 20 局完整纯 V5 局（按终局时间排序）；排除从 V5 中途切入 V6 的 MWMR855QHTWR，也不把 R398–R403 纳入 R404 起样本。',
          '- V6 按每局首次 run-config 时间匹配版本表 source 中的发布时点，不按终局时间倒推。版本号属于时间窗归属：这批 V6 的 config commit 为空且 git 采样报错，不能声称已核实每局的精确代码 SHA。',
          '- 层数与“死因”直接采用 runs 的终局层数、死亡遭遇；遭遇名称只能说明死在哪里，不足以证明战术因果。整局时间为首次 config 到终局的墙钟分钟数，含 SL、等待与停顿。',
          '- 拿牌分母为 `label=reward/card` 的记录，包含跳过、事件等非严格三选一场景和 SL/重试；并非实际获得卡数。表中代码无动作记录单列，不能当作代码已选牌。其他 selection/add、商店与事件选择另计在完整标签统计中。',
          '- 大脑请求主计数为 brain.jsonl 的记录条数，括号给唯一 question_id 数；耗时使用其 latency_ms。调用回执另用 codex-calls 的条数及 ms 之和，含报错和重复调用。question_id、attempt 可重复，不能据此把不同调用合并；call_ms 可能累计，不能直接求和。二者是账本口径，不等同底层供应商 HTTP 请求数。',
          '- 单步为 `(ts − observed_ts) + latency_ms.action`，单位秒。日志 ts 是动作前时间，故加动作耗时；不叠加已包含在时间差内的 plan/deepseek/planner。该量包括已记录的规划和动作等待，不涵盖两条日志之间的全部循环开销。',
          '- 分位数使用 nearest-rank：排序后第 ceil(p×n) 项；汇总性能按记录池计算，不是各局分位数的均值。重复 decision_id 原样保留，因为它们是不同执行/重试记录，且各局记录数均与 runs.decisions 相等。',
          '- runs.deciders 把 jev-plan 单列，decisions.decider 则将对应动作记为 code；全动作分布核验时仅作 code + jev-plan 归并即可逐局相等。拿牌分布始终直接取 reward/card 的 decider，不套用全局汇总。',
          '- 实际兜底为 fallback=true、time_budget.fallback 非空、或 decider=code-fallback 的并集；预算超时单列。console 的“fallback order”是说明文字，不计实际兜底。错误类别可重叠，不能相加成独立故障数。', '',
          '## 三组汇总', '',
          '| 指标 | V5 近 20 局 | V6 大脑拿牌 | V6 Jev 拿牌 |', '|---|---:|---:|---:|']


def summary_row(label, fn):
    lines.append('| ' + label + ' | ' + ' | '.join(str(fn(SUMMARY[g])) for g in GROUPS) + ' |')


summary_row('结束局数 / 通关', lambda m: f"{m['complete']} / {m['victories']}")
summary_row('终局层数：均值；p50/p90/max', lambda m: f"{fmt(m['floor_mean'])}；{qtext(m['floor'])}")
for fl in [17, 33, 48, 49]:
    summary_row(f'到达 F{fl}', lambda m: f"{m['reach'][str(fl)]}/{m['complete']}")
summary_row('整局分钟 p50/p90/max', lambda m: qtext(m['duration_min']))
summary_row('拿牌记录分布', lambda m: distribution(m['card_deciders']))
summary_row('拿牌无动作记录', lambda m: m['card_without_action'])
summary_row('大脑记录数（唯一问题）', lambda m: f"{m['brain_records']}（{m['brain_unique_questions']}）")
summary_row('大脑总耗时 / 每局平均（秒）', lambda m: f"{fmt(m['brain_total_s'])} / {fmt(m['brain_total_s']/m['runs'])}")
summary_row('大脑请求秒 p50/p90/max', lambda m: qtext(m['brain_s']))
summary_row('调用回执数 / ms 累计（秒）', lambda m: f"{m['call_records']} / {fmt(m['call_ms_total_s'])}")
summary_row('单步记录数；秒 p50/p90/max', lambda m: f"{m['decisions']}；{qtext(m['step_s'])}")
summary_row('脑未接纳 / 非 answered 回执', lambda m: f"{m['brain_unaccepted']} / {sum(n for k,n in m['call_outcomes'].items() if k != 'answered')}")
summary_row('动作失败 / 预算超时 / 实际兜底', lambda m: f"{m['action_failed']} / {m['budget_timeout']} / {m['fallback']}")
summary_row('发生 SL 的局 / 成功 reload 次数', lambda m: f"{m['sl_runs']} / {m['sl_reloads']}")
summary_row('console Codex 失败 / Boss 模拟报错', lambda m: f"{m['console'].get('codex_failed',0)} / {m['console'].get('boss_sim_failed',0)}")

for group in GROUPS:
    rs = [r for r in DATA.values() if r['group'] == group]
    lines += ['', f'## {TITLES[group]}：逐局结果', '',
              '开始/结束为北京时间；首 SL 是第一条成功 reload 所在层，不代表独立首试通关结果。', '',
              '| 局号 | 发布 | 开始 → 结束 | 分钟 | 层数 | 死亡遭遇 | 拿牌分布 | SL 次/首层 |',
              '|---|---|---|---:|---:|---|---|---|']
    for r in rs:
        rid = r['run_id']; m = PER_RUN[rid]; t = r['terminal']
        first = min((s['floor'] for s in r['sl'] if s['reload']), default='—')
        cards = distribution(m['card_deciders']) + (f"（其中无动作 {m['card_without_action']}）" if m['card_without_action'] else '')
        lines.append(f"| {rid} | {r['release'].replace('V6-', '')} | {local(r['start'])} → {local(t['ended'])} | {fmt(m['duration_total_min'])} | {t['floor']} | {'、'.join(t['death_fight'] or [])} | {cards} | {m['sl_reloads']}/{first} |")
    lines += ['', '以下耗时均为秒；错误列依次为「脑未接纳 / 非 answered 调用回执 / 动作失败 / 预算超时 / 实际兜底 / console Boss 模拟报错」。', '',
              '| 局号 | 脑记录（唯一问题） | 脑累计 | 脑 p50/p90/max | 单步 n；p50/p90/max | 错误与兜底 |',
              '|---|---:|---:|---|---|---|']
    for r in rs:
        rid=r['run_id']; m=PER_RUN[rid]
        err=[m['brain_unaccepted'],sum(c['outcome']!='answered' for c in r['calls']),m['action_failed'],m['budget_timeout'],m['fallback'],m['console'].get('boss_sim_failed',0)]
        lines.append(f"| {rid} | {m['brain_records']}（{m['brain_unique_questions']}） | {fmt(m['brain_total_s'])} | {qtext(m['brain_s'])} | {m['decisions']}；{qtext(m['step_s'])} | {' / '.join(map(str,err))} |")

lines += ['', '## 请求类型、单步与故障细分', '',
          '| 大脑请求标签 | V5 | V6 大脑 | V6 Jev |', '|---|---:|---:|---:|']
for label in sorted({k for m in SUMMARY.values() for k in m['brain_labels']}):
    lines.append('| '+label+' | '+' | '.join(str(SUMMARY[g]['brain_labels'].get(label,0)) for g in GROUPS)+' |')
lines += ['', '下表为相应标签的完整单步，而非仅大脑调用。标签没有记录时保留缺失。', '',
          '| 场景（n；秒 p50/p90/max） | V5 | V6 大脑 | V6 Jev |', '|---|---|---|---|']
for label in ['reward/card', 'rest/plan', 'shop/plan', 'event/act-plan', 'map/route-plan', 'run-plan']:
    cells=[]
    for g in GROUPS:
        q=SUMMARY[g]['step_by_label'].get(label)
        cells.append(f"{q['n']}；{qtext(q)}" if q else '无记录')
    lines.append('| '+label+' | '+' | '.join(cells)+' |')
lines += ['', '实际预算兜底原因（不同原因按记录计，完整并集见上表）：', '',
          '| time_budget.fallback | V5 | V6 大脑 | V6 Jev |', '|---|---:|---:|---:|']
for reason in sorted({k for m in SUMMARY.values() for k in m['fallback_reasons']}):
    lines.append('| '+reason+' | '+' | '.join(str(SUMMARY[g]['fallback_reasons'].get(reason,0)) for g in GROUPS)+' |')
lines += ['', 'Boss 的 SL 账本按首尝试与后续尝试分别计记录；predicted_death 是系统判断，不等于已经实际死亡。通关率以局为分母，不能拿尝试条数扩大样本。', '',
          '| Boss 尝试类别 | V5 | V6 大脑 | V6 Jev |', '|---|---:|---:|---:|']
for kind in sorted({k for m in SUMMARY.values() for k in m['boss_attempts']}):
    lines.append('| '+kind+' | '+' | '.join(str(SUMMARY[g]['boss_attempts'].get(kind,0)) for g in GROUPS)+' |')
lines += ['', '## 可确认的异常与监控缺口', '',
          f"- CEN1Z8HEU7NM（R409）console 有 {PER_RUN['CEN1Z8HEU7NM']['console'].get('boss_sim_failed',0)} 条 Boss 模拟相关错误输出，均含 build-sim worker 的 nonpositive-hp；包含 note/wait 重复展示，不能视为独立故障数。另有 6 条 reward/card 无动作记录，不能认定为六次实际代码选牌。定位见 console-error-locations.json。",
          '- CLCR3DUH66HK（R408）出现 reward/card 的大脑预算失败，并实际由 Jev 执行 1 次。大脑组不等于每次都由大脑选牌。',
          '- Codex 调用回执同一 question_id / attempt 可重复：V5 启动错误重试、9U1E3V6XQAZ9 的两次未接纳，以及 V6 的 1ZZHM2MV19YB、SVBEFF7YAZMA、BQXQJQ9GN51L 均有重复 ID 调用。未按 ID 粗暴去重耗时。',
          f"- console 仅将包含唯一目标局号的文件归入相应局：覆盖 {sum(len(r['console']) for r in DATA.values())} 个文件；采样目录另有 {len(MANIFEST['console_unassigned'])} 个文件未能归入唯一目标局（包括样本外日志）。console 计数是这部分明确归属日志中的匹配条数，不能视为系统全部异常。文件和行 SHA 保留；不发布原始 stderr、鉴权字段或内部地址。",
          '- 这批 v6-build 仅有 card_pick 记录；无独立方向重算请求、T1–T7 触发记录和幕初 build 重算记录。不能用普通 event/act-plan 或零条记录替代方向切换收益评估。',
          '- R404 的 52 条 card_pick 均记录 insufficient_known_options（known=0/4）并 v6_unknown_to_brain；R405/R407 的 44 条 card_pick 则保留 A/B 退化等限制。这解释了配置标签不足以证明实际走了 Jev 的原因，但不能把 52 条构建记录与 57 条 R404 拿牌动作假定为一一对应。',
          '- v6-build 的 unknown 分母只是该结构记录的字段数。A/B 退化、缺少理想卡、只用缓存、未预测未来库存等已明确登记；不能把 unknown=0 解读为模型完备，也不能据此校准可得率。',
          '- 第 10 节的方向概率变化、可得率校准、F48/49 连战投影与实际误差按可信度分账，在本次有边界的记录中未建立可核验的一一配对，保留未知。本报告不凭当前源码或既有报告补齐这些游戏结论。', '',
          '| v6-build 字段（记录层面） | V5 | V6 大脑 | V6 Jev |', '|---|---:|---:|---:|']
summary_row('card_pick 记录数', lambda m:m['v6_card_pick_records'])
summary_row('unknown.count / unknown.total', lambda m:f"{m['v6_unknown_count']} / {m['v6_unknown_total']}")
for kind in sorted({k for m in SUMMARY.values() for k in m['v6_degradation']}):
    summary_row(kind, lambda m:m['v6_degradation'].get(kind,0))
lines += ['', '## 复现与验收', '',
          '- input-manifest.json：原始文件冻结字节数、前缀 SHA256、匹配行数/哈希、发布边界和 console 文件哈希；不复制原始日志。',
          '- projected-evidence.json.gz：去除原始响应、stderr、理由正文等内容后的字段投影，含源 JSONL 字节 offset；确定性 gzip，便于复核。',
          '- per-run.csv / summary.json：逐局明细与汇总；console-error-locations.json：错误分类的文件、行号及原行哈希。',
          '- 重算：`nice -n 19 python3 -B analyze.py <logs目录>`，再 `nice -n 19 python3 -B summarize.py`。保留 manifest 可固定旧文件前缀，不吸收之后追加的数据。复算需同一 eval/versions.json（脚本核 SHA）；不要在缺少原始日志时新建 manifest。',
          '- 验证结果见 verification.json 与 independent-verification.json（523 条原始 offset 抽样、全部 console 行哈希、CSV/汇总对账、分位数及耗时/兜底边界用例）。复核命令：`nice -n 19 python3 -B verify.py <logs目录>`。本次只新增分析材料并追加决定记录，没有运行代码改动，按仓库规则无需运行 TypeScript tsc/vitest。', '']
(OUT / 'report.md').write_text('\n'.join(lines))

def terminal_deciders(r):
    c = collections.Counter(r['terminal']['deciders'])
    c['code'] += c.pop('jev-plan', 0)
    return dict(c)


verification = {'complete_runs': len(DATA), 'all_silent_a10': all(r['ascension'] == 10 for r in DATA.values()),
                'all_terminal_present': all(r['terminal'] for r in DATA.values()),
                'decision_count_matches_terminal': all(len(r['decisions']) == r['terminal']['decisions'] for r in DATA.values()),
                'all_brain_codex': all(b['engine'] == 'codex' for r in DATA.values() for b in r['brain']),
                'brain_and_call_question_sets_match': all({b['question_id'] for b in r['brain']} == {c['question_id'] for c in r['calls']} for r in DATA.values()),
                'group_sizes': {g: SUMMARY[g]['runs'] for g in GROUPS},
                'decider_counts_match_terminal_after_jev_plan_fold': all(dict(collections.Counter(d['decider'] for d in r['decisions'])) == terminal_deciders(r) for r in DATA.values()),
                'evidence_gzip_sha256': hashlib.sha256((OUT/'projected-evidence.json.gz').read_bytes()).hexdigest()}
assert all(v for k,v in verification.items() if isinstance(v,bool)), verification
assert verification['group_sizes'] == {'V5':20,'V6-brain':16,'V6-Jev':7}
(OUT / 'verification.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'groups': {g: {k: m[k] for k in ['runs','floor_mean','reach','brain_records','brain_total_s','step_s','fallback']} for g,m in SUMMARY.items()}, 'verification':verification},ensure_ascii=False,indent=2))
