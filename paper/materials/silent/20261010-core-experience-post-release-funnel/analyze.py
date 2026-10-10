"""Descriptive release cohorts using observed starts and the preserved funnel method."""
import collections
import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[3]
SNAPSHOT = OUT / "funnel-snapshot"
spec = importlib.util.spec_from_file_location("funnel_base", OUT / "funnel-base.py")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
base.OUT = SNAPSHOT

def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")

replay = "--replay" in sys.argv
if not replay and (SNAPSHOT / "evidence.json").exists():
    raise RuntimeError("Preserve the frozen snapshot; use --replay")
evidence = json.loads((SNAPSHOT / "evidence.json").read_text()) if replay else base.extract()
if not replay:
    write(SNAPSHOT / "evidence.json", evidence)
funnel = base.analyze(evidence)
funnel["limits"] = [x for x in funnel["limits"] if not x.startswith("Core-build experience integration")]
funnel["limits"].append("This observational release cohort contains simultaneous versions and experience updates; no isolated causal effect is estimated.")
previous_path = ROOT / "paper/materials/silent/20261010-1541-a10-funnel-20-run/funnel.json"
previous = json.loads(previous_path.read_text())
now_by_id = {r["run_id"]: r for r in funnel["runs"]}
for run in previous["runs"]:
    assert run["run_id"] in now_by_id
    assert all(run[k] == now_by_id[run["run_id"]][k] for k in ["first", "final"])
funnel["prior_153_funnels_equal"] = True
funnel["excluded_source_counts"] = dict(collections.Counter(r["brain_source"]["source"] for r in funnel["excluded"]))
write(SNAPSHOT / "funnel.json", funnel)

closure = json.loads((OUT / "publication-closure.json").read_text())
release_commit = closure["actual_live_merge"]
release_time = subprocess.check_output(["git", "show", "-s", "--format=%cI", release_commit], cwd=ROOT, text=True).strip()
cut = base.instant(release_time)
db = {r["run_id"]: r for r in evidence["db_runs"]}
pre, post, transition = [], [], []
for run in funnel["runs"]:
    start = db[run["run_id"]]["started"]
    assert start is not None
    row = {**run, "first_observed_start_utc": start}
    group = post if base.instant(start) >= cut else pre if base.instant(run["ended"]) < cut else transition
    group.append(row)

def aggregate(rows):
    n = len(rows)
    result = {"n": n, "run_ids": [r["run_id"] for r in rows]}
    for kind in ["first", "final"]:
        counts = {k: sum(int(r[kind][k]) for r in rows) for k in base.STAGES}
        result[kind] = counts
        result[kind + "_rate_of_starts"] = {k: 100 * v / n if n else None for k, v in counts.items()}
        result[kind + "_conditional_rate"] = {after: 100 * counts[after] / counts[before] if counts[before] else None
                                               for before, after in zip(base.STAGES, base.STAGES[1:])}
    return result

assert len(pre) + len(post) + len(transition) == funnel["eligible_finished_a10"]
assert not (set(r["run_id"] for r in pre) & set(r["run_id"] for r in post))
result = {
    "recorded_at": evidence["recorded_at"], "finished_cutoff": funnel["finished_cutoff"],
    "character": "silent", "ascension": 10, "brain_policy": funnel["policy"],
    "release_commit": release_commit, "release_commit_time": release_time,
    "prefix_acceptance_time": closure["verified_at"], "release_version": closure["release_version"],
    "core_experience_ids": [r["experience"] for r in closure["mappings"]],
    "definition": "Pre: ended before release; post: first observed run state at/after release. Cross-release starts are separate; actual runtime prefix exposure is audited separately.",
    "raw_finished_a10": funnel["raw_finished_a10"], "eligible_finished_a10": funnel["eligible_finished_a10"],
    "excluded_source_counts": funnel["excluded_source_counts"],
    "groups": {"pre_all": aggregate(pre), "pre_recent_20": aggregate(pre[:20]),
               "pre_matched_n": aggregate(pre[:len(post)]), "post": aggregate(post),
               "cross_release": aggregate(transition)},
    "post_runs": post, "cross_release_runs": transition,
    "input_sha256": {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest()
                     for p in [SNAPSHOT / "evidence.json", SNAPSHOT / "funnel.json", previous_path, OUT / "publication-closure.json", OUT / "funnel-base.py"]},
    "checks": {**funnel["checks"], "prior_153_funnels_equal": True, "release_cohorts_partition_eligible_runs": True},
    "limits": ["The post sample has not reached 20 completed runs.",
               "Boss columns mean entry into observed combat, not boss victory.",
               "First attempt stops at the earliest logged predicted_death; it is not a counterfactual without SL.",
               "Release-time membership does not itself prove adoption of a particular build. Runtime exposure is separately checked against actual prompt metadata.",
               "Concurrent changes and small unmatched samples prevent attributing any difference specifically to the four core-build lessons."],
}
exposure_path = OUT / "exposure/summary.json"
exposure = json.loads(exposure_path.read_text())
exposed = [r for r in exposure["runs"] if r["cohort"] == "fully_post_release"]
assert set(r["run_id"] for r in exposed) == set(r["run_id"] for r in post)
assert all(base.instant(r["process_started"]) >= cut for r in exposed)
assert all(r["questions"] == r["full_prefix_questions"] == r["accepted_questions"] == r["actual_client_instructions_digest_matches"] for r in exposed)
assert exposure["finished_cutoff"] == result["finished_cutoff"]
result["runtime_exposure"] = {
    "path": str(exposure_path.relative_to(ROOT)),
    "sha256": hashlib.sha256(exposure_path.read_bytes()).hexdigest(),
    "post_release_runs": len(exposed),
    "questions": sum(r["questions"] for r in exposed),
    "all_full_prefix_client_digests_match": True,
    "all_processes_started_after_release": True,
    "four_entries_unchanged_in_startup_versions": True,
    "explicit_adoption_or_causal_benefit_established": False,
    "limits": exposure["limits"],
}
write(OUT / "analysis.json", result)
before, after = result["groups"]["pre_recent_20"], result["groups"]["post"]
lines = ["# 核心组合经验上线后的静默 A10 漏斗", "",
         f"实际 live 上线：{release_time}，提交 {release_commit}，版本 {result['release_version']}。10:42:12 是补验收时间。",
         f"完成局切点：{base.instant(result['finished_cutoff']).astimezone(base.LOCAL).isoformat()}。原始 A10 已结束 {result['raw_finished_a10']} 局，纯 Codex 合格 {result['eligible_finished_a10']} 局。",
         f"上线后新开且已结束 {len(post)} 局，尚不足 20 局；比较上线前最近 20 个合格完成局。跨界一局单列。正在进行的局不计入。",
         "boss 列表示实际进入战斗；百分比以各组开局数为分母，含 SL 与首试分开。", ""]
