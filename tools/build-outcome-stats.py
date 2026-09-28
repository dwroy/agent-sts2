#!/usr/bin/env python3
"""Outcome statistics from our own logs -> src/knowledge/outcome-stats.json (the knowledge base's stats layer).

What happened to the runs that made a given choice, per ascension (default A8):
  cards   per card acquired, by the act it was acquired in: runs, mean final floor, pass rate of that act's
          boss; and the same for runs that were offered it on a card reward in that act and did not take it
  relics  per relic acquired, by act: the same numbers
  events  per event option chosen (event id + option): mean HP / max-HP / gold change over the rest of that
          floor (from the choice to the first decision on the next floor), and the run's outcome
  rest    per rest-site choice (HEAL / SMITH / ...) by HP band on arrival: runs' outcome for that act
  baseline  all runs at this ascension: mean final floor, each act boss's pass rate among runs reaching it
Every row carries n (runs); rows with n < 5 are marked "low_n": true. Observational data: a pick's
numbers mix the pick's effect with the situations it is picked in.

Sources (streamed, stdlib only): logs/runs.jsonl (finished runs: ascension, final floor, victory),
logs/decisions.jsonl (event and rest choices, HP/gold per decision), logs/states.jsonl (deck and relic
changes, card rewards offered, event ids and option keys, rest options; combat states are skipped
without parsing and the agent_view copy of each state is cut before parsing).

Usage:
  python3 tools/build-outcome-stats.py [--logs DIR] [--ascension 8|all] [--out PATH] [--quiet]
  python3 tools/build-outcome-stats.py --self-test
Refresh (after new runs): python3 tools/build-outcome-stats.py   (about a minute on ~3 GB of states)
"""
import argparse
import bisect
import collections
import json
import os
import re
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUT = os.path.join(ROOT, "src", "knowledge", "outcome-stats.json")
LOW_N = 5
SCREEN_RE = re.compile(rb'"screen":\s*"([A-Z_]+)"')
SKIP_SCREENS = {b"COMBAT", b"MAIN_MENU", b"CHARACTER_SELECT", b"TIMELINE", b"UNLOCK", b"SETTINGS"}
AGENT_VIEW = b',"agent_view":'
HP_BANDS = ((0.4, "<40%"), (0.6, "40-60%"), (0.8, "60-80%"), (10.0, ">=80%"))


def _default_logs():
    for base in (os.path.join(ROOT, "logs"), os.path.expanduser("~/Projects/sts2-jev/jev-sts2/logs")):
        if os.path.exists(os.path.join(base, "runs.jsonl")):
            return base
    return os.path.join(ROOT, "logs")


def hp_band(hp, max_hp):
    if hp is None or not max_hp:
        return None
    frac = hp / max_hp
    for limit, label in HP_BANDS:
        if frac < limit:
            return label
    return HP_BANDS[-1][1]


# ---------------------------------------------------------------- reading


def read_runs(path, ascension):
    """run id -> {floor, victory, ascension} for finished runs at the ascension ("all" keeps every one)."""
    runs = {}
    with open(path, "r", encoding="utf8") as handle:
        for line in handle:
            try:
                row = json.loads(line)
            except ValueError:
                continue
            run_id = row.get("run_id")
            if not run_id:
                continue
            asc = row.get("ascension")
            if ascension != "all" and asc != ascension:
                continue
            runs[run_id] = {"floor": row.get("floor") or 0, "victory": bool(row.get("victory")), "ascension": asc}
    return runs


