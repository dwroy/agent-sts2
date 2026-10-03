#!/usr/bin/env python3
"""Log database (tools/logdb, docs/logdb.md): extractors, incremental sync, views and the query entry point,
on the fixed sample in tests/logdb-data (tests/logdb-data/make-fixture.py writes it).

Run: .cache/logdb-venv/bin/python tests/logdb_test.py   (tests/logdb.test.ts runs it under vitest)
Without duckdb (plain python3) only the extractor tests run; the rest are skipped with the reason.
"""
import contextlib
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "tests", "logdb-data")
sys.path.insert(0, os.path.join(ROOT, "tools", "logdb"))

import extract  # noqa: E402
import query as logquery  # noqa: E402
import sync as logsync  # noqa: E402

try:
    import duckdb  # noqa: F401

    HAVE_DUCKDB = True
except ImportError:
    HAVE_DUCKDB = False
NEEDS_DUCKDB = unittest.skipUnless(HAVE_DUCKDB, "duckdb is not installed in this Python (use .cache/logdb-venv/bin/python)")


def lines(name):
    with open(os.path.join(DATA, name), "rb") as handle:
        return handle.readlines()


def offsets(raw_lines):
    out, pos = [], 0
    for raw in raw_lines:
        out.append(pos)
        pos += len(raw)
    return out


