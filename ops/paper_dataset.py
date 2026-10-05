#!/usr/bin/env python3
"""Build the reproducible research dataset for the jev-sts2 paper.

Usage:  python3 ops/paper_dataset.py [--no-raw]

Reads (never writes) jev-sts2/logs/, jev-sts2 git history, notes/ and ops/autoplay.log.
Writes paper/data/*.csv, paper/data/summary.json, paper/data/README.md, the per-ascension learning curves
paper/data/learning-curve-<character>.csv (eval/learning-curve.py, with the learning ledger) and (unless --no-raw)
paper/raw/ gzip snapshots + SHA256SUMS.

Python 3 stdlib only. Large files are streamed line by line. The live autoplay loop may still be
appending to the logs, so the script first records the byte size of every append-only JSONL file
and reads / copies only up to that offset: the derived tables and the raw snapshot describe the
same cut. Re-running overwrites every output.
"""
import collections
import csv
import datetime as dt
import gzip
import hashlib
import io
import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import tarfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import LOGS, ROOT  # noqa: E402
sys.path.insert(0, os.path.join(ROOT, "knowledge", "builders"))
from characters import run_character  # noqa: E402
JEV = ROOT  # the one repo since 2026-10-04 (code history included, hashes kept)
NOTES = os.path.join(ROOT, "notes")
AUTOPLAY = os.path.join(ROOT, "ops/autoplay.log")
OUT = os.path.join(ROOT, "paper")
DATA = os.path.join(OUT, "data")
RAW = os.path.join(OUT, "raw")

LOCAL_TZ = dt.timezone(dt.timedelta(hours=8))  # console file names and autoplay.log use UTC+8
# DeepSeek (deepseek-flash, peak rates, USD per million tokens). The earlier deepseek-chat era is
# priced the same (flash pricing) by assumption.
DS_MISS, DS_HIT, DS_OUT = 0.30, 0.006, 1.20
JEV_PRICE = 0.042  # USD per million tokens, input + output (handoff estimate for jev-1.13 via OpenRouter)
UPSTREAM_AUTHOR = "DiscreteTom"
RUN_ID_RE = re.compile(r"^[0-9A-Z]{12}$")
KEY_RE = re.compile(r"(?<![A-Za-z])sk-[A-Za-z0-9_-]{12,}")

JSONL_SOURCES = ["decisions.jsonl", "deepseek-reasoning.jsonl", "runs.jsonl", "states.jsonl", "fight-plans.jsonl", "run-plans.jsonl"]


