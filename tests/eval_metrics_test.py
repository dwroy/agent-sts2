#!/usr/bin/env python3
"""The evaluator (tools/eval/metrics.py, docs/eval.md): each metric's algorithm on small fixed samples, then the
whole path (sync -> views -> per-run metrics -> groups) on tests/eval-data (tests/eval-data/make-fixture.py).

Run: .cache/logdb-venv/bin/python tests/eval_metrics_test.py   (tests/eval.test.ts runs it under vitest)
Without duckdb (plain python3) only the algorithm tests run; the database tests are skipped with the reason.
"""
import contextlib
import datetime as dt
import io
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "tests", "eval-data")
sys.path.insert(0, os.path.join(ROOT, "tools", "eval"))
sys.path.insert(0, os.path.join(ROOT, "tools", "logdb"))

import metrics  # noqa: E402

try:
    import duckdb  # noqa: F401

    HAVE_DUCKDB = True
except ImportError:
    HAVE_DUCKDB = False
NEEDS_DUCKDB = unittest.skipUnless(HAVE_DUCKDB, "duckdb is not installed in this Python (use .cache/logdb-venv/bin/python)")
SETS = {"cards": {"INFLAME", "FIGHT_ME"}, "relics": {"VAJRA", "GIRYA"}}


def fight(no, act, floor, room, entry_hp=70, max_hp=80, outcome="won", potions_in=0, potions_n=0):
    return {"fight_no": no, "act": act, "floor": floor, "room": room, "entry_hp": entry_hp, "max_hp": max_hp, "outcome": outcome,
            "potions_in": potions_in, "potions_n": potions_n, "first_off": no * 100, "last_off": no * 100 + 50}


def floor(n, act, node):
    return {"floor": n, "act": act, "room_node": node}


class BossTest(unittest.TestCase):
    def test_boss_floor_comes_from_the_boss_room_not_a_fixed_number(self):
        fights = [fight(1, 1, 3, "hallway"), fight(2, 1, 9, "boss", potions_in=2), fight(3, 2, 12, "elite"), fight(4, 2, 20, "boss", outcome="died", potions_in=1)]
        bosses = metrics.boss_fights(fights, max_act=2, victory=False)
        self.assertEqual({act: (b["floor"], b["inferred"], b["potions_in"]) for act, b in bosses.items()}, {1: (9, False, 2), 2: (20, False, 1)})
        self.assertTrue(metrics.passed_boss(1, 2, False, bosses))
        self.assertFalse(metrics.passed_boss(2, 2, False, bosses))

    def test_boss_is_inferred_when_the_run_got_past_an_act_without_a_boss_room(self):
        fights = [fight(1, 1, 5, "elite"), fight(2, 1, 16, None), fight(3, 2, 20, "hallway", outcome="died")]
        bosses = metrics.boss_fights(fights, max_act=2, victory=False)
        self.assertEqual((bosses[1]["fight_no"], bosses[1]["inferred"]), (2, True))
        self.assertNotIn(2, bosses)  # died in act 2 before its boss: nothing to infer
        # The last act of a won run: its last fight is the boss.
        won = metrics.boss_fights([fight(1, 1, 17, "boss"), fight(2, 2, 33, "boss"), fight(3, 3, 40, "hallway"), fight(4, 3, 48, None)], 3, True)
        self.assertEqual((won[3]["floor"], won[3]["inferred"]), (48, True))
        self.assertTrue(metrics.passed_boss(3, 3, True, won))

    def test_first_boss_room_of_an_act_counts_and_a_won_boss_is_passed_without_later_frames(self):
        bosses = metrics.boss_fights([fight(1, 3, 48, "boss", potions_in=3), fight(2, 3, 49, "boss", potions_in=1)], 3, False)
        self.assertEqual((bosses[3]["floor"], bosses[3]["potions_in"]), (48, 3))
        self.assertTrue(metrics.passed_boss(3, 3, False, bosses))

    def test_non_boss_drinks_leave_out_boss_rooms_and_inferred_bosses(self):
        fights = [fight(1, 1, 2, "hallway", potions_n=1), fight(2, 1, 6, "elite", potions_n=2), fight(3, 1, 16, None, potions_n=3),
                  fight(4, 2, 18, "unknown_room", potions_n=1), fight(5, 2, 33, "boss", potions_n=2)]
        bosses = metrics.boss_fights(fights, max_act=2, victory=False)
        self.assertEqual(metrics.nonboss_drinks(fights, bosses), 4)
        self.assertAlmostEqual(metrics.per_ten_floors(4, 33), 40 / 33)
        self.assertIsNone(metrics.per_ten_floors(4, 0))


