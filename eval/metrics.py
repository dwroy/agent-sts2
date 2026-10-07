#!/usr/bin/env python3
"""Per-run evaluation metrics, grouped by code version (docs/eval.md; V4 architecture §1 "evaluator", M4).

Every metric is computed per finished run from the log database (agent/tools/logdb, docs/logdb.md), then summarised
per group: number of runs, mean / median and a 95% interval (Student t for means, Wilson for shares); groups
with fewer than --min-n runs are marked as too small to read.

Per run:
  - potions drunk in non-boss fights per 10 floors reached;
  - potions held entering each act's boss fight (the boss fight is found in the data: a fight in a Boss map
    node; never a fixed floor number);
  - potions still held when a lost run died (its death fight's potions in, less those drunk in it);
  - a Strength source at the act-1 boss: a deck card or relic that gives lasting Strength (the deck profile's
    own test, agent/src/memory/deck-profile.ts, via eval/strength-sources.ts), or Strength on the player
    during that fight;
  - act-1 elite fights entered below 78% of max HP;
  - died in act 2 before its first rest site (out of the runs that entered act 2);
  - act-1 boss passed, act-2 boss passed, won;
  - brain calls (deepseek-reasoning.jsonl and brain.jsonl, without the duplicate rows): calls, input /
    cache-hit / output tokens and time, overall and per engine;
  - three calibration summaries (eval/calibration.py, docs/eval.md section 7): the share of turns whose
    played line's predicted HP loss was within 2 of the actual, the route projection's error 2-3 floors ahead,
    and the boss clock's actual / estimated damage a turn (--no-calibration leaves them out).

Code version: runs.jsonl `code` (ops/run.sh: the run worktree's HEAD, `+dirty` when it had uncommitted changes,
which are the knowledge data refreshed after every run) with `+dirty` stripped, mapped to the named versions in
eval/versions.json by git ancestry (docs/eval.md §2). A version whose commit is still empty (V4 until it goes
live) is skipped.

Configuration (--group-by config, docs/eval.md §8): the version plus the brain setup the run started with, from
logs/run-config.jsonl (agent/src/eye/run-config.ts; the runs view's brain_label and knowledge_prefix): e.g.
"V4 · deepseek:deepseek-flash; MAP=claude:claude-opus-5-5 · 知识前缀 full". Runs from before that log are
"<version> · 未记录配置"; a run a restarted process played with another configuration is marked "局中改过配置".

Character (multi-character, 2026-10-04): --character ID keeps one character's runs (default: the CHARACTER environment
variable, else every character); --group-by character splits them (a run naming none is the Ironclad's: every run
before the Silent).

Usage (the log database's Python: data/logdb-venv/bin/python):
  eval/metrics.py [--ascension 9] [--character silent] [--since 2026-09-29T00:00] [--until ...]
                        [--group-by version|family|config|commit|ascension|character|day]
                        [--md | --json] [--per-run] [--total] [--min-n 10] [--no-sync] [--no-calibration] [--boss-clocks FILE]
Times without an offset are UTC (the database's clock); --group-by day uses the local date (UTC+8).
"""
import argparse
import datetime as dt
import json
import math
import os
import statistics
import subprocess
import sys
from pathlib import Path

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import brain_source  # noqa: E402
ROOT = str(Path(__file__).resolve().parents[1])  # the project root (docs/layout.md)
sys.path.insert(0, os.path.join(ROOT, "agent", "tools", "logdb"))
sys.path.insert(0, os.path.join(ROOT, "knowledge", "builders"))
from characters import character_key, env_character, run_character  # noqa: E402

VERSIONS_FILE = os.path.join(HERE, "versions.json")
ELITE_HP_SHARE = 0.78
MIN_N = 10
LOCAL = dt.timezone(dt.timedelta(hours=8))
# Two-sided 95% Student t critical values, df = 1..30.
T95 = [12.706, 4.303, 3.182, 2.776, 2.571, 2.447, 2.365, 2.306, 2.262, 2.228, 2.201, 2.179, 2.160, 2.145, 2.131,
       2.120, 2.110, 2.101, 2.093, 2.086, 2.080, 2.074, 2.069, 2.064, 2.060, 2.056, 2.052, 2.048, 2.045, 2.042]


# ---------------------------------------------------------------- per-run algorithms (plain data, no database)


def base_card(card_id):
    """A deck id without its upgrade mark ("INFLAME+" -> "INFLAME")."""
    return card_id.rstrip("+") if isinstance(card_id, str) else card_id


def boss_fights(fights, max_act, victory):
    """{act: fight}: each act's boss fight. The first fight in a Boss map node of the act; when the run got past
    an act (a later act in its frames, or the win for its last act) without one, the act's last fight, marked
    inferred=True. Boss floors come from here, never from fixed floor numbers."""
    bosses = {}
    for fight in sorted(fights, key=lambda f: f["fight_no"]):
        if fight.get("room") == "boss" and fight["act"] not in bosses:
            bosses[fight["act"]] = dict(fight, inferred=False)
    last_act = max_act or 0
    passed = list(range(1, last_act)) + ([last_act] if victory and last_act else [])
    for act in passed:
        if act in bosses:
            continue
        in_act = [f for f in fights if f["act"] == act]
        if in_act:
            bosses[act] = dict(max(in_act, key=lambda f: f["fight_no"]), inferred=True)
    return bosses


def passed_boss(act, max_act, victory, bosses):
    """Whether the run got past act `act`'s boss: it won, reached a later act, or won that boss fight."""
    boss = bosses.get(act)
    return bool(victory) or (max_act or 0) > act or bool(boss and boss.get("outcome") == "won")


def nonboss_drinks(fights, bosses):
    """Potions drunk in fights that are not a boss fight (a Boss room, or a fight boss_fights picked)."""
    boss_nos = {b["fight_no"] for b in bosses.values()}
    return sum(f.get("potions_n") or 0 for f in fights if f.get("room") != "boss" and f["fight_no"] not in boss_nos)


