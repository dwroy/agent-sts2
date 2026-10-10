"""Read-only, bounded log extraction and reproducible 20-run funnel report.

Run with: nice -n 10 data/logdb-venv/bin/python <this-file>
Replay without reading changing logs: <this-file> --replay
"""
import collections
import datetime as dt
import hashlib
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
sys.path.insert(0, str(ROOT / "eval"))
sys.path.insert(0, str(ROOT / "agent/tools/logdb"))
import brain_source
import query
import sync

LOCAL = dt.timezone(dt.timedelta(hours=8))
STAGES = ["start", "boss1", "act2", "boss2", "act3", "boss3_first", "boss3_second", "win"]
LABELS = ["开局", "一幕 boss", "进入二幕", "二幕 boss", "进入三幕", "三幕首 boss", "三幕第二 boss", "通关"]


def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def instant(value):
    stamp = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    return stamp.astimezone(dt.timezone.utc) if stamp.tzinfo else stamp.replace(tzinfo=dt.timezone.utc)


def extract():
    logs = ROOT / "logs"
    limits = {name: (logs / name).stat().st_size for name in ["runs.jsonl", "brain.jsonl", "sl-attempts.jsonl"]}
    provenance = {}
    rows = {}
    finished_ids = set()
    for name, limit in limits.items():
        digest = hashlib.sha256()
        selected = []
        with (logs / name).open("rb") as handle:
            off = 0
            for raw in handle:
                if off + len(raw) > limit:
                    break
                digest.update(raw)
                row = json.loads(raw)
                relevant = (str(row.get("character", "")).lower() == "silent" and row.get("ascension") == 10
                            if name == "runs.jsonl" else row.get("run_id") in finished_ids)
                if relevant:
                    if name == "runs.jsonl":
                        lean = row
                        finished_ids.add(row["run_id"])
                    elif name == "brain.jsonl":
                        lean = {k: row.get(k) for k in ["run_id", "engine", "ts", "question_id", "label", "error", "problems", "accepted"]}
                        answer = row.get("answer")
                        lean["answer"] = (None if answer is None else
                                          {k: answer.get(k) for k in ["route", "run_plan"]} if isinstance(answer, dict) else True)
                    else:
                        lean = {k: row.get(k) for k in ["run_id", "ts", "floor", "act", "result", "attempt"]}
                    selected.append({"off": off, "len": len(raw), "sha256": hashlib.sha256(raw).hexdigest(), "row": lean})
                off += len(raw)
        provenance[name] = {"path": str(logs / name), "frozen_byte_limit": limit,
                            "complete_line_bytes": off, "prefix_sha256": digest.hexdigest(), "selected_rows": len(selected)}
        rows[name] = selected
    db = ROOT / "data/logdb"
    with sync.read_lock(str(db), wait=False) as got:
        if not got:
            raise RuntimeError("LogDB read lock busy; no sync or scheduler mutation attempted")
        manifest_bytes = (db / "manifest.json").read_bytes()
        manifest = json.loads(manifest_bytes)
        con = query.connect(str(db), threads=2)
        ids = sorted(finished_ids)

        def select(sql):
            cur = con.execute(sql, [ids])
            names = [d[0] for d in cur.description]
            return [{k: query.plain(v) for k, v in zip(names, row)} for row in cur.fetchall()]

        runs = select("SELECT run_id, started, ended, floor, max_floor, max_act, victory, finished, code FROM runs WHERE list_contains(?,run_id)")
        acts = select("SELECT run_id, act, min(off) AS first_off, min(ts) AS first_ts, max(floor) AS max_floor FROM frames WHERE list_contains(?,run_id) AND act IS NOT NULL GROUP BY run_id,act")
        bosses = select("""SELECT f.run_id, f.act, f.floor, min(f.off) AS first_off, min(f.ts) AS first_ts,
                            arg_min([e.id FOR e IN f.enemies], f.off) AS encounter
                            FROM frames f JOIN floor_rooms r ON r.run_id=f.run_id AND r.floor=f.floor
                            WHERE list_contains(?,f.run_id) AND f.screen='COMBAT' AND len(f.enemies)>0 AND r.node='Boss'
                            GROUP BY f.run_id,f.act,f.floor"""
                        )
        con.close()
    (OUT / "logdb-manifest.json").write_bytes(manifest_bytes)
    provenance["logdb"] = {"manifest_path": str(db / "manifest.json"), "manifest_sha256": hashlib.sha256(manifest_bytes).hexdigest(),
                            "state_byte_limit": manifest["sources"]["states"]["offset"], "sync_attempted": False,
                            "query_implementation": "observed COMBAT + Boss room, distinct run/act/floor; observed act-entry frames"}
    provenance["algorithms"] = {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
                                for path in [ROOT / "eval/brain_source.py", ROOT / "eval/metrics.py", ROOT / "agent/tools/logdb/views.sql"]}
    return {"recorded_at": dt.datetime.now(LOCAL).isoformat(), "provenance": provenance,
            "bounded_raw_rows": rows, "db_runs": runs, "observed_acts": acts, "observed_bosses": bosses}