for kind, title in [("final", "最终结果（含 SL）"), ("first", "首试结果")]:
    lines += [f"## {title}", "", "| 阶段 | 上线前最近 20 局 | 上线后新开局 |", "|---|---:|---:|"]
    for stage, label in zip(base.STAGES[1:], base.LABELS[1:]):
        cells = [f"{g[kind][stage]}/{g['n']}（{g[kind+'_rate_of_starts'][stage]:.1f}%）" for g in [before, after]]
        lines.append(f"| {label} | " + " | ".join(cells) + " |")
    lines += [""]
lines += ["## 上线后逐局", "", "| 局号 | 首试终层 | 最终终层 | 通关 |", "|---|---:|---:|---|"]
for r in sorted(post, key=lambda r: r["ended"]):
    lines.append(f"| {r['run_id']} | {r['first_floor']} | {r['final_floor']} | {'是' if r['final']['win'] else '否'} |")
lines += ["", "## 实际知识输入核验", "",
          f"- {len(exposed)} 局共 {result['runtime_exposure']['questions']} 道接受的 Codex 大脑题使用 full 知识前缀，实际客户端 instructions 摘要均与大脑系统提示摘要对应。启动经验版本 .5/.6/.8 的四条核心条目与上线原件逐对象一致。",
          "- 跨界局 5BU7ZE1PWLSX：上线前启动、上线后结束，32 道大脑题全部为旧 .4 前缀，最后题 10:21:38，单列为未暴露四条新经验，未混进上线后组。",
          "- 知识前缀会局中刷新，不能只用开局提交号判断每题输入；逐题保留 prefix/system 摘要与客户端请求摘要及原行偏移/SHA。",
          "- 日志未逐题保存完整 system 文本。完整前缀加载与版本保留可核实，但没有显式引用四个条目 ID 的答案；不能将相似构筑措辞归因于某条经验。",
          "", "## 描述性结果", "",
          f"- 上线后 {len(post)} 局仍 0 胜；三幕首 boss {after['final']['boss3_first']}/{len(post)}，进入第二 boss {after['final']['boss3_second']}/{len(post)}；这几局首试也达到同样三幕后段。",
          f"- 含 SL 二幕入口 {after['final']['act2']}/{len(post)} → 二幕 boss {after['final']['boss2']}/{after['final']['act2']}，途中损失 {after['final']['act2']-after['final']['boss2']} 局；另 {len(post)-after['final']['boss1']} 局在一幕 boss 前结束。",
          "- 相比上线前最近 20 局，第二 boss 到达比例上升，但进入三幕比例下降；尚未形成整体改善或通关证据。样本不足 20 且同期有其他代码/经验更新，不能估计四条核心经验的独立收益。",
          "", "## 复现与限制", ""]
lines += [f"- {x}" for x in result["limits"]]
lines += ["- 已复现上次 153 局的逐局首试/最终结果，原 126 局历史切点也一致。所有已结束合格局分为 pre/cross/post，互不重叠。",
          "- analysis.json 保存上线切点、各组局号和计数；funnel-snapshot/ 冻结原始选行及 LogDB 结果；exposure/ 保存实际输入链核验。只做统计和留档，不改知识、游戏代码、版本、调度或对局。"]
(OUT / "report.md").write_text("\n".join(lines) + "\n")
print(json.dumps({k: result[k] for k in ["recorded_at", "finished_cutoff", "release_commit_time", "raw_finished_a10", "eligible_finished_a10", "groups", "checks"]}, ensure_ascii=False, indent=2))
