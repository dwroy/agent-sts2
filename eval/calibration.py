#!/usr/bin/env python3
"""Predictions against what happened (docs/eval.md section 7; V4 architecture section 1, the "eye": how far the
predictions are from the actual outcome). Measurement only: no prediction algorithm is changed or re-tuned here.

Three predictions, each aligned with what the logs say happened, grouped by ascension, act and code version:

  1. Rollout (combat). For the line that was played (the answer's choice; an escalation's choice; the line an HP
     guard or a dominance swap played instead, as the rationale names it), taken from the question's criteria:
     - this turn: the turn solver's exact `hp_lost` against the HP at the decision's frame minus the HP at the next
       turn's first frame (the HP the fight ended with when it ended that turn: fight_end_hp; 0 when the run died);
     - the rollout window: T1 plus the rollout's later turns (`rollout_turns`: each turn's mean loss over the samples
       still fighting, weighted by their share) against the HP lost over the same turns;
     - to the fight's end: the rollout's "expected further HP loss" (the horizon plus the model terminal after it)
       against the HP lost from the decision to the fight's end.
     One decision per turn: the last plan choice of the turn (its line ran to the end of the turn); a turn that was
     re-planned is flagged.
  2. Route projection. Every logged route plan (decisions.jsonl `route_plan`: map/route-plan, event/act-plan,
     map/route-change) projects the HP on arrival at each node of its path (`hpOnArrival` x max HP then). While the
     run followed the plan node by node, the projection is set against the HP the run entered the node with
     (floors.entry_hp); the next node after the room the run died in counts as 0. By distance in floors from the
     plan, by node type, and each room's own projected cost against its actual cost.
  3. Boss clock. Per boss fight: the clock's deck damage a turn and HP loss a turn / survivable turns (not logged:
     recomputed with the unchanged agent/src/sim/boss-clock.ts on the fight's first combat state and the HP it was
     entered with, eval/boss-clock-recompute.ts) against the HP the boss's own bodies lost a turn (the measure
     the clock's estimate was fitted on, agent/tools/boss-fights-extract.py) and the HP the fight cost a turn; wins and
     losses apart.

Errors are predicted minus actual, in HP: positive = the prediction said more HP lost (rollout) or more HP on
arrival (route) than happened. Runs: finished runs (runs.jsonl) with frames, as eval/metrics.py.

Usage (the log database's Python: data/logdb-venv/bin/python):
  eval/calibration.py [--ascension 9] [--since ...] [--until ...] [--group-by version|family|config|commit|day]
                            [--md | --json] [--rows] [--top 10] [--min-n 10] [--no-sync] [--no-boss]
                            [--boss-clocks FILE] [--game-data FILE]
"""
import argparse
import datetime as dt
import json
import math
import os
import re
import statistics
import subprocess
import sys
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = str(Path(__file__).resolve().parents[1])  # the project root (docs/layout.md)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, "agent", "tools", "logdb"))

import extract  # noqa: E402  (stdlib only)
import metrics  # noqa: E402  (versions, grouping, runs; no duckdb at import)

NEAR = 2  # HP: "within +-2"
ROUTE_NEAR_FLOORS = 3  # the metrics column: route projections 2..3 floors ahead
# A plan's first node is where the run goes next: its projection is the HP at the plan (not a forecast). The route
# summaries count the nodes from this distance on; the distance table shows the first one as a check.
ROUTE_FROM = 2
TOP = 10
MIN_N = 10
ENCOUNTER_MIN_N = 5
# An enemy whose max HP is above this is a state marker, not HP (the Waterfall Giant after its kill: 999999999).
SENTINEL_HP = 100000
ACT_NAMES = {1: "一幕", 2: "二幕", 3: "三幕", 4: "四幕"}
ROOM_NAMES = {"Monster": "走廊", "Elite": "精英", "Unknown": "问号", "RestSite": "休息", "Shop": "商店", "Treasure": "宝箱",
              "Boss": "boss", "Ancient": "先古"}
ROOM_ORDER = ["Monster", "Elite", "Unknown", "RestSite", "Shop", "Treasure", "Boss"]
DISTANCE_BUCKETS = [(1, 1, "1"), (2, 2, "2"), (3, 3, "3"), (4, 5, "4–5"), (6, 8, "6–8"), (9, 12, "9–12"), (13, 10**6, "13+")]


# ---------------------------------------------------------------- statistics


def quantile(values, q):
    """Linear-interpolated quantile (DuckDB quantile_cont), None for no values."""
    xs = sorted(float(v) for v in values if v is not None)
    if not xs:
        return None
    pos = (len(xs) - 1) * q
    lo, hi = math.floor(pos), math.ceil(pos)
    return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)


def error_stats(errors, near=NEAR):
    """{n, median, mean, p10, p90, median_abs, mean_abs, within, over, under} of errors (predicted - actual):
    within = share with |error| <= near; over = share above +near (predicted more); under = below -near."""
    xs = [float(e) for e in errors if e is not None]
    n = len(xs)
    if n == 0:
        return {"n": 0, "median": None, "mean": None, "p10": None, "p90": None, "median_abs": None, "mean_abs": None,
                "within": None, "over": None, "under": None}
    return {
        "n": n,
        "median": quantile(xs, 0.5),
        "mean": statistics.fmean(xs),
        "p10": quantile(xs, 0.1),
        "p90": quantile(xs, 0.9),
        "median_abs": quantile([abs(x) for x in xs], 0.5),
        "mean_abs": statistics.fmean(abs(x) for x in xs),
        "within": sum(abs(x) <= near for x in xs) / n,
        "over": sum(x > near for x in xs) / n,
        "under": sum(x < -near for x in xs) / n,
    }


def ratio_stats(ratios):
    """{n, median, p10, p90, geo_mean} of positive ratios (actual / estimate)."""
    xs = [float(r) for r in ratios if r is not None and r > 0]
    if not xs:
        return {"n": 0, "median": None, "p10": None, "p90": None, "geo_mean": None}
    return {"n": len(xs), "median": quantile(xs, 0.5), "p10": quantile(xs, 0.1), "p90": quantile(xs, 0.9),
            "geo_mean": math.exp(statistics.fmean(math.log(x) for x in xs))}


# ---------------------------------------------------------------- 1. rollout: the logged facts of a line

NUM = r"-?\d+(?:\.\d+)?"
FURTHER_RE = re.compile(rf"expected further HP loss ({NUM})")
HORIZON_RE = re.compile(r"(\d+)-turn (rollout|estimate)")
SAMPLES_RE = re.compile(r"\((\d+) samples?\)")
MEDIAN_PREFIX = "the median sample's line: "
T1_RE = re.compile(rf"^T1 exact: hp -({NUM}), dmg {NUM}(?:, (won|dead|revived at {NUM} HP))?$")
TK_RE = re.compile(rf"^T(\d+): hp -({NUM}) \[{NUM}-{NUM}\], dmg .*?, alive (\d+)/(\d+), won (\d+)/(\d+)$")
TK_OVER_RE = re.compile(r"^T(\d+): over \(alive (\d+)/(\d+), won (\d+)/(\d+)\)$")
GUARD_RE = re.compile(r"; HP guard: plan \d+ .*? playing plan (\d+) \(")
DOMINATOR_RE = re.compile(r"; plan (\d+) \(.*?\) is as good or better on every axis, playing it")


def loss_number(value):
    """A line's hp_lost: a number, or a random potion line's distribution ("mean 4.7 [3-7]": its mean)."""
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        match = re.match(rf"\s*mean ({NUM})", value)
        if match:
            return float(match.group(1))
        try:
            return float(value)
        except ValueError:
            return None
    return None


