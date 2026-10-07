#!/usr/bin/env python3
"""Silent-only global calibration. Frozen whole-run time split; validation never fits parameters."""
import hashlib
import json
import math
from pathlib import Path
import statistics
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from calib import block, fit_platt, logit, sigmoid
from split import split
from trust import BOSS_KEYS, NAMES, STARTS, judge
from cadence import cadence

GROUPS = {"A0–4": (0, 4), "A5–9": (5, 9), "A10": (10, 10)}
MIN_GROUP = 10


def prediction(row, model):
    return sigmoid(model["a"] + model["b"] * logit(row["sim"]["winProb"], row["sim"]["samples"])
                   + model.get("c", 0) * (row["asc"] - 5) / 5)


def mapped(rows, model):
    return [{**r, "sim": {**r["sim"], "winProb": prediction(r, model)}} for r in rows]


def residuals(rows, model, turns):
    result = {}
    for name, (lo, hi) in GROUPS.items():
        mine = [r for r in rows if lo <= r["asc"] <= hi]
        b = block(mapped(mine, model), turns)
        result[name] = {"n": 0, "gap": None} if not b else {
            "n": b["n"], "gap": b["mean_pred"] - b["actual_win"], "brier": b["brier"],
            "mean_pred": b["mean_pred"], "actual_win": b["actual_win"], "leak_ratio": b["leak"]["enemy_ratio"]}
    return result


def solve(matrix, vector):
    a = [list(row) + [v] for row, v in zip(matrix, vector)]
    for k in range(len(a)):
        at = max(range(k, len(a)), key=lambda i: abs(a[i][k]))
        a[k], a[at] = a[at], a[k]
        if abs(a[k][k]) < 1e-12:
            return None
        div = a[k][k]
        a[k] = [x / div for x in a[k]]
        for i in range(len(a)):
            if i != k:
                div = a[i][k]
                a[i] = [x - div * y for x, y in zip(a[i], a[k])]
    return [r[-1] for r in a]


def fit(rows, ascension=False):
    if not rows or len({r["actual"]["won"] for r in rows}) < 2:
        return None
    a, b = fit_platt(rows)
    model = {"a": a, "b": b, "c": 0.0}
    if not ascension:
        return model if b > 0 else None
    beta = [a, max(0, b), 0.0]
    # Fixed weak regularization and a nonnegative probability slope. No validation choices.
    for _ in range(80):
        grad = [0.01 * x for x in beta]
        hess = [[0.01 if i == j else 0.0 for j in range(3)] for i in range(3)]
        for row in rows:
            x = [1, logit(row["sim"]["winProb"], row["sim"]["samples"]), (row["asc"] - 5) / 5]
            p = sigmoid(sum(v * w for v, w in zip(beta, x)))
            y = int(row["actual"]["won"])
            for i in range(3):
                grad[i] += (p - y) * x[i]
                for j in range(3):
                    hess[i][j] += p * (1 - p) * x[i] * x[j]
        delta = solve(hess, grad)
        if delta is None:
            return None
        scale = max(1, max(abs(d) for d in delta))
        beta = [v - d / scale for v, d in zip(beta, delta)]
        beta[1] = max(0.000001, beta[1])
        if sum(abs(d) for d in delta) < 1e-8:
            break
    return dict(zip(("a", "b", "c"), [round(v, 6) for v in beta]))


def select_model(tune, turns):
    base = fit(tune)
    if base is None:
        return None, {"reason": "insufficient outcomes or nonmonotone fit"}
    res = residuals(tune, base, turns)
    systematic = any(b["n"] >= MIN_GROUP and abs(b["gap"]) > 0.15 for b in res.values())
    info = {"rule": "tune group n>=10 and |gap|>0.15; asc term only if 3-fold whole-run tune CV Brier improves >=0.005",
            "base_tune_residuals": res, "systematic": systematic, "selected_ascension": False}
    if not systematic:
        return base, info
    runs = sorted({r["run"] for r in tune})
    folds = {run: i % 3 for i, run in enumerate(runs)}
    errors = [[], []]
    for fold in range(3):
        train = [r for r in tune if folds[r["run"]] != fold]
        check = [r for r in tune if folds[r["run"]] == fold]
        for at, asc in enumerate((False, True)):
            m = fit(train, asc)
            if m is None:
                return base, {**info, "cv_unavailable": True}
            errors[at].extend((prediction(r, m) - int(r["actual"]["won"])) ** 2 for r in check)
    scores = [statistics.fmean(e) for e in errors]
    info["tune_cv_brier"] = scores
    info["selected_ascension"] = scores[1] <= scores[0] - 0.005
    return (fit(tune, True) if info["selected_ascension"] else base), info


