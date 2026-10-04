#!/usr/bin/env python3
"""Calibration (eval/calibration.py, docs/eval.md section 7): the alignment of each prediction with what happened
(the same turn, the same map node, the same boss fight), the buckets and the groups, on small fixed samples; then the
whole path (sync -> views -> raw decision / state lines -> rows -> report, and the metrics columns) on
tests/calibration-data (tests/calibration-data/make-fixture.py).

Run: data/logdb-venv/bin/python tests/eval_calibration_test.py   (tests/eval.test.ts runs it under vitest)
Without duckdb (plain python3) only the algorithm tests run; the database tests are skipped with the reason.
"""
import contextlib
import io
import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[2])  # the project root (docs/layout.md)
DATA = os.path.join(ROOT, "agent", "tests", "calibration-data")
sys.path.insert(0, os.path.join(ROOT, "eval"))
sys.path.insert(0, os.path.join(ROOT, "agent", "tools", "logdb"))

import calibration as cal  # noqa: E402

try:
    import duckdb  # noqa: F401

    HAVE_DUCKDB = True
except ImportError:
    HAVE_DUCKDB = False
NEEDS_DUCKDB = unittest.skipUnless(HAVE_DUCKDB, "duckdb is not installed in this Python (use .cache/logdb-venv/bin/python)")

TURNS = "T1 exact: hp -5, dmg 10; T2: hp -4 [0-8], dmg 10 [5-15], alive 8/8, won 4/8; T3: hp -2 [0-4], dmg 8 [4-12], alive 7/8, won 6/8; T4: over (alive 7/8, won 7/8)"


def criteria(**lines):
    return {"plan": {"type": "choice", "criteria": {k: json.dumps(v) for k, v in lines.items()}}}


class FactsTest(unittest.TestCase):
    def test_hp_lost_numbers_and_random_potion_means(self):
        self.assertEqual(cal.loss_number(5), 5.0)
        self.assertEqual(cal.loss_number(-4), -4.0)
        self.assertEqual(cal.loss_number("mean 4.7 [3-7]"), 4.7)
        self.assertIsNone(cal.loss_number("all"))
        self.assertIsNone(cal.loss_number(True))

    def test_rollout_text(self):
        facts = cal.line_facts(json.dumps({"hp_lost": 24, "rollout": "5-turn rollout (8 samples): expected further HP loss 32.4, fight over within 5 turns in 8/8",
                                           "rollout_turns": TURNS}))
        self.assertEqual((facts["hp_lost"], facts["further"], facts["horizon"], facts["samples"], facts["fallback"]), (24.0, 32.4, 5, 8, False))
        median = cal.line_facts({"hp_lost": "mean 3 [0-6]", "rollout": "the median sample's line: 3-turn rollout (1 sample) (later turns may use the potions still held): expected further HP loss -4.5, fight"})
        self.assertEqual((median["hp_lost"], median["further"], median["horizon"], median["samples"]), (3.0, -4.5, 3, 1))
        # The time-budget fallback is not a forecast; a drink-first line has no numbers.
        fallback = cal.line_facts({"hp_lost": 9, "rollout": "no rollout (it ran past its time budget; a fallback, not a forecast): ... further HP loss ~21.1", "rollout_turns": TURNS})
        self.assertEqual((fallback["fallback"], fallback["further"], fallback["turns"]), (True, None, None))
        self.assertIsNone(cal.line_facts({"rollout": "not rolled out: this potion's effect is not modelled"})["further"])
        self.assertIsNone(cal.line_facts("not json"))

    def test_expected_loss_by_turn_weights_each_turn_by_the_samples_still_fighting(self):
        # T2: all 8 fighting (4 won by its end); T3: 8 - 4 = 4 fighting; T4: over.
        self.assertEqual(cal.expected_cumulative(TURNS), [5.0, 9.0, 10.0, 10.0])
        # A T1 that wins leaves nothing after it; a heal on T1 is a negative loss.
        self.assertEqual(cal.expected_cumulative("T1 exact: hp -3, dmg 20, won; T2: over (alive 8/8, won 8/8)"), [3.0, 3.0])
        self.assertEqual(cal.expected_cumulative("T1 exact: hp --4, dmg 5"), [-4.0])
        # An unreadable part stops the list; an unreadable T1 gives nothing.
        self.assertEqual(cal.expected_cumulative("T1 exact: hp -2, dmg 5; T2: something else"), [2.0])
        self.assertIsNone(cal.expected_cumulative("T2: over (alive 8/8, won 8/8)"))

    def test_the_played_line(self):
        self.assertEqual(cal.executed_key({"answers": {"plan": {"choice": "plan3"}}, "rationale": "Jev chose plan 3/4 (x) with confidence 0.60; code rank 2"}), ("plan3", "answer"))
        guard = "Jev chose plan 2/3 (Strike, Bash) with confidence 0.50; code rank 1; HP guard: plan 2 (Strike, Bash) loses 12 HP, more than 5 over the cheapest line, playing plan 1 (Defend, Defend; hp -3) instead"
        self.assertEqual(cal.executed_key({"answers": {"plan": {"choice": "plan2"}}, "rationale": guard}), ("plan1", "hp-guard"))
        dominated = "Jev chose plan 2/3 (end turn); plan 3 (Strike (x), Defend) is as good or better on every axis, playing it with confidence 0.30; code rank 2"
        self.assertEqual(cal.executed_key({"answers": {"plan": {"choice": "plan2"}}, "rationale": dominated}), ("plan3", "dominator"))
        escalated = {"answers": {"plan": {"choice": "plan1"}}, "escalation": {"jev_choice": "plan1", "deepseek_choice": "p2", "choice": "p2"}, "rationale": "DeepSeek overrode Jev"}
        self.assertEqual(cal.executed_key(escalated), ("p2", "escalation"))
        self.assertEqual(cal.executed_key({"decider": "code-fallback", "answers": {"plan": {"choice": "plan2"}}, "rationale": "Jev near-guess (0.2); using the code-best plan"}),
                         (None, "code-fallback"))
        self.assertEqual(cal.executed_key({"answers": None, "rationale": ""}), (None, "no-answer"))


