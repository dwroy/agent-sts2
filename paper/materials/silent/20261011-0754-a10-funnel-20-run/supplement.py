"""Summarize release cohorts from the frozen funnel, without changing live state."""
import hashlib
import importlib.util
import json
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
spec = importlib.util.spec_from_file_location("base", OUT / "baseline-analyze.py")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
funnel = json.loads((OUT / "funnel.json").read_text())
evidence = json.loads((OUT / "evidence.json").read_text())
db = {r["run_id"]: r for r in evidence["db_runs"]}
release = "8e74493d92f757a88f15dffb48e2f5336c0cd0ac"
release_time = subprocess.check_output(["git", "show", "-s", "--format=%cI", release], cwd=ROOT, text=True).strip()
cut = base.instant(release_time)
groups = {"pre": [], "post": [], "cross": []}
for r in funnel["runs"]:
    started = base.instant(db[r["run_id"]]["started"])
    group = "post" if started >= cut else "pre" if base.instant(r["ended"]) < cut else "cross"
    groups[group].append(r)

def aggregate(rows):
    out = {"n": len(rows), "run_ids": [r["run_id"] for r in rows]}
    for kind in ["first", "final"]:
        out[kind] = {s: sum(r[kind][s] for r in rows) for s in base.STAGES}
        out[kind + "_rate"] = {s: 100 * n / len(rows) if rows else None for s, n in out[kind].items()}
    return out

prior_path = ROOT / "paper/materials/silent/20261010-core-experience-post-release-funnel/funnel-snapshot/funnel.json"
prior = json.loads(prior_path.read_text())
current = {r["run_id"]: r for r in funnel["runs"]}
for r in prior["runs"]:
    assert all(current[r["run_id"]][k] == r[k] for k in ["first", "final"])
assert sum(len(g) for g in groups.values()) == len(current)
assert set(funnel["segments"][0]["run_ids"]).issubset({r["run_id"] for r in groups["post"]})
post_chronological = list(reversed(groups["post"]))
result = {
    "recorded_at": evidence["recorded_at"], "finished_cutoff": funnel["finished_cutoff"],
    "release_commit": release, "release_time": release_time, "release_version": "S1.exp147",
    "definition": "Observed start at/after actual publication; crossing run separate. Time cohort does not prove individual lesson adoption or causal benefit.",
    "groups": {**{k: aggregate(v) for k, v in groups.items()},
               "pre_recent20": aggregate(groups["pre"][:20]),
               "post_first20": aggregate(post_chronological[:20]),
               "post_remaining": aggregate(post_chronological[20:])},
    "wins": [r for r in funnel["runs"] if r["final"]["win"]],
    "checks": {"prior_154_funnels_equal": True, "release_partition_equal": True, "latest20_all_post_release": True},
    "limits": ["Pure successful Codex brain only; unfinished runs excluded.",
               "First attempt ends at first logged predicted_death; SL outcome is separate.",
               "Boss counts mean observed entry, not victory. Rates use group starts.",
               "Concurrent code/experience changes and small samples prevent causal attribution.",
               "New per-question lesson exposure/adoption was not audited in this descriptive refresh."],
    "inputs": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in [OUT / "funnel.json", OUT / "evidence.json"]},
}
(OUT / "release-cohorts.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
lines = ["# 核心组合经验上线后：更新漏斗", "", f"上线切点 {release_time}（S1.exp147）；完成局切点 {funnel['finished_cutoff']}。",
         "按实际首次状态分组，上线前/跨界/上线后互斥；这是上线后的时间分组，不能单独证明经验被采用或产生因果收益。", "",
         "| 阶段 | 上线前最近20局 | 上线后全部局 |", "|---|---:|---:|"]
for stage, label in zip(base.STAGES[1:], base.LABELS[1:]):
    cells = [f"{result['groups'][g]['final'][stage]}/{result['groups'][g]['n']}（{result['groups'][g]['final_rate'][stage]:.1f}%）" for g in ["pre_recent20", "post"]]
    lines.append(f"| {label} | " + " | ".join(cells) + " |")
lines += ["", "含SL的最终结果；首试明细及上线后首20局/余下局见release-cohorts.json。",
          "纯Codex A10首个最终胜局7S8HCC0M6G9W：10-10 21:35结束，F49首试predicted_death后第二试won；不算首试通关。",
          "当前最近20局全部在上线后启动；新知识、策略和其他代码同期变化，不据此判定四条核心经验的独立好坏。",
          "历史154局首试/最终逐局复现一致；本次另核170局上一切点全等。本任务未运行同步或修改数据库。"]
(OUT / "release-report.md").write_text("\n".join(lines) + "\n")
print(json.dumps({k: v for k, v in result.items() if k not in ["wins", "inputs"]}, ensure_ascii=False, indent=2))
