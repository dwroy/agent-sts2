"""Render the owner's scoped conclusions and the all/SL B2 supplement from audited evidence."""
from pathlib import Path
import hashlib
import json

HERE = Path(__file__).resolve().parent


def main():
    data = json.loads((HERE / "analysis-final.json").read_bytes())
    audit = json.loads((HERE / "audit-final.json").read_bytes())
    assert audit["analysis_sha256"] == hashlib.sha256((HERE / "analysis-final.json").read_bytes()).hexdigest()
    assert audit["all_mechanical_checks_passed"]
    baseline = json.loads((HERE / "baseline-boss30-by-floor.json").read_bytes())
    assert len(data["card_questions"]) == 42 and data["agreements"]["all"]["jev_success_vs_brain"] == {"agree":18,"n":37,"fraction":18/37}
    assert all(r["module_first"] == "skip" and r["numerical_module_first"] is None for r in data["card_questions"])
    assert len(data["plans"]["records"]) == 23 and sum(r["raw_output_complete"] for r in data["plans"]["records"]) == 19
    assert len(data["direction_before_terminal"]["checkpoints"]) == 39
    bxu = data["runs"]["BXU0CKWKH2RU"]
    attempts = bxu["timing_attribution"]["Boss_attempt_wall"]
    boss_minutes = sum(r["wall_minutes"] for r in attempts if r["floor"] in (33,48))
    retry_minutes = sum(r["wall_minutes"] for r in attempts if r["attempt"] > 1)
    summary = f"""## 验收结论与建议

**本批不建议任何拿牌或跳过题切到Jev实际决定。** 三局观察已完成，不代表具备on条件。42/42题都有成功Jev响应，37题有大脑实际选择可比较，一致18/37（48.65%）；另外4题code-fallback、1题code单列。拿牌一致11/28，跳过一致7/9。

按Jev输出反向看：Jev要拿的14题与大脑同牌11题；Jev要跳过且有大脑答案的23题仅7题相同，16题大脑实际要拿。因此不能据事后“大脑跳过组7/9”部署自动跳过。真正的Jev/大脑分歧19题；另11题只有模块工程兜底不同，合并30题明细不冒成30次Jev分歧。

42/42题都缺完整目标组胜率比较，没有“领先明显”或“接近”的可评估组；模块第一名全部是skip工程兜底。故模块/大脑9/37是兜底一致率，不是模拟排序效果。Jev/模块28/42也不能认证模块质量。三局后继Boss结果只属于实际选线，不是每题独立结果，更不是换牌因果证明。

42/42题都至少有一个候选触发计划外叫醒条件，可能转方向的数值条件则无可用比较，不能把未触发当作已证无需转向。现条件没有给出可不唤醒大脑的题目子集。只有23个接受计划，原始结构完整19/23（82.6%），投影覆盖23/23；1条F23/hp_drop的L2超时没有生成计划，另列而不混进完整率。具体方向仅6/23；其余未定或未提供，不能把默认值当模型输出。

方向全量41个checkpoint，分幕18/14/9；其中2次为GAME_OVER/finalize。决策期39次分幕18/13/8，目标数值已知率仍为0。第二幕主要受`hypothetical_inventory_has_unmodelled_relics`和既有可信闸阻断，第三幕/最终联合保持既定unknown。库存组件满足、实际施放、存活和整局结局分开，不授予核心资格，也不把unknown当胜率0。r1曾把无plan错误行计入actNone，旧分析与audit已保留；原输入始终未改。

H2工作耗时合计每局6.549/6.682/12.279秒，无一次超其声明预算；42次Jev外层调用均成功，最长0.890秒。三局44,260输入token，按冻结本地价格表估计总约$0.001859；实际账单未取，不声称账单成本。分项p50/p90/max及每题原引用在正文/数据。

Boss首试B2由旧两局4/44个有预算输出截断，变为本批0/47；中位样本仍200，不能说普遍增样或证明60秒改善胜率。SL仍10秒，仍有截断；[B2全量与SL分层表](b2-all-and-sl.md)补足所有输出口径，不能把首试0截断外推全体。Boss组合、R384和知识变化保持混杂边界。

BXU0为{bxu['pacing']['duration_minutes']:.3f}分钟，超90目标{bxu['pacing']['duration_minutes']-90:.3f}分钟。一次节点读回已GAME_OVER/F48且控制进程退出，无长期停同一题证据。51次L2记录合计33.406分钟（p90 80.291秒/最大89.988秒）；F33、F48各6试，窗口合计{boss_minutes:.3f}分钟，其中10次重试{retry_minutes:.3f}分钟。这些窗口与阶段耗时不能重复相加。H2本局仅12.279秒，无法解释91.689分钟；B2/B3记录2.848/4.573分钟、动作dispatch11.578分钟，compute proxy55.182分钟。未测的动画、等待与IO保持未分解，不据此修改SL或药水规则。

建议先由Claude/Roy决定如何补齐真实inventory/目标数值覆盖及计划外条件过宽；需要游戏机制的部分仍沿学习者证据链，本线程不派发。后续优先验证“明确计划、完整比较、明显领先、非转向/计划外”的常规题；本批满足集合为0，不能批准on。只交报告后停止，不开始新阶段。
"""
    (HERE / "owner-review.md").write_text(summary)
    rows = []
    for run, value in baseline["runs"].items():
        for group, field in (("all_B2", "all_B2"), ("Boss_first_attempt", "Boss_first_attempt_B2"), ("SL_retry_10s", "SL_retry_B2")):
            rows.append(("Boss30/"+run, group, value[field]))
    for run, value in data["runs"].items():
        for group, sim in (("all_B2", value["pacing"]["B2"]), ("Boss_first_attempt",value["Boss_first_attempt_B2"]), ("SL_retry_10s",value["SL_retry_B2"])):
            rows.append(("Boss60/"+run, group, sim))
    lines = ["# B2：所有输出、Boss首试与SL重试分层", "", "只有Boss首试预算从30到60；SL重试始终10秒。统计输出行，重复completion与缺ID的边界另在analysis-final。", "",
             "|局|范围|输出行|deadline partial/有预算输出|样本p50/p90/max|样本直方图|", "|---|---|---|---|---|---|"]
    for run, group, sim in rows:
        ns = sim["actual_samples"]
        lines.append(f"|{run}|{group}|{sim['rows']}|{sim['budget_truncated_rows']}/{sim['budgeted_rows']}|{ns['p50']}/{ns['p90']}/{ns['max']}|{json.dumps(sim['sample_histogram'])}|")
    lines += ["", "partial只计有budget标记且无failure的正常截断；C1 pending/degraded不伪装deadline，C2提前完成及低可信cap不伪装截断。前后Boss/知识/模型与R384不同，不作随机因果解释。"]
    (HERE / "b2-all-and-sl.md").write_text("\n".join(lines)+"\n")
    print(json.dumps({"review":"owner-review.md","B2_supplement":"b2-all-and-sl.md","no_on_recommended":True}))


if __name__ == "__main__":
    main()