class TurnAlignmentTest(unittest.TestCase):
    def test_fight_end_hp(self):
        self.assertEqual(cal.fight_end_hp({"outcome": "died", "last_hp": 20, "post_hp": 0}), 0)
        # Burning Blood's heal after the fight is not counted; the Giant's eruption at its death is.
        self.assertEqual(cal.fight_end_hp({"outcome": "won", "last_hp": 50, "post_hp": 56}), 50)
        self.assertEqual(cal.fight_end_hp({"outcome": "won", "last_hp": 52, "post_hp": 27}), 27)
        self.assertEqual(cal.fight_end_hp({"outcome": "won", "last_hp": 50, "post_hp": None}), 50)

    def test_losses_line_up_with_the_next_turns_first_frames(self):
        starts = {1: 70, 2: 64, 3: 60, 4: 51}
        # Decided mid-turn 2 at 62: through turn 2 = 62 - 60; through turn 3 = 62 - 51; after turn 4 the fight is over (end 45).
        self.assertEqual(cal.actual_losses(62, 2, starts, 45, 4), ([2, 11, 17, 17], 17))
        # The run died: the end is 0.
        self.assertEqual(cal.actual_losses(20, 4, starts, 0, 2), ([20, 20], 20))
        # A turn missing in the log while a later one is there: unknown, not the fight's end.
        self.assertEqual(cal.actual_losses(70, 1, {1: 70, 3: 50}, 40, 3), ([None, 20, 30], 30))
        self.assertEqual(cal.actual_losses(None, 1, starts, 40, 2), ([None, None], None))

    def test_turn_row(self):
        record = {"decider": "jev", "label": "combat/plan-choice", "answers": {"plan": {"choice": "plan1"}}, "rationale": "Jev chose plan 1/2",
                  "questions": criteria(plan1={"hp_lost": 5, "rollout": "4-turn rollout (8 samples): expected further HP loss 12", "rollout_turns": TURNS}, plan2={"hp_lost": 0})}
        fight = {"run_id": "R", "fight_no": 3, "ascension": 9, "act": 1, "floor": 7, "encounter": "NIBBIT", "room": "hallway", "outcome": "won", "last_hp": 52, "post_hp": 58}
        row, why = cal.turn_row(record, {"hp": 70, "turn": 1}, fight, {1: 70, 2: 65, 3: 60}, 1)
        self.assertIsNone(why)
        # This turn 70 - 65; the window of 4 turns: predicted 10, actual 70 - 52 (over after turn 3).
        self.assertEqual((row["pred_turn"], row["actual_turn"], row["err_turn"]), (5.0, 5, 0.0))
        self.assertEqual((row["pred_window"], row["actual_window"], row["err_window"]), (10.0, 18, -8.0))
        self.assertEqual(row["actual_cum"], [5, 10, 18, 18])
        self.assertEqual((row["pred_end"], row["actual_end"], row["err_end"]), (12.0, 18, -6.0))
        self.assertFalse(row["replanned"])
        # The played line has no hp_lost (a drink-first line), the fight's outcome is unknown, code played its own line.
        self.assertEqual(cal.turn_row(dict(record, answers={"plan": {"choice": "p0"}}), {"hp": 70, "turn": 1}, fight, {1: 70}, 1), (None, "no hp_lost on the played line"))
        self.assertEqual(cal.turn_row(record, {"hp": 70, "turn": 1}, dict(fight, outcome=None), {1: 70}, 1)[1], "fight outcome unknown")
        self.assertEqual(cal.turn_row(dict(record, decider="code-fallback"), {"hp": 70, "turn": 1}, fight, {1: 70}, 1), (None, "code-fallback"))