class ExtractTest(unittest.TestCase):
    def test_frame_row_reads_combat_without_agent_view(self):
        raw = lines("states.jsonl")[2]
        self.assertIn(extract.AGENT_VIEW, raw)
        row = extract.frame_row(raw, 1234)
        self.assertEqual((row["off"], row["len"]), (1234, len(raw)))
        self.assertEqual((row["run_id"], row["screen"], row["act"], row["floor"], row["turn"], row["ascension"]), ("RUNA00000001", "COMBAT", 1, 2, 1, 9))
        self.assertEqual((row["hp"], row["player_hp"], row["block"], row["energy"]), (80, 80, 0, 3))
        self.assertEqual(row["potions"], ["FIRE_POTION"])
        self.assertEqual(row["potion_slots"], 2)
        self.assertEqual(row["deck"], ["STRIKE_IRONCLAD", "STRIKE_IRONCLAD", "DEFEND_IRONCLAD", "BASH+"])
        self.assertEqual([(e["id"], e["hp"], e["intent_dmg"], e["alive"]) for e in row["enemies"]], [("NIBBIT", 40, 12, True), ("NIBBIT", 44, 0, True)])
        self.assertEqual(row["incoming"], 12)
        self.assertEqual(row["relics"], ["BURNING_BLOOD"])

    def test_frame_row_map_and_menu(self):
        raw = lines("states.jsonl")
        row = extract.frame_row(raw[1], 0)
        self.assertEqual((row["map_node"], row["map_row"], row["map_col"]), ("Ancient", 0, 3))
        self.assertEqual([(n["idx"], n["type"]) for n in row["map_avail"]], [(0, "Monster"), (1, "Unknown")])
        menu = extract.frame_row(raw[13], 0)
        self.assertEqual((menu["screen"], menu["run_id"], menu["floor"]), ("MAIN_MENU", None, None))
        with self.assertRaises(ValueError):
            extract.frame_row(raw[14], 0)  # the line cut short

    def test_multi_hit_intent(self):
        self.assertEqual(extract.intent_damage([{"damage": 6, "hits": 2}, {"damage": None}, {"damage": 3, "hits": None}]), 15)

    def test_decision_row_resolves_card_and_potion_ids(self):
        rows = [extract.decision_row(raw, 0) for raw in lines("decisions.jsonl")]
        played = [r for r in rows if r["action"] == "play_card"]
        self.assertEqual([r["card_id"] for r in played], ["BASH", "DEFEND_IRONCLAD", "STRIKE_IRONCLAD", "BASH", None])
        potion = next(r for r in rows if r["action"] == "use_potion")
        self.assertEqual(potion["potion_id"], "FIRE_POTION")
        jev = rows[2]
        self.assertEqual((jev["decider"], jev["choice"], jev["confidence"], jev["options"], jev["questions"]), ("jev", "plan2", 0.62, ["plan1", "plan2"], ["plan"]))
        self.assertEqual((jev["rollout_tied"], jev["rollout_best"], jev["rollout_best_chosen"]), (["plan1", "plan2"], None, True))
        self.assertNotIn("sk-", jev["rationale"])
        self.assertIn("[REDACTED]", jev["rationale"])
        escalated = next(r for r in rows if r["escalated"])
        self.assertEqual((escalated["esc_jev_choice"], escalated["esc_deepseek_choice"], escalated["ds_choice"], escalated["ds_tokens"]), ("plan1", "plan2", "plan2", 800))

    def test_scrub_and_slots(self):
        text = 'key sk-ant-FAKEFAKEFAKEFAKEFAKE00 and Bearer FAKEFAKEFAKEFAKEFAKE00 and "api_key": "FAKEFAKEFAKEFAKE"'
        self.assertEqual(extract.scrub(text).count("[REDACTED]"), 3)
        self.assertEqual(extract.scrub("x" * 10, cap=4), "xxxx…")
        self.assertEqual(extract.slot_ids("0:BASH:true|1:DEFEND_IRONCLAD:false"), {0: "BASH", 1: "DEFEND_IRONCLAD"})
        self.assertEqual(extract.slot_ids("FIRE_POTION:true:true|:false:false"), {0: "FIRE_POTION", 1: None})

    def test_model_call_rows(self):
        old, new = [extract.deepseek_call_row(raw, 0) for raw in lines("deepseek-reasoning.jsonl")]
        self.assertEqual((old["label"], old["input_tokens"], old["reasoning_chars"], old["engine"]), (None, None, 95, "deepseek"))
        self.assertEqual((new["label_head"], new["input_tokens"], new["cache_hit_tokens"], new["memory_chars"]), ("reward", 20000, 15000, 2))
        claude, deepseek, timeout = [extract.brain_call_row(raw, 0) for raw in lines("brain.jsonl")]
        self.assertEqual((claude["engine"], claude["model"], claude["guide"], claude["latency_ms"], claude["tool_calls"], claude["choice"], claude["reason"]),
                         ("claude", "claude-opus-5-5", "abcd12345678", 7000, 1, "o0", "low HP"))
        self.assertEqual((claude["input_tokens"], claude["cache_hit_tokens"], claude["cache_write_tokens"], claude["output_tokens"], claude["reasoning_tokens"], claude["cost_usd"]),
                         (30000, 18000, 12000, 400, 100, 0.12))
        self.assertEqual((claude["options"], claude["memory_chars"], claude["reasoning_chars"], claude["system_chars"], claude["reasks"], claude["attempts"]),
                         (["o0", "o1"], 7, 350, 18000, 0, 1))
        self.assertEqual((claude["parse_error"], claude["error_kind"], claude["fallback_from"], claude["run_id"], claude["effort"]), (False, None, None, None, None))
        self.assertEqual((deepseek["engine"], deepseek["label"], deepseek["input_tokens"], deepseek["cache_write_tokens"], deepseek["memory_chars"]),
                         ("deepseek", "reward/card", 20000, None, None))
        self.assertEqual((timeout["choice"], timeout["answer_chars"], timeout["parse_error"], timeout["error_kind"], timeout["error"], timeout["attempts"]),
                         (None, None, False, "timeout", "claude timed out after 60000 ms", 0))
        fell = extract.brain_call_row(json.dumps({"ts": "2026-09-20T11:00:00.000Z", "label": "map/route-plan", "engine": "deepseek", "answer": None,
                                                  "problems": ["route: not a path"], "fell_back_from": {"engine": "claude", "error": "limit", "kind": "quota"},
                                                  "memory": "journal", "usage": {"inputTokens": 5, "outputTokens": 1}}).encode(), 0)
        self.assertEqual((fell["fallback_from"], fell["fallback_kind"], fell["parse_error"], fell["memory_chars"], fell["options"]), ("claude", "quota", True, 7, None))
        # A codex row (src/brain/engines/codex.ts): the router writes its effort; codex's usage arrives in the router's names.
        codex = extract.brain_call_row(json.dumps({"ts": "2026-10-03T11:00:00.000Z", "run_id": "RUNCODEX0001", "label": "reward/card", "engine": "codex",
                                                   "model": "gpt-6.1-sol", "effort": "xhigh", "options": {"o0": None, "o1": None},
                                                   "answer": {"choice": "o1", "reason": "draw"}, "reasks": 0, "attempts": 1, "latency_ms": 41000,
                                                   "usage": {"inputTokens": 150000, "cacheHitTokens": 140000, "outputTokens": 3000, "reasoningTokens": 2500}}).encode(), 0)
        self.assertEqual((codex["engine"], codex["model"], codex["effort"], codex["label_head"], codex["latency_ms"], codex["choice"], codex["run_id"]),
                         ("codex", "gpt-6.1-sol", "xhigh", "reward", 41000, "o1", "RUNCODEX0001"))
        self.assertEqual((codex["input_tokens"], codex["cache_hit_tokens"], codex["output_tokens"], codex["reasoning_tokens"], codex["cache_write_tokens"], codex["parse_error"]),
                         (150000, 140000, 3000, 2500, None, False))
        after = extract.brain_call_row(json.dumps({"ts": "2026-10-03T11:01:00.000Z", "label": "event/choice", "engine": "deepseek", "answer": {"choice": "a"},
                                                   "fell_back_from": {"engine": "codex", "error": "codex timed out after 600000 ms", "kind": "timeout"},
                                                   "usage": {"inputTokens": 5, "outputTokens": 1}}).encode(), 0)
        self.assertEqual((after["engine"], after["fallback_from"], after["fallback_kind"], after["effort"]), ("deepseek", "codex", "timeout", None))
        self.assertEqual((codex["limit_used_pct"], codex["limit_resets_at"], codex["limit_credits"]), (None, None, None))
        # The codex usage guard's latest reading (src/brain/engines/codex-usage.ts usageNote), on a row about codex.
        guarded = extract.brain_call_row(json.dumps({"ts": "2026-10-03T12:00:00.000Z", "label": "map/route-plan", "engine": "deepseek", "answer": {"route": "keep"},
                                                     "fell_back_from": {"engine": "codex", "error": "codex usage guard: codex/primary 7-day window 81% used", "kind": "quota"},
                                                     "limits": {"engine": "codex", "read_at": "2026-10-03T11:59:00.000Z", "used_pct": 81, "window": "codex/primary", "window_min": 10080,
                                                                "resets_at": "2026-10-10T09:06:37.000Z", "credits": 500, "plan": "prolite"},
                                                     "usage": {"inputTokens": 5, "outputTokens": 1}}).encode(), 0)
        self.assertEqual((guarded["limit_used_pct"], guarded["limit_resets_at"], guarded["limit_credits"], guarded["fallback_kind"]), (81.0, "2026-10-10T09:06:37.000Z", 500.0, "quota"))
        self.assertEqual(extract.line_ts(lines("runs.jsonl")[0]), None)
        self.assertEqual(extract.line_ts(lines("states.jsonl")[0]), "2026-09-20T10:00:00.000Z")


