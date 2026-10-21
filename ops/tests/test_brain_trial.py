"""Fixed journals only: no production files, model calls or game actions."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]

def module(path):
    spec = importlib.util.spec_from_file_location(path.stem, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m

scheduler = module(ROOT / "ops/brain_trial.py")
metrics = module(ROOT / "eval/brain_trial.py")
baseline = module(ROOT / "eval/metrics.py")
SCHEDULE = {"trial_id": "issue-31", "arms": [{"engine": "codex", "effort": "high"}, {"engine": "codex", "effort": "xhigh"}], "total": 20}

def config(i, rid=None, ascension=10):
    return {"run_id": rid or f"r{i}", "ts": "2026-10-21T12:00:00Z", "ascension": ascension, "character": "SILENT",
            "brain": {"run_profile": dict(SCHEDULE["arms"][i % 2], sequence=i, trial_id="issue-31")}}

def outcome(i):
    return {"run_id": f"r{i}", "victory": False, "ended": "2026-10-21T12:01:00Z", "floor": 10}

class Trial(unittest.TestCase):
    def test_restart_does_not_rotate_and_terminal_rotates_once(self):
        first = scheduler.select(SCHEDULE, [], [])
        self.assertEqual(first["effort"], "high")
        self.assertEqual(scheduler.select(SCHEDULE, [config(0), config(0)], []), first)
        self.assertEqual(scheduler.select(SCHEDULE, [config(0)], [outcome(0)])["effort"], "xhigh")
        cs = [config(i) for i in range(20)]
        self.assertEqual(scheduler.select(SCHEDULE, cs, [outcome(i) for i in range(19)])["sequence"], 19)
        with self.assertRaises(ValueError):
            scheduler.select(SCHEDULE, cs, [outcome(i) for i in range(20)])

    def test_foreign_mixed_duplicate_and_invalid_hold(self):
        for cs in [[{"run_id": "foreign", "brain": {}}], [config(0), config(1, "r0")], [config(0), config(0, "other")]]:
            with self.assertRaises(ValueError):
                scheduler.select(SCHEDULE, cs, [])
        with self.assertRaises(ValueError):
            scheduler.select(dict(SCHEDULE, arms=[{"engine": "deepseek", "effort": "high"}]), [], [])

    def test_metrics_separate_ascension_and_quarantine_missing_native(self):
        with tempfile.TemporaryDirectory() as tmp:
            logs = Path(tmp)
            configs = [config(0), config(1, ascension=11), config(2)]
            brains = []
            for i, c in enumerate(configs):
                profile = c["brain"]["run_profile"]
                brains.append({"run_id": c["run_id"], "question_id": f"q{i}", "label": "shop/plan", "engine": "codex",
                               "requested_effort": profile["effort"], "run_brain": profile, "latency_ms": 20,
                               "native_receipt": {"effort": profile["effort"], "model": "gpt-6.1-sol"} if i < 2 else None,
                               "accepted": True, "usage": {"inputTokens": 10, "outputTokens": 3}})
            for name, rs in {"run-config": configs, "runs": [outcome(i) for i in range(3)], "brain": brains}.items():
                (logs / (name + ".jsonl")).write_text("".join(json.dumps(r) + "\n" for r in rs))
            result = metrics.analyse(logs, "issue-31")
            self.assertEqual(len(result["groups"]), 2)
            self.assertTrue(result["runs"][0]["eligible"])
            self.assertEqual(result["runs"][0]["duration_ms"], 60000)
            self.assertFalse(result["runs"][2]["eligible"])
            self.assertEqual(result["runs"][2]["issues"], ["missing_native_receipt"])
            self.assertEqual(result["runs"][0]["usage"]["inputTokens"], 10)
            self.assertEqual(result["runs"][0]["sources"][0]["line"], 1)

    def test_quality_compares_actions_not_reasons_and_retains_invalid_pairs(self):
        rows = [{"id": "q", "label": "shop/plan", "effort": effort, "accepted": True,
                 "native_receipt": {"effort": effort}, "answer": {"choice": "a", "reason": effort}}
                for effort in ("high", "xhigh")]
        self.assertEqual(metrics.fixed_quality(rows)["agreement"], 1)
        rows[0]["native_receipt"] = None
        self.assertEqual(metrics.fixed_quality(rows)["valid_pairs"], 0)

    def test_baseline_identifies_experimental_runs_even_after_foreign_restart(self):
        with tempfile.TemporaryDirectory() as tmp:
            logs = Path(tmp)
            rows = [config(0), {"run_id": "r0", "brain": {}}, {"run_id": "baseline", "brain": {}}]
            (logs / "run-config.jsonl").write_text("".join(json.dumps(r) + "\n" for r in rows))
            self.assertEqual(set(baseline.experimental_brain_runs(logs)), {"r0"})

    def test_early_death_stop_uses_equal_completed_arms(self):
        with tempfile.TemporaryDirectory() as tmp:
            logs = Path(tmp)
            configs = [config(i) for i in range(8)]
            outcomes = [dict(outcome(i), floor=10 if i % 2 == 0 or i == 1 else 30) for i in range(8)]
            for name, rows in {"run-config": configs, "runs": outcomes}.items():
                (logs / (name + ".jsonl")).write_text("".join(json.dumps(r) + "\n" for r in rows))
            result = metrics.analyse(logs, "issue-31")
            self.assertEqual(result["stop_signals"][0]["reason"], "early_death_gap")
            self.assertEqual(result["stop_signals"][0]["n_per_arm"], 4)

if __name__ == "__main__":
    unittest.main()
