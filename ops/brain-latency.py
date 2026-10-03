#!/usr/bin/env python3
"""Brain call timing by engine (Dai 2026-10-03: time the GPT brain — codex / gpt-6.1-sol — against DeepSeek).

Reads the log DB's brain rows (llm_calls_raw, src = brain: one row per strategy question, with run_id) through
tools/logdb/query.py (an incremental sync first unless --no-sync). Times are UTC in the DB; --since takes UTC too.

  python3 ops/brain-latency.py                          # since the codex switch-over (BRAIN_SINCE below), every engine
  python3 ops/brain-latency.py --since 2026-10-02T16:00 # another window (UTC)
  python3 ops/brain-latency.py --runs Y8E0KK4L7JBL,WRXU...  # these runs only
  python3 ops/brain-latency.py --no-sync

Prints: per engine and question kind (label_head) the calls, median / p90 / max seconds, mean input / cached / output /
reasoning tokens, re-asks, parse errors; per engine the fallbacks (fallback_from), error kinds; per run the brain calls
and total brain seconds by engine.
"""
import json
import os
import subprocess
import sys

ROOT = os.path.expanduser("~/Projects/sts2-jev/jev-sts2")
PY = os.path.join(ROOT, ".cache/logdb-venv/bin/python")
QUERY = os.path.join(ROOT, "tools/logdb/query.py")
# Default window: from the V4.5 start (2026-10-03 11:00 CST); pass --since for the codex switch-over once it is live.
BRAIN_SINCE = "2026-10-03T03:00:00"


def arg(name, default=None):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def query(sql, sync):
    cmd = ["nice", "-n", "10", PY, QUERY, "--json", "--max-rows", "5000", "--timeout", "600"]
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


since = arg("--since", BRAIN_SINCE).replace("T", " ")
runs = [r for r in (arg("--runs", "") or "").split(",") if r]
sync = "--no-sync" not in sys.argv
where = f"split_part(src,'/',-1) = 'brain' AND ts >= TIMESTAMP '{since}'"
if runs:
    where += " AND run_id IN (" + ",".join("'" + r.replace("'", "") + "'" for r in runs) + ")"

print(f"Brain calls since {since} UTC" + (f", runs {','.join(runs)}" if runs else "") + "\n")

print("## By engine and question kind (seconds)")
table(query(f"""
  SELECT engine, coalesce(model,'') AS model, coalesce(effort,'') AS effort, label_head AS kind, count(*) AS calls,
         round(median(latency_ms)/1000.0,1) AS med_s, round(quantile_cont(latency_ms,0.9)/1000.0,1) AS p90_s,
         round(max(latency_ms)/1000.0,1) AS max_s, round(avg(input_tokens)) AS in_tok, round(avg(cache_hit_tokens)) AS cached,
         round(avg(output_tokens)) AS out_tok, round(avg(reasoning_tokens)) AS reason_tok,
         sum(coalesce(reasks,0)) AS reasks, sum(CASE WHEN parse_error THEN 1 ELSE 0 END) AS parse_err
  FROM llm_calls_raw WHERE {where}
  GROUP BY 1,2,3,4 ORDER BY 1,5 DESC""", sync),
  ["engine", "model", "effort", "kind", "calls", "med_s", "p90_s", "max_s", "in_tok", "cached", "out_tok", "reason_tok", "reasks", "parse_err"])

print("## By engine, all kinds")
table(query(f"""
  SELECT engine, count(*) AS calls, count(DISTINCT run_id) AS runs,
         round(median(latency_ms)/1000.0,1) AS med_s, round(quantile_cont(latency_ms,0.9)/1000.0,1) AS p90_s,
         round(sum(latency_ms)/1000.0/60/greatest(count(DISTINCT run_id),1),1) AS brain_min_per_run,
         sum(CASE WHEN fallback_from IS NOT NULL THEN 1 ELSE 0 END) AS answered_as_fallback,
         string_agg(DISTINCT error_kind, ',') AS error_kinds
  FROM llm_calls_raw WHERE {where} GROUP BY 1 ORDER BY 2 DESC""", False),
  ["engine", "calls", "runs", "med_s", "p90_s", "brain_min_per_run", "answered_as_fallback", "error_kinds"])

print("## Fallbacks (the engine that failed → the one that answered)")
table(query(f"""
  SELECT fallback_from AS failed, engine AS answered, coalesce(fallback_kind,'') AS why, count(*) AS n
  FROM llm_calls_raw WHERE {where} AND fallback_from IS NOT NULL GROUP BY 1,2,3 ORDER BY 4 DESC""", False),
  ["failed", "answered", "why", "n"])

print("## Per run (brain minutes by engine)")
table(query(f"""
  SELECT run_id, min(ts) AS first_call, count(*) AS calls,
         round(sum(CASE WHEN engine='codex' THEN latency_ms ELSE 0 END)/60000.0,1) AS codex_min,
         round(sum(CASE WHEN engine='deepseek' THEN latency_ms ELSE 0 END)/60000.0,1) AS deepseek_min,
         round(sum(CASE WHEN engine NOT IN ('codex','deepseek') THEN latency_ms ELSE 0 END)/60000.0,1) AS other_min,
         sum(CASE WHEN fallback_from IS NOT NULL THEN 1 ELSE 0 END) AS fallbacks
  FROM llm_calls_raw WHERE {where} GROUP BY 1 ORDER BY 2""", False),
  ["run_id", "first_call", "calls", "codex_min", "deepseek_min", "other_min", "fallbacks"])