class RouteTest(unittest.TestCase):
    PLAN = {"run_id": "R", "act": 2, "floor": 18, "max_hp": 80, "label": "event/act-plan",
            "path": [{"row": 1, "col": 2, "type": "Monster", "hpOnArrival": 0.8}, {"row": 2, "col": 2, "type": "Unknown", "hpOnArrival": 0.75},
                     {"row": 3, "col": 1, "type": "Elite", "hpOnArrival": 0.75}, {"row": 4, "col": 1, "type": "RestSite", "hpOnArrival": 0.4}]}

    def test_nodes_line_up_while_the_run_follows_the_plan(self):
        visits = {(2, 1, 2): 19, (2, 2, 2): 20, (2, 3, 1): 21, (2, 4, 1): 22, (1, 3, 1): 4}
        floors = {19: {"entry_hp": 64}, 20: {"entry_hp": 58}, 21: {"entry_hp": 40}, 22: {"entry_hp": 10}}
        nodes, rooms = cal.align_plan(self.PLAN, visits, floors, {"ascension": 9, "floor": 30, "victory": False})
        self.assertEqual([(n["floor"], n["distance"], n["type"], n["pred"], n["actual"], n["err"]) for n in nodes],
                         [(19, 1, "Monster", 64.0, 64, 0.0), (20, 2, "Unknown", 60.0, 58, 2.0), (21, 3, "Elite", 60.0, 40, 20.0), (22, 4, "RestSite", 32.0, 10, 22.0)])
        # Each room between two nodes: its projected cost against its actual cost (the "?" room projected at 0 cost 18).
        self.assertEqual([(r["floor"], r["type"], r["pred_cost"], r["actual_cost"], r["err"]) for r in rooms],
                         [(19, "Monster", 4.0, 6, -2.0), (20, "Unknown", 0.0, 18, -18.0), (21, "Elite", 28.0, 30, -2.0)])

    def test_leaving_the_plan_stops_and_a_death_on_the_path_counts_the_next_node_as_zero(self):
        floors = {19: {"entry_hp": 64}, 20: {"entry_hp": 58}, 21: {"entry_hp": 40}}
        # The run took another node on floor 21: only the nodes before it count.
        nodes, _ = cal.align_plan(self.PLAN, {(2, 1, 2): 19, (2, 2, 2): 20, (2, 3, 4): 21}, floors, {"floor": 30, "victory": False})
        self.assertEqual([n["floor"] for n in nodes], [19, 20])
        # The same node on another floor is not on the plan either.
        nodes, _ = cal.align_plan(self.PLAN, {(2, 1, 2): 19, (2, 2, 2): 21}, floors, {"floor": 30, "victory": False})
        self.assertEqual([n["floor"] for n in nodes], [19])
        # Died in the elite room (floor 21): the rest site on floor 22 is 0 HP; its room is all the entry HP.
        nodes, rooms = cal.align_plan(self.PLAN, {(2, 1, 2): 19, (2, 2, 2): 20, (2, 3, 1): 21}, floors, {"floor": 21, "victory": False})
        self.assertEqual([(n["floor"], n["actual"], n["died_before"]) for n in nodes][-1], (22, 0, True))
        self.assertEqual((rooms[-1]["type"], rooms[-1]["actual_cost"], rooms[-1]["died"]), ("Elite", 40, True))
        # A won run's last floor is not a death.
        nodes, _ = cal.align_plan(self.PLAN, {(2, 1, 2): 19, (2, 2, 2): 20, (2, 3, 1): 21}, floors, {"floor": 21, "victory": True})
        self.assertFalse(any(n["died_before"] for n in nodes))

    def test_plan_from_a_decision(self):
        record = {"route_plan": {"runId": "R", "act": 1, "floor": 1, "hpPct": 0.8, "path": [{"row": 1, "col": 3, "type": "Monster", "hpOnArrival": 0.8}]}}
        plan = cal.plan_from_record(record, {"run_id": "R", "floor": 1, "max_hp": 80, "label": "map/route-plan", "off": 5})
        self.assertEqual((plan["act"], plan["floor"], plan["max_hp"], len(plan["path"])), (1, 1, 80, 1))
        self.assertIsNone(cal.plan_from_record({"route_plan": None}, {"run_id": "R", "floor": 1, "max_hp": 80}))
        self.assertIsNone(cal.plan_from_record(record, {"run_id": "R", "floor": 1, "max_hp": None}))

    def test_distance_buckets(self):
        self.assertEqual([cal.distance_bucket(d) for d in (1, 2, 3, 4, 5, 6, 8, 9, 12, 13, 30)], ["1", "2", "3", "4–5", "4–5", "6–8", "6–8", "9–12", "9–12", "13+", "13+"])


