"""A new bounded snapshot using the preserved, previously checked funnel method."""
import collections
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
spec = importlib.util.spec_from_file_location("funnel_baseline", OUT / "baseline-analyze.py")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
base.OUT = OUT

if "--replay" not in sys.argv and (OUT / "evidence.json").exists():
    raise RuntimeError("Preserve the existing snapshot; use --replay")
evidence = json.loads((OUT / "evidence.json").read_text()) if "--replay" in sys.argv else base.extract()
if "--replay" not in sys.argv:
    base.write("evidence.json", evidence)
result = base.analyze(evidence)
result["limits"] = [x for x in result["limits"] if not x.startswith("Core-build experience integration")]
result["limits"].append("Versions and experience changed within windows; these descriptive rates cannot isolate the effect of core-build experience.")
previous = json.loads((ROOT / "paper/materials/silent/20261010-a10-funnel-20-run/funnel.json").read_text())
prior_by_id = {r["run_id"]: r for r in previous["runs"]}
current_by_id = {r["run_id"]: r for r in result["runs"]}
for rid, prior in prior_by_id.items():
    assert rid in current_by_id, ("prior eligible run missing", rid)
    assert all(prior[k] == current_by_id[rid][k] for k in ["first", "final"]), ("prior funnel changed", rid)
result["prior_report_check"] = {"path": "paper/materials/silent/20261010-a10-funnel-20-run/funnel.json",
                                "prior_eligible_runs": len(prior_by_id), "all_prior_funnels_equal": True,
                                "new_eligible_runs": len(set(current_by_id) - set(prior_by_id))}
result["excluded_source_counts"] = dict(collections.Counter(r["brain_source"]["source"] for r in result["excluded"]))
base.write("funnel.json", result)
lines = ["# 静默 A10：最新每 20 局漏斗", "",
         f"观察时间：{result['recorded_at']}。",
         f"最新完成局切点：{base.instant(result['raw_finished_cutoff']).astimezone(base.LOCAL).isoformat()}。",
         f"纯 Codex 合格切点：{base.instant(result['finished_cutoff']).astimezone(base.LOCAL).isoformat()}。",
         f"原始 A10 已结束 {result['raw_finished_a10']} 局，纯 Codex 合格 {result['eligible_finished_a10']} 局；排除来源分组 {result['excluded_source_counts']}。",
         "沿用上次口径：从最新已结束合格局往前每 20 局分组，最早不足 20 局单列。正在进行的局不纳入。",
         "表内百分比的分母是本段开局数；boss 指实际进入战斗，不代表打赢。", ""]
for kind, title in [("final", "最终结果（含 SL）"), ("first", "首试结果")]:
    lines += [f"## {title}", "", "| 最近第几局 | 完成时间（CST） | " + " | ".join(base.LABELS[1:]) + " |",
              "|---|---|" + "---|" * 7]
    for s in result["segments"]:
        cells = [f"{s[kind][k]}/{s['n']}（{s[kind+'_rate_of_starts'][k]:.0f}%）" for k in base.STAGES[1:]]
        lines.append(f"| {s['range'][0]}–{s['range'][1]} | {' → '.join(s['ended_range_local'])} | " + " | ".join(cells) + " |")
    lines += [""]
latest, prior = result["segments"][:2]
lines += ["## 最新 20 局的阶段转化", "", "| 阶段 | 含 SL | 首试 |", "|---|---|---|"]
for before, after in zip(base.STAGES, base.STAGES[1:]):
    cells = []
    for kind in ["final", "first"]:
        n, d = latest[kind][after], latest[kind][before]
        cells.append(f"{n}/{d}（{100*n/d:.1f}%）" if d else "无分母")
    lines.append(f"| {base.LABELS[base.STAGES.index(before)]} → {base.LABELS[base.STAGES.index(after)]} | " + " | ".join(cells) + " |")
lines += ["", "## 与前 20 局比较", ""]
for k in ["act2", "boss2", "act3", "boss3_first", "boss3_second", "win"]:
    delta = latest["final_rate_of_starts"][k] - prior["final_rate_of_starts"][k]
    lines.append(f"- {base.LABELS[base.STAGES.index(k)]}：前段 {prior['final'][k]}/20 → 最新 {latest['final'][k]}/20（{delta:+.0f} 个百分点）。")
lines += ["", f"上次报告 {len(prior_by_id)} 局的首试与最终漏斗逐局复现一致；本次新增合格 {result['prior_report_check']['new_eligible_runs']} 局。",
          "", "## 排除与限制", ""]
lines += [f"- {r['run_id']}：{r['brain_source']['source']} / {r['brain_source']['exclusion_reason']}。" for r in result["excluded"]]
lines += [f"- {x}" for x in result["limits"]]
(OUT / "report.md").write_text("\n".join(lines) + "\n")
manifest = {"recorded_at": result["recorded_at"], "scope": "Silent A10 ended; pure successful Codex cohort; newest 20 first",
            "command": "nice -n 19 data/logdb-venv/bin/python " + str(Path(__file__).relative_to(ROOT)),
            "replay_command": "nice -n 19 data/logdb-venv/bin/python " + str(Path(__file__).relative_to(ROOT)) + " --replay",
            "behavior_change": False, "scheduler_mutation": False, "game_version_registered": False,
            "checks": result["checks"], "prior_report_check": result["prior_report_check"], "files": {}}
for p in sorted(OUT.iterdir()):
    if p.is_file() and p.name != "manifest.json":
        raw = p.read_bytes()
        manifest["files"][p.name] = {"sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}
base.write("manifest.json", manifest)
print(json.dumps({k: result[k] for k in ["recorded_at", "raw_finished_cutoff", "eligible_finished_a10", "raw_finished_a10",
                                      "excluded_source_counts", "overall", "segments", "prior_report_check"]}, ensure_ascii=False, indent=2))
