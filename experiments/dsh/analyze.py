#!/usr/bin/env python3
"""Tables for the report from data/dataset.jsonl, data/results.jsonl and data/judged.jsonl.

Prints markdown sections (overall per arm, per label group, failure classes, latency, tokens/cost,
agreement) and writes data/summary.json with the numbers.
"""
import json, statistics, collections, sys
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
PRICE = {"miss": 0.30, "hit": 0.006, "out": 1.20}  # deepseek-flash, USD per million tokens, peak (ops/paper_dataset.py)

ds = {r["id"]: r for r in map(json.loads, open(DATA / "dataset.jsonl")) if not r.get("skipped")}
res = [json.loads(l) for l in open(DATA / "results.jsonl")]
judged = {}
if (DATA / "judged.jsonl").exists():
    for l in open(DATA / "judged.jsonl"):
        j = json.loads(l)
        judged[(j["id"], j["arm"])] = j
by = {(r["id"], r["arm"]): r for r in res}
ids = sorted({r["id"] for r in res if all((r["id"], a) in by for a in "ABC")})
ARMS = "ABC"

GROUP = {
    "reward/card": "reward/card", "rest/plan": "rest/plan", "event/choose": "event/choose+plan", "event/plan": "event/choose+plan",
    "event/act-plan": "event/act-plan", "shop/plan": "shop/plan", "map/route-plan": "map/route-plan", "run-plan": "run-plan",
}
def group(label):
    return GROUP.get(label, "selection/*" if label.startswith("selection/") else label)

PARSE = {"empty", "empty_truncated", "truncated", "not_json", "multiple_objects", "not_object", "no_tool_call", "malformed_arguments", "no_call"}
def classes_of(verdict):
    return set(verdict.get("classes", [])) if verdict else set()

def category(parse_error, verdict):
    """Coarse failure category of one answer (None = valid)."""
    if parse_error:
        return "parse:" + parse_error
    if verdict is None:
        return "parse:none"
    if verdict.get("ok"):
        return None
    c = classes_of(verdict)
    if "not_a_plan" in c:
        return "not_a_plan"
    if c & {"unknown_key", "unknown_route", "cards", "wrong_type", "repeat", "unaffordable_first", "not_json_object"}:
        return "invalid_value"
    if c & {"missing_route", "missing_field"}:
        return "missing_field"
    return "minor"

def first_attempt(r):
    """(parse_error, verdict-like) of an arm's FIRST answer, before any recovery."""
    if r["arm"] in "AB":
        raw = r.get("raw") or {}
        return raw.get("parse_error"), raw.get("verdict")
    atts = [a for a in r.get("attempts", []) if a["event"] != "plugin_ready" and a["event"] != "pre_step_rejected"]
    if not atts:
        return ("harness_error" if r.get("error") else "no_tool_call"), None
    a = atts[0]
    if a["event"] == "accepted":
        return None, {"ok": True, "classes": [], "warnings": a.get("warnings", [])}
    if a["event"] == "no_tool_call":
        return "no_tool_call", None
    return None, {"ok": False, "classes": a.get("classes", []), "errors": a.get("errors", [])}

def final_ok(r):
    if r["arm"] == "C":
        return r.get("accepted") is not None
    return bool(r.get("final")) and bool((r.get("final_verdict") or {}).get("ok"))

def final_answer(r):
    return r.get("accepted") if r["arm"] == "C" else r.get("final")

def final_category(r):
    if r["arm"] == "C":
        if r.get("accepted") is not None:
            return None
        atts = [a for a in r.get("attempts", []) if a["event"] in ("invalid", "no_tool_call")]
        if r.get("error") and not atts:
            return "harness_error"
        last = atts[-1] if atts else None
        if not last:
            return "no_answer"
        return "parse:no_tool_call" if last["event"] == "no_tool_call" else category(None, {"ok": False, "classes": last.get("classes", [])})
    if not r.get("final"):
        err = (r.get("error") or "")
        if "HTTP" in err or "abort" in err.lower() or "timeout" in err.lower() or "fetch" in err.lower():
            return "transport"
        return "parse:" + (r.get("raw", {}).get("parse_error") or "unusable")
    return category(None, r.get("final_verdict"))

