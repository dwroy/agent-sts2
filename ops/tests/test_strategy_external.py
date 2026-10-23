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

    def test_original_priority_gates(self):
        for normal in ({"postmortem": True}, {"fixes": True}, {"backfill_hold": True}, {"disk_capacity_hold": True}):
            self.assertIsNone(self.dispatch(normal))
        for item in ({"learning_requests": {"x": {"state": "pending"}}}, {"calibration_ready": {"silent": "due"}},
                     {"ascension_audits": {"x": {"character": "silent", "state": "queued"}}}):
            self.state.update(item); self.assertIsNone(self.dispatch()); self.state.pop(next(iter(item)))
        self.assertEqual(self.calls, [])

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

    def test_priority_order_and_ready_normal_fix_wait(self):
        for fix in (None, "normal-fix"):
            self.state = {"batches": {}}; self.calls = []
            def writer(*args, **kwargs):
                if args[3] == "fix-batch":
                    self.calls.append((args, kwargs)); return None
                return self.writer(*args, **kwargs)
            with patch.object(jobs, "pending", return_value=[]), patch.object(jobs, "dispatch_write", side_effect=writer), \
                    patch.object(jobs, "fix_key", return_value=fix), patch.object(jobs, "strategy_job") as auto, \
                    patch.object(jobs, "calibration_job", return_value=None), patch("boss_sim_jobs.check", return_value=None), \
                    patch("strategy_research_jobs.dispatch", return_value=None) as research, patch.object(external.subprocess, "check_output", return_value=self.base + "\n"):
                result = jobs.check_jobs(self.state, str(self.root), str(REPO / "ops"), "silent", lambda pid: False, STAMP)
            self.assertTrue(result["backfill_hold"])
            auto.assert_not_called(); research.assert_called_once()
            self.assertEqual([args[3] for args, _ in self.calls], ["fix-batch"] if fix else ["strategy-proposal"])
            self.assertEqual(bool(result["strategy_external"]), not bool(fix))

    def test_original_writer_gates_and_scope(self):
        binding = external.source(self.root, self.plan)[0]
        for blocked in ("slot", "worktree"):
            with patch.object(jobs, "busy", return_value=blocked == "slot"), patch.object(jobs, "available", return_value=blocked != "worktree"), patch.object(jobs, "start_learner") as start:
                self.assertIsNone(self.dispatch(writer=jobs.dispatch_write))
                start.assert_not_called()
        with patch.object(jobs, "busy", return_value=False), patch.object(jobs, "available", return_value=True), patch.object(jobs, "start_learner", return_value=(10, None)) as start:
            self.assertIsNotNone(self.dispatch(writer=jobs.dispatch_write))
            self.assertEqual(start.call_args.args[0][-1], "external:" + PLAN)
        self.assertEqual(binding["dispatch_runs"], [])

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
        result = subprocess.run(wrapper, cwd=self.tree, env=env, capture_output=True, text=True, timeout=5)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('service_tier="ultrafast"', json.loads(result.stdout))
        batch.update(reason="tick"); (self.directory / "learn.json").write_text(json.dumps(self.state))
        self.assertNotEqual(subprocess.run(wrapper, cwd=self.tree, env=env, capture_output=True, timeout=5).returncode, 0)


if __name__ == "__main__":
    unittest.main()
