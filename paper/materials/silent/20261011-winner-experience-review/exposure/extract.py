"""Audit one run using frozen brain offsets and bounded smaller call/config logs."""
import collections
import hashlib
import json
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[4]
RUN = "7S8HCC0M6G9W"
RECORDED = "2026-10-11T00:39:04+08:00"
CORE = ["silent-core-poison-defense-observation", "silent-core-dexterity-defense-observation",
        "silent-core-shiv-defense-observation", "silent-core-discard-relic-observation"]

def sha(raw):
    return hashlib.sha256(raw).hexdigest()

def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")

def read_bounded(name):
    path = ROOT / "logs" / name
    limit = path.stat().st_size
    out = []
    with path.open("rb") as f:
        off = 0
        line_no = 0
        while off < limit:
            raw = f.readline(limit - off)
            line_no += 1
            if RUN.encode() in raw:
                row = json.loads(raw)
                if row.get("run_id") == RUN:
                    out.append(({"path": f"logs/{name}", "line": line_no, "offset": off,
                                 "length": len(raw), "sha256": sha(raw)}, row))
            off += len(raw)
    return out, {"path": f"logs/{name}", "frozen_bytes": limit, "selected_rows": len(out)}

funnel_path = ROOT / "paper/materials/silent/20261011-0012-a10-funnel-20-run/evidence.json"
funnel_raw = funnel_path.read_bytes()
old = json.loads(funnel_raw)
indexed = [r for r in old["bounded_raw_rows"]["brain.jsonl"] if r["row"]["run_id"] == RUN]
brains = []
with (ROOT / "logs/brain.jsonl").open("rb") as f:
    for ref in indexed:
        f.seek(ref["off"])
        raw = f.read(ref["len"])
        assert sha(raw) == ref["sha256"]
        row = json.loads(raw)
        answer = json.dumps(row.get("answer"), ensure_ascii=False)
        brains.append({"source": {"path": "logs/brain.jsonl", "offset": ref["off"],
                                  "length": ref["len"], "sha256": ref["sha256"]},
                       **{k: row.get(k) for k in ["ts", "question_id", "label", "engine", "model",
                                                  "effort", "system_sha", "system_chars", "knowledge",
                                                  "answer", "accepted", "problems"]},
                       "floor": row.get("payload", {}).get("facts", {}).get("floor")
                       or row.get("payload", {}).get("run_brief", {}).get("floor"),
                       "explicit_core_ids_in_answer": [i for i in CORE if i in answer]})
configs, config_provenance = read_bounded("run-config.jsonl")
assert len(configs) == 1
config_ref, config = configs[0]
calls, call_provenance = read_bounded("codex-calls.jsonl")
call_rows = [{"source": ref, **{k: row.get(k) for k in ["ts", "question_id", "label", "model", "effort", "outcome", "cache_request", "usage"]}} for ref, row in calls]
for b in brains:
    matching = [c for c in call_rows if c["question_id"] == b["question_id"]
                and c["cache_request"]["instructions"]["sha256"].startswith(b["system_sha"])
                and c["outcome"] == "answered"]
    assert matching, b["question_id"]
    b["answered_client_digest_matches"] = len(matching)
assert len(brains) == 51 and all(b["accepted"] is True and b["engine"] == "codex" for b in brains)
assert {b["knowledge"]["prefix_sha"] for b in brains} == {config["knowledge"]["prefix_sha"]}
assert {b["system_sha"] for b in brains} == {config["knowledge"]["system_sha"]}
commit = config["code"]["commit"]
exp_raw = subprocess.check_output(["git", "show", f"{commit}:knowledge/characters/silent/experience.json"], cwd=ROOT)
exp = json.loads(exp_raw)
lookup = {r["id"]: r for r in exp["entries"]}
baseline_path = ROOT / "paper/materials/silent/20261010-core-experience-publication/entries.json"
baseline = {r["id"]: r for r in json.loads(baseline_path.read_text())}
assert all(lookup[i] == baseline[i] and lookup[i]["status"] == "active"
           and lookup[i]["asc"][0] <= 10 <= lookup[i]["asc"][1] for i in CORE)