class StrengthTest(unittest.TestCase):
    def test_cards_relics_and_strength_on_the_first_frame(self):
        self.assertEqual(metrics.strength_sources(["STRIKE_IRONCLAD", "INFLAME+", "INFLAME"], ["BURNING_BLOOD"], 0, SETS),
                         {"cards": ["INFLAME"], "relics": [], "power": False, "any": True})
        self.assertEqual(metrics.strength_sources(["BASH"], ["BURNING_BLOOD", "VAJRA"], 1, SETS),
                         {"cards": [], "relics": ["VAJRA"], "power": True, "any": True})
        # Strength on the first frame with no listed card or relic (an event's gift) still counts.
        self.assertEqual(metrics.strength_sources(["BASH"], [], 2, SETS)["any"], True)
        self.assertEqual(metrics.strength_sources(["BASH", "SETUP_STRIKE"], ["BURNING_BLOOD"], 0, SETS),
                         {"cards": [], "relics": [], "power": False, "any": False})
        self.assertEqual(metrics.strength_sources(None, None, None, SETS)["any"], False)

    def test_sets_come_from_a_file_and_never_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "sets.json")
            with open(path, "w") as out:
                json.dump({"cards": ["INFLAME"], "relics": ["VAJRA"]}, out)
            self.assertEqual(metrics.strength_sets(path)["cards"], {"INFLAME"})
            with open(path, "w") as out:
                json.dump({"cards": [], "relics": ["VAJRA"]}, out)
            with self.assertRaises(RuntimeError):
                metrics.strength_sets(path)


class EliteAndRestTest(unittest.TestCase):
    def test_elite_entry_below_78_percent(self):
        fights = [fight(1, 1, 3, "elite", 62, 80), fight(2, 1, 6, "elite", 63, 80), fight(3, 1, 8, "elite", 40, 80, potions_n=1),
                  fight(4, 1, 9, "hallway", 10, 80), fight(5, 2, 20, "elite", 10, 80), fight(6, 1, 10, "elite", None, 80)]
        # 62 < 62.4 counts, 63 does not; hallways, act-2 elites and fights without an entry HP are left out.
        self.assertEqual(metrics.act1_elites(fights), (2, 3))
        self.assertEqual(metrics.act1_elites(fights, share=0.5), (0, 3))  # 40 is not below 40
        self.assertEqual(metrics.act1_elites(fights, share=0.51), (1, 3))

    def test_died_before_the_first_act_2_rest_site(self):
        floors = [floor(17, 1, "Boss"), floor(18, 2, "Monster"), floor(19, 2, "Monster"), floor(20, 2, "RestSite"), floor(21, 2, "Elite")]
        self.assertEqual(metrics.first_rest(floors, 2), 20)
        self.assertEqual(metrics.died_before_first_rest(floors[:3], 19, False), (True, True))
        self.assertEqual(metrics.died_before_first_rest(floors, 21, False), (True, False))
        self.assertEqual(metrics.died_before_first_rest(floors[:2], 18, False), (True, True))  # no rest site reached at all
        self.assertEqual(metrics.died_before_first_rest(floors[:1], 17, False), (False, False))  # died in act 1: not in the count
        self.assertEqual(metrics.died_before_first_rest(floors + [floor(34, 3, "Monster")], 34, False), (True, False))  # died in act 3
        self.assertEqual(metrics.died_before_first_rest(floors[:3], 19, True), (True, False))


