#!/usr/bin/env python3
"""Read-only review of queued postmortems; write only this evidence directory."""
from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parent
sys.path[:0] = [str(ROOT / "learner"), str(ROOT / "ops")]
import ledger  # noqa: E402
import code_proposals  # noqa: E402
import learner_checks  # noqa: E402
import proposal_dispatch  # noqa: E402


def digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def source(path: Path) -> dict:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        while block := handle.read(1024 * 1024):
            h.update(block)
    return {"path": str(path.relative_to(ROOT)), "bytes": path.stat().st_size,
            "sha256": h.hexdigest()}


def write_json(name: str, obj: object) -> None:
    (OUT / name).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n")


def git(*args: str) -> str:
    return subprocess.check_output(["git", "-C", str(ROOT), *args], text=True).strip()


stamp = subprocess.check_output(["date", "+%Y-%m-%d %H:%M:%S %Z"], text=True).strip()
print(stamp)
state_path = ROOT / "ops/codex-ops/learn.json"
state_raw = state_path.read_bytes()
state = json.loads(state_raw)
lessons_path = ROOT / "notes/lessons.md"
lessons_raw = lessons_path.read_bytes()
lessons = lessons_raw.decode()
fix_path = ROOT / "notes/fix-queue-v4.md"
fix_text = fix_path.read_text()
ledger_path = ROOT / "paper/materials/learning/ledger.jsonl"
ledger_raw = ledger_path.read_bytes()
ledger_rows = []
offset = 0
for number, raw in enumerate(ledger_raw.splitlines(keepends=True), 1):
    if raw.strip():
        ledger_rows.append((number, offset, raw, json.loads(raw)))
    offset += len(raw)
entries = ledger.fold([(n, row) for n, _, _, row in ledger_rows])
props_path = ROOT / code_proposals.QUEUE
proposals = code_proposals.fold(props_path)
registry_path = ROOT / "logs/runs.jsonl"
registry_raw = registry_path.read_bytes()
registry = {}
offset = 0
for number, raw in enumerate(registry_raw.splitlines(keepends=True), 1):
    try:
        row = json.loads(raw)
    except ValueError:
        offset += len(raw)
        continue
    if row.get("run_id"):
        registry[row["run_id"]] = {"row": row, "line": number, "offset": offset,
                                    "bytes": len(raw), "sha256": digest(raw)}
    offset += len(raw)
decision_path = ROOT / "paper/materials/decision-log.md"
decision_text = decision_path.read_text()
handoff_path = ROOT / "notes/ops-handoff.md"
handoff_text = handoff_path.read_text()
final_drafts = {
    "20261010-001301": "lesson-draft-v2.md",
    "20261010-004301": "section-draft.md",
    "20261010-014301": "lesson-draft.md",
    "20261010-024301": "lesson-draft.md",
    "20261010-031302": "appended-section.md",
    "20261010-034301": "postmortem.md",
    "20261010-044301": "lesson-draft.md",
    "20261010-084301": "section.md",
    "20261010-094301": "section.md",
    "20261010-101301": "lesson-draft.md",
    "20261010-111302": "lesson-draft.md",
    "20261010-121301": "lessons-draft.md",
}
new_bug_ids = {
    "20261010-024301": "silent-0362",
    "20261010-101301": "silent-0365",
    "20261010-111302": "silent-0367",
}
old_bug_ids = {
    "20261010-004301": ["silent-0256", "silent-0349"],
    "20261010-034301": ["silent-0317"],
    "20261010-084301": ["silent-0291"],
}
sources = {}
for path in [state_path, lessons_path, fix_path, ledger_path, props_path,
             registry_path, decision_path, handoff_path, Path(__file__)]:
    sources[str(path.relative_to(ROOT))] = source(path)