def read_decisions(path, runs):
    """Per run: sorted (ts, floor, hp, max_hp, gold); event choices and rest choices (ts, floor, index)."""
    marks = collections.defaultdict(list)
    events = collections.defaultdict(list)
    rests = collections.defaultdict(list)
    with open(path, "rb") as handle:
        for raw in handle:
            if b'"play"' not in raw[:200]:
                continue
            try:
                row = json.loads(raw)
            except ValueError:
                continue
            if row.get("mode") != "play":
                continue
            try:
                fp = json.loads(row.get("fingerprint") or "{}")
            except ValueError:
                continue
            run_id = fp.get("run")
            if run_id not in runs:
                continue
            ts = row.get("ts") or ""
            floor = row.get("floor")
            marks[run_id].append((ts, floor, fp.get("hp"), fp.get("maxHp"), fp.get("gold")))
            label = row.get("label") or ""
            chosen = row.get("chosen") or {}
            index = chosen.get("option_index")
            if index is None:
                continue
            if chosen.get("action") == "choose_event_option" and label.startswith("event/"):
                events[run_id].append((ts, floor, index, fp.get("hp"), fp.get("maxHp"), fp.get("gold")))
            elif chosen.get("action") == "choose_rest_option" and label == "rest/choose":
                rests[run_id].append((ts, floor, index, fp.get("hp"), fp.get("maxHp")))
    for rows in marks.values():
        rows.sort(key=lambda row: row[0])
    return marks, events, rests


def iter_states(path):
    """Yield (screen, entry) for every non-combat state line of interest, streaming the file."""
    with open(path, "rb") as handle:
        for raw in handle:
            match = SCREEN_RE.search(raw, 0, 4000)
            if not match or match.group(1) in SKIP_SCREENS:
                continue
            cut = raw.rfind(AGENT_VIEW)
            entry = None
            if cut > 0:
                try:
                    entry = json.loads(raw[:cut] + b"}}")
                except ValueError:
                    entry = None
            if entry is None:
                try:
                    entry = json.loads(raw)
                except ValueError:
                    continue
            yield match.group(1).decode(), entry


def act_of(run):
    act = run.get("act_id")
    try:
        return int(act) + 1
    except (TypeError, ValueError):
        return 1


def read_states(path, runs):
    """Deck/relic acquisitions, card rewards offered, event and rest screens, highest act per run."""
    deck_snap, relic_snap = {}, {}
    acquired_cards = collections.defaultdict(dict)  # run -> {(card, act): source}
    acquired_relics = collections.defaultdict(dict)
    offered = collections.defaultdict(set)  # run -> {(card, act)}
    max_act = collections.defaultdict(int)
    event_screens = collections.defaultdict(list)  # run -> [(ts, floor, act, event_id, {index: (key, title)})]
    rest_screens = collections.defaultdict(list)  # run -> [(ts, floor, act, {index: option_id}, hp, max_hp)]
    names = {"card": {}, "relic": {}, "event": {}}
    for screen, entry in iter_states(path):
        state = entry.get("state") or {}
        run_id = state.get("run_id")
        if run_id not in runs:
            continue
        run = state.get("run") or {}
        act = act_of(run)
        max_act[run_id] = max(max_act[run_id], act)
        ts = entry.get("ts") or ""
        floor = run.get("floor")
        deck = run.get("deck")
        if isinstance(deck, list) and deck:
            counts = collections.Counter()
            for card in deck:
                card_id = card.get("card_id")
                if card_id:
                    counts[card_id] += 1
                    names["card"].setdefault(card_id, (card.get("name") or card_id).rstrip("+"))
            before = deck_snap.get(run_id)
            if before is not None:
                for card_id, count in counts.items():
                    if count > before.get(card_id, 0):
                        acquired_cards[run_id].setdefault((card_id, act), screen)
            deck_snap[run_id] = counts
        relics = run.get("relics")
        if isinstance(relics, list):
            held = set()
            for relic in relics:
                relic_id = relic.get("relic_id")
                if relic_id:
                    held.add(relic_id)
                    names["relic"].setdefault(relic_id, relic.get("name") or relic_id)
            before = relic_snap.get(run_id)
            if before is not None:
                for relic_id in held - before:
                    acquired_relics[run_id].setdefault((relic_id, act), screen)
            relic_snap[run_id] = held
        if screen == "REWARD":
            for card in (state.get("reward") or {}).get("card_options") or []:
                card_id = card.get("card_id")
                if card_id:
                    offered[run_id].add((card_id, act))
                    names["card"].setdefault(card_id, (card.get("name") or card_id).rstrip("+"))
        elif screen == "EVENT":
            event = state.get("event") or {}
            event_id = event.get("event_id")
            if event_id:
                names["event"].setdefault(event_id, event.get("title") or event_id)
                options = {}
                for option in event.get("options") or []:
                    key = (option.get("text_key") or "").split(".")[-1] or option.get("title") or "?"
                    options[option.get("index")] = (key, option.get("title") or key)
                event_screens[run_id].append((ts, floor, act, event_id, options))
        elif screen == "REST":
            options = {option.get("index"): option.get("option_id") or option.get("title") or "?" for option in (state.get("rest") or {}).get("options") or []}
            rest_screens[run_id].append((ts, floor, act, options, run.get("current_hp"), run.get("max_hp")))
    return {
        "acquired_cards": acquired_cards,
        "acquired_relics": acquired_relics,
        "offered": offered,
        "max_act": max_act,
        "event_screens": event_screens,
        "rest_screens": rest_screens,
        "names": names,
    }


