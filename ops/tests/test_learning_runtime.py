"""Fixed fixtures only: real SQLite, original proposal/ledger validators, no runtime/game access."""
import copy
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
import sqlite3
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "ops"))
sys.path.insert(0, str(ROOT))
import learning_runtime as runtime
from learning_runtime_store import Store, atomic, packed, sha
import learning_runtime_data as data
from learning_runtime_launch import launch
from learner_checks import finish_write_batch, recheck_write_batch


class LearningRuntimeTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="learning-runtime-fixture-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        from ops.tests.fixed_producer_fixture import install
        install(self.root)
        for name in ("learner", "ops/codex-ops/learner", "logs", "knowledge/builders", "knowledge/characters/silent", "knowledge/common", "eval", "paper/materials/learning", "agent/src"):
            (self.root / name).mkdir(parents=True, exist_ok=True)
        for name in ("learner/ledger.py", "learner/code_proposals.py", "learner/external_evidence.py", "knowledge/builders/characters.py"):
            shutil.copyfile(ROOT / name, self.root / name)
        (self.root / "knowledge/characters/silent/outcome-stats.json").write_text("{}")
        self.directory = self.root / "data/learning-runtime"
        Store(self.directory).close()  # The explicit installation step precedes control enablement.
        self.control = self.root / "ops/codex-ops/learning-runtime.json"
        self.control.write_text(packed({"schema": runtime.CONTROL, "root": str(self.root), "enabled": True,
                                       "directory": str(self.directory), "entries": ["postmortem", "mechanics-audit", "experience-asc-audit", "ascension-audit"],
                                       "refresh": ["outcome"], "methods": {"outcome": data.method(self.root, "outcome")}}))
        self.run = "SILENT000001"
        self.runs = self.root / "logs/runs.jsonl"
        self.runs.write_text(packed({"run_id": self.run, "character": "SILENT", "ascension": 10, "ended": "2026-10-25T00:00:00Z"}) + "\n")
        (self.root / "eval/versions.json").write_text("[]")
        (self.root / ".gitignore").write_text("data/\nlogs/\nlearner/runs/\nops/codex-ops/\n*.lock\n__pycache__/\n")
        self.git("init", "-q")
        self.git("add", ".")
        self.git("commit", "-qm", "Fixed fixture base")
        self.base = self.git("rev-parse", "HEAD")
        self.ident = "20261025-000000"
        self.scratch = self.root / "learner/runs/20261025-000000-postmortem"
        self.scratch.mkdir(parents=True)
        self.report_file = self.scratch / "report.md"
        self.report_file.write_text("## SILENT000001（A10，静默猎手，固定格式夹具）\n\n来源与未知保持。\n")
        self.ledger = self.root / "paper/materials/learning/ledger.jsonl"
        item = {"character": "silent", "kind": "other", "claim": "固定格式夹具", "evidence": [{"run": self.run, "role": "support"}],
                "first_run": self.run, "prior": "unknown", "status": "observed", "by": "learner:postmortem", "where": {"lessons": [self.run]}}
        env = {**os.environ, "LEDGER_FILE": str(self.ledger), "LEDGER_RUNS": str(self.runs), "LEDGER_VERSIONS": str(self.root / "eval/versions.json")}
        p = subprocess.run([sys.executable, str(self.root / "learner/ledger.py"), "add"], input=json.dumps(item), text=True, capture_output=True, env=env)
        self.assertEqual(p.returncode, 0, p.stderr)
        self.batch = {"character": "silent", "runs": [self.run], "worktree": str(self.root), "state": "running",
                      "proposal_policy": "Roy-2026-10-07-learning", "operational_runtime": runtime.capture(self.root, task="postmortem")}
        self.body = {"schema": "operational-candidate-v1", "id": self.ident, "task": "postmortem", "character": "silent", "base": self.base,
                     "runs": [self.run], "parents": [], "proposals": [], "ledger_ids": ["silent-0001"],
                     "report": {"path": str(self.report_file), "sha256": sha(self.report_file.read_bytes())},
                     "records": [{"id": self.ident + ":report", "kind": "postmortem", "payload": {"status": "observed", "limitation": "fixture only"},
                                  "evidence": [{"path": str(self.runs), "sha256": sha(self.runs.read_bytes()), "run": self.run, "character": "silent", "ascension": 10}]}]}
        self.path = self.scratch / "operational-candidate.json"
        self.report = {"task": "postmortem", "character": "silent", "base": self.base, "appended": [self.run], "ledger": {"check": 0},
                       "report": str(self.report_file), "operational_candidate": str(self.path), "code_proposals": [], "implementation_domains": [], "commit": None, "merged": None}
        self.out = self.root / "ops/codex-ops/learner"
        self.events, self.notices = [], []

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.root), *args], stderr=subprocess.DEVNULL, text=True).strip()

    def write(self):
        self.path.write_text(packed(self.body))
        (self.out / (self.ident + ".out")).write_text("```json\n" + packed(self.report) + "\n```\n")

    def complete(self):
        self.write()
        return runtime.complete(self.ident, self.batch, self.report, 0, self.root, lambda k, t: self.events.append((k, t)), self.notices.append)

    def test_postmortem_completes_while_source_lock_is_busy_and_consumers_read_original_bytes(self):
        with (self.root / "ops/live-merge.lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            self.assertTrue(self.complete())
        self.assertEqual(self.batch["state"], "done", self.batch.get("operational_attempts"))
        self.assertFalse(self.batch["checks_pending"])
        store = Store(self.directory, readonly=True)
        try:
            self.assertEqual(store.run_ids("silent"), {self.run})
            self.assertEqual(store.records("ironclad"), [])
            self.assertEqual(store.report(self.ident), self.report_file.read_bytes())
            self.assertFalse(store.completion(self.ident)["parent_closed"])
        finally:
            store.close()
        self.assertEqual(self.git("rev-parse", "HEAD"), self.base)
        self.assertFalse((self.root / "notes/lessons.md").exists())
        self.assertFalse((self.root / "ops/live-merge.lock").stat().st_size)

    def test_real_finish_recheck_idempotence_restart_and_control_switch_use_original_database(self):
        self.write()
        finish_write_batch(self.ident, self.batch, 0, str(self.root), str(self.out), lambda k,t: self.events.append((k,t)), self.notices.append)
        self.assertEqual(self.batch["state"], "done", self.batch.get("operational_attempts"))
        self.control.write_text("broken current control")
        self.runs.write_text(self.runs.read_text() + packed({"run_id": "SILENT000002", "character": "SILENT", "ended": "later", "ascension": 10}) + "\n")
        self.batch.pop("operational_publication")  # Simulate a committed DB with a lost finish/state receipt.
        self.assertEqual(recheck_write_batch(self.ident, self.batch, str(self.root), str(self.out), lambda *a: None, self.notices.append), 0)
        store = Store(self.directory, readonly=True)
        try:
            self.assertEqual(store.db.execute("SELECT count(*) FROM completions").fetchone()[0], 1)
        finally:
            store.close()
        self.assertEqual(self.ledger.read_text().count('"op": "add"'), 1)
        self.assertNotIn("shipped", self.ledger.read_text())

    def test_bounded_evidence_and_failed_submission_history_preserve_original_bytes(self):
        original = self.runs.read_bytes()
        self.body["records"][0]["evidence"][0].update(offset=0, length=len(original), sha256="0"*64)
        self.assertTrue(self.complete())
        self.assertEqual(self.batch["state"], "awaiting_review")
        rejected = self.path.read_bytes()
        self.body["records"][0]["evidence"][0]["sha256"] = sha(original)
        self.runs.write_bytes(original + b'{"unfinished":')
        self.assertTrue(self.complete())
        self.assertEqual(self.batch["state"], "done", self.batch.get("operational_attempts"))
        store = Store(self.directory, readonly=True)
        try:
            events = store.submission_history(self.ident)
            self.assertEqual([row["state"] for row in events], ["received", "pending", "received", "published"])
            self.assertEqual(store.db.execute("SELECT body FROM objects WHERE digest=?", (sha(rejected),)).fetchone()[0], rejected)
            self.assertEqual(store.db.execute("SELECT body FROM objects WHERE digest=?", (sha(original),)).fetchone()[0], original)
        finally:
            store.close()

    def test_refresh_launch_pins_original_control_before_queue_and_on_retry(self):
        options = dict(character="silent", only_producer="outcome")
        env = {"STS2_REFRESH_CYCLE": "fixture-refresh"}
        with patch.dict(os.environ, env):
            first = data.bind_launch(self.root, self.root, "fixture-refresh", options)
            self.control.write_text("broken after dispatch")
            self.assertEqual(data.active(self.root, "outcome:silent"), first)
            self.assertEqual(data.bind_launch(self.root, self.root, "fixture-refresh", options), first)
            with self.assertRaises(ValueError):
                data.bind_launch(self.root, self.root, "fixture-refresh", {**options, "only_producer": "fight-value"})
            contract = Path(os.environ["STS2_REFRESH_SELECTION_FILE"])
            contract.write_text(contract.read_text() + " ")
            with self.assertRaises(ValueError):
                data.active(self.root, "outcome:silent")

    def test_run_data_selection_is_pinned_and_ops_only_does_not_redirect_data(self):
        version = data.seed(self.root, self.directory, "seed-selection")
        _, env = launch(self.root, "MAIN_MENU", "", "first", self.root / "logs/config.jsonl", "a"*40, ["fixture"])
        patterns = json.loads(env["STS2_DATA_MANAGED_PATHS"])
        self.assertEqual(patterns, ["characters/{character}/outcome-stats.json"])
        original = dict(version=version, directory=str(self.directory), run=env["STS2_DATA_RUN_KEY"], managed_paths=patterns)
        config = self.root / "logs/config.jsonl"
        config.write_text(packed({"run_id": self.run, "knowledge": {"fixed_data": original}}) + "\n")
        control = json.loads(self.control.read_text())
        control.update(refresh=[], methods={})
        self.control.write_text(packed(control))
        _, resumed = launch(self.root, "COMBAT", self.run, "second", config, "b"*40, ["fixture"])
        self.assertEqual(json.loads(resumed["STS2_DATA_MANAGED_PATHS"]), patterns)
        _, new = launch(self.root, "MAIN_MENU", "", "second", config, "b"*40, ["fixture"])
        self.assertNotIn("STS2_DATA_SNAPSHOT", new)
        self.assertEqual(data.current_file(self.root, None, "characters/silent/boss-trust.json"), self.root / "knowledge/characters/silent/boss-trust.json")

    def test_audit_entrypoints_share_product_contract_without_name_whitelist(self):
        for i, task in enumerate(("mechanics-audit", "ascension-audit", "experience-asc-audit")):
            with self.subTest(task=task):
                self.ident = f"20261025-00000{i}-{task}"
                self.body.update(id=self.ident, task=task, parents=["request-fixture"])
                self.batch.update(task=task, audit_key="request-fixture", audit_level=10, operational_runtime=runtime.capture(self.root, task=task))
                self.report.update(task=task, level=10, runs=[self.run], complete=True, coverage=["floors", "combat_counts", "healing", "campfires", "rules", "assumptions"])
                self.assertTrue(self.complete())
                self.assertEqual(self.batch["state"], "done", self.batch.get("operational_attempts"))

    def test_invalid_evidence_role_links_hash_base_and_legacy_contract_are_held(self):
        original = copy.deepcopy(self.body)
        for mutate in (lambda b: b.update(character="ironclad"), lambda b: b["records"][0]["evidence"][0].update(sha256="0"*64),
                       lambda b: b["records"][0]["evidence"][0].update(ascension=9), lambda b: b.update(ledger_ids=[]),
                       lambda b: b.update(proposals=["missing-proposal"]), lambda b: b.update(base="0"*40)):
            self.body = copy.deepcopy(original)
            mutate(self.body)
            self.assertTrue(self.complete())
            self.assertEqual(self.batch["state"], "awaiting_review")
            self.assertTrue(self.path.exists())
        self.body = original
        self.batch.pop("operational_runtime")
        self.assertTrue(self.complete())
        self.assertEqual(self.batch["state"], "awaiting_review")
        self.assertFalse(runtime.complete(self.ident, {}, {}, 0, self.root, lambda *a: None, self.notices.append))

    def test_original_ascension_finish_rechecks_coverage_and_keeps_late_lease(self):
        import ascension_audit
        tree = self.root / ".worktrees/audit-fixture"
        tree.parent.mkdir()
        self.git("worktree", "add", "--detach", str(tree), self.base)
        scratch = tree / "learner/runs/20261025-000000-ascension-audit"
        scratch.mkdir(parents=True)
        self.report_file = scratch / "report.md"
        self.report_file.write_text("固定升阶审计报告")
        self.path = scratch / "operational-candidate.json"
        self.batch.update(task="ascension-audit", learner_task="ascension-audit", audit_key="request-fixture", audit_level=10, worktree=str(tree),
                          operational_runtime=runtime.capture(self.root, task="ascension-audit"))
        self.body.update(task="ascension-audit", parents=["request-fixture"], report=dict(path=str(self.report_file), sha256=sha(self.report_file.read_bytes())))
        self.report.update(task="ascension-audit", level=10, runs=[self.run], complete=True, coverage=[], report=str(self.report_file), operational_candidate=str(self.path))
        request = dict(batch=self.ident, level=10, worktree=str(tree), attempts=1)
        state = dict(batches={self.ident: self.batch}, ascension_audits={"request-fixture": request})
        def finish():
            self.write()
            ascension_audit.finish(state, self.ident, 0, self.root, self.out, lambda *a: None, self.notices.append)
        finish()
        self.assertEqual(self.batch["state"], "failed")
        self.assertNotIn("operational_publication", self.batch)
        self.report["coverage"] = ["floors", "combat_counts", "healing", "campfires", "rules", "assumptions"]
        self.report["coverage"].pop()
        self.assertTrue(self.complete())  # Direct product recovery also keeps coverage gates.
        self.assertEqual(self.batch["state"], "awaiting_review")
        self.report["coverage"].append("assumptions")
        request["batch"] = "newer-original-lease"
        finish()
        self.assertEqual(self.batch["state"], "late-finish")
        self.assertNotIn("operational_publication", self.batch)
        request["batch"] = self.ident
        finish()
        self.assertEqual(self.batch["state"], "done", self.batch.get("operational_attempts"))
        self.assertEqual(request["state"], "done")

    def test_source_changes_remain_engineering_but_independent_operational_artifact_can_be_split(self):
        (self.root / "agent/src/new.ts").write_text("export const fixture = true;\n")
        self.assertTrue(self.complete())
        self.assertEqual(self.batch["state"], "awaiting_review")
        self.report.update(commit="a"*40, implementation_domains=[])
        self.assertFalse(self.complete())
        self.assertIn("operational_publication", self.batch)
        self.assertFalse(self.batch["operational_publication"]["source_delivery"])

    def test_data_versions_rebind_rollback_backup_and_foreign_paths(self):
        store = Store(self.directory)
        try:
            path = "characters/silent/outcome-stats.json"
            a = store.publish("refresh-a", None, {path: b'{"character":"silent","by_asc":{}}'}, {"method": "fixed-fixture"})
            first = store.bind("launch:old", "a"*40)
            b = store.publish("refresh-b", a, {path: b'{"character":"silent","by_asc":{"10":{}}}'}, {"method": "fixed-fixture"})
            self.assertEqual(store.bind("launch:old", "a"*40)["version"], a)
            self.assertEqual(store.bind("launch:new", "a"*40)["version"], b)
            store.rollback(a, "back")
            store.rollback(a, "back")
            self.assertEqual(store.current(), a)
            self.assertEqual(store.publish("refresh-b", a, {path: b'{"character":"silent","by_asc":{"10":{}}}'}, {"method": "fixed-fixture"}), b)
            self.assertEqual(store.current(), a)  # Duplicate callback cannot undo rollback.
            with self.assertRaises(ValueError):
                store.publish("conflict", b, {path: b"{}"}, {})
            with self.assertRaises(ValueError):
                store.publish("script", a, {"../script.ts": b"{}"}, {})
            backup = self.root / "backup.sqlite"
            store.backup(backup)
            restored = Store.restore(backup, self.root / "restored")
            try:
                self.assertEqual(restored.current(), a)
                self.assertEqual(restored.manifest(b), store.manifest(b))
                self.assertEqual(Path(first["snapshot"], path).read_bytes(), b'{"character":"silent","by_asc":{}}')
            finally:
                restored.close()
        finally:
            store.close()

    def test_fixed_producer_and_interruption_restore_without_source_merge_lock(self):
        path = self.root / "knowledge/characters/silent/outcome-stats.json"
        path.write_text('{"character":"silent","by_asc":{}}')
        a = data.seed(self.root, self.directory, "seed")
        with (self.root / "ops/live-merge.lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with data.refresh_step(self.root, self.root, "outcome:silent", ["silent"], "fixture-refresh") as result:
                path.write_text('{"character":"silent","by_asc":{"10":{}}}')
                result["rc"] = 0
        b = result["version"]
        self.assertNotEqual(a, b)
        before = path.read_bytes()
        with self.assertRaises(RuntimeError):
            with data.refresh_step(self.root, self.root, "outcome:silent", ["silent"], "interrupted"):
                path.write_text("corrupt output")
                raise RuntimeError("fixed interruption")
        self.assertEqual(path.read_bytes(), before)

        with self.assertRaises(ValueError):
            with data.refresh_step(self.root, self.root, "outcome:silent", ["silent"], "wrong-role") as r:
                path.write_text('{"character":"ironclad"}')
                r["rc"] = 0
        self.assertEqual(path.read_bytes(), before)

    def test_actual_fixed_statistics_builder_publishes_and_reads_under_busy_source_lock(self):
        for name in ("build-outcome-stats.py", "refresh_publish.py", "legacy_incremental.py", "incremental_evidence.py"):
            shutil.copyfile(ROOT / "knowledge/builders" / name, self.root / "knowledge/builders" / name)
        shutil.copyfile(ROOT / "learner/evidence_identity.py", self.root / "learner/evidence_identity.py")
        for name in ("states", "decisions"):
            (self.root / "logs" / (name + ".jsonl")).write_text("")
        (self.root / "logs/states.jsonl").write_text(packed({"screen": "MAP", "state": {"run_id": self.run, "run": {"floor": 1, "act_id": 0, "deck": [], "relics": []}}}) + "\n")
        self.runs.write_text(packed({"run_id": self.run, "character": "SILENT", "ascension": 10, "ended": "fixture", "floor": 1, "victory": False}) + "\n")
        control = json.loads(self.control.read_text())
        control["methods"]["outcome"] = data.method(self.root, "outcome")
        self.control.write_text(packed(control))
        path = self.root / "knowledge/characters/silent/outcome-stats.json"
        path.write_text("{}")
        data.seed(self.root, self.directory, "seed")
        with (self.root / "ops/live-merge.lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with data.refresh_step(self.root, self.root, "outcome:silent", ["silent"], "real-statistics") as result:
                built = subprocess.run([sys.executable, str(self.root / "knowledge/builders/build-outcome-stats.py"), "--logs", str(self.root / "logs"),
                                        "--character", "silent", "--ascension", "10", "--out", str(path), "--quiet"], capture_output=True,
                                       env={**os.environ, "STS2_REFRESH_CACHE_DIR": "", "STS2_REFRESH_OPS_ROOT": str(self.root)},
                                       pass_fds=(int(os.environ["STS2_FIXED_DATA_LOCK_FD"]),), timeout=20)
                self.assertEqual(built.returncode, 0, built.stdout + built.stderr)
                result["rc"] = built.returncode
        store = Store(self.directory, readonly=True)
        try:
            version = store.current()
            self.assertEqual(store.data_receipt("real-statistics")["status"], "published")
            self.assertEqual(Path(store.snapshot(version), "characters/silent/outcome-stats.json").read_bytes(), path.read_bytes())
            self.assertIn("10", json.loads(path.read_bytes())["by_ascension"])
            self.assertEqual(json.loads(path.read_bytes())["by_ascension"]["10"]["baseline"]["runs"], 1)
        finally:
            store.close()

    def test_missing_capability_rejects_before_builder_and_same_run_recovers_after_control_disabled(self):
        path = self.root / "knowledge/characters/silent/outcome-stats.json"
        path.write_text('{"character":"silent","by_asc":{}}')
        version = data.seed(self.root, self.directory, "seed")
        args, env = launch(self.root, "MAIN_MENU", "", "fixture-session", str(self.root / "logs/config.jsonl"), "a"*40, ["fixture-no-exec"])
        self.assertEqual(args, ["fixture-no-exec"])
        bound = {"version": version, "directory": str(self.directory), "run": env["STS2_DATA_RUN_KEY"]}
        config = self.root / "logs/config.jsonl"
        config.write_text(packed({"run_id": self.run, "knowledge": {"fixed_data": bound}}) + "\n")
        self.control.write_text("damaged after original dispatch")
        _, resumed = launch(self.root, "COMBAT", self.run, "unused", config, "a"*40, ["fixture"])
        self.assertEqual(resumed["STS2_DATA_VERSION"], version)
        selected = self.batch["operational_runtime"]
        selected["methods"]["outcome"] = "0"*64
        with self.assertRaises(ValueError):
            with data.refresh_step(self.root, self.root, "outcome:silent", ["silent"], "unavailable", chosen_override=selected):
                self.fail("unadmitted builder ran")

    def test_real_crash_restores_fixed_preimage_and_does_not_replay_completed_producer(self):
        path = self.root / "knowledge/characters/silent/outcome-stats.json"
        path.write_text('{"character":"silent","by_asc":{}}')
        data.seed(self.root, self.directory, "seed")
        original = path.read_bytes()
        script = "\n".join(["import os,sys", "from pathlib import Path", "sys.path.insert(0,sys.argv[1])", "from learning_runtime_data import refresh_step",
                             "with refresh_step(sys.argv[2],sys.argv[2],'outcome:silent',['silent'],'real-crash'):",
                             " Path(sys.argv[3]).write_text('interrupted fixture')", " os._exit(75)"])
        crashed = subprocess.run([sys.executable, "-c", script, str(ROOT / "ops"), str(self.root), str(path)], capture_output=True)
        self.assertEqual(crashed.returncode, 75, crashed.stderr)
        self.assertNotEqual(path.read_bytes(), original)
        with data.refresh_step(self.root, self.root, "outcome:silent", ["silent"], "after-crash") as result:
            self.assertEqual(path.read_bytes(), original)
            result["rc"] = 0
        with data.refresh_step(self.root, self.root, "outcome:silent", ["silent"], "after-crash") as result:
            self.assertTrue(result["already_completed"])

    def test_sql_transaction_rollback_and_completion_id_conflict_keep_original_links(self):
        self.assertTrue(self.complete())
        store = Store(self.directory)
        try:
            body = copy.deepcopy(self.body)
            body["id"] = "atomic-failure"
            body["records"].append({"id": None, "kind": "audit", "payload": {}, "evidence": []})
            with self.assertRaises(sqlite3.IntegrityError):
                store.complete(body, {})
            self.assertIsNone(store.completion("atomic-failure"))
            self.assertEqual(store.db.execute("SELECT count(*) FROM completions").fetchone()[0], 1)
        finally:
            store.close()
        self.body["records"][0]["payload"]["status"] = "changed after completion"
        self.assertTrue(self.complete())
        self.assertEqual(self.batch["state"], "awaiting_review")

    def test_directory_switch_retains_postmortem_sources_and_bad_control_cannot_rebind_batch(self):
        self.assertTrue(self.complete())
        state = self.root / "ops/codex-ops/learn.json"
        state.write_text(packed({"batches": {self.ident: self.batch}}))
        control = json.loads(self.control.read_text())
        control.update(directory=str(self.root / "data/other-runtime"), enabled=False)
        self.control.write_text(packed(control))
        self.assertEqual(runtime.recorded_runs(self.root, None, "silent"), {self.run})
        self.assertIn(str(self.directory), runtime.capture(self.root, task="experience-update")["read_directories"])
        self.assertTrue(self.complete())
        self.assertEqual(self.batch["state"], "done")

    def test_counterevidence_is_indexed_and_missing_original_database_does_not_recreate_history(self):
        self.body["records"].append({"id": self.ident + ":counter", "kind": "counterevidence", "payload": {"status": "disputed", "limitation": "fixture only"},
                                     "evidence": copy.deepcopy(self.body["records"][0]["evidence"])})
        self.report["disagreements"] = ["fixed fixture counterevidence"]
        self.assertTrue(self.complete())
        store = Store(self.directory, readonly=True)
        try:
            row = store.db.execute("SELECT role,character,run,ascension FROM record_evidence WHERE role='contradict'").fetchone()
            self.assertEqual(tuple(row), ("contradict", "silent", self.run, 10))
            self.assertEqual(len(store.records("silent", "counterevidence")), 1)
            self.assertEqual(len(store.records("ironclad", "counterevidence")), 0)
        finally:
            store.close()
        self.assertTrue(self.notices)
        original = self.directory / "learning.sqlite"
        original.rename(self.directory / "preserved.sqlite")
        self.assertTrue(self.complete())
        self.assertTrue(self.batch["operational_pending"])
        self.assertFalse(original.exists())

    def test_large_preimage_journal_is_bounded_and_original_bytes_restore(self):
        path = self.root / "knowledge/characters/silent/outcome-stats.json"
        original = packed({"character": "silent", "fixture_padding": "x" * (2 * 1024 * 1024)}).encode()
        path.write_bytes(original)
        data.seed(self.root, self.directory, "seed")
        with self.assertRaises(RuntimeError):
            with data.refresh_step(self.root, self.root, "outcome:silent", ["silent"], "large-interruption"):
                journal = next(self.directory.glob("refresh-journal-*.json"))
                self.assertLess(journal.stat().st_size, 4096)
                path.write_bytes(b"interrupted")
                raise RuntimeError("fixed interruption")
        self.assertEqual(path.read_bytes(), original)

    def test_operational_backup_restores_original_reports_and_rejects_corrupt_objects(self):
        self.assertTrue(self.complete())
        store = Store(self.directory, readonly=True)
        backup = self.root / "operational-backup.sqlite"
        try:
            store.backup(backup)
        finally:
            store.close()
        restored = Store.restore(backup, self.root / "restored-operational")
        try:
            self.assertEqual(restored.report(self.ident), self.report_file.read_bytes())
            self.assertEqual(restored.run_ids("silent"), {self.run})
        finally:
            restored.close()
        changed = sqlite3.connect(backup)
        changed.execute("UPDATE objects SET body=? WHERE digest=(SELECT digest FROM objects LIMIT 1)", (b"corrupt fixed fixture",))
        changed.commit()
        changed.close()
        with self.assertRaisesRegex(ValueError, "checksum"):
            Store.restore(backup, self.root / "rejected-restore")

    def test_original_fixed_calibration_cli_publishes_data_and_operational_receipts_without_git(self):
        # Reuse the original fixed simulations and original calibrator/validator;
        # no model, backtest, network, production dataset or trusted boss is invented.
        boss = ROOT / "agent/tools/boss-sim"
        sys.path.insert(0, str(boss))
        spec = importlib.util.spec_from_file_location("runtime_calibration_fixture", boss / "test_silent_calibration.py")
        fixtures = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(fixtures)
        spec = importlib.util.spec_from_file_location("runtime_refresh_fixture", boss / "refresh-silent.py")
        producer = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(producer)
        tree = self.root / ".worktrees/silent-boss-calibration"
        tree.parent.mkdir()
        self.git("worktree", "add", "--detach", str(tree), self.base)
        old_tool = tree / "agent/tools/boss-sim/refresh-silent.py"
        old_tool.parent.mkdir(parents=True)
        old_tool.write_text("# Retained legacy fixture; the current installed producer must run instead.\n")
        subprocess.run(["git", "-C", str(tree), "add", "agent/tools/boss-sim/refresh-silent.py"], check=True, capture_output=True)
        subprocess.run(["git", "-C", str(tree), "commit", "-qm", "Retained legacy calibration fixture"], check=True, capture_output=True)
        retained_head = subprocess.check_output(["git", "-C", str(tree), "rev-parse", "HEAD"], text=True).strip()
        self.scratch = tree / "learner/runs/20261025-000000-silent-boss-calibration"
        self.scratch.mkdir(parents=True)
        self.report_file = self.scratch / "report.md"
        self.path = self.scratch / "operational-candidate.json"
        self.body["base"] = retained_head
        self.report.update(base=retained_head, report=str(self.report_file), operational_candidate=str(self.path))
        self.batch["worktree"] = str(tree)
        fights, results, turns = fixtures.rows()
        dataset = self.scratch / "dataset"
        dataset.mkdir()
        def jl(path, rows):
            path.write_text("".join(json.dumps(r) + "\n" for r in rows))
        jl(dataset / "fights.jsonl", fights)
        jl(dataset / "sources.jsonl", fights)
        jl(dataset / "turns.jsonl", [{"key": k, "turns": list(v.values())} for k, v in turns.items()])
        jl(dataset / "runs-snapshot.jsonl", [{"run_id": f["run_id"], "character": "SILENT", "ended": "date", "ascension": f["asc"]} for f in fights])
        for name in ("sl-snapshot.jsonl", "runs.jsonl", "sl-attempts.jsonl"):
            jl(dataset / name, [])
        (dataset / "extraction.json").write_text(packed({"finished_runs": 30, "attempts": 60, "written": 60, "exclusions": {}}))
        jl(self.scratch / "results.jsonl", results)
        (self.scratch / "provenance.json").write_text(packed({"fixed_fixture": True, "samples": 200, "seed": 1}))
        chosen = copy.deepcopy(self.batch["operational_runtime"])
        from ops.tests.fixed_producer_fixture import install
        install(self.root, 'silent-boss-calibration')
        chosen["entries"].append("silent-boss-calibration")
        chosen["methods"]["silent-boss-calibration"] = data.method(self.root, "silent-boss-calibration")
        self.batch.update(task="fix-batch", learner_task="silent-boss-calibration", runs=[], operational_runtime=chosen)
        existing = self.root / "knowledge/characters/silent/outcome-stats.json"
        existing.write_text("{}")
        data.seed(self.root, self.directory, "original-data-baseline")
        state = self.root / "ops/codex-ops/learn.json"
        state.write_text(packed({"batches": {self.ident: self.batch}}))
        target = tree / "knowledge/characters/silent/boss-trust.json"
        args = ["--scratch", str(self.scratch / "artifacts"), "--dataset", str(dataset), "--results", str(self.scratch / "results.jsonl"),
                "--provenance", str(self.scratch / "provenance.json"), "--logs", str(dataset), "--db", "unused", "--game-data", "unused",
                "--out", str(target), "--report", str(self.report_file), "--force", "--object-store", str(self.directory / "objects")]
        with patch.object(producer, "ROOT", self.root), patch.dict(os.environ, {"LEARNER_BATCH_ID": self.ident, "LEARNER_STATE_FILE": str(state)}):
            self.assertEqual(producer.main(args), 0)
            with patch.object(producer, "synchronize", side_effect=AssertionError("must not rerun")):
                self.assertEqual(producer.main(args), 0)
        self.body.update(task="silent-boss-calibration", runs=[], ledger_ids=[], report={"path": str(self.report_file), "sha256": sha(self.report_file.read_bytes())})
        self.body["records"][0]["evidence"] = [{"path": str(dataset / "fights.jsonl"), "sha256": sha((dataset / "fights.jsonl").read_bytes()), "character": "silent"}]
        self.report.update(task="fix-batch", fixes=[])
        self.assertTrue(self.complete())
        self.assertEqual(self.batch["state"], "done", self.batch.get("operational_attempts"))
        self.assertEqual(self.batch["fixed_data_publication"]["status"], "published")
        store = Store(self.directory, readonly=True)
        try:
            published = Path(store.snapshot(self.batch["fixed_data_publication"]["version"])) / "characters/silent/boss-trust.json"
            self.assertEqual(published.read_bytes(), target.read_bytes())
            self.assertEqual(store.db.execute("SELECT count(*) FROM data_releases").fetchone()[0], 2)
            self.assertEqual(store.report(self.ident), self.report_file.read_bytes())
            provenance = json.loads(store.db.execute("SELECT provenance FROM data_releases WHERE version=?", (self.batch["fixed_data_publication"]["version"],)).fetchone()[0])
            self.assertEqual(provenance["method_source_root"], str(self.root))
            self.assertEqual(provenance["compatibility_root"], str(tree))
        finally:
            store.close()
        from learner_jobs import feature_worktree
        self.batch["pid"] = 777
        control = json.loads(self.control.read_text())
        control["entries"].append("silent-boss-calibration")
        control["methods"]["silent-boss-calibration"] = data.method(self.root, "silent-boss-calibration")
        self.control.write_text(packed(control))
        with patch("learner_jobs.external_writer", return_value=False):
            self.assertEqual(feature_worktree({"batches": {self.ident: self.batch}}, str(self.root), "silent-boss-calibration", "next-fixed-batch", lambda _: False), str(tree))
            self.assertIsNone(feature_worktree({"batches": {self.ident: self.batch}}, str(self.root), "silent-boss-calibration", "next-fixed-batch", lambda pid: pid == 777))
            changed = tree / "agent/src/unrelated-change.ts"
            changed.parent.mkdir(parents=True, exist_ok=True)
            changed.write_text("export const fixture = false;\n")
            self.assertIsNone(feature_worktree({"batches": {self.ident: self.batch}}, str(self.root), "silent-boss-calibration", "next-fixed-batch", lambda _: False))
            changed.unlink()
            target.write_text("corrupt fixed compatibility data")
            self.assertIsNone(feature_worktree({"batches": {self.ident: self.batch}}, str(self.root), "silent-boss-calibration", "next-fixed-batch", lambda _: False))


if __name__ == "__main__":
    unittest.main()