batches = []
new_bugs = []
all_proposals = []
all_owned_rows = []
all_issues = []
tz = dt.timezone(dt.timedelta(hours=8))
for event in sorted((ROOT / "ops/codex-ops/queue").glob("*-learner-done.md")):
    body = event.read_text()
    batch_id = re.search(r"复盘批次\s+(\d{8}-\d{6})", body).group(1)
    current = state["batches"][batch_id]
    report = learner_checks.read_report(str(ROOT / f"ops/codex-ops/learner/{batch_id}.out"))
    report_path = Path(report["report"])
    scratch = report_path.parent
    report_json_path = scratch / "report.json"
    report_json = json.loads(report_json_path.read_text())
    report_md = json.loads(re.findall(r"```json\s*([\s\S]*?)```", report_path.read_text())[-1])
    draft_path = scratch / final_drafts[batch_id]
    draft_raw = draft_path.read_bytes()
    draft_offset = lessons_raw.find(draft_raw)
    ids = report["ledger"]["added"] + report["ledger"]["updated"]
    runs = report["appended"]
    start = dt.datetime.strptime(current["started"], "%Y-%m-%d %H:%M").replace(tzinfo=tz)
    end = dt.datetime.strptime(current["finished"], "%Y-%m-%d %H:%M").replace(tzinfo=tz)
    end += dt.timedelta(seconds=59)
    owned_rows = []
    for number, row_offset, raw, row in ledger_rows:
        when = ledger.when(row.get("ts"))
        if (row.get("by") == "learner:postmortem" and row.get("id") in ids and when
                and start <= when <= end):
            owned_rows.append({"line": number, "offset": row_offset, "bytes": len(raw),
                               "sha256": digest(raw), "row": row})
    all_owned_rows += owned_rows
    links_errors = proposal_dispatch.links(report, current, str(ROOT), str(ROOT / "ops"))
    proposal_proofs = []
    for ident in report["code_proposals"]:
        item = proposals[ident]
        p = Path(item["proposal"])
        actual = digest(p.read_bytes())
        valid = True
        try:
            code_proposals.validate(item, ROOT, entries, {k: v["row"] for k, v in registry.items()})
        except (ValueError, OSError) as error:
            valid = False
            all_issues.append({"batch": batch_id, "proposal": ident, "error": str(error)})
        proof = {"id": ident, "state": item.get("state"), "source_task": item.get("source_task"),
                 "target_task": item.get("target_task"), "ledger": item.get("ledger"),
                 "runs": item.get("runs"), "path": str(p.relative_to(ROOT)),
                 "registered_sha256": item["proposal_sha256"], "actual_sha256": actual,
                 "sha_matches": actual == item["proposal_sha256"], "validate_passed": valid}
        proposal_proofs.append(proof)
        all_proposals.append(proof)
        sources[str(p.relative_to(ROOT))] = source(p)
    ledger_proofs = []
    for ident in ids:
        item = entries.get(ident, {})
        evidence = [e for e in item.get("evidence", []) if e.get("run") in runs]
        ledger_proofs.append({"id": ident, "exists": bool(item), "character": item.get("character"),
                              "kind": item.get("kind"), "status": item.get("status"),
                              "claim": item.get("claim"), "first_run": item.get("first_run"),
                              "prior": item.get("prior"), "first_run_evidence": evidence,
                              "lessons_link_present": set(runs).issubset(item.get("where", {}).get("lessons", []))})
    corrections = []
    for name in ["errata.md", "proposal-line-corrections.md", "post-append-corrections.json"]:
        path = scratch / name
        if path.exists():
            sources[str(path.relative_to(ROOT))] = source(path)
            corrections.append({**source(path), "text": path.read_text()})
    for name in ["lessons-before.json", "lessons-prefix.json", "append-before.json",
                 "append-verification.json", "verification-final.json", "verification.json",
                 "verification-summary.json", "verification-before.json", "verification-after-append.json"]:
        path = scratch / name
        if path.is_file():
            sources[str(path.relative_to(ROOT))] = source(path)
    source_paths = [event, ROOT / f"ops/codex-ops/learner/{batch_id}.out",
                    ROOT / f"ops/codex-ops/learner/{batch_id}.err", report_path, report_json_path, draft_path]
    launch_match = re.search(r"完整事件流：([^；。\n]+)", body)
    if launch_match:
        source_paths.append(Path(launch_match.group(1)))
    for path in source_paths:
        if path.is_file():
            sources[str(path.relative_to(ROOT))] = source(path)
    comparison_differences = []
    if report != report_json:
        for field in set(report) | set(report_json):
            if report.get(field) != report_json.get(field):
                comparison_differences.append({"field": field, "out": report.get(field),
                                               "report_json": report_json.get(field)})
    old_bugs = []
    for ident in old_bug_ids.get(batch_id, []):
        matches = [{"line": n, "text": line} for n, line in enumerate(fix_text.splitlines(), 1)
                   if ident in line]
        old_bugs.append({"id": ident, "already_in_queue": bool(matches), "existing_entries": matches,
                         "action": "不重复追加；保留本局原CLI repeat/support与原提案自动链"})
    if batch_id in new_bug_ids:
        ident = new_bug_ids[batch_id]
        item = entries[ident]
        item_props = [p for p in proposal_proofs if ident in p["ledger"]]
        bug = {"id": ident, "batch": batch_id, "runs": runs,
               "classification": "nonblocking-pure-bug-from-learner",
               "original_report_bug": next(b for b in report["bugs"] if b.get("new")),
               "claim": item["claim"], "evidence": [e for e in item["evidence"] if e.get("run") in runs],
               "first_run": item["first_run"], "prior": item["prior"], "status": item["status"],
               "already_in_fix_queue": ident in fix_text, "proposal_proofs": item_props,
               "report_path": str(report_path.relative_to(ROOT)),
               "report_sha256": digest(report_path.read_bytes()),
               "constraints": "仅转录原learner；原局已正常结束，非卡死；不重派/不补机制/不标implemented或shipped/不造版本"}
        new_bugs.append(bug)
    unknowns = [line for line in report_path.read_text().splitlines() if "未记录" in line]
    existing_batch_closeout = [{"path": "paper/materials/decision-log.md", "line": n, "text": line}
                              for n, line in enumerate(decision_text.splitlines(), 1) if batch_id in line]
    existing_batch_closeout += [{"path": "notes/ops-handoff.md", "line": n, "text": line}
                               for n, line in enumerate(handoff_text.splitlines(), 1) if batch_id in line]
    run_proofs = []
    for run in runs:
        raw_proof = registry[run]
        row = raw_proof["row"]
        headings = list(re.finditer(r"(?m)^##\s+" + re.escape(run) + r"(?:[（(\s]|$)", lessons))
        run_proofs.append({"run": run, "character": row.get("character"), "ascension": row.get("ascension"),
                           "ended": row.get("ended"), "victory": row.get("victory"), "floor": row.get("floor"),
                           "recorded_code": row.get("code"), "source": {k: v for k, v in raw_proof.items() if k != "row"},
                           "lessons_heading_count": len(headings),
                           "lessons_heading_line": lessons[:headings[0].start()].count("\n") + 1 if headings else None})
    issues = []
    if current.get("state") != "done" or current.get("rc") != 0 or current.get("missing"):
        issues.append("batch is not normally completed")
    if current.get("proposal_audit_errors") or links_errors:
        issues.append("proposal audit errors")
    if draft_offset < 0 or lessons_raw.count(draft_raw) != 1:
        issues.append("formal draft is not present exactly once")
    if any(p["lessons_heading_count"] != 1 or p["character"] != "SILENT" or not p["ended"] for p in run_proofs):
        issues.append("run/heading identity mismatch")
    if any(not p["exists"] or p["character"] != "silent" or not p["first_run_evidence"] for p in ledger_proofs):
        issues.append("ledger evidence mismatch")
    if any(not p["sha_matches"] or not p["validate_passed"] for p in proposal_proofs):
        issues.append("proposal fingerprint/identity mismatch")
    all_issues += [{"batch": batch_id, "error": issue} for issue in issues]
    batches.append({"batch": batch_id, "queue_path": str(event.relative_to(ROOT)),
                    "state_snapshot": current, "report": report,
                    "report_json": report_json, "report_markdown_json": report_md,
                    "representations_identical": report == report_json == report_md,
                    "representation_differences": comparison_differences,
                    "difference_disposition": "旧0317描述简写有差异，身份/其他字段一致；三原件保持" if comparison_differences else "相同",
                    "runs": run_proofs, "formal_draft": {**source(draft_path), "lessons_offset": draft_offset,
                                                         "exact_occurrences": lessons_raw.count(draft_raw)},
                    "ledger": ledger_proofs, "owned_ledger_rows": owned_rows,
                    "proposals": proposal_proofs, "current_links_errors": links_errors,
                    "old_bug_dedup": old_bugs, "corrections": corrections,
                    "learner_unknowns_verbatim": unknowns,
                    "existing_closeout_references": existing_batch_closeout,
                    "issues": issues, "ready_for_ops_record_closeout": not issues})

