"""Render the completed observation tables; owner reviews conclusions before delivery."""
from pathlib import Path
import json

HERE = Path(__file__).resolve().parent


def cell(value):
    return str(value if value is not None else "unknown").replace("|", "／").replace("\n", " ")


def table(headers, rows):
    return "\n".join(["|" + "|".join(headers) + "|", "|" + "|".join("---" for _ in headers) + "|"]
                     + ["|" + "|".join(cell(c) for c in row) + "|" for row in rows])


def rate(value):
    return f"{value['agree']}/{value['n']} ({value['fraction']:.1%})" if value["n"] else "0/0（无可估计分母）"


def coverage(n, total):
    return f"{n}/{total} ({n/total:.1%})" if total else "0/0（不可估计）"


def summary(value):
    return "/".join(f"{value[k]:.1f}" if value.get(k) is not None else "unknown" for k in ("p50", "p90", "max"))


def boss_text(b):
    if not b: return "无更后Boss原结局，未到达或未记录"
    flag = lambda x: "过" if x is True else "未过" if x is False else "unknown"
    return f"F{b['floor']} {b['encounter']}；首试{flag(b['first_attempt_pass'])}/含SL{flag(b['final_pass'])}"


def choice_label(row, key):
    if key is None: return "unknown"
    if key == "skip": return "skip"
    card = next((r.get("card") for r in row.get("offers_and_facts") or [] if r.get("key") == key), None)
    return f"{key}:{card or 'card_ID_unknown'}"


def disagreement_kind(row):
    labels = []
    if row["jev_success_choice"] is not None and row["jev_success_choice"] != row["brain_actual"]:
        labels.append("Jev成功≠大脑")
    if row["module_first"] is not None and row["module_first"] != row["brain_actual"]:
        labels.append("数值模块≠大脑" if row["numerical_module_first"] is not None else "模块工程兜底≠大脑")
    return ";".join(labels)


