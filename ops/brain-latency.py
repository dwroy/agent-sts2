#!/usr/bin/env python3
"""Brain call timing by engine (Roy 2026-10-03: time the GPT brain — codex / gpt-6.1-sol — against DeepSeek).

Reads the log DB's brain rows (llm_calls_raw, src = brain: one row per strategy question and engine, with run_id) through
tools/logdb/query.py (an incremental sync first unless --no-sync), and codex's own run trace (logs/codex-calls.jsonl).
Times are UTC in the DB; --since takes UTC too.

  python3 ops/brain-latency.py                          # since the codex switch-over (BRAIN_SINCE below), every engine
  python3 ops/brain-latency.py --since 2026-10-02T16:00 # another window (UTC)
  python3 ops/brain-latency.py --runs Y8E0KK4L7JBL,WRXU...  # these runs only
  python3 ops/brain-latency.py --no-sync
  python3 ops/brain-latency.py --selftest               # the time corrections on a fixed sample (no DB)

Prints: per engine and question kind (label_head) the calls, median / p90 / max seconds, mean input / cached / output /
reasoning tokens, re-asks, parse errors; per engine the fallbacks (fallback_from), the time lost to failed attempts, error
kinds; per run the brain calls and total brain minutes by engine.

Brain time is the whole wait, failed attempts included (2026-10-03 fix):
- A question whose primary engine failed as an engine (timeout, stall, error) and that the fallback answered has one row,
  the fallback's: from jev-sts2 v4-brain-logs on, its primary_ms is the failed attempt's wall clock (the router's). It is
  billed to the engine that failed (fallback_from). Older rows lack it: "timed out after N ms" in fell_back_from.error
  gives N (RNTVAT76BPV0's five 600 s codex timeouts), else codex's trace gives the failed runs (a stall: the runs of that
  run and label since the run's previous brain row), else it is unknown (counted in `unknown`).
- Exec mode before that fix billed a question's stalled runs, when they ended in a fallback, to the next codex question
  too (J4S28FRQKD7G: the act-plan's 41 s was logged as 316 s). A codex row without question_id whose run has a trace is
  re-timed to its own runs (same run and label since the run's previous brain row). Rows with question_id are as logged.
`logged_min` is the old sum (latency_ms only), for comparison.
"""
import bisect
import collections
import datetime
import json
import os
import re
import subprocess
import sys