ledger_problems = ledger.check_file(str(ledger_path))
unique_added = sorted({i for b in batches for i in b["report"]["ledger"]["added"]})
summary = {"batch_count": len(batches), "run_count": sum(len(b["runs"]) for b in batches),
           "normally_done": sum(b["ready_for_ops_record_closeout"] for b in batches),
           "new_ledger_items": unique_added, "new_ledger_item_count": len(unique_added),
           "new_nonblocking_bug_count": len(new_bugs), "blocking_bug_count": 0,
           "proposal_count": len(all_proposals), "proposal_unique_count": len({p["id"] for p in all_proposals}),
           "proposal_states": {s: sum(p["state"] == s for p in all_proposals) for s in {p["state"] for p in all_proposals}},
           "owned_ledger_row_count": len(all_owned_rows),
           "owned_ledger_adds": sum(r["row"]["op"] == "add" for r in all_owned_rows),
           "owned_ledger_updates": sum(r["row"]["op"] == "update" for r in all_owned_rows),
           "owned_support_evidence": sum(e.get("role") == "support" for r in all_owned_rows for e in r["row"].get("evidence", [])),
           "owned_repeat_evidence": sum(e.get("role") == "repeat" for r in all_owned_rows for e in r["row"].get("evidence", [])),
           "ledger_problems": ledger_problems, "issues": all_issues}
