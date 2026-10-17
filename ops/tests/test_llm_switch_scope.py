"""Fixed process identities: account sharing must not merge independent instance drains."""
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import llm_switch as switch

class ScopeTest(unittest.TestCase):
    def test_ancestry_is_bounded_and_does_not_exclude_sibling_workers(self):
        rows = {11: {"ppid": 10}, 12: {"ppid": 11}, 20: {"ppid": 1}, 30: {"ppid": 31}, 31: {"ppid": 30}}
        with patch.object(switch, "process", side_effect=lambda pid: rows.get(pid)):
            self.assertTrue(switch.ops_descendant(12, {10}))
            self.assertFalse(switch.ops_descendant(20, {10}))
            self.assertFalse(switch.ops_descendant(30, {10}))

    def test_explicit_conflicting_selectors_fail_closed(self):
        self.assertEqual(switch.instance_root([b"CODEX_OPS_ROOT=/x", b"STS2_WORKSPACE=/x"]), "/x")
        with self.assertRaises(ValueError):
            switch.instance_root([b"CODEX_OPS_ROOT=/x", b"STS2_WORKSPACE=/y"])
        self.assertIsNone(switch.instance_root([b"CODEX_HOME=/shared-login"]))

    def test_cwd_requires_private_registered_runtime_not_an_arbitrary_worktree(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp); runtime = root / "ops/codex-ops"; runtime.mkdir(parents=True)
            regent = root / ".worktrees/regent-climb"; own = regent / "ops/codex-ops"; own.mkdir(parents=True)
            (regent / "ops/instance-binding.json").write_text("{}")
            (own / "session-id").write_text("separate-session")
            learner = root / ".worktrees/learner"; (learner / "ops").mkdir(parents=True)
            (learner / "ops/instance-binding.json").write_text("{}")
            with patch.object(switch, "ROOT", root), patch.object(switch, "RUNTIME", runtime):
                self.assertEqual(switch.private_instance_cwd(regent), str(regent))
                self.assertIsNone(switch.private_instance_cwd(learner))
                self.assertIsNone(switch.private_instance_cwd(root))
                (own / "session-id").unlink()
                self.assertIsNone(switch.private_instance_cwd(regent))

    def test_snapshot_preserves_main_workers_and_excludes_only_proven_ops_and_instance(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp); runtime=root/"ops/codex-ops"; runtime.mkdir(parents=True)
            (runtime/"learn.json").write_text(json.dumps({"batches":{"unsettled":{"state":"running","pid":60}}}))
            (root/"handoff.md").write_text("ready_to_drain source-session")
            regent=root/".worktrees/regent-climb"; private=regent/"ops/codex-ops"; private.mkdir(parents=True)
            (regent/"ops/instance-binding.json").write_text("{}")
            (private/"session-id").write_text("other-session")
            rows={10:{"pid":10,"ppid":1,"start_ticks":"10","argv":"codex source-session"},
                  11:{"pid":11,"ppid":10,"start_ticks":"11","argv":"codex-code-mode-host"},
                  12:{"pid":12,"ppid":11,"start_ticks":"12","argv":"codex exec still-running-ops-helper"},
                  20:{"pid":20,"ppid":1,"start_ticks":"20","argv":"codex other-session"},
                  30:{"pid":30,"ppid":1,"start_ticks":"30","argv":"codex exec learner"},
                  40:{"pid":40,"ppid":1,"start_ticks":"40","argv":"codex app-server"},
                  50:{"pid":50,"ppid":1,"start_ticks":"50","argv":"node index.ts play"}}
            env={11:b"CODEX_HOME=/old/learner",12:b"CODEX_HOME=/old/learner",20:b"CODEX_HOME=/old/learner",30:b"CODEX_HOME=/old/learner",40:b"CODEX_HOME=/old/brain"}
            cwd={10:root,11:root,12:root,20:regent,30:root,40:root,50:root}
            class Proc:
                def __init__(self,pid,field=None): self.pid=pid; self.name=str(pid); self.field=field
                def __truediv__(self,field): return Proc(self.pid,field)
                def read_bytes(self): return env.get(self.pid,b"")
                def resolve(self): return cwd[self.pid]
                def __fspath__(self): return str(cwd[self.pid])
            class ProcRoot:
                def iterdir(self): return [Proc(pid) for pid in rows]
            original=Path
            def paths(value): return ProcRoot() if str(value)=="/proc" else original(value)
            def command(args):
                if args[:3]==["herdr","agent","get"]: return json.dumps({"result":{"agent":{"pane_id":"ops-pane","agent_status":"idle"}}})
                return json.dumps({"result":{"process_info":{"foreground_processes":[{"pid":10}]}}})
            with patch.object(switch,"ROOT",root),patch.object(switch,"RUNTIME",runtime),patch.object(switch,"Path",side_effect=paths),patch.object(switch,"process",side_effect=lambda pid:rows.get(int(pid))),patch.object(switch,"command",side_effect=command):
                result=switch.snapshot({"source":{"session":"source-session","learner_home":"/old/learner","brain_home":"/old/brain"},"target":{"handoff":"handoff.md"}})
            self.assertTrue(result["inventory_complete"])
            self.assertTrue(result["checkpoint_ready"])
            self.assertEqual({r["pid"] for r in result["active_workers"]},{12,30,40,50,60})
            self.assertEqual({r["pid"] for r in result["excluded_workers"]},{10,11,20})
            self.assertTrue((private/"session-id").exists())

if __name__ == "__main__": unittest.main()