class StatsTest(unittest.TestCase):
    def test_mean_interval(self):
        s = metrics.mean_stats([1, 2, 3, None])
        self.assertEqual((s["n"], s["mean"], s["median"]), (3, 2.0, 2.0))
        self.assertAlmostEqual(s["hi"], 2 + 4.303 / 3 ** 0.5, places=3)
        self.assertEqual(s["lo"], 0.0)  # 2 - 2.484 cut at 0
        self.assertEqual(metrics.mean_stats([5])["lo"], None)
        self.assertEqual(metrics.mean_stats([])["mean"], None)
        self.assertEqual(metrics.t_crit(40), 2.00)

    def test_wilson(self):
        w = metrics.wilson(0, 10)
        self.assertEqual((w["p"], w["lo"]), (0.0, 0.0))
        self.assertAlmostEqual(w["hi"], 0.2775, places=3)
        w = metrics.wilson(5, 10)
        self.assertAlmostEqual(w["lo"], 0.2366, places=3)
        self.assertAlmostEqual(w["hi"], 0.7634, places=3)
        self.assertIsNone(metrics.wilson(0, 0)["p"])

    def test_summary_counts_tokens_only_for_runs_with_full_usage(self):
        def row(calls, with_usage, tokens, floor_n=20, low=0, elites=1, entered=True, died2=False):
            llm = {"calls": calls, "with_usage": with_usage, "input": tokens, "cache_hit": tokens // 2, "output": 10, "latency_ms": 60000}
            return {"floor": floor_n, "passed_act1": entered, "passed_act2": False, "victory": False, "drinks_per10": 1.0,
                    "boss_potions": {1: 2}, "strength_act1": {"any": True, "cards": ["INFLAME"], "relics": [], "power": False},
                    "act1_elites_low": low, "act1_elites": elites, "entered_act2": entered, "died_before_act2_rest": died2,
                    "llm": llm, "llm_by_engine": {"deepseek": llm}}
        s = metrics.summarize([row(10, 10, 4000), row(10, 4, 999999, low=1, died2=True), row(8, 8, 2000, entered=False)])
        self.assertEqual(s["usage_runs"], 2)
        self.assertEqual(s["llm_input"]["mean"], 3.0)
        self.assertAlmostEqual(s["cache_hit_rate"], 0.5)
        self.assertEqual((s["died_before_act2_rest"]["k"], s["died_before_act2_rest"]["n"]), (1, 2))
        self.assertEqual((s["elite_low_share"]["k"], s["elite_low_share"]["n"]), (1, 3))
        self.assertEqual(s["boss_potions_1"]["mean"], 2.0)
        self.assertEqual(s["boss_potions_3"]["n"], 0)
        self.assertEqual(s["strength_parts"], {"cards": 3, "relics": 0, "power": 0})


class FakeGit:
    """a <- b <- c on the main line; d is on it before a; e is unknown to git."""

    def __init__(self):
        self.commits = {"a1": "a" * 40, "b1": "b" * 40, "c1": "c" * 40, "d1": "d" * 40}
        self.times = {"a" * 40: dt.datetime(2026, 9, 28, 8, tzinfo=dt.timezone.utc), "b" * 40: dt.datetime(2026, 9, 29, 8, tzinfo=dt.timezone.utc)}

    def resolve(self, names):
        return {n: self.commits.get(n) for n in names}

    def descendants(self, commit):
        return {"a" * 40: {"a" * 40, "b" * 40, "c" * 40}, "b" * 40: {"b" * 40, "c" * 40}}[commit]

    def reachable(self):
        return set(self.commits.values())

    def is_ancestor(self, ancestor, commit):
        raise AssertionError("every commit is reachable here")

    def commit_time(self, commit):
        return self.times[commit]


class VersionTest(unittest.TestCase):
    def setUp(self):
        self.versions = metrics.VersionMap([{"name": "V2", "commit": "a1"}, {"name": "V3", "family": "V3", "commit": "b1"}], FakeGit())

    def name(self, code, started=None):
        entry, how = self.versions.assign(code, started)
        return entry["name"], how

    def test_by_ancestry_with_dirty_stripped(self):
        self.assertEqual(self.name("c1+dirty"), ("V3", "git"))
        self.assertEqual(self.name("b1"), ("V3", "git"))
        self.assertEqual(self.name("a1"), ("V2", "git"))
        self.assertEqual(self.name("d1"), ("before V2", "git"))

    def test_by_time_without_a_known_code(self):
        self.assertEqual(self.name("e1", dt.datetime(2026, 9, 29, 9)), ("V3", "time"))
        self.assertEqual(self.name(None, dt.datetime(2026, 9, 28, 9)), ("V2", "time"))
        self.assertEqual(self.name(None, dt.datetime(2026, 9, 27)), ("before V2", "time"))

    def test_unknown_commit_in_the_table_is_an_error(self):
        with self.assertRaises(ValueError):
            metrics.VersionMap([{"name": "V4", "commit": "zz"}], FakeGit())

    def test_groups_keep_the_table_order_and_split_arms(self):
        rows = [{"run_id": r, "code": code, "arm": arm, "started": dt.datetime(2026, 9, 29, h), "ascension": 8}
                for r, code, arm, h in [("R1", "c1", None, 1), ("R2", "d1", None, 2), ("R3", "a1", "jev", 3), ("R4", "b1", None, 4)]]
        groups = metrics.group_runs(rows, "version", self.versions)
        self.assertEqual([(name, [r["run_id"] for r in rs]) for name, rs in groups], [("before V2", ["R2"]), ("V2 [arm jev]", ["R3"]), ("V3", ["R1", "R4"])])
        days = metrics.group_runs(rows, "day")
        self.assertEqual([name for name, _ in days], ["2026-09-29"])  # 01:00-04:00 UTC is the same local day (UTC+8)
        self.assertEqual(metrics.local_day(dt.datetime(2026, 9, 29, 17)), "2026-09-30")


@NEEDS_DUCKDB
class FixtureTest(unittest.TestCase):
    """tests/eval-data through sync, the views and the evaluator."""

    @classmethod
    def setUpClass(cls):
        import query as logquery
        import sync as logsync

        cls.tmp = tempfile.mkdtemp(prefix="eval-test-")
        cls.db = os.path.join(cls.tmp, "db")
        logsync.sync(DATA, cls.db, quiet=True)
        con = logquery.connect(cls.db)
        cls.rows = {r["run_id"]: r for r in metrics.load_runs(con, SETS)}

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_boss_floors_from_the_data(self):
        c, d = self.rows["RUNC00000003"], self.rows["RUND00000004"]
        self.assertEqual((c["boss_floor"], c["boss_inferred"], c["boss_potions"]), ({1: 4}, [], {1: 2}))
        self.assertEqual((d["boss_floor"], d["boss_inferred"], d["boss_potions"]), ({1: 3}, [1], {1: 1}))
        self.assertEqual([(r["passed_act1"], r["passed_act2"], r["victory"]) for r in (c, d)], [(True, False, False)] * 2)

    def test_drinks_elites_strength_and_rest(self):
        c, d = self.rows["RUNC00000003"], self.rows["RUND00000004"]
        # D drank in its (inferred) boss fight too: not a non-boss drink.
        self.assertEqual([(r["drinks_nonboss"], r["drinks_per10"]) for r in (c, d)], [(1, 2.0), (1, 2.0)])
        self.assertEqual([(r["act1_elites_low"], r["act1_elites"]) for r in (c, d)], [(1, 1), (0, 1)])
        self.assertEqual({k: c["strength_act1"][k] for k in ("cards", "relics", "power", "any")}, {"cards": ["INFLAME"], "relics": ["VAJRA"], "power": True, "any": True})
        # D gains Strength on turn 2 of the boss fight only: not a source.
        self.assertEqual((d["strength_act1"]["any"], d["strength_act1"]["max_strength"]), (False, 2))
        self.assertEqual([(r["entered_act2"], r["act2_first_rest"], r["died_before_act2_rest"]) for r in (c, d)], [(True, None, True), (True, 4, False)])

    def test_model_calls_without_the_duplicate(self):
        c, d = self.rows["RUNC00000003"], self.rows["RUND00000004"]
        self.assertEqual((c["llm"]["calls"], c["llm"]["input"], c["llm"]["cache_hit"], c["llm"]["output"], c["llm"]["latency_ms"]), (2, 42000, 31000, 1200, 8000))
        self.assertEqual(list(c["llm_by_engine"]), ["deepseek"])
        self.assertEqual((d["llm"]["calls"], list(d["llm_by_engine"]), d["llm"]["input"]), (1, ["claude"], 30000))

    def test_filters(self):
        import query as logquery

        con = logquery.connect(self.db)
        self.assertEqual([r["run_id"] for r in metrics.load_runs(con, SETS, since=dt.datetime(2026, 9, 21, 10, 30))], ["RUND00000004"])
        self.assertEqual([r["run_id"] for r in metrics.load_runs(con, SETS, until=dt.datetime(2026, 9, 21, 10, 30))], ["RUNC00000003"])
        self.assertEqual(metrics.load_runs(con, SETS, ascensions={8}), [])
        self.assertEqual(metrics.as_utc("2026-09-21T18:30+08:00"), dt.datetime(2026, 9, 21, 10, 30))

    def test_cli(self):
        git = metrics.Git()
        if None in git.resolve(["17ac095", "0c93138"]).values():
            self.skipTest("the V3 commits are not in this repository")
        # The calibration rows are tested in tests/eval_calibration_test.py (with a fixed boss clock, no tsx).
        args = ["--db", self.db, "--logs", DATA, "--no-sync", "--strength-sets", os.path.join(DATA, "strength-sets.json"), "--no-calibration"]
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(metrics.main(args + ["--json"]), 0)
        data = json.loads(out.getvalue())
        self.assertEqual([(g["name"], g["run_ids"]) for g in data["groups"]], [("V3", ["RUNC00000003"]), ("V3.oneshot", ["RUND00000004"])])
        self.assertEqual({r["run_id"]: r["version_how"] for r in data["runs"]}, {"RUNC00000003": "git", "RUND00000004": "git"})
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(metrics.main(args + ["--md", "--group-by", "ascension", "--total", "--per-run"]), 0)
        text = out.getvalue()
        self.assertIn("| 指标 | A9 | 全部 |", text)
        self.assertIn("| 二幕第一个休息点前死亡（占进二幕的局） | 50%（1/2；", text)
        self.assertIn("样本不足", text)
        self.assertIn("| RUND00000004 | V3.oneshot | 0c93138+dirty |", text)
        # The script runs on its own too (sync skipped, the fixture's sets).
        done = subprocess.run([sys.executable, os.path.join(ROOT, "tools", "eval", "metrics.py"), *args, "--group-by", "day"], capture_output=True, text=True)
        self.assertEqual(done.returncode, 0, done.stderr)
        self.assertIn("== 2026-09-21 ==", done.stdout)


if __name__ == "__main__":
    unittest.main()