def potions_at_death(fights, victory):
    """Potions still held when the run died: those its death fight (the last fight marked died) was entered with, less
    those drunk in it (a potion gained inside the fight, Entropic Brew's, is not seen). None for a won run, or when no
    fight is marked died."""
    if victory:
        return None
    died = [f for f in fights if f.get("outcome") == "died"]
    if not died:
        return None
    last = max(died, key=lambda f: f["fight_no"])
    return max(0, (last.get("potions_in") or 0) - (last.get("potions_n") or 0))


def per_ten_floors(count, floors):
    return 10.0 * count / floors if floors else None


def strength_sources(deck, relics, start_strength, sets):
    """Strength sources at a fight: deck cards and relics that give lasting Strength (`sets`: {"cards", "relics"}
    from the deck profile's test), and Strength the player already has on the fight's first frame (the power,
    from whatever gave it). Strength gained during the fight is not a source here: played cards are in the deck
    already, and potions and Setup Strike give it for a turn."""
    cards = sorted({base_card(c) for c in deck or [] if base_card(c) in sets["cards"]})
    held = sorted({r for r in relics or [] if r in sets["relics"]})
    power = (start_strength or 0) > 0
    return {"cards": cards, "relics": held, "power": power, "any": bool(cards or held or power)}


def act1_elites(fights, share=ELITE_HP_SHARE):
    """(low, all): act-1 elite fights entered with HP below `share` of max HP, and all act-1 elite fights."""
    elites = [f for f in fights if f["act"] == 1 and f.get("room") == "elite" and f.get("entry_hp") is not None and f.get("max_hp")]
    low = [f for f in elites if f["entry_hp"] < share * f["max_hp"]]
    return len(low), len(elites)


def first_rest(floors, act):
    """The first rest-site floor of an act, or None."""
    rests = [f["floor"] for f in floors if f["act"] == act and f.get("room_node") == "RestSite"]
    return min(rests) if rests else None


def died_before_first_rest(floors, final_floor, victory, act=2):
    """(entered, died_before): whether the run has floors in `act`, and whether it died on one of them below the
    act's first rest site (or before reaching any)."""
    act_floors = {f["floor"] for f in floors if f["act"] == act}
    if not act_floors:
        return False, False
    rest = first_rest(floors, act)
    died_here = not victory and final_floor in act_floors
    return True, bool(died_here and (rest is None or final_floor < rest))


def first_attempt(sl_rows, final_floor, victory, passed, boss_floor):
    """The run as its first attempts played it (docs/sl.md §5). SL reloads a fight when its attempt foresees a certain
    death, so the first such row (an attempt 1: no reload came before it) is where the first-attempt run died: its
    floor is the first-attempt final floor, no win, and an act's boss counts as passed only when it lies below that
    floor. A run without such a row (SL off, or no reload) is its own first attempt. `passed`: {act: passed (final)}."""
    predicted = [r for r in sl_rows if r.get("result") == "predicted_death"]
    reloads = sum(1 for r in predicted if r.get("reload_ok"))
    if not predicted:
        return {"sl_rows": len(sl_rows), "reloads": 0, "death_floor": None, "floor": final_floor, "victory": bool(victory),
                "passed_act1": passed[1], "passed_act2": passed[2]}
    death = predicted[0].get("floor")
    below = lambda act: bool(passed[act]) and boss_floor.get(act) is not None and death is not None and boss_floor[act] < death  # noqa: E731
    return {"sl_rows": len(sl_rows), "reloads": reloads, "death_floor": death, "floor": death, "victory": False,
            "passed_act1": below(1), "passed_act2": below(2)}


def run_metrics(run, fights, floors, boss_entry, calls, sets, sl_rows=()):
    """One run's metrics from its runs row, fights, floors, act-boss entry states ({act: {deck, relics,
    start_strength, max_strength}}) and model calls ([{engine, calls, with_usage, input, cache_hit, output, latency_ms}])."""
    victory = bool(run.get("victory"))
    max_act = run.get("max_act")
    bosses = boss_fights(fights, max_act, victory)
    drinks = nonboss_drinks(fights, bosses)
    low, elites = act1_elites(fights)
    entered2, died2 = died_before_first_rest(floors, run.get("floor"), victory, act=2)
    strength = None
    if 1 in bosses and 1 in boss_entry:
        entry = boss_entry[1]
        strength = strength_sources(entry.get("deck"), entry.get("relics"), entry.get("start_strength"), sets)
        strength["max_strength"] = entry.get("max_strength")
    engines = {}
    for row in calls:
        engine = row.get("engine") or "?"
        into = engines.setdefault(engine, {"calls": 0, "with_usage": 0, "input": 0, "cache_hit": 0, "output": 0, "latency_ms": 0})
        for key in into:
            into[key] += row.get(key) or 0
    total = {key: sum(e[key] for e in engines.values()) for key in ("calls", "with_usage", "input", "cache_hit", "output", "latency_ms")}
    passed = {act: passed_boss(act, max_act, victory, bosses) for act in (1, 2)}
    return {
        "run_id": run["run_id"],
        "ascension": run.get("ascension"),
        "started": run.get("started"),
        "code": run.get("code"),
        "arm": run.get("arm"),
        # The configuration the run started with (logs/run-config.jsonl; config_rows 0: not recorded).
        "brain_label": run.get("brain_label"),
        "knowledge_prefix": run.get("knowledge_prefix"),
        "config_rows": run.get("config_rows") or 0,
        "config_changed": bool(run.get("config_changed")),
        "floor": run.get("floor"),
        "max_act": max_act,
        "victory": victory,
        "passed_act1": passed[1],
        "passed_act2": passed[2],
        "boss_floor": {act: b["floor"] for act, b in sorted(bosses.items())},
        "boss_inferred": sorted(act for act, b in bosses.items() if b["inferred"]),
        "boss_potions": {act: b.get("potions_in") for act, b in sorted(bosses.items())},
        "drinks_nonboss": drinks,
        "drinks_per10": per_ten_floors(drinks, run.get("floor")),
        "potions_at_death": potions_at_death(fights, victory),
        "strength_act1": strength,
        "act1_elites": elites,
        "act1_elites_low": low,
        "entered_act2": entered2,
        "act2_first_rest": first_rest(floors, 2),
        "died_before_act2_rest": died2,
        "llm": total,
        "llm_by_engine": engines,
        # SL (docs/sl.md §5): the first attempts' run next to the final one above.
        "first_attempt": first_attempt(list(sl_rows), run.get("floor"), victory, passed, {act: b["floor"] for act, b in bosses.items()}),
    }