def calls_of(r):
    if r["arm"] in "AB":
        out = []
        for c in r["calls"]:
            out.append({"in": c["prompt_tokens"], "hit": c["cache_hit_tokens"], "out": c["completion_tokens"], "reason": c["reasoning_tokens"], "lat": c["latency_ms"], "finish": c["finish_reason"]})
        return out
    out = []
    for c in r.get("calls", []):
        total_in = c["input_tokens"] + c["cache_read"] + c["cache_write"]
        out.append({"in": total_in, "hit": c["cache_read"], "out": c["output_tokens"], "reason": None, "reason_chars": c["thinking_chars"], "lat": None, "finish": None})
    return out

def cost(calls):
    usd = 0.0
    for c in calls:
        usd += (c["in"] - c["hit"]) * PRICE["miss"] / 1e6 + c["hit"] * PRICE["hit"] / 1e6 + c["out"] * PRICE["out"] / 1e6
    return usd

def pct(xs, p):
    if not xs:
        return float("nan")
    xs = sorted(xs)
    k = (len(xs) - 1) * p
    lo, hi = int(k), min(int(k) + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)

def latency(r):
    """Seconds the caller waits for this question's decision (all attempts; C without process start)."""
    if r["arm"] == "C":
        return r["runMs"] / 1000
    return sum(c["latency_ms"] for c in r["calls"]) / 1000

# ------------------------------------------------------------------ agreement helpers
def choice_key(ans, kind):
    if not ans:
        return None
    if kind == "pick":
        return ans.get("choice")
    if kind == "shop-plan":
        steps = [s for s in (ans.get("plan") or []) if s != "leave"]
        return tuple(steps)
    return (ans.get("elites"), ans.get("rest"))

def logged_key(q):
    lg = q["logged"]
    if q["kind"] == "pick":
        return lg.get("choice") if lg.get("choice") in q["criteria"] else None
    if q["kind"] == "shop-plan":
        plan = lg.get("plan")
        return tuple(s for s in plan if s != "leave") if isinstance(plan, list) else None
    raw = lg.get("raw") or {}
    if not isinstance(raw, dict) or not raw.get("archetype"):
        return None
    return (raw.get("elites"), raw.get("rest"))

def option_level(k):
    return k.split(":")[0] if isinstance(k, str) else k

def md_table(header, rows):
    out = ["| " + " | ".join(header) + " |", "|" + "|".join("---" for _ in header) + "|"]
    out += ["| " + " | ".join(str(x) for x in row) + " |" for row in rows]
    return "\n".join(out)

def rate(n, d):
    return f"{n}/{d} ({100*n/d:.0f}%)" if d else "-"

summary = {}
print(f"questions with all three arms: {len(ids)}")
# ------------------------------------------------------------------ 1. overall
rows = []
for arm in ARMS:
    rs = [by[(i, arm)] for i in ids]
    raw_fail = [first_attempt(r) for r in rs]
    raw_cat = [category(p, v) for p, v in raw_fail]
    fin_cat = [final_category(r) for r in rs]
    n = len(rs)
    raw_bad = sum(1 for c in raw_cat if c and c != "minor")
    raw_any = sum(1 for c in raw_cat if c)
    fin_bad = sum(1 for c in fin_cat if c and c != "minor")
    outside_raw = sum(1 for c in raw_cat if c == "invalid_value")
    missing_raw = sum(1 for c in raw_cat if c == "missing_field")
    notplan_raw = sum(1 for c in raw_cat if c == "not_a_plan")
    parse_raw = sum(1 for c in raw_cat if c and c.startswith("parse:"))
    live_ok = sum(1 for i in ids if judged.get((i, arm), {}).get("accepted"))
    live_n = sum(1 for i in ids if (i, arm) in judged)
    calls = [c for r in rs for c in calls_of(r)]
    lat = [latency(r) for r in rs]
    usd = cost(calls)
    minor_raw = sum(1 for c in raw_cat if c == "minor")
    rows.append([arm, n, rate(raw_bad, n), rate(parse_raw, n), rate(outside_raw, n), rate(missing_raw, n), rate(notplan_raw, n), rate(minor_raw, n), rate(fin_bad, n), rate(live_ok, live_n), len(calls), f"{pct(lat,.5):.1f}", f"{pct(lat,.95):.1f}", f"{usd:.3f}"])
    summary[arm] = {"n": n, "minor": minor_raw, "raw_fail": raw_bad, "raw_any": raw_any, "parse": parse_raw, "outside": outside_raw, "missing": missing_raw, "not_a_plan": notplan_raw, "final_fail": fin_bad, "live_ok": live_ok, "live_n": live_n, "calls": len(calls), "p50": pct(lat, .5), "p95": pct(lat, .95), "usd": usd,
                    "in": sum(c["in"] for c in calls), "hit": sum(c["hit"] for c in calls), "out": sum(c["out"] for c in calls), "reason": sum(c["reason"] or 0 for c in calls)}