class RunConfigExtractTest(unittest.TestCase):
    def test_run_config_row(self):
        first, other, restart = [extract.run_config_row(raw, 0) for raw in lines("run-config.jsonl")]
        self.assertEqual((first["run_id"], first["ascension"], first["floor"], first["restart"], first["code"], first["dirty"], first["branch"], first["worktree"]),
                         ("RUNA00000001", 9, 1, False, "0c66af2+dirty", True, "v4", "jev-sts2-v4run"))
        self.assertEqual((first["dirty_files"], first["pid"], first["process_started"]), (["src/knowledge/monster-db.json"], 4243, "2026-09-20T10:00:00.001Z"))
        self.assertEqual((first["brain_active"], first["brain_engine"], first["brain_by_prefix"], first["brain_fallback"], first["brain_label"], first["brain_engines"]),
                         (True, "deepseek", '{"MAP":"claude"}', "deepseek", "deepseek:deepseek-flash; MAP=claude:claude-opus-5-5", ["claude", "deepseek"]))
        self.assertEqual((first["claude_model"], first["claude_max_calls"], first["deepseek_model"], first["deepseek_max_calls"], first["deepseek_effort"]),
                         ("claude-opus-5-5", 150, "deepseek-flash", 300, "max"))
        self.assertEqual((first["knowledge_prefix"], first["prefix_sha"], first["prefix_chars"], first["prefix_tokens_deepseek"], first["prefix_tokens_claude"],
                          first["system_sha"], first["system_chars"], first["experience_version"], first["knowledge_error"]),
                         ("full", "b468835446bb", 170145, 119102, 165041, "5e5e5e5e5e5e", 172025, "2026-09-29.6", None))
        self.assertEqual((first["jev_enabled"], first["jev_model"], first["jev_context"], first["target_ascension"], first["arm"], first["config_sha"]),
                         (True, "jev-latest", "v1", 9, None, "aaaa11112222"))
        self.assertEqual((first["loop_mode"], first["build_decider"], first["build_oneshot"], first["run_plan"], first["fight_plan"]), ("play", "deepseek", "on", "v1", "off"))
        self.assertEqual(json.loads(first["config"])["brain"]["by_prefix"], {"MAP": "claude"})
        self.assertEqual((other["brain_label"], other["knowledge_prefix"], other["prefix_sha"], other["claude_model"], other["target_ascension"]),
                         ("deepseek:deepseek-flash", "off", None, None, 8))
        self.assertEqual((restart["restart"], restart["floor"], restart["brain_label"], restart["config_sha"]), (True, 3, "deepseek:deepseek-flash", "cccc55556666"))
        self.assertEqual(sorted(first), sorted(name for name, _ in extract.TABLES["run_config"]))

    def test_brain_label(self):
        def e(model, **per):
            return {"model": model, "model_by_prefix": per}

        def label(**brain):
            return extract.brain_label({"active": True, "by_prefix": {}, **brain})

        self.assertEqual(label(engine="claude", engines={"claude": e("claude-sonnet-5", MAP="claude-opus-5-5")}), "claude:claude-sonnet-5; MAP=claude:claude-opus-5-5")
        self.assertEqual(label(engine="deepseek", by_prefix={"MAP": "claude", "EVENT": "claude", "SHOP": "deepseek"},
                               engines={"deepseek": e("deepseek-flash"), "claude": e("claude-opus-5-5")}),
                         "deepseek:deepseek-flash; EVENT,MAP=claude:claude-opus-5-5")
        # A per-kind model of an engine that kind does not use (Claude only as the fallback) changes nothing.
        self.assertEqual(label(engine="deepseek", fallback="claude", engines={"deepseek": e("deepseek-flash"), "claude": e("claude-opus-5-5", MAP="claude-sonnet-5")}),
                         "deepseek:deepseek-flash")
        self.assertEqual(label(engine="codex", engines={"codex": e(None)}), "codex")
        self.assertEqual(extract.brain_label({"active": False, "engine": "deepseek"}), "none")
        self.assertIsNone(extract.brain_label({}))

    def test_run_config_text_is_scrubbed(self):
        row = json.loads(lines("run-config.jsonl")[1])
        row["knowledge"]["error"] = "failed: api_key=abcdefghijklmnopqrstuvwxyz"
        got = extract.run_config_row(json.dumps(row).encode(), 7)
        self.assertEqual(got["off"], 7)
        self.assertIn("[REDACTED]", got["knowledge_error"])
        self.assertNotIn("abcdefghijklmnop", got["config"])