ROOT = os.path.expanduser(os.environ.get("JEV_STS2_ROOT", os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
PY = os.path.join(ROOT, "data/logdb-venv/bin/python")
QUERY = os.path.join(ROOT, "agent/tools/logdb/query.py")
LOGS = os.environ.get("LOGDB_LOGS", os.path.join(ROOT, "logs"))
# Default window: from the V4.5 start (2026-10-03 11:00 CST); pass --since for the codex switch-over once it is live.
BRAIN_SINCE = "2026-10-03T03:00:00"
TIMED_OUT = re.compile(r"timed out after (\d+) ms")


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def query(sql, sync):
    cmd = ["nice", "-n", "10", PY, QUERY, "--json", "--max-rows", "100000", "--timeout", "600"]
    if not sync:
        cmd.append("--no-sync")
    out = subprocess.run(cmd + [sql], capture_output=True, text=True, cwd=ROOT)
    data = json.loads(out.stdout or "{}")
    if "error" in data:
        sys.exit(f"query failed: {data['error']}")
    return [dict(zip(data["columns"], row)) for row in data["rows"]]


def table(rows, cols):
    if not rows:
        print("(none)\n")
        return
    print("| " + " | ".join(cols) + " |")
    print("|" + "---|" * len(cols))
    for r in rows:
        print("| " + " | ".join("" if r.get(c) is None else str(r.get(c)) for c in cols) + " |")
    print()


def epoch(ts):
    """Seconds since the epoch of a DB timestamp ('2026-10-03 11:59:43.198') or a log one ('2026-10-03T11:59:43.198Z')."""
    text = str(ts).replace("Z", "").replace("T", " ")
    return datetime.datetime.fromisoformat(text).replace(tzinfo=datetime.timezone.utc).timestamp()


def quantile(values, q):
    """DuckDB's quantile_cont: linear between the closest ranks."""
    if not values:
        return None
    xs = sorted(values)
    pos = (len(xs) - 1) * q
    lo = int(pos)
    hi = min(lo + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)


def secs(ms):
    return None if ms is None else round(ms / 1000.0, 1)


def raw_line(path, off, length):
    """The JSONL line at a byte offset (the DB's off / len), parsed; None when it cannot be read."""
    try:
        with open(path, "rb") as handle:
            handle.seek(off)
            return json.loads(handle.read(length))
    except (OSError, ValueError):
        return None


def load_traces(path):
    """codex-calls.jsonl rows by run id, each run's in time order (ts: when the run ended)."""
    by_run = collections.defaultdict(list)
    if not os.path.exists(path):
        return by_run
    with open(path, encoding="utf8") as handle:
        for line in handle:
            try:
                row = json.loads(line)
            except ValueError:
                continue
            if row.get("run_id") and row.get("ts"):
                by_run[row["run_id"]].append({**row, "_t": epoch(row["ts"])})
    for rows in by_run.values():
        rows.sort(key=lambda r: r["_t"])
    return by_run


def correct(rows, traces, raw=None):
    """Each brain row's own time (own_ms) and the failed primary's time billed to fallback_from (primary_ms, with
    primary_src: logged / timeout-text / trace / unknown / none), as the module doc says. `rows`: dicts with run_id, ts,
    label, engine, latency_ms, fallback_from, primary_ms (None when the DB has no column), question_id; `raw(row)` reads
    the row's brain.jsonl line (for fell_back_from.error and fields the DB lacks). Returns the rows, annotated."""
    by_run = collections.defaultdict(list)
    for r in rows:
        r["_t"] = epoch(r["ts"])
        by_run[r.get("run_id")].append(r)
    for run_id, run_rows in by_run.items():
        run_rows.sort(key=lambda r: r["_t"])
        trace = traces.get(run_id, []) if run_id else []
        times = [t["_t"] for t in trace]
        previous = None
        for r in run_rows:
            # The trace rows between the run's previous brain row and this one (a second of slack for the write order).
            lo = bisect.bisect_right(times, previous) if previous is not None else 0
            hi = bisect.bisect_right(times, r["_t"] + 1.0)
            window = [t for t in trace[lo:hi] if t.get("label") == r.get("label")]
            previous = r["_t"]
            r["own_ms"] = r.get("latency_ms") or 0
            r["primary_ms_used"] = 0
            r["primary_src"] = "none"
            if r.get("engine") == "codex" and not r.get("question_id") and window:
                r["own_ms"] = sum(t.get("ms") or 0 for t in window)
            if not r.get("fallback_from"):
                continue
            primary = r.get("primary_ms")
            line = None
            if primary is None and raw is not None:
                line = raw(r)
                if line is not None:
                    primary = line.get("primary_ms")
            if primary is not None:
                r["primary_ms_used"], r["primary_src"] = primary, "logged"
                continue
            fell = (line or {}).get("fell_back_from") or {}
            error = fell.get("error") or ""
            if error.startswith("resting until") or error.startswith("unavailable for this process"):
                continue  # the primary was not asked
            match = TIMED_OUT.search(error)
            if match:
                r["primary_ms_used"], r["primary_src"] = int(match.group(1)), "timeout-text"
            elif r.get("fallback_from") == "codex" and window:
                r["primary_ms_used"], r["primary_src"] = sum(t.get("ms") or 0 for t in window), "trace"
            elif not error.startswith("answer unusable"):
                r["primary_src"] = "unknown"
    return rows


def main():
    since = arg("--since", BRAIN_SINCE).replace("T", " ")
    runs = [r for r in (arg("--runs", "") or "").split(",") if r]
    sync = "--no-sync" not in sys.argv
    where = f"split_part(src,'/',-1) = 'brain' AND ts >= TIMESTAMP '{since}'"
    if runs:
        where += " AND run_id IN (" + ",".join("'" + r.replace("'", "") + "'" for r in runs) + ")"

    print(f"Brain calls since {since} UTC" + (f", runs {','.join(runs)}" if runs else "") + "\n")

    # primary_ms / question_id: columns from jev-sts2 v4-brain-logs's extractor; NULL until the DB has them.
    have = {r["column_name"] for r in query("DESCRIBE llm_calls_raw", sync)}
    extra = ", ".join(c if c in have else f"NULL AS {c}" for c in ("primary_ms", "question_id"))
    rows = query(f"""
      SELECT run_id, strftime(ts, '%Y-%m-%d %H:%M:%S.%g') AS ts, off, len, label, label_head, engine, coalesce(model,'') AS model,
             coalesce(effort,'') AS effort, latency_ms, fallback_from, coalesce(fallback_kind,'') AS fallback_kind, error_kind,
             input_tokens, cache_hit_tokens, output_tokens, reasoning_tokens, coalesce(reasks,0) AS reasks, parse_error, {extra}
      FROM llm_calls_raw WHERE {where} ORDER BY ts""", False)
    brain_file = os.path.join(LOGS, "brain.jsonl")
    correct(rows, load_traces(os.path.join(LOGS, "codex-calls.jsonl")), raw=lambda r: raw_line(brain_file, r["off"], r["len"]))

    def mean(xs):
        xs = [x for x in xs if x is not None]
        return round(sum(xs) / len(xs)) if xs else None

    print("## By engine and question kind (seconds; a codex row re-timed to its own runs, see the module doc)")
    groups = collections.defaultdict(list)
    for r in rows:
        groups[(r["engine"], r["model"], r["effort"], r["label_head"])].append(r)
    out = []
    for (engine, model, effort, kind), rs in groups.items():
        own = [r["own_ms"] for r in rs]
        out.append({"engine": engine, "model": model, "effort": effort, "kind": kind, "calls": len(rs),
                    "med_s": secs(quantile(own, 0.5)), "p90_s": secs(quantile(own, 0.9)), "max_s": secs(max(own)),
                    "in_tok": mean(r["input_tokens"] for r in rs), "cached": mean(r["cache_hit_tokens"] for r in rs),
                    "out_tok": mean(r["output_tokens"] for r in rs), "reason_tok": mean(r["reasoning_tokens"] for r in rs),
                    "reasks": sum(r["reasks"] for r in rs), "parse_err": sum(1 for r in rs if r["parse_error"])})
    out.sort(key=lambda r: (r["engine"], -r["calls"]))
    table(out, ["engine", "model", "effort", "kind", "calls", "med_s", "p90_s", "max_s", "in_tok", "cached", "out_tok", "reason_tok", "reasks", "parse_err"])

    print("## By engine, all kinds (brain_min_per_run includes the engine's failed attempts, fallen back from)")
    out = []
    engines = sorted({r["engine"] for r in rows} | {r["fallback_from"] for r in rows if r["fallback_from"]})
    for engine in engines:
        rs = [r for r in rows if r["engine"] == engine]
        failed = [r for r in rows if r["fallback_from"] == engine]
        run_ids = {r["run_id"] for r in rows}
        own = [r["own_ms"] for r in rs]
        lost = sum(r["primary_ms_used"] for r in failed)
        out.append({"engine": engine, "calls": len(rs), "runs": len({r["run_id"] for r in rs}),
                    "med_s": secs(quantile(own, 0.5)), "p90_s": secs(quantile(own, 0.9)),
                    "brain_min_per_run": round((sum(own) + lost) / 60000.0 / max(len(run_ids), 1), 1),
                    "failed_attempts": sum(1 for r in failed if r["primary_ms_used"] > 0), "failed_min": round(lost / 60000.0, 1),
                    "answered_as_fallback": sum(1 for r in rs if r["fallback_from"]),
                    "error_kinds": ",".join(sorted({r["error_kind"] for r in rs if r["error_kind"]}))})
    out.sort(key=lambda r: -r["calls"])
    table(out, ["engine", "calls", "runs", "med_s", "p90_s", "brain_min_per_run", "failed_attempts", "failed_min", "answered_as_fallback", "error_kinds"])

    print("## Fallbacks (the engine that failed → the one that answered; failed_s: the failed attempts' time)")
    fb = collections.defaultdict(lambda: {"n": 0, "ms": 0, "src": collections.Counter()})
    for r in rows:
        if r["fallback_from"]:
            g = fb[(r["fallback_from"], r["engine"], r["fallback_kind"])]
            g["n"] += 1
            g["ms"] += r["primary_ms_used"]
            g["src"][r["primary_src"]] += 1
    table([{"failed": k[0], "answered": k[1], "why": k[2], "n": v["n"], "failed_s": secs(v["ms"]),
            "time_from": ",".join(f"{s} {n}" for s, n in sorted(v["src"].items()))} for k, v in sorted(fb.items(), key=lambda kv: -kv[1]["n"])],
          ["failed", "answered", "why", "n", "failed_s", "time_from"])

    print("## Per run (brain minutes by engine; an engine's failed attempts count as its time; logged_min: latency_ms alone)")
    per = collections.OrderedDict()
    for r in sorted(rows, key=lambda r: r["_t"]):
        p = per.setdefault(r["run_id"], {"run_id": r["run_id"], "first_call": r["ts"][:19], "calls": 0, "ms": collections.Counter(),
                                         "failed": 0, "logged": 0, "fallbacks": 0, "unknown": 0})
        p["calls"] += 1
        p["ms"][r["engine"]] += r["own_ms"]
        p["logged"] += r["latency_ms"] or 0
        if r["fallback_from"]:
            p["fallbacks"] += 1
            p["ms"][r["fallback_from"]] += r["primary_ms_used"]
            p["failed"] += r["primary_ms_used"]
            p["unknown"] += r["primary_src"] == "unknown"
    out = []
    for p in per.values():
        ms = p["ms"]
        out.append({"run_id": p["run_id"], "first_call": p["first_call"], "calls": p["calls"],
                    "codex_min": round(ms["codex"] / 60000.0, 1), "deepseek_min": round(ms["deepseek"] / 60000.0, 1),
                    "other_min": round(sum(v for k, v in ms.items() if k not in ("codex", "deepseek")) / 60000.0, 1),
                    "brain_min": round(sum(ms.values()) / 60000.0, 1), "failed_min": round(p["failed"] / 60000.0, 1),
                    "logged_min": round(p["logged"] / 60000.0, 1), "fallbacks": p["fallbacks"], "unknown": p["unknown"]})
    table(out, ["run_id", "first_call", "calls", "codex_min", "deepseek_min", "other_min", "brain_min", "failed_min", "logged_min", "fallbacks", "unknown"])


def selftest():
    """The corrections on the three cases seen on 2026-10-03, and on rows logged after the fix."""
    def row(ts, label, engine, ms, fell=None, primary=None, qid=None, run="RUN"):
        return {"run_id": run, "ts": ts, "label": label, "engine": engine, "latency_ms": ms, "fallback_from": fell, "primary_ms": primary, "question_id": qid}

    def trace(ts, label, ms, run="RUN"):
        return {"run_id": run, "ts": ts, "_t": epoch(ts), "label": label, "ms": ms}

    errors = {}
    raw = lambda r: {"fell_back_from": {"error": errors.get(r["ts"], "")}}
    # J4S28FRQKD7G (exec): a reward question stalled twice (136.5 + 137.7 s) and fell back; the next question (the act-plan,
    # its own run 41.4 s) was logged 315.7 s.
    j4 = [row("2026-10-03 11:52:51.000", "rest/plan", "codex", 10700), row("2026-10-03 11:58:58.000", "reward/card", "deepseek", 10400, "codex"),
          row("2026-10-03 11:59:43.200", "event/act-plan", "codex", 315700)]
    errors["2026-10-03 11:58:58.000"] = "codex stalled [timeout]: no stream event for 120 s after the first token at 15 s (2 run(s))"
    traces = {"RUN": [trace("2026-10-03T11:52:51.000Z", "rest/plan", 10700), trace("2026-10-03T11:56:30.148Z", "reward/card", 136500),
                      trace("2026-10-03T11:58:47.881Z", "reward/card", 137700), trace("2026-10-03T11:59:43.198Z", "event/act-plan", 41400)]}
    correct(j4, traces, raw)
    assert [(r["own_ms"], r["primary_ms_used"], r["primary_src"]) for r in j4] == [(10700, 0, "none"), (10400, 274200, "trace"), (41400, 0, "none")], j4
    # Moved, not added: the total stays (within the runs' rounding: 41.4 + 136.5 + 137.7 = 315.6 s against 315.7 logged).
    assert abs(sum(r["own_ms"] + r["primary_ms_used"] for r in j4) - sum(r["latency_ms"] for r in j4)) < 1000
    # RNTVAT76BPV0 (no trace): a 600 s timeout, then a question while codex rested.
    errors.update({"2026-10-03 10:13:06.000": "codex timed out after 600000 ms", "2026-10-03 10:24:16.000": "resting until 2026-10-03T10:33:13.601Z after timeout: 2 timeouts"})
    rn = [row("2026-10-03 10:13:06.000", "reward/card", "deepseek", 4600, "codex", run="RN"), row("2026-10-03 10:24:16.000", "shop/plan", "deepseek", 34300, "codex", run="RN")]
    correct(rn, {}, raw)
    assert [(r["primary_ms_used"], r["primary_src"]) for r in rn] == [(600000, "timeout-text"), (0, "none")], rn
    # After the fix: primary_ms is on the row; question_id rows are taken as logged (no re-timing even with a trace).
    new = [row("2026-10-03 22:00:00.000", "reward/card", "deepseek", 9400, "codex", primary=54600, qid="q-1", run="NEW"),
           row("2026-10-03 22:01:00.000", "rest/plan", "codex", 23100, qid="q-2", run="NEW")]
    correct(new, {"NEW": [trace("2026-10-03T22:00:59.000Z", "rest/plan", 99999, run="NEW")]}, raw)
    assert [(r["own_ms"], r["primary_ms_used"], r["primary_src"]) for r in new] == [(9400, 54600, "logged"), (23100, 0, "none")], new
    # A primary_ms the DB lacks (an older DB) is read from the raw line.
    old_db = [row("2026-10-03 22:05:00.000", "reward/card", "deepseek", 9000, "codex", run="ODB")]
    correct(old_db, {}, lambda r: {"primary_ms": 30000, "fell_back_from": {"error": "x"}})
    assert (old_db[0]["primary_ms_used"], old_db[0]["primary_src"]) == (30000, "logged")
    assert quantile([1, 2, 3, 4], 0.9) == 3.7 and quantile([5], 0.5) == 5
    print("brain-latency.py selftest ok: J4S2 stalls moved to the failed question (total unchanged), RNTV timeout 600 s from the text, resting 0, logged primary_ms taken")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        main()
