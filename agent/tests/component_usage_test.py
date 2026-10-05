"""Fixed component log database and post-run accounting fixtures, without network or live knowledge."""
import ast
import fcntl
import importlib.util
import json
import os
import shutil
from pathlib import Path
import sys
import tempfile
import unittest
from unittest import mock

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "agent/tools/logdb"))
sys.path.insert(0, str(REPO / "ops"))
import component_usage as usage
import query
import sync
import report


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


cost = load("cost", REPO / "eval/cost.py")
worker = load("refresh_costs", REPO / "ops/refresh-costs.py")
NOW = "2026-10-05T12:00:00Z"


class Components(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR"))
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        for directory in ("logs", "learner/runs", "ops/codex-ops"):
            (self.root / directory).mkdir(parents=True)
        self.write("learner/runs/batch.jsonl", [
            {"type": "learner_launch", "task": "postmortem", "params": {"runs": "A,B", "character": "silent"}},
            {"type": "learner_summary", "ts": NOW, "wall_ms": 50, "summary": {"engine": "codex", "sessionId": "L",
                "turns": 2, "tokens": {"input": 20, "cacheRead": 80, "output": 30}, "prompt": "PRIVATE_PROMPT"}}])
        self.write("ops/codex-ops/wakes.jsonl", [
            {"ts": NOW, "session": "O", "wall_ms": 100, "tokens": {"input": 20, "cacheRead": 80, "output": 30}},
            {"ts": "2026-10-05T12:01:00Z", "session": "O", "wall_ms": 200,
                "tokens": {"input": 40, "cacheRead": 100, "output": 60}, "error": "PRIVATE_ERROR"}])
        self.write("logs/brain.jsonl", [{"ts": NOW, "engine": "codex", "run_id": "A", "label": "route",
            "usage": {"inputTokens": 100, "cacheHitTokens": 80, "outputTokens": 30, "reasoningTokens": 20}}])

    def write(self, name, rows):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("".join(json.dumps(r) + "\n" for r in rows))
        return path

    def synchronize(self):
        with mock.patch.object(usage.Path, "home", return_value=self.root):
            db = sync.LogDb(str(self.root / "logs"), str(self.root / "db"), quiet=True)
            try:
                return db.run()
            finally:
                if db.con:
                    db.con.close()

    def sql(self, sql):
        con = query.connect(str(self.root / "db"), threads=2)
        try:
            return con.execute(sql).fetchall()
        finally:
            con.close()

    def event(self, inp, cache, out, reason=0):
        return {"timestamp": NOW, "payload": {"type": "token_count", "info": {"total_token_usage": {
            "input_tokens": inp, "cached_input_tokens": cache, "output_tokens": out, "reasoning_output_tokens": reason}}}}

    def test_fallback_summaries_and_game_calls_are_queryable_together(self):
        self.synchronize()
        self.assertEqual(self.sql("SELECT component, sum(total_tokens), sum(latency_ms) FROM all_llm_calls GROUP BY 1 ORDER BY 1"),
            [("brain:codex", 130, None), ("learner:postmortem", 130, 50), ("ops:codex", 200, 300)])
        self.assertEqual(self.sql("SELECT batch, run_ids FROM component_calls WHERE component = 'learner:postmortem'"), [("batch", ["A", "B"])])
        self.assertNotIn("PRIVATE_", str(self.sql("SELECT * FROM component_usage_raw")))
        self.assertEqual(self.sql("SELECT count(*) FROM llm_calls"), [(1,)])

    def test_rollout_watermarks_and_incremental_append_do_not_recount(self):
        path = self.write(".codex/sessions/2026/10/05/rollout-fixed-L.jsonl", [
            self.event(100, 80, 30, 20), self.event(100, 80, 30, 20), self.event(90, 70, 25, 18), self.event(150, 100, 50, 30)])
        self.synchronize()
        expected = [(200, 100, 30, 2, 50)]
        statement = "SELECT sum(total_tokens), sum(cache_hit_tokens), sum(reasoning_tokens), sum(calls), sum(latency_ms) FROM component_calls WHERE session='L'"
        self.assertEqual(self.sql(statement), expected)
        with path.open("a") as handle:
            handle.write(json.dumps(self.event(180, 110, 60, 35)) + "\n")
        self.synchronize()
        self.assertEqual(self.sql(statement), [(240, 110, 35, 3, 50)])
        self.synchronize()
        self.assertEqual(self.sql(statement), [(240, 110, 35, 3, 50)])
        for src, off, size in self.sql("SELECT src, off, len FROM component_usage_raw WHERE cumulative"):
            manifest = json.loads((self.root / "db/manifest.json").read_text())
            with Path(manifest["sources"][src]["file"]).open("rb") as handle:
                handle.seek(off)
                self.assertEqual(len(handle.readline()), size)

    def test_partial_tail_and_source_truncation_rebuild(self):
        path = self.root / "ops/codex-ops/wakes.jsonl"
        tail = json.dumps({"ts": "2026-10-05T12:02:00Z", "session": "O", "tokens": {"input": 200, "output": 50}})
        with path.open("a") as handle:
            handle.write(tail)
        self.synchronize()
        self.assertEqual(self.sql("SELECT sum(total_tokens) FROM component_calls WHERE session='O'"), [(200,)])
        with path.open("a") as handle:
            handle.write("\n")
        self.synchronize()
        self.assertEqual(self.sql("SELECT sum(total_tokens) FROM component_calls WHERE session='O'"), [(250,)])
        self.write("ops/codex-ops/wakes.jsonl", [{"ts": NOW, "session": "NEW", "tokens": {"input": 5, "output": 2}}])
        self.synchronize()
        self.assertEqual(self.sql("SELECT session, sum(total_tokens) FROM component_calls WHERE component='ops:codex' GROUP BY 1"), [("NEW", 7)])

    def test_canonical_quota_log_and_legacy_history_share_one_period(self):
        self.write("ops/codex-ops/wakes-older.jsonl", [{"ts": NOW, "session": "OLD", "tokens": {"input": 20, "output": 5}}])
        base = {"provider": "codex", "freshness": "fresh", "captured_at": NOW, "sample_observed_at": NOW,
            "windows": [{"window_minutes": 10080, "used_percent": 10, "resets_at": "2026-10-11T12:00:00Z"}]}
        self.write("logs/subscription-usage-snapshots.jsonl", [base])
        newer = {**base, "captured_at": "2026-10-05T12:01:00Z", "sample_observed_at": "2026-10-05T12:01:00Z",
            "windows": [{**base["windows"][0], "used_percent": 20}]}
        self.write("logs/codex-usage.jsonl", [newer])
        cfg = json.loads((REPO / "eval/cost-config.json").read_text())
        events, _, _, periods = cost.collect(self.root, cfg, self.root / "observer", self.root / ".codex")
        self.assertEqual(sum(e["total_tokens"] for e in events if e["component"] == "ops:codex"), 225)
        self.assertEqual(len(periods), 1)
        self.assertEqual(periods[0]["used_percent"], 20)
        self.assertAlmostEqual(periods[0]["usd"], 0.2 * 500 * 12 / 52)
        self.assertIn('logs/codex-usage.jsonl', (REPO / "ops/sample-subscription-usage.ts").read_text())

    def test_existing_game_database_binds_before_first_component_sync(self):
        self.synchronize()
        shutil.rmtree(self.root / "db/component_usage_raw")
        self.assertEqual(self.sql("SELECT count(*), sum(total_tokens) FROM llm_calls"), [(1, 130)])
        self.assertEqual(self.sql("SELECT count(*) FROM component_calls"), [(0,)])

    def test_worktree_log_symlink_discovers_shared_component_sources(self):
        worktree = self.root / "worktree"
        worktree.mkdir()
        (worktree / "logs").symlink_to(self.root / "logs", target_is_directory=True)
        with mock.patch.object(usage.Path, "home", return_value=self.root):
            db = sync.LogDb(str(worktree / "logs"), str(self.root / "db"), quiet=True)
            try:
                db.run()
            finally:
                db.con.close()
        self.assertEqual(self.sql("SELECT sum(total_tokens) FROM component_calls"), [(330,)])

    def test_time_cut_applies_to_session_rollout_timestamp(self):
        later = self.event(200, 100, 60)
        later["timestamp"] = "2026-10-05T12:01:00Z"
        self.write(".codex/sessions/2026/10/05/rollout-fixed-L.jsonl", [self.event(100, 80, 30), later])
        with mock.patch.object(usage.Path, "home", return_value=self.root):
            db = sync.LogDb(str(self.root / "logs"), str(self.root / "db"), quiet=True, upto_ts="2026-10-05T12:00:30Z")
            try:
                db.run()
            finally:
                db.con.close()
        self.assertEqual(self.sql("SELECT sum(total_tokens) FROM component_calls WHERE session='L'"), [(130,)])

    def test_post_run_refresh_is_background_and_busy_lock_skips(self):
        with mock.patch.object(report, "ROOT", str(self.root)), mock.patch.object(report, "LIVE", str(REPO)), mock.patch("subprocess.Popen") as popen:
            report.refresh_costs()
            args = popen.call_args.args[0]
            self.assertEqual(args[:4], ["nice", "-n", "19", "python3"])
            self.assertEqual(args[-4:], ["--root", str(self.root), "--code-root", str(REPO)])
            self.assertTrue(popen.call_args.kwargs["start_new_session"])
            popen.return_value.wait.assert_not_called()
        with (self.root / "ops/cost-refresh.lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with mock.patch.object(worker, "component_costs") as build:
                self.assertEqual(worker.main(str(self.root), str(REPO)), 0)
                build.assert_not_called()
        with mock.patch.object(worker, "component_costs", return_value=True) as build:
            self.assertEqual(worker.main(str(self.root), str(REPO)), 0)
            build.assert_called_once_with(root=str(self.root), code_root=str(REPO))
        with mock.patch.object(worker, "component_costs", return_value=False):
            self.assertEqual(worker.main(str(self.root), str(REPO)), 1)
        tree = ast.parse((REPO / "ops/report.py").read_text())
        calls = [n.func.id for n in ast.walk(tree.body[-1]) if isinstance(n, ast.Call) and isinstance(n.func, ast.Name)]
        self.assertIn("refresh_costs", calls)

    def test_missing_learner_service_stays_unattributed_during_an_unrelated_run(self):
        self.write("logs/runs.jsonl", [{"run_id": "A", "character": "IRONCLAD", "ascension": 8,
            "ended": "2026-10-05T12:02:00Z", "tokens": 1, "jev_calls": 1}])
        self.write("logs/run-config.jsonl", [{"run_id": "A", "ts": "2026-10-05T11:59:00Z"}])
        self.write("learner/runs/batch.jsonl", [
            {"type": "learner_launch", "task": "fix-batch", "params": {"character": "silent"}},
            {"type": "learner_summary", "ts": NOW, "summary": {"engine": "codex", "sessionId": "L",
                "tokens": {"input": 20, "cacheRead": 80, "output": 30}}}])
        cfg = json.loads((REPO / "eval/cost-config.json").read_text())
        events = cost.collect(self.root, cfg, self.root / "observer", self.root / ".codex")[0]
        learned = [e for e in events if e["component"] == "learner:fix-batch"]
        self.assertEqual([(e["run"], e["character"], e["ascension"], e["total_tokens"]) for e in learned],
            [("unattributed", "silent", None, 130)])


if __name__ == "__main__":
    unittest.main()
