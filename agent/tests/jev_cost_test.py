"""Fixed TypeSafe billing evidence; never call APIs or read live logs."""
import csv
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("cost", REPO / "eval/cost.py")
cost = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cost)
CONFIG = json.loads((REPO / "eval/cost-config.json").read_text())
NOW = "2026-10-05T12:00:00Z"


class JevCost(unittest.TestCase):
    def collect(self, root, runs, traces):
        logs = root / "logs"
        logs.mkdir()
        for name, rows in [("runs.jsonl", runs), ("jev-prompts.jsonl", traces)]:
            (logs / name).write_text("".join(json.dumps(r) + "\n" for r in rows))
        return cost.collect(root, CONFIG, root / "claude", root / "codex")

    def test_paid_input_free_output_and_complete_coverage(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            trace = {"ts": NOW, "run_id": "A", "request_id": "R", "input_tokens": 1000, "output_tokens": 99}
            events, runs, sources, periods = self.collect(root, [
                {"run_id": "A", "character": "SILENT", "ascension": 7, "ended": NOW, "tokens": 1099, "jev_calls": 1}
            ], [trace, trace])
            jev = [e for e in events if e["provider"] == "jev"]
            self.assertEqual(len(jev), 1)
            self.assertEqual(jev[0]["input_tokens"], 1000)
            self.assertEqual(jev[0]["output_tokens"], 99)
            self.assertAlmostEqual(jev[0]["api_usd"], .000042)
            cost.write_outputs(events, runs, sources, periods, CONFIG, root)
            with (root / "paper/data/cost-silent.csv").open() as handle:
                row = next(csv.DictReader(handle))
            self.assertEqual(row["cost_complete"], "True")
            report = (root / "paper/materials/silent/cost.md").read_text()
            self.assertIn("全部角色", report)
            self.assertIn("0.042", report)
            self.assertNotIn("单价尚缺", report)

    def test_missing_split_failure_and_inflight_requests_stay_distinct(self):
        with tempfile.TemporaryDirectory() as tmp:
            events, runs, _, _ = self.collect(Path(tmp), [
                {"run_id": "A", "character": "IRONCLAD", "ended": NOW, "tokens": 1600, "jev_calls": 2}
            ], [
                {"ts": NOW, "run_id": "A", "request_id": "R", "input_tokens": 1000, "output_tokens": 100},
                {"ts": NOW, "run_id": "A", "decision_id": "FAIL", "input_tokens": None, "output_tokens": None},
                {"ts": NOW, "run_id": "INFLIGHT", "request_id": "OPEN", "input_tokens": 200, "output_tokens": 10},
            ])
            result = cost.jev_reconciliation(events, runs, CONFIG)
            self.assertEqual(result["logs"]["calls"], 4)
            self.assertEqual(result["logs"]["total_tokens"], 1810)
            self.assertEqual(result["logs"]["unknown_split_tokens"], 500)
            self.assertEqual(result["unknown_usage_calls"], 2)
            self.assertAlmostEqual(result["logs"]["known_api_usd"], 1200 * .042 / 1e6)
            self.assertEqual(result["finished_runs"], {"calls": 2, "total_tokens": 1600})

    def test_all_characters_and_window_boundaries_in_reconciliation(self):
        with tempfile.TemporaryDirectory() as tmp:
            traces = [{"ts": ts, "run_id": rid, "request_id": rid, "input_tokens": 100, "output_tokens": 10}
                      for rid, ts in [("IRON", "2026-09-27T16:00:00Z"), ("SILENT", NOW),
                                      ("OLD", "2026-09-27T15:59:59Z"), ("AFTER", "2026-10-05T16:00:00Z")]]
            events, runs, _, _ = self.collect(Path(tmp), [], traces)
            result = cost.jev_reconciliation(events, runs, CONFIG)
            self.assertEqual(result["logs"]["calls"], 2)
            self.assertEqual(result["logs"]["total_tokens"], 220)
            self.assertEqual(result["log_minus_page"]["tokens"], 220 - 119495182)


if __name__ == "__main__":
    unittest.main()
