"""Fixed-data cohort, snapshots, accounting/evidence and operator wait tests. No game/LLM/network."""
import contextlib
import copy
import datetime as dt
import importlib.util
import io
import json
from pathlib import Path
import sys
import tempfile
import types
import subprocess
import os
import shutil
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "eval"))
import brain_source
import metrics
sys.path.insert(0, str(ROOT / "ops"))
import brain_wait
import paper_dataset


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


curve = load("codex_curve", ROOT / "eval/learning-curve.py")


def write(path, rows):
    Path(path).write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows))


class SourceTest(unittest.TestCase):
    def test_shared_engine_fixtures(self):
        fixtures = json.loads((ROOT / "agent/tests/brain-source-fixtures.json").read_text())
        for fixture in fixtures:
            with self.subTest(fixture["name"]):
                actual = brain_source.classify(fixture["rows"])
                self.assertEqual(actual["source"], fixture["source"])
                self.assertEqual(actual["eligible"], fixture["eligible"])
                self.assertEqual(actual["successful_answers"], fixture["counts"])

    def test_unresolved_questions_are_not_assumed_to_have_codex_answers(self):
        rows = [{"engine": "codex", "question_id": "good", "answer": {}, "accepted": True},
                {"engine": "codex", "question_id": "bad", "answer": None, "error": "quota"}]
        source = brain_source.classify(rows)
        self.assertEqual(source["source"], "unknown")
        self.assertEqual(source["exclusion_reason"], "unresolved_brain_questions")
        self.assertEqual(source["successful_answers"], {"codex": 1})
        self.assertFalse(source["eligible"])


class CohortTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="codex-stats-fixed-")
        self.addCleanup(self.temp.cleanup)
        self.logs = Path(self.temp.name)
        self.runs = [{"run_id": rid, "character": who, "ascension": asc, "floor": 48, "victory": True,
                      "ended": "2026-10-07T01:00:00Z", "deepseek_calls": 99, "ds_cost_usd": 7, "code": "fixture"}
                     for rid, who, asc in [("C", "SILENT", 2), ("SL", "SILENT", 2), ("D", "SILENT", 10), ("M", "SILENT", 10), ("U", "SILENT", 10), ("I", "IRONCLAD", 5)]]
        self.brain = [{"run_id": rid, "engine": engine, "question_id": rid+engine, "label": "run-plan", "answer": {}, "accepted": True, "usage": {"costUsd": 7}}
                      for rid, engine in [("C", "codex"), ("SL", "codex"), ("D", "deepseek"), ("M", "codex"), ("M", "deepseek"), ("I", "codex")]]
        write(self.logs / "runs.jsonl", self.runs)
        write(self.logs / "brain.jsonl", self.brain)
        write(self.logs / "sl-attempts.jsonl", [{"run_id": "SL", "result": "predicted_death", "floor": 17, "attempt": 1, "reload_ok": True}])
        self.sources = brain_source.load_sources(self.logs, [r["run_id"] for r in self.runs])

    def test_curve_and_paper_share_codex_default_and_explicit_raw_scope(self):
        evidence = [{"id": "silent-one", "character": "silent", "asc": 10, "prior": "no", "status": "observed", "evidence": [{"run": "D", "role": "repeat"}]}]
        rows = curve.curve("silent", str(self.logs), evidence)
        self.assertEqual([(r["ascension"], r["runs"], r["wins"], r["first_try_wins"], r["sl_wins"]) for r in rows], [(2, 2, 2, 1, 1), (10, 0, 0, 0, 0)])
        self.assertEqual(rows[1]["raw_runs"], 3)
        self.assertEqual(rows[1]["items_found"], 1)
        self.assertEqual(rows[1]["repeats"], 1)
        self.assertIn('"D"', rows[1]["source_by_run"])
        self.assertEqual(curve.curve("ironclad", str(self.logs), evidence)[0]["runs"], 1)
        raw = curve.curve("silent", str(self.logs), evidence, True)
        self.assertEqual([r["wins"] for r in raw], [2, 3])
        silent = brain_source.annotate(copy.deepcopy(self.runs[:5]), self.sources)
        silent[1]["first_attempt"] = {"victory": False}
        group = paper_dataset.performance_group(silent)
        self.assertEqual((group["runs"], group["wins"], group["first_try_wins"], group["sl_wins"]), (2, 2, 1, 1))
        self.assertEqual(group["raw_wins"], 5)
        self.assertEqual(paper_dataset.performance_group(silent, True)["wins"], 5)
        self.assertEqual(sum(r["ds_cost_usd"] for r in silent), 35)
        self.assertEqual([r["run_id"] for r in silent], ["C", "SL", "D", "M", "U"])

    def test_metrics_main_filters_performance_but_json_retains_all_runs_and_usage(self):
        evaluated = [metrics.run_metrics({**r, "started": dt.datetime(2026, 10, 7)}, [], [], {},
                         [{"engine": "fixture", "calls": 1, "with_usage": 1, "input": 100, "output": 10}], {"cards": set(), "relics": set()},
                         [{"result": "predicted_death", "floor": 17, "attempt": 1, "reload_ok": True}] if r["run_id"] == "SL" else []) | {"character": r["character"]} for r in self.runs]
        query = types.SimpleNamespace(connect=lambda *a, **k: object())
        sync = types.SimpleNamespace(DEFAULT_DB="fixture", DEFAULT_LOGS=str(self.logs), be_gentle=lambda: None,
                                     read_lock=lambda *a, **k: contextlib.nullcontext())
        class Versions:
            def __init__(self, *a): pass
            def assign(self, *a): return {"name": "fixture"}, "fixture"
        def run(extra):
            with patch.dict(sys.modules, {"query": query, "sync": sync}), patch.object(metrics, "load_runs", return_value=copy.deepcopy(evaluated)), patch.object(metrics, "strength_sets", return_value={"cards": set(), "relics": set()}), patch.object(metrics, "VersionMap", Versions), contextlib.redirect_stdout(io.StringIO()) as stdout:
                self.assertEqual(metrics.main(["--json", "--no-sync", "--no-calibration", "--group-by", "ascension", "--logs", str(self.logs)] + extra), 0)
                return json.loads(stdout.getvalue())
        selected, raw = run([]), run(["--include-non-codex"])
        self.assertEqual(sum(g["summary"]["runs"] for g in selected["groups"]), 3)
        self.assertEqual(sum(g["summary"]["runs"] for g in raw["groups"]), 6)
        self.assertEqual(len(selected["runs"]), 6)
        self.assertEqual(selected["excluded_run_ids"], ["D", "M", "U"])
        self.assertEqual(selected["all_run_usage_summary"]["llm_input"], raw["all_run_usage_summary"]["llm_input"])
        self.assertEqual(selected["all_run_usage_summary"]["runs"], 6)
        totals = run(["--total"])
        by_run = {r["run_id"]: r["character"] for r in totals["runs"]}
        self.assertEqual({g["name"] for g in totals["groups"] if g["name"].startswith("全部")}, {"全部 · silent", "全部 · ironclad"})
        self.assertTrue(all(len({by_run[rid] for rid in g["run_ids"]}) == 1 for g in totals["groups"]))
        self.assertEqual(totals["raw_cohorts_by_character"]["ironclad"]["codex"]["runs"], 1)

    def test_unknown_ascension_is_visible_instead_of_disappearing_from_raw_scope(self):
        self.runs[4]["ascension"] = None
        write(self.logs / "runs.jsonl", self.runs)
        rows = curve.curve("silent", str(self.logs), [])
        unknown = next(r for r in rows if r["ascension"] == "unknown")
        self.assertEqual((unknown["runs"], unknown["raw_runs"], unknown["raw_wins"]), (0, 1, 1))
        self.assertEqual(sum(r["raw_runs"] for r in rows), 5)
        self.assertEqual(curve.curve("silent", str(self.logs), [], True)[-1]["runs"], 1)

    def test_byte_cut_and_old_snapshots_are_retained(self):
        limit = (self.logs / "brain.jsonl").stat().st_size
        with (self.logs / "brain.jsonl").open("a") as f:
            f.write(json.dumps({"run_id": "C", "engine": "deepseek", "answer": {}, "accepted": True}) + "\n")
        self.assertEqual(brain_source.load_sources(self.logs, limit=limit)["C"]["source"], "codex")
        self.assertEqual(brain_source.load_sources(self.logs)["C"]["source"], "mixed")
        data = self.logs / "paper"; data.mkdir()
        (data / "old.md").write_text("原始旧报告\n")
        with patch.object(paper_dataset, "DATA", str(data)):
            saved = paper_dataset.preserve_previous()
            self.assertEqual((Path(saved) / "old.md").read_text(), "原始旧报告\n")
            self.assertEqual((data / "old.md").read_text(), "原始旧报告\n")

    def test_cost_curve_keeps_excluded_run_spending_and_raw_wins(self):
        cost = load("codex_cost_fixture", ROOT / "eval/cost.py")
        runs = copy.deepcopy(self.runs[:5]); brain_source.annotate(runs, self.sources)
        rows = []
        for r in runs:
            rows.append(dict(character="silent", ascension=r["ascension"], run=r["run_id"], component="brain:fixture", batch="", provider="fixture",
                             calls=1, latency_ms=1, usage_recorded=True, api_usd=7, subscription_usd=None,
                             **{key: 100 if key in ("input_tokens", "total_tokens") else 0 for key in cost.FIELDS}))
        result = cost.write_outputs(rows, {r["run_id"]: r for r in runs}, types.SimpleNamespace(cuts={}, bad_lines={}), [],
                                   json.loads((ROOT / "eval/cost-config.json").read_text()), self.logs)
        self.assertEqual(sum(r["runs"] for r in result["silent"]), 5)
        self.assertEqual(sum(r["wins"] for r in result["silent"]), 2)
        self.assertEqual(sum(r["raw_wins"] for r in result["silent"]), 5)
        self.assertEqual(sum(r["known_estimated_usd"] for r in result["silent"]), 35)
        self.assertEqual(sum(r["total_tokens"] for r in result["silent"]), 500)
        self.assertEqual(brain_source.cohorts([{**r, "victory": 1} for r in runs])["mixed"]["wins"], 1)