class SlAttemptExtractTest(unittest.TestCase):
    def test_sl_attempt_row(self):
        first, second = [extract.sl_attempt_row(raw, 0) for raw in lines("sl-attempts.jsonl")]
        self.assertEqual(sorted(first), sorted(name for name, _ in extract.TABLES["sl_attempts"]))
        self.assertEqual((first["run_id"], first["floor"], first["encounter"], first["fight_kind"], first["attempt"], first["max_attempts"], first["result"]),
                         ("RUNA00000001", 17, "TEST_SUBJECT", "boss", 1, 4, "predicted_death"))
        self.assertEqual((first["judge_tier"], first["reload_ok"], first["reload_ms"], first["resumed_turn"], first["end_hp"], first["incoming"]),
                         ("rules", True, 21000, 1, 9, 31))
        self.assertEqual((first["potions"], first["killers"], first["from_point"]), (["T4 Block Potion"], ["Test Subject (Attack 31)"], "first play of the fight"))
        self.assertIn("Bash -> Test Subject", first["summary"])
        self.assertEqual((second["attempt"], second["result"], second["judge_tier"], second["reload_ok"], second["end_hp"]), (2, "won", None, None, 22))

    def test_decision_sl_fields(self):
        row = json.loads(lines("decisions.jsonl")[0])
        self.assertEqual((extract.decision_row(json.dumps(row).encode(), 0)["sl_attempt"], extract.decision_row(json.dumps(row).encode(), 0)["sl_reloads"]), (None, None))
        row.update({"sl_attempt": 2, "sl_reloads": 1})
        got = extract.decision_row(json.dumps(row).encode(), 0)
        self.assertEqual((got["sl_attempt"], got["sl_reloads"]), (2, 1))


class Workspace(unittest.TestCase):
    """A copy of the fixture logs and an empty database directory per test."""

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix="logdb-test-")
        self.logs = os.path.join(self.tmp, "logs")
        self.db = os.path.join(self.tmp, "db")
        os.makedirs(self.logs)
        for name in os.listdir(DATA):
            if name.endswith(".jsonl"):
                shutil.copy(os.path.join(DATA, name), self.logs)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def sync(self, **kw):
        return logsync.sync(self.logs, self.db, quiet=True, **kw)

    def q(self, sql):
        return logquery.connect(self.db).execute(sql).fetchall()

    def count(self, table):
        """(rows, distinct source lines): a line is (src, off) for the model calls, which have two sources."""
        key = "(src, off)" if table == "llm_calls_raw" else "off"
        return self.q(f"SELECT count(*), count(DISTINCT {key}) FROM {table}")[0]

    def manifest(self):
        with open(os.path.join(self.db, "manifest.json"), encoding="utf8") as handle:
            return json.load(handle)

    def write(self, name, raw_lines, mode="wb"):
        with open(os.path.join(self.logs, name), mode) as handle:
            handle.writelines(raw_lines)


