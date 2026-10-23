"""Fixed backfill admission, native consumption and recovery fixtures; no model/game."""
import copy
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "ops"))
import strategy_backfill_jobs as backfill
import learner_jobs as jobs
import proposal_dispatch as proposals

STAMP = "20260101-000001"
BID = STAMP + "-strategy-proposal"
PLAN = "issue48-boss-elite-001"
RUN = "SILENT000001"


class Backfill(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.directory = self.root / "ops/codex-ops"
        (self.directory / "learner").mkdir(parents=True)
        (self.root / "notes").mkdir()
        self.env = patch.dict(os.environ, {"CODEX_OPS_DIR": str(self.directory)})
        self.env.start(); self.addCleanup(self.env.stop)
        self.state = {"batches": {}}
        self.entries = [{"id": "silent-one", "lesson": "固定证据夹具"}, {"id": "silent-two", "lesson": "固定反例夹具"}, {"id": "silent-three"}]
        self.original = self.ref("frozen/experience.json", {"entries": self.entries})
        selected = self.ref("frozen/selected.json", {"batch_plan_id": PLAN, "entries": self.entries[:2], "available_ended_silent_ids": [RUN]})
        spec = self.ref("frozen/work.md", "固定冻结任务。\n")
        self.manifest = {"request_id": backfill.REQUEST, "batch_plan_id": PLAN, "source_experience": self.original,
                         "first_batch": selected, "work_spec": spec,
                         "own_ended_inventory": self.ref("frozen/runs.json", {"character": "silent", "runs": [{"run_id": RUN, "ended": "2026-01-01"}]}),
                         "priority": self.ref("frozen/priority.json", {}), "contracts": [], "external_aggregates": []}
        self.plan = {"plan_id": PLAN, "work_spec": spec, "input_manifest": self.ref("frozen/manifest.json", self.manifest)}
        self.config = {"schema": 1, "authorized_by": "Roy", "request_id": backfill.REQUEST, "character": "silent", "enabled": True, "plans": [self.plan]}
        self.save_config()
        self.base = "a" * 40
        self.tree = self.root / ".worktrees" / ("codex-strategy-silent-" + STAMP)
        self.calls = []

    def ref(self, name, value):
        path = self.root / name; path.parent.mkdir(parents=True, exist_ok=True)
        raw = value.encode() if isinstance(value, str) else json.dumps(value, ensure_ascii=False).encode()
        path.write_bytes(raw)
        return {"path": name, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}

    def save_config(self):
        (self.root / backfill.QUEUE).write_text(json.dumps(self.config))

    def writer(self, *args, **kwargs):
        self.calls.append((args, kwargs))
        bid = args[9] + "-strategy-proposal"
        self.state["batches"][bid] = {"task": args[3], "character": args[4], "runs": args[5], "key": args[6],
            "reason": args[7], "worktree": str(self.tree), "state": "running", "pid": 10, "pane": "w1:p2", **kwargs}
        return bid, 10

    def dispatch(self, normal=None, writer=None, stamp=STAMP, alive=lambda pid: False):
        with patch.object(backfill.subprocess, "check_output", return_value=self.base + "\n"):
            return backfill.dispatch(self.state, str(self.root), str(REPO / "ops"), "silent", alive, stamp,
                                     writer or self.writer, normal or {})

    def registered(self):
        self.assertEqual(self.dispatch(), (BID, 10))
        (self.directory / "learn.json").write_text(json.dumps(self.state))
        return self.state["batches"][BID]

    def native(self, batch=None, bid=BID):
        batch = batch or self.state["batches"][bid]
        marker = "[learner fixed marker]"
        prompt = marker + "\n" + bid + " " + PLAN + " " + batch["backfill_binding"]["input_manifest"]["sha256"]
        rows = [{"type": "session_meta", "payload": {"id": "session-new", "cwd": str(self.tree)}},
                {"type": "event_msg", "timestamp": "2026-01-01T00:00:00Z", "payload": {"type": "task_started", "turn_id": "turn-new"}},
                {"type": "turn_context", "payload": {"turn_id": "turn-new", "cwd": str(self.tree), "model": "gpt-6.1-sol", "effort": "high", "sandbox_policy": {"type": "workspace-write"}}},
                {"type": "event_msg", "payload": {"type": "user_message", "message": prompt}}]
        rollout = self.directory / "native.jsonl"
        rollout.write_text("".join(json.dumps(row) + "\n" for row in rows))
        proof = {"marker": marker, "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest()}
        receipt = {"label": "learner-" + bid, "pane": "w1:p2", "cwd": str(self.tree), "session": "session-new",
                   "submitted": True, "bindings": [{**proof, "turn_id": "turn-new"}], "submissions": [proof], "rollout": str(rollout)}
        path = self.directory / "learner" / ("learner-" + bid + ".tui.json")
        path.write_text(json.dumps(receipt))
        return path, rollout, rows

    def stdio(self, batch=None):
        batch = batch or self.state["batches"][BID]
        path, old, rows = self.native(batch)
        receipt = json.loads(path.read_text()); path.unlink()
        session = "11111111-2222-3333-4444-555555555555"
        rows[0]["payload"]["id"] = session
        rows.append({"type": "event_msg", "payload": {"type": "task_complete", "turn_id": "turn-new", "last_agent_message": "fixed"}})
        home = self.root / "account"
        rollout = home / "sessions/2026/01/01" / ("rollout-" + session + ".jsonl")
        rollout.parent.mkdir(parents=True); rollout.write_text("".join(json.dumps(row) + "\n" for row in rows))
        log = self.root / "learner/runs/fixed-launch.jsonl"; log.parent.mkdir(parents=True, exist_ok=True)
        identity = {"lease": "fixed", "input_sha256": "b" * 64, "command_sha256": "c" * 64}
        stream = [{"type": "learner_launch", "transport": "stdio", "cwd": str(self.tree), "task": "strategy-proposal", "params": {"batch": BID}},
                  {"type": "learner_startup_attempt", "batch": BID, **identity},
                  {"type": "thread.started", "thread_id": session},
                  {"type": "learner_summary", "exit_code": 0, "summary": {"sessionId": session}}]
        log.write_text("".join(json.dumps(row) + "\n" for row in stream))
        launch = {"batch": BID, "source": PLAN, "cwd": str(self.tree), "log": str(log), "codex_home": str(home),
                  "prompt_sha256": receipt["bindings"][0]["prompt_sha256"], **identity}
        (self.directory / "learner" / (BID + ".backfill-launch.json")).write_text(json.dumps(launch))
        return rollout

    def test_stdio_fallback_uses_its_original_account_native_prompt(self):
        self.registered(); self.stdio()
        backfill.reconcile(self.state, self.directory)
        self.assertEqual(self.state["strategy_backfill"]["cursor"], 2)
        self.assertEqual(self.state["strategy_backfill"]["plans"][PLAN]["attempts"][0]["native"]["session"], "11111111-2222-3333-4444-555555555555")

    def test_pre_model_failure_can_retry_explicitly_without_consuming(self):
        batch = self.registered(); batch.update(state="failed", rc=1)
        (self.directory / "learner" / (BID + ".backfill-not-started.json")).write_text(json.dumps(
            {"batch": BID, "source": PLAN, "worktree": str(self.tree), "models_started": 0}))
        self.plan["retry_generation"] = 1; self.save_config()
        self.tree = self.root / ".worktrees/codex-strategy-silent-20260101-000002"
        self.assertEqual(self.dispatch(stamp="20260101-000002")[0], "20260101-000002-strategy-proposal")
        self.assertEqual(self.state["strategy_backfill"]["cursor"], 0)
        self.assertEqual(len(self.calls), 2)

    def test_verified_retry_revisits_only_waiting_ids_and_keeps_unique_cursor(self):
        batch, report = self.report(); self.stdio(batch)
        batch.update(state="done", rc=0, backfill_result=report["backfill_results"])
        backfill.reconcile(self.state, self.directory)
        self.plan["retry_generation"] = 1; self.save_config()
        stamp = "20260101-000002"; bid = stamp + "-strategy-proposal"
        self.tree = self.root / ".worktrees" / ("codex-strategy-silent-" + stamp)
        with patch.object(jobs, "available", return_value=True), patch.object(jobs, "start_learner", return_value=(10, "w1:p2")):
            self.assertEqual(self.dispatch(stamp=stamp, writer=jobs.dispatch_write)[0], bid)
        new = self.state["batches"][bid]
        self.assertEqual(new["backfill_binding"]["entry_ids"], ["silent-two"])
        self.native(new, bid)
        backfill.reconcile(self.state, self.directory)
        backfill.reconcile(self.state, self.directory)
        record = self.state["strategy_backfill"]
        self.assertEqual(record["cursor"], 2)
        self.assertEqual(record["entries"]["silent-two"]["status"], "started")
        self.assertEqual(record["entries"]["silent-one"]["status"], "processed")
        self.assertEqual(record["processed"], 1)

    def test_task_preparation_preserves_strategy_identity_and_frozen_scope(self):
        self.registered()
        template = self.tree / "learner/tasks/strategy-proposal.md"; template.parent.mkdir(parents=True)
        shutil.copyfile(REPO / "learner/tasks/strategy-proposal.md", template)
        with patch.object(backfill.subprocess, "check_output", return_value=self.base + "\n"):
            task = backfill.task_file(str(self.root), str(self.directory), BID, "silent", str(self.tree), PLAN)
        text = Path(task).read_text()
        self.assertEqual(Path(task).name, "strategy-proposal.md")
        self.assertIn(self.plan["input_manifest"]["sha256"], text)
        self.assertIn("HEAD保持dispatch_base", text)
        self.assertIn("backfill_results", text)

    def test_disabled_and_wrong_character_do_not_dispatch_or_consume(self):
        self.config["enabled"] = False; self.save_config()
        self.assertIsNone(self.dispatch())
        self.assertNotIn("strategy_backfill", self.state)
        self.assertIsNone(backfill.dispatch(self.state, str(self.root), "", "ironclad", lambda pid: False, STAMP, self.writer, {}))
        self.assertEqual(self.calls, [])

    def test_normal_ready_work_and_live_heavy_leases_win(self):
        for field in ("backfill_hold", "disk_capacity_hold", "strategy", "code_proposal", "calibration", "core_builds", "postmortem", "ascension_audit", "learning_requests"):
            self.assertIsNone(self.dispatch({field: True}))
        self.state["learning_requests"] = {"normal": {"state": "pending"}}
        self.assertIsNone(self.dispatch())
        self.state.pop("learning_requests")
        self.state["calibration_ready"] = {"silent": "fixed-calibration"}
        self.assertIsNone(self.dispatch())
        self.state.pop("calibration_ready")
        self.state["batches"]["heavy"] = {"state": "running", "pid": 20, "task": "fix-batch"}
        self.assertIsNone(self.dispatch(alive=lambda pid: True))
        self.assertEqual(self.calls, [])

    def test_pending_heavy_queue_and_audit_are_not_overtaken(self):
        self.state["boss_sim_observed"] = {"silent": {"eligible": [{"boss": "FIXTURE", "mode": "b4", "key": "fixed"}]}}
        self.assertIsNone(self.dispatch())
        self.state.pop("boss_sim_observed")
        self.state["ascension_audits"] = {"fixed": {"character": "silent", "state": "queued"}}
        self.assertIsNone(self.dispatch())

    def test_normal_writer_wait_retains_priority_without_a_launch(self):
        with patch.object(jobs, "pending", return_value=[RUN]), patch.object(jobs, "dispatch_write", return_value=None), \
                patch.object(jobs, "fix_key", return_value=None), patch.object(jobs, "strategy_job", return_value=None), \
                patch.object(jobs, "calibration_job", return_value=None), patch("boss_sim_jobs.check", return_value=None):
            normal = jobs.check_jobs(self.state, str(self.root), str(REPO / "ops"), "silent", lambda pid: False, STAMP)
        self.assertTrue(normal["backfill_hold"])
        self.assertIsNone(self.dispatch(normal))

    def test_shared_writer_slots_and_available_gates_are_preserved(self):
        for mode in ("slots", "writer"):
            self.state = {"batches": {}}
            if mode == "slots":
                self.state["batches"] = {str(i): {"task": "strategy-proposal", "state": "running", "pid": i + 1} for i in range(2)}
            with patch.object(jobs, "available", return_value=mode != "writer"), patch.object(jobs, "start_learner", side_effect=AssertionError("gate bypass")):
                result = self.dispatch(writer=jobs.dispatch_write, alive=lambda pid: True)
            self.assertIsNone(result)
            self.assertNotIn("strategy_backfill", self.state)

    def test_frozen_input_tamper_stops_before_registration(self):
        (self.root / self.original["path"]).write_text("tampered")
        self.assertIsNone(self.dispatch())
        self.assertIn("fingerprint", self.state["strategy_backfill_error"]["reason"])
        self.assertEqual(self.calls, [])

    def test_registered_wrapper_is_not_a_native_start_and_no_duplicate(self):
        self.registered()
        backfill.reconcile(self.state, self.directory)
        self.assertEqual(self.state["strategy_backfill"]["cursor"], 0)
        self.assertIsNone(self.dispatch(stamp="20260101-000002"))
        self.assertEqual(len(self.calls), 1)
        self.assertNotIn("research_request", self.state["batches"][BID])
        self.assertEqual(self.calls[0][1], {"backfill_source": PLAN})

    def test_host_must_read_actual_saved_binding_and_immutable_inputs(self):
        batch = self.registered()
        self.assertEqual(backfill.prepare(str(self.root), str(self.directory), BID, "silent", str(self.tree), PLAN)[0], batch)
        (self.directory / "learn.json").write_text('{"batches":{}}')
        with self.assertRaises(KeyError): backfill.prepare(str(self.root), str(self.directory), BID, "silent", str(self.tree), PLAN)

    def test_native_acceptance_advances_ids_once_across_restarts(self):
        batch = self.registered(); original = copy.deepcopy(batch)
        self.native()
        backfill.reconcile(self.state, self.directory)
        self.assertEqual(self.state["strategy_backfill"]["cursor"], 2)
        self.assertEqual(self.state["strategy_backfill"]["processed"], 0)
        self.assertEqual(self.state["strategy_backfill"]["remaining"], 3)
        restored = json.loads(json.dumps(self.state))
        backfill.reconcile(restored, self.directory)
        self.assertEqual(restored["strategy_backfill"]["cursor"], 2)
        self.assertEqual(batch, original)  # Startup lease fingerprint never changes.

    def test_native_wrong_prompt_context_or_old_turn_does_not_consume(self):
        self.registered()
        for mode in ("prompt", "context", "old-turn"):
            self.state.pop("strategy_backfill", None)
            _, rollout, rows = self.native()
            if mode == "prompt": rows[-1]["payload"]["message"] += " changed"
            if mode == "context": rows[2]["payload"]["effort"] = "xhigh"
            if mode == "old-turn": rows.insert(1, {"type": "event_msg", "payload": {"type": "task_started", "turn_id": "old"}})
            rollout.write_text("".join(json.dumps(row) + "\n" for row in rows))
            backfill.reconcile(self.state, self.directory)
            self.assertEqual(self.state["strategy_backfill"]["cursor"], 0)

    def report(self):
        batch = self.registered(); self.native()
        scratch = self.tree / "learner/runs/fixed"; scratch.mkdir(parents=True)
        candidate = scratch / "candidate.json"; candidate.write_text('{"candidate":"fixed"}')
        report = {"task": "strategy-proposal", "character": "silent", "batch": BID, "base": self.base, "runs": [RUN],
                  "fixes": [], "merged": None, "tests": {"tsc": None, "vitest": None, "cases": None}, "proposal_results": [],
                  "backfill_source": PLAN, "input_sha256": self.plan["input_manifest"]["sha256"], "report": str(scratch / "report.md"),
                  "backfill_results": [{"id": "silent-one", "state": "processed", "reason": "候选待发布", "destinations": [{"kind": "strategy", "id": "fixed", "path": str(candidate)}]},
                                       {"id": "silent-two", "state": "waiting", "reason": "缺原窗", "destinations": []}]}
        self.save_report(report)
        return batch, report

    def save_report(self, report):
        Path(report["report"]).write_text('```json\n' + json.dumps(report) + '\n```\n')

    def test_completed_dispositions_keep_waiting_remaining_and_duration(self):
        batch, report = self.report()
        proof = backfill.report_proof(report, batch, str(self.root))
        batch.update(state="done", rc=0, finished="2026-01-01", backfill_finished_at=1767225602, backfill_result=proof["dispositions"])
        backfill.reconcile(self.state, self.directory)
        p = self.state["strategy_backfill"]
        self.assertEqual((p["cursor"], p["processed"], p["remaining"]), (2, 1, 2))
        self.assertEqual(p["plans"][PLAN]["state"], "waiting")
        self.assertEqual(p["plans"][PLAN]["attempts"][0]["elapsed_seconds"], 2)
        self.assertIsNone(self.dispatch(stamp="20260101-000002"))

    def test_missing_duplicate_or_invented_destination_cannot_complete(self):
        batch, report = self.report()
        for rows in (report["backfill_results"][:1], [report["backfill_results"][0]] * 2):
            changed = dict(report, backfill_results=rows); self.save_report(changed)
            with self.assertRaises(ValueError): backfill.report_proof(changed, batch, str(self.root))
        changed = copy.deepcopy(report); changed["backfill_results"][0]["destinations"][0]["path"] = str(self.root / "outside")
        self.save_report(changed)
        with self.assertRaises(ValueError): backfill.report_proof(changed, batch, str(self.root))

    def test_failed_or_uncertain_attempt_does_not_restart_from_a_dead_pid(self):
        batch = self.registered(); batch.update(state="failed", rc=1)
        backfill.reconcile(self.state, self.directory)
        self.assertEqual(self.state["strategy_backfill"]["cursor"], 0)
        self.config["plans"][0]["retry_generation"] = 1; self.save_config()
        self.assertIsNone(self.dispatch(stamp="20260101-000002"))
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(self.state["strategy_backfill"]["plans"][PLAN]["state"], "unverified-start")

    def test_no_change_proof_uses_backfill_instead_of_legacy_research(self):
        batch, report = self.report()
        with patch.object(proposals.subprocess, "check_output", side_effect=[self.base + "\n", ""]), \
                patch.object(proposals, "research_proof", side_effect=AssertionError("legacy route")):
            proof = proposals.no_change(report, batch, str(self.root))
        self.assertEqual(proof["backfill"]["plan_id"], PLAN)


if __name__ == "__main__":
    unittest.main()
