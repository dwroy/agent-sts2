import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it("LWQYSREHMMJ7: uses actual A10 instead of requested A11 for notifications and audits", () => {
  // Fixed run-config evidence; import the scheduler without invoking tick or touching live state.
  const result = spawnSync("python3", ["-B", "-c", `
import copy, importlib.util
from pathlib import Path
from unittest.mock import patch
spec = importlib.util.spec_from_file_location("learn", Path("../ops/codex-ops-learn.py"))
learn = importlib.util.module_from_spec(spec)
spec.loader.exec_module(learn)
observed = {"run_id": "LWQYSREHMMJ7", "character": "SILENT", "ascension": 10,
            "target_ascension": 11, "target_ascension_mode": "climb", "max_ascension": 10}
state = {"ascension": {"silent": 10}, "climb_audit_seen": {"silent": 10},
         "ascension_audits": {"silent:A10": {"state": "done", "attempts": 3}}}
before = copy.deepcopy(state)
events = []
with patch.object(learn, "jsonl", return_value=[observed]), \\
     patch.object(learn, "enqueue", side_effect=lambda kind, text: events.append((kind, text)) or kind):
    assert learn.check_ascension(state, "silent") == [], "a requested target is not an observed upgrade"
assert state == before, (state, before)
assert events == []

# A genuine observed upgrade emits exactly once, keeping the request target separate.
upgraded = dict(observed, run_id="SILENT000011", ascension=11, target_ascension=12, max_ascension=11)
with patch.object(learn, "jsonl", return_value=[observed, upgraded]), \\
     patch.object(learn, "enqueue", side_effect=lambda kind, text: events.append((kind, text)) or kind):
    assert learn.check_ascension(state, "silent") == ["ascension-up"]
    assert learn.check_ascension(state, "silent") == []
assert state["ascension"]["silent"] == 11
assert state["ascension_audits"]["silent:A11"]["anchor_run"] == "SILENT000011"
assert "silent:A12" not in state["ascension_audits"]
assert len(events) == 1 and "打 A11" in events[0][1] and "A12" not in events[0][1]

# Install-time observation also uses the actual level, even before a baseline is recorded.
fresh = {"ascension": {}}
with patch.object(learn, "jsonl", return_value=[observed]):
    assert learn.check_ascension(fresh, "silent") == []
assert fresh["climb_audit_seen"]["silent"] == 10
assert set(fresh["ascension_audits"]) == {"silent:A10"}

# Historical false requests and error evidence remain intact; this fix never marks them done.
legacy = {"ascension": {"silent": 11}, "climb_audit_seen": {"silent": 11},
          "ascension_audits": {"silent:A11": {"state": "queued", "attempts": 0, "anchor_run": "LWQYSREHMMJ7"}}}
before = copy.deepcopy(legacy)
with patch.object(learn, "jsonl", return_value=[observed]):
    assert learn.check_ascension(legacy, "silent") == []
assert legacy == before

for value in [None, True, False, -1, "11", 10.5]:
    row = dict(observed, ascension=value)
    assert learn.run_ascension(row) is None
    unchanged = copy.deepcopy(state)
    with patch.object(learn, "jsonl", return_value=[row]):
        assert learn.check_ascension(state, "silent") == []
    assert state == unchanged
assert learn.run_ascension({"target_ascension": 11}) is None
assert learn.run_ascension({"ascension": 0, "target_ascension": 11}) == 0
assert learn.run_ascension({"ascension": 10}) == 10
# Other characters are filtered before observation; their actual-level semantics are identical.
with patch.object(learn, "jsonl", return_value=[dict(upgraded, character="IRONCLAD")]):
    assert learn.check_ascension(state, "silent") == []
print("observed ascension notification/audit regression passed")
`], { encoding: "utf8", timeout: 10000 });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
