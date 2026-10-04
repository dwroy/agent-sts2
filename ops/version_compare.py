#!/usr/bin/env python3
"""V3 vs V2 comparison (A8 Ironclad), read-only over the logs.

Inputs: jev-sts2/logs/runs.jsonl, jev-sts2/logs/decisions.jsonl, ops/autoplay.log,
jev-sts2/logs/console/*.log (process start from the file name, "elapsed N s" from its summary).
Output: markdown on stdout (paper/materials/v3-vs-v2-2026-09-29.md).

Row -> run: run_id, else the fingerprint's "run", else the time window (previous run's end, this run's end].
Room type of floor F: the MAP decision made on floor F-1 ("step i/n <Type> at row", "chose route <Type> ->",
"only one legal option: <Type>"); boss floors 17/33/48.
"""
import collections
import datetime as dt
import glob
import json
import os
import re
import statistics
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import LOGS, ROOT  # noqa: E402
V2 = "4LC3YKCZV218 LMTA6JC86RCC 63CP940HCKAL JUXB9P5BGATV 69HWH6MD1S34 LXB3B2WT9E0W GG0Y0TJ2JXAR N7SAK31B9ZZZ FSPKJAYY3ET6 EZ2LP1P5VRPT".split()
V3PRE = "Z6AMPPWHQ5CV VQKX9AD1YHKS".split()
V3 = "VNWR16YEJASM 981WMX8MQ7DK 0B5YKJFM0E8B WXMBVL6ZJ000 RWWGRRYKD6LT WCC7RMRLWLZK RBJ402TKQZ6F 2CCM6XK4PB37 Y0CWCD0C03FL Y3XT9EBS7U8B".split()
VERSIONS = [("V2", V2), ("V3", V3), ("V3-pre", V3PRE)]
TARGET = set(V2 + V3 + V3PRE)
# A model's own decision: the brain engine that answered ("codex", "deepseek (for codex)" since 2026-10-03), or a v3 escalator.
BRAIN_DECIDER = re.compile(r"^(deepseek|claude|codex|dsh)( \(for (deepseek|claude|codex|dsh)\))?$")
BOSS_FLOORS = (17, 33, 48)
LOCAL = dt.timezone(dt.timedelta(hours=8))