def line_facts(criteria):
    """The prediction facts of one option (its criteria: a JSON string or a dict): hp_lost this turn, the rollout's
    expected further HP loss, its horizon and samples, whether it is the time-budget fallback (not a forecast), and
    the per-turn text. None when unparsable."""
    try:
        facts = json.loads(criteria) if isinstance(criteria, str) else criteria
    except ValueError:
        return None
    if not isinstance(facts, dict):
        return None
    out = {"hp_lost": loss_number(facts.get("hp_lost")), "further": None, "horizon": None, "samples": None, "fallback": False, "turns": None}
    rollout = facts.get("rollout")
    if isinstance(rollout, str):
        text = rollout[len(MEDIAN_PREFIX):] if rollout.startswith(MEDIAN_PREFIX) else rollout
        if text.startswith("no rollout"):
            out["fallback"] = True
        elif not text.startswith(("not rolled out", "rollout unavailable")):
            further = FURTHER_RE.search(text)
            horizon = HORIZON_RE.match(text)
            samples = SAMPLES_RE.search(text)
            out["further"] = float(further.group(1)) if further else None
            out["horizon"] = int(horizon.group(1)) if horizon else None
            out["samples"] = int(samples.group(1)) if samples else (1 if horizon else None)
    turns = facts.get("rollout_turns")
    if isinstance(turns, str) and not out["fallback"]:
        out["turns"] = turns
    return out


def expected_cumulative(turns_text):
    """[expected HP lost through turn 1, through turn 2, ...] from a rollout's per-turn text ("T1 exact: hp -24, dmg 54;
    T2: hp -6.4 [0-14], dmg 18.4 [0-35], alive 8/8, won 0/8; ...; T5: over (alive 8/8, won 8/8)"). Turn k's mean is
    over the samples still fighting it, so it counts with their share: after T1, all samples unless T1 won or died;
    after turn k, the samples alive and not won at its end. Stops at the first part it cannot read; None when T1
    cannot be read."""
    if not isinstance(turns_text, str):
        return None
    parts = [part.strip() for part in turns_text.split("; ")]
    first = T1_RE.match(parts[0]) if parts else None
    if not first:
        return None
    total = float(first.group(1))
    out = [total]
    fighting = None if first.group(2) not in ("won", "dead") else 0.0  # None: every sample (their count is on T2)
    for part in parts[1:]:
        match = TK_RE.match(part)
        if match:
            turn, mean, alive, samples, won = int(match.group(1)), float(match.group(2)), int(match.group(3)), int(match.group(4)), int(match.group(5))
        else:
            match = TK_OVER_RE.match(part)
            if not match:
                break
            turn, mean, alive, samples, won = int(match.group(1)), 0.0, int(match.group(2)), int(match.group(3)), int(match.group(4))
        if turn != len(out) + 1 or samples <= 0:
            break
        share = (samples if fighting is None else fighting) / samples
        total += mean * share
        out.append(total)
        fighting = float(max(0, alive - won))
    return out


def executed_key(record):
    """(option key, how) of the line a plan-choice decision played: the HP guard's or the dominance swap's line when
    the rationale names one, else an escalation's choice, else the answer's choice. (None, "code-fallback") when code
    played its own best line (the rationale does not name its key)."""
    rationale = record.get("rationale") or ""
    if record.get("decider") == "code-fallback" or "using the code-best plan" in rationale:
        return None, "code-fallback"
    guard = GUARD_RE.search(rationale)
    if guard:
        return f"plan{guard.group(1)}", "hp-guard"
    dominator = DOMINATOR_RE.search(rationale)
    if dominator:
        return f"plan{dominator.group(1)}", "dominator"
    escalation = record.get("escalation")
    if isinstance(escalation, dict):
        choice = escalation.get("used_choice") or escalation.get("choice") or escalation.get("deepseek_choice")
        if isinstance(choice, str):
            return choice, "escalation"
    answers = record.get("answers") if isinstance(record.get("answers"), dict) else {}
    answer = answers.get("plan") if isinstance(answers.get("plan"), dict) else {}
    choice = answer.get("choice")
    return (choice, "answer") if isinstance(choice, str) else (None, "no-answer")


def fight_end_hp(fight):
    """The HP a fight ended with: 0 when the run died in it; else its last combat frame's HP, or the first frame after
    the fight when that is lower (damage when the last enemy dies, the Waterfall Giant's eruption, shows only there;
    a higher one is Burning Blood's heal after the fight, which no prediction counts)."""
    if fight.get("outcome") == "died":
        return 0
    last, post = fight.get("last_hp"), fight.get("post_hp")
    if last is None:
        return None
    return min(last, post) if post is not None else last


def actual_losses(hp, turn, starts, end, upto):
    """([loss through turn `turn + k - 1` for k = 1..upto], loss to the fight's end), from the decision's HP `hp`:
    hp minus the HP at the first frame of turn `turn + k` ({turn: HP} in `starts`); once the fight is over, minus
    the HP it ended with (`end`, fight_end_hp). A k whose next turn has no frame while a later one has (a gap in
    the log) is None."""
    if hp is None or end is None:
        return [None] * upto, None
    last_turn = max(starts) if starts else turn
    out = []
    for k in range(1, upto + 1):
        start = starts.get(turn + k)
        if start is not None:
            out.append(hp - start)
        else:
            out.append(None if turn + k <= last_turn else hp - end)
    return out, hp - end


def turn_row(record, frame, fight, starts, decisions_in_turn):
    """The rollout row of one turn (its last plan choice `record` at `frame` {hp, turn}), or (None, reason)."""
    key, how = executed_key(record)
    if key is None:
        return None, how
    questions = record.get("questions") if isinstance(record.get("questions"), dict) else {}
    criteria = ((questions.get("plan") or {}).get("criteria") or {}) if isinstance(questions.get("plan"), dict) else {}
    facts = line_facts(criteria.get(key)) if key in criteria else None
    if facts is None or facts["hp_lost"] is None:
        return None, "no hp_lost on the played line"
    if fight.get("outcome") not in ("won", "died"):
        return None, "fight outcome unknown"
    horizon = facts["horizon"] or 1
    cumulative = expected_cumulative(facts["turns"]) if horizon >= 2 else None
    upto = max(horizon, len(cumulative or []), 1)
    actual, to_end = actual_losses(frame["hp"], frame["turn"], starts, fight_end_hp(fight), upto)
    if actual[0] is None:
        return None, "next turn missing"
    window = cumulative is not None and len(cumulative) == horizon and actual[horizon - 1] is not None
    row = {
        "run_id": fight["run_id"], "ascension": fight.get("ascension"), "act": fight.get("act"), "floor": fight.get("floor"),
        "fight_no": fight["fight_no"], "turn": frame["turn"], "encounter": fight.get("encounter"), "room": fight.get("room"),
        "outcome": fight.get("outcome"), "decider": record.get("decider"), "how": how, "key": key, "label": record.get("label"),
        "replanned": decisions_in_turn > 1, "hp": frame["hp"],
        "pred_turn": facts["hp_lost"], "actual_turn": actual[0], "err_turn": facts["hp_lost"] - actual[0],
        "horizon": facts["horizon"], "samples": facts["samples"], "fallback": facts["fallback"],
        "pred_cum": cumulative, "actual_cum": actual[:len(cumulative)] if cumulative else None,
        "pred_window": cumulative[horizon - 1] if window else None, "actual_window": actual[horizon - 1] if window else None,
        "pred_end": facts["further"], "actual_end": to_end,
    }
    row["err_window"] = row["pred_window"] - row["actual_window"] if window else None
    row["err_end"] = row["pred_end"] - to_end if row["pred_end"] is not None and to_end is not None else None
    return row, None