def analyze(evidence):
    raw = {item["row"]["run_id"]: item["row"] for item in evidence["bounded_raw_rows"]["runs.jsonl"]}
    brain = collections.defaultdict(list)
    sl = collections.defaultdict(list)
    for item in evidence["bounded_raw_rows"]["brain.jsonl"]:
        brain[item["row"]["run_id"]].append(item["row"])
    for item in evidence["bounded_raw_rows"]["sl-attempts.jsonl"]:
        if item["row"].get("result") == "predicted_death":
            sl[item["row"]["run_id"]].append(item)
    db = {r["run_id"]: r for r in evidence["db_runs"]}
    assert set(db) == set(raw), "Completed raw runs missing from LogDB"
    included, excluded = [], []
    for rid, end in raw.items():
        source = brain_source.classify(brain[rid])
        if not source["eligible"]:
            excluded.append({"run_id": rid, "brain_source": source})
            continue
        observed = db[rid]
        assert observed["finished"] and observed["floor"] == end["floor"]
        assert observed["max_floor"] >= end["floor"], "Observed frames do not cover the completed final floor"
        death = sl[rid][0]["row"] if sl[rid] else None
        acts = [r for r in evidence["observed_acts"] if r["run_id"] == rid]
        bosses = sorted([r for r in evidence["observed_bosses"] if r["run_id"] == rid], key=lambda r: r["first_off"])

        def funnel(first):
            def reached(row):
                return not first or not death or instant(row["first_ts"]) <= instant(death["ts"])
            reached_acts = {r["act"] for r in acts if reached(r)}
            reached_bosses = [r for r in bosses if reached(r)]
            act3 = [r for r in reached_bosses if r["act"] == 3]
            return dict(zip(STAGES, [True, any(r["act"] == 1 for r in reached_bosses), 2 in reached_acts,
                                    any(r["act"] == 2 for r in reached_bosses), 3 in reached_acts,
                                    len(act3) >= 1, len(act3) >= 2, bool(end["victory"]) and not (first and death)]))
        included.append({"run_id": rid, "started": end.get("started"), "ended": end["ended"], "code": end.get("code"),
                         "final_floor": end["floor"], "first_floor": death["floor"] if death else end["floor"],
                         "first_predicted_death": death, "brain_source": source,
                         "observed_bosses": bosses, "final": funnel(False), "first": funnel(True)})
    included.sort(key=lambda r: r["ended"], reverse=True)

    def totals(rows, kind):
        return {stage: sum(int(r[kind][stage]) for r in rows) for stage in STAGES}

    segments = []
    for i in range(0, len(included), 20):
        group = included[i:i+20]
        item = {"range": [i+1, i+len(group)], "n": len(group), "run_ids": [r["run_id"] for r in group],
                "ended_range_local": [instant(group[-1]["ended"]).astimezone(LOCAL).strftime("%m-%d %H:%M"),
                                      instant(group[0]["ended"]).astimezone(LOCAL).strftime("%m-%d %H:%M")]}
        for kind in ["final", "first"]:
            counts = totals(group, kind)
            item[kind] = counts
            item[kind+"_rate_of_starts"] = {k: 100*v/len(group) for k,v in counts.items()}
            item[kind+"_conditional_rate"] = {current: (100*counts[current]/counts[previous] if counts[previous] else None)
                                               for previous,current in zip(STAGES, STAGES[1:])}
        segments.append(item)
    for run in included:
        for kind in ["first", "final"]:
            values = list(run[kind].values())
            assert all(a >= b for a,b in zip(values,values[1:])), (run["run_id"],kind,values)
        assert all(run["first"][k] <= run["final"][k] for k in STAGES)
    assert len(set(r["run_id"] for r in included)) == len(included)
    assert sum(s["n"] for s in segments) == len(included)
    baseline = json.loads((ROOT / "notes/watcher-20261009-baseline/funnel-20261009-154959.json").read_text())
    base_ids = set(baseline["a10"]["run_ids"])
    base_rows = [r for r in included if r["run_id"] in base_ids]
    baseline_check = {"expected_n": len(base_ids), "recomputed_n": len(base_rows)}
    for kind, key in [("final","final_funnel"),("first","first_attempt_funnel")]:
        baseline_check[kind] = {"recomputed": totals(base_rows,kind), "prior": dict(zip(STAGES,baseline["a10"][key].values()))}
        assert baseline_check[kind]["recomputed"] == baseline_check[kind]["prior"], "Prior cutoff funnel mismatch"
    assert len(base_rows) == len(base_ids)
    return {"recorded_at": evidence["recorded_at"], "character": "silent", "ascension": 10,
            "policy": brain_source.POLICY, "sort": "finished timestamp descending; newest 20 first; oldest remainder separate",
            "finished_cutoff": included[0]["ended"], "raw_finished_cutoff": max(r["ended"] for r in raw.values()),
            "raw_finished_a10": len(raw), "eligible_finished_a10": len(included),
            "excluded": excluded, "overall": {kind: totals(included,kind) for kind in ["first","final"]},
            "segments": segments, "runs": included, "baseline_check": baseline_check,
            "checks": {"unique_runs": True, "nonoverlapping_windows": True, "monotonic_funnels": True, "first_no_greater_than_final": True,
                       "raw_finished_runs_present_and_final_floor_matches_db": True, "prior_126_run_cutoff_reproduced": True},
            "limits": ["Rates of starts use each segment's n; conditional rates use its immediately preceding stage.",
                       "First attempt stops at earliest logged predicted_death; it is not a counterfactual replay without SL.",
                       "Boss entry is observed combat, never boss victory. SL repeats on the same act/floor count once.",
                       "Mixed/unknown brain sources and unfinished runs excluded. Windows are descriptive and contain changing versions.",
                       "Core-build experience integration started after this finished-run cutoff; these results cannot measure its effect."]}