def ts(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


# ---- runs.jsonl
runs = {}
all_ends = []
for line in open(os.path.join(LOGS, "runs.jsonl"), encoding="utf8"):
    try:
        r = json.loads(line)
    except json.JSONDecodeError:
        continue
    all_ends.append((ts(r["ended"]), r["run_id"]))
    if r["run_id"] in TARGET:
        runs[r["run_id"]] = r
all_ends.sort()
t_min = min(ts(runs[rid]["ended"]) for rid in TARGET) - dt.timedelta(hours=2)


def window_run(t):
    for end, rid in all_ends:
        if t <= end:
            return rid
    return None


# ---- run time: autoplay.log finished lines + console process logs
finished = []
for line in open(os.path.join(ROOT, "ops/autoplay.log"), encoding="utf8"):
    m = re.match(r"(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) finished run (\w+)", line)
    if m:
        finished.append((dt.datetime.strptime(m.group(1), "%Y-%m-%d %H:%M:%S").replace(tzinfo=LOCAL), m.group(2)))
consoles = []
for path in glob.glob(os.path.join(LOGS, "console/*.log")):
    m = re.match(r"(\d{8}-\d{6})", os.path.basename(path))
    if not m:
        continue
    start = dt.datetime.strptime(m.group(1), "%Y%m%d-%H%M%S").replace(tzinfo=LOCAL)
    if start < t_min:
        continue
    elapsed = None
    with open(path, encoding="utf8", errors="replace") as fh:
        for line in fh:
            e = re.search(r"runs completed \d+ \| elapsed ([\d.]+) s", line)
            if e:
                elapsed = float(e.group(1))
    consoles.append((start, elapsed, os.path.basename(path)))
consoles.sort()

timing = {}
for rid in TARGET:
    mine = [t for t, r in finished if r == rid]
    if not mine:
        continue
    first_fin, last_fin = mine[0], mine[-1]
    prev = max((t for t, r in finished if r != rid and t < first_fin), default=None)
    procs = [c for c in consoles if (prev is None or c[0] > prev) and c[0] <= last_fin]
    if not procs:
        continue
    wall = (last_fin - procs[0][0]).total_seconds()
    active = sum(c[1] if c[1] is not None else 0 for c in procs)
    timing[rid] = {"wall_s": wall, "active_s": active if all(c[1] is not None for c in procs) else None,
                   "procs": len(procs), "restarts": len(mine) - 1}

# ---- decisions.jsonl
per = collections.defaultdict(lambda: collections.defaultdict(float))
labels = collections.defaultdict(collections.Counter)  # (version-free) run -> Counter of (label, code?)
room = collections.defaultdict(dict)  # run -> floor -> type
drinks = collections.defaultdict(list)  # run -> [floor]
potions_entering = collections.defaultdict(dict)  # run -> boss floor -> count
TYPE_RES = [re.compile(r"step \d+/\d+ (\w+) at row"), re.compile(r"chose route (\w+)"), re.compile(r"only one legal option: (\w+)")]

with open(os.path.join(LOGS, "decisions.jsonl"), encoding="utf8") as fh:
    for line in fh:
        if '"mode"' not in line[:200]:
            pass
        try:
            d = json.loads(line)
        except json.JSONDecodeError:
            continue
        t = d.get("ts")
        if not t or ts(t) < t_min or d.get("mode") != "play":
            continue
        try:
            fp = json.loads(d.get("fingerprint") or "{}")
        except json.JSONDecodeError:
            fp = {}
        rid = d.get("run_id")
        if not rid or rid == "run_unknown":
            rid = fp.get("run")
        if not rid or rid == "run_unknown":
            rid = window_run(ts(t))
        if rid not in TARGET:
            continue
        p = per[rid]
        label, decider, rat = d.get("label", ""), d.get("decider", ""), d.get("rationale", "") or ""
        floor = d.get("floor")
        p["rows"] += 1
        # room types
        if d.get("screen") == "MAP" and isinstance(floor, int):
            for rx in TYPE_RES:
                m = rx.search(rat)
                if m:
                    room[rid][floor + 1] = m.group(1)
                    break
        # combat decision makers
        if d.get("screen") == "COMBAT" and label != "combat/plan-continue":
            p["combat_n"] += 1
            if decider == "code":
                p["combat_code"] += 1
            labels[rid][(label, decider)] += 1
        # potions entering boss fights
        if d.get("screen") == "COMBAT" and floor in BOSS_FLOORS and floor not in potions_entering[rid]:
            held = [s.split(":")[0] for s in (fp.get("potions") or "").split("|") if s.split(":")[0]]
            potions_entering[rid][floor] = len(held)
        if (d.get("chosen") or {}).get("action") == "use_potion":
            drinks[rid].append(floor)
        # rollout
        if "rollout_best_chosen" in d:
            v = d["rollout_best_chosen"]
            p["rb_rows"] += 1
            if v is not None:
                p["rb_n"] += 1
                p["rb_true"] += 1 if v else 0
        # HP guard
        if "HP guard" in rat:
            if d.get("screen") == "COMBAT":
                p["hpguard_combat"] += 1
            else:
                p["hpguard_other"] += 1
        answer = ((d.get("answers") or {}).get("plan") or {})
        choice = answer.get("choice") if isinstance(answer, dict) else None
        # focus
        if d.get("focus"):
            p["focus_rows"] += 1
            if choice in d["focus"]:
                p["focus_chosen"] += 1
        if "chosen_order" in d:
            p["chosen_order_rows"] += 1
        # random-potion MC options
        pot = d.get("potions")
        if isinstance(pot, dict) and pot.get("random"):
            p["mc_rows"] += 1
            p["mc_options"] += len(pot["random"])
            if isinstance(choice, str) and re.fullmatch(r"p\d+", choice):
                slot = int(choice[1:])
                slots = [s.split(":")[0] for s in (fp.get("potions") or "").split("|")]
                pid = slots[slot] if slot < len(slots) else None
                if pid in {x.get("potion") for x in pot["random"]}:
                    p["mc_chosen"] += 1
                else:
                    p["mc_other_potion_chosen"] += 1
        if isinstance(pot, dict) and pot.get("unsimulated_offered"):
            p["unsim_rows"] += 1
        # DeepSeek
        ds = d.get("deepseek")
        # Memo-reused answers and one-shot plan steps made no call.
        if isinstance(ds, dict) and not ds.get("reused"):
            p["ds_calls"] += 1
            p["ds_in"] += ds.get("input_tokens") or 0
            p["ds_hit"] += ds.get("cache_hit_tokens") or 0
            p["ds_out"] += ds.get("output_tokens") or 0
            lat = (d.get("latency_ms") or {}).get("deepseek")
            p["ds_ms"] += lat if lat is not None else (ds.get("latency_ms") or 0)
        lat = d.get("latency_ms") or {}
        p["jev_ms"] += lat.get("jev") or 0
        u = d.get("usage") or {}
        # A brain decision's usage is the brain's tokens (whichever engine: "codex", "deepseek (for codex)" since 2026-10-03).
        if not (BRAIN_DECIDER.match(decider or "") and (decider != "claude" or not d.get("escalation"))):
            p["jev_tok"] += (u.get("input_tokens") or 0) + (u.get("output_tokens") or 0)


def kind_of(rid, floor):
    if floor in BOSS_FLOORS:
        return "boss"
    t = room[rid].get(floor)
    if t == "Elite":
        return "elite"
    if t is None:
        return "hallway?"
    return "hallway"


rows = {}
for rid in TARGET:
    r = runs[rid]
    p = per[rid]
    tm = timing.get(rid, {})
    k = collections.Counter(kind_of(rid, f) for f in drinks[rid])
    ent = potions_entering[rid]
    last_boss = max(ent) if ent else None
    ds_in = r.get("ds_tokens_in", p["ds_in"])
    ds_hit = r.get("ds_cache_hit", p["ds_hit"])
    ds_out = r.get("ds_tokens_out", p["ds_out"])
    run_s = tm.get("active_s") or tm.get("wall_s")
    rows[rid] = {
        "floor": r["floor"], "act1": r["floor"] > 17, "act2": r["floor"] > 33, "win": bool(r.get("victory")),
        "code": r.get("code"), "death": "/".join(r.get("death_fight") or []),
        "wall_min": tm.get("wall_s", float("nan")) / 60, "active_min": (tm.get("active_s") or float("nan")) / 60,
        "procs": tm.get("procs"),
        "rb_n": p["rb_n"], "rb_true": p["rb_true"],
        "combat_n": p["combat_n"], "combat_code": p["combat_code"],
        "focus_rows": p["focus_rows"], "focus_chosen": p["focus_chosen"],
        "hpguard": p["hpguard_combat"], "hpguard_other": p["hpguard_other"],
        "drinks": len(drinks[rid]), "d_hall": k["hallway"] + k["hallway?"], "d_elite": k["elite"], "d_boss": k["boss"],
        "d_unknown_room": k["hallway?"],
        "pot_act2boss": ent.get(33), "pot_lastboss": ent.get(last_boss) if last_boss else None, "last_boss": last_boss,
        "mc_rows": p["mc_rows"], "mc_chosen": p["mc_chosen"], "mc_other": p["mc_other_potion_chosen"],
        "ds_calls": p["ds_calls"], "ds_in": ds_in, "ds_out": ds_out, "ds_hit": ds_hit,
        "ds_in_rows": p["ds_in"], "ds_hit_rows": p["ds_hit"], "ds_out_rows": p["ds_out"],
        "jev_tok": r.get("tokens"), "ds_s": p["ds_ms"] / 1000, "run_s": run_s,
        "ds_share": (p["ds_ms"] / 1000 / run_s) if run_s else float("nan"),
    }


def mean(xs):
    xs = [x for x in xs if x is not None and x == x]
    return statistics.mean(xs) if xs else float("nan")


def rate(num, den):
    return f"{num / den:.0%} ({int(num)}/{int(den)})" if den else "n/a"


def summary(ids):
    R = [rows[i] for i in ids]
    n = len(R)
    out = {}
    out["runs"] = str(n)
    out["mean floor"] = f"{mean([r['floor'] for r in R]):.1f}"
    out["act-1 boss passed (floor > 17)"] = rate(sum(r["act1"] for r in R), n)
    out["act-2 boss passed (floor > 33)"] = rate(sum(r["act2"] for r in R), n)
    out["wins"] = f"{sum(r['win'] for r in R)}/{n}"
    out["minutes/run, active (sum of process time)"] = f"{mean([r['active_min'] for r in R]):.1f}"
    out["minutes/run, wall (first start to last finish)"] = f"{mean([r['wall_min'] for r in R]):.1f}"
    out["minutes per floor reached (active)"] = f"{sum(r['active_min'] for r in R) / sum(r['floor'] for r in R):.2f}"
    out["Jev chose rollout-best (non-null rows)"] = rate(sum(r["rb_true"] for r in R), sum(r["rb_n"] for r in R))
    out["COMBAT decisions by code alone (excl. plan-continue)"] = rate(sum(r["combat_code"] for r in R), sum(r["combat_n"] for r in R))
    out["focus-tagged option chosen (rows with focus)"] = rate(sum(r["focus_chosen"] for r in R), sum(r["focus_rows"] for r in R))
    out["HP-guard replacements/run (combat)"] = f"{mean([r['hpguard'] for r in R]):.1f}"
    out["potions drunk/run (hallway / elite / boss)"] = (
        f"{mean([r['drinks'] for r in R]):.1f} ({mean([r['d_hall'] for r in R]):.1f} / {mean([r['d_elite'] for r in R]):.1f} / {mean([r['d_boss'] for r in R]):.1f})")
    a2 = [r["pot_act2boss"] for r in R if r["pot_act2boss"] is not None]
    out["potions held entering act-2 boss (F33)"] = f"{mean(a2):.1f} (n={len(a2)})" if a2 else "n/a (none reached)"
    out["potions held entering last boss fought"] = f"{mean([r['pot_lastboss'] for r in R]):.1f} (n={sum(r['pot_lastboss'] is not None for r in R)})"
    out["random-potion MC: Jev picked a random potion (rows offering one)"] = rate(sum(r["mc_chosen"] for r in R), sum(r["mc_rows"] for r in R))
    ds_in, ds_hit, ds_out = (sum(r[k] for r in R) for k in ("ds_in", "ds_hit", "ds_out"))
    out["DeepSeek tokens in/run (k)"] = f"{ds_in / n / 1000:.0f}"
    out["DeepSeek tokens out/run (k)"] = f"{ds_out / n / 1000:.0f}"
    out["DeepSeek cache-hit rate"] = f"{ds_hit / ds_in:.0%}" if ds_in else "n/a"
    out["DeepSeek calls/run"] = f"{mean([r['ds_calls'] for r in R]):.1f}"
    out["Jev tokens/run (k)"] = f"{mean([r['jev_tok'] for r in R]) / 1000:.0f}"
    out["DeepSeek latency share of run time"] = f"{sum(r['ds_s'] for r in R) / sum(r['run_s'] for r in R):.0%} ({mean([r['ds_s'] for r in R]) / 60:.1f} min/run)"
    return out


def combat_breakdown(ids):
    c = collections.Counter()
    for i in ids:
        c.update(labels[i])
    total = sum(c.values())
    by_label = collections.defaultdict(collections.Counter)
    for (lab, dec), v in c.items():
        by_label[lab][dec] += v
    return total, by_label


def fmt_breakdown(ids):
    total, by_label = combat_breakdown(ids)
    parts = []
    for lab, cnt in sorted(by_label.items(), key=lambda x: -sum(x[1].values())):
        s = sum(cnt.values())
        parts.append((lab, s, cnt.get("code", 0), total))
    return parts


def main():
    out = []
    w = out.append
    S = {name: summary(ids) for name, ids in VERSIONS}
    w("# V3 vs V2 (A8 Ironclad), 2026-09-29")
    w("")
    w("Generated by `ops/version_compare.py` (read-only over runs.jsonl, decisions.jsonl, autoplay.log, console logs). "
      "V2 = 10 runs, V3 = first 10 runs; V3-pre (Z6AM, VQKX) shown as a note column, not pooled into V3. Small n: read as direction, not significance.")
    w("")
    w("## Summary")
    w("")
    w("| metric | V2 | V3 | V3-pre (note) |")
    w("|---|---|---|---|")
    for k in S["V2"]:
        w(f"| {k} | {S['V2'][k]} | {S['V3'][k]} | {S['V3-pre'][k]} |")
    w("")
    w("COMBAT code-alone share by label (code rows / all rows of that label; share of all non-continue COMBAT rows):")
    w("")
    w("| label | V2 | V3 | V3-pre |")
    w("|---|---|---|---|")
    bd = {name: {lab: (s, code, tot) for lab, s, code, tot in fmt_breakdown(ids)} for name, ids in VERSIONS}
    labs = sorted(set().union(*[set(b) for b in bd.values()]), key=lambda l: -sum(bd[n].get(l, (0, 0, 0))[0] for n in bd))
    for lab in labs:
        cells = []
        for name in ("V2", "V3", "V3-pre"):
            s, code, tot = bd[name].get(lab, (0, 0, 0))
            cells.append(f"{code}/{s} ({s / tot:.0%} of rows)" if tot and s else "-")
        w(f"| {lab} | " + " | ".join(cells) + " |")
    w("")
    w("## Per run")
    w("")
    w("| ver | run | code | floor | died to | min act/wall | RB chosen | code-alone combat | focus | HPg | drinks h/e/b | pot@F33 | pot@last boss | MC pick | DS in/out k (hit) | Jev k | DS time |")
    w("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for name, ids in VERSIONS:
        for rid in ids:
            r = rows[rid]
            w("| " + " | ".join([
                name, rid, r["code"] or "", str(r["floor"]), r["death"],
                f"{r['active_min']:.0f}/{r['wall_min']:.0f}" + (f" ({r['procs']}p)" if r["procs"] and r["procs"] > 1 else ""),
                rate(r["rb_true"], r["rb_n"]), rate(r["combat_code"], r["combat_n"]),
                f"{r['focus_chosen']:.0f}/{r['focus_rows']:.0f}" if r["focus_rows"] else "-",
                str(int(r["hpguard"])),
                f"{r['d_hall']}/{r['d_elite']}/{r['d_boss']}",
                "-" if r["pot_act2boss"] is None else str(r["pot_act2boss"]),
                "-" if r["pot_lastboss"] is None else f"{r['pot_lastboss']} (F{r['last_boss']})",
                f"{r['mc_chosen']:.0f}/{r['mc_rows']:.0f}" if r["mc_rows"] else "-",
                f"{r['ds_in'] / 1000:.0f}/{r['ds_out'] / 1000:.0f} ({r['ds_hit'] / r['ds_in']:.0%})" if r["ds_in"] else "-",
                f"{(r['jev_tok'] or 0) / 1000:.0f}",
                f"{r['ds_share']:.0%}",
            ]) + " |")
    w("")
    w("## Notes and definitions")
    w("")
    w("- Minutes: console process logs (start = file name, local UTC+8) mapped to a run when they start after the previous run's last `finished run` line and at or before this run's last one. "
      "active = sum of each process's `elapsed` (restart gaps between processes excluded; a stall inside a process before it died, e.g. VNWR's Jev 520, stays in); wall = first start to last finish. "
      "Restarted runs: " + ", ".join(f"{rid} ({rows[rid]['procs']} processes)" for rid in TARGET if (rows[rid]["procs"] or 0) > 1) + ".")
    w("- Rollout-best: rows carrying `rollout_best_chosen`, share true among non-null (null = no rollout best or no parsable pick).")
    w("- Code-alone combat share: COMBAT rows excluding `combat/plan-continue` (plan execution); decider == `code`. `code-fallback` rows (Jev failed/timeout) are not counted as code.")
    w("- Focus: rows with a `focus` map (V3 target-option change); chosen = Jev's answer key is a focus-tagged plan key (before any HP-guard swap).")
    w("- HP guard: COMBAT rows whose rationale contains `HP guard` (Jev-pick replacement and code's own over-bound replacement). "
      f"Non-combat mentions (event option filtering) are excluded: V2 {sum(per[i]['hpguard_other'] for i in V2):.0f}, V3 {sum(per[i]['hpguard_other'] for i in V3):.0f}.")
    unk = {name: sum(rows[i]["d_unknown_room"] for i in ids) for name, ids in VERSIONS}
    w("- Potions drunk: rows whose chosen action is `use_potion` (Jev picks, plan steps `POTION:` executed as plan-continue, code's plan-potion). "
      "Room: boss = floors 17/33/48; elite = MAP decision on the previous floor chose an `Elite` node; everything else (Monster, Unknown) = hallway. "
      f"Drinks whose room could not be parsed (counted as hallway): V2 {unk['V2']}, V3 {unk['V3']}, V3-pre {unk['V3-pre']}.")
    w("- Potions held entering a boss: potion slots filled in the fingerprint of the first COMBAT row on floor 17/33/48. Last boss fought = highest such floor reached.")
    w("- Random-potion MC: rows whose `potions.random` is non-empty (logged from V3-pre on); picked = Jev's answer is a potion key whose slot holds one of the MC potions. "
      f"Other potion picks on those rows: V3 {sum(rows[i]['mc_other'] for i in V3):.0f}, V3-pre {sum(rows[i]['mc_other'] for i in V3PRE):.0f}.")
    w("- DeepSeek tokens: runs.jsonl `ds_tokens_in/out`, `ds_cache_hit` where present (V3); otherwise summed from decision rows' `deepseek` block (V2, V3-pre). "
      "Cross-check (row sums vs runs.jsonl, V3 in): " + ", ".join(f"{rid[:4]} {rows[rid]['ds_in_rows'] / 1000:.0f}k vs {rows[rid]['ds_in'] / 1000:.0f}k" for rid in V3) + ".")
    w("- DeepSeek time share: sum of `latency_ms.deepseek` over the run's rows / active run time. Jev tokens: runs.jsonl `tokens`.")
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    sys.stdout.write(main())