# ---------------------------------------------------------------- helpers
def parse_ts(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def iso(t):
    return t.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z" if t else ""


def iter_jsonl(path, limit):
    """Yield parsed objects from the first `limit` bytes of a JSONL file (skips bad/partial lines)."""
    with open(path, "rb") as fh:
        read = 0
        for raw in fh:
            read += len(raw)
            if read > limit:
                break
            raw = raw.strip()
            if not raw:
                continue
            try:
                yield json.loads(raw)
            except json.JSONDecodeError:
                continue


def median(xs):
    return statistics.median(xs) if xs else None


def rnd(x, n=4):
    return round(x, n) if isinstance(x, float) else x


def decider(r):
    """Same attribution as ops/stats.py: plan-continue steps credit whoever chose the plan."""
    lab, rat = r.get("label", ""), r.get("rationale", "") or ""
    if lab == "combat/plan-continue":
        for key, name in (("Jev-chosen", "jev-plan"), ("DeepSeek-chosen", "deepseek-plan"), ("Claude-chosen", "claude-plan")):
            if key in rat:
                return name
        return "code"
    if r.get("decider"):
        return r["decider"]
    # Records before the `decider` field existed: infer.
    esc = r.get("escalation")
    if esc:
        return esc.get("by") or "deepseek"
    if r.get("questions"):
        return "code-fallback" if r.get("fallback") else "jev"
    return "code"


def run_of_fp(fp):
    try:
        return json.loads(fp).get("run") or None
    except Exception:
        return None


def write_csv(path, header, rows):
    with open(path, "w", newline="", encoding="utf8") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        for row in rows:
            w.writerow(["" if row.get(h) is None else row.get(h) for h in header])
    return len(rows)


DECIDERS = ["code", "jev", "deepseek", "claude", "code-fallback", "jev-plan", "deepseek-plan", "claude-plan"]


# ---------------------------------------------------------------- 0. cut
def snapshot_limits():
    return {name: os.path.getsize(os.path.join(LOGS, name)) for name in JSONL_SOURCES if os.path.exists(os.path.join(LOGS, name))}


# ---------------------------------------------------------------- 1. decisions
def load_decisions(limit):
    runs = collections.OrderedDict()
    label_counts = collections.Counter()
    esc_rows = []
    totals = {"records": 0, "play": 0, "shadow": 0, "unattributed_play": 0, "unattributed_labels": collections.Counter(),
              "decider_inferred": 0}
    for r in iter_jsonl(os.path.join(LOGS, "decisions.jsonl"), limit):
        totals["records"] += 1
        rid = run_of_fp(r.get("fingerprint"))
        mode = r.get("mode")
        if rid and rid != "run_unknown":
            run = runs.setdefault(rid, {"first": None, "last": None, "n": 0, "n_shadow": 0, "dec": collections.Counter(),
                                        "jev_calls": 0, "jev_in": 0, "jev_out": 0, "floors": [], "esc": [],
                                        "jev_lat": [], "decider_inferred": 0})
        else:
            run = None
        if mode != "play":
            totals["shadow"] += 1
            if run is not None:
                run["n_shadow"] += 1
            continue
        totals["play"] += 1
        if run is None:
            totals["unattributed_play"] += 1
            totals["unattributed_labels"][r.get("label")] += 1
            continue
        ts = r["ts"]
        run["first"] = run["first"] or ts
        run["last"] = ts
        run["n"] += 1
        who = decider(r)
        if not r.get("decider"):
            run["decider_inferred"] += 1
            totals["decider_inferred"] += 1
        run["dec"][who] += 1
        if r.get("floor") is not None:
            run["floors"].append(r["floor"])
        usage = r.get("usage") or {}
        if (usage.get("input_tokens") or 0) > 0:
            run["jev_calls"] += 1
            run["jev_in"] += usage.get("input_tokens") or 0
            run["jev_out"] += usage.get("output_tokens") or 0
            lat = (r.get("latency_ms") or {}).get("jev")
            if lat:
                run["jev_lat"].append(lat)
        label = r.get("label") or ""
        label_counts[(rid, label.split("/")[0], label.split("+")[0], who)] += 1
        e = r.get("escalation")
        if e:
            by = e.get("by") or "deepseek"
            choice = e.get("choice", e.get("deepseek_choice"))
            has_split = "input_tokens" in e
            inp, hit, out = e.get("input_tokens"), e.get("cache_hit_tokens"), e.get("output_tokens")
            if by == "deepseek":
                if has_split:
                    cost = ((inp - (hit or 0)) * DS_MISS + (hit or 0) * DS_HIT + (out or 0) * DS_OUT) / 1e6
                else:  # early records: only a total; priced as uncached input
                    cost = (e.get("tokens") or 0) * DS_MISS / 1e6
            else:
                cost = None
            if "memory_chars" in e:
                variant = "deepseek_memory"
            elif by == "claude":
                variant = "claude"
            elif e.get("effort") or "reasoning_tokens" in e:
                variant = "deepseek_thinking"
            else:
                variant = "deepseek_nonthinking"
            row = {
                "ts": ts, "run_id": rid, "floor": r.get("floor"), "turn": r.get("turn"), "screen": r.get("screen"),
                "label": label, "decider": who, "by": by, "by_recorded": 1 if e.get("by") else 0, "variant": variant,
                "jev_choice": e.get("jev_choice"), "jev_confidence": e.get("jev_confidence"),
                "choice": choice, "agreed": int(choice == e.get("jev_choice")),
                "guard": e.get("guard"), "used_choice": e.get("used_choice"),
                "final_choice": e.get("used_choice") if e.get("guard") else choice,
                "effort": e.get("effort"), "latency_ms": e.get("latency_ms"),
                "total_tokens": e.get("tokens"), "input_tokens": inp, "cache_hit_tokens": hit, "output_tokens": out,
                "reasoning_tokens": e.get("reasoning_tokens"), "token_split_recorded": int(has_split),
                "cost_usd": rnd(cost, 6) if cost is not None else None,
                "guide": e.get("guide"), "handbook": e.get("handbook"), "memory_chars": e.get("memory_chars"),
                "reason": (e.get("reason") or "").replace("\n", " "),
            }
            esc_rows.append(row)
            run["esc"].append(row)
    return runs, label_counts, esc_rows, totals


# ---------------------------------------------------------------- 1b. fight plans (FIGHT_PLAN=v1)
def load_fight_plans(limit):
    """One row per DeepSeek fight-plan request (logs/fight-plans.jsonl, from d98b0a8 on)."""
    path = os.path.join(LOGS, "fight-plans.jsonl")
    rows = []
    if not os.path.exists(path):
        return rows
    for r in iter_jsonl(path, limit):
        plan = r.get("plan") or {}
        inp, hit, out = r.get("input_tokens"), r.get("cache_hit_tokens"), r.get("output_tokens")
        cost = None
        if inp is not None and out is not None:
            hit = hit or 0
            cost = ((inp - hit) * DS_MISS + hit * DS_HIT + out * DS_OUT) / 1e6
        rows.append({
            "ts": r.get("ts"), "run_id": r.get("run"), "fight": r.get("fight"), "floor": r.get("floor"),
            "turn": r.get("turn"), "kind": r.get("kind"), "enemies": " ".join(r.get("enemies") or plan.get("enemyIds") or []),
            "ok": int(bool(plan)), "error": r.get("error") or "", "replans": plan.get("replans"),
            "approach": plan.get("approach"), "setup": " ".join(plan.get("setup") or []), "focus": plan.get("focus") or "",
            "potions": json.dumps(plan.get("potions") or {}, ensure_ascii=False, sort_keys=True),
            "latency_ms": r.get("latency_ms"), "input_tokens": inp, "cache_hit_tokens": r.get("cache_hit_tokens"),
            "output_tokens": out, "reasoning_tokens": r.get("reasoning_tokens"), "effort": r.get("effort"),
            "cost_usd": rnd(cost, 6) if cost is not None else None, "guide": r.get("guide"), "handbook": r.get("handbook"),
            "summary": plan.get("summary") or "", "key_turns": plan.get("keyTurns") or "",
        })
    return rows


# ---------------------------------------------------------------- 2. deepseek-reasoning join
def attach_reasoning(esc_rows, limit):
    recs = []
    for r in iter_jsonl(os.path.join(LOGS, "deepseek-reasoning.jsonl"), limit):
        try:
            recs.append((parse_ts(r["ts"]).timestamp(), r.get("choice"), r.get("model"), len(r.get("reasoning") or ""), r.get("effort")))
        except Exception:
            continue
    recs.sort()
    used = set()
    import bisect
    keys = [x[0] for x in recs]
    matched = 0
    for row in esc_rows:
        row["reasoning_logged"] = 0
        if row["by"] != "deepseek":
            continue
        t = parse_ts(row["ts"]).timestamp()
        i = bisect.bisect_right(keys, t + 0.5)
        best = None
        for j in range(i - 1, max(-1, i - 6), -1):
            if j in used or t - keys[j] > 5:
                continue
            if recs[j][1] == row["choice"]:
                best = j
                break
        if best is not None:
            used.add(best)
            matched += 1
            row["reasoning_logged"] = 1
            row["model"] = recs[best][2]
            row["reasoning_chars"] = recs[best][3]
    models = collections.Counter(x[2] for x in recs)
    return {"records": len(recs), "matched_to_escalations": matched, "models": dict(models)}


# ---------------------------------------------------------------- 3. states (694 MB, streamed)
def scan_states(limit):
    info = collections.defaultdict(lambda: {"ascension": None, "character": None, "act_max": None, "floor_max": None,
                                            "fight_floor": None, "fight_enemies": {}, "fight_ts": None,
                                            "game_over": None, "last_hp": None, "max_hp": None, "boss_ids": []})
    n = 0
    for s in iter_jsonl(os.path.join(LOGS, "states.jsonl"), limit):
        n += 1
        st = s.get("state") or {}
        rid = st.get("run_id") or run_of_fp(s.get("fingerprint"))
        if not rid or rid == "run_unknown":
            continue
        x = info[rid]
        run = st.get("run") or {}
        if run:
            if x["ascension"] is None and run.get("ascension") is not None:
                x["ascension"] = run.get("ascension")
            x["character"] = x["character"] or run.get("character_id")
            try:
                act = int(run.get("act_id")) + 1
                x["act_max"] = max(x["act_max"] or 0, act)
            except (TypeError, ValueError):
                pass
            if run.get("floor") is not None:
                x["floor_max"] = max(x["floor_max"] or 0, run["floor"])
            if run.get("current_hp") is not None:
                x["last_hp"], x["max_hp"] = run.get("current_hp"), run.get("max_hp")
            b = run.get("boss_id")
            if b and b not in x["boss_ids"]:
                x["boss_ids"].append(b)
        combat = st.get("combat")
        if s.get("screen") == "COMBAT" and combat:
            floor = run.get("floor")
            if floor != x["fight_floor"]:
                x["fight_floor"], x["fight_enemies"] = floor, {}
            for e in combat.get("enemies") or []:
                eid = e.get("enemy_id")
                if eid:
                    x["fight_enemies"][eid] = e.get("name") or eid
            x["fight_ts"] = s.get("ts")
        if st.get("game_over"):
            x["game_over"] = st["game_over"]
    return info, n


# ---------------------------------------------------------------- 4. console logs
def scan_consoles():
    d = os.path.join(LOGS, "console")
    out = []
    for name in sorted(os.listdir(d)):
        m = re.match(r"^(\d{8})-(\d{6})-(.+)\.log$", name)
        if not m:
            continue
        start = dt.datetime.strptime(m.group(1) + m.group(2), "%Y%m%d%H%M%S").replace(tzinfo=LOCAL_TZ)
        text = open(os.path.join(d, name), encoding="utf8", errors="replace").read()
        ended = None
        m2 = re.search(r"run \d+ ended \((victory|defeat)\)", text)
        if m2:
            ended = m2.group(1)
        out.append({"file": name, "start": start, "hash": m.group(3), "ended": ended,
                    "mtime": dt.datetime.fromtimestamp(os.path.getmtime(os.path.join(d, name)), dt.timezone.utc)})
    for i, c in enumerate(out):
        c["next_start"] = out[i + 1]["start"] if i + 1 < len(out) else None
    return out


def console_for(consoles, t):
    """The console log whose process was running at time t (latest start <= t)."""
    best = None
    for c in consoles:
        if c["start"] <= t:
            best = c
        else:
            break
    return best


# ---------------------------------------------------------------- 5. notes
def scan_lessons():
    text = open(os.path.join(NOTES, "lessons.md"), encoding="utf8").read()
    headings, preloop = {}, set()
    in_comment = False
    for line in text.splitlines():
        if "<!--" in line:
            in_comment = True
        m = re.match(r"^##\s+([0-9A-Z]{12})(.*)$", line)
        if m:
            if in_comment:
                preloop.add(m.group(1))
            else:
                headings.setdefault(m.group(1), line[3:].strip())
        if "-->" in line:
            in_comment = False
    notes = collections.Counter()
    for name in os.listdir(NOTES):
        m = re.match(r"^run.*-([0-9A-Z]{12})\.md$", name)
        if m:
            notes[m.group(1)] += 1
    return headings, preloop, notes


def scan_autoplay():
    c = collections.Counter()
    if os.path.exists(AUTOPLAY):
        for line in open(AUTOPLAY, encoding="utf8", errors="replace"):
            m = re.search(r"finished run ([0-9A-Z]{12})", line)
            if m:
                c[m.group(1)] += 1
    return c


# ---------------------------------------------------------------- 6. git
def git_commits():
    out = subprocess.run(["git", "-C", JEV, "log", "--all", "--format=%H%x1f%h%x1f%aI%x1f%an%x1f%s"],
                         capture_output=True, text=True, check=True).stdout
    main = set(subprocess.run(["git", "-C", JEV, "rev-list", "upstream/main"], capture_output=True, text=True).stdout.split())
    rows = []
    for line in out.splitlines():
        full, short, date, author, subject = line.split("\x1f", 4)
        rows.append({"hash": short, "full_hash": full, "date": date, "author": author,
                     "upstream": int(author == UPSTREAM_AUTHOR), "in_origin_main": int(full in main),
                     "subject": subject})
    return rows


# ---------------------------------------------------------------- main build
def act_from_floor(f):
    if f is None:
        return None
    return 1 if f <= 17 else 2 if f <= 33 else 3


def build():
    os.makedirs(DATA, exist_ok=True)
    limits = snapshot_limits()
    cut_time = dt.datetime.now(dt.timezone.utc)
    print(f"cut at {iso(cut_time)}: " + ", ".join(f"{k} {v:,} B" for k, v in limits.items()), flush=True)

    runs, label_counts, esc_rows, totals = load_decisions(limits["decisions.jsonl"])
    print(f"decisions: {totals['records']:,} records, {len(runs)} runs", flush=True)
    reasoning_info = attach_reasoning(esc_rows, limits.get("deepseek-reasoning.jsonl", 0))
    fp_rows = load_fight_plans(limits.get("fight-plans.jsonl", 0))
    fp_by_run = collections.defaultdict(list)
    for f in fp_rows:
        fp_by_run[f["run_id"]].append(f)
    runs_jsonl = collections.OrderedDict()
    for r in iter_jsonl(os.path.join(LOGS, "runs.jsonl"), limits["runs.jsonl"]):
        runs_jsonl[r["run_id"]] = r
    print("scanning states.jsonl ...", flush=True)
    states, n_states = scan_states(limits["states.jsonl"])
    consoles = scan_consoles()
    headings, preloop, run_notes = scan_lessons()
    autoplay = scan_autoplay()
    commits = git_commits()

    # Console outcome -> run: the run with the latest decision inside that console's window.
    console_outcome = {}
    order = sorted(runs.items(), key=lambda kv: kv[1]["first"] or "")
    for c in consoles:
        if not c["ended"]:
            continue
        cand = None
        for rid, x in order:
            if not x["last"]:
                continue
            t = parse_ts(x["last"])
            if c["start"] <= t and (c["next_start"] is None or t < c["next_start"]):
                cand = rid if cand is None or x["last"] > runs[cand]["last"] else cand
        if cand:
            console_outcome[cand] = (c["ended"], c["file"])

    # Era: the fallback configuration in force at the end of the run (its last escalation); runs with
    # no escalation inherit the previous run's era (or no_fallback before any escalation existed).
    era_prev = "no_fallback"
    rows = []
    last_rid = order[-1][0] if order else None
    for rid, x in order:
        if not x["first"]:
            continue
        rj = runs_jsonl.get(rid)
        st = states.get(rid, {})
        esc = x["esc"]
        era = esc[-1]["variant"] if esc else era_prev
        era_prev = era
        bys = {e["by"] for e in esc}
        chain = "none" if not bys else "mixed" if len(bys) > 1 else ("claude" if bys == {"claude"} else "deepseek")
        # outcome
        victory, source = None, ""
        if rj is not None:
            victory, source = bool(rj.get("victory")), "runs.jsonl"
        elif rid in console_outcome:
            victory, source = console_outcome[rid][0] == "victory", "console:" + console_outcome[rid][1]
        elif st.get("game_over"):
            victory, source = bool(st["game_over"].get("is_victory")), "states.game_over"
        if rj is None and rid in console_outcome and console_outcome[rid][0] == "victory":
            victory, source = True, "console:" + console_outcome[rid][1]
        if victory is True:
            outcome = "victory"
        elif victory is False:
            outcome = "defeat"
        elif rid == last_rid:
            outcome = "in_progress"
        elif autoplay.get(rid):
            outcome = "unrecorded"  # autoplay stopped (time cap) before GAME_OVER was logged
        else:
            outcome = "aborted"
        # code version
        t_last = parse_ts(x["last"])
        t_first = parse_ts(x["first"])
        cv_console = (console_for(consoles, t_last) or {}).get("hash")
        seen = []
        for c in consoles:
            if c["start"] <= t_last and (c["next_start"] is None or c["next_start"] > t_first) and c["hash"] not in seen:
                seen.append(c["hash"])
        code_rj = (rj or {}).get("code") or ""
        code_version = code_rj or cv_console or ""
        # deepseek
        ds = [e for e in esc if e["by"] == "deepseek"]
        cl = [e for e in esc if e["by"] == "claude"]
        floor_max = max(x["floors"]) if x["floors"] else st.get("floor_max")
        death = ""
        death_ids = ""
        if outcome != "victory":
            if rj and rj.get("death_fight"):
                death = "/".join(rj["death_fight"])
            elif st.get("fight_enemies"):
                death = "/".join(sorted(st["fight_enemies"].values()))
            if st.get("fight_enemies"):
                death_ids = "/".join(sorted(st["fight_enemies"].keys()))
        ascension = st.get("ascension")
        if ascension is None and rj:
            ascension = rj.get("ascension")
        row = {
            "run_id": rid, "start_ts": x["first"], "end_ts": x["last"],
            "duration_min": round((t_last - t_first).total_seconds() / 60, 1),
            "floor_max": floor_max, "act_reached": st.get("act_max") or act_from_floor(floor_max),
            "outcome": outcome, "victory": {True: 1, False: 0}.get(victory), "outcome_source": source,
            "finished": int(outcome in ("victory", "defeat")),
            "character": st.get("character") or (rj or {}).get("character"), "ascension": ascension,
            "code_version": code_version, "code_version_source": "runs.jsonl" if code_rj else ("console" if cv_console else ""),
            "code_version_console": cv_console or "", "code_versions_all": " ".join(seen),
            "n_decisions": x["n"], "n_shadow": x["n_shadow"], "decider_inferred": x["decider_inferred"],
        }
        for d in DECIDERS:
            row["n_" + d.replace("-", "_")] = x["dec"].get(d, 0)
        row.update({
            "jev_calls": x["jev_calls"], "jev_in_tokens": x["jev_in"], "jev_out_tokens": x["jev_out"],
            "jev_cost_usd": round((x["jev_in"] + x["jev_out"]) * JEV_PRICE / 1e6, 6),
            "jev_latency_p50_ms": median(x["jev_lat"]),
            "ds_calls": len(ds),
            "ds_in": sum(e["input_tokens"] or 0 for e in ds),
            "ds_cache_hit": sum(e["cache_hit_tokens"] or 0 for e in ds),
            "ds_out": sum(e["output_tokens"] or 0 for e in ds),
            "ds_reasoning": sum(e["reasoning_tokens"] or 0 for e in ds),
            "ds_total_tokens": sum(e["total_tokens"] or 0 for e in ds),
            "ds_calls_no_token_split": sum(1 for e in ds if not e["token_split_recorded"]),
            "ds_cost_usd": round(sum(e["cost_usd"] or 0 for e in ds), 6),
            "ds_latency_p50_s": round(median([e["latency_ms"] for e in ds]) / 1000, 2) if ds else None,
            "ds_overrides": sum(1 for e in ds if not e["agreed"]),
            "fight_plans": sum(1 for f in fp_by_run.get(rid, []) if f["ok"]),
            "fight_plan_errors": sum(1 for f in fp_by_run.get(rid, []) if not f["ok"]),
            "fight_plan_cost_usd": round(sum(f["cost_usd"] or 0 for f in fp_by_run.get(rid, [])), 6),
            "fight_plan_latency_p50_s": round(median([f["latency_ms"] for f in fp_by_run.get(rid, []) if f["latency_ms"]]) / 1000, 2) if any(f["latency_ms"] for f in fp_by_run.get(rid, [])) else None,
            "claude_calls": len(cl),
            "claude_latency_p50_s": round(median([e["latency_ms"] for e in cl]) / 1000, 2) if cl else None,
            "hp_guard_count": sum(1 for e in esc if e["guard"]),
            "escalation_chain": chain, "era": era,
            "learning_loop": None,  # filled below
            "death_enemy": death, "death_enemy_ids": death_ids,
            "final_hp": st.get("last_hp"), "max_hp": st.get("max_hp"),
            "bosses_seen": " ".join(st.get("boss_ids") or []),
            "has_postmortem": int(rid in headings), "postmortem_heading": headings.get(rid, ""),
            "preloop_listed": int(rid in preloop), "n_run_notes": run_notes.get(rid, 0),
            "autoplay_finished_lines": autoplay.get(rid, 0),
            "in_runs_jsonl": int(rj is not None),
        })
        rows.append(row)

    # Learning loop = post-mortem cycle, starting with the first run that has a post-mortem heading.
    first_pm = next((r["start_ts"] for r in rows if r["has_postmortem"]), None)
    for r in rows:
        r["learning_loop"] = int(bool(first_pm) and r["start_ts"] >= first_pm)

    run_header = list(rows[0].keys())
    n_runs = write_csv(os.path.join(DATA, "runs.csv"), run_header, rows)

    lab_rows = [{"run_id": k[0], "label_group": k[1], "label": k[2], "decider": k[3], "n": v}
                for k, v in sorted(label_counts.items())]
    n_lab = write_csv(os.path.join(DATA, "decisions_by_label.csv"), ["run_id", "label_group", "label", "decider", "n"], lab_rows)

    esc_header = ["ts", "run_id", "floor", "turn", "screen", "label", "decider", "by", "by_recorded", "variant",
                  "jev_choice", "jev_confidence", "choice", "agreed", "guard", "used_choice", "final_choice",
                  "effort", "latency_ms", "total_tokens", "input_tokens", "cache_hit_tokens", "output_tokens",
                  "reasoning_tokens", "token_split_recorded", "cost_usd", "guide", "handbook", "memory_chars",
                  "reasoning_logged", "model", "reasoning_chars", "reason"]
    n_esc = write_csv(os.path.join(DATA, "escalations.csv"), esc_header, esc_rows)
    fp_header = ["ts", "run_id", "fight", "floor", "turn", "kind", "enemies", "ok", "error", "replans", "approach", "setup",
                 "focus", "potions", "latency_ms", "input_tokens", "cache_hit_tokens", "output_tokens", "reasoning_tokens",
                 "effort", "cost_usd", "guide", "handbook", "summary", "key_turns"]
    n_fp = write_csv(os.path.join(DATA, "fight_plans.csv"), fp_header, fp_rows)

    code_runs = collections.Counter(r["code_version"].split("+")[0] for r in rows)
    for c in commits:
        c["n_runs_code_version"] = code_runs.get(c["hash"], 0)
    n_commits = write_csv(os.path.join(DATA, "commits.csv"),
                          ["hash", "full_hash", "date", "author", "upstream", "in_origin_main", "n_runs_code_version", "subject"],
                          commits)

    # ------------------------------------------------ summary
    fin = [r for r in rows if r["finished"]]
    wins = [r for r in rows if r["outcome"] == "victory"]

    def group(rs):
        f = [r for r in rs if r["finished"]]
        floors = [r["floor_max"] for r in f if r["floor_max"] is not None]
        return {"runs": len(rs), "finished": len(f), "wins": sum(1 for r in f if r["victory"]),
                "win_rate_finished": round(sum(1 for r in f if r["victory"]) / len(f), 3) if f else None,
                "mean_floor_finished": round(statistics.mean(floors), 2) if floors else None,
                "median_floor_finished": median(floors),
                "reached_act2": sum(1 for r in rs if (r["floor_max"] or 0) >= 18),
                "reached_act3": sum(1 for r in rs if (r["floor_max"] or 0) >= 34),
                "run_ids": [r["run_id"] for r in rs]}

    eras = ["no_fallback", "claude", "deepseek_nonthinking", "deepseek_thinking", "deepseek_memory"]
    by_asc = collections.defaultdict(list)
    for r in rows:
        by_asc[str(r["ascension"])].append(r)
    dec_total = collections.Counter()
    for r in rows:
        for d in DECIDERS:
            dec_total[d] += r["n_" + d.replace("-", "_")]
    ds_all = [e for e in esc_rows if e["by"] == "deepseek"]
    summary = {
        "generated_at": iso(cut_time),
        "source_cut_bytes": limits,
        "runs_total": len(rows),
        "runs_by_outcome": dict(collections.Counter(r["outcome"] for r in rows)),
        "runs_finished": len(fin),
        "runs_in_runs_jsonl": len(runs_jsonl),
        "wins": [{"run_id": r["run_id"], "ascension": r["ascension"], "floor": r["floor_max"], "end_ts": r["end_ts"],
                  "code_version": r["code_version"], "code_version_console": r["code_version_console"], "era": r["era"],
                  "outcome_source": r["outcome_source"]} for r in wins],
        "best_floors": sorted(({"run_id": r["run_id"], "floor": r["floor_max"], "outcome": r["outcome"], "ascension": r["ascension"]}
                               for r in rows if r["floor_max"] is not None), key=lambda x: -x["floor"])[:10],
        "floor_max_distribution": dict(sorted(collections.Counter(r["floor_max"] for r in rows).items(), key=lambda kv: kv[0] or 0)),
        "per_ascension": {k: {kk: vv for kk, vv in group(v).items()} for k, v in sorted(by_asc.items())},
        # Per character (multi-character, 2026-10-04), once there is more than one: the Ironclad-only dataset stays as it
        # was. A run naming no character is the Ironclad's (every run before the Silent).
        **({"per_character": {c: group([r for r in rows if run_character(r) == c]) for c in sorted({run_character(r) for r in rows})}}
           if len({run_character(r) for r in rows}) > 1 else {}),
        "per_era": {e: group([r for r in rows if r["era"] == e]) for e in eras},
        "per_learning_loop": {"before": group([r for r in rows if not r["learning_loop"]]),
                              "after": group([r for r in rows if r["learning_loop"]])},
        "api": {
            "jev": {"calls": sum(r["jev_calls"] for r in rows), "in_tokens": sum(r["jev_in_tokens"] for r in rows),
                    "out_tokens": sum(r["jev_out_tokens"] for r in rows),
                    "cost_usd": round(sum(r["jev_cost_usd"] for r in rows), 4),
                    "price_per_m_tokens_usd": JEV_PRICE},
            "deepseek": {"calls": len(ds_all), "in_tokens": sum(e["input_tokens"] or 0 for e in ds_all),
                         "cache_hit_tokens": sum(e["cache_hit_tokens"] or 0 for e in ds_all),
                         "out_tokens": sum(e["output_tokens"] or 0 for e in ds_all),
                         "reasoning_tokens": sum(e["reasoning_tokens"] or 0 for e in ds_all),
                         "calls_without_token_split": sum(1 for e in ds_all if not e["token_split_recorded"]),
                         "cost_usd": round(sum(e["cost_usd"] or 0 for e in ds_all), 4),
                         "latency_p50_s": round(median([e["latency_ms"] for e in ds_all]) / 1000, 2) if ds_all else None,
                         "override_rate": round(sum(1 for e in ds_all if not e["agreed"]) / len(ds_all), 3) if ds_all else None,
                         "hp_guard_triggers": sum(1 for e in ds_all if e["guard"]),
                         "pricing_usd_per_m": {"input_cache_miss": DS_MISS, "input_cache_hit": DS_HIT, "output": DS_OUT}},
            "claude": {"calls": sum(1 for e in esc_rows if e["by"] == "claude"), "cost_usd": None,
                       "note": "answered by the interactive Claude Code session via file escalation; no per-call token accounting"},
        },
        "api_cost_total_usd": None,
        "decisions": {"play_total": totals["play"], "attributed_to_runs": sum(r["n_decisions"] for r in rows),
                      "unattributed_menu_timeline": totals["unattributed_play"], "shadow": totals["shadow"],
                      "by_layer": dict(dec_total), "decider_inferred": totals["decider_inferred"]},
        "escalations": {"rows": len(esc_rows), "by_variant": dict(collections.Counter(e["variant"] for e in esc_rows))},
        "deepseek_reasoning_log": reasoning_info,
        "states_lines_scanned": n_states,
        "console_logs": len(consoles),
        "commits": {"total": len(commits), "upstream": sum(c["upstream"] for c in commits),
                    "experiment": sum(1 for c in commits if not c["upstream"])},
        "postmortems": {"runs_with_heading": sum(r["has_postmortem"] for r in rows), "preloop_listed": len(preloop)},
    }
    summary["api_cost_total_usd"] = round(summary["api"]["jev"]["cost_usd"] + summary["api"]["deepseek"]["cost_usd"], 4)
    with open(os.path.join(DATA, "summary.json"), "w", encoding="utf8") as fh:
        json.dump(summary, fh, ensure_ascii=False, indent=2)

    # ------------------------------------------------ verification against sources
    checks = {
        "decisions attributed + unattributed == play records": sum(r["n_decisions"] for r in rows) + totals["unattributed_play"] == totals["play"],
        "decisions_by_label sum == attributed decisions": sum(r["n"] for r in lab_rows) == sum(r["n_decisions"] for r in rows),
        "escalations rows == records with escalation": n_esc == len(esc_rows),
        "every runs.jsonl id present in runs.csv": all(k in {r["run_id"] for r in rows} for k in runs_jsonl),
        "commits == git rev-list --all --count": n_commits == int(subprocess.run(["git", "-C", JEV, "rev-list", "--all", "--count"], capture_output=True, text=True).stdout.strip()),
    }
    mism = []
    for r in rows:
        rj = runs_jsonl.get(r["run_id"])
        if rj and rj.get("decisions") != r["n_decisions"]:
            mism.append((r["run_id"], rj.get("decisions"), r["n_decisions"]))
    summary_checks = {k: bool(v) for k, v in checks.items()}
    summary_checks["runs.jsonl decision-count mismatches"] = mism
    with open(os.path.join(DATA, "verification.json"), "w", encoding="utf8") as fh:
        json.dump({"checks": summary_checks, "row_counts": {"runs.csv": n_runs, "decisions_by_label.csv": n_lab,
                   "escalations.csv": n_esc, "fight_plans.csv": n_fp, "commits.csv": n_commits}}, fh, ensure_ascii=False, indent=2)
    for k, v in checks.items():
        print(("OK   " if v else "FAIL ") + k)
    if mism:
        print(f"note: {len(mism)} runs differ from runs.jsonl 'decisions' (see verification.json)")
    print(f"rows: runs {n_runs}, decisions_by_label {n_lab}, escalations {n_esc}, commits {n_commits}")
    return limits, summary, {"runs.csv": n_runs, "decisions_by_label.csv": n_lab, "escalations.csv": n_esc, "fight_plans.csv": n_fp, "commits.csv": n_commits}


# ---------------------------------------------------------------- raw snapshot
def gzip_copy(src, dst, limit=None):
    with open(src, "rb") as fi, gzip.open(dst, "wb", compresslevel=6) as fo:
        remaining = limit if limit is not None else float("inf")
        while remaining > 0:
            chunk = fi.read(int(min(8 << 20, remaining)))
            if not chunk:
                break
            fo.write(chunk)
            remaining -= len(chunk)


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(8 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def raw_snapshot(limits):
    os.makedirs(RAW, exist_ok=True)
    for name in JSONL_SOURCES:
        if not os.path.exists(os.path.join(LOGS, name)):
            continue
        print(f"gzip {name} ...", flush=True)
        gzip_copy(os.path.join(LOGS, name), os.path.join(RAW, name + ".gz"), limits.get(name))
    for name in sorted(os.listdir(LOGS)):
        if name.startswith("shadow-") and name.endswith(".jsonl"):
            gzip_copy(os.path.join(LOGS, name), os.path.join(RAW, name + ".gz"))
    for sub in ["console", "escalation"]:
        with tarfile.open(os.path.join(RAW, sub + ".tar.gz"), "w:gz") as tf:
            tf.add(os.path.join(LOGS, sub), arcname=sub)
    files = sorted(f for f in os.listdir(RAW) if f != "SHA256SUMS")
    with open(os.path.join(RAW, "SHA256SUMS"), "w") as fh:
        for f in files:
            fh.write(f"{sha256(os.path.join(RAW, f))}  {f}\n")
    # Uncompressed-source hashes of the exact cut, for provenance.
    with open(os.path.join(RAW, "SOURCE_CUT.json"), "w") as fh:
        json.dump({"cut_bytes": limits, "note": "decisions/deepseek-reasoning/runs/states were copied up to these byte offsets"}, fh, indent=2)


README = """# jev-sts2 experiment dataset

Derived tables for the paper on the Slay the Spire 2 bot (code solver + Jev typed-choice model +
LLM fallback). Generated by `ops/paper_dataset.py` (Python 3 stdlib only); do not edit by hand.

- Generated at: {generated_at} (UTC). Source logs were cut at these byte offsets (the autoplay loop
  was still appending; everything after the cut is ignored, and `paper/raw/` holds exactly the cut):
{cut}
- Rebuild: `python3 ops/paper_dataset.py` (add `--no-raw` to skip the raw snapshot). Output is
  deterministic for a given cut, apart from `generated_at` and the gzip headers in `paper/raw/`.
- Timestamps are UTC ISO-8601 (`...Z`) unless stated. Console log file names, `ops/autoplay.log`
  and commit dates are local time (UTC+8).
- Secrets: the build scans every output for API-key patterns (`sk-` followed by 12+ key characters)
  and exits non-zero on a hit. English words such as "risk-free" contain the substring `sk-`
  and are not keys.

## Files

| file | rows | content |
|---|---|---|
| runs.csv | {n_runs} | one row per run id seen in decisions.jsonl (finished, in-progress, pre-learning-loop) |
| decisions_by_label.csv | {n_lab} | play decisions per run x label x decider |
| escalations.csv | {n_esc} | one row per fallback (escalation) call recorded in decisions.jsonl |
| commits.csv | {n_commits} | `git log --all` of jev-sts2 |
| summary.json | - | headline numbers (see below) |
| verification.json | - | consistency checks against the sources + row counts |
| learning-curve-<character>.csv | - | per ascension: runs, wins on the first try vs after SL, mean floor, learning-ledger items found / shipped, repeated mistakes (eval/learning-curve.py; ledger: paper/materials/learning/README.md) |
| ../raw/ | - | gzip snapshots of the raw logs + SHA256SUMS + SOURCE_CUT.json |

## Layers and eras

Every play-mode decision has a *decider* (the layer that picked the action):
`code` (rule / turn-solver picks it alone), `jev` (Jev typed-choice model), `deepseek` / `claude`
(fallback overrode or confirmed Jev when Jev's confidence was low), `code-fallback` (Jev call failed or
was unusable, code's choice used), and `jev-plan` / `deepseek-plan` / `claude-plan` (the
follow-up `combat/plan-continue` steps of a multi-card turn plan chosen by that layer; a
`plan-continue` with no chooser marker counts as `code`). Records before the `decider` field existed
are inferred exactly as in `ops/stats.py` (escalation.by, else questions+fallback -> code-fallback,
questions -> jev, else code); `decider_inferred` counts them.

`era` (runs.csv) is the fallback configuration in force at the end of the run, taken from the run's
last escalation record; a run with no escalation inherits the previous run's era:

| era | how identified | runs |
|---|---|---|
| no_fallback | before any escalation existed | {era_no_fallback} |
| claude | escalation.by == "claude" (interactive Claude Code session answering file escalations, logs/escalation/) | {era_claude} |
| deepseek_nonthinking | DeepSeek, no `effort` / `reasoning_tokens` (includes the pilot V5S6QVVQYL37 whose records lack `by`) | {era_deepseek_nonthinking} |
| deepseek_thinking | DeepSeek with `effort` (high/max) or `reasoning_tokens` | {era_deepseek_thinking} |
| deepseek_memory | DeepSeek with `memory_chars` (handbook in system prompt + per-run memory, code 307658f+) | {era_deepseek_memory} |

`escalation_chain` summarises who actually answered in that run: none / claude / deepseek / mixed.
`learning_loop` = 1 from the first run with a post-mortem heading in notes/lessons.md
(DG1CDGW8Y5JE) onward.

## runs.csv

| column | meaning |
|---|---|
| run_id | 12-char game run id (from the decision fingerprint) |
| start_ts, end_ts | first / last play-mode decision of the run (UTC) |
| duration_min | end_ts - start_ts in minutes (wall clock; includes restarts and waits) |
| floor_max | highest `floor` on any decision of the run |
| act_reached | max `run.act_id`+1 seen in states.jsonl; else from floor (<=17: 1, <=33: 2, else 3) |
| outcome | victory / defeat / in_progress (last run of the cut, still playing) / unrecorded / aborted |
| victory | 1/0; empty when unknown |
| outcome_source | runs.jsonl, else console log "run 1 ended (victory/defeat)" (console:<file>), else states.jsonl game_over |
| finished | 1 when outcome is victory or defeat |
| character, ascension | from states.jsonl `state.run` (first non-null), else runs.jsonl |
| code_version | runs.jsonl `code` if present, else hash in the name of the console log covering the run's last decision |
| code_version_source | runs.jsonl / console |
| code_version_console | hash from the console log covering the last decision (independent of runs.jsonl) |
| code_versions_all | all console-log hashes whose process overlapped the run (restarts mid-run) |
| n_decisions | play-mode decisions attributed to the run (GAME_OVER records carry the run id) |
| n_shadow | shadow-mode (not dispatched) decisions with this run id |
| decider_inferred | decisions whose decider was inferred (field missing) |
| n_code, n_jev, n_deepseek, n_claude, n_code_fallback, n_jev_plan, n_deepseek_plan, n_claude_plan | decisions by decider (see Layers) |
| jev_calls | decisions with usage.input_tokens > 0 (one Jev request each) |
| jev_in_tokens, jev_out_tokens | sum of usage tokens (Jev) |
| jev_cost_usd | (in+out) x ${jev_price}/M (handoff estimate for jev-1.13 via OpenRouter) |
| jev_latency_p50_ms | median latency_ms.jev over Jev calls |
| ds_calls | DeepSeek escalations (by == deepseek, or `by` missing) |
| ds_in, ds_cache_hit, ds_out, ds_reasoning | DeepSeek input / cache-hit input / output / reasoning tokens (reasoning is part of output) |
| ds_total_tokens | escalation.tokens (in+out), recorded for every DeepSeek call |
| ds_calls_no_token_split | early calls that only recorded `tokens` (no in/out split) |
| ds_cost_usd | peak price: (in-hit) x {ds_miss} + hit x {ds_hit} + out x {ds_out} per M; no-split calls priced as uncached input |
| ds_latency_p50_s | median escalation latency (s) of DeepSeek calls |
| ds_overrides | DeepSeek calls whose choice != Jev's choice |
| claude_calls, claude_latency_p50_s | Claude escalations and median answer time (s) |
| hp_guard_count | escalations where the HP guard replaced the fallback's plan (escalation.guard set) |
| escalation_chain, era, learning_loop | see Layers and eras |
| death_enemy | non-victories: runs.jsonl `death_fight` names, else enemy names of the last combat in states.jsonl (Chinese display names) |
| death_enemy_ids | enemy_ids of the last combat on the last combat floor in states.jsonl |
| final_hp, max_hp | last `run.current_hp` / `max_hp` seen in states.jsonl |
| bosses_seen | distinct `run.boss_id` values seen during the run |
| has_postmortem, postmortem_heading | a `## <run id>...` heading exists in notes/lessons.md outside HTML comments, and its text |
| preloop_listed | run listed inside the "before the learning loop" HTML comment in lessons.md (no post-mortem) |
| n_run_notes | notes/run-*-<id>.md files (per-run watch notes) |
| autoplay_finished_lines | "finished run <id>" lines in ops/autoplay.log (>1 = the play process was restarted mid-run) |
| in_runs_jsonl | the run has a line in logs/runs.jsonl |

## decisions_by_label.csv

run_id, label_group (text before the first `/`, e.g. combat, reward, map), label (full label with
any `+suffix` such as `+potion` removed), decider, n. Menu/timeline decisions outside a run
(`run_unknown`, {unattributed} records) are excluded; they are counted in summary.json.

## escalations.csv

| column | meaning |
|---|---|
| ts, run_id, floor, turn, screen, label | the decision the fallback was consulted on |
| decider | final decider of that decision |
| by | deepseek / claude (missing `by` in the earliest records = deepseek) |
| by_recorded | 1 if `by` was present in the log |
| variant | claude / deepseek_nonthinking / deepseek_thinking / deepseek_memory (per call, same rules as era) |
| jev_choice, jev_confidence | Jev's option and its confidence (the escalation trigger) |
| choice | fallback's option (`choice`, else legacy `deepseek_choice`) |
| agreed | 1 if choice == jev_choice |
| guard, used_choice | HP guard name ("hp") and the option actually played when it fired |
| final_choice | used_choice when guarded, else choice |
| effort | DeepSeek reasoning effort (high / max) |
| latency_ms | fallback latency |
| total_tokens, input_tokens, cache_hit_tokens, output_tokens, reasoning_tokens | as logged (Claude rows: 0 / empty) |
| token_split_recorded | 1 if input/output were logged separately |
| cost_usd | DeepSeek cost at peak pricing (empty for Claude) |
| guide, handbook | ids (hash prefixes) of the strategy guide / experience handbook in the system prompt |
| memory_chars | size of the per-run memory added to the user message |
| reasoning_logged, model, reasoning_chars | matched record in deepseek-reasoning.jsonl (same choice, within 5 s before the decision) |
| reason | fallback's one-line justification |

## commits.csv

hash, full_hash, date (author date, UTC+8), author, upstream (1 = author DiscreteTom, i.e. the
upstream jev-sts2 project; 0 = experiment commits), in_origin_main, n_runs_code_version (runs whose
code_version is this commit, `+dirty` stripped), subject.

## summary.json

runs_total, runs_by_outcome, runs_finished, wins (id, ascension, code), best_floors,
floor_max_distribution, per_ascension, per_era and per_learning_loop (runs, finished, wins,
win_rate_finished, mean/median floor of finished runs, runs reaching act 2 (floor >= 18) and act 3
(floor >= 34), run ids), api (Jev / DeepSeek / Claude calls, tokens, cost, latency, override rate, HP
guard triggers), api_cost_total_usd (Jev + DeepSeek), decisions (totals by layer), escalations,
deepseek_reasoning_log, commits, postmortems.

Headline at this cut: {runs_total} runs, {finished} finished, {n_wins} wins ({wins}); Jev
{jev_calls} calls ${jev_cost}; DeepSeek {ds_calls} calls ${ds_cost}; Claude {cl_calls} calls.

## Known caveats

- **Restarts.** The autoplay wrapper restarts the play process (time cap / crash) and continues the
  saved run, so a run can appear several times in ops/autoplay.log ("finished run X") and span several
  console logs and code versions (`autoplay_finished_lines`, `code_versions_all`). Durations are wall
  clock including restarts.
- **TQX5JJX3UD39** is not in runs.jsonl and has no GAME_OVER decision: the process stopped during the
  act-3 boss (the post-mortem says the 90-minute cap cut it and presumes death). Its console log does
  print "run 1 ended (defeat)" 5 s after the last end_turn (continue_game_over then timed out), so it
  is coded defeat with outcome_source = console.
- **CRRPX9MWJZGM** (second win): its victory ended on the post-boss event with no GAME_OVER record; the
  victory comes from runs.jsonl, which ops/report.py recovered from the console log "ended (victory)".
  Its runs.jsonl `code` (0b16e76) is the newest console at report time, not the code that played it;
  `code_version_console` gives a459fad (matches the post-mortem). In general runs.jsonl `code` is the
  latest console log at the time report.py ran; prefer `code_version_console` for analysis.
- **V5S6QVVQYL37, 3MDJW1UAD5M6** are not in runs.jsonl; outcome from their console logs.
- **Early runs have no code_version**: NTV8PC4ZNPMQ predates console logs and states.jsonl (code
  002e873 from runs.jsonl; ascension unknown). Runs before the `decider` field have inferred deciders.
- **In-progress run**: the last run of the cut may still be playing (outcome in_progress); exclude it
  from outcome statistics (it is not counted as finished).
- **Pricing.** DeepSeek at peak rates (off-peak is half): input cache miss ${ds_miss}/M, cache hit
  ${ds_hit}/M, output ${ds_out}/M. The early non-thinking (deepseek-chat) era is priced at the same flash
  rates by assumption; its {no_split} calls without an in/out split are priced as uncached input. Jev at
  ${jev_price}/M tokens (in+out), the handoff estimate. Claude escalations were answered by an
  interactive Claude Code session through files in logs/escalation/ and have no token accounting; cost
  is not included.
- **Jev calls** count decisions with usage tokens > 0; a DeepSeek-escalated decision also carries the Jev
  call that triggered it.
- **Death enemy** names come from runs.jsonl (report.py's last fight) or the last combat in states.jsonl;
  multi-enemy fights list all enemies seen on that floor, including minions.
- **Eras are confounded with code changes**: the code solver changed in almost every run ({n_exp_commits} experiment commits
  in ~30 h), and ascension rose over time (A0 -> A1 -> A2 -> A3), so era comparisons are descriptive.
- DeepSeek reasoning log (deepseek-reasoning.jsonl) starts with the thinking era; earlier DeepSeek calls
  have no reasoning text.
"""


def write_readme(s, counts):
    eras = s["per_era"]
    cut = "\n".join(f"  - `{k}`: {v:,} bytes" for k, v in s["source_cut_bytes"].items())
    text = README.format(
        generated_at=s["generated_at"], cut=cut, n_runs=counts["runs.csv"], n_lab=counts["decisions_by_label.csv"],
        n_esc=counts["escalations.csv"], n_commits=counts["commits.csv"],
        **{f"era_{k}": v["runs"] for k, v in eras.items()},
        jev_price=JEV_PRICE, ds_miss=DS_MISS, ds_hit=DS_HIT, ds_out=DS_OUT,
        unattributed=s["decisions"]["unattributed_menu_timeline"], runs_total=s["runs_total"], finished=s["runs_finished"],
        n_wins=len(s["wins"]), wins=", ".join(f"{w['run_id']} A{w['ascension']}" for w in s["wins"]),
        jev_calls=s["api"]["jev"]["calls"], jev_cost=s["api"]["jev"]["cost_usd"], ds_calls=s["api"]["deepseek"]["calls"],
        ds_cost=s["api"]["deepseek"]["cost_usd"], cl_calls=s["api"]["claude"]["calls"],
        no_split=s["api"]["deepseek"]["calls_without_token_split"], n_exp_commits=s["commits"]["experiment"])
    with open(os.path.join(DATA, "README.md"), "w", encoding="utf8") as fh:
        fh.write(text)


def scan_for_keys():
    hits = []
    for base in [b for b in (DATA, RAW) if os.path.isdir(b)]:
        for name in sorted(os.listdir(base)):
            p = os.path.join(base, name)
            if name.endswith(".tar.gz"):
                with tarfile.open(p, "r:gz") as tf:
                    for m in tf.getmembers():
                        if m.isfile():
                            data = tf.extractfile(m).read().decode("utf8", "replace")
                            if KEY_RE.search(data):
                                hits.append(f"{name}:{m.name}")
                continue
            opener = gzip.open if name.endswith(".gz") else open
            with opener(p, "rt", encoding="utf8", errors="replace") as fh:
                for line in fh:
                    if KEY_RE.search(line):
                        hits.append(name)
                        break
    return hits


def learning_curve():
    """paper/data/learning-curve-<character>.csv (eval/learning-curve.py: per ascension, first try vs SL, the
    learning ledger's items). True when it ran."""
    import importlib.util
    try:
        spec = importlib.util.spec_from_file_location("learning_curve", os.path.join(ROOT, "eval", "learning-curve.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod.main(["--logs", LOGS, "--out-dir", DATA]) == 0
    except Exception as error:  # the dataset itself is still written; the exit code reports it
        print(f"learning curve failed: {type(error).__name__}: {error}")
        return False


def component_costs(root=ROOT, code_root=ROOT):
    """Component accounting records its own immutable JSONL byte cuts."""
    import importlib.util
    try:
        spec = importlib.util.spec_from_file_location("paper_cost", os.path.join(code_root, "eval", "cost.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.build(root, config_path=os.path.join(code_root, "eval", "cost-config.json"))
        return True
    except Exception as error:
        print(f"component costs failed: {type(error).__name__}")
        return False


if __name__ == "__main__":
    lim, summ, counts = build()
    if "--no-raw" not in sys.argv:
        raw_snapshot(lim)
    write_readme(summ, counts)
    curve_ok = learning_curve()
    cost_ok = component_costs()
    hits = scan_for_keys()
    print("key scan: " + ("CLEAN (no sk-<key> patterns)" if not hits else "FOUND in " + ", ".join(hits)))
    sys.exit(1 if hits or not curve_ok or not cost_ok else 0)