class BossTest(unittest.TestCase):
    @staticmethod
    def enemy(eid, hp, max_hp, idx=0, alive=True, minion=False):
        return {"idx": idx, "id": eid, "hp": hp, "max_hp": max_hp, "alive": alive, "minion": minion}

    def test_boss_damage_counts_the_boss_bodies_only(self):
        priest = lambda hp: self.enemy("KIN_PRIEST", hp, 199, 2)  # noqa: E731
        follower = lambda hp, i: self.enemy("KIN_FOLLOWER", hp, 62, i, minion=True)  # noqa: E731
        frames = [[follower(62, 0), follower(62, 1), priest(199)], [follower(10, 0), follower(62, 1), priest(150)], [follower(0, 0), priest(80)]]
        # Won: the priest's whole max HP (the followers are minions); lost: its max HP minus its lowest.
        self.assertEqual(cal.boss_damage(frames, True), 199)
        self.assertEqual(cal.boss_damage(frames, False), 119)
        # Two bodies (Kaiser Crab): their HP together; a dead one counts 0.
        crab = [[self.enemy("CRUSHER", 219, 219, 0), self.enemy("ROCKET", 209, 209, 1)], [self.enemy("CRUSHER", 100, 219, 0), self.enemy("ROCKET", 0, 209, 1, alive=False)]]
        self.assertEqual(cal.boss_damage(crab, False), 328)
        # The Giant's post-kill marker (max HP 999999999) is a dead Giant, not HP.
        giant = [[self.enemy("WATERFALL_GIANT", 270, 270)], [self.enemy("WATERFALL_GIANT", 999999990, 999999999)]]
        self.assertEqual(cal.boss_damage(giant, False), 270)
        self.assertIsNone(cal.boss_damage([], True))

    def test_boss_row(self):
        fight = {"run_id": "R", "act": 1, "floor": 17, "fight_no": 9, "encounter": "VANTOM", "outcome": "died", "entry_hp": 60, "last_hp": 12, "post_hp": 0, "turns": 6}
        frames = [[self.enemy("VANTOM", 183, 183)], [self.enemy("VANTOM", 93, 183)]]
        clock = {"boss": "VANTOM", "deck": 20, "deck_at_turns": 18, "need": 26, "gap": 6, "fight_turns": 7, "survivable_turns": 8, "loss_per_turn": 8}
        row = cal.boss_row(fight, clock, frames, {"ascension": 9})
        self.assertEqual((row["dealt"], row["realised"], row["ratio"], row["ratio_at_turns"]), (90, 15.0, 0.75, 15 / 18))
        # Lost: all 60 HP in 6 turns (10 a turn against 8); it survived 6 turns, the clock said 8.
        self.assertEqual((row["loss_actual"], row["loss_ratio"], row["survive_actual"], row["survive_err"], row["enough"]), (10.0, 1.25, 6, 2, False))
        won = cal.boss_row(dict(fight, outcome="won", last_hp=40, post_hp=46), dict(clock, gap=0), frames, {"ascension": 9})
        self.assertEqual((won["dealt"], won["loss_actual"], won["survive_actual"], won["survive_err"], won["enough"]), (183, 20 / 6, None, None, True))
        self.assertEqual(cal.boss_row(fight, {"key": "R#9", "error": "no clock for this boss id"}, frames, {"ascension": 9})["clock_error"], "no clock for this boss id")


