#!/usr/bin/env python3
"""Pick the ~100 logged DeepSeek questions the experiment replays (stratified by label, failures over-sampled).

Streams logs/deepseek-reasoning.jsonl, logs/decisions.jsonl and logs/run-plans.jsonl (never loads them whole)
and writes data/targets.json: one entry per question with the run, the decision row's ts (or the run-plan row),
the label, and the answer that was logged. Seeded, so the pick is reproducible.
"""
import json, random, collections, sys
from pathlib import Path

LOGS = Path(__file__).resolve().parents[2] / "logs"
OUT = Path(__file__).resolve().parent / "data" / "targets.json"
SINCE = "2026-09-28T06:00"  # map/route-plan and the current route/rest/event formats exist from here
ONESHOT_SINCE = "2026-09-29T04:47"  # shop/rest/event plans (BUILD_ONESHOT) exist from here
SEED = 20260929

QUOTA = {
    "reward/card": 12, "event/choose": 7, "event/plan": 7, "event/act-plan": 6, "rest/plan": 8, "shop/plan": 10,
    "map/route-plan": 10, "selection/upgrade": 3, "selection/remove": 3, "selection/add": 2, "selection/enchant": 2,
    "selection/transform": 1, "selection/choose": 1, "bundle/choose": 1,
}
RUN_PLAN_NORMAL = 7

# Failures seen in the console logs (UTC decision-row ts): visible and silent ones.
FAILURE_DECISIONS = {
    "2026-09-28T09:52:21.413Z": "reward/card non-JSON (empty reply)",
    "2026-09-28T10:05:41.543Z": "event/choose unknown option (option text 读下封底)",
    "2026-09-28T15:32:27.556Z": "event/choose unknown option (option text 沉溺)",
    "2026-09-28T16:58:08.451Z": "rest/choose unknown option (option text 休息)",
    "2026-09-28T17:26:12.614Z": "event/choose unknown option (option text 再撑一会)",
    "2026-09-28T22:47:17.478Z": "rest/choose inconsistent, re-asked",
    "2026-09-29T01:07:50.570Z": "rest/choose inconsistent, re-asked",
    "2026-09-29T01:46:06.236Z": "rest/choose inconsistent (empty reason), re-asked",
    "2026-09-29T04:28:15.890Z": "selection/upgrade non-JSON (truncated), recovered from reasoning",
    "2026-09-29T06:46:53.347Z": "rest/plan inconsistent, re-asked",
}


def stream(name):
    with open(LOGS / name, "rb") as f:
        for line in f:
            yield line