assert "knowledge/characters/silent/experience.json" not in config["code"]["dirty_files"]
current_raw = (ROOT / ".worktrees/live/knowledge/characters/silent/experience.json").read_bytes()
assert current_raw == exp_raw
request_path = ROOT / "notes/experience-integration-silent.json"
request_raw = request_path.read_bytes()
request = json.loads(request_raw)
write("integration-request-snapshot.json", request)
write("experience-core-entries.json", [lookup[i] for i in CORE])
write("brain-decisions.json", brains)
write("client-calls.json", call_rows)
write("run-config-metadata.json", {"source": config_ref, **{k: config[k] for k in ["ts", "run_id", "ascension", "character", "process", "code", "knowledge"]}})
selected = [b for b in brains if b["floor"] in [14, 24, 27, 34, 35, 36, 38, 44, 45, 46] or b["label"] == "run-plan"]
lines = ["# 首个 A10 胜局：经验读取和实际决策核查", "", f"核查时间：{RECORDED}。局号 `{RUN}`。", "",
         "本局在20:51开局时实际使用经验版本2026-10-10.8。51次已接受Codex问答均使用full知识前缀16b34215caf4、系统摘要4c5fda6fcce5；每次实际客户端instructions SHA均匹配。该运行Git提交经验文件含四条已上线核心组合经验，与发布原件相同，经验文件不在当时dirty列表中，四条均适用A10。", "",
         "这些证据支持四核心已经进入本局可用知识。原日志不保存全量system文本，故这里保留版本/blob、渲染机制、运行摘要与实际客户端摘要链，不冒称获得完整原始prompt快照。", "",
         "实际答案没有显式引用四核心ID；下列决策明确围绕毒防、抽牌、留费、拒绝边际牌展开，是与经验方向一致的实际采用行为，但旧经验/题面也含重叠信息，无法证明独立由某条新经验引发，更不能把单局胜利因果归于新经验。", "",
         "## 最新综合经验的状态", "",
         f"核查时 live 仍为 {exp['version']} / {len(exp['entries'])} 条，字节与本局开局commit经验blob相同。0374（牌组规模）、0376（能量/核心循环）、0385（有限回合输出）的唯一入库请求 `{request['request_id']}` 状态仍为 `{request['state']}`、batch={request['batch']}；尚未成为新的综合生产经验。本局不能作为这些待入库综合结论已经生效的证据。", "",
         "## 实际大脑决策原文", ""]
for b in selected:
    lines += [f"### F{b['floor']} {b['label']} / {b['question_id']}", "", f"UTC {b['ts']}；brain.jsonl 字节偏移 {b['source']['offset']}，长度 {b['source']['length']}，SHA256 {b['source']['sha256']}。", "", "```json", json.dumps(b["answer"], ensure_ascii=False, indent=2), "```", ""]
(OUT / "report.md").write_text("\n".join(lines) + "\n")
summary = {"recorded_at": RECORDED, "run_id": RUN, "brain_questions": len(brains), "accepted": len(brains),
           "client_digest_matches": len(brains), "prefix_sha": config["knowledge"]["prefix_sha"],
           "system_sha": config["knowledge"]["system_sha"], "experience_version": exp["version"], "experience_entries": len(exp["entries"]),
           "startup_commit": commit, "startup_experience_sha256": sha(exp_raw), "current_live_experience_sha256": sha(current_raw),
           "all_four_core_active_applicable_and_equals_publication": True,
           "explicit_core_id_citations": sum(bool(b["explicit_core_ids_in_answer"]) for b in brains),
           "current_integration_request": {k: request[k] for k in ["request_id", "state", "batch", "ledger_ids", "scope_revision", "dispatch_status"]},
           "source_request_sha256": sha(request_raw), "source_funnel_sha256": sha(funnel_raw),
           "bounded_sources": [config_provenance, call_provenance],
           "brain_read_method": "51 direct seek/read offsets from frozen funnel evidence; each original line SHA rechecked",
           "limitations": ["Full original system text is not stored in these logs; provenance plus renderer and matching client SHA establishes exposure.",
                           "No explicit experience ID citations; consistent decision behavior cannot identify the contribution of any individual entry.",
                           "0374/0376/0385 integration remains pending; related older lessons already exist, but the new consolidated guidance is not shipped.",
                           "Win required a second attempt at F49, revival, resources, combat code/Jev and many concurrent rules; no controlled causal comparison."]}
write("summary.json", summary)
write("manifest.json", {"recorded_at": RECORDED, "production_mutation": False, "sources": {
    "publication_entries": str(baseline_path.relative_to(ROOT)), "postmortem": "learner/runs/20261010-214303-postmortem/lesson-section.md",
    "renderer": "agent/src/knowledge/render/experience-text.ts", "knowledge_prompt": "agent/src/brain/knowledge.ts"},
    "files": {p.name: {"bytes": p.stat().st_size, "sha256": sha(p.read_bytes())} for p in sorted(OUT.iterdir()) if p.is_file() and p.name != "manifest.json"}})
print(json.dumps(summary, ensure_ascii=False, indent=2))