# ---------------------------------------------------------------- 2. route projection


def distance_bucket(distance):
    for lo, hi, name in DISTANCE_BUCKETS:
        if lo <= distance <= hi:
            return name
    return "0"


def align_plan(plan, visits, floors, run):
    """(node rows, room rows) of one route plan {run_id, act, floor, max_hp, label, path: [{row, col, type,
    hpOnArrival}]}: its nodes the run reached while following it node by node (step i on floor plan floor + 1 + i,
    `visits` {(act, row, col): floor}), each with the projected HP (hpOnArrival x the max HP at the plan) and the HP
    the run entered it with (`floors` {floor: {entry_hp}}); when the run died in the last room it reached on the
    path, the next node of the path counts as 0 HP (died_before). Room rows: each room between two such nodes, its
    projected cost (projection drop) against its actual cost."""
    nodes = []
    start = plan["floor"]
    for step_no, step in enumerate(plan["path"]):
        want = start + 1 + step_no
        pred = step["hpOnArrival"] * plan["max_hp"]
        floor = visits.get((plan["act"], step["row"], step["col"]))
        entry = floors.get(floor) if floor == want else None
        if entry is None or entry.get("entry_hp") is None:
            last = nodes[-1] if nodes else None
            died_there = last is not None and not run.get("victory") and run.get("floor") == last["floor"]
            if died_there:
                nodes.append({"step": step_no, "floor": want, "distance": want - start, "type": step["type"], "pred": pred,
                              "actual": 0, "died_before": True})
            break
        nodes.append({"step": step_no, "floor": floor, "distance": floor - start, "type": step["type"], "pred": pred,
                      "actual": entry["entry_hp"], "died_before": False})
    base = {"run_id": plan["run_id"], "act": plan["act"], "plan_floor": start, "label": plan["label"], "ascension": run.get("ascension")}
    node_rows = [dict(base, **node, err=node["pred"] - node["actual"]) for node in nodes]
    room_rows = []
    for here, there in zip(node_rows, node_rows[1:]):
        pred_cost, actual_cost = here["pred"] - there["pred"], here["actual"] - there["actual"]
        room_rows.append(dict(base, floor=here["floor"], type=here["type"], pred_cost=pred_cost, actual_cost=actual_cost,
                              err=pred_cost - actual_cost, died=there["died_before"]))
    return node_rows, room_rows


def plan_from_record(record, decision):
    """The route plan a decision logged ({run_id, act, floor, max_hp, label, path}), or None."""
    plan = record.get("route_plan")
    if not isinstance(plan, dict) or not isinstance(plan.get("path"), list) or not plan["path"]:
        return None
    floor = plan.get("floor") if isinstance(plan.get("floor"), int) else decision.get("floor")
    max_hp = decision.get("max_hp")
    if floor is None or not max_hp or not isinstance(plan.get("act"), int):
        return None
    path = [s for s in plan["path"] if isinstance(s, dict) and all(isinstance(s.get(k), (int, float)) for k in ("row", "col", "hpOnArrival"))]
    if len(path) != len(plan["path"]):
        return None
    return {"run_id": decision["run_id"], "act": plan["act"], "floor": floor, "max_hp": max_hp, "label": decision.get("label"),
            "hp_pct": plan.get("hpPct"), "path": path, "off": decision.get("off")}


# ---------------------------------------------------------------- 3. boss clock


def _enemy_hp(enemy):
    """An enemy's HP on a frame: 0 when it is missing, dead, or its max HP is a state marker (the Waterfall Giant
    after its kill: 999999999)."""
    if enemy is None or not enemy.get("alive") or (enemy.get("max_hp") or 0) > SENTINEL_HP:
        return 0
    return max(0, enemy.get("hp") or 0)


def boss_damage(frames, won):
    """HP the boss's own bodies lost, as tools/boss-fights-extract.py counts it (the clock's deck estimate is fitted
    on that, tools/boss-clock-calibrate.ts): the bodies are the non-minion enemies of the fight's first frame (the
    Kin's priest, the Queen, both Kaiser Crab claws; followers and the Amalgam are minions); a won fight took their
    whole max HP (the killing blow comes after the last logged frame); a lost one their max HP minus the lowest HP
    they had together on any frame. Heals and revives are not added. None without frames."""
    if not frames:
        return None
    bodies = [(e.get("idx"), e.get("id")) for e in frames[0] or [] if not e.get("minion")]
    if not bodies:
        return None
    first = {(e.get("idx"), e.get("id")): e for e in frames[0]}
    max_hp = sum(first[b].get("max_hp") or 0 for b in bodies if (first[b].get("max_hp") or 0) <= SENTINEL_HP)
    if won:
        return max_hp
    lowest = min(sum(_enemy_hp({(e.get("idx"), e.get("id")): e for e in enemies or []}.get(b)) for b in bodies) for enemies in frames)
    return max(0, max_hp - lowest)


def boss_row(fight, clock, frames, run):
    """One boss fight's clock against what happened."""
    won = fight.get("outcome") == "won"
    turns = fight.get("turns") or 0
    dealt = boss_damage(frames, won)
    realised = dealt / turns if turns and dealt is not None else None
    end_hp = fight_end_hp(fight)
    loss = (fight["entry_hp"] - end_hp) / turns if turns and fight.get("entry_hp") is not None and end_hp is not None else None
    row = {
        "run_id": fight["run_id"], "ascension": run.get("ascension"), "act": fight["act"], "floor": fight["floor"],
        "fight_no": fight["fight_no"], "encounter": fight.get("encounter"), "outcome": fight.get("outcome"), "won": won,
        "inferred": bool(fight.get("inferred")), "entry_hp": fight.get("entry_hp"), "last_hp": fight.get("last_hp"), "turns": turns,
        "dealt": dealt, "realised": realised, "loss_actual": loss,
    }
    if not clock or clock.get("error"):
        row["clock_error"] = (clock or {}).get("error", "no clock")
        return row
    est, est_turns = clock.get("deck"), clock.get("deck_at_turns")
    row.update({
        "boss": clock.get("boss"), "est": est, "est_at_turns": est_turns, "need": clock.get("need"), "gap": clock.get("gap"),
        "enough": clock.get("gap") == 0, "clock_turns": clock.get("fight_turns"), "boss_hp": clock.get("hp"),
        "ratio": realised / est if realised is not None and est else None,
        "ratio_at_turns": realised / est_turns if realised is not None and est_turns else None,
        "loss_est": clock.get("loss_per_turn"), "survive_est": clock.get("survivable_turns"),
        "loss_ratio": loss / clock["loss_per_turn"] if loss is not None and clock.get("loss_per_turn") else None,
        # Survivable turns are seen only when the run died in the fight (a won fight ended before them).
        "survive_actual": turns if not won else None,
    })
    row["survive_err"] = row["survive_est"] - turns if not won and row["survive_est"] is not None else None
    return row


def recompute_clocks(inputs, game_data=None):
    """{key: clock row} from eval/boss-clock-recompute.ts over [{key, entry_hp, turns, state}]."""
    if not inputs:
        return {}
    env = dict(os.environ, PATH=os.path.expanduser("~/.local/node/bin") + os.pathsep + os.environ.get("PATH", ""))
    tsx = os.path.join(ROOT, "agent", "node_modules", ".bin", "tsx")
    args = [tsx, os.path.join(HERE, "boss-clock-recompute.ts")] + ([game_data] if game_data else [])
    payload = "".join(json.dumps(item, ensure_ascii=False) + "\n" for item in inputs)
    done = subprocess.run(args, cwd=ROOT, env=env, input=payload, capture_output=True, text=True, check=False)
    if done.returncode != 0:
        raise RuntimeError(f"eval/boss-clock-recompute.ts failed: {done.stderr.strip()[:500]}")
    out = {}
    for line in done.stdout.splitlines():
        if line.strip():
            row = json.loads(line)
            out[row.get("key")] = row
    return out