def frozen_split(fights, previous=None):
    if any(r.get("character") != "silent" for r in fights):
        raise ValueError("foreign/missing character in frozen dataset")
    if previous:
        tune = list(previous["tune"])
        old_val = list(previous["val"])
        listed = set(tune) | set(old_val)
        if not listed <= {r["key"] for r in fights}:
            raise ValueError("frozen tune/validation data missing; do not move the cutoff")
        cutoff = previous["cutoff_ts"]
        run_first = {}
        for r in fights:
            run_first[r["run_id"]] = min(run_first.get(r["run_id"], r["first_ts"]), r["first_ts"])
        val = old_val + [r["key"] for r in fights if r["key"] not in listed]
        if any(run_first[k.split(":")[0]] < cutoff for k in val):
            raise ValueError("new data before frozen cutoff")
    else:
        tune, val, cutoff = split(fights, 2 / 3)
    if not tune or not val:
        raise ValueError("both tune and validation runs are required")
    return {"tune": tune, "val": val, "cutoff_ts": cutoff, "tune_n": len(tune), "val_n": len(val),
            "rule": "first usable actual-outcome boss opening time by whole run, earliest ~2/3; all SL attempts of a run stay together"}


def calibrate(results, fights, turns, split_data, provenance):
    if any(r.get("character") != "silent" for r in fights):
        raise ValueError("foreign/missing character in calibration fights")
    allowed = {r["key"] for r in fights}
    if any(r.get("character") != "silent" or r["key"] not in allowed for r in results):
        raise ValueError("foreign/missing character in calibration results")
    if len({(r["key"], r["start"]) for r in results}) != len(results):
        raise ValueError("duplicate results")
    tune_keys, val_keys = set(split_data["tune"]), set(split_data["val"])
    if tune_keys & val_keys:
        raise ValueError("split overlap")
    if {k.split(":")[0] for k in tune_keys} & {k.split(":")[0] for k in val_keys}:
        raise ValueError("run/deck leakage")
    if tune_keys | val_keys != allowed:
        raise ValueError("split does not cover the frozen fights exactly")
    out = {"character": "silent", "schema": 1, "source": provenance, "split": split_data,
           "criteria": {"min_fights": 10, "brier_ratio": 1.25, "max_gap": 0.15, "leak_range": [0.7, 1.3], "starts": STARTS},
           "overall": {}, "bosses": {}, "trusted_b2": [], "trusted_b3": [], "low_trust_b2": {}, "low_confidence_b3": {},
           "ascension_low": {"b2": {}, "b3": {}}, "stage_low": {"b2": {}, "b3": {}}, "stage_metrics": {},
           "residuals": {}, "selection": {}, "errors": []}
    for use, start in STARTS.items():
        mine = [r for r in results if r["start"] == start and r.get("sim")]
        tune = [r for r in mine if r["key"] in tune_keys]
        val = [r for r in mine if r["key"] in val_keys]
        model, selection = select_model(tune, turns)
        out["selection"][start] = selection
        # Missing models cannot borrow another character's calibration.
        m = model or {"a": 0, "b": 1, "c": 0}
        mapped_val = mapped(val, m)
        overall = block(mapped_val, turns)
        out["overall"][start] = {**(overall or {"n": 0, "brier": None}), "platt": model, "tune_n": len(tune)}
        residual = {side: residuals(rows, m, turns) for side, rows in (("tune", tune), ("val", val))}
        out["residuals"][start] = residual
        a10 = residual["val"]["A10"]
        if a10["n"] < 10 or a10["gap"] is None or abs(a10["gap"]) > 0.15:
            out["ascension_low"][use]["10"] = f"A10验证 n={a10['n']}，残差={a10['gap']}；F49为独立战，不是整局通关"
        max_asc = max(provenance.get("completed_max_asc", 10), max((r["asc"] for r in fights), default=10))
        for asc in range(11, max_asc + 1):
            scope = [r for r in mapped_val if r["asc"] == asc]
            metrics = block(scope, turns)
            gap = metrics["mean_pred"] - metrics["actual_win"] if metrics else None
            if len(scope) < 10 or gap is None or abs(gap) > 0.15:
                out["ascension_low"][use][str(asc)] = f"A{asc}验证 n={len(scope)}，残差={gap}；新进阶验证不足或偏差超标，保持低信度"
        stages = {side: block(mapped([r for r in rows if r.get("floor") == 49], m), turns)
                  for side, rows in (("tune", tune), ("val", val))}
        out["stage_metrics"][start] = {"F49": stages}
        f49 = stages["val"] or {"n": 0, "brier": 1, "mean_pred": 0, "actual_win": 0, "leak": {"enemy_ratio": None}}
        stage_fails = judge(f49, overall["brier"] if overall else 0)
        if f49["leak"].get("enemy_ratio") is None:
            stage_fails.append(("leak_missing", "missing leak", "打穿比无记录"))
        if stage_fails:
            out["stage_low"][use]["49"] = "F49独立战：" + "; ".join(f[2] for f in stage_fails)
        for enc, key in BOSS_KEYS.items():
            b = block([r for r in mapped_val if r["enc"] == enc], turns)
            b = b or {"n": 0, "brier": 1.0, "mean_pred": 0.0, "actual_win": 0.0, "leak": {"enemy_ratio": None, "n": 0}}
            fails = judge(b, overall["brier"] if overall else 0)
            if b["leak"].get("enemy_ratio") is None:
                fails.append(("leak_missing", "HP-through-block ratio unavailable", "被打穿的血比值不足，不能准入"))
            if model is None:
                fails.append(("calibration", "global calibration unavailable", "整体校准不足"))
            item = {"n": b["n"], "missing": max(0, 10 - b["n"]), "brier": b["brier"], "mean_pred": b["mean_pred"],
                    "actual_win": b["actual_win"], "leak_ratio": b["leak"].get("enemy_ratio"), "leak_turns": b["leak"].get("n", 0),
                    "failed": [f[0] for f in fails]}
            out["bosses"].setdefault(key, {"name": NAMES[enc]})[start] = item
            if fails:
                out["low_trust_b2" if use == "b2" else "low_confidence_b3"][key] = "; ".join(f[2] for f in fails)
            else:
                out["trusted_" + use].append(key)
        out["errors"].extend({"key": r["key"], "start": start, "error": r.get("error") or r.get("simError") or "no simulation"}
                             for r in results if r["start"] == start and not r.get("sim"))
    return out