print("\n## overall\n")
print(md_table(["arm", "n", "raw fail (excl. minor)", "no object", "outside valid set", "missing field", "run plan not a plan", "minor (extra field/empty reason)", "fail after own recovery", "live resolver accepts", "calls", "p50 s", "p95 s", "cost $"], rows))

# ------------------------------------------------------------------ 2. per label group
print("\n## per label group (raw fail / fail after recovery / live accept / p50 s / mean cost $)\n")
groups = sorted({group(ds[i]["label"]) for i in ids})
rows = []
summary["groups"] = {}
for g in groups:
    gi = [i for i in ids if group(ds[i]["label"]) == g]
    row = [g, len(gi)]
    for arm in ARMS:
        rs = [by[(i, arm)] for i in gi]
        rb = sum(1 for r in rs if (lambda c: c and c != "minor")(category(*first_attempt(r))))
        fb = sum(1 for r in rs if (lambda c: c and c != "minor")(final_category(r)))
        lo = sum(1 for i in gi if judged.get((i, arm), {}).get("accepted"))
        lat = [latency(r) for r in rs]
        usd = sum(cost(calls_of(r)) for r in rs) / len(rs)
        row.append(f"{rb} / {fb} / {lo} / {pct(lat,.5):.0f} / {usd:.4f}")
        summary["groups"].setdefault(g, {})[arm] = {"n": len(gi), "raw_fail": rb, "final_fail": fb, "live_ok": lo, "p50": pct(lat, .5), "p95": pct(lat, .95), "usd_mean": usd}
    rows.append(row)
print(md_table(["group", "n", "A", "B", "C"], rows))

# ------------------------------------------------------------------ 3. failure classes (raw)
print("\n## raw failure classes (first answer, before recovery)\n")
for arm in ARMS:
    c = collections.Counter()
    for i in ids:
        cat = category(*first_attempt(by[(i, arm)]))
        if cat:
            c[cat] += 1
    print(f"- {arm}: {dict(c)}")
print("\n## final failure classes (after the arm's own recovery)\n")
for arm in ARMS:
    c = collections.Counter(final_category(by[(i, arm)]) for i in ids)
    c.pop(None, None)
    print(f"- {arm}: {dict(c)}")
print("\n## recovery paths\n")
for arm in "AB":
    print(f"- {arm}: {dict(collections.Counter(by[(i, arm)].get('path') for i in ids))}")
catt = collections.Counter()
for i in ids:
    r = by[(i, "C")]
    atts = [a for a in r.get("attempts", []) if a["event"] in ("accepted", "invalid", "no_tool_call")]
    ok = [a for a in atts if a["event"] == "accepted"]
    catt["accepted_at_%d" % ok[0]["attempt"] if ok else "not_accepted"] += 1
print(f"- C: {dict(catt)}")

# ------------------------------------------------------------------ 4. tokens
print("\n## tokens (sums over the questions)\n")
rows = []
for arm in ARMS:
    s = summary[arm]
    n = s["n"]
    rows.append([arm, s["calls"], f"{s['in']:,}", f"{s['hit']:,} ({100*s['hit']/max(s['in'],1):.0f}%)", f"{s['out']:,}", f"{s['reason']:,}" if arm != "C" else "n/a (in output)", f"{s['out']/n:,.0f}", f"{s['usd']:.3f}", f"{s['usd']/n:.4f}"])
print(md_table(["arm", "calls", "input", "cache hit", "output", "reasoning", "output / question", "cost $", "cost / question $"], rows))

# finish_reason=length and long answers
print("\n## truncation and long answers\n")
for arm in "AB":
    fl = sum(1 for i in ids for c in by[(i, arm)]["calls"] if c["finish_reason"] == "length")
    print(f"- {arm}: finish_reason=length {fl}")