@NEEDS_DUCKDB
class SyncTest(Workspace):
    def test_full_sync_then_nothing_new(self):
        stats = self.sync()
        self.assertEqual(stats["states"]["rows"], 21)
        self.assertEqual(self.count("frames"), (21, 21))
        self.assertEqual(self.count("decisions"), (18, 18))
        self.assertEqual(self.count("runs_raw"), (1, 1))
        self.assertEqual(self.count("llm_calls_raw"), (5, 5))
        self.assertEqual(self.count("run_plans"), (1, 1))
        self.assertEqual(self.count("run_config"), (3, 3))
        self.assertEqual(self.count("sl_attempts"), (2, 2))
        manifest = self.manifest()
        for key, rec in manifest["sources"].items():
            self.assertEqual(rec["offset"], os.path.getsize(os.path.join(self.logs, rec["file"])), key)
        self.assertEqual(manifest["sources"]["states"]["bad"], 1)
        again = self.sync()
        self.assertEqual(set(again), {"seconds"})
        self.assertEqual(self.count("frames"), (21, 21))

    def test_incremental_sync_reads_only_complete_new_lines(self):
        states, decisions = lines("states.jsonl"), lines("decisions.jsonl")
        self.write("states.jsonl", states[:10])
        self.write("decisions.jsonl", decisions[:5])
        self.sync()
        self.assertEqual(self.count("frames"), (10, 10))
        self.assertEqual(self.count("decisions"), (5, 5))
        # The rest arrives, and a line still being written (no newline yet).
        extra = states[-1].replace(b"11:00:06.000Z", b"11:00:07.000Z")
        self.write("states.jsonl", states[10:] + [extra[:50]], mode="ab")
        self.write("decisions.jsonl", decisions[5:], mode="ab")
        stats = self.sync()
        self.assertEqual(stats["states"]["rows"], 11)
        self.assertEqual(self.count("frames"), (21, 21))
        self.assertEqual(self.count("decisions"), (18, 18))
        size = os.path.getsize(os.path.join(self.logs, "states.jsonl"))
        self.assertEqual(self.manifest()["sources"]["states"]["offset"], size - 50)
        self.write("states.jsonl", [extra[50:]], mode="ab")
        self.sync()
        self.assertEqual(self.count("frames"), (22, 22))
        self.assertEqual(self.q("SELECT max(ts)::VARCHAR FROM frames")[0][0], "2026-09-20 11:00:07")
        # Offsets are the lines' byte offsets in the source file.
        expected = [o for o, raw in zip(offsets(states + [extra]), states + [extra]) if raw is not states[14]]
        self.assertEqual([r[0] for r in self.q("SELECT off FROM frames ORDER BY off")], expected)

    def test_truncated_file_is_rebuilt(self):
        self.sync()
        self.write("states.jsonl", lines("states.jsonl")[:5])
        self.sync()
        self.assertEqual(self.count("frames"), (5, 5))
        self.assertEqual(self.manifest()["sources"]["states"]["offset"], os.path.getsize(os.path.join(self.logs, "states.jsonl")))

    def test_replaced_file_is_rebuilt(self):
        self.sync()
        runs = lines("runs.jsonl")[0]
        other = runs.replace(b"RUNA00000001", b"RUNC00000003")
        self.write("runs.jsonl", [other, runs, runs.replace(b"RUNA00000001", b"RUND00000004")])
        self.sync()
        self.assertEqual(sorted(r[0] for r in self.q("SELECT run_id FROM runs_raw")), ["RUNA00000001", "RUNC00000003", "RUND00000004"])

    def test_offset_off_a_line_end_is_rebuilt(self):
        self.sync()
        states = lines("states.jsonl")
        # Same first line, but the file was rewritten so the old offset lands inside a line.
        self.write("states.jsonl", states[:3] + [states[3][:-1] + b" " * 5000 + b"\n"] + states[4:])
        self.sync()
        self.assertEqual(self.count("frames"), (21, 21))
        self.assertEqual(self.manifest()["sources"]["states"]["offset"], os.path.getsize(os.path.join(self.logs, "states.jsonl")))

    def test_extractor_version_change_rebuilds_that_source(self):
        self.sync()
        before = self.manifest()["sources"]["states"]["shards"]
        saved = extract.VERSIONS["runs"]
        extract.VERSIONS["runs"] = saved + 100
        try:
            self.sync()
        finally:
            extract.VERSIONS["runs"] = saved
        manifest = self.manifest()
        self.assertEqual(manifest["sources"]["runs"]["extractor"], saved + 100)
        self.assertEqual(manifest["sources"]["states"]["shards"], before)
        self.assertEqual(self.count("runs_raw"), (1, 1))

    def test_small_shards_are_merged_in_order(self):
        saved = logsync.MERGE_AT
        logsync.MERGE_AT = 4
        try:
            self.sync(shard_rows=2)
        finally:
            logsync.MERGE_AT = saved
        shards = self.manifest()["sources"]["states"]["shards"]
        self.assertLess(len(shards), 4)
        self.assertEqual(shards[-1].split("-")[-1], "%012d.parquet" % os.path.getsize(os.path.join(self.logs, "states.jsonl")))
        on_disk = sorted(n for n in os.listdir(os.path.join(self.db, "frames")) if n != logsync.EMPTY)
        self.assertEqual(on_disk, sorted(shards))
        self.assertEqual(self.count("frames"), (21, 21))
        self.assertEqual(self.count("decisions"), (18, 18))

    def test_unlisted_shards_are_removed(self):
        self.sync()
        frames = os.path.join(self.db, "frames")
        shard = self.manifest()["sources"]["states"]["shards"][0]
        shutil.copy(os.path.join(frames, shard), os.path.join(frames, "part-states-000000000000-000000000001.parquet"))
        self.assertEqual(self.count("frames"), (42, 21))
        self.sync()
        self.assertEqual(self.count("frames"), (21, 21))

    def test_upto_ts_stops_at_the_first_later_line(self):
        self.sync(upto_ts="2026-09-20T10:30:00Z")
        self.assertEqual(self.q("SELECT count(*), count(DISTINCT run_id) FROM frames")[0], (14, 1))
        self.sync()
        self.assertEqual(self.count("frames"), (21, 21))

    def test_new_columns_bind_while_only_old_shards_exist(self):
        # brain.jsonl absent: only deepseek-reasoning shards (written before a column was added) are in llm_calls_raw.
        os.remove(os.path.join(self.logs, "brain.jsonl"))
        saved = list(extract.TABLES["llm_calls_raw"])
        extract.TABLES["llm_calls_raw"] = [c for c in saved if c[0] != "error_kind"]
        try:
            self.sync()
        finally:
            extract.TABLES["llm_calls_raw"] = saved
        self.assertNotIn("error_kind", [r[0] for r in self.q("DESCRIBE llm_calls_raw")])
        self.sync()  # the columns changed: the zero-row shard is rewritten, the old shards stay
        self.assertIn("error_kind", [r[0] for r in self.q("DESCRIBE llm_calls_raw")])
        self.assertEqual(self.q("SELECT count(*), count(error_kind) FROM llm_calls")[0], (2, 0))

    def test_missing_source_files_are_fine(self):
        os.remove(os.path.join(self.logs, "brain.jsonl"))
        self.sync()
        self.assertEqual(self.count("llm_calls_raw"), (2, 2))
        self.assertEqual(self.q("SELECT count(*) FROM llm_calls")[0][0], 2)