# ---------------------------------------------------------------- aggregation


class Outcome:
    """Runs sharing a choice: n, mean final floor, the act boss's pass rate, plus optional deltas."""

    def __init__(self):
        self.floors = []
        self.passed = 0
        self.deltas = collections.defaultdict(list)

    def add(self, floor, passed, **deltas):
        self.floors.append(floor)
        self.passed += 1 if passed else 0
        for key, value in deltas.items():
            if value is not None:
                self.deltas[key].append(value)

    def row(self):
        n = len(self.floors)
        out = {"n": n, "mean_floor": round(sum(self.floors) / n, 1) if n else None, "boss_pass": round(self.passed / n, 2) if n else None}
        for key, values in sorted(self.deltas.items()):
            out[key] = round(sum(values) / len(values), 1) if values else None
        if n < LOW_N:
            out["low_n"] = True
        return out


def boss_passed(run, max_act, act):
    return run["victory"] or max_act > act


def at_or_before(rows, ts):
    """The last row whose ts <= ts (rows sorted by ts), else None."""
    keys = [row[0] for row in rows]
    index = bisect.bisect_right(keys, ts) - 1
    return rows[index] if index >= 0 else None


def floor_delta(marks, ts, floor, hp, max_hp, gold):
    """HP / max HP / gold change from the choice to the first decision on a later floor (None if none)."""
    for row in marks:
        if row[0] <= ts:
            continue
        if row[1] is not None and floor is not None and row[1] > floor:
            after_hp, after_max, after_gold = row[2], row[3], row[4]
            diff = lambda a, b: (a - b) if isinstance(a, (int, float)) and isinstance(b, (int, float)) else None
            return diff(after_hp, hp), diff(after_max, max_hp), diff(after_gold, gold)
    return None, None, None