def load_clock_file(path):
    """{key: clock row} from a JSONL file of boss-clock-recompute.ts output (tests; re-runs)."""
    out = {}
    with open(path, encoding="utf8") as handle:
        for line in handle:
            if line.strip():
                row = json.loads(line)
                out[row.get("key")] = row
    return out


# ---------------------------------------------------------------- database

PLAN_CHOICES_SQL = """
SELECT d.off, d.len, d.run_id, ff.fight_no, ff.turn, coalesce(ff.player_hp, ff.hp) AS hp
FROM decisions d
JOIN fight_frames ff ON ff.run_id = d.run_id AND ff.ts = d.ts AND ff.is_combat
WHERE d.label LIKE 'combat/plan-choice%' AND list_contains(?, d.run_id)
ORDER BY d.off
"""
TURN_STARTS_SQL = "SELECT run_id, fight_no, turn, start_hp FROM turns WHERE list_contains(?, run_id)"
FIGHTS_SQL = """
SELECT run_id, fight_no, ascension, act, floor, encounter, room, outcome, entry_hp, last_hp, post_hp, turns, first_off, last_off
FROM fights WHERE list_contains(?, run_id)
"""
ROUTE_DECISIONS_SQL = """
SELECT off, len, run_id, floor, label, max_hp FROM decisions
WHERE list_contains(?, run_id) AND (label LIKE '%route%' OR label LIKE '%act-plan%')
ORDER BY off
"""
MAP_CHOICES_SQL = """
SELECT d.run_id, f.act, f.floor, list_filter(f.map_avail, n -> n.idx = d.option_index)[1] AS node, d.off
FROM decisions d
JOIN frames f ON f.ts = d.ts AND f.run_id = d.run_id AND f.screen = 'MAP'
WHERE d.action = 'choose_map_node' AND list_contains(?, d.run_id)
ORDER BY d.off
"""
FLOORS_SQL = "SELECT run_id, floor, act, room_node, entry_hp, entry_max_hp FROM floors WHERE list_contains(?, run_id)"
BOSS_FRAMES_SQL = """
WITH s AS (SELECT unnest(?::VARCHAR[]) AS run_id, unnest(?::INTEGER[]) AS fight_no)
SELECT ff.run_id, ff.fight_no, ff.off, ff.enemies
FROM s JOIN fight_frames ff ON ff.run_id = s.run_id AND ff.fight_no = s.fight_no AND ff.is_combat
ORDER BY ff.run_id, ff.fight_no, ff.off
"""
FRAME_LEN_SQL = "SELECT off, len FROM frames WHERE off IN (SELECT unnest(?::BIGINT[]))"


def read_lines(path, spans):
    """{off: raw bytes} for [(off, len)] of a JSONL file, read in file order (never the whole file)."""
    out = {}
    with open(path, "rb") as handle:
        for off, length in sorted(set(spans)):
            handle.seek(off)
            out[off] = handle.read(length)
    return out


def collect_rollout(con, run_ids, logs):
    rows, dropped = [], {}
    frames = metrics.dicts(con.execute(PLAN_CHOICES_SQL, [run_ids]))
    fights = {(f["run_id"], f["fight_no"]): f for f in metrics.dicts(con.execute(FIGHTS_SQL, [run_ids]))}
    starts = {}
    for t in metrics.dicts(con.execute(TURN_STARTS_SQL, [run_ids])):
        starts.setdefault((t["run_id"], t["fight_no"]), {})[t["turn"]] = t["start_hp"]
    by_turn = {}
    for frame in frames:
        if frame["turn"] is not None:
            by_turn.setdefault((frame["run_id"], frame["fight_no"], frame["turn"]), []).append(frame)
    last = {key: max(decs, key=lambda d: d["off"]) for key, decs in by_turn.items()}
    raw = read_lines(os.path.join(logs, "decisions.jsonl"), [(d["off"], d["len"]) for d in last.values()])
    for key, frame in sorted(last.items(), key=lambda item: item[1]["off"]):
        fight = fights.get((frame["run_id"], frame["fight_no"]))
        if fight is None:
            dropped["fight not found"] = dropped.get("fight not found", 0) + 1
            continue
        try:
            record = json.loads(raw[frame["off"]])
        except (ValueError, KeyError):
            dropped["unreadable decision"] = dropped.get("unreadable decision", 0) + 1
            continue
        row, why = turn_row(record, frame, fight, starts.get((frame["run_id"], frame["fight_no"]), {}), len(by_turn[key]))
        if row is None:
            dropped[why] = dropped.get(why, 0) + 1
            continue
        row["off"] = frame["off"]
        rows.append(row)
    return rows, {"turns": len(last), "rows": len(rows), "dropped": dropped}


def collect_route(con, runs_by_id, logs):
    run_ids = list(runs_by_id)
    decisions = metrics.dicts(con.execute(ROUTE_DECISIONS_SQL, [run_ids]))
    raw = read_lines(os.path.join(logs, "decisions.jsonl"), [(d["off"], d["len"]) for d in decisions])
    plans, seen = [], set()
    for decision in decisions:
        if b'"route_plan"' not in raw[decision["off"]]:
            continue
        try:
            plan = plan_from_record(json.loads(raw[decision["off"]]), decision)
        except ValueError:
            plan = None
        if plan is None:
            continue
        signature = (plan["run_id"], plan["act"], plan["floor"], tuple((s["row"], s["col"], round(s["hpOnArrival"], 4)) for s in plan["path"]))
        if signature in seen:
            continue
        seen.add(signature)
        plans.append(plan)
    visits = {}
    chosen = {}
    for choice in metrics.dicts(con.execute(MAP_CHOICES_SQL, [run_ids])):
        if choice["node"] is not None:
            chosen[(choice["run_id"], choice["floor"])] = choice  # the last choice on a floor wins (ORDER BY off)
    for (run_id, floor), choice in chosen.items():
        node = choice["node"]
        visits.setdefault(run_id, {})[(choice["act"], node["row"], node["col"])] = floor + 1
    floors = {}
    for f in metrics.dicts(con.execute(FLOORS_SQL, [run_ids])):
        floors.setdefault(f["run_id"], {})[f["floor"]] = f
    nodes, rooms = [], []
    for plan in plans:
        node_rows, room_rows = align_plan(plan, visits.get(plan["run_id"], {}), floors.get(plan["run_id"], {}), runs_by_id[plan["run_id"]])
        nodes += node_rows
        rooms += room_rows
    projected = sum(len(p["path"]) for p in plans)
    return nodes, rooms, {"plans": len(plans), "nodes_projected": projected, "nodes_reached": sum(not n["died_before"] for n in nodes),
                          "died_before": sum(n["died_before"] for n in nodes),
                          "plans_by_label": {label: sum(p["label"] == label for p in plans) for label in sorted({p["label"] for p in plans})}}