@NEEDS_DUCKDB
class ViewsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="logdb-views-")
        cls.db = os.path.join(cls.tmp, "db")
        logsync.sync(DATA, cls.db, quiet=True)
        cls.con = logquery.connect(cls.db)

    @classmethod
    def tearDownClass(cls):
        cls.con.close()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def rows(self, sql):
        cur = self.con.execute(sql)
        names = [d[0] for d in cur.description]
        return [dict(zip(names, row)) for row in cur.fetchall()]

    def test_fights(self):
        fights = self.rows("SELECT * FROM fights ORDER BY run_id, fight_no")
        self.assertEqual([(f["run_id"], f["fight_no"], f["floor"], f["encounter"], f["room"], f["outcome"]) for f in fights], [
            ("RUNA00000001", 1, 2, "NIBBIT+NIBBIT", "hallway", "won"),
            ("RUNA00000001", 2, 3, "TERROR_EEL", "elite", "died"),  # no map after it: the room comes from the map choice
            ("RUNB00000002", 1, 2, "SEAPUNK", "hallway", "won"),
        ])
        first, eel, seapunk = fights
        # The card selection inside the first fight neither splits it nor counts as its frame.
        self.assertEqual((first["entry_hp"], first["last_hp"], first["post_hp"], first["turns"], first["frames"]), (80, 73, 79, 2, 4))
        self.assertEqual((first["hp_loss"], first["net_hp_loss"], first["cards_played"], first["potions_in"], first["potions_used"]), (7, 1, 3, ["FIRE_POTION"], []))
        self.assertEqual((eel["hp_loss"], eel["net_hp_loss"], eel["potions_used"], eel["potions_n"], eel["ascension"]), (79, 79, ["FIRE_POTION"], 1, 9))
        self.assertEqual((seapunk["hp_loss"], seapunk["net_hp_loss"], seapunk["ascension"]), (9, 3, 8))

    def test_turns(self):
        turns = self.rows("SELECT * FROM turns ORDER BY run_id, fight_no, turn")
        got = [(t["fight_no"], t["turn"], t["start_hp"], t["intent_damage"], t["hp_lost"], t["enemy_turn_hp_lost"], t["cards_played"], t["potions_used"]) for t in turns]
        self.assertEqual(got, [
            (1, 1, 80, 12, 7, 7, ["BASH", "DEFEND_IRONCLAD"], []),
            (1, 2, 73, 12, 0, None, ["STRIKE_IRONCLAD"], []),
            (2, 1, 79, 30, 30, 30, [], ["FIRE_POTION"]),
            (2, 2, 49, 60, 49, None, [], []),  # died: all the HP it started with
            (1, 1, 80, 9, 9, 9, ["BASH"], []),
            (1, 2, 71, 9, 0, None, [], []),  # a card whose id is not in the fingerprint: counted, not listed
        ])
        self.assertEqual(turns[-1]["cards_n"], 1)
        self.assertEqual((turns[1]["enemies_alive"], turns[1]["enemy_hp"], turns[1]["start_powers"]), (1, 5, [{"id": "STRENGTH_POWER", "amount": 2}]))

    def test_floors(self):
        floors = self.rows("SELECT * FROM floors ORDER BY run_id, floor")
        got = [(f["run_id"][:4], f["floor"], f["room_node"], f["entry_hp"], f["exit_hp"], f["hp_loss"], f["exit_src"], f["died"]) for f in floors]
        self.assertEqual(got, [
            ("RUNA", 1, "Ancient", None, 80, None, "map", False),
            ("RUNA", 2, "Monster", 80, 79, 1, "map", False),
            ("RUNA", 3, "Elite", 79, 0, 79, "death", True),
            ("RUNB", 1, "Ancient", None, 80, None, "map", False),
            ("RUNB", 2, "Monster", 80, 77, 3, "map", False),
            ("RUNB", 3, "RestSite", 77, 80, -3, "map", False),
        ])
        self.assertEqual(floors[2]["node_src"], "choice")
        self.assertEqual((floors[0]["event_id"], floors[4]["exit_gold"], floors[4]["exit_potions"]), ("NEOW", 110, 1))

    def test_runs(self):
        runs = {r["run_id"]: r for r in self.rows("SELECT * FROM runs")}
        a, b = runs["RUNA00000001"], runs["RUNB00000002"]
        self.assertEqual((a["finished"], a["victory"], a["floor"], a["ascension"], a["code"]), (True, False, 3, 9, "abc1234"))
        self.assertEqual((a["death_fight"], a["death_encounter"], a["death_room"]), (["恐怖鳗鱼"], "TERROR_EEL", "elite"))
        self.assertEqual(str(a["started"]), "2026-09-20 10:00:00")
        self.assertEqual((b["finished"], b["victory"], b["floor"], b["ascension"], b["code"]), (False, None, 3, 8, None))
        # The configuration it started with (the first run-config row); A was restarted with another one.
        self.assertEqual((a["brain_label"], a["knowledge_prefix"], a["prefix_sha"], a["cfg_code"], a["cfg_worktree"], a["config_rows"], a["config_changed"]),
                         ("deepseek:deepseek-flash; MAP=claude:claude-opus-5-5", "full", "b468835446bb", "0c66af2+dirty", "jev-sts2-v4run", 2, True))
        self.assertEqual((a["brain_engine"], a["brain_by_prefix"], a["brain_fallback"], a["jev_model"], a["jev_context"], a["target_ascension"], a["config_sha"]),
                         ("deepseek", '{"MAP":"claude"}', "deepseek", "jev-latest", "v1", 9, "aaaa11112222"))
        self.assertEqual((b["brain_label"], b["knowledge_prefix"], b["config_rows"], b["config_changed"], b["target_ascension"]), ("deepseek:deepseek-flash", "off", 1, False, 8))

    def test_llm_calls_get_their_run(self):
        calls = self.rows("SELECT src, run_id, label, engine, total_tokens, duplicate FROM llm_calls ORDER BY ts")
        self.assertEqual([(c["src"], c["run_id"], c["label"], c["engine"], c["duplicate"]) for c in calls], [
            ("deepseek-reasoning", "RUNA00000001", None, "deepseek", False),  # logged just before the run's first frame
            ("deepseek-reasoning", "RUNB00000002", "reward/card", "deepseek", False),
            ("brain", "RUNB00000002", "reward/card", "deepseek", True),  # the same call, logged again by the router
            ("brain", "RUNB00000002", "rest/choose", "claude", False),
            ("brain", "RUNB00000002", "event/choose", "claude", False),
        ])
        self.assertEqual([c["total_tokens"] for c in calls], [0, 20300, 20300, 30400, 0])

    def test_decisions_and_plans(self):
        rows = self.rows("SELECT label, decider, action, card_id, potion_id, rationale FROM decisions ORDER BY off")
        self.assertEqual(len(rows), 18)
        self.assertEqual(sum(1 for r in rows if r["decider"] == "jev"), 6)
        self.assertFalse(any("sk-" in (r["rationale"] or "") for r in rows))
        plan = self.rows("SELECT run_id, trigger, archetype, want FROM run_plans")[0]
        self.assertEqual((plan["run_id"], plan["trigger"], plan["archetype"], plan["want"]), ("RUNB00000002", "start", "strength", ["INFLAME"]))

    def test_state_index_points_at_the_raw_line(self):
        rows = self.rows("SELECT off, len, ts::VARCHAR AS ts, screen FROM state_index WHERE run_id = 'RUNA00000001' AND screen = 'GAME_OVER'")
        self.assertEqual(len(rows), 1)
        with open(os.path.join(DATA, "states.jsonl"), "rb") as handle:
            handle.seek(rows[0]["off"])
            raw = handle.read(rows[0]["len"])
        self.assertTrue(raw.endswith(b"\n"))
        self.assertEqual(json.loads(raw)["state"]["game_over"], {"is_victory": False, "floor": 3})
        self.assertEqual(json.loads(logquery.raw_line(DATA, "states", rows[0]["off"]))["screen"], "GAME_OVER")
        with self.assertRaises(logquery.QueryError):
            logquery.raw_line(DATA, "states", rows[0]["off"] + 1)