# ---------------------------------------------------------------- statistics


def t_crit(df):
    if df <= 0:
        return None
    if df <= len(T95):
        return T95[df - 1]
    return 2.00 if df <= 60 else 1.98 if df <= 120 else 1.96


def mean_stats(values):
    """{n, mean, median, lo, hi}: 95% Student t interval for the mean (None below 2 values)."""
    xs = [float(v) for v in values if v is not None]
    n = len(xs)
    if n == 0:
        return {"n": 0, "mean": None, "median": None, "lo": None, "hi": None}
    mean = statistics.fmean(xs)
    lo = hi = None
    if n >= 2:
        # Every metric here is a count or an amount: the interval is cut at 0.
        half = t_crit(n - 1) * statistics.stdev(xs) / math.sqrt(n)
        lo, hi = max(0.0, mean - half), mean + half
    return {"n": n, "mean": mean, "median": statistics.median(xs), "lo": lo, "hi": hi}


def wilson(k, n, z=1.96):
    """{k, n, p, lo, hi}: the share and its 95% Wilson score interval."""
    if n == 0:
        return {"k": k, "n": 0, "p": None, "lo": None, "hi": None}
    p = k / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return {"k": k, "n": n, "p": p, "lo": max(0.0, centre - half), "hi": min(1.0, centre + half)}


def summarize(rows):
    """Group summary: the metrics of docs/eval.md over the runs in `rows` (run_metrics outputs)."""
    n = len(rows)
    out = {"runs": n}
    out["floor"] = mean_stats([r["floor"] for r in rows])
    out["passed_act1"] = wilson(sum(r["passed_act1"] for r in rows), n)
    out["passed_act2"] = wilson(sum(r["passed_act2"] for r in rows), n)
    out["win"] = wilson(sum(r["victory"] for r in rows), n)
    out["drinks_per10"] = mean_stats([r["drinks_per10"] for r in rows])
    out["potions_at_death"] = mean_stats([r.get("potions_at_death") for r in rows])
    acts = sorted({1, 2, 3} | {act for r in rows for act in r["boss_potions"]})
    for act in acts:
        out[f"boss_potions_{act}"] = mean_stats([r["boss_potions"].get(act) for r in rows])
    at_boss = [r["strength_act1"] for r in rows if r["strength_act1"] is not None]
    out["strength_act1"] = wilson(sum(s["any"] for s in at_boss), len(at_boss))
    out["strength_parts"] = {part: sum(bool(s[part]) for s in at_boss) for part in ("cards", "relics", "power")}
    out["elite_low_per_run"] = mean_stats([r["act1_elites_low"] for r in rows])
    out["elite_low_share"] = wilson(sum(r["act1_elites_low"] for r in rows), sum(r["act1_elites"] for r in rows))
    entered = [r for r in rows if r["entered_act2"]]
    out["died_before_act2_rest"] = wilson(sum(r["died_before_act2_rest"] for r in entered), len(entered))
    out["llm_calls"] = mean_stats([r["llm"]["calls"] for r in rows])
    # Token sums only for runs whose every call carries usage (deepseek-reasoning.jsonl has it from 2026-09-28 11:03 UTC).
    full = [r for r in rows if r["llm"]["calls"] > 0 and r["llm"]["with_usage"] == r["llm"]["calls"]]
    out["usage_runs"] = len(full)
    for key in ("input", "cache_hit", "output"):
        out[f"llm_{key}"] = mean_stats([r["llm"][key] / 1000 for r in full])
    tin = sum(r["llm"]["input"] for r in full)
    out["cache_hit_rate"] = sum(r["llm"]["cache_hit"] for r in full) / tin if tin else None
    out["llm_minutes"] = mean_stats([r["llm"]["latency_ms"] / 60000 for r in rows])
    out.update(calibration_summary(rows))
    # SL: only when a run of the group has SL rows (else the summary, and its text, are as before SL).
    if any(r.get("first_attempt", {}).get("sl_rows") for r in rows):
        fa = [r["first_attempt"] for r in rows]
        out["sl_runs"] = sum(1 for f in fa if f["sl_rows"])
        out["sl_reloads"] = mean_stats([f["reloads"] for f in fa])
        out["fa_floor"] = mean_stats([f["floor"] for f in fa])
        out["fa_passed_act1"] = wilson(sum(bool(f["passed_act1"]) for f in fa), n)
        out["fa_passed_act2"] = wilson(sum(bool(f["passed_act2"]) for f in fa), n)
        out["fa_win"] = wilson(sum(f["victory"] for f in fa), n)
    calls = sum(r["llm"]["calls"] for r in rows)
    out["llm_seconds_per_call"] = sum(r["llm"]["latency_ms"] for r in rows) / 1000 / calls if calls else None
    engines = sorted({e for r in rows for e in r["llm_by_engine"]})
    out["engines"] = {}
    for engine in engines:
        per = [r["llm_by_engine"].get(engine, {"calls": 0, "with_usage": 0, "input": 0, "cache_hit": 0, "output": 0, "latency_ms": 0}) for r in rows]
        with_usage = [p for p in per if p["calls"] > 0 and p["with_usage"] == p["calls"]]
        out["engines"][engine] = {
            "calls": mean_stats([p["calls"] for p in per]),
            "input": mean_stats([p["input"] / 1000 for p in with_usage]),
            "cache_hit": mean_stats([p["cache_hit"] / 1000 for p in with_usage]),
            "output": mean_stats([p["output"] / 1000 for p in with_usage]),
            "minutes": mean_stats([p["latency_ms"] / 60000 for p in per]),
        }
    return out