def render(data, sources, extraction):
    source_summary = {k: v for k, v in data["source"].items() if k != "input_files"}
    lines = ["# 静默 boss 模拟校准", "", "Roy 授权的是角色隔离、整体 Platt、时间切分、原准入标准和定期重跑架构；下面样本、实胜败、拟合、残差及准入结论只来自已结束的 SILENT 对局。boss侧参数复用用户准许的既有模型/monster-db（含common），另记来源，不把它当作静默对局样本或校准参数。没有新增打法或策略阈值。", "",
             f"提取：{extraction['finished_runs']} 局，{extraction['attempts']} 次尝试；{extraction['written']} 次有实际结局且取得首回合帧（模拟成功数另列）。冻结到已结束局 `{extraction.get('snapshot_ended_max')}`；未进入 boss 的局号/版本及完整筛选列表在 extraction.json。提取排除原因：`{json.dumps(extraction['exclusions'], ensure_ascii=False)}`。",
             f"可用 {extraction.get('usable_runs')} 局，实际结局 `{extraction.get('usable_outcomes')}`，各进阶场数 `{extraction.get('usable_by_asc')}`。",
             "SL predicted_death 是未实结算的截断样本，来源保留，不标实际败局；同一局全部 boss/SL 共享切分。校准胜率以有实际结局的尝试为条件，存在 SL 截断选择偏差，不是所有初试胜率或允许SL的整局通关率。开场我方资源取日志，boss HP/伤害/招式沿现有 monster-db 按进阶输入、缺级取最近观测，未重拟合 boss 侧。", "",
             f"SL口径：boss房间 {extraction.get('boss_rooms')}；初试结局 `{extraction.get('first_attempt_outcomes')}`，重试结局 `{extraction.get('retry_outcomes')}`；没有实际结局的房间 `{extraction.get('rooms_without_actual_outcome')}`。失败重载仍不能补造实际败局；具体 reload 原记录随来源保留。", "",
             f"固定来源/模型：`{json.dumps(source_summary, ensure_ascii=False)}`。所有输入文件 SHA256 在同批 provenance.json。筛选读取总日志索引元信息，但没有纳入铁甲对局样本或校准参数，角色统计输入只取静默目录。common monster-db 是用户准许复用的既有模型；它已有的观测数值固定使用，验证的是静默胜率映射，不宣称从零预测未观测 boss 机制。",
             f"固定切点 `{data['split']['cutoff_ts']}`（UTC，与日志ts同口径），调参 {data['split']['tune_n']} 场、验证 {data['split']['val_n']} 场；验证覆盖后期代码，完整版本逐项在来源表。每起点 200 样本，固定 seed=1（逐战seed=1+原始行号×101），模拟策略/费用/药水/保血/目标/SL阈值保持原样。", "",
             "进阶项只作一个整体模型的统计校正，不解释为进阶机制的因果效应；版本、资源和SL选择与进阶共变。某进阶段验证 n=0 时，只有调参残差，没有该段独立的样本外可靠性证据。上线保留后来其他批次的代码修复和知识刷新；本表仅验证所列固定模型，不冒称后续模型版本已通过相同验证，下一次定期重跑固定当时的模型。", "",
             "B2 用首回合起点；B3 用既有 pre/redeal 方法：实际首回合资源、全副牌重洗并重新抽开场手牌，不使用后续观测。B2 中途沿同一整体首回合映射，其独立中途校准未验证；铁甲映射保持原值。", "",
             "A10 的 F48 胜只算该战胜利，不算整局通关；F49 是另一场独立 boss 战，以下列出本角色来源。怪物数值来源的 exact/nearest 及伤害估值在 results 的 bossSource 内，common 是用户准许复用的既有模型，校准参数不复用铁甲。", ""]
    f49 = [r for r in sources if r.get("floor") == 49 and not r.get("excluded")]
    lines += ["## A10 数值与 F49 范围", "", f"数值审计：`{json.dumps(data['source'].get('boss_input_scope', {}), ensure_ascii=False)}`。完整开场及后续攻击定义的数值来源另见 opening-audit.json / model-input-audit.json，缺级沿既有 nearest/ratio 方法。", "",
              f"F49 实际结局 {len(f49)} 场；这个数量不足单独验证第二场 boss 的可靠性，仍只评估实际进入每战时的资源和单战胜败，没有评估 F48→F49 联合通关胜率。", "",
              "| 局号 | boss | 尝试 | 回合 | 结局 | 代码 |", "|---|---|---|---|---|---|"]
    for r in f49:
        lines.append(f"| {r['run_id']} | {r['encounter']} | {r['attempt']} | {r['turns']} | {r['outcome']} | {r.get('code')} |")
    lines += [""]
    for use, start in STARTS.items():
        o = data["overall"][start]
        lines += [f"## {use.upper()} / {start}", "", f"参与拟合的模拟成功调参 n={o['tune_n']}（候选{data['split']['tune_n']}）；整体验证成功 n={o['n']}（候选{data['split']['val_n']}），校准 Brier={o['brier']}；Platt={o['platt']}。失败记录未补造预测或实际胜败。", "",
                  f"进阶项选择（只看调参）：`{json.dumps(data['selection'][start], ensure_ascii=False)}`。", "",
                  "| 集 | 进阶 | n | 预测 | 实际 | 残差（预测−实际） | Brier | 打穿比 |", "|---|---|---|---|---|---|---|---|"]
        for side, groups in data["residuals"][start].items():
            for group, b in groups.items():
                lines.append(f"| {side} | {group} | {b['n']} | {b.get('mean_pred')} | {b.get('actual_win')} | {b['gap']} | {b.get('brier')} | {b.get('leak_ratio')} |")
        lines += ["", "原准入标准：验证≥10、Brier≤整体1.25倍、胜率差≤15个百分点、打穿比0.7–1.3；缺指标也保持低可信。", "",
                  "| boss | 验证 n | 还差 | Brier | 预测/实际 | 打穿比 | 失败指标 | 可信 |", "|---|---|---|---|---|---|---|---|"]
        for key, entry in sorted(data["bosses"].items()):
            b = entry[start]
            lines.append(f"| {entry['name']} ({key}) | {b['n']} | {b['missing']} | {b['brier']} | {b['mean_pred']}/{b['actual_win']} | {b['leak_ratio']} | {','.join(b['failed']) or '无'} | {'低' if b['failed'] else '达标'} |")
        lines += ["", f"A10 附加限制：`{json.dumps(data['ascension_low'][use], ensure_ascii=False)}`。", ""]
        lines += [f"F49单独调参/验证指标（同一整体映射）：`{json.dumps(data['stage_metrics'][start], ensure_ascii=False)}`。验证还差 {max(0, 10 - ((data['stage_metrics'][start]['F49']['val'] or {}).get('n', 0)))} 场；范围限制：`{json.dumps(data['stage_low'][use], ensure_ascii=False)}`。", ""]
    lines += ["## 定期刷新", "", "运维调度 tick（每小时 :13/:43，另在学习批次完成事件检查）读取已完成的静默局和 boss 尝试；升阶或新增20次实际结局 boss尝试时启动独占校准任务。SL截断不凑20场。入口 agent/tools/boss-sim/refresh-silent.py；旧切点/调参keys固定，新局只进验证；生成独立内容指纹目录，重复输入跳过，旧报告和来源留存。达标名单由 trust.py --character silent 自动生成，仍由学习者依锁内测试/合入流程发布和增加唯一版本，运维核实际后登记shipped。只写静默 boss-trust，不刷新其他角色数据。", "",
              "## 无 boss 记录的已结束局", "", "| 局号 | A | 结束层 | 代码 | 排除原因 |", "|---|---|---|---|---|"]
    for r in extraction.get("runs_without_boss", []):
        lines.append(f"| {r['run_id']} | {r['asc']} | {r.get('floor')} | {r.get('code')} | {r['reason']} |")
    lines += ["",
              "## 完整来源清单", "", "原始 states byte offset/len/SHA256、SL区间、逐战回合和排除原因另存 sources.jsonl；每项以下列出，不把模型错误/缺记录冒报通过。", "",
              "| 局号 | boss | A | 层 | 尝试 | 回合 | 代码（局级，dirty不冒充复原） | 切分 | 结局/排除 |", "|---|---|---|---|---|---|---|---|---|"]
    tune = set(data["split"]["tune"])
    for r in sources:
        lines.append(f"| {r['run_id']} | {r.get('encounter')} | {r.get('asc')} | {r['floor']} | {r['attempt']} | {r.get('turns')} | {r.get('code')} | {'排除' if r.get('excluded') else 'tune' if r.get('key') in tune else 'val'} | {r.get('excluded') or r.get('outcome')} |")
    lines += ["", f"模拟失败原件：`{json.dumps(data['errors'], ensure_ascii=False)}`。"]
    return "\n".join(lines) + "\n"
