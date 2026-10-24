"""Synthetic aggregates, queue admission, real-launch proofs and recovery; no LLM/game."""
import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "ops"))
import strategy_external_jobs as external
import strategy_backfill_jobs as shared
import learner_jobs as jobs
import proposal_dispatch as proposals
import learner_checks as checks
import test_strategy_backfill as fixture
from test_strategy_backfill import STAMP, BID, PLAN


class External(unittest.TestCase):
    ref = fixture.Backfill.ref
    writer = fixture.Backfill.writer
    save_report = fixture.Backfill.save_report

    def setUp(self):
        fixture.Backfill.setUp(self)
        self.manifest = {"request_id": external.REQUEST, "batch_plan_id": PLAN, "source": "external:sts2fun",
            "character": "silent", "topic": "dual-boss", "unit_ids": ["external-boss-unit"], "contains_player_identifiers": False,
            "provenance": {"url": "https://sts2.fun/static/sts2_public.db.zst", "downloaded_at": "2026-01-01", "database_sha256": "d" * 64, "query_version": "fixed-safe-columns-v1"},
            "work_spec": self.plan["work_spec"], "contracts": [self.ref("frozen/contract.md", "固定发布契约")],
            "cohorts": [{"version": "v0.111", "sample_count": 2, "sample_denominator": 3, "collected_at": "2026-01-01", "contains_player_identifiers": False,
                         "aggregates": [self.ref("frozen/aggregate.json", {"wins": 1, "losses": 1})]}]}
        self.config["request_id"] = external.REQUEST
        self.freeze()
        from types import SimpleNamespace
        self.home = str(self.root / "selected-account")
        self.env_account = patch.dict(os.environ, {"LEARNER_CODEX_HOME": self.home})
        self.env_account.start(); self.addCleanup(self.env_account.stop)
        self.clock = patch.object(external.policy.time, "time", return_value=1767225601)
        self.clock.start(); self.addCleanup(self.clock.stop)
        self.disk = patch.object(external.policy.shutil, "disk_usage", return_value=SimpleNamespace(free=200 * (1 << 30)))
        self.disk_mock = self.disk.start(); self.addCleanup(self.disk.stop)
        self.quota()

    def quota(self, used=20, **changes):
        value = {"schema_version": 1, "provider": "codex", "freshness": "fresh",
                 "account_home_sha256": hashlib.sha256(self.home.encode()).hexdigest(),
                 "sample_observed_at": "2026-01-01T00:00:00Z", "windows": [
                     {"kind": "weekly", "window_minutes": 10080, "used_percent": used,
                      "resets_at": "2026-01-02T00:00:00Z", "stale": False}], **changes}
        (self.directory / "subscription-usage.json").write_text(json.dumps(value))

    def save_config(self):
        (self.root / external.QUEUE).write_text(json.dumps(self.config))

    def freeze(self):
        self.plan["input_manifest"] = self.ref("frozen/external-manifest.json", self.manifest)
        self.save_config()

    def dispatch(self, normal=None, stamp=STAMP, writer=None, alive=lambda pid: False):
        with patch.object(external.subprocess, "check_output", return_value=self.base + "\n"):
            return external.dispatch(self.state, str(self.root), str(REPO / "ops"), "silent", alive, stamp, writer or self.writer, normal or {})

    def registered(self):
        self.assertEqual(self.dispatch(), (BID, 10))
        (self.directory / "learn.json").write_text(json.dumps(self.state))
        return self.state["batches"][BID]

    def native(self, observed=None):
        batch = self.state["batches"][BID]
        marker = "[learner fixed external]"
        prompt = marker + "\n" + BID + " " + PLAN + " " + batch["external_binding"]["input_manifest"]["sha256"]
        rows = [{"type": "session_meta", "payload": {"id": "new-external", "cwd": str(self.tree)}},
            {"type": "event_msg", "timestamp": "2026-01-01T00:00:00Z", "payload": {"type": "task_started", "turn_id": "new-turn"}},
            {"type": "turn_context", "payload": {"turn_id": "new-turn", "cwd": str(self.tree), "model": "gpt-6.1-sol", "effort": "high", "service_tier": observed, "sandbox_policy": {"type": "workspace-write"}}},
            {"type": "event_msg", "payload": {"type": "user_message", "message": prompt}}]
        rollout = self.directory / "external-native.jsonl"
        rollout.write_text("".join(json.dumps(row) + "\n" for row in rows))
        proof = {"marker": marker, "prompt_sha256": hashlib.sha256(prompt.encode()).hexdigest()}
        receipt = {"label": "learner-" + BID, "pane": "w1:p2", "cwd": str(self.tree), "session": "new-external", "submitted": True,
                   "bindings": [{**proof, "turn_id": "new-turn"}], "submissions": [proof], "rollout": str(rollout)}
        (self.directory / "learner" / ("learner-" + BID + ".tui.json")).write_text(json.dumps(receipt))
        return rollout, rows

    def test_distinct_identity_no_own_runs_and_native_cursor_once(self):
        batch = self.registered(); original = copy.deepcopy(batch)
        self.assertEqual(batch["runs"], [])
        self.assertEqual(batch["reason"], "external")
        self.assertNotIn("backfill_source", batch)
        external.reconcile(self.state, self.directory)
        self.assertEqual(self.state["strategy_external"]["cursor"], 0)
        self.native("ultrafast")
        external.reconcile(self.state, self.directory)
        external.reconcile(self.state, self.directory)
        self.assertEqual(self.state["strategy_external"]["cursor"], 1)
        self.assertEqual(self.state["strategy_external"]["plans"][PLAN]["attempts"][0]["native"]["service_tier"], "ultrafast")
        self.assertNotIn("strategy_backfill", self.state)
        self.assertEqual(original, batch)
        self.assertIsNone(self.dispatch(stamp="20260101-000002"))

    def test_launch_receipt_records_only_verified_native_tier_not_requested_tier(self):
        self.registered()
        path=self.directory / "learner" / (BID+".external-launch.json")
        launch={"batch":BID,"source":PLAN,"cwd":str(self.tree),"log":"fixed-log",
                "external_tier":{"effective":"ultrafast","observed_service_tier":None}}
        path.write_text(json.dumps(launch))
        external.reconcile(self.state,self.directory)
        self.assertIsNone(json.loads(path.read_text())["external_tier"]["observed_service_tier"])
        self.native("fast"); external.reconcile(self.state,self.directory)
        observed=json.loads(path.read_text())
        self.assertEqual(observed["external_tier"],{"effective":"ultrafast","observed_service_tier":"fast"})
        self.assertEqual(observed["native_tier_readback"]["service_tier"],"fast")
        original=path.read_bytes();external.reconcile(self.state,self.directory)
        self.assertEqual(path.read_bytes(),original)

    def test_wrong_context_does_not_consume_and_missing_tier_remains_unknown(self):
        self.registered(); rollout, rows = self.native()
        rows[2]["payload"]["effort"] = "xhigh"
        rollout.write_text("".join(json.dumps(row) + "\n" for row in rows))
        external.reconcile(self.state, self.directory)
        self.assertEqual(self.state["strategy_external"]["cursor"], 0)
        self.native(); external.reconcile(self.state, self.directory)
        self.assertIsNone(self.state["strategy_external"]["plans"][PLAN]["attempts"][0]["native"]["service_tier"])

    def test_hash_provenance_privacy_and_cohorts_reject_drift(self):
        for mutate in (lambda m: m.update(request_id=shared.REQUEST), lambda m: m.update(topic="unbounded"),
                       lambda m: m["cohorts"][0].update(sample_denominator=1), lambda m: m["cohorts"].append(copy.deepcopy(m["cohorts"][0])),
                       lambda m: m["provenance"].update(database_sha256="missing"), lambda m: m.update(contains_player_identifiers=True)):
            original = copy.deepcopy(self.manifest); mutate(self.manifest); self.freeze()
            with self.assertRaises(ValueError): external.source(self.root, self.plan)
            self.manifest = original; self.freeze()
        aggregate = self.root / "frozen/aggregate.json"; aggregate.write_text('{"changed":true}')
        with self.assertRaises(ValueError): external.source(self.root, self.plan)
        self.manifest["cohorts"][0]["aggregates"] = [self.ref("frozen/identifier.json", {"player_id": "synthetic-forbidden"})]; self.freeze()
        with self.assertRaisesRegex(ValueError, "identifier"): external.source(self.root, self.plan)

    def test_corrupt_external_input_preserves_normal_dispatch(self):
        for value in ([], {**self.config, "plans": ["not-an-object"]}):
            (self.root / external.QUEUE).write_text(json.dumps(value))
            self.assertFalse(external.ready(self.state, self.root))
            self.assertIsNone(self.dispatch())
            self.assertIn("strategy_external_error", self.state)
        self.save_config()
        self.manifest["cohorts"] = ["malformed-cohort"]; self.freeze()
        self.assertFalse(external.ready(self.state, self.root))
        self.assertIsNone(self.dispatch())


    def test_explicit_retry_requires_original_retirement_and_keeps_ids(self):
        batch = self.registered(); batch.update(state="failed", rc=1)
        self.plan["retry_generation"] = 1; self.save_config()
        self.assertIsNone(self.dispatch(stamp="20260101-000002"))
        (self.directory / "learner" / (BID + ".external-not-started.json")).write_text(json.dumps({"batch": BID, "source": PLAN, "worktree": str(self.tree), "models_started": 0}))
        self.assertIsNotNone(self.dispatch(stamp="20260101-000002"))
        self.assertEqual(self.state["strategy_external"]["cursor"], 0)
        self.assertEqual(len(self.calls), 2)

    def test_processed_candidate_and_waiting_publication_use_external_report(self):
        batch = self.registered(); self.native()
        scratch = self.tree / "learner/runs/fixed"; scratch.mkdir(parents=True)
        candidate = scratch / "candidate.json"; candidate.write_text('{"formal_publication":"pending"}')
        report = {"task": "strategy-proposal", "character": "silent", "batch": BID, "base": self.base, "runs": [], "fixes": [], "merged": None,
            "tests": {"tsc": None, "vitest": None, "cases": None}, "external_source": PLAN, "input_sha256": self.plan["input_manifest"]["sha256"], "report": str(scratch / "report.md"),
            "external_results": [{"id": "external-boss-unit", "state": "processed", "reason": "候选已保存，正式发布待原通道", "destinations": [{"kind": "knowledge", "id": "external-candidate", "path": str(candidate)}]}]}
        self.save_report(report)
        proof = external.report_proof(report, batch, str(self.root))
        with patch.object(proposals.subprocess, "check_output", side_effect=[self.base + "\n", ""]):
            self.assertIsNotNone(proposals.no_change(report, batch, str(self.root)))
        output = self.directory / "learner" / (BID + ".out")
        output.write_text('```json\n' + json.dumps(report) + '\n```\n')
        with patch.object(checks, "proposal_tools", return_value=proposals), \
                patch.object(proposals.subprocess, "check_output", side_effect=[self.base + "\n", ""]):
            checks.finish_write_batch(BID, batch, 0, str(self.root), str(output.parent), lambda *args: None, lambda *args: None, run_checks=False)
        self.assertEqual(batch["state"], "done")
        self.assertEqual(batch["external_result"], proof["dispositions"])
        self.assertNotIn("backfill_result", batch)
        batch["external_finished_at"] = 1767225602
        external.reconcile(self.state, self.directory)
        self.assertEqual(self.state["strategy_external"]["processed"], 1)
        self.assertEqual(self.state["strategy_external"]["plans"][PLAN]["attempts"][0]["elapsed_seconds"], 2)
        self.assertFalse(external.ready(self.state, self.root))


    def tick(self, stamp, writer, alive=lambda pid: False):
        with patch.object(jobs, "pending", return_value=[fixture.RUN]), patch.object(jobs, "dispatch_write", side_effect=writer), \
                patch.object(jobs, "fix_key", return_value=None), patch.object(jobs, "strategy_job", return_value=None), \
                patch.object(jobs, "calibration_job", return_value=None), patch("boss_sim_jobs.check", return_value=None), \
                patch("strategy_research_jobs.dispatch", return_value=None), patch.object(external.subprocess, "check_output", return_value=self.base + "\n"):
            return jobs.check_jobs(self.state, str(self.root), str(REPO / "ops"), "silent", alive, stamp)

    def second_plan(self):
        plan = copy.deepcopy(self.plan); plan["plan_id"] = "external-second-plan"
        manifest = copy.deepcopy(self.manifest); manifest.update(batch_plan_id=plan["plan_id"], unit_ids=["external-second-unit"])
        plan["input_manifest"] = self.ref("frozen/second-manifest.json", manifest)
        self.config["plans"].append(plan); self.save_config()













    def test_frozen_task_preparation_and_changed_input_stop_before_model(self):
        self.registered()
        tasks = self.tree / "learner/tasks"; tasks.mkdir(parents=True)
        for name in ("strategy-external.md", "strategy-external-dual-boss.md", "strategy-external-act-boss.md"):
            shutil.copy2(REPO / "learner/tasks" / name, tasks / name)
        with patch.object(external.subprocess, "check_output", return_value=self.base + "\n"):
            path = external.task_file(str(self.root), str(self.directory), BID, "silent", str(self.tree), PLAN)
            self.assertEqual(Path(path).name, "strategy-proposal.md")
            text = Path(path).read_text()
            self.assertIn("首批：双 Boss", text)
            self.assertIn(self.plan["input_manifest"]["sha256"], text)
            self.assertNotIn("evidence_summary.py", text)
        (self.root / "frozen/aggregate.json").write_text('{}')
        with self.assertRaises(ValueError):
            external.prepare(str(self.root), str(self.directory), BID, "silent", str(self.tree), PLAN)

    def test_native_boundary_uses_cli_override_only_for_registered_external(self):
        batch = self.registered(); self.tree.mkdir(parents=True)
        native = self.root / "native.py"
        native.write_text("#!/usr/bin/python3\nimport json,sys\nprint(json.dumps(sys.argv[1:]))\n"); native.chmod(0o755)
        env = {**os.environ, "STS2_CODEX_LEARNER_BIN": str(native), "CODEX_OPS_ROOT": str(self.root),
               "LEARNER_STATE_FILE": str(self.directory / "learn.json"), "LEARNER_BATCH_ID": BID,
               "LEARNER_EXTERNAL_SOURCE": PLAN, "LEARNER_EXTERNAL_SERVICE_TIER": "ultrafast"}
        wrapper = ["bash", str(REPO / "ops/codex-learner.sh"), "exec", "-c", 'service_tier="default"', "-"]
        for tier in ("fast", "ultrafast", "default"):
            result = subprocess.run(wrapper, cwd=self.tree, env={**env, "LEARNER_EXTERNAL_SERVICE_TIER": tier}, capture_output=True, text=True, timeout=5)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn('service_tier="' + tier + '"', json.loads(result.stdout))
        batch.update(reason="tick"); (self.directory / "learn.json").write_text(json.dumps(self.state))
        self.assertNotEqual(subprocess.run(wrapper, cwd=self.tree, env=env, capture_output=True, timeout=5).returncode, 0)

    def four_plans(self):
        self.config["plans"] = []
        for index, lane in enumerate("ABCDAB"):
            plan = copy.deepcopy(self.plan); plan.update(plan_id="lane-unit-" + str(index), lane=lane)
            manifest = copy.deepcopy(self.manifest)
            manifest.update(batch_plan_id=plan["plan_id"], unit_ids=["unit-" + str(index)])
            plan["input_manifest"] = self.ref("frozen/manifest-" + str(index) + ".json", manifest)
            self.config["plans"].append(plan)
        self.save_config()

    def lanes(self, stamp=STAMP):
        with patch.object(external.subprocess, "check_output", return_value=self.base + "\n"):
            return external.dispatch_lanes(self.state, str(self.root), str(REPO / "ops"), "silent", lambda pid: pid == 10, stamp, self.writer)

    def test_four_lanes_independent_single_owner_and_resume_after_restart(self):
        self.four_plans()
        self.assertEqual(len(self.lanes()), 4)
        self.assertEqual({b["external_lane"] for b in self.state["batches"].values()}, set("ABCD"))
        self.assertEqual(self.lanes(), [])
        first = next(iter(self.state["batches"].values()))
        first.update(state="done", pid=None)
        self.state = json.loads(json.dumps(self.state))
        self.assertEqual(len(self.lanes("20260101-000010")), 1)
        self.assertEqual([b["external_lane"] for b in self.state["batches"].values()].count("A"), 2)
        self.assertEqual(len(self.calls), 5)

    def test_pending_review_lost_owner_and_duplicate_ids_hold_only_their_lane(self):
        self.four_plans(); self.lanes()
        first = next(iter(self.state["batches"].values()))
        for state in ("awaiting_review", "lost", "launching", "running"):
            first.update(state=state, pid=None)
            self.assertEqual(self.lanes("20260101-000010"), [])
        # A live wrapper still owns the lane after its model result.
        first.update(state="done", pid=10)
        self.assertEqual(self.lanes("20260101-000010"), [])

    def test_quota_boundaries_disk_and_account_binding(self):
        self.four_plans()
        for used, limit, tier in ((70,4,"ultrafast"), (70.01,2,"fast"), (89.99,2,"fast")):
            self.state = {"batches": {}}; self.calls=[]; self.quota(used)
            self.assertEqual(len(self.lanes()), limit)
            self.assertTrue(all(b["external_policy"]["service_tier"] == tier for b in self.state["batches"].values()))
        self.state = {"batches": {}}; self.quota(90)
        self.assertEqual(self.lanes(), [])
        self.assertEqual(self.lanes(), [])
        self.assertEqual(len(list((self.directory / "queue").glob("*switch.md"))), 1)
        for changes in ({"account_home_sha256":"wrong"}, {"sample_observed_at":"2025-12-31T23:49:00Z"}, {"freshness":"failed"}):
            self.quota(**changes); self.assertEqual(self.lanes(), [])
        self.quota()
        for free, expected in ((80 * (1 << 30),0), (80 * (1 << 30) + 1,4)):
            self.disk_mock.return_value.free=free; self.state={"batches":{}}
            self.assertEqual(len(self.lanes()), expected)

    def test_downgrade_preserves_inflight_and_waits_for_two_worker_capacity(self):
        self.four_plans();self.lanes();self.quota(75)
        self.assertEqual(self.lanes("20260101-000010"),[])
        for batch in list(self.state["batches"].values())[:3]:batch.update(state="done",pid=None)
        self.assertEqual(len(self.lanes("20260101-000010")),1)
        self.assertEqual(len(external.active_external(self.state,lambda pid:pid==10)),2)

    def test_corrupt_plan_cannot_block_healthy_sibling_lane(self):
        self.four_plans()
        self.config["plans"][0]["input_manifest"]["sha256"]="0"*64;self.save_config()
        self.assertEqual(len(self.lanes()),4)
        self.assertIn("strategy_external_error",self.state)

    def test_original_audit_lease_retains_own_lane_while_external_can_run(self):
        self.four_plans()
        self.state["ascension_audits"]={"original":{"character":"silent","level":11,"state":"queued"}}
        import ascension_audit as audit
        with patch.object(audit,"lease_busy",return_value=True):
            result=self.tick(STAMP,self.writer,alive=lambda pid:pid==10)
        self.assertEqual(len(result["strategy_external"]),4)
        self.assertIsNone(result["experience"])

    def test_own_lane_is_not_suppressed_and_keeps_original_owner(self):
        self.four_plans()
        def writer(*args, **kwargs):
            if kwargs.get("external_source"): return self.writer(*args, **kwargs)
            self.state["batches"]["ordinary"]={"task":"experience-update", "state":"running", "pid":11}
            return ("ordinary",11)
        result = self.tick(STAMP, writer, alive=lambda pid: pid in (10,11))
        self.assertEqual(len(result["strategy_external"]),4)
        self.assertTrue(result["experience"])
        self.assertIsNone(self.tick("20260101-000010",writer,alive=lambda pid: pid in (10,11))["experience"])
        self.assertEqual(len(self.state["batches"]),5)
        self.assertNotIn("external_priority_hold",result)

    def test_writer_still_checks_worktree_and_independent_capacity(self):
        with patch.object(jobs,"available",return_value=False), patch.object(jobs,"start_learner") as start:
            self.assertIsNone(self.dispatch(writer=jobs.dispatch_write)); start.assert_not_called()
        with patch.object(jobs,"available",return_value=True), patch.object(jobs,"start_learner",return_value=(10,None)) as start:
            self.assertIsNotNone(self.dispatch(writer=jobs.dispatch_write))
            self.assertEqual(start.call_args.args[0][-1],"external:"+PLAN)
            self.assertIsNone(self.dispatch(writer=jobs.dispatch_write,stamp="20260101-000010",alive=lambda pid:pid==10))
            self.assertEqual(start.call_count,1)

    def test_tick_always_attempts_postmortems_before_writers(self):
        import contextlib, importlib.util, io
        from types import SimpleNamespace
        spec=importlib.util.spec_from_file_location("four_lane_tick",REPO/"ops/codex-ops-learn.py")
        module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        calls=[]
        with patch.object(module,"ROOT",str(self.root)), patch.object(module,"DIR",str(self.directory)), \
             patch.object(module,"load_state",return_value={"batches":{}}), patch.object(module,"save_state"), \
             patch.object(module,"check_victories",return_value=[]), patch.object(module,"check_ascension",return_value=[]), \
             patch.object(module.disk_admission,"snapshot",return_value={}), patch.object(module,"check_pending",return_value=None), \
             patch.object(module,"check_postmortems",side_effect=lambda *a:calls.append("postmortem")), \
             patch.object(module,"check_jobs",side_effect=lambda *a:calls.append("writers") or {}), \
             patch.object(module,"check_ascension_audits",return_value=None), patch.object(shared,"dispatch",return_value=None), \
             patch.object(module.learner_retention,"kick",return_value={}):
            with contextlib.redirect_stdout(io.StringIO()): module.cmd_tick(SimpleNamespace(character="silent"))
        self.assertEqual(calls,["postmortem","writers"])


if __name__ == "__main__":
    unittest.main()