def calibration_summary(rows):
    """The three calibration columns over runs that carry a calibration digest (calibration.run_digest), else {}.
    Turns and nodes are pooled over the group's runs (they are not independent: no interval)."""
    digests = [r["calibration"] for r in rows if r.get("calibration") is not None]
    if not digests:
        return {}
    turns = sum(d["turns"] for d in digests)
    within = sum(d["turns_within"] for d in digests)
    near = [e for d in digests for e in d["route_near"]]
    ratios = [x for d in digests for x in d["boss_ratio"]]
    return {
        "cal_turn_within": {"k": within, "n": turns, "p": within / turns if turns else None},
        "cal_route_near": {"n": len(near), "median": statistics.median(near) if near else None,
                           "median_abs": statistics.median(abs(e) for e in near) if near else None},
        "cal_boss_ratio": {"n": len(ratios), "median": statistics.median(ratios) if ratios else None},
    }


def attach_calibration(con, rows, logs, boss_clocks=None, game_data=None):
    """Adds each run's calibration digest (row["calibration"]) from eval/calibration.py."""
    import calibration  # noqa: E402  (imports this module: loaded here, not at the top)

    ids = {row["run_id"] for row in rows}
    runs = [r for r in calibration.load_runs(con) if r["run_id"] in ids]
    clocks = calibration.load_clock_file(boss_clocks) if boss_clocks else None
    data = calibration.collect(con, runs, logs, clocks=clocks, game_data=game_data)
    for row in rows:
        row["calibration"] = calibration.run_digest(data, row["run_id"])
    return data


# ---------------------------------------------------------------- code versions


class Git:
    """Read-only git queries on the repository."""

    def __init__(self, root=ROOT):
        self.root = root

    def _run(self, *args, stdin=None):
        done = subprocess.run(["git", "-C", self.root, *args], input=stdin, capture_output=True, text=True, check=False)
        return done.stdout if done.returncode == 0 else None

    def resolve(self, names):
        """{name: full commit hash or None} for commit names (short hashes, tags)."""
        names = [n for n in dict.fromkeys(names) if n]
        if not names:
            return {}
        out = self._run("cat-file", "--batch-check=%(objectname) %(objecttype)", stdin="".join(f"{n}^{{commit}}\n" for n in names)) or ""
        result = {}
        for name, line in zip(names, out.splitlines()):
            parts = line.split()
            result[name] = parts[0] if len(parts) == 2 and parts[1] == "commit" else None
        return result

    def descendants(self, commit):
        """The commit and every commit reachable from a ref that has it as an ancestor."""
        out = self._run("rev-list", "--ancestry-path", f"^{commit}", "--all") or ""
        return set(out.split()) | {commit}

    def reachable(self):
        return set((self._run("rev-list", "--all") or "").split())

    def is_ancestor(self, ancestor, commit):
        done = subprocess.run(["git", "-C", self.root, "merge-base", "--is-ancestor", ancestor, commit], capture_output=True, check=False)
        return done.returncode == 0

    def commit_time(self, commit):
        out = self._run("log", "-1", "--format=%cI", commit)
        return dt.datetime.fromisoformat(out.strip()) if out else None


def strip_code(code):
    return code.split("+", 1)[0] if isinstance(code, str) and code else None


class VersionMap:
    """Runs -> named versions (eval/versions.json): the last entry whose commit is an ancestor of the run's
    code commit. A code git does not know (or a run without one) goes by time: the last entry committed before
    the run started."""

    def __init__(self, entries, git):
        self.git = git
        self.entries = []
        # An entry without a commit is announced but not live yet (V4: "filled in when it goes live"): skipped.
        self.pending = [e["name"] for e in entries if not e.get("commit")]
        entries = [e for e in entries if e.get("commit")]
        full = git.resolve([e["commit"] for e in entries])
        for entry in entries:
            commit = full.get(entry["commit"])
            if commit is None:
                raise ValueError(f"versions.json: commit {entry['commit']} ({entry['name']}) is not in this repository")
            self.entries.append(dict(entry, full=commit, family=entry.get("family", entry["name"]),
                                     descendants=git.descendants(commit), time=git.commit_time(commit)))
        self.before = {"name": f"before {self.entries[0]['name']}", "family": f"before {self.entries[0]['name']}"} if self.entries else {"name": "all", "family": "all"}
        self._reachable = None
        self._resolved = {}
        self._cache = {}

    def assign(self, code, started):
        """(entry, how): how = "git" (ancestry of the code commit) or "time" (no usable code)."""
        commit = strip_code(code)
        if commit and commit not in self._resolved:
            self._resolved[commit] = self.git.resolve([commit]).get(commit)
        full = self._resolved.get(commit) if commit else None
        if full is not None:
            if full not in self._cache:
                self._cache[full] = self._by_ancestry(full)
            return self._cache[full], "git"
        return self._by_time(started), "time"

    def _by_ancestry(self, full):
        if self._reachable is None:
            self._reachable = self.git.reachable()
        for entry in reversed(self.entries):
            inside = full in entry["descendants"] if full in self._reachable else self.git.is_ancestor(entry["full"], full)
            if inside:
                return entry
        return self.before

    def _by_time(self, started):
        if started is None:
            return self.before
        when = started if started.tzinfo else started.replace(tzinfo=dt.timezone.utc)
        chosen = self.before
        for entry in self.entries:
            if entry["time"] is not None and entry["time"] <= when:
                chosen = entry
        return chosen


def load_versions(path=VERSIONS_FILE):
    with open(path, encoding="utf8") as handle:
        return json.load(handle)["versions"]


# ---------------------------------------------------------------- Strength source sets


def strength_sets(path=None, game_data=None):
    """{"cards": set, "relics": set}: from a JSON file ({"cards": [...], "relics": [...]}) or, by default, from
    eval/strength-sources.ts (the deck profile's test over the game data). Fails rather than returning
    empty sets."""
    if path:
        with open(path, encoding="utf8") as handle:
            data = json.load(handle)
    else:
        env = dict(os.environ, PATH=os.path.expanduser("~/.local/node/bin") + os.pathsep + os.environ.get("PATH", ""))
        tsx = os.path.join(ROOT, "agent", "node_modules", ".bin", "tsx")
        args = [tsx, os.path.join(HERE, "strength-sources.ts")] + ([game_data] if game_data else [])
        done = subprocess.run(args, cwd=ROOT, env=env, capture_output=True, text=True, check=False)
        if done.returncode != 0:
            raise RuntimeError(f"eval/strength-sources.ts failed: {done.stderr.strip()[:500]}")
        data = json.loads(done.stdout)
    if not data.get("cards") or not data.get("relics"):
        raise RuntimeError("Strength source sets are empty")
    return {"cards": set(data["cards"]), "relics": set(data["relics"]), "source": data.get("source"), "mod_version": data.get("mod_version")}