def main():
    rng = random.Random(SEED)
    # 1. reasoning rows (small fields only)
    reasoning = []
    for line in stream("deepseek-reasoning.jsonl"):
        ts = line[7:31].decode(errors="replace")
        if ts < SINCE:
            continue
        r = json.loads(line)
        label = r.get("label", "")
        if label.endswith("(re-ask)") or label in ("fight-plan", "run-plan"):
            continue
        reasoning.append({"ts": r["ts"], "label": label, "choice": r.get("choice"), "options": r.get("options"),
                          "effort": r.get("effort"), "latency_ms": r.get("latency_ms"), "usage": r.get("usage"),
                          "memory_chars": r.get("memory_chars"), "guide": r.get("guide")})
    # 2. DeepSeek decision rows
    decisions = []
    failures = {}
    for line in stream("decisions.jsonl"):
        ts = line[7:31].decode(errors="replace")
        if ts < SINCE:
            continue
        if b'"decider":"deepseek"' not in line and b'"deepseek_fallback"' not in line:
            continue
        r = json.loads(line)
        if r["ts"] in FAILURE_DECISIONS:
            failures[r["ts"]] = r
        ds = r.get("deepseek") or {}
        if r.get("decider") != "deepseek" or not ds.get("direct") or ds.get("reused"):
            continue
        if str(r.get("label", "")).startswith("combat/"):
            continue
        decisions.append(r)
    print(f"reasoning rows {len(reasoning)}, direct DeepSeek decisions {len(decisions)}, failures found {len(failures)}/{len(FAILURE_DECISIONS)}", file=sys.stderr)

    # 3. link each decision to its reasoning row (same label, reasoning logged within 15 s before the row)
    by_label = collections.defaultdict(list)
    for r in reasoning:
        by_label[r["label"]].append(r)
    def link(row):
        cands = [r for r in by_label.get(row["label"], []) if r["ts"] <= row["ts"] and r["ts"] >= row["ts"][:11] and r["ts"] > iso_minus(row["ts"], 15)]
        return cands[-1] if cands else None

    targets = []
    def entry(row, failure=None):
        ds = row.get("deepseek") or {}
        rr = link(row)
        return {
            "kind": "decision", "label": row["label"], "run_id": row.get("run_id"), "decision_ts": row["ts"],
            "observed_ts": row.get("observed_ts"), "floor": row.get("floor"), "fingerprint": row.get("fingerprint"),
            "failure": failure,
            "logged": {"decider": row.get("decider"), "choice": ds.get("choice"), "route": ds.get("route"), "cards": ds.get("cards"),
                       "plan": ds.get("plan"), "reason": ds.get("reason"), "consistency": ds.get("consistency") is not None,
                       "recovered": ds.get("recovered_from_reasoning"), "fallback": row.get("deepseek_fallback"),
                       "latency_ms": ds.get("latency_ms"), "input_tokens": ds.get("input_tokens"), "output_tokens": ds.get("output_tokens"),
                       "cache_hit_tokens": ds.get("cache_hit_tokens"), "reasoning_tokens": ds.get("reasoning_tokens"), "effort": ds.get("effort"),
                       "memory_chars": ds.get("memory_chars"), "guide": ds.get("guide"), "rationale": (row.get("rationale") or "")[:300]},
            "reasoning_row_ts": rr["ts"] if rr else None,
        }

    for ts, why in FAILURE_DECISIONS.items():
        if ts in failures:
            targets.append(entry(failures[ts], why))
    chosen_ts = {t["decision_ts"] for t in targets}
    pools = collections.defaultdict(list)
    for row in decisions:
        if row["ts"] in chosen_ts:
            continue
        label = row["label"]
        if label not in QUOTA or not row.get("run_id"):
            continue  # rows before 09-28 ~15:00 carry no run_id: replaying them needs a states.jsonl lookup
        if label in ("shop/plan", "rest/plan", "event/plan", "event/act-plan") and row["ts"] < ONESHOT_SINCE:
            continue
        pools[label].append(row)
    for label, n in QUOTA.items():
        pool = pools.get(label, [])
        rng.shuffle(pool)
        per_run = collections.Counter()
        picked = []
        for row in pool:
            if len(picked) >= n:
                break
            if per_run[row.get("run_id")] >= 2:
                continue
            per_run[row.get("run_id")] += 1
            picked.append(row)
        for row in sorted(picked, key=lambda r: r["ts"]):
            targets.append(entry(row))
        print(f"{label}: {len(picked)}/{n} from {len(pool)}", file=sys.stderr)

    # 4. run plans: every failure (error, echo, wrapped) + a random sample of normal ones
    plans = [json.loads(line) for line in stream("run-plans.jsonl")]
    normal = []
    for r in plans:
        raw = r.get("raw")
        why = None
        if "error" in r:
            why = f"run-plan {r['error'][:60]}"
        elif isinstance(raw, dict) and set(raw) <= {"choice", "reason"}:
            why = "run-plan echo {choice, reason} accepted as an empty plan"
        elif isinstance(raw, dict) and not raw.get("archetype"):
            why = "run-plan wrapped/odd object accepted as an empty plan"
        if why is None:
            if r["ts"] >= SINCE and r.get("observed_ts"):
                normal.append(r)
            continue
        targets.append(run_plan_entry(r, why))
    rng.shuffle(normal)
    per_run = collections.Counter()
    k = 0
    for r in normal:
        if k >= RUN_PLAN_NORMAL:
            break
        if per_run[r["run"]] >= 1:
            continue
        per_run[r["run"]] += 1
        targets.append(run_plan_entry(r, None))
        k += 1
    for i, t in enumerate(targets):
        t["id"] = f"q{i:03d}"
    OUT.write_text(json.dumps(targets, ensure_ascii=False, indent=1))
    print(f"{len(targets)} targets -> {OUT}", file=sys.stderr)
    c = collections.Counter(t["label"] for t in targets)
    print(dict(c), file=sys.stderr)


def run_plan_entry(r, why):
    raw = r.get("raw")
    return {"kind": "run-plan", "label": "run-plan", "run_id": r["run"], "plan_ts": r["ts"], "observed_ts": r.get("observed_ts"),
            "floor": r.get("floor"), "trigger": r.get("trigger"), "failure": why,
            "logged": {"raw": raw if isinstance(raw, (dict, list)) else None, "error": r.get("error"), "archetype": (r.get("plan") or {}).get("archetype"),
                       "want": (r.get("plan") or {}).get("want"), "elites": (r.get("plan") or {}).get("elites"), "rest": (r.get("plan") or {}).get("rest"),
                       "latency_ms": r.get("latency_ms"), "input_tokens": r.get("input_tokens"), "output_tokens": r.get("output_tokens"),
                       "cache_hit_tokens": r.get("cache_hit_tokens"), "reasoning_tokens": r.get("reasoning_tokens"), "effort": r.get("effort")}}


def iso_minus(ts, seconds):
    import datetime as dt
    t = dt.datetime.strptime(ts[:19], "%Y-%m-%dT%H:%M:%S") - dt.timedelta(seconds=seconds)
    return t.strftime("%Y-%m-%dT%H:%M:%S")


if __name__ == "__main__":
    main()
