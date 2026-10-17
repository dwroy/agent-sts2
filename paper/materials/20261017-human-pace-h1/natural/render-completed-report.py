"""Render admitted H1 observations; terminal collection alone never admits a run."""
from pathlib import Path
from datetime import datetime
import argparse
import json
import statistics

HERE = Path(__file__).resolve().parent


def table(headers, rows):
    return "\n".join(["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
                     + ["| " + " | ".join(str(v).replace("|", "/") for v in row) + " |" for row in rows])


def dist(v, scale=1000):
    return "0 / unknown / unknown / unknown" if not v["n"] else f"{v['n']} / {v['p50']/scale:.3f} / {v['p90']/scale:.3f} / {v['max']/scale:.3f}"


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--analysis", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--first-only", action="store_true")
    a = p.parse_args()
    x = json.loads((HERE / a.analysis).read_bytes())
    runs, base = x["runs"], x["baseline_run_ids"]
    post = ["25MFNPAE37R2"] if a.first_only else ["25MFNPAE37R2", "2PQK67ULZY90"]
    for rid in post:
        r = runs[rid]
        assert r["finished"] and r["decision_count_matches"] and r["first_logged_floor"] == 1
        assert len(r["config_segments"]) == 1 and not r["config_segments"][0]["restart"]
        assert r["budget_entries"] == r["decision_count"]
        assert set(r["L2"]["model_effort"]) == {"gpt-6.1-sol/xhigh"}
    lines = [f"# H1 自然验收：{len(post)}/2 局已核", "", f"生成时间：{datetime.now().astimezone().isoformat()}。请求 roy-20261017-human-pace；本人 watcher/codex1；原 session 01a13dcd-83d4-7c63-b233-f93cf878ecf4。", "",
        f"已核完整自然局：{'、'.join(post)}。" + ("2PQK 仍只由原一次性局末监听等待，未充第二局。" if a.first_only else "本次两局观察与报告已交付；这不等于证明胜率不变、全部回合严格无越界，或 H0/0332 已完成。"), "",
        "25MF 启动原配置 12:53:29.820、原终局 14:10:50.545，故总用时77.345分钟。转达中的14:19不作为原终局时间；未把后续局末刷新、归档和下一局间隔算进该局。计时包含首次原帧之前已经开始的 run-plan/L2。", "",
        "## 准入与 R383 可比性", "",
        "25MF 从F1自然启动于6fbbd82ab，含R380/R382；2PQK从F1自然启动于5782a41c4，含R380/R382/R383。R383四生产叶原补丁已全文读回：loop仅增加decisionId传递，其余为隐秘匕首双弃边界后保留只读条件后继和来源身份。预算档位、计时、采样器、C1/C2、SL及药水规则未改，五个预算/采样核心blob逐字相同，原human_pace配置也相同，因此可作为H1限时机制的观察性验收。", "",
        "R383的题面条件信息仍可能改变Jev选择及后继工作量；两次启动也有自动知识刷新和知识dirty列表。故不是固定知识/同一策略的纯因果对照，不能把速度或胜负全部归因于H1。原run-config的旧required-full-paired文字不覆盖显式human_pace.required_full_replaced=true及实际预算遥测。", "",
        "5H83F3J0XSTE单列排除：R380开局，F48选择题预算到期后strictJev返回空intent而等待，12:38由ops受控恢复至R382后12:43:37终局；不是全程同版本自然局。原0/2阻塞报告、27.579分钟已证等待及原失败证据保持，见 report-blocked-1255.md 和 mixed-5H83-boundary 原件。JKDUL是发布前旧版重叠局，也不充H1。", "",
        "## 用时与调用", "",
        table(["组", "局", "起点→终点 UTC", "总分钟", "终局", "决策", "L2题/原生记录", ">90分钟"],
              [["发布前5" if rid in base else "H1", rid, f"{runs[rid]['startup_ts']} → {runs[rid]['ended']}", f"{runs[rid]['duration_minutes']:.3f}", f"F{runs[rid]['end_floor']} {'胜' if runs[rid]['victory'] else '败'}", runs[rid]["decision_count"], f"{runs[rid]['L2']['questions_including_failed_traces']}/{runs[rid]['L2']['native_call_rows']}", "是" if runs[rid]["over_90_minutes"] else "否"] for rid in base + post]), "",
        f"总用时中位数：原五局{statistics.median(runs[r]['duration_minutes'] for r in base):.3f}分钟，本次{len(post)}局{statistics.median(runs[r]['duration_minutes'] for r in post):.3f}分钟。原五局中有F8早死局及CVJ4极慢/重启局，不能只用这两个中位数估计因果加速。主基线始终是实际R380发布10:50:56之前已结束的五局；若改用首个H1开局前最近五旧局，则加入JK、移出YZW，仅作敏感性窗口，未偷换主窗口。", "",
        "计划45–60分钟的单局目标尚未全部达到：" + "、".join(f"{rid} {runs[rid]['duration_minutes']:.3f}分钟" for rid in post if runs[rid]['duration_minutes'] > 60) + "。本次只交H1数据；不自行降低预算或启动H2。下一步可由Claude另派H2以降低重复L2调用，不能把预算调参当本任务已授权行动。", "",
        "下面均为 n / p50 / p90 / 最大，时间单位秒。可比代理使用每条latency_ms的pre+planner+plan+jev+deepseek，排除action。L2另列，包含失败/重试题，可能与pre/plan重叠，不能再相加。", "",
        table(["局", "普通决策", "精英决策", "Boss首试决策", "SL重试决策", "非战斗决策", "L2整题"],
              [[rid] + [dist(runs[rid]["decision_compute_proxy_ms"][k]) for k in ("ordinary", "elite", "boss", "retry", "routine")] + [dist(runs[rid]["L2"]["question_latency_ms_including_failed_traces"])] for rid in base + post]), "",
        "逐牌快动作会稀释决策分位数，以下再列同一战斗回合的累计代理。普通/精英/Boss按原地图与SL房型，重试单列；少数普通房按现有规则采用elite预算，房型与预算档位不是同一分类。", "",
        table(["局", "普通回合", "精英回合", "Boss首试回合", "SL重试回合"], [[rid] + [dist(runs[rid]["turn_compute_proxy_ms"][k]) for k in ("ordinary", "elite", "boss", "retry")] for rid in base + post]), "",
        "## 实际预算、兜底与截断", "",
        "预算内部时间与上述跨版本代理分开。按连续预算片段取最后turn_actual_ms；同key在重启/重新进入后可能新建片段，不全局合并，也不重复累加累计快照。旧版没有此遥测，超预算和预算兜底为unknown，不能填0。", "",
        table(["局", "普通预算回合", "精英预算回合", "Boss首试预算回合", "重试预算回合", "超时条目/连续片段", "预算兜底", "最大越界秒"],
              [[rid] + [dist(runs[rid]["turn_budget_actual_ms"][k]) for k in ("ordinary", "elite", "boss", "retry")] + [f"{sum(runs[rid]['overbudget_entries'].values())}/{runs[rid]['overbudget_distinct_keys']}", sum(runs[rid]["budget_fallbacks"].values()), f"{runs[rid]['budget_turn_overshoot_ms']['max']/1000:.3f}"] for rid in post]), "",
        "超时条目可以是同一到期回合的后续快动作；超时片段与成功兜底次数不可互换。实际越界与到期后的检查/同步回收/兜底等开销相容，未逐项隔离，不能把complete_budget误称毫秒级硬实时。H2调用次数软上限尚未实施。", "",
        "25MF 的F43 reward/card是一条明确的L2预算到期：之前计算已经占用共享预算，L2只剩76.942秒，整题预算累计90.006秒后用现有代码候选兜底。故L2原生最大值小于90秒与非战斗决策达到90秒并不冲突；失败/aborted也计入题数。", ""]
    for rid in post:
        r = runs[rid]
        lines += [f"{rid}：预算字段{r['budget_entries']}/{r['decision_count']}；超时按房型{r['overbudget_entries']}，stage超时{r['stage_timeout_counts']}；预算兜底{r['budget_fallbacks']}；全部fallback标记{r['all_decision_fallbacks']}。shadow因预算记unknown的连续片段{r['shadow_unknown_distinct_keys']}。L2原生结果{r['L2']['outcomes']}，模型/强度{r['L2']['model_effort']}。", ""]
    lines += ["B2=战斗boss_sim、B3=非战斗boss_sim；全部输出包括无completion的空/已过Boss跳过行。预算截断定义budgeted=true、partial且无failure；C2提前完整完成、低可信采样上限与故障降级均不算预算截断。下表样本分布单位是样本，缓存输出不算独立重算。", "",
        table(["局", "lane", "输出行", "partial/预算行", "占预算行", "占全部行", "根n/p50/p90/max", "候选n/p50/p90/max", "状态"],
              [[rid, lane, runs[rid][lane]["rows"], f"{runs[rid][lane]['budget_truncated_rows']}/{runs[rid][lane]['budgeted_rows']}", "unknown" if runs[rid][lane]["budget_truncated_fraction"] is None else f"{runs[rid][lane]['budget_truncated_fraction']:.1%}", "unknown" if not runs[rid][lane]["budgeted_rows"] else f"{runs[rid][lane]['budget_truncated_fraction_all_output_rows']:.1%}", dist(runs[rid][lane]["actual_samples"], 1), dist(runs[rid][lane]["candidate_samples"], 1), runs[rid][lane]["status_counts"]] for rid in base + post for lane in ("B2", "B3")]), "",
        "完整根样本直方图、paired样本分布、requested、memoHit及低可信行数保存在analysis-final.json（首局版用first-analysis.json）。0样本仍为有效的零覆盖日志，预测unknown，不补数值。样本分布是日志samples字段，故障前已经计算的前缀不等于通过身份/配对检查的可用样本。B3的空/已过Boss跳过行不借预算率推断完成。SL精确输入复用只能以真实memo/输入身份为准，不能把各日志行当独立模拟或从未重算。", "",
        "## G1c 与 Boss", "",
        "沿既有V5 Silent A10描述性漏斗，实际60边界归档已核：混合5H83是第59，25MF是第60（51–60段）；原runs终局尾段已核只有2PQK接在25MF之后，因此本次为第61（61–70段）。G1c包含混合局作描述，不代表其通过H1准入；未新跑归档helper或report.py。", "",
        table(["局", "G1c序号/段", "进入幕", "首试停止/最终层", "Boss局部首试/最终；*表示首试漏斗未到"],
              [[rid, "60 / 51–60" if rid == "25MFNPAE37R2" else "61 / 61–70", str(runs[rid]["funnel"]["entered_acts"]), f"F{runs[rid]['funnel']['first_attempt_stop_floor']} / F{runs[rid]['end_floor']}", "; ".join(f"F{b['floor']} {b['encounter']} {b['first_attempt_pass']}/{b['final_pass']}{'*' if not b['reachable_in_first_attempt_funnel'] else ''}" for b in runs[rid]["funnel"]["bosses"])] for rid in post]), "",
        table(["组", "局", "可达首试Boss过/已知", "含SL最终Boss过/已知", "Boss逐项首试/最终"],
              [["发布前5" if rid in base else "H1", rid,
                f"{sum(b['first_attempt_pass'] is True and b['reachable_in_first_attempt_funnel'] for b in runs[rid]['funnel']['bosses'])}/{sum(b['first_attempt_pass'] is not None and b['reachable_in_first_attempt_funnel'] for b in runs[rid]['funnel']['bosses'])}",
                f"{sum(b['final_pass'] is True for b in runs[rid]['funnel']['bosses'])}/{sum(b['final_pass'] is not None for b in runs[rid]['funnel']['bosses'])}",
                "; ".join(f"F{b['floor']} {b['first_attempt_pass']}/{b['final_pass']}{'*' if not b['reachable_in_first_attempt_funnel'] else ''}" for b in runs[rid]['funnel']['bosses']) or "未到Boss"] for rid in base + post]), "",
        "原五局的Boss原始引用同样保存在分析JSON；首次实际/预测死亡后到达的Boss不能回填首试漏斗。少量观察不能证明战斗质量没有下降。", "",
        "## 超过90分钟与卡局", ""]
    for rid in post:
        r = runs[rid]; t = r["attribution"]
        lines += [f"{rid}：总用时{r['duration_minutes']:.3f}分钟，{'超过90分钟' if r['over_90_minutes'] else '未超过90分钟'}。已落计算代理{t['compute_proxy_minutes']:.3f}分钟，dispatch{t['action_dispatch_minutes']:.3f}分钟；B2 {t['B2_minutes']:.3f}、B3 {t['B3_minutes']:.3f}、已落L2 {t['brain_logged_minutes']:.3f}分钟（后三项嵌入前项，不相加）。相邻决策之间超过60秒的未归因间隙{len(t['inter_decision_gaps_over_60s'])}个；慢题与原引用见attribution，未以当前负载倒填历史IO。", ""]
    lines += ["混合5H83的>90分钟旧卡局作为独立已证失败保留，不因R382修复和这次新局变快而抹去。旧五局中超过90分钟的分解也单列如下（分钟；列之间重叠，不能相加）。这些是已落耗时的定位，不自动证明某个机制的因果。", "",
        table(["旧局", "总分钟", "计算代理", "B2", "B3", "已落L2", "最慢决策位置/秒", ">60秒间隙"],
              [[rid, f"{runs[rid]['duration_minutes']:.3f}", f"{runs[rid]['attribution']['compute_proxy_minutes']:.3f}", f"{runs[rid]['attribution']['B2_minutes']:.3f}", f"{runs[rid]['attribution']['B3_minutes']:.3f}", f"{runs[rid]['attribution']['brain_logged_minutes']:.3f}",
                f"F{runs[rid]['attribution']['slowest_decisions'][0].get('floor')} {runs[rid]['attribution']['slowest_decisions'][0].get('label')} / {sum((runs[rid]['attribution']['slowest_decisions'][0].get('latency_ms') or {}).get(k, 0) or 0 for k in ('pre','planner','plan','jev','deepseek'))/1000:.3f}",
                len(runs[rid]['attribution']['inter_decision_gaps_over_60s'])] for rid in base if runs[rid]['over_90_minutes']]), "",
        "YZW的B2/B3/L2均有累计开销；N9GK同时有长B2/B3和201.536秒L2整题；CVJ4的B2累计311.988分钟及F48最长939.721秒决策占明显长尾，另有F5的568.230秒未归因间隙，不能混为F48计算；DC32的B2累计51.644分钟及F33长计算较突出。CVJ4有历史坏行/版本分段，不能据合法行数保证调用无遗漏。本报告不从这些分解重新断言联合shadow、模型或机器IO因果。", "",
        "## 健康边界", "",
        "2PQK F33 T3实际出现boss margin sample identity mismatch：两条pending共享同一sim-failure key（原ms分别28059/34），随后一条degraded、samples=0、估计/误差unknown并使用现有候选继续；这是一次故障段，不是三份独立故障。该段没有卡住，但不能称B2全健康，也不能把它计入正常partial截断。完整completion与原offset/len/SHA见resume-25mf-2pqk/actual-simulation-exits.json。仅凭该错误未定位根因，不能归因R383、H0或0332；如需修复，由Claude另派最小排查，不在本只读任务实现或开新阶段。", "",
        "## 原件与复现", "",
        "所有新局选中原始范围逐offset/len/SHA读回，见inputs-<run>/manifest.json和provenance-verification.json。主基线baseline-r2不重扫、不重建；两条历史坏行原件保留。完整4037条新局范围加11452条旧范围共15489条，准入与文件SHA复核见resume-25mf-2pqk/final-admission-and-data-cut.json；CSV见同目录latencies-final.csv。R383实读补丁、核心blob相等见admission-and-R383-comparability.json；宿主原日志SHA本人核回见original-ops-host-readback.json，仅各自精确提交树通过，不外推脏知识完整运行树或生产校准。", "",
        "可比代理与ts-observed逐行核对，超过1秒差的5行全部是沿用旧observed_ts的map/route-change复用记录，当前计算日志为0，不能把旧观测时间差当本次计算；没有据此改写原行。审计及引用在final-admission-and-data-cut.json。", "",
        "复现用nice -n19 python3 freeze-inputs.py <新目录> <run_id> --new-only；verify-projections.py <目录>；analyze.py --inputs baseline-r2 inputs-25MFNPAE37R2 inputs-2PQK67ULZY90 --output resume-25mf-2pqk/analysis-final.json；render-completed-report.py --analysis resume-25mf-2pqk/analysis-final.json --output completed-report.md；audit-completed.py。一次性inotify listener先注册再补读，收到2PQK原终局退出，无按分钟轮询/对局API/模拟/模型/重启。2PQK原ended为15:27:16.006，监听实际15:29:09才收到落行；交付延迟不改写原终局时刻或局内用时。", "",
        "H1本次限定观察完成后停下，不启动H2、G2自然验收、G3b后续或其他阶段；H0质量闸和0332根缺口保持原owner处理。", ""]
    (HERE / a.output).write_text("\n".join(lines))


if __name__ == "__main__":
    main()
