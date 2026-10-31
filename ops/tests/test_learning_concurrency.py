"""Fixed accounts, frozen sources and fake starts; no production services or games."""
import copy
import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(REPO / "ops"), str(REPO / "ops/tests")]
import learning_concurrency as capacity
import learner_jobs as jobs
import strategy_external_jobs as external
import test_strategy_external as frozen


class Capacity(unittest.TestCase):
    def setUp(self):
        self.case = frozen.External("runTest")
        self.case.setUp()
        self.addCleanup(self.case.doCleanups)
        self.root, self.directory, self.state = self.case.root, self.case.directory, self.case.state
        self.board = self.root / ".agents/board.yaml"
        self.board.parent.mkdir()
        self.live = set()
        self.calls = []

    def configure(self, **values):
        self.board.write_text(json.dumps(dict(learning={"own_slots": 2, "external_slots": 8, "total_limit": 10, **values})))

    def alive(self, pid):
        return pid in self.live

    def start(self, *args):
        pid = 1000 + len(self.calls)
        self.calls.append(args)
        self.live.add(pid)
        return pid, None

    def own(self, count):
        for i in range(count):
            self.state["batches"][f"own-{i}"] = dict(task="fix-batch", state="running", pid=5000 + i)
            self.live.add(5000 + i)

    def test_defaults_and_explicit_config_do_not_change_developer_board(self):
        self.case.config["enabled"] = False
        self.case.save_config()
        self.board.write_text('roles:\n  dev:\n    max_parallel: 8\n')
        before = self.board.read_bytes()
        self.assertEqual(capacity.configuration(self.root), dict(capacity.DEFAULTS, valid=True, configured=False))
        self.own(2)
        self.assertTrue(capacity.allowed(self.state, self.root, self.alive))  # Legacy no-external pipeline.
        self.assertEqual(self.board.read_bytes(), before)
        self.board.write_text('roles:\n  dev:\n    max_parallel: 8\nlearning:\n  own_slots: 1\n')
        before = self.board.read_bytes()
        self.assertFalse(capacity.allowed(self.state, self.root, self.alive))
        self.assertEqual(self.board.read_bytes(), before)

    def test_actual_writers_share_ten_slots_across_all_external_topics(self):
        self.configure()
        self.case.config["plans"] = []
        for i, topic in enumerate("ABCDABCDAB"):
            plan = copy.deepcopy(self.case.plan)
            plan.update(plan_id=f"ten-unit-{i}", lane=topic)
            manifest = copy.deepcopy(self.case.manifest)
            manifest.update(batch_plan_id=plan["plan_id"], unit_ids=[f"ten-evidence-{i}"])
            plan["input_manifest"] = self.case.ref(f"frozen/ten-{i}.json", manifest)
            self.case.config["plans"].append(plan)
        self.case.save_config()
        before = self.board.read_bytes()
        with patch.object(jobs, "available", return_value=True), patch.object(jobs, "_start_learner", side_effect=self.start), \
                patch.object(external.subprocess, "check_output", return_value=self.case.base + "\n"):
            for index, task in enumerate(("experience-update", "fix-batch")):
                self.assertTrue(jobs.dispatch_write(self.state, str(self.root), str(REPO / "ops"), task, "silent", [],
                                                     f"ten-own-{index}", "ops", self.alive, f"20260101-00000{index + 1}"))
            result = external.dispatch_lanes(self.state, str(self.root), str(REPO / "ops"), "silent", self.alive,
                                             "20260101-000003", jobs.dispatch_write)
            self.assertEqual(len(result), 8)
            self.assertEqual(len({self.state["batches"][bid]["external_slot"] for bid, _ in result}), 8)
            self.assertEqual(len(self.calls), 10)
            self.assertEqual(capacity.occupancy(self.state, self.alive, self.directory)["total"], 10)
            self.assertIsNone(jobs.dispatch_write(self.state, str(self.root), str(REPO / "ops"), "mechanics-audit", "silent", [],
                                                  "eleventh", "ops", self.alive, "20260101-000020"))
            self.assertEqual(external.dispatch_lanes(self.state, str(self.root), str(REPO / "ops"), "silent", self.alive,
                                                     "20260101-000020", jobs.dispatch_write), [])
        self.assertEqual(self.board.read_bytes(), before)

    def test_exact_boundaries_unknown_reset_and_small_configuration(self):
        self.configure()
        for used, expected in ((0, 10), (69.99, 10), (70, 4), (70.01, 4), (90, 4), (100, 4)):
            self.case.quota(used)
            self.assertEqual(capacity.limits(self.root, self.directory)["effective_total"], expected)
        for field, value in (("freshness", "failed"), ("account_home_sha256", "other"),
                             ("sample_observed_at", "2025-12-31T23:00:00Z"), ("windows", []),
                             ("windows", [dict(kind="weekly", bucket="codex/secondary", window_minutes=10080)])):
            self.case.quota(**{field: value})
            self.assertIsNone(capacity.limits(self.root, self.directory)["weekly_used_percent"])
            self.assertEqual(capacity.limits(self.root, self.directory)["effective_total"], 4)
        path = self.directory / "subscription-usage.json"
        path.unlink()
        self.assertEqual(capacity.limits(self.root, self.directory)["effective_total"], 4)
        self.case.quota(0)
        sample = json.loads(path.read_bytes())
        sample["windows"][0]["resets_at"] = "2026-01-01T00:00:00Z"
        path.write_text(json.dumps(sample))
        self.assertEqual(capacity.limits(self.root, self.directory)["effective_total"], 4)
        self.case.quota(0)
        self.assertEqual(capacity.limits(self.root, self.directory)["effective_total"], 10)
        self.configure(total_limit=2)
        self.case.quota(90)
        self.assertEqual(capacity.limits(self.root, self.directory)["effective_total"], 2)

    def test_invalid_configuration_holds_admission_and_zero_class_stays_closed(self):
        for values in (dict(total_limit=11), dict(own_slots=-1), dict(external_slots=True), dict(total_limit=2.5), dict(other=2)):
            self.board.write_text(json.dumps(dict(learning=values)))
            self.assertFalse(capacity.allowed(self.state, self.root, self.alive))
        self.board.write_text('learning: [broken')
        self.assertFalse(capacity.allowed(self.state, self.root, self.alive))
        self.configure(own_slots=0, external_slots=10)
        self.assertFalse(capacity.allowed(self.state, self.root, self.alive))
        self.assertTrue(capacity.allowed(self.state, self.root, self.alive, external=True))

    def test_two_external_slots_rotate_all_topics_and_legacy_high_slot_stays_owned(self):
        self.configure(own_slots=1, external_slots=2)
        self.case.four_plans()
        self.case.config["plans"] = self.case.config["plans"][2:4]
        self.case.save_config()
        result = self.case.lanes()
        self.assertEqual({self.state["batches"][bid]["external_lane"] for bid, _ in result}, set("CD"))
        self.assertEqual({self.state["batches"][bid]["external_slot"] for bid, _ in result}, {"ext1", "ext2"})
        row = self.state["batches"][result[0][0]]
        row.update(state="done", pid=None, external_slot="ext9")
        before = copy.deepcopy(self.state["batches"])
        self.configure(external_slots=4)
        # Unknown native retirement retains its original high slot and topic.
        self.assertEqual(len(external.active_external(self.state, lambda pid: pid == 10, self.directory)), 2)
        self.assertIn("C", external.blocked_lanes(self.state, self.case.config, self.root, lambda pid: pid == 10))
        self.assertEqual(external.slot_available(self.state, self.root, lambda pid: pid == 10, self.directory), "ext1")
        self.assertEqual(self.state["batches"], before)

    def test_primary_only_unknown_numbers_and_read_failure_use_four(self):
        self.configure()
        path = self.directory / "subscription-usage.json"
        for value in (True, -1, 101, float("nan"), float("inf")):
            self.case.quota(value)
            self.assertEqual(capacity.limits(self.root, self.directory)["effective_total"], 4)
        self.case.quota(20)
        original = Path.read_bytes
        def read(file):
            if file == path:
                raise PermissionError("fixed quota read failure")
            return original(file)
        with patch.object(Path, "read_bytes", read):
            self.assertEqual(capacity.limits(self.root, self.directory)["effective_total"], 4)
        sample = json.loads(path.read_bytes())
        sample["windows"].append({**sample["windows"][0], "bucket": "other/primary", "used_percent": 99})
        path.write_text(json.dumps(sample))
        self.assertEqual(capacity.limits(self.root, self.directory)["effective_total"], 10)

    def test_downgrade_and_shrink_do_not_signal_or_rewrite_eight_owners(self):
        self.configure(own_slots=10, external_slots=0)
        self.own(8)
        before = copy.deepcopy(self.state)
        self.case.quota(70)
        with patch("os.kill") as signal:
            self.assertFalse(capacity.allowed(self.state, self.root, self.alive))
            signal.assert_not_called()
        self.assertEqual(self.state, before)
        self.assertEqual(capacity.projection(self.state, self.root, self.alive)["occupied"]["total"], 8)
        for i in range(5):
            self.state["batches"][f"own-{i}"].update(state="done", pid=None)
        self.assertTrue(capacity.allowed(self.state, self.root, self.alive))
        self.case.quota(0)
        self.configure(own_slots=2)
        self.assertFalse(capacity.allowed(self.state, self.root, self.alive))

    def test_audit_batch_and_request_count_once_orphan_lease_reserves_one(self):
        self.own(1)
        self.state["batches"]["own-0"]["audit_key"] = "silent:A1"
        self.state["ascension_audits"] = {"silent:A1": dict(state="running", character="silent", level=1,
                                                          batch="own-0", pid=5000)}
        with patch("ascension_audit.lease_busy", return_value=True):
            self.assertEqual(capacity.occupancy(self.state, self.alive, self.directory)["own"], 1)
            request = self.state["ascension_audits"]["silent:A1"]
            request["batch"] = "foreign-batch"
            self.assertEqual(capacity.occupancy(self.state, self.alive, self.directory)["own"], 2)
            request.update(batch="own-0", pid=6000)
            self.assertEqual(capacity.occupancy(self.state, self.alive, self.directory)["own"], 2)
            request["pid"] = 5000
            self.state["ascension_audits"]["silent:A2"] = dict(state="queued", character="silent", level=2)
            self.assertEqual(capacity.occupancy(self.state, self.alive, self.directory)["own"], 2)

    def test_two_hour_reports_recover_append_before_state_save_without_duplicates(self):
        self.configure()
        self.own(8)
        self.case.quota(70)
        original = copy.deepcopy(self.state)
        self.assertTrue(capacity.report(self.state, self.root, self.directory, self.alive, now=100))
        path = self.directory / "inbox-claude.md"
        self.assertIn("在跑=8/4", path.read_text())
        self.assertIn("周已用=70%", path.read_text())
        (self.directory / "learning-concurrency-report.json").unlink()
        capacity.report(original, self.root, self.directory, self.alive, now=101)
        self.assertEqual(original, self.state)
        self.assertIsNone(capacity.report(self.state, self.root, self.directory, self.alive, now=7299))
        self.assertTrue(capacity.report(self.state, self.root, self.directory, self.alive, now=7300))
        self.assertEqual(len(path.read_text().splitlines()), 2)
        # A paused tick does not save learn.json; the independent watermark keeps cadence.
        paused = copy.deepcopy(original)
        paused.pop("learning_concurrency_report")
        capacity.report(paused, self.root, self.directory, self.alive, now=7301)
        self.assertNotIn("learning_concurrency_report", paused)
        self.assertEqual(len(path.read_text().splitlines()), 2)
        capacity.report(paused, self.root, self.directory, self.alive, now=14500)
        self.assertEqual(len(path.read_text().splitlines()), 3)

    def test_full_budget_blocks_helper_launches_and_cli_before_side_effects(self):
        import ascension_audit
        import boss_sim_jobs
        self.configure(own_slots=10)
        self.own(10)
        self.state["ascension_audits"] = {"queued": dict(character="silent", state="queued", attempts=0)}
        original = copy.deepcopy(self.state)
        start = unittest.mock.Mock(side_effect=AssertionError("must not launch"))
        self.assertIsNone(ascension_audit.dispatch(self.state, str(self.root), str(REPO / "ops"), "silent", [],
                                                  self.alive, "20260101-000001", start, lambda tree: True))
        self.assertIsNone(boss_sim_jobs.dispatch_candidates(self.state, [dict()], str(self.root), str(REPO / "ops"),
                                                           self.alive, "20260101-000001", start))
        self.assertEqual(jobs.requested_feature(self.state, str(self.root), str(REPO / "ops"), "silent", "ops",
                                                self.alive, "20260101-000001"), (True, None))
        spec = importlib.util.spec_from_file_location("capacity_cli", REPO / "ops/codex-ops-learn.py")
        cli = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cli)
        with patch.object(cli, "ROOT", str(self.root)), patch.object(cli, "DIR", str(self.directory)), \
                patch.object(cli, "alive", self.alive), patch.object(cli, "start_learner", start):
            self.assertIsNone(cli.dispatch(self.state, ["FIXTURE000001"], "silent", "ops"))
        start.assert_not_called()
        self.assertEqual(self.state, original)

    def test_original_candidate_only_tick_reports_without_starting_ordinary_work(self):
        from types import SimpleNamespace
        self.configure()
        spec = importlib.util.spec_from_file_location("capacity_candidate_tick", REPO / "ops/codex-ops-learn.py")
        cli = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cli)
        with patch.object(cli, "ROOT", str(self.root)), patch.object(cli, "DIR", str(self.directory)), \
                patch.object(cli, "alive", self.alive), patch.object(cli, "load_state", return_value=self.state), \
                patch.object(cli, "save_state") as save, patch.object(cli, "check_jobs", return_value={}), \
                patch.object(cli.publication_gate, "candidates_only", return_value=True), \
                patch.object(cli, "start_learner") as start, contextlib.redirect_stdout(io.StringIO()):
            cli.cmd_tick(SimpleNamespace(character="silent"))
        self.assertIn("learning_concurrency_report", self.state)
        self.assertEqual(len((self.directory / "inbox-claude.md").read_text().splitlines()), 1)
        save.assert_called_once_with(self.state)
        start.assert_not_called()

    def test_original_continuation_helper_waits_for_shared_capacity(self):
        from test_learning_requests import FlowTests
        case = FlowTests("runTest")
        case.setUp()
        self.addCleanup(case.doCleanups)
        for i in range(4):
            case.state["batches"][f"held-{i}"] = dict(state="running", task="fix-batch", pid=100 + i)
        self.assertIsNone(case.tick(live=(100, 101, 102, 103)))
        self.assertEqual(case.starts, [])
        self.assertFalse(list((case.directory / "learner").glob("*.learning-input.json")))


if __name__ == "__main__":
    unittest.main()