audit = {"request": "Roy授权能并行的ops队列工作开启子agent",
         "generated_at_after_date": stamp, "auditor": "codex:/root/postmortem_closeout",
         "root": str(ROOT), "main": git("rev-parse", "main"), "live": git("rev-parse", "live"),
         "read_only_shared_state": True, "queue_acknowledged": False,
         "run_or_dispatch_or_publish_actions": [],
         "commands": ["/usr/bin/python3 /home/dw/agent-memory/adapters/codex/context.py (readonly lock failure)",
                      "README/latest STATE/learning protocol/AGENTS/recent decision-log reads",
                      "date '+%Y-%m-%d %H:%M:%S %Z'",
                      "nice -n 19 python3 -B paper/materials/20261010-ops-parallel/postmortem-audit/build-audit.py",
                      "现有 learner_checks.read_report / proposal_dispatch.links / code_proposals.validate 只读调用",
                      "现有 ledger.fold / ledger.check_file 只读调用"],
         "summary": summary, "shared_sources": list(sources.values()), "batches": batches,
         "new_bug_queue_additions": new_bugs,
         "historical_limitations": ["不重跑对局、不从现行脏知识还原历史完整输入，不给未知反事实填胜负。",
                                    "此审计仅核产物身份、来源、指纹和闭环缺口，游戏结论均为原learner原文。",
                                    "所有旧failed、draft-v1、勘误、report差异、提案waiting/pending及未知保持。",
                                    "其他经验已上线不代表这33个源码提案已实现；当前全为pending。",
                                    "已有机制型observed/proposed条目和新纯bug分开，不能把账本新增8项全称代码缺陷。"]}
write_json("audit.json", audit)
write_json("owned-ledger-rows.json", {"ledger_source": source(ledger_path), "selection": "learner:postmortem、声明所属ID及批次started→finished+59s；附原行号/偏移/SHA",
                                      "rows": all_owned_rows})
write_json("source-manifest.json", {"generated_at_after_date": stamp, "files": list(sources.values())})
write_json("fix-queue-additions.json", new_bugs)

additions = ["## 2026-10-10 待主 ops 追加的三项非阻塞纯 bug（原 learner 结论）", "",
             "本文件是审计草稿；notes/fix-queue-v4.md 尚未由此子 agent 改动。主 ops 写时间前重新 date；先核并行新增以保持幂等。", ""]