def build(logs, ascension):
    runs = read_runs(os.path.join(logs, "runs.jsonl"), ascension)
    marks, event_choices, rest_choices = read_decisions(os.path.join(logs, "decisions.jsonl"), runs)
    seen = read_states(os.path.join(logs, "states.jsonl"), runs)
    max_act = seen["max_act"]
    names = seen["names"]
    # Runs with no state at all (logged before states.jsonl) cannot say which act they reached.
    runs = {run_id: run for run_id, run in runs.items() if max_act.get(run_id)}

    baseline_floor = [run["floor"] for run in runs.values()]
    baseline = {"runs": len(runs), "mean_floor": round(sum(baseline_floor) / len(runs), 1) if runs else None, "boss_pass_by_act": {}}
    for act in (1, 2, 3):
        reached = [run_id for run_id in runs if max_act[run_id] >= act]
        if reached:
            passed = sum(1 for run_id in reached if boss_passed(runs[run_id], max_act[run_id], act))
            baseline["boss_pass_by_act"][str(act)] = {"n": len(reached), "boss_pass": round(passed / len(reached), 2)}

    cards = collections.defaultdict(lambda: collections.defaultdict(lambda: {"picked": Outcome(), "offered_not_picked": Outcome()}))
    sources = collections.defaultdict(collections.Counter)
    for run_id, run in runs.items():
        picked = seen["acquired_cards"].get(run_id, {})
        for (card_id, act), source in picked.items():
            cards[card_id][act]["picked"].add(run["floor"], boss_passed(run, max_act[run_id], act))
            sources[card_id][source] += 1
        for card_id, act in seen["offered"].get(run_id, set()):
            if (card_id, act) not in picked:
                cards[card_id][act]["offered_not_picked"].add(run["floor"], boss_passed(run, max_act[run_id], act))

    relics = collections.defaultdict(lambda: collections.defaultdict(Outcome))
    for run_id, run in runs.items():
        for (relic_id, act), _source in seen["acquired_relics"].get(run_id, {}).items():
            relics[relic_id][act].add(run["floor"], boss_passed(run, max_act[run_id], act))

    events = collections.defaultdict(lambda: collections.defaultdict(Outcome))
    option_titles = {}
    unmatched_events = 0
    for run_id, choices in event_choices.items():
        if run_id not in runs:
            continue
        screens = seen["event_screens"].get(run_id, [])
        for ts, floor, index, hp, max_hp, gold in choices:
            screen = at_or_before(screens, ts)
            if not screen or screen[3] is None or index not in screen[4]:
                unmatched_events += 1
                continue
            _ts, _floor, act, event_id, options = screen
            key, title = options[index]
            option_titles[(event_id, key)] = title
            d_hp, d_max, d_gold = floor_delta(marks.get(run_id, []), ts, floor, hp, max_hp, gold)
            events[event_id][key].add(runs[run_id]["floor"], boss_passed(runs[run_id], max_act[run_id], act), hp_change=d_hp, max_hp_change=d_max, gold_change=d_gold)

    rest = collections.defaultdict(lambda: collections.defaultdict(Outcome))
    unmatched_rests = 0
    for run_id, choices in rest_choices.items():
        if run_id not in runs:
            continue
        screens = seen["rest_screens"].get(run_id, [])
        for ts, floor, index, hp, max_hp in choices:
            screen = at_or_before(screens, ts)
            # Older decisions' fingerprints carry no max HP: the rest screen's own state does.
            band = hp_band(hp, max_hp) if max_hp else (hp_band(screen[4], screen[5]) if screen else None)
            if not screen or index not in screen[3] or band is None:
                unmatched_rests += 1
                continue
            act = screen[2]
            rest[screen[3][index]][band].add(runs[run_id]["floor"], boss_passed(runs[run_id], max_act[run_id], act))

    def by_act(table):
        return {str(act): value for act, value in sorted(table.items())}

    out = {
        "_about": "Outcome stats from our logs (tools/build-outcome-stats.py). Observational: a choice's numbers mix its effect with the situations it was made in. n = runs; low_n = n<5. boss_pass = share of those runs that beat the boss of the act the choice was made in; mean_floor = mean final floor of those runs. events: hp/max_hp/gold change = from the choice to the first decision on the next floor.",
        "generated": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "ascension": ascension,
        "baseline": baseline,
        "cards": {},
        "relics": {},
        "events": {},
        "rest": {},
        "coverage": {"event_choices_unmatched": unmatched_events, "rest_choices_unmatched": unmatched_rests},
    }
    for card_id in sorted(cards):
        acts = {}
        for act, pair in sorted(cards[card_id].items()):
            row = {"picked": pair["picked"].row()} if pair["picked"].floors else {}
            if pair["offered_not_picked"].floors:
                row["offered_not_picked"] = pair["offered_not_picked"].row()
            acts[str(act)] = row
        out["cards"][card_id] = {"name": names["card"].get(card_id, card_id), "by_act": acts}
        if sources.get(card_id):
            out["cards"][card_id]["sources"] = dict(sources[card_id].most_common())
    for relic_id in sorted(relics):
        out["relics"][relic_id] = {"name": names["relic"].get(relic_id, relic_id), "by_act": {act: outcome.row() for act, outcome in by_act(relics[relic_id]).items()}}
    for event_id in sorted(events):
        out["events"][event_id] = {
            "name": names["event"].get(event_id, event_id),
            "options": {key: {"title": option_titles.get((event_id, key), key), **outcome.row()} for key, outcome in sorted(events[event_id].items())},
        }
    for option in sorted(rest):
        out["rest"][option] = {band: rest[option][band].row() for _limit, band in HP_BANDS if band in rest[option]}
    return out