class SummaryTest(unittest.TestCase):
    def test_stats(self):
        s = cal.error_stats([0, 0, 1, -3, 5, 2])
        self.assertEqual((s["n"], s["median"], s["within"], s["over"], s["under"]), (6, 0.5, 4 / 6, 1 / 6, 1 / 6))
        self.assertAlmostEqual(s["p90"], 3.5)
        self.assertEqual(cal.error_stats([])["n"], 0)
        self.assertAlmostEqual(cal.quantile([1, 2, 3, 4], 0.1), 1.3)
        r = cal.ratio_stats([0.5, 1.0, 2.0, None, 0])
        self.assertEqual((r["n"], r["median"]), (3, 1.0))
        self.assertAlmostEqual(r["geo_mean"], 1.0)

    def test_sections_by_ascension_act_and_version(self):
        rows = [{"run_id": "A", "ascension": 9, "act": 1, "x": 1}, {"run_id": "A", "ascension": 9, "act": 2, "x": 2},
                {"run_id": "B", "ascension": 9, "act": 1, "x": 3}, {"run_id": "C", "ascension": 8, "act": 1, "x": 4}]
        out = cal.sections(rows, {"A": "V3", "B": "V3.oneshot", "C": "V3"}, ["V3", "V3.oneshot"])
        self.assertEqual([(label, [r["x"] for r in part]) for label, part in out],
                         [("A8 全部", [4]), ("A8 一幕", [4]), ("A8 V3", [4]),
                          ("A9 全部", [1, 2, 3]), ("A9 一幕", [1, 3]), ("A9 二幕", [2]), ("A9 V3", [1, 2]), ("A9 V3.oneshot", [3])])

    def test_route_summaries_leave_out_the_first_node_and_the_metrics_digest(self):
        nodes = [{"run_id": "R", "plan_floor": 1, "label": "p", "distance": d, "err": e, "pred": 50, "actual": 50 - e, "died_before": False}
                 for d, e in ((1, 0), (2, 4), (3, -2), (5, 10))]
        s = cal.route_summary(nodes)
        self.assertEqual((s["arrival"]["n"], s["near"]["n"], s["near"]["median"]), (3, 2, 1.0))
        data = {"rollout": [{"run_id": "R", "err_turn": e} for e in (0, 1, -3, 2.5)], "route": nodes, "boss": [{"run_id": "R", "ratio": 0.8}, {"run_id": "S", "ratio": 1.2}]}
        self.assertEqual(cal.run_digest(data, "R"), {"turns": 4, "turns_within": 2, "route_near": [4, -2], "boss_ratio": [0.8]})