def collect_boss(con, runs, logs, clocks=None, game_data=None):
    """Boss rows for these runs. `clocks`: {key: clock row} (tests, --boss-clocks); else recomputed."""
    run_ids = [r["run_id"] for r in runs]
    by_run = {}
    for f in metrics.dicts(con.execute(FIGHTS_SQL, [run_ids])):
        by_run.setdefault(f["run_id"], []).append(f)
    bosses = []
    for run in runs:
        for fight in metrics.boss_fights(by_run.get(run["run_id"], []), run.get("max_act"), run.get("victory")).values():
            bosses.append((run, fight))
    if not bosses:
        return [], {"fights": 0}
    cols = [[fight["run_id"] for _, fight in bosses], [fight["fight_no"] for _, fight in bosses]]
    frames = {}
    for f in metrics.dicts(con.execute(BOSS_FRAMES_SQL, cols)):
        frames.setdefault((f["run_id"], f["fight_no"]), []).append(f["enemies"])
    key_of = lambda fight: f"{fight['run_id']}#{fight['fight_no']}"  # noqa: E731
    if clocks is None:
        lens = {r["off"]: r["len"] for r in metrics.dicts(con.execute(FRAME_LEN_SQL, [[fight["first_off"] for _, fight in bosses]]))}
        raw = read_lines(os.path.join(logs, "states.jsonl"), [(fight["first_off"], lens[fight["first_off"]]) for _, fight in bosses if fight["first_off"] in lens])
        inputs = []
        for _, fight in bosses:
            line = raw.get(fight["first_off"])
            if line is None:
                continue
            state = extract.parse_state_line(line).get("state")
            if isinstance(state, dict) and fight.get("entry_hp") is not None:
                inputs.append({"key": key_of(fight), "entry_hp": fight["entry_hp"], "turns": fight.get("turns"), "state": state})
        clocks = recompute_clocks(inputs, game_data)
    rows = [boss_row(fight, clocks.get(key_of(fight)), frames.get((fight["run_id"], fight["fight_no"]), []), run) for run, fight in bosses]
    return rows, {"fights": len(rows), "clocks": sum("clock_error" not in r for r in rows),
                  "clock_errors": sorted({r["clock_error"] for r in rows if "clock_error" in r})}


def load_runs(con, ascensions=None, since=None, until=None):
    """Finished runs with frames, as eval/metrics.py selects them."""
    return [r for r in metrics.dicts(con.execute(metrics.RUNS_SQL))
            if (not ascensions or r["ascension"] in ascensions) and (since is None or r["started"] >= since) and (until is None or r["started"] < until)]


def collect(con, runs, logs, boss=True, clocks=None, game_data=None):
    """Every prediction row for these runs: {"rollout", "route", "rooms", "boss", "coverage"}."""
    runs_by_id = {r["run_id"]: r for r in runs}
    run_ids = list(runs_by_id)
    out = {"rollout": [], "route": [], "rooms": [], "boss": [], "coverage": {}}
    if not run_ids:
        return out
    out["rollout"], out["coverage"]["rollout"] = collect_rollout(con, run_ids, logs)
    out["route"], out["rooms"], out["coverage"]["route"] = collect_route(con, runs_by_id, logs)
    if boss:
        out["boss"], out["coverage"]["boss"] = collect_boss(con, runs, logs, clocks, game_data)
    return out


# ---------------------------------------------------------------- summaries (per group)


def rollout_summary(rows):
    return {
        "turn": error_stats([r["err_turn"] for r in rows]),
        "turn_single": error_stats([r["err_turn"] for r in rows if not r["replanned"]]),
        "window": error_stats([r["err_window"] for r in rows]),
        "end": error_stats([r["err_end"] for r in rows]),
        "pred_turn": quantile([r["pred_turn"] for r in rows], 0.5), "actual_turn": quantile([r["actual_turn"] for r in rows], 0.5),
        "pred_window": quantile([r["pred_window"] for r in rows if r["err_window"] is not None], 0.5),
        "actual_window": quantile([r["actual_window"] for r in rows if r["err_window"] is not None], 0.5),
        "pred_end": quantile([r["pred_end"] for r in rows if r["err_end"] is not None], 0.5),
        "actual_end": quantile([r["actual_end"] for r in rows if r["err_end"] is not None], 0.5),
        "runs": len({r["run_id"] for r in rows}), "fights": len({(r["run_id"], r["fight_no"]) for r in rows}),
        "replanned": sum(r["replanned"] for r in rows),
    }


def route_summary(nodes):
    """Arrival errors of the nodes ROUTE_FROM floors or more ahead of their plan; near = up to ROUTE_NEAR_FLOORS."""
    nodes = [n for n in nodes if n["distance"] >= ROUTE_FROM]
    return {
        "arrival": error_stats([n["err"] for n in nodes]),
        "near": error_stats([n["err"] for n in nodes if n["distance"] <= ROUTE_NEAR_FLOORS]),
        "pred": quantile([n["pred"] for n in nodes], 0.5), "actual": quantile([n["actual"] for n in nodes], 0.5),
        "plans": len({(n["run_id"], n["plan_floor"], n["label"]) for n in nodes}), "runs": len({n["run_id"] for n in nodes}),
        "died_before": sum(n["died_before"] for n in nodes),
    }


def boss_summary(rows):
    clocked = [r for r in rows if "clock_error" not in r]
    return {
        "fights": len(rows), "clocked": len(clocked), "won": sum(r["won"] for r in clocked),
        "ratio": ratio_stats([r["ratio"] for r in clocked]),
        "ratio_at_turns": ratio_stats([r["ratio_at_turns"] for r in clocked]),
        "loss_ratio": ratio_stats([r["loss_ratio"] for r in clocked]),
        "est": quantile([r["est"] for r in clocked], 0.5), "realised": quantile([r["realised"] for r in clocked], 0.5),
        "loss_est": quantile([r["loss_est"] for r in clocked], 0.5), "loss_actual": quantile([r["loss_actual"] for r in clocked], 0.5),
        "survive": error_stats([r["survive_err"] for r in clocked], near=1),
        "enough": {"won": sum(r["enough"] for r in clocked if r["won"]), "lost": sum(r["enough"] for r in clocked if not r["won"])},
    }


def run_groups(runs, how, versions):
    """({run_id: group name}, [group names in order]) by code version (metrics.group_runs)."""
    groups = metrics.group_runs([dict(r) for r in runs], how, versions)
    return {r["run_id"]: name for name, rs in groups for r in rs}, [name for name, _ in groups]


def sections(rows, group_of, order):
    """[(label, rows)]: per ascension, all of them, then each act, then each code-version group."""
    out = []
    for asc in sorted({r["ascension"] for r in rows if r.get("ascension") is not None}):
        mine = [r for r in rows if r.get("ascension") == asc]
        out.append((f"A{asc} 全部", mine))
        for act in sorted({r["act"] for r in mine if r.get("act") is not None}):
            out.append((f"A{asc} {ACT_NAMES.get(act, f'act {act}')}", [r for r in mine if r.get("act") == act]))
        for name in order:
            part = [r for r in mine if group_of.get(r["run_id"]) == name]
            if part:
                out.append((f"A{asc} {name}", part))
    return out


def encounter_table(rows, err_key, top=TOP, min_n=ENCOUNTER_MIN_N):
    """Encounters (n >= min_n) by mean |error| of `err_key`, largest first."""
    by = {}
    for r in rows:
        if r.get(err_key) is not None:
            by.setdefault(r.get("encounter") or "?", []).append(r)
    table = []
    for encounter, part in by.items():
        if len(part) < min_n:
            continue
        stats = error_stats([r[err_key] for r in part])
        rooms = sorted({r.get("room") or "?" for r in part})
        table.append({"encounter": encounter, "rooms": rooms, "fights": len({(r["run_id"], r["fight_no"]) for r in part}), **stats})
    table.sort(key=lambda e: -e["mean_abs"])
    return table[:top]