for arm in ARMS:
    long = sorted(((latency(by[(i, arm)]), i, ds[i]["label"]) for i in ids), reverse=True)[:5]
    print(f"- {arm} slowest: " + ", ".join(f"{i} {l} {t:.0f}s" for t, i, l in long))

# ------------------------------------------------------------------ 5. agreement
print("\n## agreement\n")
def agree(a, b, kind, level="exact"):
    if a is None or b is None:
        return None
    if kind == "pick" and level == "option":
        return option_level(a) == option_level(b)
    return a == b
rows = []
summary["agreement"] = {}
for kind in ["pick", "shop-plan", "run-plan"]:
    ki = [i for i in ids if ds[i]["kind"] == kind]
    row = [kind, len(ki)]
    for arm in ARMS:
        vals = [agree(choice_key(final_answer(by[(i, arm)]), kind), logged_key(ds[i]), kind) for i in ki]
        vals = [v for v in vals if v is not None]
        row.append(rate(sum(vals), len(vals)))
        summary["agreement"].setdefault(kind, {})[f"{arm}~logged"] = [sum(vals), len(vals)]
    for x, y in [("A", "B"), ("A", "C"), ("B", "C")]:
        vals = [agree(choice_key(final_answer(by[(i, x)]), kind), choice_key(final_answer(by[(i, y)]), kind), kind) for i in ki]
        vals = [v for v in vals if v is not None]
        row.append(rate(sum(vals), len(vals)))
        summary["agreement"].setdefault(kind, {})[f"{x}~{y}"] = [sum(vals), len(vals)]
    rows.append(row)
print(md_table(["kind", "n", "A~logged", "B~logged", "C~logged", "A~B", "A~C", "B~C"], rows))

# route agreement (questions with a route)
ri = [i for i in ids if ds[i]["spec"].get("route")]
rows = []
for arm in ARMS:
    vals = []
    for i in ri:
        ans = final_answer(by[(i, arm)]) or {}
        lg = ds[i]["logged"].get("route")
        if ans.get("route") and lg:
            vals.append(ans["route"] == lg)
    rows.append([arm, rate(sum(vals), len(vals))])
print("\nroute ~ logged (questions with a route review / act route and a logged route):")
print(md_table(["arm", "route ~ logged"], rows))

# ------------------------------------------------------------------ 6. instruction violations / warnings
print("\n## instruction violations (usable answers that break an explicit instruction)\n")
for arm in ARMS:
    w = collections.Counter()
    for i in ids:
        r = by[(i, arm)]
        if arm == "C":
            acc = [a for a in r.get("attempts", []) if a["event"] == "accepted"]
            warns = acc[0].get("warnings", []) if acc else []
        else:
            warns = (r.get("final_verdict") or {}).get("warnings", []) if r.get("final") else []
        for x in warns:
            w[x.split(" ")[0] + " " + x.split(" ")[1]] += 1
        j = judged.get((i, arm), {})
        if j.get("empty_plan"):
            w["run plan accepted but empty"] += 1
        rr = j.get("route_review") or {}
        if rr.get("outcome") == "invalid":
            w["route review invalid: " + (rr.get("invalid") or "")[:40]] += 1
    print(f"- {arm}: {dict(w)}")

(DATA / "summary.json").write_text(json.dumps(summary, indent=1, default=str))

# ------------------------------------------------------------------ 7. route answers between arms
print("\n## route answers (questions with a route field)\n")
ri = [i for i in ids if ds[i]["spec"].get("route")]
rows = []
for mode in ("review", "act"):
    mi = [i for i in ri if ds[i]["spec"]["route"]["mode"] == mode]
    if not mi:
        continue
    row = [mode, len(mi)]
    for arm in ARMS:
        routes = [(final_answer(by[(i, arm)]) or {}).get("route") for i in mi]
        present = sum(1 for r in routes if r)
        keep = sum(1 for r in routes if r == "keep")
        row.append(f"{present}/{len(mi)} given, {keep} keep")
    for x, y in [("A", "B"), ("A", "C"), ("B", "C")]:
        same = sum(1 for i in mi if (final_answer(by[(i, x)]) or {}).get("route") == (final_answer(by[(i, y)]) or {}).get("route"))
        row.append(f"{same}/{len(mi)}")
    rows.append(row)
print(md_table(["route kind", "n", "A", "B", "C", "A~B", "A~C", "B~C"], rows))
