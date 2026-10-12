#!/usr/bin/env python3
"""Read queue receipts without invoking scheduler mutation or inspecting credentials."""
import collections
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import subprocess
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[4]
DEST = Path(__file__).resolve().parent
os.chdir(ROOT)


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True,
                          env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"}, timeout=30)


def metadata(path):
    p = Path(path)
    if not p.is_absolute():
        p = ROOT / p
    if not p.exists():
        return {"path": str(p), "exists": False}
    data = p.read_bytes()
    return {"path": str(p.relative_to(ROOT)) if p.is_relative_to(ROOT) else str(p),
            "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


def read_json(path):
    return json.loads(Path(path).read_text())


spec = importlib.util.spec_from_file_location("read_only_learner_checks", ROOT / "ops/learner_checks.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
learn_path = ROOT / "ops/codex-ops/learn.json"
learn_bytes = learn_path.read_bytes()
learn = json.loads(learn_bytes)
main = git("rev-parse", "main").stdout.strip()
live = git("rev-parse", "live").stdout.strip()
heads = {"main": main, "live": live}
commit_cache = {}


def verify_commit(commit):
    if commit in commit_cache:
        return commit_cache[commit]
    exists = git("cat-file", "-e", commit + "^{commit}").returncode == 0
    result = {"commit": commit, "exists": exists}
    if exists:
        result["ancestor"] = {ref: git("merge-base", "--is-ancestor", commit, head).returncode == 0
                              for ref, head in heads.items()}
        changed = git("diff-tree", "--no-commit-id", "--name-only", "-r", commit).stdout.splitlines()
        result["changed_paths"] = changed
        result["executable_or_validation_paths"] = [p for p in changed if p.startswith(
            ("agent/", "ops/", "learner/", "eval/", "knowledge/builders/"))]
    commit_cache[commit] = result
    return result


def source_commits(report):
    found = []

    def walk(value, key=None):
        if isinstance(value, dict):
            for k, v in value.items():
                if k != "base":
                    walk(v, k)
        elif isinstance(value, list):
            for v in value:
                walk(v, key)
        elif isinstance(value, str) and re.fullmatch(r"[0-9a-f]{40}", value):
            if key in {"commit", "commits", "source_commit", "publication", "release", "merged",
                       "implementation_source", "implementation_live_merge", "calibration_data_source",
                       "scope_audit_source"}:
                found.append(value)
    walk(report)
    return [verify_commit(c) for c in sorted(set(found))]


queues = []
batches = {}
for queue in sorted((ROOT / "ops/codex-ops/queue").glob("*.md")):
    text = queue.read_text()
    kind = queue.name.split("-", 1)[1][:-3]
    m = re.search(r"(2026\d{4}-\d{6}(?:-s2)?-(?:experience-update|fix-batch|strategy-proposal))", text)
    batch_id = m.group(1) if m else None
    request_match = re.search(r"request_id=([^\s；。;]+)", text)
    item = {**metadata(queue), "kind": kind, "batch": batch_id,
            "request_id": request_match.group(1) if request_match else None,
            "first_line": text.splitlines()[0][:400]}
    queues.append(item)
    if batch_id and batch_id not in batches:
        b = learn.get("batches", {}).get(batch_id, {})
        out = ROOT / "ops/codex-ops/learner" / (batch_id + ".out")
        err = out.with_suffix(".err")
        report = module.read_report(out)
        report_path = report.get("report")
        err_text = err.read_text(errors="replace")[-2000:] if err.exists() else ""
        errors = b.get("proposal_audit_errors", [])
        startup = ("recursive_fast_launcher" if "recursive Codex Fast launcher" in err_text else
                   "sandbox_glob_missing_path" if "unreadable glob scan failed" in err_text else None)
        checks = []
        for check in b.get("fallback_checks", []) + ([b["checks"]] if isinstance(b.get("checks"), dict) else []):
            checks.append({**check, "log_metadata": metadata(check["log"]) if check.get("log") else None})
        entry = {"batch": batch_id, "task": b.get("task"), "state": b.get("state"), "rc": b.get("rc"),
                 "merged": b.get("merged"), "worktree": b.get("worktree"),
                 "proposal_audit_errors": errors, "startup_failure": startup,
                 "stderr_error_excerpt": err_text.strip() if startup else None,
                 "out_metadata": metadata(out), "err_metadata": metadata(err),
                 "current_read_report_equals_registered": report == b.get("report", {}),
                 "report": report, "report_metadata": metadata(report_path) if isinstance(report_path, str) else None,
                 "source_commits": source_commits(report), "checks": checks,
                 "queue_events": []}
        if b.get("worktree"):
            r = git("-C", b["worktree"], "rev-parse", "HEAD")
            entry["worktree_head_at_read"] = r.stdout.strip() if r.returncode == 0 else None
        batches[batch_id] = entry
    if batch_id:
        batches[batch_id]["queue_events"].append(item["path"])


already_integrated = {
    "20261009-214302-experience-update": "S1.exp140; original full check failed two Fast test contracts; subsequent actual live full checks pass, original receipt remains failed",
    "20261009-224302-experience-update": "S1.exp141; same original two Fast test-contract failures and subsequent full acceptance",
    "20261009-234302-experience-update": "Source included in actual 061301 merge/S1.exp146; no distinct earlier live release should be invented",
    "20261010-004302-experience-update": "Source included in actual 061301 merge/S1.exp146",
    "20261010-014301-experience-update": "Source included in actual 061301 merge/S1.exp146",
    "20261010-024302-experience-update": "Source included in actual 061301 merge/S1.exp146",
    "20261010-061301-experience-update": "Actual merge/S1.exp146 and its full check already pass; data shipped/record reconciliation remains ops work",
    "20261010-084219-experience-update": "Actual live8e74493d/S1.exp147; same-batch fixed-tree fallback rc0. Four data shipped already; append independent check closure and mechanically sync only existing records to live",
    "20261010-014301-fix-batch": "All three implementation commits now main/live ancestors through successful 034301 batch; retain original failed merge and record independent later success",
    "20261010-034301-fix-batch": "All three pure-tool/test fixes actual live ancestors; full check rc0; no new game version or repeated merge",
    "20261010-024302-fix-batch": "Actual boss calibration/S1.boss-calibration10 and full check rc0; silent-0364 still proposed in main ledger, narrow CLI shipped reconciliation pending",
    "20261010-041301-strategy-proposal": "Actual scoped implementation/S1.gamble-upgrade1 and full check rc0; silent-0317 still proposed, preserve wider unimplemented claims and register only verified A10 sub-scope",
}
for batch_id, entry in batches.items():
    if entry["startup_failure"]:
        entry["disposition"] = "one_root_cause_then_normal_deduplicated_recovery"
        entry["action"] = ("Empty out; no model completion to repair by fabricating proposal IDs/source commits. Preserve failed/rc3 and original artifacts; fix launcher infrastructure once, verify fake CLI, then existing scheduler dedup recovery."
                           if entry["startup_failure"] == "recursive_fast_launcher" else
                           "Separate failed permission-probe glob path before model; preserve incident and use existing environment recovery, do not fabricate report.")
    elif batch_id in already_integrated:
        entry["disposition"] = "already_integrated_record_only"
        entry["action"] = already_integrated[batch_id]
    elif batch_id in {"20261010-011302-strategy-proposal", "20261010-014301-s2-strategy-proposal"}:
        entry["disposition"] = "accepted_no_source_change_record_only"
        entry["action"] = "Already accepted no-change proposal disposition; leave waiting-for-new-evidence intact. No merge/version/shipped or retest."
    elif batch_id == "20261010-121301-fix-batch":
        entry["disposition"] = "empty_batch_equivalence_gate_not_met"
        entry["action"] = "No new fixes, tests0/2673. Existing acceptance requires source equivalence; current main/live differ. Preserve failed/rc0 and do not force done or invent a merge."
    elif batch_id == "20261009-231302-fix-batch":
        entry["disposition"] = "partially_superseded_one_remaining_diagnostic"
        entry["action"] = "81d6226 rollout test blobs exactly equal current main/live (later366917d); 7f658abe continuation diagnostic remains absent. Do not replay both as a single new fix batch."
    else:
        entry["disposition"] = "safe_serial_integration_or_dedup_required"
        entry["action"] = "Declared source commits are not current main/live ancestors; inspect exact source tests and overlap, preserve refreshed knowledge and shared records; integrate under normal live lock only after dedup and required checks."


pending_groups = [
    {"group": "experience-2026-10-10.6", "batch": "20261010-091302-experience-update",
     "candidates": ["e77eb7083e3c1cc1b08b21709ae600cfd447a715"],
     "note": "Only completed experience source still absent; 0 added/14 updated/207 active, source2662 tests0. Preserve the four .5 core entries and latest live refreshes."},
    {"group": "silent-0332-continuation-diagnostic", "batch": "20261009-231302-fix-batch",
     "candidates": ["7f658abe742c5b62d14ff9f8047ac11837d10489"],
     "note": "Only remaining part of older fix; separate rollout test superseded by byte-identical integrated replacement."},
    {"group": "silent-0079-selection-audit", "batch": "20261009-231302-strategy-proposal",
     "candidates": ["be69855995737d6f381adb10bf248964832da24b"],
     "note": "New audit/logging implementation absent. Original broad proposals mostly remain waiting; do not close them as implemented merely from this diagnostic sub-scope."},
    {"group": "silent-apotheosis-footwork", "batches": ["20261010-001301-strategy-proposal", "20261010-014301-strategy-proposal", "20261010-024302-strategy-proposal"],
     "candidates": ["6b04cabdeaaba33ae485713cea1526d009f72ecd", "5b06f6d5870a5d679a346abcce93cbce8576a810", "da83011fb81d461a1f15037720276295dc220340"],
     "note": "Same evidence/feature family, differing executable blobs and tests. Compare candidate guarantees and retain one admitted implementation; newest timestamp alone does not prove equivalence."},
    {"group": "silent-apotheosis-neutralize", "batch": "20261010-004302-strategy-proposal",
     "candidates": ["30f2fc2725947049154f3887612f839e9041cf0b"],
     "note": "Absent; overlaps silent-apotheosis.ts with footwork family. Exact original .out tests/report stored per batch."},
    {"group": "silent-discard-followup", "batches": ["20261009-234302-strategy-proposal", "20261010-021301-strategy-proposal"],
     "candidates": ["f34700874c9f48b614991f769532115a0f24f27b", "7b48971cb0214a277be0aa1fa2c12a49ced0d718"],
     "note": "Both implement narrow parent1697... scope and selection.ts; distinct implementations, compare and choose one safely rather than merge both blindly."},
]
for group in pending_groups:
    group["verification"] = [verify_commit(c) for c in group["candidates"]]
    group["tests"] = {k: batches[k]["report"].get("tests") for k in group.get("batches", [group.get("batch")]) if k}

blob_proof = []
for path in ["agent/tests/rollout-best-added.test.ts", "agent/tests/rollout-live.test.ts"]:
    blobs = {ref: git("rev-parse", commit + ":" + path).stdout.strip()
             for ref, commit in {"source81d6226": "81d6226fe2c0220be145b5ff1487acbf512153f1", **heads}.items()}
    blob_proof.append({"path": path, "blobs": blobs, "all_equal": len(set(blobs.values())) == 1})

manual_dispositions = {
    "1791560183660132964-manual.md": "Two-worker infrastructure actually deployed; existing disjoint worker witness and accepted full-check replacement prove architecture. Only acknowledge, do not dispatch duplicate task just for this old event.",
    "1791560946274048739-manual.md": "Original failed Fast contracts remain historical; successful corrected source4cf9d8805/liveb934d888 full acceptance separately recorded, so no rollback on this old failure.",
    "1791563872200608937-manual.md": "Recursive Fast launcher root cause still reproduced by17 empty-output rc3 events, newest122834. Current launcher94-95 still nests wrapper; single infrastructure repair priority. Missing-glob001301 is separate.",
    "1791563995913438238-manual.md": "Successful replacement b934d888 full acceptance already independently closed; acknowledge without repeating tests or erasing failure.",
    "1791591934219180112-manual.md": "Saved PYE4... continued and native live-tail verified in existing closure. Old reload request already executed, new-loop barrier handoff pending only; host read-only procs required for current identity, no duplicate reload.",
    "1791592630562366752-manual.md": "Core integration request currently done; actual source/live and four data shipped exist. Do not repeat full-history or experience dispatch; independent external check closure/record sync only.",
    "1791600181267332847-manual.md": "Core same-batch full check now rc0 on8e/treea210; append closure and synchronize only existing S1.exp147/ledger/notifications/done request to live, no repeated data/shipped/version/content notification.",
    "1791605729890399660-manual.md": "Parent ops reports actual host git-push-main fixed0be5abd verified=true; receipt20261010-ops-parallel/main-push-receipt.json independently read below. Record success, no repeated push unless parent makes another authorized record commit.",
}
for item in queues:
    if item["kind"] == "manual":
        item["action"] = manual_dispositions.get(Path(item["path"]).name, "Unclassified new manual event; parent ops review required")

ledger_path = ROOT / "paper/materials/learning/ledger.jsonl"
ledger_rows = [json.loads(x) for x in ledger_path.read_text().splitlines() if x.strip()]
ledger_statuses = {}
for ident in ["silent-0317", "silent-0364", "silent-0352", "silent-0353", "silent-0354", "silent-0355"]:
    rows = [x for x in ledger_rows if x.get("id") == ident]
    shipped = [x for x in rows if x.get("status") == "shipped"]
    ledger_statuses[ident] = {"total_rows": len(rows), "shipped_rows": len(shipped),
                            "last_status": next((r["status"] for r in reversed(rows) if "status" in r), None)}

proof_paths = ["README.md", "AGENTS.md", "paper/materials/STATE-2026-10-10.md", "docs/learning-protocol.md",
               "paper/materials/decision-log.md", "notes/ops-handoff.md", "ops/learner_checks.py",
               "ops/codex-ops-learner.sh", "ops/codex-fast.sh", "eval/versions.json",
               "paper/materials/learning/ledger.jsonl", "notes/experience-integration-silent.json",
               "paper/materials/silent/20261009-strategy-concurrency/closure.json",
               "paper/materials/silent/20261009-strategy-concurrency/tests/host-full-1.json",
               "paper/materials/silent/20261009-strategy-concurrency/tests/host-full-2.json",
               "paper/materials/silent/20261010-autoplay-log-recovery/closure.json",
               "paper/materials/silent/20261010-core-experience-publication/closure.json",
               "paper/materials/20261010-ops-parallel/main-push-receipt.json"]
push_path = ROOT / proof_paths[-1]
push_receipt = read_json(push_path) if push_path.exists() else None
result = {
    "created_at": "2026-10-10 12:39:17 CST", "actor": "codex ops subagent queue_receipt_audit",
    "scope": "Read-only queue write/check/manual audit. Learner-done12 are another delegated audit; no queue deletion, scheduler mutation, dispatch, source/knowledge edits, merge or push here.",
    "read_cut": {"learn": {"path": "ops/codex-ops/learn.json", "bytes": len(learn_bytes), "sha256": hashlib.sha256(learn_bytes).hexdigest()}, "heads": heads},
    "queue_count": len(queues), "queue_kinds": dict(collections.Counter(x["kind"] for x in queues)),
    "unique_write_or_check_batches": len(batches),
    "batch_dispositions": dict(collections.Counter(x["disposition"] for x in batches.values())),
    "startup_failure_counts": dict(collections.Counter(x["startup_failure"] for x in batches.values() if x["startup_failure"])),
    "queue_events": queues, "batches": batches, "pending_source_groups": pending_groups,
    "byte_identical_superseded_rollout_tests": blob_proof, "ledger_reconciliation": ledger_statuses,
    "parent_host_push_receipt": push_receipt,
    "source_manifest": [metadata(p) for p in proof_paths],
    "commands": ["date", "nice -n 19 python3 -B paper/materials/20261010-ops-parallel/queue-audit/analyze.py",
                 "Existing ops/learner_checks.py read_report(path) only; no finish/check_jobs/status invocation",
                 "git rev-parse main/live", "git cat-file -e <sha>^{commit}",
                 "git merge-base --is-ancestor <sha> <pinned_main/live>",
                 "git diff-tree --no-commit-id --name-only -r <sha>",
                 "git rev-parse <sha>:<fixed_first_party_test_path>"],
    "limitations": ["Host process identity not visible authoritatively from sandbox; no status CLI used. Parent ops must verify current procs before operational actions.",
                    "All failed/rc/retry reports remain original; later accepted replacement does not rewrite earlier success or historical release time.",
                    "Source ancestry proves inclusion, not unchanged semantics. Pending overlapping implementations require exact-source review and normal test/merge flow.",
                    "No tests rerun for read-only records. Test0 values are original report/host receipt facts, not this audit's own test execution.",
                    "Root main names corrected previously; historical reports can retain original old notification path metadata. No correction performed by this audit."]
}
experience_path = "knowledge/characters/silent/experience.json"
current_experience = json.loads(git("show", live + ":" + experience_path).stdout)
source_experience_text = git("show", "e77eb7083e3c1cc1b08b21709ae600cfd447a715:" + experience_path).stdout
source_experience = json.loads(source_experience_text)
old_entries = {e["id"]: e for e in current_experience["entries"]}
new_entries = {e["id"]: e for e in source_experience["entries"]}
result["experience6_structural_comparison"] = {
    "source": "e77eb7083e3c1cc1b08b21709ae600cfd447a715", "current_live": live,
    "version_from": current_experience["version"], "version_to": source_experience["version"],
    "count_from": len(old_entries), "count_to": len(new_entries),
    "added": sorted(new_entries.keys() - old_entries.keys()),
    "removed": sorted(old_entries.keys() - new_entries.keys()),
    "changed_ids": [k for k in sorted(old_entries.keys() & new_entries.keys()) if old_entries[k] != new_entries[k]],
    "core_entries_unchanged": {k: old_entries[k] == new_entries[k] for k in sorted(old_entries) if k.startswith("silent-core-")},
    "source_legacy_human_names": len(re.findall(r"\bDai\b|\bDAI\b", source_experience_text)),
    "scope": "structure-only comparison, no game knowledge supplied",
}
(DEST / "audit.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
lines = ["# ops 队列只读去重审计", "", "切点：2026-10-10 12:39:17 CST；原始队列67条不是67个活学习任务。", "",
         "读取原 `.out` 使用现有 `read_report`，核对注册报告、报告路径/SHA、固定main/live祖先和已有结案。未调用status/finish，不改原failed、队列或共享记录。", "",
         "## 需要先解决的根因", "", "18个rc3原out均0字节：17个为同一recursive Codex Fast launcher模型题前拒绝，001301-fix是独立旧树glob路径不存在。提案链缺字段是空回报的下游症状，不能伪造code_proposals/source_commit补齐。当前launcher94—95仍可能把wrapper当native CLI，再触发codex-fast.sh递归拒绝。", "",
         "## 已上线／已补验，仅记录收尾", ""]
for batch_id, entry in batches.items():
    if entry["disposition"] in {"already_integrated_record_only", "accepted_no_source_change_record_only"}:
        lines.append(f"- `{batch_id}`：{entry['action']}")
lines += ["", "其中原142—145四经验批源提交已由061301整体上线，不造四次历史版本。旧Fast测试的两个失败路径与后续修正补验吻合；原两批固定旧树结果仍是1，不冒报原树曾通过。", "",
          "rollout81d6226两测试文件与当前main/live逐blob相同，由366917d复用发布。原014301-fix的三实现已沿034301成功上线。", "",
          "## 真正待安全集成的去重组", ""]
for group in pending_groups:
    lines.append(f"### {group['group']}")
    lines += ["", group["note"], ""]
    for c in group["verification"]:
        lines.append(f"- `{c['commit']}`；main/live祖先：{c.get('ancestor')}；路径：{'、'.join(c.get('changed_paths', []))}")
    lines.append("")
    lines.append("原tests：`" + json.dumps(group["tests"], ensure_ascii=False) + "`")
    lines.append("")
lines += ["## 手动事件", ""]
for event in queues:
    if event["kind"] == "manual":
        lines.append(f"- `{Path(event['path']).name}`：{event.get('action')}")
lines += ["", "## 不能直接强结案", "", "121301-fix无新增代码、原自测2673例通过，但main/live的SOURCE_PATHS差异不满足现有空批验收；保持failed/rc0，不能手写done或发明合入。后续应由主ops按正常集成/等价核实处理。", "",
          "silent-0364与silent-0317在main账本均仍proposed，已核实窄范围实际上线；主ops只经ledger CLI登记对应scope，不关闭原宽提案。核心0352—0355已有各一次数据shipped，不重复。", "",
          "原生日志tail早先已执行并看到实时COMBAT；老reload记录现在只需宿主当前身份核实，不再重复启动。姓名/main推送由主ops本轮宿主回执verified=true，当前审计仅读该回执，不重复push。", "",
          "完整逐事件SHA、原报告、source/test路径及固定Git证据见 `audit.json`；复盘12事件交兄弟子agent独立核查。"]
(DEST / "report.md").write_text("\n".join(lines) + "\n")
print(json.dumps({"directory": str(DEST.relative_to(ROOT)), "batches": len(batches),
                  "startup": result["startup_failure_counts"], "dispositions": result["batch_dispositions"],
                  "pending_groups": len(pending_groups), "push_receipt_present": bool(push_receipt)}, ensure_ascii=False))
