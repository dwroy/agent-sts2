"""Fixed fixtures; no model, scheduler, Herdr server or game is started."""
from concurrent.futures import ThreadPoolExecutor
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "ops"))
spec = importlib.util.spec_from_file_location("ops_assist", ROOT / "ops/ops_assist.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class AssistantTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ops-assist-fixture-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.manager = m.Assist(self.root, self.root / "ops/codex-ops")
        (self.root / "notes").mkdir()
        (self.root / "notes/evidence.json").write_text('{"character":"silent","state":"pending"}')

    def request(self, name="audit-one", **changes):
        request = {"request_id": name, "character": "silent", "kind": "request-status", "objective": "核实请求当前状态", "inputs": ["notes/evidence.json"]}
        request.update(changes)
        (self.manager.base / "requests" / (name + ".json")).write_bytes(m.encode(request))
        return request

    def claimed(self, job, state):
        state.update(worker=m.identity(os.getpid()), status="running")
        self.manager.save(job, state)

    def dispatch(self, name="audit-one"):
        self.request(name)
        with patch.object(self.manager, "start", side_effect=self.claimed):
            return self.manager.dispatch(name)

    def test_limit_dedupe_and_frozen_input(self):
        self.dispatch()
        self.dispatch("audit-two")
        self.request("audit-three")
        with self.assertRaisesRegex(ValueError, "duplicate"):
            self.manager.dispatch("audit-one")
        with self.assertRaisesRegex(ValueError, "concurrency"):
            self.manager.dispatch("audit-three")
        frozen = self.manager.job("audit-one") / "input/00.txt"
        (self.root / "notes/evidence.json").write_text("changed")
        self.assertIn("pending", frozen.read_text())

    def test_three_simultaneous_dispatches_claim_only_two_slots(self):
        names = ["race-one", "race-two", "race-three"]
        for name in names:
            self.request(name)
        def dispatch(name):
            try:
                self.manager.dispatch(name)
                return "accepted"
            except ValueError as error:
                return str(error)
        with patch.object(self.manager, "start", side_effect=self.claimed), ThreadPoolExecutor(max_workers=3) as pool:
            outcomes = list(pool.map(dispatch, names))
        self.assertEqual(outcomes.count("accepted"), 2)
        self.assertEqual(sum("concurrency" in result for result in outcomes), 1)

    def test_path_role_and_command_rejections(self):
        for changes in [{"inputs": ["../outside.md"]}, {"inputs": ["/tmp/foo.md"]}, {"inputs": ["knowledge/characters/ironclad/file.json"]},
                        {"command": "touch /tmp/bad"}, {"source_commit": "HEAD;touch"}, {"kind": "play"}, {"character": "SILENT"}]:
            self.request(**changes)
            with self.assertRaises((ValueError, TypeError)):
                self.manager.dispatch("audit-one")
        self.request()
        for text in ['{"character":"ironclad"}', '{"character":"IRONCLAD"}', 'character=IRONCLAD']:
            (self.root / "notes/evidence.json").write_text(text)
            with self.assertRaisesRegex(ValueError, "cross-character"):
                self.manager.dispatch("audit-one")
        (self.root / "notes/evidence.json").write_text('{"character":"SILENT"}')
        self.manager.validate("audit-one")
        (self.root / "notes/evidence.json").unlink()
        (self.root / "notes/evidence.json").symlink_to("/etc/passwd")
        with self.assertRaisesRegex(ValueError, "symlink"):
            self.manager.dispatch("audit-one")
        for bad in ["../id", "a;echo", "a/id", "UPPER", "a" * 49]:
            with self.assertRaises(ValueError):
                self.manager.dispatch(bad)

    def test_launch_failure_retained_and_slot_released(self):
        self.request()
        with patch.object(self.manager, "start", side_effect=OSError("fixture launch failure")):
            with self.assertRaises(OSError):
                self.manager.dispatch("audit-one")
        job = self.manager.job("audit-one")
        self.assertEqual(json.loads((job / "state.json").read_text())["status"], "failed")
        self.assertTrue((job / "request.json").exists())
        self.assertEqual(len(list((self.manager.state / "queue").glob("*.md"))), 1)
        self.dispatch("audit-two")
        self.dispatch("audit-three")

    def test_dead_or_reused_pid_and_orphan_reconciliation(self):
        state = self.dispatch()
        job = self.manager.job("audit-one")
        state["worker"]["start"] = "stale-start"
        self.manager.save(job, state)
        result = self.manager.reconcile()
        self.assertEqual(result[0]["status"], "lost")
        self.manager.reconcile()
        self.assertEqual(len(list((self.manager.state / "queue").glob("*.md"))), 1)
        orphan = self.dispatch("audit-orphan")
        orphan.update(worker=None, engine=m.identity(os.getpid()))
        self.manager.save(self.manager.job("audit-orphan"), orphan)
        self.assertEqual(self.manager.reconcile()[1]["status"], "orphaned")

    def test_uncertain_herdr_is_not_duplicated_and_late_worker_refused(self):
        self.request()
        with patch.dict(os.environ, {"CODEX_OPS_LEARNER_HOST": "herdr"}), patch.object(m.subprocess, "run", side_effect=[subprocess.CompletedProcess([], 0, b"", b""), subprocess.CompletedProcess([], 1, b"", b"uncertain")]), patch.object(m.subprocess, "Popen") as popen:
            state = self.manager.dispatch("audit-one")
        popen.assert_not_called()
        self.assertEqual(state["status"], "launch-uncertain")
        self.assertEqual(self.manager.reconcile()[0]["status"], "launch-uncertain")
        state["created"] -= 121
        self.manager.save(self.manager.job("audit-one"), state)
        self.assertEqual(self.manager.reconcile()[0]["status"], "lost")
        with self.assertRaisesRegex(ValueError, "terminal"):
            self.manager.worker("audit-one")

    def test_receipt_needs_turn_and_bound_substantive_report(self):
        self.dispatch()
        job = self.manager.job("audit-one")
        manifest = json.loads((job / "input/manifest.json").read_text())
        report = {key: manifest[key] for key in ("request_id", "character", "input_sha256")}
        report.update(status="complete", findings=[{"input": "00.txt", "observation": "pending 不是完成"}], limitations=["冻结切点"], next_steps=[])
        path = job / "stdout.jsonl"
        rows = [{"type": "thread.started", "thread_id": "fixture-session"}, {"type": "item.completed", "item": {"type": "agent_message", "text": json.dumps(report)}}, {"type": "turn.completed"}]
        path.write_text("\n".join(json.dumps(r) for r in rows))
        self.assertEqual(m.read_completion(path, 0, manifest)["session_id"], "fixture-session")
        for bad_rows, rc in [(rows[:-1], 0), (rows, 1), (rows + [{"type": "turn.failed"}], 0)]:
            path.write_text("\n".join(json.dumps(r) for r in bad_rows))
            with self.assertRaises(ValueError):
                m.read_completion(path, rc, manifest)
        report["input_sha256"] = "wrong"
        rows[1]["item"]["text"] = json.dumps(report)
        path.write_text("\n".join(json.dumps(r) for r in rows))
        with self.assertRaisesRegex(ValueError, "mismatch"):
            m.read_completion(path, 0, manifest)

    def test_source_check_uses_fixed_patch_and_changed_data_paths(self):
        sha = "a" * 40
        self.request(kind="source-check", source_commit=sha)
        patch_bytes = b"infrastructure code may reference knowledge/characters/ironclad/file.json"
        with patch.object(m, "git_snapshot", side_effect=[b"commit\n", b"ops/fixed.ts\n", patch_bytes]), patch.object(m.subprocess, "run", return_value=subprocess.CompletedProcess([], 1, b"", b"")):
            _, _, frozen = self.manager.validate("audit-one")
        self.assertIn((f"git-show-{sha}.txt", patch_bytes), frozen)
        for name in [b"knowledge/characters/ironclad/data.json\n", b"agent/.env\n", b"game/sts2.dll\n"]:
            with patch.object(m, "git_snapshot", side_effect=[b"commit\n", name]):
                with self.assertRaises(ValueError):
                    self.manager.validate("audit-one")

    def test_completion_event_recovery_checks_delivered(self):
        state = self.dispatch()
        state.update(status="completed", event_name="123-ops-assist-done.md")
        delivered = self.manager.state / "delivered"
        delivered.mkdir()
        (delivered / state["event_name"]).write_text("original event")
        self.manager.save(self.manager.job("audit-one"), state)
        self.manager.reconcile()
        self.assertEqual(list((self.manager.state / "queue").glob("*.md")), [])

    def test_wrapper_exit_retains_native_child_and_cleanup_uses_identity(self):
        code = "import subprocess,time; subprocess.Popen(['sleep','30']); time.sleep(.3)"
        proc = subprocess.Popen([sys.executable, "-c", code], start_new_session=True)
        saved = m.identity(proc.pid)
        self.addCleanup(lambda: m.stop_engine(saved))
        proc.wait(timeout=5)
        self.assertFalse(m.alive(saved))
        self.assertTrue(m.engine_members(saved))
        state = self.dispatch()
        state.update(worker=None, engine=saved)
        self.manager.save(self.manager.job("audit-one"), state)
        self.assertEqual(self.manager.reconcile()[0]["status"], "orphaned")
        self.assertTrue(m.stop_engine(saved))
        self.assertFalse(m.engine_members(saved))
        self.assertEqual(self.manager.reconcile()[0]["status"], "lost")

    def test_worker_end_to_end_and_changed_evidence_rejected(self):
        real_run = m.subprocess.run
        for name, mutate in (("complete-fixture", False), ("mutated-fixture", True)):
            self.request(name)
            with patch.object(self.manager, "start"):
                self.manager.dispatch(name)
            job = self.manager.job(name)
            manifest = json.loads((job / "input/manifest.json").read_text())
            report = {key: manifest[key] for key in ("request_id", "character", "input_sha256")}
            report.update(status="complete", findings=[{"input": "00.txt", "observation": "pending"}], limitations=[], next_steps=[])
            rows = [{"type": "thread.started", "thread_id": "fixed-session"}, {"type": "item.completed", "item": {"type": "agent_message", "text": json.dumps(report)}}, {"type": "turn.completed"}]
            script = "import time; time.sleep(.1); "
            if mutate:
                script += "from pathlib import Path; Path('00.txt').write_text('changed'); "
            script += "print(" + repr("\n".join(json.dumps(row) for row in rows)) + ")"
            plan = {"command": {"command": sys.executable, "args": ["-c", script], "stdin": "fixture prompt"}, "probe": ["-c", "pass"], "env": dict(os.environ)}
            def fake_prepare(argv, **kwargs):
                if "--import" in argv:
                    return subprocess.CompletedProcess(argv, 0, json.dumps(plan).encode(), b"")
                return real_run(argv, **kwargs)
            with patch.object(m.subprocess, "run", side_effect=fake_prepare):
                self.assertEqual(self.manager.worker(name), 1 if mutate else 0)
            state = json.loads((job / "state.json").read_text())
            self.assertEqual(state["status"], "failed" if mutate else "completed")
            self.assertEqual((job / "report.json").exists(), not mutate)
            self.assertTrue((job / "stdout.jsonl").exists())
            self.assertTrue((self.manager.state / "queue" / state["event_name"]).exists())

    def test_herdr_fixture_hosts_a_complete_read_only_worker(self):
        # The existing fake Herdr runs pane commands locally; the only model binary is a fixture.
        fixture_bin = self.root / "fake-codex.py"
        fixture_bin.write_text("#!/usr/bin/env python3\nimport json,sys,time\nfrom pathlib import Path\nif sys.argv[1]=='sandbox': sys.exit(0)\nm=json.loads(Path('manifest.json').read_text())\nr={k:m[k] for k in ('request_id','character','input_sha256')}\nr.update(status='complete',findings=[{'input':'00.txt','observation':'fixture pending'}],limitations=[],next_steps=[])\nfor row in [{'type':'thread.started','thread_id':'fixture-only'},{'type':'item.completed','item':{'type':'agent_message','text':json.dumps(r)}},{'type':'turn.completed'}]: print(json.dumps(row))\ntime.sleep(.1)\n")
        fixture_bin.chmod(0o755)
        (self.root / "agent").mkdir()
        (self.root / "agent/node_modules").symlink_to(ROOT / "agent/node_modules")
        (self.root / "learner/tasks").mkdir(parents=True)
        (self.root / "learner/tasks/ops-assist.md").write_text((ROOT / "learner/tasks/ops-assist.md").read_text())
        self.request()
        env = {"CODEX_OPS_LEARNER_HOST": "herdr", "HERDR_BIN": str(ROOT / "agent/tests/fixtures-herdr/fake-herdr.py"),
               "FAKE_HERDR_DIR": str(self.root / "fake-herdr"), "HERDR_HOST_STATE": str(self.manager.state / "herdr.json"),
               "HERDR_HOST_WORKSPACE": "ops-assist-fixture", "HERDR_HOST_CWD": str(self.root), "LEARNER_CODEX_BIN": str(fixture_bin),
               "PATH": str(Path.home() / ".local/node/bin") + ":" + os.environ.get("PATH", "")}
        with patch.dict(os.environ, env):
            state = self.manager.dispatch("audit-one")
        self.assertEqual(state["hosting"], "herdr")
        self.assertIn("pane", state)
        job = self.manager.job("audit-one")
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            state = json.loads((job / "state.json").read_text())
            if state["status"] not in m.ACTIVE:
                break
            time.sleep(.1)
        self.assertEqual(state["status"], "completed", (job / "prepare.err").read_text() if (job / "prepare.err").exists() else state)
        self.assertEqual(json.loads((job / "report.json").read_text())["session_id"], "fixture-only")
        self.assertTrue((self.manager.state / "queue" / state["event_name"]).exists())
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            panes = json.loads((self.root / "fake-herdr/state.json").read_text())["panes"]
            if state["pane"] not in panes:
                break
            time.sleep(.1)
        self.assertNotIn(state["pane"], panes)
        archived = (self.manager.state / "herdr-panes.log").read_text()
        self.assertIn("phase=read-only-analysis", archived)
        self.assertIn("phase=finished status=completed", archived)

    def test_runtime_symlink_rejected_before_creation(self):
        external = self.root / "external"
        external.mkdir()
        (self.root / "redirect").symlink_to(external)
        with self.assertRaisesRegex(ValueError, "symlink"):
            m.Assist(self.root, self.root / "redirect/new")
        self.assertFalse((external / "new").exists())


if __name__ == "__main__":
    unittest.main()
