"""Read current notice provenance without invoking ACK or changing runtime state."""
from pathlib import Path
import datetime
import hashlib
import json

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent


def read(path):
    return json.loads((ROOT / path).read_bytes())


def reference(path):
    path = Path(path)
    path = path if path.is_absolute() else ROOT / path
    path.relative_to(ROOT)
    data = path.read_bytes()
    return {"path": str(path.relative_to(ROOT)), "sha256": hashlib.sha256(data).hexdigest()}


def verify(ref):
    actual = reference(ref["path"])
    assert actual["sha256"] == ref["sha256"], ref["path"]
    return actual


handoff = read("paper/materials/20261024-2313-notices-ops/notice-handoff.json")
audit = read("paper/materials/20261025-issue27-source-compat/source-audit.json")
receipts = read("paper/materials/20261025-issue27-role-receipts/registration-results.json")
current = read("ops/codex-ops/current.json")
source_refs = []
for group in audit["groups"]:
    source_refs.append(verify(group["source_binding"]))
    for key in ("original_log", "input", "original_message"):
        source_refs.append(verify(group["source"][key]))

rows = []
for old in handoff["notices"]:
    path = old["notice_path"]
    notice = read(path)
    for key in ("id", "request_id", "request_sha256", "message", "ops_forwarded"):
        assert notice[key] == old[key], (notice["id"], key)
    assert not notice["watcher_received"] and not notice["roy_notified"]
    assert hashlib.sha256(notice["message"].encode()).hexdigest() == old["message_sha256"]
    ops = read(notice["ops_forwarded"]["path"])
    ops_ref = verify(notice["ops_forwarded"])
    assert ops["actor"] == "ops" and ops["status"] == "delivered"
    assert ops["notice_id"] == notice["id"]
    verify(ops["evidence"])
    own = next(x for x in receipts["notices"] if x["notice_id"] == notice["id"])
    own_refs = {}
    for stage in ("watcher_received", "roy_notified"):
        ref = verify(own[stage + "_receipt"])
        receipt = read(ref["path"])
        assert receipt["notice_id"] == notice["id"] and receipt["stage"] == stage
        assert receipt["actor"] == "watcher" and receipt["status"] == "delivered"
        own_refs[stage] = {"receipt": ref, "evidence": verify(receipt["evidence"])}
    rows.append({"id": notice["id"], "notice": reference(path),
                 "original_identity_words_and_ops_receipt_unchanged": True,
                 "ops_forwarded": ops_ref, "own_frozen_receipts": own_refs,
                 "watcher_received": False, "roy_notified": False})

events = []
for event in current["queued_events"]:
    original = Path(event["path"])
    actual = original if original.exists() else ROOT / "ops/codex-ops/delivered" / original.name
    text = actual.read_text()
    matches = [row for row in rows if row["id"] + ".json" in text]
    assert len(matches) == 1
    notice = read(matches[0]["notice"]["path"])
    assert notice["message"] in text
    events.append({"snapshot_path": event["path"], "actual": reference(actual),
                   "notice_id": notice["id"], "complete_original_message_present": True,
                   "directory_location_is_not_role_ACK": True})
assert len(rows) == len(events) == 16
assert {r["id"] for r in rows} == {e["notice_id"] for e in events}

missing = audit["missing_original"]
assert all(not (ROOT / path).exists() for path in missing["absent_paths"])
state = read("ops/codex-ops/learn.json")
assert state["learning_requests"][missing["request_id"]]["state"] == "blocked"
cli = verify(audit["CLI"])
result = {"at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
          "role": "watcher", "CLI": cli, "source_refs": source_refs,
          "notices": rows, "events": events,
          "snapshot": reference("ops/codex-ops/current.json"), "snapshot_at": current["at"],
          "missing_original": missing, "missing_parent_state": "blocked",
          "formal_stages": {"ops_forwarded": 16, "watcher_received": 0, "roy_notified": 0},
          "production_ACK_invocations": 0, "notice_or_parent_or_ops_state_written": False}
(OUT / "verification.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"formal_stages": result["formal_stages"], "events_read": len(events),
                  "source_refs_verified": len(source_refs), "CLI_unchanged": True}, ensure_ascii=False))