def worst(rows, err_key, top=TOP):
    return sorted((r for r in rows if r.get(err_key) is not None), key=lambda r: -abs(r[err_key]))[:top]


def summarize_all(data, group_of, order, top=TOP):
    """The report's numbers: per section summaries, distance / room tables, encounters and the worst cases."""
    rollout, nodes, rooms, boss = data["rollout"], data["route"], data["rooms"], data["boss"]
    out = {"rollout": {"sections": [(label, rollout_summary(part)) for label, part in sections(rollout, group_of, order)]},
           "route": {"sections": [(label, route_summary(part)) for label, part in sections(nodes, group_of, order)]},
           "boss": {"sections": []}}
    # Rollout: cumulative error by turns ahead, by decider / how, encounters, worst turns.
    for asc in sorted({r["ascension"] for r in rollout}):
        mine = [r for r in rollout if r["ascension"] == asc]
        ahead = []
        for k in range(1, 6):
            errs = [r["pred_cum"][k - 1] - r["actual_cum"][k - 1] for r in mine
                    if r["pred_cum"] and len(r["pred_cum"]) >= k and r["actual_cum"][k - 1] is not None]
            ahead.append((k, error_stats(errs)))
        out["rollout"].setdefault("ahead", []).append((f"A{asc}", ahead))
        out["rollout"].setdefault("how", []).append((f"A{asc}", [(how, error_stats([r["err_turn"] for r in mine if r["how"] == how]))
                                                                for how in sorted({r["how"] for r in mine})]))
        out["rollout"].setdefault("encounters_turn", []).append((f"A{asc}", encounter_table(mine, "err_turn", top)))
        out["rollout"].setdefault("encounters_window", []).append((f"A{asc}", encounter_table(mine, "err_window", top)))
        out["rollout"].setdefault("worst_turn", []).append((f"A{asc}", worst(mine, "err_turn", top)))
        out["rollout"].setdefault("worst_end", []).append((f"A{asc}", worst(mine, "err_end", top)))
    for asc in sorted({n["ascension"] for n in nodes}):
        mine = [n for n in nodes if n["ascension"] == asc]
        out["route"].setdefault("distance", []).append((f"A{asc}", [(name, error_stats([n["err"] for n in mine if distance_bucket(n["distance"]) == name]))
                                                                   for _, _, name in DISTANCE_BUCKETS]))
        ahead = [n for n in mine if n["distance"] >= ROUTE_FROM]
        types = [t for t in ROOM_ORDER if any(n["type"] == t for n in ahead)] + sorted({n["type"] for n in ahead} - set(ROOM_ORDER))
        out["route"].setdefault("target", []).append((f"A{asc}", [(t, error_stats([n["err"] for n in ahead if n["type"] == t])) for t in types]))
        mine_rooms = [r for r in rooms if r["ascension"] == asc]
        room_types = [t for t in ROOM_ORDER if any(r["type"] == t for r in mine_rooms)] + sorted({r["type"] for r in mine_rooms} - set(ROOM_ORDER))
        out["route"].setdefault("rooms", []).append((f"A{asc}", [
            (t, {"pred": quantile([r["pred_cost"] for r in mine_rooms if r["type"] == t], 0.5),
                 "actual": quantile([r["actual_cost"] for r in mine_rooms if r["type"] == t], 0.5),
                 "actual_p75": quantile([r["actual_cost"] for r in mine_rooms if r["type"] == t], 0.75),
                 "actual_mean": statistics.fmean([r["actual_cost"] for r in mine_rooms if r["type"] == t]),
                 "deaths": sum(r["died"] for r in mine_rooms if r["type"] == t),
                 **error_stats([r["err"] for r in mine_rooms if r["type"] == t])})
            for t in room_types]))
        out["route"].setdefault("worst", []).append((f"A{asc}", worst(mine, "err", top)))
    for label, part in sections(boss, group_of, order):
        out["boss"]["sections"].append((label, {"all": boss_summary(part), "won": boss_summary([r for r in part if r["won"]]),
                                                "lost": boss_summary([r for r in part if not r["won"]])}))
    for asc in sorted({r["ascension"] for r in boss}):
        mine = [r for r in boss if r["ascension"] == asc and r.get("ratio")]
        out["boss"].setdefault("worst", []).append((f"A{asc}", sorted(mine, key=lambda r: -abs(math.log(r["ratio"])))[:top]))
        by_boss = {}
        for r in boss:
            if r["ascension"] == asc and "clock_error" not in r:
                by_boss.setdefault(r.get("boss") or r.get("encounter"), []).append(r)
        out["boss"].setdefault("bosses", []).append((f"A{asc}", sorted(((b, boss_summary(rs)) for b, rs in by_boss.items()), key=lambda x: -x[1]["fights"])))
    return out


# ---------------------------------------------------------------- the metrics columns (eval/metrics.py)


def run_digest(data, run_id):
    """The three numbers eval/metrics.py shows per version, from one run's rows (merged per group there)."""
    turns = [r for r in data["rollout"] if r["run_id"] == run_id]
    return {
        "turns": len(turns),
        "turns_within": sum(abs(r["err_turn"]) <= NEAR for r in turns),
        "route_near": [n["err"] for n in data["route"] if n["run_id"] == run_id and ROUTE_FROM <= n["distance"] <= ROUTE_NEAR_FLOORS],
        "boss_ratio": [r["ratio"] for r in data["boss"] if r["run_id"] == run_id and r.get("ratio")],
    }


# ---------------------------------------------------------------- rendering


def num(x, digits=1, signed=False):
    if x is None:
        return "—"
    x = round(x, digits) + 0.0  # no "-0.0"
    return f"{x:+.{digits}f}" if signed else f"{x:.{digits}f}"


def pct(x):
    return "—" if x is None else f"{x * 100:.0f}%"


def table(head, body):
    lines = ["| " + " | ".join(str(h).replace("|", "\\|") for h in head) + " |", "|" + "---|" * len(head)]
    lines += ["| " + " | ".join(str(c).replace("|", "\\|") for c in row) + " |" for row in body]
    return "\n".join(lines) + "\n"


def flag(n, min_n):
    return " *" if n and n < min_n else ""


def err_cells(s, min_n):
    return [f"{s['n']}{flag(s['n'], min_n)}", num(s["median"], 1, True), num(s["mean"], 1, True), num(s["p10"], 1, True), num(s["p90"], 1, True),
            num(s["median_abs"]), pct(s["within"]), pct(s["over"]), pct(s["under"])]


ERR_HEAD = ["n", "中位误差", "平均误差", "p10", "p90", "中位 |误差|", "±2 内", "高估 >2", "低估 <−2"]