# ---------------------------------------------------------------- database


RUNS_SQL = """
SELECT run_id, ascension, character, started, ended, floor, max_floor, max_act, victory, code, arm,
       brain_label, knowledge_prefix, config_rows, config_changed
FROM runs WHERE finished AND started IS NOT NULL ORDER BY started
"""
FIGHTS_SQL = """
SELECT run_id, fight_no, act, floor, room, entry_hp, max_hp, outcome, coalesce(len(potions_in), 0) AS potions_in,
       potions_n, first_off, last_off
FROM fights WHERE list_contains(?, run_id)
"""
FLOORS_SQL = "SELECT run_id, floor, act, room_node FROM floors WHERE list_contains(?, run_id)"
# The deck, relics and player Strength on a fight's first combat frame, and the most Strength during it.
ENTRY_SQL = """
WITH s AS (SELECT unnest(?::VARCHAR[]) AS run_id, unnest(?::INTEGER[]) AS act, unnest(?::BIGINT[]) AS lo, unnest(?::BIGINT[]) AS hi),
f AS (
  SELECT s.run_id, s.act, f.off, f.deck, f.relics,
         coalesce(list_max([p.amount FOR p IN f.player_powers IF p.id = 'STRENGTH_POWER']), 0) AS strength
  FROM s JOIN frames f ON f.run_id = s.run_id AND f.off BETWEEN s.lo AND s.hi
  WHERE f.screen = 'COMBAT' AND f.enemies IS NOT NULL
)
SELECT run_id, act, arg_min(deck, off) AS deck, arg_min(relics, off) AS relics, arg_min(strength, off) AS start_strength,
       max(strength) AS max_strength
FROM f GROUP BY run_id, act
"""
# SL attempts (docs/sl.md §5): one row per attempt at a boss or listed-elite fight, in log order.
SL_SQL = "SELECT run_id, off, floor, attempt, result, reload_ok FROM sl_attempts WHERE list_contains(?, run_id) ORDER BY off"
CALLS_SQL = """
SELECT run_id, coalesce(engine, '?') AS engine, count(*) AS calls, count(input_tokens) AS with_usage,
       coalesce(sum(input_tokens), 0) AS input, coalesce(sum(cache_hit_tokens), 0) AS cache_hit,
       coalesce(sum(output_tokens), 0) AS output, coalesce(sum(latency_ms), 0) AS latency_ms
FROM llm_calls WHERE NOT duplicate AND list_contains(?, run_id) GROUP BY ALL
"""