@NEEDS_DUCKDB
class FixtureTest(unittest.TestCase):
    """tests/calibration-data through sync, the views, the raw lines and the report."""

    @classmethod
    def setUpClass(cls):
        import query as logquery
        import sync as logsync

        cls.tmp = tempfile.mkdtemp(prefix="calibration-test-")
        cls.db = os.path.join(cls.tmp, "db")
        logsync.sync(DATA, cls.db, quiet=True)
        cls.con = logquery.connect(cls.db)
        cls.runs = cal.load_runs(cls.con)
        cls.data = cal.collect(cls.con, cls.runs, DATA, clocks=cal.load_clock_file(os.path.join(DATA, "boss-clocks.jsonl")))

    @classmethod
    def tearDownClass(cls):
        cls.con.close()
        shutil.rmtree(cls.tmp, ignore_errors=True)

    def test_turns(self):
        rows = {(r["run_id"][:5], r["floor"], r["turn"]): r for r in self.data["rollout"]}
        self.assertEqual(self.data["coverage"]["rollout"], {"turns": 10, "rows": 9, "dropped": {"code-fallback": 1}})
        # F2 T1: 64 -> 59 on turn 2; the fight ended at 57 (the reward's 63 is Burning Blood): window and end 7 against 9.
        first = rows[("RUNE0", 2, 1)]
        self.assertEqual((first["err_turn"], first["pred_window"], first["actual_window"], first["pred_end"], first["actual_end"]), (0.0, 9.0, 7, 9.0, 7))
        # F2 T2 was re-planned: its last decision (plan1, 2) is the one that counts, not the HP guard's.
        self.assertEqual((rows[("RUNE0", 2, 2)]["pred_turn"], rows[("RUNE0", 2, 2)]["actual_turn"], rows[("RUNE0", 2, 2)]["replanned"]), (2.0, 2, True))
        self.assertEqual(rows[("RUNE0", 3, 2)]["err_turn"], -5.0)
        # The boss turns, and the act-2 death (all 56 HP against 10).
        self.assertEqual([rows[("RUNE0", 5, t)]["actual_turn"] for t in (1, 2)], [7, 7])
        self.assertEqual((rows[("RUNE0", 6, 1)]["actual_turn"], rows[("RUNE0", 6, 1)]["err_turn"]), (56, -46.0))
        # The escalation's line (plan2, 4), not Jev's (plan1, 3).
        self.assertEqual((rows[("RUNF0", 2, 1)]["how"], rows[("RUNF0", 2, 1)]["pred_turn"], rows[("RUNF0", 2, 1)]["err_turn"]), ("escalation", 4.0, 0.0))
        self.assertEqual({r["ascension"] for r in self.data["rollout"] if r["run_id"].startswith("RUNF")}, {8})

    def test_route_nodes(self):
        got = [(n["run_id"][:5], n["floor"], n["distance"], n["type"], n["pred"], n["actual"], n["died_before"]) for n in self.data["route"]]
        self.assertEqual(got, [("RUNE0", 2, 1, "Monster", 64.0, 64, False), ("RUNE0", 3, 2, "Monster", 60.0, 63, False), ("RUNE0", 4, 3, "RestSite", 56.0, 40, False),
                               ("RUNE0", 5, 4, "Boss", 80.0, 64, False), ("RUNF0", 2, 1, "Monster", 80.0, 80, False), ("RUNF0", 3, 2, "Elite", 76.0, 80, False),
                               ("RUNF0", 4, 3, "RestSite", 48.0, 0, True)])
        rooms = [(r["run_id"][:5], r["type"], r["pred_cost"], r["actual_cost"]) for r in self.data["rooms"]]
        self.assertEqual(rooms, [("RUNE0", "Monster", 4.0, 1), ("RUNE0", "Monster", 4.0, 23), ("RUNE0", "RestSite", -24.0, -24), ("RUNF0", "Monster", 4.0, 0), ("RUNF0", "Elite", 28.0, 80)])
        self.assertEqual(self.data["coverage"]["route"]["plans"], 2)

    def test_boss_fight(self):
        (boss,) = self.data["boss"]
        self.assertEqual((boss["run_id"], boss["fight_no"], boss["won"], boss["turns"], boss["dealt"], boss["realised"], boss["ratio"], boss["loss_actual"], boss["loss_ratio"]),
                         ("RUNE00000005", 3, True, 2, 183, 91.5, 1.5, 7.0, 0.875))

    def test_boss_clock_inputs_come_from_the_fights_first_state(self):
        seen = []

        def fake(inputs, game_data=None):
            seen.extend(inputs)
            return {i["key"]: {"key": i["key"], "boss": "VANTOM", "deck": 30, "gap": 0, "loss_per_turn": 7, "survivable_turns": 9} for i in inputs}

        real, cal.recompute_clocks = cal.recompute_clocks, fake
        try:
            rows, coverage = cal.collect_boss(self.con, self.runs, DATA)
        finally:
            cal.recompute_clocks = real
        self.assertEqual([(i["key"], i["entry_hp"], i["turns"], i["state"]["run"]["boss_id"], i["state"]["combat"]["enemies"][0]["current_hp"]) for i in seen],
                         [("RUNE00000005#3", 64, 2, "VANTOM_BOSS", 183)])
        self.assertNotIn("agent_view", seen[0]["state"])
        self.assertEqual((rows[0]["ratio"], coverage["clocks"]), (91.5 / 30, 1))

    def test_cli_and_the_metrics_columns(self):
        import metrics

        args = ["--db", self.db, "--logs", DATA, "--no-sync", "--boss-clocks", os.path.join(DATA, "boss-clocks.jsonl"), "--group-by", "commit"]
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(cal.main(args + ["--json", "--rows"]), 0)
        data = json.loads(out.getvalue())
        self.assertEqual(data["groups"], {"17ac095": ["RUNE00000005"], "0c93138": ["RUNF00000006"]})
        labels = [s[0] for s in data["summary"]["rollout"]["sections"]]
        self.assertEqual(labels, ["A8 全部", "A8 一幕", "A8 0c93138", "A9 全部", "A9 一幕", "A9 二幕", "A9 17ac095"])
        self.assertEqual(len(data["rows"]["rollout"]), 9)
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(cal.main(args + ["--md", "--ascension", "9"]), 0)
        text = out.getvalue()
        for part in ("## 1. 推演", "## 2. 路线投影", "## 3. boss 时钟", "| A9 17ac095 |", "RUNE00000005", "中位 \\|误差\\|"):
            self.assertIn(part, text)
        self.assertNotIn("RUNF00000006", text)
        # By configuration (version + brain setup, metrics.py): these runs have no run-config rows.
        if None not in metrics.Git().resolve(["17ac095", "0c93138"]).values():
            out = io.StringIO()
            with contextlib.redirect_stdout(out):
                self.assertEqual(cal.main(args[:-2] + ["--group-by", "config", "--json", "--no-boss"]), 0)
            self.assertEqual(json.loads(out.getvalue())["groups"], {"V3 · 未记录配置": ["RUNE00000005"], "V3.oneshot · 未记录配置": ["RUNF00000006"]})
        # The metrics table carries the three calibration rows (and leaves them out on request).
        margs = ["--db", self.db, "--logs", DATA, "--no-sync", "--strength-sets", os.path.join(ROOT, "agent", "tests", "eval-data", "strength-sets.json"),
                 "--boss-clocks", os.path.join(DATA, "boss-clocks.jsonl"), "--group-by", "ascension", "--md"]
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(metrics.main(margs), 0)
        text = out.getvalue()
        # A8: 3 turns all within 2; A9: 4 of 6 (not F3 T2's -5 nor the act-2 death).
        self.assertIn("| 校准：推演本回合掉血 ±2 内（回合） | 100%（3/3 回合） | 67%（4/6 回合） |", text)
        self.assertIn("| 校准：路线投影 2–3 层误差（投影 − 实际） | 中位 +22.0，中位 \\|误差\\| 26.0（n=2） * | 中位 +6.5，中位 \\|误差\\| 9.5（n=2） * |", text)
        self.assertIn("| 校准：boss 时钟 实打/估值 中位 | — | 1.50（n=1 场） * |", text)
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(metrics.main(margs + ["--no-calibration"]), 0)
        self.assertIn("| 校准：boss 时钟 实打/估值 中位 | — | — |", out.getvalue())


if __name__ == "__main__":
    unittest.main()