class WaitRecognitionTest(unittest.TestCase):
    def test_autoplay_parks_terminal_exit_without_reporting_or_starting_another_run(self):
        with tempfile.TemporaryDirectory(prefix="autoplay-fixed-") as directory:
            root = Path(directory); ops = root / "ops"; ops.mkdir()
            (root / "logs").mkdir(); (root / "notes").mkdir(); (root / "bin").mkdir()
            for name in ["autoplay.sh", "paths.sh", "brain_wait.py"]:
                shutil.copy2(ROOT / "ops" / name, ops / name)
            (root / "logs/brain-wait.json").write_text(json.dumps({"state": "fault", "question_id": "same", "run_id": "C"}))
            # First call simulates the play return; the marker is published at that safe point.
            (root / "logs/brain-wait.json").unlink()
            runner = ops / "run.sh"
            runner.write_text('#!/bin/bash\nprintf "run\\n" >> "$(dirname "$0")/calls"\nprintf \'{"state":"fault","question_id":"same","run_id":"C"}\' > "$(dirname "$0")/../logs/brain-wait.json"\nexit 78\n')
            runner.chmod(0o755)
            sleeper = root / "bin/sleep"
            sleeper.write_text('#!/bin/bash\nprintf "sleep\\n" >> "$FIXTURE_ROOT/sleeps"\n[ "$(wc -l < "$FIXTURE_ROOT/sleeps")" -lt 3 ] || touch "$FIXTURE_ROOT/ops/STOP"\nexit 0\n')
            sleeper.chmod(0o755)
            result = subprocess.run(["nice", "-n", "19", "bash", str(ops / "autoplay.sh")], timeout=10, capture_output=True, text=True,
                                    env={**os.environ, "FIXTURE_ROOT": str(root), "PATH": str(root / "bin")+":"+os.environ["PATH"]})
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((ops / "calls").read_text(), "run\n")
            self.assertNotIn("finished run", (ops / "autoplay.log").read_text())
            self.assertFalse((ops / "restarts.log").exists())

    def test_only_fresh_live_heartbeats_suppress_stall_and_terminal_markers_park_restart(self):
        with tempfile.TemporaryDirectory(prefix="wait-marker-fixed-") as directory:
            marker = Path(directory) / "brain-wait.json"
            row = {"state": "heartbeat", "pid": 123, "question_id": "same", "run_id": "C", "decision_type": "rest/plan", "ts": "2026-10-07T00:00:00Z", "reason": "quota"}
            marker.write_text(json.dumps(row))
            now = dt.datetime(2026, 10, 7, tzinfo=dt.timezone.utc).timestamp()
            self.assertTrue(brain_wait.live_wait(directory, now+30, lambda pid: pid == 123))
            self.assertIsNone(brain_wait.live_wait(directory, now+46, lambda pid: True))
            self.assertIsNone(brain_wait.live_wait(directory, now+30, lambda pid: False))
            self.assertFalse(brain_wait.hold(directory))
            for state in ["fault", "cancelled"]:
                marker.write_text(json.dumps({**row, "state": state}))
                self.assertTrue(brain_wait.hold(directory))
                self.assertIsNone(brain_wait.live_wait(directory, now, lambda pid: True))
            marker.unlink()
            self.assertFalse(brain_wait.hold(directory))


if __name__ == "__main__":
    unittest.main(verbosity=2)