if __name__ == "__main__":
    if "--replay" not in sys.argv and (OUT / "evidence.json").exists():
        raise RuntimeError("Frozen evidence already exists; use --replay or a new dated analysis directory")
    evidence = json.loads((OUT / "evidence.json").read_text()) if "--replay" in sys.argv else extract()
    if "--replay" not in sys.argv:
        write("evidence.json", evidence)
    result = analyze(evidence)
    write("funnel.json", result)
    lines = ["# 静默 A10：每 20 局漏斗", "", f"原始完成切点：{instant(result['raw_finished_cutoff']).astimezone(LOCAL).isoformat()}。",
             f"合格来源完成切点：{instant(result['finished_cutoff']).astimezone(LOCAL).isoformat()}。",
             f"原始 A10 已结束 {result['raw_finished_a10']} 局；纯 Codex 可计 {result['eligible_finished_a10']} 局。",
             "排除 5 局 DeepSeek、1 局混合来源及 1 局来源待核实。最新 PYE4VXNSLGSS 于 08:26 在 F33 结束，但有未闭合大脑问题，故单列不计入纯 Codex 表。正在进行的局不计入。",
             "从最新完成局倒序分组，最早不足 20 局单列。百分比的分母为本段开局数。", ""]
    for kind, title in [("final","最终结果（含 SL）"),("first","首试结果")]:
        lines += [f"## {title}", "", "| 最近第几局 | 完成时间（CST） | " + " | ".join(LABELS[1:]) + " |",
                  "|---|---|" + "---|"*7]
        for s in result["segments"]:
            rates = [f"{s[kind][k]}/{s['n']}（{s[kind+'_rate_of_starts'][k]:.0f}%）" for k in STAGES[1:]]
            lines.append(f"| {s['range'][0]}–{s['range'][1]} | {' → '.join(s['ended_range_local'])} | " + " | ".join(rates) + " |")
        lines += [""]
    latest, prior = result["segments"][:2]
    lines += ["## 最近两段比较", "",
              f"最近 20 局与前 20 局：进入二幕 {latest['final']['act2']}/20 → 对照 {prior['final']['act2']}/20；进入三幕 {latest['final']['act3']}/20 → 对照 {prior['final']['act3']}/20；到达三幕首 boss {latest['final']['boss3_first']}/20 → 对照 {prior['final']['boss3_first']}/20；第二 boss {latest['final']['boss3_second']}/20 → 对照 {prior['final']['boss3_second']}/20。",
              f"最近 20 局的条件转化：三幕入口→首 boss {latest['final']['boss3_first']}/{latest['final']['act3']}；首 boss→第二 boss {latest['final']['boss3_second']}/{latest['final']['boss3_first']}；第二 boss→通关 0/{latest['final']['boss3_second']}。这些数是本段对应阶段的条件转化率。",
              f"首试最近 20 局进入三幕 {latest['first']['act3']}/20、首 boss {latest['first']['boss3_first']}/20、第二 boss {latest['first']['boss3_second']}/20；含 SL 后对应为 {latest['final']['act3']}/20、{latest['final']['boss3_first']}/20、{latest['final']['boss3_second']}/20。",
              "前两幕到达率改善，三幕后半程与 boss 转化仍弱；每段只有 20 局且版本混合，不能据此确定某次改动的因果。", "",
              "## 口径与限制", ""] + [f"- {x}" for x in result["limits"]]
    (OUT / "report.md").write_text("\n".join(lines) + "\n")
    print(json.dumps({k:v for k,v in result.items() if k not in ["runs","excluded"]},ensure_ascii=False,indent=2))