def main():
    data = json.loads((HERE / "analysis-final.json").read_bytes())
    audit = json.loads((HERE / "audit-final.json").read_bytes())
    assert audit["all_mechanical_checks_passed"] and len(data["runs"]) == 3
    baseline = json.loads((HERE / "baseline-boss30-by-floor.json").read_bytes())
    agreement = data["agreements"]
    all_ = agreement["all"]
    lines = ["# H2 shadow：三完整自然局只读验收", "",
             "请求 `roy-20261017-human-pace`，原 watcher/codex1；只分析日志，未调用模型或模拟、未改线上。",
             "", f"本批 {len(data['runs'])} 局，{all_['questions']} 道拿牌题；成功 Jev 与已接受大脑实际选择一致率 {rate(all_['jev_success_vs_brain'])}。",
             f"其中有数值比较依据的模块第一名与大脑一致率 {rate(all_['numerical_module_vs_brain'])}；含工程兜底的模块记录第一名一致率 {rate(all_['module_recorded_vs_brain'])}。两者不可合称模拟最佳组。",
             "", "最终是否让 Jev 实际接管仍待 Claude/Roy 另派；本报告不启用或改变决策。", "",
             "## 准入、截点与边界", "",
             "最低启动代码3910f41的实际祖先关系、Silent/F1/非重启、H2 shadow及Boss60均逐原run-config核。S5GZG328S1LN从158d910启动，排除。新局的原始终局与启动行见 `three-terminal-event.json`；冻结范围和逐行SHA见 `inputs-final/manifest.json`，重算投影与原字节校验见 `inputs-final/provenance-verification.json`、`audit-final.json`。",
             "", "统计口径在首个合格启动前写入 `analysis-definitions.md`。一题按实际决策ID，拿牌必须同一张才算一致；空答案、未核实际动作和Jev fallback不冒成功判断。三局不是每道题都独立的因果试验。",
             "", table(["局", "启动代码", "开局", "终局", "分钟", "终点", "拿牌题"],
                 [[run, a["startup_code"][:9], a["startup"], a["end"], f"{data['runs'][run]['pacing']['duration_minutes']:.3f}",
                   f"F{data['runs'][run]['pacing']['end_floor']}", a["card_decisions"]] for a in audit["admission"] for run in [a["run"]]]), "",
             "各局知识dirty路径、相对3910的生产/知识改动及H2逐源码SHA都在 `audit-final.json`。启动提交与受检提交不等于所有dirty知识输入曾被同一宿主全检；同期H0/知识更新也是观察比较的混杂因素。", "",
             "## 1. Jev、模块与大脑的一致性", "",
             table(["大脑实际", "比较难度", "题数", "Jev成功回答/大脑", "模块记录/大脑", "数值模块/大脑", "Jev成功/模块"],
                   [[k.split("/")[0], k.split("/")[1], v["questions"], rate(v["jev_success_vs_brain"]),
                     rate(v["module_recorded_vs_brain"]), rate(v["numerical_module_vs_brain"]), rate(v["jev_success_vs_module_recorded"])]
                    for k, v in agreement["by_take_skip_and_difficulty"].items()]), "",
             "领先明显=完整Act2比较中第一名对所有对手的均值差都超过2×两者SE之和；仅MC误差，不覆盖模型错误。接近和comparison_unknown如实分开。",
             f"更广的事实unknown为 {agreement['any_broad_fact_unknown']}/{all_['questions']} 题，包括S/支撑件/第三幕/下一个Boss等；胜率比较完整也不等于全部信息已知。逐字段：`{json.dumps(agreement['unknown_fields'],ensure_ascii=False)}`。", "",
             table(["比较", "一致分子/分母"], [
                 ["Jev成功 vs 大脑实际", rate(all_["jev_success_vs_brain"])],
                 ["模块记录（含工程兜底）vs 大脑", rate(all_["module_recorded_vs_brain"])],
                 ["数值模块第一名 vs 大脑", rate(all_["numerical_module_vs_brain"])],
                 ["Jev成功 vs 模块记录", rate(all_["jev_success_vs_module_recorded"])],
                 ["Jev成功 vs 数值模块", rate(all_["jev_success_vs_numerical_module"])],
                 ["Jev记录答案（含兜底）vs 实际动作", rate(all_["jev_recorded_including_fallback_vs_actual"])] ]), "",
             f"成功回答take/skip混淆表：`{json.dumps(agreement['take_skip_confusion_success_only'],ensure_ascii=False)}`；fallback原因：`{json.dumps(agreement['fallback_reasons'],ensure_ascii=False)}`。",
             f"实际拿牌题缺sidecar {len(data['missing_card_sidecar'])}，重复sidecar {len(data['duplicate_card_sidecars'])}；缺项不从分母消失，详见analysis-final。", "",
             "逐题分歧及事后观察见 [disagreements.md](disagreements.md)；完整逐题JSON及CSV包括所有一致题。下一个Boss是实际选线后的共同结果，不能推断替代拿牌会赢，也不能把同局多题当多局支持。", "",
             "## 2. 叫醒条件（仅shadow）", "",
             table(["局", "可能转方向", "任一选项计划未覆盖", "任一触发", "计划覆盖未知"],
                   [[run, *(r["wake"][k] for k in ("any_direction_change_questions", "any_uncovered_questions", "either_condition_questions", "plan_coverage_unknown_questions"))]
                    for run, r in data["runs"].items()]), "",
             table(["局/题", "层", "方向变化", "未覆盖", "实际所选触发", "触发选项"],
                   [[r["run_id"]+"/"+str(r["decision_id"]), r["floor"], r["wake_any_direction_change"], r["wake_any_uncovered"],
                     str((r["wake_selected_direction_change"],r["wake_selected_uncovered"])),
                     ";".join(str((w["key"],w.get("card"),w.get("possible_direction_change"),w.get("uncovered_by_plan"))) for w in r["wakes"]
                              if w.get("possible_direction_change") is True or w.get("uncovered_by_plan") is True)] for r in data["wake_questions"]]), "",
             "触发未执行叫醒；null并非false。本批转方向数值比较42/42题不可评估，表中0触发不能解释成已经证明无需转向。另一方向关键件的当前牌差不是另一完整方向更好的证明。", "",
             "## 3. 方向与整幕计划覆盖", "",
             table(["当前幕/目标幕", "variant×target输出", "完整已知比例", "partial/unknown比例", "有胜率数值", "有S数值"],
                   [[k, v.get("variant_target_rows",0), coverage(v.get("known",0),v.get("variant_target_rows",0)),
                     coverage(v.get("unknown_or_partial",0),v.get("variant_target_rows",0)), v.get("numeric_win_present",0),v.get("numeric_S_present",0)]
                    for k,v in data["direction"]["variant_target_coverage"].items() if not k.endswith("target_final_sequence")]), "",
             table(["当前幕/目标幕", "不重复checkpoint×Boss", "全部variant已知", "部分或全部unknown"],
                   [[k,v["unique_checkpoint_boss_units"],v.get("all_variants_known",0),v.get("some_or_all_variants_unknown",0)]
                    for k,v in data["direction"]["checkpoint_boss_coverage"].items()]), "",
             f"方向unknown原因：`{json.dumps(data['direction']['unknown_reasons'],ensure_ascii=False)}`。stale上次结果不充本次覆盖。第三幕质量闸、最终连战联合率及生产校准未知保持，不补零。",
             f"各当前幕checkpoint数量：`{json.dumps(data['direction']['checkpoint_counts_by_current_act'],ensure_ascii=False)}`；{data['direction']['checkpoints_without_target_output']}次未输出目标列表，目标覆盖分母不能回填。最终联合对象状态计数：`{json.dumps(data['direction']['final_sequence_coverage'],ensure_ascii=False)}`。未到达的幕没有自然覆盖证据，不写100%。",
             "", table(["幕", "原接受计划更新", "原始模型字段完整", "投影覆盖", "投影结构完整", "投影内容均非空/有效"],
                   [[k,v["original_updates"],rate(v["raw_output_complete"]),rate(v["projection_coverage"]),rate(v["structure_complete"]),rate(v["content_complete"])]
                    for k,v in data["plans"]["by_act"].items()]), "",
             table(["局", "已进入幕", "该幕原计划更新", "该幕H2投影"],
                   [[run,p["act"],p["original_plan_updates"],p["sidecar_plan_projections"]] for run,r in data["runs"].items()
                    for p in r["accepted_plan_coverage_by_entered_act"]]), "",
             "原始输出按run-plans.raw核字段，不把normalize或H2投影补的默认值算模型已输出。结构字段出现、内容非空与计划质量分开；空want/avoid/alternatives数组是已输出，内容表另标非空。未定方向合法但不冒具体方向。逐更新匹配与原始字段/缺checkpoint/pivot_if等在analysis-final的plans。持有组件（真实清单或假设添加）、实际施放、存活、整局结果彼此分开；日志中的inventory满足不算合格核心。", "",
             "## 4. 新增耗时、预算与成本", "",
             table(["局", "模块", "计时n", "计时缺失", "p50/p90/max 毫秒", "记录合计秒", "timed_out", "墙钟超预算"],
                   [[run,name,t["calls_with_budget"],t["missing_budget_rows"],summary(t["actual_ms"]),f"{t['actual_ms']['sum']/1000:.3f}",t["timed_out_flag"],t["wall_over_limit"]]
                    for run,r in data["runs"].items() for name,t in r["time"].items() if isinstance(t,dict) and "calls_with_budget" in t]), "",
             table(["局", "记录增量分钟", "Jev观测题/外层ask", "成功usage", "输入/输出tokens", "已记录输入估计USD", "失败usage未知"],
                   [[run,f"{r['time']['recorded_increment_ms']/60000:.4f}",str((r["cost"]["Jev_shadow_observations"],r["cost"]["outer_Jev_ask_attempts"])),r["cost"]["successful_usage_records"],
                     str((r["cost"]["input_tokens_recorded"],r["cost"]["output_tokens_recorded"])),f"{r['cost']['estimated_USD_recorded_input_only']:.8f}",r["cost"]["fallback_without_usage_records"]]
                    for run,r in data["runs"].items()]), "",
             "预算为方向60s、拿牌事实5s、Jev独立1s。每个outer budget只加一次，不叠加stages。未记录读盘/日志/调度开销unknown，这不是因果净慢多少。Jev单次latency与request_id、模型及tokens见逐题原件；失败请求未返回usage不填0。价格是冻结仓库pricing.ts的$0.042/百万输入、输出免费估计，不是账单或外部当前价格核实。", "",
             table(["局", "实际外层Jev ask耗时 p50/p90/max毫秒", "ask次数"],
                   [[run,summary(r["time"]["Jev_latency_ms"]),r["cost"]["outer_Jev_ask_attempts"]] for run,r in data["runs"].items()]),
             "外层ask以原H2_Jev_shadow stage为证；无client或预算先已耗尽不充API调用。SDK内部HTTP重试次数没有完整记录，保持unknown。",
             f"此外有 {len(data['shadow_errors'])} 条observer级unknown/error；这些不被无声排除，详见原引用。成功metadata若输入usage为0或缺失，也单列未知用量而不认证真实零成本。", "",
             "## 5. 对局、Boss与R385采样变化", "",
             table(["局", "分钟", "超过90分钟", "Boss真实结果"],
                   [[run,f"{r['pacing']['duration_minutes']:.3f}",r["pacing"]["over_90_minutes"],
                     ";".join(boss_text(b) for b in r["pacing"]["funnel"]["bosses"])] for run,r in data["runs"].items()]), "",
             table(["预算/局", "Boss首试B2输出", "deadline partial/有预算输出", "样本p50/p90/max", "样本直方图", "pending/degraded"],
                   [[label,s["rows"],str((s["budget_truncated_rows"],s["budgeted_rows"])),summary(s["actual_samples"]),json.dumps(s["sample_histogram"]),
                     str((s["status_counts"].get("pending",0),s["status_counts"].get("degraded",0)))]
                    for label,s in [("30s/"+run,r["Boss_first_attempt_B2"]) for run,r in baseline["runs"].items()]
                    + [("60s/"+run,r["Boss_first_attempt_B2"]) for run,r in data["runs"].items()]]), "",
             "重复completion去重、候选/配对样本、请求上限、低可信标记及memo命中在analysis-final各局Boss_first_attempt_B2(_unique)。SL仍10s另列在pacing，不混入此表。旧30s的2PQK有R384已修的身份错误，H0/知识与Boss组合也在变，不能只把差异归因60s。",
             "", table(["预算/局/层", "首试B2输出", "partial/有预算输出", "样本p50/p90/max"],
                   [[label,s["rows"],str((s["budget_truncated_rows"],s["budgeted_rows"])),summary(s["actual_samples"])]
                    for label,s in [("30s/"+run+"/F"+floor,s) for run,r in baseline["runs"].items() for floor,s in r["by_Boss_floor"].items()]
                    + [("60s/"+run+"/F"+floor,s) for run,r in data["runs"].items() for floor,s in r["Boss_first_attempt_B2_by_floor"].items()]]),
             "", "超过90分钟或卡局的归因需按已记录H2增量、原budget、L2与决策间隙分别看。未采样的机器IO/故障原因不回填；慢决策和间隙的原引用在analysis-final各局pacing.attribution。", "",
             "## 6. 接管建议与停止边界", "",
             "本次只给移交候选，不执行。优先看完整胜率比较、明显领先、Jev真实成功、原计划覆盖且不触发转向的常规拿/跳题；仍需检查这批真实分母和逐题分歧，不能凭总体一致率移交unknown或超时兜底题。接近题、可能转方向、计划外、资源/目标未知的题继续保留大脑。若本批没有完整比较或成功Jev覆盖，就没有数据支持将任何题型正式交给Jev。",
             "", "只有3个独立局的后继Boss结果；它们不能证明拿牌判断正确或胜率收益。后续范围与准入标准由Claude/Roy另派，本线程不启用on、不改预算、不开展H3/H4或新研究。", "",
             "## 复现", "",
             "原单次监听已终局退出0，不再启动。评分用本目录冻结投影，历史对照复用H1冻结目录，路径/SHA在baseline清单；字节溯源校验另只读原logs的指定范围。用nice19单进程依次运行verify-inputs.py、baseline-boss30.py、analyze.py、audit-analysis.py、render-review.py、render-report.py，不运行游戏/模型/模拟。原始流缺失时不能冒原字节复核成功；只评分可直接使用已核冻结投影。不得再覆盖inputs-final或重复启动监听，历史与失败另存。", ""]
    review = (HERE / "owner-review.md").read_text()
    lines[2:2] = [review, ""]
    (HERE / "report.md").write_text("\n".join(lines))
    disagreements = ["# H2逐题分歧与真实后继", "", "包括成功Jev或模块记录与大脑不同的题；模块工程fallback与数值第一名逐项标明。没有受控替代选择，不写反事实胜负。", ""]
    disagreements.append(table(["局/题", "层", "分歧类型", "大脑", "Jev成功", "Jev失败/兜底", "模块/依据", "比较难度", "实际后继Boss"],
                              [[r["run_id"]+"/"+str(r["decision_id"]),r["floor"],disagreement_kind(r),choice_label(r,r["brain_actual"]),
                                choice_label(r,r["jev_success_choice"]),r["jev_fallback"] or "无（真实成功）",
                                str((choice_label(r,r["module_first"]),r["module_first_basis"])),r["difficulty"],boss_text(r["next_observed_boss"])] for r in data["disagreements"]]))
    disagreements += ["", "每题候选牌ID、数值、unknown、叫醒标记和原决策/sidecar/Boss源offset/len/SHA在`analysis-final.json:disagreements`；可由`per-question.csv`的decision_id定位。"]
    disagreements += ["", "## 实际由代码或兜底选择的5题（不混入成功大脑分母）", "",
        table(["局/题", "层", "实际decider", "实际动作", "Jev成功答案"],
              [[r["run_id"]+"/"+str(r["decision_id"]),r["floor"],r["actual_decider"],
                choice_label(r,r["actual_action"]),choice_label(r,r["jev_success_choice"])]
               for r in data["card_questions"] if r["brain_actual"] is None])]
    (HERE / "disagreements.md").write_text("\n".join(disagreements) + "\n")
    print(json.dumps({"report": "report.md", "disagreements": len(data["disagreements"]), "owner_review_required": True}))


if __name__ == "__main__":
    main()