# ---------------------------------------------------------------- self-test


def _state_line(ts, run_id, screen, floor, act, deck, relics, extra=None):
    state = {
        "run_id": run_id,
        "screen": screen,
        "run": {"act_id": act - 1, "floor": floor, "deck": [{"card_id": card, "name": card.lower()} for card in deck], "relics": [{"relic_id": relic, "name": relic.lower()} for relic in relics]},
    }
    state.update(extra or {})
    return json.dumps({"ts": ts, "screen": screen, "state": state, "agent_view": {"ignored": True}})


def _decision_line(ts, run_id, floor, label, hp, max_hp, gold, chosen=None, mode="play"):
    fingerprint = json.dumps({"run": run_id, "hp": hp, "maxHp": max_hp, "gold": gold})
    return json.dumps({"ts": ts, "mode": mode, "floor": floor, "label": label, "fingerprint": fingerprint, "chosen": chosen or {}})


def self_test():
    import tempfile

    start = ["STRIKE", "STRIKE", "DEFEND", "BASH"]
    states, decisions, runs = [], [], []
    # Run A (A8): offered INFLAME and ANGER at F2, takes INFLAME; event option GAIN at F3 (+10 max HP, -5 gold);
    # rests (HEAL) at 30% HP on F5; reaches act 2 (passes the act-1 boss), dies F20.
    states += [
        _state_line("t01", "RUNA", "MAP", 1, 1, start, ["BURNING_BLOOD"]),
        _state_line("t02", "RUNA", "REWARD", 2, 1, start, ["BURNING_BLOOD"], {"reward": {"card_options": [{"card_id": "INFLAME"}, {"card_id": "ANGER"}]}}),
        _state_line("t03", "RUNA", "COMBAT", 2, 1, start + ["WOUND"], ["BURNING_BLOOD"]),
        _state_line("t04", "RUNA", "MAP", 2, 1, start + ["INFLAME"], ["BURNING_BLOOD"]),
        _state_line("t05", "RUNA", "EVENT", 3, 1, start + ["INFLAME"], ["BURNING_BLOOD"], {"event": {"event_id": "FOUNTAIN", "title": "fountain", "options": [{"index": 0, "text_key": "FOUNTAIN.pages.INITIAL.options.GAIN", "title": "Gain"}, {"index": 1, "text_key": "FOUNTAIN.pages.INITIAL.options.LEAVE", "title": "Leave"}]}}),
        _state_line("t07", "RUNA", "REST", 5, 1, start + ["INFLAME"], ["BURNING_BLOOD", "ANCHOR"], {"rest": {"options": [{"index": 0, "option_id": "HEAL"}, {"index": 1, "option_id": "SMITH"}]}}),
        _state_line("t09", "RUNA", "MAP", 18, 2, start + ["INFLAME"], ["BURNING_BLOOD", "ANCHOR"]),
    ]
    decisions += [
        _decision_line("t05b", "RUNA", 3, "event/choose", 50, 80, 100, {"action": "choose_event_option", "option_index": 0}),
        _decision_line("t06", "RUNA", 4, "map/route", 50, 90, 95),
        _decision_line("t07b", "RUNA", 5, "rest/choose", 24, 80, 95, {"action": "choose_rest_option", "option_index": 0}),
        _decision_line("t07c", "RUNA", 5, "rest/choose", 24, 80, 95, {"action": "choose_rest_option", "option_index": 1}, mode="shadow"),
    ]
    # Run B (A8): offered INFLAME at F2 in act 1, skips it; dies at the act-1 boss (F17).
    states += [
        _state_line("u01", "RUNB", "MAP", 1, 1, start, ["BURNING_BLOOD"]),
        _state_line("u02", "RUNB", "REWARD", 2, 1, start, ["BURNING_BLOOD"], {"reward": {"card_options": [{"card_id": "INFLAME"}]}}),
        _state_line("u03", "RUNB", "MAP", 3, 1, start, ["BURNING_BLOOD"]),
    ]
    # Run C (A0): must be filtered out at the default ascension.
    states += [_state_line("v01", "RUNC", "MAP", 1, 1, start, []), _state_line("v02", "RUNC", "MAP", 2, 1, start + ["INFLAME"], [])]
    runs += [
        json.dumps({"run_id": "RUNA", "ascension": 8, "floor": 20, "victory": False}),
        json.dumps({"run_id": "RUNB", "ascension": 8, "floor": 17, "victory": False}),
        json.dumps({"run_id": "RUNC", "ascension": 0, "floor": 5, "victory": False}),
    ]
    with tempfile.TemporaryDirectory() as tmp:
        for name, lines in (("states.jsonl", states), ("decisions.jsonl", decisions), ("runs.jsonl", runs)):
            with open(os.path.join(tmp, name), "w", encoding="utf8") as handle:
                handle.write("\n".join(lines) + "\n")
        out = build(tmp, 8)
    failures = []

    def check(label, got, want):
        if got != want:
            failures.append(f"{label}: got {got!r}, want {want!r}")

    check("runs", out["baseline"]["runs"], 2)
    check("act-1 boss pass", out["baseline"]["boss_pass_by_act"]["1"], {"n": 2, "boss_pass": 0.5})
    inflame = out["cards"].get("INFLAME", {}).get("by_act", {}).get("1", {})
    check("INFLAME picked", inflame.get("picked"), {"n": 1, "mean_floor": 20.0, "boss_pass": 1.0, "low_n": True})
    check("INFLAME skipped", inflame.get("offered_not_picked"), {"n": 1, "mean_floor": 17.0, "boss_pass": 0.0, "low_n": True})
    check("ANGER skipped only", list(out["cards"].get("ANGER", {}).get("by_act", {}).get("1", {}).keys()), ["offered_not_picked"])
    check("combat WOUND not an acquisition", "WOUND" in out["cards"], False)
    check("relic ANCHOR", out["relics"].get("ANCHOR", {}).get("by_act", {}).get("1", {}).get("n"), 1)
    gain = out["events"].get("FOUNTAIN", {}).get("options", {}).get("GAIN", {})
    check("event delta", (gain.get("n"), gain.get("hp_change"), gain.get("max_hp_change"), gain.get("gold_change")), (1, 0, 10, -5))
    check("rest band", out["rest"].get("HEAL", {}).get("<40%", {}).get("n"), 1)
    check("shadow decision ignored", "SMITH" in out["rest"], False)
    if failures:
        print("self-test FAILED:\n  " + "\n  ".join(failures))
        return 1
    print("self-test ok")
    return 0


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--logs", default=_default_logs())
    parser.add_argument("--ascension", default="8", help="ascension to keep, or 'all'")
    parser.add_argument("--out", default=DEFAULT_OUT)
    parser.add_argument("--quiet", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    ascension = "all" if args.ascension == "all" else int(args.ascension)
    started = time.time()
    stats = build(args.logs, ascension)
    tmp = args.out + ".tmp"
    with open(tmp, "w", encoding="utf8") as handle:
        json.dump(stats, handle, ensure_ascii=False, indent=1)
        handle.write("\n")
    os.replace(tmp, args.out)
    if not args.quiet:
        print(
            f"{args.out}: {stats['baseline']['runs']} runs (A{ascension}), {len(stats['cards'])} cards, {len(stats['relics'])} relics, "
            f"{sum(len(e['options']) for e in stats['events'].values())} event options in {len(stats['events'])} events, "
            f"{len(stats['rest'])} rest choices; unmatched {stats['coverage']}; {time.time() - started:.0f} s"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