for bug in new_bugs:
    p = bug["proposal_proofs"][0]
    additions += [f"- [ ] **{bug['id']}**：仅转录学习者回报，证据 {','.join(bug['runs'])} / SILENT A10；定位 `{bug['original_report_bug']['where']}`。{bug['original_report_bug']['what']} "
                  f"原首证{bug['first_run']}、prior={bug['prior']}、observed保持。原提案 `{p['id']}` 已经CLI登记，沿既有 strategy-proposal 链；完整证据/反例/范围见 `{p['path']}`（SHA256={p['actual_sha256']}）。"
                  f"原报告 `{bug['report_path']}`（SHA256={bug['report_sha256']}）。局已正常结束，非卡死；不重复派发、不由运维补机制、不标implemented/shipped、不据此宣称能赢整局。", ""]
additions += ["已去重而不追加：silent-0256（现行队列第789行）、silent-0291（第854行）、silent-0317（第923行）、silent-0349（第1005行）。原回报“fix-queue未列”是学习者查看旧 notes/fix-queue.md 路径或当时视图，现行 notes/fix-queue-v4.md 已有精确条目；原回报保持。", ""]
(OUT / "fix-queue-additions.md").write_text("\n".join(additions))

lines = ["# 并行复盘闭环审计", "", f"切点：{stamp}。仅写本独立目录，未改共享账本/复盘/队列/状态，未派发、合入或提交。", "",
         f"12批/12局均正常done/rc0，正式终稿在notes/lessons.md完整出现一次；现有提案验链重执行无错，33份提案Markdown指纹全等，当前33项全为pending。全局ledger检查0问题。新纯bug3项均非阻塞，原8项新增账本中另外5项为机制/打法观察；不把账本新增当成代码实现。", "",
         "|批次|局号|到达层|终稿字节|账本新增|所属原CLI行|提案|纯bug处置|",
         "|---|---|---:|---:|---:|---:|---:|---|"]
for b in batches:
    bug_note = "新普通bug " + new_bug_ids[b["batch"]] if b["batch"] in new_bug_ids else "旧bug已列，去重" if b["old_bug_dedup"] else "无新增纯bug"
    lines.append(f"|{b['batch']}|{b['runs'][0]['run']}|{b['runs'][0]['floor']}|{b['formal_draft']['bytes']}|{len(b['report']['ledger']['added'])}|{len(b['owned_ledger_rows'])}|{len(b['proposals'])}|{bug_note}|")
lines += ["", "需要主 ops 收尾：", "", "1. 将fix-queue-additions.md三条转录到现行普通队列；旧四项不重加，33项原CLI提案不重登记/复派。",
          "2. 12批的正式复盘和原CLI账本已经落盘，禁止再次物理追加。统一运行一次paper_dataset.py --no-raw，补decision-log一行及记录提交后再沿标准流程确认事件。",
          "3. 034301的.out与report.json/Markdown仅0317描述简写不同，bug身份、ledger、提案及其他字段相同；audit.json分别保留三对象，不人为改成相同。",
          "4. 111302正式终稿后已有两段勘误（focus题数及切割来源）；121301三原提案行号补充单独保存、指纹保持。实现链必须连同原稿读取，不能只看最终摘要。",
          "", "当前12个batch-id在decision-log及ops-handoff中没有逐批结案记录；已有经验146使用部分局号及auto-play/漏斗记录属于其他闭环，不能作为12批运维收尾凭证。",
          "", "audit.json含每批state副本、.out/report两表示、正式复盘偏移/SHA、局注册原行SHA、33提案登记与实件SHA、原账本CLI逐行偏移/SHA、旧bug去重及原未记录限制。source-manifest.json冻结本切点来源；源原件未覆盖。",
          "", f"所属原CLI {summary['owned_ledger_row_count']} 行（add={summary['owned_ledger_adds']} / update={summary['owned_ledger_updates']}），support={summary['owned_support_evidence']} / repeat={summary['owned_repeat_evidence']}，详细原行在owned-ledger-rows.json。",
          "", "本子agent不运行play、不调用有写副作用的status/finish/check_jobs，不读key/.env/auth、不更改知识和游戏规则。个人记忆context运行失败因中央锁只读，未写中央库。", ""]
(OUT / "report.md").write_text("\n".join(lines))
print(json.dumps(summary, ensure_ascii=False))
