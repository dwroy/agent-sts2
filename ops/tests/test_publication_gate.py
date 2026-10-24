"""Fixed publication races and real admission paths; no models or game calls."""
import contextlib
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "ops"))
import publication_gate as gate
import learner_jobs as jobs
import open_book_refresh as refresh
import test_strategy_external as external_tests
import test_account_drain as account_tests
external = external_tests.external
legacy_games = gate.legacy_games


class Publication(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.dest = self.root / "ops/codex-ops"
        self.dest.mkdir(parents=True)
        self.pid = os.getpid()
        stub = patch.object(gate, "legacy_games", return_value=False)
        stub.start(); self.addCleanup(stub.stop)

    def begin(self):
        return gate.begin(self.root, self.dest, "issue57-fixed", self.pid)

    def write(self, value):
        return gate.writing(self.root, self.dest, value["owner"], value["token"], self.pid)

    def test_all_three_real_game_entries_refuse_publication_and_global_markers(self):
        for name in ("publication_gate.py", "paths.sh", "run.sh", "autoplay.sh", "codex-ops-actions.sh", "codex-ops.sh"):
            shutil.copy2(REPO / "ops" / name, self.root / "ops" / name)
        value = self.begin()
        for name, args, code in (("run.sh", [], 76), ("autoplay.sh", [], 0),
                                 ("codex-ops-actions.sh", ["autoplay-start"], 75),
                                 ("codex-ops.sh", ["tick", "snapshot"], 0)):
            result = subprocess.run(["bash", str(self.root / "ops" / name), *args], capture_output=True,
                                    env={"PATH": "/usr/bin:/bin", "HOME": str(self.root)}, timeout=5)
            self.assertEqual(result.returncode, code, result.stderr)
        self.assertFalse((self.root / "ops/STOP").exists())
        self.assertFalse((self.dest / "snapshots").exists())
        gate.release(self.root, self.dest, value["owner"], value["token"], self.pid)
        for name in gate.GLOBAL:
            with self.subTest(name=name):
                path = self.dest / name
                path.write_text("unknown legacy transaction\n")
                self.assertTrue(gate.learners_held(self.root, self.dest))
                with self.assertRaises(ValueError): gate.admit_game(self.root, self.dest, self.pid)
                path.unlink()
        (self.dest / gate.MARKER).write_text("unknown old publication gate")
        self.assertTrue(gate.learners_held(self.root, self.dest))
        with self.assertRaises(ValueError): gate.admit_game(self.root, self.dest, self.pid)

    def test_start_reservation_closes_check_start_race_without_holding_a_game_lock(self):
        gate.admit_game(self.root, self.dest, self.pid)
        value = self.begin()
        with self.assertRaisesRegex(ValueError, "natural terminal"):
            with self.write(value): self.fail("must not write while run.sh is setting up")
        with gate.locks([self.dest / "learn.lock", self.dest / "game-admission.lock"]): pass
        reservation = self.dest / "game-admissions" / f"{self.pid}.json"
        saved = json.loads(reservation.read_text()); saved["pid_birth"] = "0"
        reservation.write_text(json.dumps(saved))
        with patch.object(gate, "active_games", wraps=gate.active_games):
            self.assertFalse(gate.active_games(self.root, self.dest))
        with self.write(value):
            # Actual writes own only the two publication locks; learn remains available.
            with gate.locks([self.dest / "learn.lock"]): pass
            with self.assertRaises(BlockingIOError):
                with gate.source_locks(self.root): pass
            self.assertTrue(gate.learners_held(self.root, self.dest))
        self.assertEqual(gate.read(self.root, self.dest)["phase"], "publishing")
        gate.release(self.root, self.dest, value["owner"], value["token"], self.pid)
        gate.admit_game(self.root, self.dest, self.pid)

    def test_legacy_controller_is_also_a_natural_boundary_hold(self):
        value = self.begin()
        with patch.object(gate, "active_games", return_value=True):
            with self.assertRaises(ValueError):
                with self.write(value): self.fail("legacy play must finish")
        self.assertEqual(gate.read(self.root, self.dest)["phase"], "waiting")

    def test_legacy_process_scope_uses_fixed_proc_and_unknown_cwd_holds(self):
        proc = self.root / "fixed-proc/10"
        proc.mkdir(parents=True)
        (proc / "cmdline").write_bytes(b"node\0src/index.ts\0play\0")
        live = self.root / ".worktrees/live/agent"
        live.mkdir(parents=True)
        (proc / "cwd").symlink_to(live)
        with patch.dict(os.environ, {"STS2_LIVE": str(live.parent)}):
            self.assertTrue(legacy_games(self.root, proc.parent))
            (proc / "cwd").unlink()
            (proc / "cwd").symlink_to(self.dest)
            self.assertFalse(legacy_games(self.root, proc.parent))
            (proc / "cwd").unlink()
            self.assertTrue(legacy_games(self.root, proc.parent))

    def test_dead_or_reused_pid_never_releases_marker_and_recovery_is_compare_and_swap(self):
        value = self.begin()
        with self.assertRaises(ValueError): self.begin()
        path = self.dest / gate.MARKER
        value["pid_birth"] = "0"
        gate.save(path, value)
        self.assertTrue(gate.learners_held(self.root, self.dest))
        self.assertIsNotNone(gate.read(self.root, self.dest))
        with self.assertRaises(ValueError): gate.release(self.root, self.dest, value["owner"], value["token"], self.pid)
        before = path.read_bytes(); digest = hashlib.sha256(before).hexdigest()
        with self.assertRaises(ValueError): gate.recover(self.root, self.dest, value["owner"], "0" * 64, self.pid)
        self.assertEqual(path.read_bytes(), before)
        replacement = gate.recover(self.root, self.dest, value["owner"], digest, self.pid)
        self.assertNotEqual(replacement["token"], value["token"])
        with self.assertRaises(ValueError): gate.release(self.root, self.dest, value["owner"], value["token"], self.pid)
        gate.release(self.root, self.dest, replacement["owner"], replacement["token"], self.pid)
        self.assertIsNone(gate.read(self.root, self.dest))

    def test_lock_contention_and_failed_write_preserve_owner_and_release_every_lock(self):
        value = self.begin()
        with gate.source_locks(self.root):
            with self.assertRaises(BlockingIOError):
                with self.write(value): self.fail("never wait holding learn.lock")
        self.assertEqual(gate.read(self.root, self.dest)["phase"], "waiting")
        with self.assertRaisesRegex(RuntimeError, "fixture write failed"):
            with self.write(value): raise RuntimeError("fixture write failed")
        self.assertEqual(gate.read(self.root, self.dest)["phase"], "publishing")
        with gate.locks([self.dest / "learn.lock", self.dest / "game-admission.lock"]), gate.source_locks(self.root): pass

    def test_open_book_overlay_is_not_a_candidate_and_cannot_consume_pending(self):
        pending = self.root / "data/external/open-book/pending/fixture.json"
        pending.parent.mkdir(parents=True); pending.write_text("fixed pending bytes")
        value = self.begin()
        with patch.dict(os.environ, {"CODEX_OPS_DIR": str(self.dest)}), patch.object(refresh, "refresh") as build:
            self.assertEqual(refresh.tick(self.root), {"status": "deferred-admission"})
            build.assert_not_called()
            self.assertEqual(pending.read_text(), "fixed pending bytes")
            gate.release(self.root, self.dest, value["owner"], value["token"], self.pid)
            with gate.source_locks(self.root):
                self.assertEqual(refresh.tick(self.root), {"status": "deferred-admission"})
            build.assert_not_called()
            build.return_value = {"status": "fixed"}
            self.assertEqual(refresh.tick(self.root), {"status": "fixed"})


class CandidateDispatch(unittest.TestCase):
    def setUp(self):
        self.fixture = external_tests.External("test_distinct_identity_no_own_runs_and_native_cursor_once")
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.root, self.dest = self.fixture.root, self.fixture.directory
        self.marker = gate.begin(self.root, self.dest, "issue57-fixed", os.getpid())

    def test_waiting_dispatches_frozen_candidates_but_keeps_original_resource_gates(self):
        f = self.fixture
        self.assertEqual(f.dispatch(), ("20260101-000001-strategy-proposal", 10))
        batch = next(iter(f.state["batches"].values()))
        self.assertEqual(batch["candidate_mode"], gate.candidate_binding(f.base, f.tree))
        self.assertFalse(gate.learners_held(self.root, self.dest))
        with self.assertRaises(ValueError): gate.admit_game(self.root, self.dest, os.getpid())
        for name in gate.GLOBAL:
            f.state = {"batches": {}}
            path = self.dest / name; path.write_text("fixed")
            self.assertIsNone(f.dispatch())
            self.assertEqual(f.state["batches"], {})
            path.unlink()
        for used in (90, None):
            f.quota(used)
            self.assertIsNone(f.dispatch())
        f.quota(20)
        with patch.object(external.policy, "external_disk_allowed", return_value=False):
            self.assertIsNone(f.dispatch())
        self.assertEqual(f.state["batches"], {})

    def test_snapshot_conflict_or_drift_does_not_register_or_start_a_model(self):
        f = self.fixture
        with gate.source_locks(self.root): self.assertIsNone(f.dispatch())
        self.assertEqual(f.state["batches"], {})

        source = external.source
        calls = []
        def drift(*args):
            binding, spec = source(*args); calls.append(True)
            if len(calls) > 1: binding["provenance"]["query_version"] = "replaced"
            return binding, spec
        with patch.object(external, "source", side_effect=drift): self.assertIsNone(f.dispatch())
        self.assertEqual(f.state["batches"], {})

    def test_candidate_can_finish_during_wait_without_publishing_or_changing_knowledge(self):
        live = self.root / ".worktrees/live/knowledge/fixed.json"
        live.parent.mkdir(parents=True); live.write_text("fixed original live bytes")
        self.fixture.test_processed_candidate_and_waiting_publication_use_external_report()
        self.assertEqual(live.read_text(), "fixed original live bytes")
        self.assertEqual(gate.read(self.root, self.dest)["phase"], "waiting")

    def test_writer_and_finish_followups_do_not_start_ordinary_live_writers(self):
        f = self.fixture
        with patch.object(jobs, "start_learner") as start:
            self.assertIsNone(jobs.dispatch_write(f.state, str(self.root), str(REPO / "ops"), "fix-batch", "silent", [], "fixed", "ops", lambda _: False, "20260101-000001"))
            start.assert_not_called()
        with patch.object(jobs, "pending", side_effect=AssertionError("ordinary write selection forbidden")), \
             patch.object(jobs, "dispatch_write", side_effect=f.writer), \
             patch.object(external.subprocess, "check_output", return_value=f.base + "\n"):
            result = jobs.check_jobs(f.state, str(self.root), str(REPO / "ops"), "silent", lambda _: False, "20260101-000001")
        self.assertTrue(result["candidate_only"])
        self.assertEqual(len(result["strategy_external"]), 1)
        # Run the real completion bookkeeping with the publication marker present.
        account = account_tests.AccountDrain("test_completion_is_saved_without_followup_dispatch")
        account.setUp(); self.addCleanup(account.doCleanups)
        (account.root / "ACCOUNT_DRAIN").unlink()
        gate.begin(REPO, account.root, "issue57-finish", os.getpid())
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(account.complete("postmortem"), (1, 0, 0))
            self.assertEqual(account.complete("boss"), (0, 0, 0))

    def test_startup_rechecks_candidate_merge_tree_and_immutable_source(self):
        f = self.fixture; batch = f.registered()
        with patch.object(gate.subprocess, "check_output", return_value=f.base + "\n"):
            self.assertEqual(gate.check_learner(self.root, self.dest, "20260101-000001-strategy-proposal", str(f.tree), "no"), batch["candidate_mode"])
            with self.assertRaises(ValueError): gate.check_learner(self.root, self.dest, "20260101-000001-strategy-proposal", str(f.tree), "live")
        with patch.object(gate.subprocess, "check_output", return_value="b" * 40 + "\n"):
            with self.assertRaises(ValueError): gate.check_learner(self.root, self.dest, "20260101-000001-strategy-proposal", str(f.tree), "no")
        del batch["candidate_mode"]
        (self.dest / "learn.json").write_text(json.dumps(f.state))
        with self.assertRaises(ValueError): gate.check_learner(self.root, self.dest, "20260101-000001-strategy-proposal", str(f.tree), "no")

    def test_direct_cli_blocks_live_commands_and_tick_only_selects_candidates(self):
        scheduler = account_tests.scheduler
        self.fixture.registered()
        state_path = self.dest / "learn.json"
        with patch.object(scheduler, "ROOT", str(self.root)), patch.object(scheduler, "DIR", str(self.dest)), \
             patch.object(scheduler, "STATE", str(state_path)), contextlib.redirect_stdout(io.StringIO()):
            before = state_path.read_bytes()
            for command in ("dispatch", "write", "boss-check"):
                with patch.object(sys, "argv", ["scheduler", command]):
                    self.assertEqual(scheduler.main(), 75)
                    self.assertEqual(state_path.read_bytes(), before)
            with patch.object(scheduler, "check_jobs", return_value={"candidate_only": True}) as jobs_check, \
                 patch.object(scheduler, "check_postmortems", side_effect=AssertionError("not a candidate")), \
                 patch.object(scheduler.ordinary_close, "close_pending", side_effect=AssertionError("shared write deferred")), \
                 patch.object(sys, "argv", ["scheduler", "tick"]):
                self.assertEqual(scheduler.main(), 0)
                jobs_check.assert_called_once()


if __name__ == "__main__": unittest.main()
