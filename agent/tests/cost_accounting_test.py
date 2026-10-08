"""Fixed accounting evidence; no network, live knowledge or user transcript fixtures."""
import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest

REPO = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("cost", REPO / "eval/cost.py")
cost = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cost)
cache_spec = importlib.util.spec_from_file_location("codex_cache", REPO / "eval/codex_cache.py")
cache = importlib.util.module_from_spec(cache_spec)
cache_spec.loader.exec_module(cache)
CONFIG = json.loads((REPO / "eval/cost-config.json").read_text())
NOW = "2026-10-05T12:00:00Z"


def quota(reset="2026-10-10T12:00:00Z", percent=20):
    return {"provider": "codex", "freshness": "fresh", "sample_observed_at": NOW, "captured_at": NOW,
            "windows": [{"bucket": "codex/primary", "window_minutes": 300, "used_percent": 99, "resets_at": reset},
                        {"bucket": "codex/secondary", "window_minutes": 10080, "used_percent": percent, "resets_at": reset}]}


class Accounting(unittest.TestCase):
    def test_cache_snapshot_deduplicates_physical_calls_and_excludes_unknown_from_ratio(self):
        first = {"ts": NOW, "run_id": "A", "question_id": "Q", "thread_id": "T", "attempt": 1,
                 "ms": 50, "call_ms": 50, "usage": {"inputTokens": 100, "cachedInputTokens": 80, "outputTokens": 30}}
        second = {**first, "attempt": 2, "ms": 60, "call_ms": 110, "usage": {"inputTokens": 100, "cachedInputTokens": 0}}
        unknown = {**first, "question_id": "unknown", "ms": 70, "usage": {"inputTokens": 100}}
        result = cache.summarize([first, first, second, unknown])
        self.assertEqual(result['physical_calls'], 3)
        self.assertEqual(result['duplicate_rows'], 1)
        self.assertEqual(result['cache_unknown_calls'], 1)
        self.assertEqual(result['cache_hit_ratio_observed'], .4)
        self.assertEqual(result['zero_cache_calls'], 1)
        self.assertEqual(result['wall_ms'], 180)
        self.assertIsNone(cache.summarize([unknown])['cache_hit_ratio_observed'])

    def test_codex_session_usage_matches_exec_and_preserves_missing_cache(self):
        session = {"inputTokens": 151051, "cachedInputTokens": 121728, "cacheWriteInputTokens": 0,
                   "outputTokens": 519, "reasoningOutputTokens": 282}
        expected = cost.tokens({"input_tokens": 151051, "cached_input_tokens": 121728,
                                "output_tokens": 519, "reasoning_output_tokens": 282})
        self.assertEqual(cost.tokens(session), expected)
        self.assertEqual(cost.tokens(session)["total_tokens"], 151570)
        self.assertTrue(cost.tokens(session)["cache_usage_recorded"])
        for missing in [{}, {"inputTokens": 100}, {"inputTokens": 100, "cachedInputTokens": None}]:
            self.assertFalse(cost.tokens(missing)["cache_usage_recorded"])
        self.assertTrue(cost.tokens({"inputTokens": 100, "cachedInputTokens": 0})["cache_usage_recorded"])

    def test_session_retries_duplicate_rows_and_brain_fallback_do_not_double_count(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as tmp:
            root = Path(tmp)
            (root / 'logs').mkdir()
            def write(name, rows):
                (root / 'logs' / name).write_text(''.join(json.dumps(r) + '\n' for r in rows))
            usage = {"inputTokens": 100, "cachedInputTokens": 80, "outputTokens": 30, "reasoningOutputTokens": 20}
            first = {"ts": NOW, "run_id": "A", "question_id": "Q", "attempt": 1, "thread_id": "T",
                     "mode": "session", "outcome": "stalled", "ms": 50, "call_ms": 50, "usage": usage}
            second = {**first, "attempt": 2, "outcome": "answered", "ms": 60, "call_ms": 110}
            unknown = {"ts": NOW, "run_id": "A", "question_id": "OLD", "attempt": 1, "ms": 70}
            write('codex-calls.jsonl', [first, first, second, unknown])
            write('brain.jsonl', [{"ts": NOW, "run_id": "A", "question_id": q, "engine": "codex", "latency_ms": ms,
                                  "usage": {"inputTokens": 100, "cacheHitTokens": 80, "outputTokens": 30}}
                                 for q, ms in [('Q', 110), ('OLD', 70)]])
            events, runs, sources, periods = cost.collect(root, CONFIG, root / 'claude', root / 'codex')
            events = [e for e in events if e['component'] == 'brain:codex']
            self.assertEqual(sum(e['calls'] for e in events), 3)
            self.assertEqual(sum(e['latency_ms'] for e in events), 180)
            self.assertEqual(sum(e['input_tokens'] for e in events), 300)
            self.assertEqual(sum(e['cache_hit_tokens'] for e in events), 240)
            self.assertEqual(sum(e['reasoning_tokens'] for e in events), 40)

    def test_cache_and_reasoning_are_subsets_not_extra_tokens(self):
        self.assertEqual(cost.tokens({"input_tokens": 100, "cached_input_tokens": 80, "output_tokens": 30, "reasoning_output_tokens": 20})["total_tokens"], 130)
        self.assertEqual(cost.tokens({"input": 20, "cacheRead": 80, "output": 30, "reasoning": 20}, exclusive=True)["total_tokens"], 130)
        self.assertEqual(cost.tokens({"input": 20, "cacheRead": 80, "cacheCreation": 10, "output": 30}, exclusive=True)["total_tokens"], 130)
        self.assertEqual(cost.tokens({"input_tokens": 20, "cache_read_input_tokens": 80, "cache_creation_input_tokens": 10, "output_tokens": 30}, exclusive=True, creation_extra=True)["total_tokens"], 140)

    def test_repeated_cumulative_events_do_not_charge_twice(self):
        def event(i):
            return {"timestamp": NOW, "payload": {"type": "token_count", "info": {"total_token_usage": {"input_tokens": i, "output_tokens": i / 10}}}}
        result = list(cost.cumulative_events([event(100), event(100), event(150), event(120), event(150)]))
        self.assertEqual([r[1]["total_tokens"] for r in result], [110, 55])

    def test_reset_periods_are_separate_and_primary_is_not_assumed_weekly(self):
        next_week = quota("2026-10-17T12:00:00Z", 2)
        next_week.update(sample_observed_at="2026-10-12T12:00:00Z", captured_at="2026-10-12T12:00:00Z")
        periods = cost.quota_periods([quota(percent=10), quota(), next_week, {"provider": "codex", "reported_used_percent": 43}], CONFIG)
        self.assertEqual(len(periods), 2)
        self.assertAlmostEqual(sum(p["usd"] for p in periods), .22 * 500 * 12 / 52)
        stale = quota(); stale["freshness"] = "failed"
        self.assertEqual(cost.quota_periods([stale], CONFIG), [])

    def test_byte_cuts_ignore_partial_lines_and_later_appends(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as tmp:
            path = Path(tmp) / "source.jsonl"
            path.write_text('{"n":1}\n')
            sources = cost.Sources()
            self.assertEqual(list(sources.rows(path)), [{"n": 1}])
            with path.open("a") as handle: handle.write('{"n":2}\n{"partial":')
            self.assertEqual(list(sources.rows(path)), [{"n": 1}])
            self.assertEqual(list(cost.Sources().rows(path)), [{"n": 1}, {"n": 2}])

    def test_components_multi_run_attribution_cost_coverage_and_no_prompt_output(self):
        with tempfile.TemporaryDirectory(dir=os.environ.get("TMPDIR")) as tmp:
            root = Path(tmp)
            def write(name, rows):
                p = root / name; p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text("".join(json.dumps(r) + "\n" for r in rows))
            write("logs/runs.jsonl", [{"run_id": "A", "character": "SILENT", "ascension": 0, "tokens": 200, "jev_calls": 2, "ended": NOW, "victory": False},
                                      {"run_id": "B", "character": "SILENT", "ascension": 1, "tokens": 300, "jev_calls": 3, "ended": NOW, "victory": True}])
            raw = {"input_tokens": 100, "cached_input_tokens": 80, "output_tokens": 30, "reasoning_output_tokens": 20}
            trace = {"ts": NOW, "run_id": "A", "question_id": "Q", "attempt": 1, "usage": raw}
            write("logs/codex-calls.jsonl", [trace, trace, {"ts": NOW, "run_id": "A", "question_id": "FAIL", "attempt": 1, "call_ms": 100}])
            write("logs/brain.jsonl", [{"ts": NOW, "run_id": "A", "question_id": "Q", "engine": "codex", "usage": {"inputTokens": 100, "outputTokens": 30}, "answer": "PRIVATE_PROMPT"},
                                       {"ts": NOW, "run_id": "B", "engine": "deepseek (for codex)", "usage": {"inputTokens": 100, "cacheHitTokens": 80, "outputTokens": 30}}])
            write("learner/runs/batch.jsonl", [{"type": "learner_launch", "task": "postmortem", "params": {"runs": "A,B", "character": "silent"}},
                {"type": "learner_summary", "ts": NOW, "summary": {"engine": "codex", "sessionId": "L", "tokens": {"input": 20, "cacheRead": 80, "output": 30}}}])
            write("codex/sessions/2026/10/05/rollout-fixed-L.jsonl", [
                {"timestamp": NOW, "payload": {"type": "token_count", "info": {"total_token_usage": {"input_tokens": n, "output_tokens": n / 10}}}} for n in [100, 100, 150]])
            write("claude/c.jsonl", [{"type": "assistant", "timestamp": NOW, "requestId": "C", "message": {"id": "M", "usage": {"input_tokens": 20, "cache_read_input_tokens": 80, "output_tokens": 30}}}])
            write("logs/subscription-usage-snapshots.jsonl", [quota()])
            events, runs, sources, periods = cost.collect(root, CONFIG, root / "claude", root / "codex")
            self.assertEqual(sum(e["total_tokens"] for e in events if e["component"] == "brain:codex"), 130)
            self.assertEqual(sum(e["calls"] for e in events if e["component"] == "brain:codex"), 2)
            self.assertEqual(sum(e["latency_ms"] for e in events if e["component"] == "brain:codex"), 100)
            learned = [e for e in events if e["component"] == "learner:postmortem"]
            self.assertEqual(sum(e["total_tokens"] for e in learned), 165)
            self.assertEqual(sum(e["total_tokens"] for e in learned if e["run"] == "A"), 82.5)
            self.assertEqual(sum(e["calls"] for e in learned), 2)
            self.assertAlmostEqual(sum(e["subscription_usd"] or 0 for e in events), .2 * 500 * 12 / 52)
            self.assertTrue(all(e["api_usd"] is None for e in events if e["provider"] == "jev"))
            result = cost.write_outputs(events, runs, sources, periods, CONFIG, root)
            self.assertIsNone(result["silent"][0]["usd_per_win"])
            self.assertEqual(result["silent"][0]["cost_coverage"], "partial")
            self.assertNotIn("PRIVATE_PROMPT", (root / "paper/data/cost-sources.json").read_text())
            self.assertTrue((root / "paper/materials/silent/cost.md").is_file())
            self.assertNotIn(b"\r", (root / "paper/data/cost-silent.csv").read_bytes())

    def test_paper_dataset_invokes_component_accounting(self):
        source = (REPO / "ops/paper_dataset.py").read_text()
        self.assertIn("cost_ok = component_costs()", source)


if __name__ == "__main__":
    unittest.main()