def render_md(summary, data, meta, min_n, top):
    out = [f"# 预测对实际（{meta['title']}）\n",
           f"数据：日志库 {meta['db']}（同步于 {meta['synced']}）；已结束的对局 {meta['runs']} 局（{meta['filters']}）；版本分组：{meta['group_by']}。"
           f"生成命令：`{meta['command']}`。误差 = 预测 − 实际（HP）；`*` = n < {min_n}，只作参考。口径和局限见 docs/eval.md §7。\n"]
    cov = data["coverage"]
    # 1. rollout
    r = summary["rollout"]
    c = cov.get("rollout", {})
    out.append("\n## 1. 推演（战斗里选中的那条线）\n")
    out.append(f"每回合取最后一次 plan-choice 决策（它的线打到回合结束）：{c.get('turns', 0)} 个回合，对上 {c.get('rows', 0)} 个；"
               f"没对上：{', '.join(f'{k} {v}' for k, v in sorted((c.get('dropped') or {}).items())) or '无'}。\n")
    out.append("\n**本回合掉血**：预测 = 选中线的 hp_lost（turn solver 的精确值）；实际 = 决策帧血量 − 下回合第一帧血量（战斗结束则减战斗最后血量，死了减 0）。"
               "「单次」= 这回合只决策一次（没重算）的回合。\n\n")
    body = []
    for label, s in r["sections"]:
        t = s["turn"]
        body.append([label, s["runs"], num(s["pred_turn"]), num(s["actual_turn"])] + err_cells(t, min_n) + [pct(s["turn_single"]["within"]), s["replanned"]])
    out.append(table(["分组", "局", "预测中位", "实际中位"] + ERR_HEAD + ["单次 ±2 内", "重算过的回合"], body))
    out.append("\n**推演窗口（T1 + 推演的后几回合，一般 5 回合）**：预测 = T1 精确值 + 后面每回合的平均掉血 × 还在打的样本占比；实际 = 同样几个回合的掉血（战斗提前结束按结束算）。"
               "后面的回合实际由 Jev 每回合重新选线，不一定是推演假设的打法。\n\n")
    body = [[label, s["runs"], num(s["pred_window"]), num(s["actual_window"])] + err_cells(s["window"], min_n) for label, s in r["sections"]]
    out.append(table(["分组", "局", "预测中位", "实际中位"] + ERR_HEAD, body))
    out.append("\n**到战斗结束**：预测 = 推演的 expected further HP loss（窗口内 + 窗口后的模型估计）；实际 = 决策时血量 − 战斗最后血量（死了是全部）。\n\n")
    body = [[label, s["runs"], num(s["pred_end"]), num(s["actual_end"])] + err_cells(s["end"], min_n) for label, s in r["sections"]]
    out.append(table(["分组", "局", "预测中位", "实际中位"] + ERR_HEAD, body))
    for asc, ahead in r.get("ahead", []):
        out.append(f"\n**{asc} 按往后几回合（累计）**：k = 1 是本回合，k = 5 是推演窗口的末尾。\n\n")
        out.append(table(["k"] + ERR_HEAD, [[k] + err_cells(s, min_n) for k, s in ahead]))
    for asc, hows in r.get("how", []):
        out.append(f"\n**{asc} 按谁定的线**（answer = Jev/模型的回答，escalation = 升级后的选择，hp-guard / dominator = 代码换线）：\n\n")
        out.append(table(["来源"] + ERR_HEAD, [[how] + err_cells(s, min_n) for how, s in hows]))
    for key, title in (("encounters_turn", "本回合"), ("encounters_window", "推演窗口")):
        for asc, enc in r.get(key, []):
            out.append(f"\n**{asc} 偏差最大的 {top} 个遭遇（{title}，按平均 |误差| 排，回合数 ≥ {ENCOUNTER_MIN_N}）**\n\n")
            out.append(table(["遭遇", "房间", "场", "回合"] + ERR_HEAD[1:], [[e["encounter"], ",".join(e["rooms"]), e["fights"], e["n"]] + err_cells(e, 0)[1:] for e in enc]))
    for key, err, title in (("worst_turn", "err_turn", "本回合"), ("worst_end", "err_end", "到战斗结束")):
        for asc, rows in r.get(key, []):
            out.append(f"\n**{asc} 偏差最大的 {top} 个回合（{title}）**\n\n")
            pk, ak = ("pred_turn", "actual_turn") if err == "err_turn" else ("pred_end", "actual_end")
            out.append(table(["run", "层", "回合", "遭遇", "房间", "决策时 HP", "预测", "实际", "误差", "来源", "重算"],
                             [[x["run_id"], x["floor"], x["turn"], x["encounter"], x["room"] or "?", x["hp"], num(x[pk]), num(x[ak]), num(x[err], 1, True), x["how"],
                               "是" if x["replanned"] else ""] for x in rows]))
    # 2. route
    rt = summary["route"]
    c = cov.get("route", {})
    out.append("\n## 2. 路线投影\n")
    out.append(f"路线计划 {c.get('plans', 0)} 个（{', '.join(f'{k} {v}' for k, v in (c.get('plans_by_label') or {}).items()) or '无'}），投影的节点 {c.get('nodes_projected', 0)} 个；"
               f"按计划走到的 {c.get('nodes_reached', 0)} 个，加上死在路上之后的下一节点 {c.get('died_before', 0)} 个（按 0 血算）。"
               "预测 = hpOnArrival × 做计划时的最大血量；实际 = 进这个节点时的血量（上一层最后一个地图帧，floors.entry_hp）。只算 run 从计划点起一步不差地走到的节点。"
               f"计划的第一个节点（离计划点 1 层）投影的就是做计划时的血量，不是预测：下面的汇总从 {ROUTE_FROM} 层起算，它只在「按离投影点几层」里作核对。"
               "复查（选牌、休息点）保持原路线时的重新投影没有落盘，这里只有改线（map/route-change）的那次。\n\n")
    body = []
    for label, s in rt["sections"]:
        body.append([label, s["runs"], s["plans"], num(s["pred"]), num(s["actual"])] + err_cells(s["arrival"], min_n) + [num(s["near"]["median"], 1, True), s["died_before"]])
    out.append(table(["分组", "局", "计划", "投影中位", "实际中位"] + ERR_HEAD + [f"{ROUTE_FROM}–{ROUTE_NEAR_FLOORS} 层中位误差", "死在路上"], body))
    for asc, dist in rt.get("distance", []):
        out.append(f"\n**{asc} 按离投影点几层**\n\n")
        out.append(table(["层数"] + ERR_HEAD, [[name] + err_cells(s, min_n) for name, s in dist]))
    for asc, target in rt.get("target", []):
        out.append(f"\n**{asc} 按到达的节点类型**（到达血量的误差，是前面所有房间误差的累积）\n\n")
        out.append(table(["节点"] + ERR_HEAD, [[f"{ROOM_NAMES.get(t, t)}（{t}）"] + err_cells(s, min_n) for t, s in target]))
    for asc, rooms in rt.get("rooms", []):
        out.append(f"\n**{asc} 每个房间自己的代价**（投影 = 前后两个节点的投影差；实际 = 前后两个节点的进场血量差；负数是回血；死在房间里算全部进场血量）\n\n")
        out.append(table(["房间", "n", "投影代价中位", "实际中位", "实际 p75", "实际均值", "死亡", "中位误差", "平均误差", "p10", "p90", "±2 内"],
                         [[f"{ROOM_NAMES.get(t, t)}（{t}）", f"{s['n']}{flag(s['n'], min_n)}", num(s["pred"]), num(s["actual"]), num(s["actual_p75"]), num(s["actual_mean"]), s["deaths"],
                           num(s["median"], 1, True), num(s["mean"], 1, True), num(s["p10"], 1, True), num(s["p90"], 1, True), pct(s["within"])] for t, s in rooms]))
    for asc, rows in rt.get("worst", []):
        out.append(f"\n**{asc} 偏差最大的 {top} 次**\n\n")
        out.append(table(["run", "计划层", "计划来源", "节点层", "离计划", "节点", "投影", "实际", "误差"],
                         [[x["run_id"], x["plan_floor"], x["label"], x["floor"], x["distance"], ROOM_NAMES.get(x["type"], x["type"]) + ("（死在前一房间）" if x["died_before"] else ""),
                           num(x["pred"], 0), num(x["actual"], 0), num(x["err"], 0, True)] for x in rows]))
    # 3. boss clock
    b = summary["boss"]
    c = cov.get("boss", {})
    out.append("\n## 3. boss 时钟\n")
    if not c:
        out.append("（没算：--no-boss）\n")
    else:
        out.append(f"boss 战 {c.get('fights', 0)} 场，时钟重算出 {c.get('clocks', 0)} 场{('（没算出：' + '; '.join(c['clock_errors']) + '）') if c.get('clock_errors') else ''}。"
                   "时钟没有落盘，按每场 boss 战第一帧的牌组、遗物、boss 和实际进场血量用现在的 src/strategy/boss-clock.ts 重算（tools/eval/boss-clock-recompute.ts）。"
                   "估值 = 时钟的牌组每回合伤害（deck_damage_per_turn_estimate，按时钟自己估的战斗回合数）；"
                   "实打 = boss 本体（第一帧的非 minion 敌人：同族只算神官、女王不算汞合体、帝王蟹两只钳子）掉的血 ÷ 回合数，赢局按本体最大血量（最后一击在最后一帧之后），"
                   "输局按最大血量 − 本体合计最低血量，回血不加（同 tools/boss-fights-extract.py，时钟估值就是按它标定的）；"
                   "掉血/回合 = (进场 − 战斗结束血量，死了是 0) ÷ 回合数；可活回合只在输局里看得到（死的那回合）。\n\n")
        body = []
        for label, s in b["sections"]:
            for part in ("won", "lost"):
                x = s[part]
                if not x["clocked"]:
                    continue
                body.append([label, "赢" if part == "won" else "输", f"{x['clocked']}{flag(x['clocked'], min_n)}", num(x["est"]), num(x["realised"]),
                             num(x["ratio"]["median"], 2), num(x["ratio"]["p10"], 2), num(x["ratio"]["p90"], 2), num(x["ratio_at_turns"]["median"], 2),
                             num(x["loss_est"]), num(x["loss_actual"]), num(x["loss_ratio"]["median"], 2),
                             num(x["survive"]["median"], 1, True) if part == "lost" else "—", x["enough"][part]])
        out.append(table(["分组", "结果", "场", "估值中位", "实打中位", "实打/估值 中位", "p10", "p90", "实打/估值（按实际回合数）",
                          "掉血/回合 估", "实际", "实际/估 中位", "可活回合 估−实（中位）", "时钟报「够」"], body))
        for asc, bosses in b.get("bosses", []):
            out.append(f"\n**{asc} 按 boss**\n\n")
            out.append(table(["boss", "场", "赢", "估值中位", "实打中位", "实打/估值 中位", "掉血/回合 估", "实际"],
                             [[name, s["clocked"], s["won"], num(s["est"]), num(s["realised"]), num(s["ratio"]["median"], 2), num(s["loss_est"]), num(s["loss_actual"])]
                              for name, s in bosses]))
        for asc, rows in b.get("worst", []):
            out.append(f"\n**{asc} 实打/估值偏得最远的 {top} 场**\n\n")
            out.append(table(["run", "层", "boss", "结果", "进场 HP", "回合", "估值", "实打", "实打/估值", "需要/回合", "报够", "掉血/回合 估", "实际", "可活回合 估"],
                             [[x["run_id"], x["floor"], x.get("boss") or x["encounter"], "赢" if x["won"] else "输", x["entry_hp"], x["turns"], num(x["est"]), num(x["realised"]),
                               num(x["ratio"], 2), x.get("need"), "是" if x.get("enough") else "", num(x.get("loss_est")), num(x["loss_actual"]), x.get("survive_est")] for x in rows]))
    return "".join(out)