@NEEDS_DUCKDB
class QueryTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.mkdtemp(prefix="logdb-query-")
        cls.db = os.path.join(cls.tmp, "db")
        logsync.sync(DATA, cls.db, quiet=True)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_only_one_read_only_statement(self):
        con = logquery.connect(self.db)
        for sql in ["DELETE FROM frames", "COPY (SELECT 1) TO 'x.csv'", "SET threads = 1", f"ATTACH '{self.tmp}/x.db'", "SELECT 1; SELECT 2",
                    "CREATE TABLE t AS SELECT 1", "INSTALL httpfs", "SELEC 1"]:
            with self.assertRaises(logquery.QueryError, msg=sql) as caught:
                logquery.run_query(con, sql)
            self.assertEqual(caught.exception.code, 2, sql)
        self.assertEqual(logquery.run_query(con, "WITH x AS (SELECT 1 AS a) SELECT a FROM x")["rows"], [[1]])
        self.assertEqual(logquery.run_query(con, "DESCRIBE fights")["rows"][0][:2], ["run_id", "VARCHAR"])

    def test_no_files_outside_the_database(self):
        con = logquery.connect(self.db)
        for sql in [f"SELECT * FROM read_text('{os.path.join(DATA, 'runs.jsonl')}')", "SELECT * FROM glob('/etc/*')"]:
            with self.assertRaises(logquery.QueryError):
                logquery.run_query(con, sql)
        self.assertFalse(os.path.exists("x.csv"))

    def test_row_cap_and_timeout(self):
        con = logquery.connect(self.db)
        result = logquery.run_query(con, "SELECT off FROM frames ORDER BY off", max_rows=5)
        self.assertEqual((result["row_count"], result["truncated"], len(result["rows"])), (5, True, 5))
        self.assertFalse(logquery.run_query(con, "SELECT 1", max_rows=5)["truncated"])
        with self.assertRaises(logquery.QueryError) as caught:
            logquery.run_query(con, "SELECT sum(a.range * b.range) FROM range(100000000) a CROSS JOIN range(100000) b", timeout=0.3)
        self.assertIn("interrupted", str(caught.exception))

    def test_a_table_an_older_sync_did_not_write_is_named(self):
        old = os.path.join(self.tmp, "old")
        shutil.copytree(self.db, old)
        # A database synced before run_config existed: no table directory, no manifest entry.
        shutil.rmtree(os.path.join(old, "run_config"))
        with open(os.path.join(old, "manifest.json"), encoding="utf8") as handle:
            manifest = json.load(handle)
        manifest["sources"].pop("run-config")
        with open(os.path.join(old, "manifest.json"), "w", encoding="utf8") as handle:
            json.dump(manifest, handle)
        with self.assertRaises(logquery.QueryError) as caught:
            logquery.connect(old)
        self.assertIn("run_config", str(caught.exception))
        self.assertIn("sync.py", str(caught.exception))
        logsync.sync(DATA, old, quiet=True)  # the next sync adds it, the other sources untouched
        self.assertEqual(logquery.connect(old).execute("SELECT count(*), count(DISTINCT run_id) FROM run_config").fetchone(), (3, 2))

    def test_cli(self):
        script = os.path.join(ROOT, "tools", "logdb", "query.py")
        run = lambda *args: subprocess.run([sys.executable, script, "--db", self.db, "--logs", DATA, *args], capture_output=True, text=True)
        out = run("--json", "--no-sync", "--max-rows", "1", "SELECT run_id, victory FROM runs ORDER BY run_id")
        self.assertEqual(out.returncode, 0, out.stderr)
        result = json.loads(out.stdout)
        self.assertEqual((result["columns"], result["rows"], result["truncated"]), (["run_id", "victory"], [["RUNA00000001", False]], True))
        bad = run("--json", "--no-sync", "DROP VIEW runs")
        self.assertEqual(bad.returncode, 2)
        self.assertIn("read-only", json.loads(bad.stdout)["error"])
        table = run("--no-sync", "SELECT encounter, outcome FROM fights ORDER BY first_off")
        self.assertIn("| NIBBIT+NIBBIT | won |", table.stdout)
        schema = run("--schema", "--no-sync")
        self.assertTrue(schema.stdout.startswith("runs: run_id VARCHAR"), schema.stdout[:200])
        raw = run("--raw", "runs", "0")
        self.assertEqual(json.loads(raw.stdout)["run_id"], "RUNA00000001")
        missing = run("--json", "--no-sync", "--db", os.path.join(self.tmp, "nowhere"), "SELECT 1")
        self.assertEqual(missing.returncode, 1)
        self.assertIn("sync.py", json.loads(missing.stdout)["error"])


if __name__ == "__main__":
    if not HAVE_DUCKDB:
        print("duckdb not installed: sync, view and query tests are skipped (run with .cache/logdb-venv/bin/python)", file=sys.stderr)
    unittest.main()
