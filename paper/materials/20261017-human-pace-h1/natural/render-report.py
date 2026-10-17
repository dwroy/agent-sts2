"""Render the two-complete-run report; never renders pending runs as acceptance."""
from pathlib import Path
import json
import statistics

HERE = Path(__file__).resolve().parent


def latency(value):
    if not value["n"]:
        return "0 / — / — / —"
    return f"{value['n']} / {value['p50']/1000:.3f} / {value['p90']/1000:.3f} / {value['max']/1000:.3f}"


def table(headers, rows):
    return "\n".join(["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
                     + ["| " + " | ".join(str(v) for v in row) + " |" for row in rows])


def samples(value):
    return "0 / — / — / —" if not value["n"] else f"{value['n']} / {value['p50']:g} / {value['p90']:g} / {value['max']:g}"


def main():
    events = json.loads((HERE / "two-terminal-events.json").read_bytes())
    post = events["completed"][:2]
    assert len(post) == 2 and all(events["candidates"][rid]["terminal"] for rid in post)
    data = json.loads((HERE / "analysis.json").read_bytes())
    runs = data["runs"]
    base = data["baseline_run_ids"]
    assert all(runs[rid]["decision_count_matches"] for rid in base + post)
    assert all(runs[rid]["budget_entries"] > 0 for rid in post)
    initial = json.loads((HERE / "g1c-initial-cohort.json").read_bytes())
    prefix_n = len(initial["runs"])
    lines = ["# H1 两局自然验收", "",
        f"R380 的两局自然终局为 {'、'.join(post)}。原始 run-config、启动分段及终局引用见 listener-state.json 和各局目录；排除发布前已开的 JKDUL0AL0TW6。任务只读，未运行 play、模型或模拟，未改线上。", "",
        "下表总用时包含计算、模型、SL、动作和等待，从最早本局原帧/启动配置到原终局。比较是描述性数据；早死局较短，两局不能证明总体胜率或漏斗没有下降。", "",
        table(["组", "局", "总分钟", "终局", "决策数", "L2题数/原生调用记录", "超过90分钟"],
              [["前5" if rid in base else "R380", rid, f"{runs[rid]['duration_minutes']:.2f}", f"F{runs[rid]['end_floor']} {'胜' if runs[rid]['victory'] else '败'}", runs[rid]["decision_count"],
                f"{runs[rid]['L2']['questions_including_failed_traces']}/{runs[rid]['L2']['native_call_rows']}", "是" if runs[rid]["over_90_minutes"] else "否"] for rid in base + post]), "",
        f"总用时中位数：发布前五局 {statistics.median(runs[r]['duration_minutes'] for r in base):.2f} 分钟；R380 两局 {statistics.median(runs[r]['duration_minutes'] for r in post):.2f} 分钟。", "",
        "边界补充：JKDUL0AL0TW6 是发布前启动、发布31秒后结束的旧版局，另有56.02分钟/F33败的原件；未充H1验收，也未偷换上述冻结基线。若以首个H1启动之前最近五个旧版终局为敏感性窗口，则加入JK、移出YZW；所有六局原始投影均保留，可复算。", "",
        "逐决策可比计算延迟：n / p50 / p90 / 最大，单位秒。定义为 latency_ms 的 pre+planner+plan+jev+deepseek，排除 action；这些字段可能含预算暂停的传输，不能当精确 H1 预算时间。L2 单独列，不与计算项再相加。", "",
        table(["局", "普通", "精英", "Boss首试", "SL重试", "L2整题"],
              [[rid] + [latency(runs[rid]["decision_compute_proxy_ms"][k]) for k in ("ordinary", "elite", "boss", "retry")]
               + [latency(runs[rid]["L2"]["question_latency_ms_including_failed_traces"])] for rid in base + post]), "",
        "同一战斗回合累计的可比代理延迟如下，避免快的逐牌动作掩盖慢回合；按局/层/回合/SL尝试聚合，仍不等于预算内部计时。", "",
        table(["局", "普通回合", "精英回合", "Boss首试回合", "重试回合"], [[rid] + [latency(runs[rid]["turn_compute_proxy_ms"][k]) for k in ("ordinary", "elite", "boss", "retry")] for rid in base + post]), "",
        "H1 实际预算内回合计时：按 time_budget.key 去重，取该回合最终 turn_actual_ms，不重复相加累计快照。旧局未采样，不倒填。", "",
        table(["局", "普通回合", "精英回合", "Boss首试回合", "重试回合", "超预算条目/不同key", "预算兜底次数"],
              [[rid] + [latency(runs[rid]["turn_budget_actual_ms"][k]) for k in ("ordinary", "elite", "boss", "retry")]
               + [f"{sum((runs[rid]['overbudget_entries'] or {}).values())}/{runs[rid]['overbudget_distinct_keys']}", sum((runs[rid]["budget_fallbacks"] or {}).values())] for rid in post]), "",
        "预算字段是实际实现记录；超时 stage、兜底原因、缺预算行及具体超时行见 analysis.json。native 调用次数包含失败/重试；call_ms 是同一请求的累计值，不能跨尝试相加。CVJ4 的两条历史坏行保留，其合法记录数是下界，不能称没有遗漏调用。H2 的每局12–15次软上限尚未实施。", "",
        "B2/B3 按实际输出行计；缓存复用不当独立重算。预算截断只计 budgeted 且 partial 且非故障；C2 淘汰后的完整结果或低可信200样本上限不计超时。分布为 n / p50 / p90 / 最大。", "",
        table(["局", "计算", "输出行", "预算截断/预算行", "截断比例", "根样本数", "候选样本数", "状态"],
              [[rid, lane, runs[rid][lane]["rows"], f"{runs[rid][lane]['budget_truncated_rows']}/{runs[rid][lane]['budgeted_rows']}",
                "unknown" if runs[rid][lane]["budget_truncated_fraction"] is None else f"{runs[rid][lane]['budget_truncated_fraction']:.1%}",
                samples(runs[rid][lane]["actual_samples"]), samples(runs[rid][lane]["candidate_samples"]), str(runs[rid][lane]["status_counts"])] for rid in base + post for lane in ("B2", "B3")]), "",
        "样本统计的单位为样本，不是秒；完整直方图、paired 样本数和 requested 分布在 analysis.json。", "",
        "G1c 沿原 Silent A10/V5 描述性口径。第59/60局的实际排序以下方已终局集合为准；既有50局归档不借作本次证据，60局自动归档由原 ops 钩子处理，不由 watcher 重跑。首试在首次预测/实际死亡处停止，含SL最终结果单列。", "",
        table(["局", "G1c完成序号", "固定10局段", "最终层", "首试停止层", "Boss局部首试/最终（*为首试漏斗未到）"],
              [[rid, prefix_n+i+1, f"{(prefix_n+i)//10*10+1}–{(prefix_n+i)//10*10+10}", runs[rid]["end_floor"], runs[rid]["funnel"]["first_attempt_stop_floor"],
                "; ".join(f"F{b['floor']} {b['encounter']} {b['first_attempt_pass']}/{b['final_pass']}{'*' if not b['reachable_in_first_attempt_funnel'] else ''}" for b in runs[rid]["funnel"]["bosses"]) or "未到Boss"] for i, rid in enumerate(post)]), ""]
    for rid in post:
        r = runs[rid]
        lines += [f"{rid}：预算兜底 {r['budget_fallbacks']}；stage 超时 {r['stage_timeout_counts']}；预算缺行 {r['missing_budget_entries']}。", ""]
        if r["over_90_minutes"]:
            t = r["attribution"]
            lines += [f"超过90分钟单列：{rid} 总用时 {r['duration_minutes']:.2f} 分钟。可比计算代理 {t['compute_proxy_minutes']:.2f} 分钟，动作dispatch {t['action_dispatch_minutes']:.2f} 分钟，B2 {t['B2_minutes']:.2f}、B3 {t['B3_minutes']:.2f}、大脑 {t['brain_logged_minutes']:.2f} 分钟（后3项与计算代理重叠，不相加）。慢题和超过60秒的未归因间隙见 attribution，最终原因以单独异常说明为准，不以当前主机负载倒填历史IO。", ""]
    lines += ["精确宿主结果仅引用原 ops 的新树回执，见 host-readback.json；source绿和旧树绿不代替该结果。复现与原字节核验见 scope-and-method.md、freeze-inputs.py、analyze.py、verify-projections.py 及各输入 manifest/provenance-verification.json。完成本限定验收后停止，不推进 H2 或其他阶段。", ""]
    (HERE / "report.md").write_text("\n".join(lines))


if __name__ == "__main__":
    main()