def dicts(cursor):
    columns = [d[0] for d in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def as_utc(value):
    """A --since/--until time: ISO, UTC unless it carries an offset; returned naive UTC (the database's clock)."""
    if value is None:
        return None
    when = dt.datetime.fromisoformat(value)
    if when.tzinfo is not None:
        when = when.astimezone(dt.timezone.utc).replace(tzinfo=None)
    return when


def load_runs(con, sets, ascensions=None, since=None, until=None, character=None, characters=None):
    """run_metrics for every finished run (with frames) in the filters, oldest first. `character`: that character's
    runs alone (a knowledge id; None: every one); `characters` (a dict) gets each kept run's character id (kept out of
    the run's metrics, so the per-run output is as before)."""
    runs = [r for r in dicts(con.execute(RUNS_SQL))
            if (not ascensions or r["ascension"] in ascensions) and (since is None or r["started"] >= since) and (until is None or r["started"] < until)
            and (character is None or run_character(r) == character)]
    if characters is not None:
        characters.update({r["run_id"]: run_character(r) for r in runs})
    ids = [r["run_id"] for r in runs]
    by = {rid: {"fights": [], "floors": [], "entry": {}, "calls": [], "sl": []} for rid in ids}
    if ids:
        for row in dicts(con.execute(FIGHTS_SQL, [ids])):
            by[row["run_id"]]["fights"].append(row)
        for row in dicts(con.execute(FLOORS_SQL, [ids])):
            by[row["run_id"]]["floors"].append(row)
        for row in dicts(con.execute(CALLS_SQL, [ids])):
            by[row["run_id"]]["calls"].append(row)
        for row in sl_rows(con, ids):
            by[row["run_id"]]["sl"].append(row)
        spans = []
        for run in runs:
            for act, boss in boss_fights(by[run["run_id"]]["fights"], run["max_act"], run["victory"]).items():
                spans.append((run["run_id"], act, boss["first_off"], boss["last_off"]))
        if spans:
            cols = [list(c) for c in zip(*spans)]
            for row in dicts(con.execute(ENTRY_SQL, cols)):
                by[row["run_id"]]["entry"][row["act"]] = row
    return [run_metrics(run, by[run["run_id"]]["fights"], by[run["run_id"]]["floors"], by[run["run_id"]]["entry"], by[run["run_id"]]["calls"], sets, by[run["run_id"]]["sl"])
            for run in runs]


def sl_rows(con, ids):
    """The SL attempt rows of these runs; none when the database has no sl_attempts view yet (synced before SL)."""
    try:
        return dicts(con.execute(SL_SQL, [ids]))
    except Exception as error:  # duckdb.CatalogException: a database whose views predate SL
        if "sl_attempts" in str(error):
            return []
        raise


# ---------------------------------------------------------------- grouping and output


def local_day(started):
    when = started if started.tzinfo else started.replace(tzinfo=dt.timezone.utc)
    return when.astimezone(LOCAL).date().isoformat()


def config_label(row):
    """The configuration part of a --group-by config key: the brain setup (engines and models) and the knowledge
    prefix the run started with; "未记录配置" for runs without a run-config.jsonl row (before V4)."""
    if not row.get("config_rows"):
        return "未记录配置"
    label = f"{row.get('brain_label') or '?'} · 知识前缀 {row.get('knowledge_prefix') or '?'}"
    return label + (" · 局中改过配置" if row.get("config_changed") else "")


def group_runs(rows, how, versions=None, characters=None):
    """[(group name, rows)] in group order: versions in versions.json order, the rest by name / first run.
    `characters`: run id -> character id (--group-by character; a run not in it is the Ironclad's)."""
    groups, order = {}, {}
    for row in rows:
        if how in ("version", "family", "config"):
            entry, row["version_how"] = versions.assign(row["code"], row["started"])
            row["version"] = entry["name"]
            key = entry["family" if how == "family" else "name"]
            if how == "config":
                key = f"{key} · {config_label(row)}"
            rank = -1 if entry is versions.before else next(i for i, e in enumerate(versions.entries) if e["name"] == entry["name"])
            if row.get("arm"):
                key = f"{key} [arm {row['arm']}]"
            order.setdefault(key, (rank, row["started"]))
        elif how == "commit":
            key = strip_code(row["code"]) or "(no code)"
            order.setdefault(key, (0, row["started"]))
        elif how == "ascension":
            key = f"A{row['ascension']}" if row["ascension"] is not None else "进阶未知"
            order.setdefault(key, (row["ascension"] if row["ascension"] is not None else -1, row["started"]))
        elif how == "character":
            key = (characters or {}).get(row["run_id"]) or "ironclad"
            order.setdefault(key, (0, row["started"]))
        elif how == "day":
            key = local_day(row["started"])
            order.setdefault(key, (0, key))
        else:
            raise ValueError(f"unknown --group-by {how}")
        if how != "character" and len(set((characters or {}).values())) > 1:
            key = f"{(characters or {}).get(row['run_id'], 'ironclad')} · {key}"
            order.setdefault(key, order.get(key.split(" · ", 1)[1], (0, row["started"])))
        groups.setdefault(key, []).append(row)
    return [(key, groups[key]) for key in sorted(groups, key=lambda k: order[k])]


def num(x, digits=2):
    return "—" if x is None else f"{x:.{digits}f}"


def fmt_mean(s, min_n, digits=2):
    if not s["n"]:
        return "—"
    ci = f"；CI {num(s['lo'], digits)}–{num(s['hi'], digits)}" if s["lo"] is not None else ""
    flag = " *" if s["n"] < min_n else ""
    return f"{num(s['mean'], digits)}（中位 {num(s['median'], digits)}{ci}；n={s['n']}）{flag}"


def fmt_rate(s, min_n):
    if not s["n"]:
        return "—"
    flag = " *" if s["n"] < min_n else ""
    return f"{s['p'] * 100:.0f}%（{s['k']}/{s['n']}；CI {s['lo'] * 100:.0f}–{s['hi'] * 100:.0f}%）{flag}"


def metric_lines(summary, min_n):
    """[(label, text)] for one group's summary."""
    lines = [("局数", str(summary["runs"]) + (" *" if summary["runs"] < min_n else ""))]
    lines.append(("终层", fmt_mean(summary["floor"], min_n, 1)))
    lines.append(("过一幕 boss", fmt_rate(summary["passed_act1"], min_n)))
    lines.append(("过二幕 boss", fmt_rate(summary["passed_act2"], min_n)))
    lines.append(("胜局", fmt_rate(summary["win"], min_n)))
    lines.append(("非 boss 战喝药 / 10 层", fmt_mean(summary["drinks_per10"], min_n)))
    for key in sorted(k for k in summary if k.startswith("boss_potions_")):
        lines.append((f"进{'一二三四'[int(key.rsplit('_', 1)[1]) - 1]}幕 boss 带药（瓶）", fmt_mean(summary[key], min_n)))
    if "potions_at_death" in summary:
        lines.append(("死时手里的药（瓶，输的局）", fmt_mean(summary["potions_at_death"], min_n)))
    parts = summary["strength_parts"]
    strength = fmt_rate(summary["strength_act1"], min_n)
    if summary["strength_act1"]["n"]:
        strength += f"；牌 {parts['cards']} / 遗物 {parts['relics']} / 开场有力量 {parts['power']}"
    lines.append(("一幕 boss 有力量来源", strength))
    elite = fmt_mean(summary["elite_low_per_run"], min_n)
    if summary["elite_low_share"]["n"]:
        elite += f"；占一幕精英战 {summary['elite_low_share']['k']}/{summary['elite_low_share']['n']}"
    lines.append((f"一幕精英进场血量 < {ELITE_HP_SHARE:.0%} 次数 / 局", elite))
    lines.append(("二幕第一个休息点前死亡（占进二幕的局）", fmt_rate(summary["died_before_act2_rest"], min_n)))
    lines.append(("大脑调用 / 局", fmt_mean(summary["llm_calls"], min_n, 1)))
    # n of the token lines = runs whose every call carries usage.
    lines.append(("输入 token / 局（千）", fmt_mean(summary["llm_input"], min_n, 0)))
    lines.append(("缓存命中 token / 局（千）", fmt_mean(summary["llm_cache_hit"], min_n, 0)))
    lines.append(("输出 token / 局（千）", fmt_mean(summary["llm_output"], min_n, 1)))
    lines.append(("缓存命中率", "—" if summary["cache_hit_rate"] is None else f"{summary['cache_hit_rate'] * 100:.0f}%"))
    lines.append(("大脑耗时 / 局（分钟）", fmt_mean(summary["llm_minutes"], min_n, 1)))
    lines.append(("每次调用平均耗时（秒）", num(summary["llm_seconds_per_call"], 1)))
    for engine, e in summary["engines"].items():
        lines.append((f"  {engine}：调用 / 局", fmt_mean(e["calls"], min_n, 1)))
        lines.append((f"  {engine}：输入 / 命中 / 输出（千 token / 局）",
                      f"{num(e['input']['mean'], 0)} / {num(e['cache_hit']['mean'], 0)} / {num(e['output']['mean'], 1)}（n={e['input']['n']}）"))
        lines.append((f"  {engine}：耗时 / 局（分钟）", fmt_mean(e["minutes"], min_n, 1)))
    if summary.get("sl_runs"):
        # SL (docs/sl.md §5): the rows above are the final results (after reloads); these are the first attempts'.
        lines.append(("SL：有 SL 记录的局", f"{summary['sl_runs']}/{summary['runs']}"))
        lines.append(("SL：重打次数 / 局", fmt_mean(summary["sl_reloads"], min_n, 2)))
        lines.append(("第一次尝试：终层", fmt_mean(summary["fa_floor"], min_n, 1)))
        lines.append(("第一次尝试：过一幕 boss", fmt_rate(summary["fa_passed_act1"], min_n)))
        lines.append(("第一次尝试：过二幕 boss", fmt_rate(summary["fa_passed_act2"], min_n)))
        lines.append(("第一次尝试：胜局", fmt_rate(summary["fa_win"], min_n)))
    # Calibration (eval/calibration.py): pooled over the group's turns, route nodes and boss fights.
    turn = summary.get("cal_turn_within")
    lines.append(("校准：推演本回合掉血 ±2 内（回合）", "—" if not turn or not turn["n"] else f"{turn['p'] * 100:.0f}%（{turn['k']}/{turn['n']} 回合）"))
    near = summary.get("cal_route_near")
    lines.append(("校准：路线投影 2–3 层误差（投影 − 实际）", "—" if not near or not near["n"] else
                  f"中位 {round(near['median'], 1) + 0.0:+.1f}，中位 |误差| {near['median_abs']:.1f}（n={near['n']}）" + (" *" if near["n"] < min_n else "")))
    boss = summary.get("cal_boss_ratio")
    lines.append(("校准：boss 时钟 实打/估值 中位", "—" if not boss or not boss["n"] else
                  f"{boss['median']:.2f}（n={boss['n']} 场）" + (" *" if boss["n"] < min_n else "")))
    return lines


def render(groups, min_n, markdown):
    summaries = [(name, metric_lines(summarize(rows), min_n)) for name, rows in groups]
    if not summaries:
        return "（没有符合条件的已结束对局）\n"
    if not markdown:
        out = []
        for name, lines in summaries:
            out.append(f"== {name} ==")
            out += [f"  {label}: {text}" for label, text in lines]
            out.append("")
        return "\n".join(out)
    labels = []
    for _, lines in summaries:
        for label, _ in lines:
            if label not in labels:
                labels.append(label)
    table = ["| 指标 | " + " | ".join(name for name, _ in summaries) + " |", "|---|" + "---|" * len(summaries)]
    for label in labels:
        cells = [dict(lines).get(label, "—") for _, lines in summaries]
        table.append(f"| {label} | " + " | ".join(c.replace("|", "\\|") for c in cells) + " |")
    return "\n".join(table) + "\n"


def render_runs(rows, markdown):
    head = ["run", "版本", "code", "A", "开始（UTC+8）", "终层", "过幕", "非boss喝药/10层", "boss 带药", "boss 层", "一幕boss力量（牌/遗物/开场）",
            "一幕精英<78%", "二幕首个休息点", "大脑调用", "token 入/中/出（千）", "耗时（分）", "配置"]
    body = []
    for r in rows:
        s = r["strength_act1"]
        strength = "—" if s is None else f"{'是' if s['any'] else '否'}（{','.join(s['cards']) or '-'} / {','.join(s['relics']) or '-'} / {'有' if s['power'] else '无'}）"
        passed = "胜" if r["victory"] else ("过二幕" if r["passed_act2"] else ("过一幕" if r["passed_act1"] else "一幕"))
        rest = "—" if not r["entered_act2"] else (f"F{r['act2_first_rest']}" if r["act2_first_rest"] else "无") + ("，之前死" if r["died_before_act2_rest"] else "")
        llm = r["llm"]
        tokens = f"{llm['input'] / 1000:.0f}/{llm['cache_hit'] / 1000:.0f}/{llm['output'] / 1000:.0f}" + ("" if llm["with_usage"] == llm["calls"] else "（缺）")
        body.append([r["run_id"], r.get("version", ""), r["code"] or "", str(r["ascension"]), r["started"].replace(tzinfo=dt.timezone.utc).astimezone(LOCAL).strftime("%m-%d %H:%M"),
                     str(r["floor"]), passed, num(r["drinks_per10"], 1), "/".join(str(v) for v in r["boss_potions"].values()) or "—",
                     "/".join(f"F{v}" for v in r["boss_floor"].values()) + ("（推断 " + ",".join(map(str, r["boss_inferred"])) + "）" if r["boss_inferred"] else ""),
                     strength, f"{r['act1_elites_low']}/{r['act1_elites']}", rest, str(llm["calls"]), tokens, f"{llm['latency_ms'] / 60000:.1f}",
                     config_label(r)])
    # SL (docs/sl.md §5): one more column when a run has SL rows: the reloads and the first attempts' final floor.
    if any(r.get("first_attempt", {}).get("sl_rows") for r in rows):
        head.append("SL 重打 / 第一次尝试终层")
        for r, row in zip(rows, body):
            fa = r["first_attempt"]
            row.append("—" if not fa["sl_rows"] else f"{fa['reloads']} / F{fa['floor']}" + ("（胜）" if fa["victory"] else ""))
    if markdown:
        return "\n".join(["| " + " | ".join(head) + " |", "|" + "---|" * len(head)] + ["| " + " | ".join(row) + " |" for row in body]) + "\n"
    return "\n".join(["\t".join(head)] + ["\t".join(row) for row in body]) + "\n"


def plain(value):
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    if isinstance(value, set):
        return sorted(value)
    if isinstance(value, dict):
        return {str(k): plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [plain(v) for v in value]
    return value


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ascension", type=int, action="append", help="only this ascension (repeatable)")
    parser.add_argument("--since", help="runs started at or after this time (ISO; UTC unless it has an offset)")
    parser.add_argument("--until", help="runs started before this time")
    parser.add_argument("--character", default=env_character(), help="only this character's runs (knowledge id, e.g. silent; default: $CHARACTER, else all)")
    parser.add_argument("--group-by", default="version", choices=["version", "family", "config", "commit", "ascension", "character", "day"],
                        help="config = version + brain engines/models + knowledge prefix (logs/run-config.jsonl)")
    parser.add_argument("--md", action="store_true", help="markdown table (metrics x groups)")
    parser.add_argument("--json", action="store_true", help="per-run metrics and group summaries as JSON")
    parser.add_argument("--per-run", action="store_true", help="also list every run")
    parser.add_argument("--total", action="store_true", help="add a group with every selected run")
    parser.add_argument("--min-n", type=int, default=MIN_N, help="groups below this many runs are marked * (too few to read)")
    parser.add_argument("--versions", default=VERSIONS_FILE)
    parser.add_argument("--strength-sets", help='JSON {"cards": [...], "relics": [...]} instead of eval/strength-sources.ts')
    parser.add_argument("--game-data", help="game data for strength-sources.ts and the boss clock (default .cache/game-data.json)")
    parser.add_argument("--db", default=None)
    parser.add_argument("--logs", default=None)
    parser.add_argument("--no-sync", action="store_true", help="do not bring the log database up to date first")
    parser.add_argument("--no-calibration", action="store_true", help="leave out the calibration columns (eval/calibration.py)")
    parser.add_argument("--boss-clocks", help="calibration: JSONL of boss-clock-recompute.ts output instead of recomputing")
    parser.add_argument("--include-non-codex", action="store_true", help="explicit raw performance cohort including DeepSeek/mixed/unknown; costs always retain every run")
    args = parser.parse_args(argv)

    import query as logquery  # noqa: E402  (needs duckdb: run with .cache/logdb-venv/bin/python)
    import sync as logsync  # noqa: E402

    db = os.path.abspath(args.db or os.environ.get("LOGDB_DIR", logsync.DEFAULT_DB))
    logs = os.path.abspath(args.logs or os.environ.get("LOGDB_LOGS", logsync.DEFAULT_LOGS))
    logsync.be_gentle()
    if not args.no_sync:
        logsync.sync(logs, db, quiet=True, wait=True)
    sets = strength_sets(args.strength_sets, args.game_data)
    with logsync.read_lock(db, shared=True):
        con = logquery.connect(db, threads=2)
        characters = {}
        rows = load_runs(con, sets, set(args.ascension or []), as_utc(args.since), as_utc(args.until), character_key(args.character), characters)
        if not args.no_calibration:
            attach_calibration(con, rows, logs, args.boss_clocks, args.game_data)
    versions = VersionMap(load_versions(args.versions), Git()) if args.group_by in ("version", "family", "config") or args.per_run or args.json else None
    if versions is not None and args.group_by not in ("version", "family", "config"):
        for row in rows:
            entry, row["version_how"] = versions.assign(row["code"], row["started"])
            row["version"] = entry["name"]
    for row in rows:
        row["character"] = characters.get(row["run_id"]) or run_character(row)
        characters[row["run_id"]] = row["character"]
    brain_source.annotate(rows, brain_source.load_sources(logs, [r["run_id"] for r in rows]))
    raw_rows = rows
    raw_characters = {c: [r for r in raw_rows if r["character"] == c] for c in sorted(set(characters.values()))}
    rows = [r for r in raw_rows if brain_source.eligible(r, args.include_non_codex)]
    groups = group_runs(rows, args.group_by, versions, characters)
    if args.total and rows:
        totals = {c: [r for r in rows if r["character"] == c] for c in sorted({r["character"] for r in rows})}
        groups.extend((("全部" if len(totals) == 1 else f"全部 · {c}"), rs) for c, rs in totals.items())
    if args.json:
        print(json.dumps({"groups": [{"name": name, "run_ids": [r["run_id"] for r in rs], "summary": plain(summarize(rs))} for name, rs in groups],
                          "runs": plain(raw_rows), "performance_policy": brain_source.POLICY,
                          "include_non_codex": args.include_non_codex, "raw_cohorts": brain_source.cohorts(raw_rows),
                          "excluded_run_ids": [r["run_id"] for r in raw_rows if not brain_source.eligible(r, args.include_non_codex)],
                          "all_run_usage_summary": plain(summarize(raw_rows)),
                          "raw_cohorts_by_character": {c: brain_source.cohorts(rs) for c, rs in raw_characters.items()},
                          "raw_usage_by_character": {c: plain(summarize(rs)) for c, rs in raw_characters.items()},
                          "strength_sets": {"cards": sorted(sets["cards"]), "relics": sorted(sets["relics"])}},
                         ensure_ascii=False, indent=1))
        return 0
    sys.stdout.write(f"战绩口径：{brain_source.POLICY}；{'显式包含非 Codex 局' if args.include_non_codex else '仅有成功 Codex 脑题且无其他成功引擎的局'}。原始 {len(raw_rows)} 局，纳入 {len(rows)} 局；旧报告保留。\n\n")
    sys.stdout.write(render(groups, args.min_n, args.md))
    sys.stdout.write("\n来源原始成绩（不影响费用、用量或学习证据）：\n")
    for character, rs in raw_characters.items():
        for source, cohort in brain_source.cohorts(rs).items():
            sys.stdout.write(f"{character}/{source}: {cohort['runs']} 局 / {cohort['wins']} 胜\n")
    sys.stdout.write("\n全部原始局费用/用量口径：\n" + render([(f"原始全部 {c}（含非 Codex）", rs) for c, rs in raw_characters.items()], args.min_n, args.md))
    if args.min_n > 1 and any(len(rs) < args.min_n for _, rs in groups):
        sys.stdout.write(f"\n* 局数 < {args.min_n}（或该指标的 n < {args.min_n}）：样本不足，区间只作参考。\n")
    if args.per_run:
        sys.stdout.write("\n" + render_runs(raw_rows, args.md))
        for r in raw_rows:
            source = r["brain_source"]
            sys.stdout.write(f"{r['run_id']}: {source['source']} / {source['exclusion_reason'] or 'included'} / {json.dumps(source['successful_answers'])}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