def plain(value):
    if isinstance(value, tuple):
        return [plain(v) for v in value]
    return metrics.plain(value)


# ---------------------------------------------------------------- main


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ascension", type=int, action="append", help="only this ascension (repeatable)")
    parser.add_argument("--since", help="runs started at or after this time (ISO; UTC unless it has an offset)")
    parser.add_argument("--until", help="runs started before this time")
    parser.add_argument("--group-by", default="version", choices=["version", "family", "config", "commit", "day"],
                        help="the code-version grouping (config: version + brain engines/models + knowledge prefix, metrics.py)")
    parser.add_argument("--md", action="store_true", help="markdown report (the default)")
    parser.add_argument("--json", action="store_true", help="summaries, coverage and the worst cases as JSON")
    parser.add_argument("--rows", action="store_true", help="with --json: every aligned prediction row too")
    parser.add_argument("--top", type=int, default=TOP)
    parser.add_argument("--min-n", type=int, default=MIN_N, help="cells with fewer rows are marked * (too few to read)")
    parser.add_argument("--no-boss", action="store_true", help="skip the boss clock (it runs tsx over the boss fights' states)")
    parser.add_argument("--boss-clocks", help="JSONL of boss-clock-recompute.ts output to use instead of recomputing")
    parser.add_argument("--game-data", help="game data for the boss clock (default .cache/game-data.json)")
    parser.add_argument("--title", default=None)
    parser.add_argument("--versions", default=metrics.VERSIONS_FILE)
    parser.add_argument("--db", default=None)
    parser.add_argument("--logs", default=None)
    parser.add_argument("--no-sync", action="store_true", help="do not bring the log database up to date first")
    args = parser.parse_args(argv)

    import query as logquery  # noqa: E402  (needs duckdb: run with .cache/logdb-venv/bin/python)
    import sync as logsync  # noqa: E402

    db = os.path.abspath(args.db or os.environ.get("LOGDB_DIR", logsync.DEFAULT_DB))
    logs = os.path.abspath(args.logs or os.environ.get("LOGDB_LOGS", logsync.DEFAULT_LOGS))
    logsync.be_gentle()
    if not args.no_sync:
        logsync.sync(logs, db, quiet=True, wait=True)
    clocks = load_clock_file(args.boss_clocks) if args.boss_clocks else None
    with logsync.read_lock(db, shared=True):
        con = logquery.connect(db, threads=2)
        runs = load_runs(con, set(args.ascension or []), metrics.as_utc(args.since), metrics.as_utc(args.until))
        data = collect(con, runs, logs, boss=not args.no_boss, clocks=clocks, game_data=args.game_data)
    versions = metrics.VersionMap(metrics.load_versions(args.versions), metrics.Git()) if args.group_by in ("version", "family", "config") else None
    group_of, order = run_groups(runs, args.group_by, versions)
    summary = summarize_all(data, group_of, order, args.top)
    synced = dt.datetime.fromtimestamp(os.path.getmtime(os.path.join(db, "manifest.json")), metrics.LOCAL).strftime("%Y-%m-%d %H:%M (UTC+8)")
    filters = ", ".join(x for x in [f"A{'/'.join(map(str, sorted(set(args.ascension))))}" if args.ascension else "全部进阶",
                                    f"开局 ≥ {args.since}" if args.since else "", f"开局 < {args.until}" if args.until else ""] if x)
    meta = {"title": args.title or filters, "db": os.path.relpath(db, ROOT) if db.startswith(ROOT) else db, "synced": synced, "runs": len(runs),
            "filters": filters, "group_by": args.group_by, "command": "tools/eval/calibration.py " + " ".join(argv if argv is not None else sys.argv[1:])}
    if args.json:
        payload = {"meta": meta, "coverage": data["coverage"], "summary": plain(summary), "groups": {name: [r["run_id"] for r in runs if group_of.get(r["run_id"]) == name] for name in order}}
        if args.rows:
            payload["rows"] = {key: plain(data[key]) for key in ("rollout", "route", "rooms", "boss")}
        print(json.dumps(payload, ensure_ascii=False, indent=1))
        return 0
    sys.stdout.write(render_md(summary, data, meta, args.min_n, args.top))
    return 0


if __name__ == "__main__":
    sys.exit(main())
