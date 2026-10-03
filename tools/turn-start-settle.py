#!/usr/bin/env python3
"""Whether the loop acted at the start of a turn on a board the turn-start hooks were still changing, and what the
turn-start settle (src/act/turn-start.ts) costs. Read-only: the log DB (tools/logdb/query.py --no-sync) and
logs/states.jsonl at its offsets; writes only --out.

For every logged turn (T2+) the first combat decision of each SL attempt (play_card / use_potion / end_turn) is taken with
the state it was planned on (F1) and the next logged state (F2). F1 was early when, after it, the board moved in a way our
first action does not explain (F2 still in the same turn, in combat):
  draw   the draw pile went down, our card does not draw (nor set off a draw: Vicious, Game Piece), no enemy died (Gremlin
         Horn), F1's hand was short (under 5) and did not shrink: cards were still being drawn (Hellraiser playing the drawn
         Strikes between them);
  hp     Inferno up, and the HP went down by at least its copies more than our card's own HP cost, no Thorns on an enemy:
         Inferno's start-of-turn loss came after F1 (with Crimson Mantle: between the two losses);
  sel    Toasty Mittens held and F2 is its exhaust choice from the hand (our action a card play that neither chooses nor
         exhausts: not True Grit+'s, Burning Pact's or Headbutt's own choice, nor a potion's).
A first decision not sent because the re-read before dispatch saw the board move ("not dispatched: state changed while
deciding") is "caught". The deciding time is the decision's ts less its observed_ts (the state read; logged since
2026-09-25): the board stood at least that long for an early one (the re-read before dispatch found it unchanged).

The settle: the turn's first combat action with INFERNO_POWER or HELLRAISER_POWER up waits until the board it was planned
on has stood SETTLE[power] since its read (the most of the powers up; act/turn-start.ts TURN_START_SETTLE_MS), so a turn
start holding one waits max(0, that - deciding time) more.

Usage: .cache/logdb-venv/bin/python tools/turn-start-settle.py [--out experiments/inferno-planner/turn-start-settle.md]
"""
import argparse
import collections
import json
import math
import re
import subprocess
from datetime import datetime

POWERS = ("INFERNO_POWER", "HELLRAISER_POWER")
# act/turn-start.ts TURN_START_SETTLE_MS.
SETTLE = {"INFERNO_POWER": 500, "HELLRAISER_POWER": 1000}
CARD_TYPES = {c["id"]: c.get("type") for c in json.load(open(".cache/game-data.json", encoding="utf8"))["collections"]["cards"]}
SQL = """
WITH d AS (
  SELECT run_id, floor, turn, ts, observed_ts, action, card_id, potion_id, result, label, latency_plan_ms, latency_jev_ms, latency_deepseek_ms,
    row_number() OVER (PARTITION BY run_id, floor, coalesce(sl_attempt, 0), turn ORDER BY ts) AS k
  FROM decisions WHERE screen = 'COMBAT' AND action IN ('play_card', 'use_potion', 'end_turn') AND turn IS NOT NULL AND turn > 1
),
s AS (
  SELECT run_id, off, len, ts, observed,
    lead(off) OVER (PARTITION BY run_id ORDER BY off) AS next_off, lead(len) OVER (PARTITION BY run_id ORDER BY off) AS next_len,
    lead(turn) OVER (PARTITION BY run_id ORDER BY off) AS next_turn, lead(screen) OVER (PARTITION BY run_id ORDER BY off) AS next_screen
  FROM state_index
)
SELECT d.run_id, d.floor, d.turn, d.ts, d.observed_ts, d.action, d.card_id, d.potion_id, d.result, d.label,
  coalesce(d.latency_plan_ms, 0) + coalesce(d.latency_jev_ms, 0) + coalesce(d.latency_deepseek_ms, 0) AS think_ms,
  s.off, s.len, s.next_off, s.next_len, s.next_turn, s.next_screen
FROM d JOIN s ON s.run_id = d.run_id AND s.ts = d.ts AND NOT coalesce(s.observed, false)
WHERE d.k = 1
ORDER BY d.ts
"""


def query(sql):
    out = subprocess.run([".cache/logdb-venv/bin/python", "tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "2000000", "--timeout", "900", sql], capture_output=True, text=True, check=True).stdout
    data = json.loads(out)
    if data.get("error"):
        raise SystemExit(data["error"])
    return [dict(zip(data["columns"], row)) for row in data["rows"]]


def pile(state, which):
    entries = ((state.get("agent_view") or {}).get("combat") or {}).get(which)
    if entries is None:
        return None
    total = 0
    for entry in entries:
        m = re.match(r"^[^\[：:]*?\*(\d+)\s*\[", entry.get("line", ""))
        total += int(m.group(1)) if m else 1
    return total


def power(entity, pid):
    return sum(p.get("amount") or 0 for p in entity.get("powers") or [] if p.get("power_id") == pid)


def stamp(text):
    return datetime.fromisoformat(text.replace("Z", ""))


def classify(row, f1, f2):
    s1, s2 = f1["state"], f2["state"]
    c1, c2 = s1.get("combat") or {}, s2.get("combat") or {}
    p1, p2 = c1.get("player") or {}, c2.get("player") or {}
    relics = {r.get("relic_id") for r in (s1.get("run") or {}).get("relics") or []}
    hand1 = c1.get("hand") or []
    card = next((h for h in hand1 if h.get("card_id") == row["card_id"]), None) if row["action"] == "play_card" else None
    text = (card or {}).get("resolved_rules_text") or ""
    cost = sum(int(x) for x in re.findall(r"失去(\d+)点生命", text))
    alive1 = sum(1 for e in c1.get("enemies") or [] if e.get("is_alive") is not False)
    alive2 = sum(1 for e in c2.get("enemies") or [] if e.get("is_alive") is not False)
    thorns = any(power(e, "THORNS_POWER") > 0 for e in c1.get("enemies") or [] if e.get("is_alive") is not False)
    inferno = power(p1, "INFERNO_POWER")
    copies = max(1, math.ceil(inferno / 9)) if inferno > 0 else 0
    d1, d2 = pile(s1, "draw"), pile(s2, "draw")
    h1, h2 = len(hand1), len(c2.get("hand") or [])
    sig = []
    # A draw our own card set off: Vicious on a Vulnerable, Game Piece on a Power.
    own_draw = (power(p1, "VICIOUS_POWER") > 0 and "易伤" in text) or ("GAME_PIECE" in relics and CARD_TYPES.get(row["card_id"]) == "Power")
    if row["action"] == "play_card" and d1 is not None and d2 is not None and "抽" not in text and not own_draw and d2 < d1 and alive2 == alive1 and h1 < 5 and h2 >= h1:
        sig.append("draw")
    hp1, hp2 = p1.get("current_hp") or 0, p2.get("current_hp") or 0
    if copies and row["action"] == "play_card" and not thorns and hp1 - hp2 - cost >= copies:
        sig.append("hp")
    selection = s2.get("selection") or {}
    mittens = selection.get("kind") == "combat_hand_select" and "消耗" in str(selection.get("prompt") or "")
    if "TOASTY_MITTENS" in relics and s2.get("screen") == "CARD_SELECTION" and mittens and row["action"] == "play_card" and "选择" not in text and "消耗" not in text:
        sig.append("sel")
    powers = sorted({p.get("power_id") for p in p1.get("powers") or [] if p.get("power_id") in POWERS and (p.get("amount") or 0) > 0})
    return {"sig": sig, "powers": powers, "inferno": inferno, "copies": copies, "hp1": hp1, "hp2": hp2, "hand1": h1, "hand2": h2, "draw1": d1, "draw2": d2}


def quant(xs, q):
    xs = sorted(xs)
    return xs[min(len(xs) - 1, int(q * len(xs)))] if xs else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="experiments/inferno-planner/turn-start-settle.md")
    args = ap.parse_args()
    rows = query(SQL)
    states = open("logs/states.jsonl", "rb")

    def at(off, length):
        states.seek(off)
        return json.loads(states.read(length))

    recs = []
    readiness = collections.Counter()
    for row in rows:
        if row["next_off"] is None:
            continue
        f1 = at(row["off"], row["len"])
        if not (f1["state"].get("combat") or {}).get("player"):
            continue
        ready = f1["state"]["combat"].get("action_readiness") or {}
        readiness[(ready.get("can_use_combat_actions"), ready.get("actions_settled"), ready.get("snapshot_stable"), ready.get("running_action_type"))] += 1
        same = row["next_turn"] == row["turn"] and row["next_screen"] in ("COMBAT", "CARD_SELECTION")
        f2 = at(row["next_off"], row["next_len"]) if same else None
        info = classify(row, f1, f2) if f2 is not None and row["action"] != "end_turn" else {"sig": [], "powers": sorted({p.get("power_id") for p in f1["state"]["combat"]["player"].get("powers") or [] if p.get("power_id") in POWERS and (p.get("amount") or 0) > 0})}
        caught = str(row["result"] or "").startswith("not dispatched: state changed")
        decide = (stamp(row["ts"]) - stamp(row["observed_ts"])).total_seconds() * 1000 if row["observed_ts"] else None
        # Without the read time (to 2026-09-27 and some of 09-28): the planning, Jev and DeepSeek latencies, a lower bound.
        recs.append({**row, **info, "caught": caught, "judged": f2 is not None and row["action"] != "end_turn", "decide": decide, "least": decide if decide is not None else row["think_ms"]})

    lines = []
    say = lines.append
    say("# Turn-start settle: the loop's first action of a turn, on the logged frames (tools/turn-start-settle.py)")
    say("")
    say(f"{len(recs)} turn starts (T2+, the first combat decision of each turn and SL attempt), {rows[0]['ts'][:10]} to {rows[-1]['ts'][:10]}. "
        "early = the board moved after the frame the loop acted on (draw / hp / sel, see the tool's doc); caught = the re-read before "
        "dispatch saw it move and the turn was planned again; judged = the next frame is in the same turn and the action a card or a potion.")
    say("")

    def period(r):
        return "to 09-27" if r["ts"] < "2026-09-28" else "09-28 on"

    def group(r):
        return "+".join(p.replace("_POWER", "").title() for p in r["powers"]) or "neither"

    say("The mod's readiness on the frames the loop acted on (can_use_combat_actions, actions_settled, snapshot_stable, running_action_type): "
        + ", ".join(f"{k}: {v}" for k, v in readiness.most_common()) + ".")
    say("")
    say("| powers up | period | turn starts | judged | early | draw | hp | sel | caught | early: deciding ms (max) |")
    say("|---|---|---|---|---|---|---|---|---|---|")
    table = collections.defaultdict(list)
    for r in recs:
        table[(group(r), period(r))].append(r)
    for key in sorted(table, key=lambda k: (k[0] == "neither", k[0], k[1] != "to 09-27")):
        g = table[key]
        early = [r for r in g if r["sig"] and not r["caught"]]
        times = [r["decide"] for r in early if r["decide"] is not None]
        say(f"| {key[0]} | {key[1]} | {len(g)} | {sum(r['judged'] for r in g)} | {len(early)} | {sum('draw' in r['sig'] for r in early)} | {sum('hp' in r['sig'] for r in early)} | {sum('sel' in r['sig'] for r in early)} | {sum(r['caught'] for r in g)} | {max(times):.0f} |" if times else
            f"| {key[0]} | {key[1]} | {len(g)} | {sum(r['judged'] for r in g)} | {len(early)} | {sum('draw' in r['sig'] for r in early)} | {sum('hp' in r['sig'] for r in early)} | {sum('sel' in r['sig'] for r in early)} | {sum(r['caught'] for r in g)} | - |")
    say("")
    held = [r for r in recs if r["powers"]]
    timed = [r for r in held if r["decide"] is not None]
    early_timed = [r for r in timed if r["sig"] and not r["caught"]]
    say(f"Inferno or Hellraiser up: {len(held)} turn starts; with the read time logged {len(timed)}. Early among them: {len(early_timed)}, "
        f"deciding times {sorted(round(r['decide']) for r in early_timed)} ms. Early with the deciding time at 500 ms or more: "
        f"{sum(r['decide'] >= 500 for r in early_timed)}; turn starts decided in 500 ms or more: {sum(r['decide'] >= 500 for r in timed)}.")
    say("")
    say(f"## The settle's cost (from the read: {', '.join(f'{k} {v} ms' for k, v in SETTLE.items())}; the turn's first combat action)")
    say("")
    settle_of = lambda r: max(SETTLE[p] for p in r["powers"])  # noqa: E731
    waits = [max(0.0, settle_of(r) - r["decide"]) for r in timed]
    waited = [w for w in waits if w > 0]
    say(f"- turn starts that would wait: {len(waited)} of {len(timed)} ({100 * len(waited) / max(1, len(timed)):.0f}%); the others were decided in their settle time or more")
    say(f"- the wait: mean {sum(waits) / max(1, len(waits)) / 1000:.2f} s over every turn start holding them, {sum(waited) / max(1, len(waited)) / 1000:.2f} s over those that wait "
        f"(median {quant(waited, 0.5) / 1000 if waited else 0:.2f} s, p90 {quant(waited, 0.9) / 1000 if waited else 0:.2f} s); total {sum(waits) / 1000:.0f} s over {len({(r['run_id'], r['floor']) for r in timed})} fights "
        f"({sum(waits) / 1000 / max(1, len({(r['run_id'], r['floor']) for r in timed})):.1f} s a fight)")
    buckets = collections.Counter()
    for w in waits:
        buckets["0" if w == 0 else "1-100" if w <= 100 else "101-300" if w <= 300 else "301-500" if w <= 500 else "501-1000"] += 1
    say(f"- by wait (ms): {', '.join(f'{k}: {buckets[k]}' for k in ['0', '1-100', '101-300', '301-500', '501-1000'] if buckets[k])}")
    for power_id in POWERS:
        g = [(r, w) for r, w in zip(timed, waits) if power_id in r["powers"]]
        say(f"- {power_id} up: {len(g)} turn starts, {sum(w > 0 for _, w in g)} wait, mean {sum(w for _, w in g) / max(1, len(g)) / 1000:.2f} s a turn start")
    by_label = collections.defaultdict(list)
    for r, w in zip(timed, waits):
        by_label[re.sub(r"[:(].*$", "", str(r["label"]))].append(w)
    say(f"- by the decision's label: {'; '.join(f'{k} {len(v)} (mean {sum(v) / len(v) / 1000:.2f} s)' for k, v in sorted(by_label.items(), key=lambda kv: -len(kv[1])))}")
    rest = [r for r in recs if not r["powers"] and r["decide"] is not None]
    say(f"- turn starts with neither power: {len(rest)} with the read time logged, not held (0 s)")
    say("")
    say("## The early turn starts (Inferno or Hellraiser up)")
    say("")
    say("deciding ms: the read to the re-read before dispatch (ts - observed_ts); \"≥ N\" where the read time is not logged (the planning, Jev and DeepSeek latencies).")
    say("")
    say("| run | floor | turn | ts | powers | first action (label) | result | deciding ms | moved after | HP | hand | draw pile |")
    say("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for r in [r for r in held if r["sig"] and not r["caught"]]:
        ms = f"≥ {r['least']}" if r["decide"] is None else str(round(r["decide"]))
        say(f"| {r['run_id']} | {r['floor']} | {r['turn']} | {r['ts'][:19]} | {', '.join(r['powers'])} | {r['action']} {r['card_id'] or r['potion_id'] or ''} ({r['label']}) | {str(r['result'])[:40]} | {ms} | {'+'.join(r['sig'])} | {r['hp1']} -> {r['hp2']} | {r['hand1']} -> {r['hand2']} | {r['draw1']} -> {r['draw2']} |")
    say("")
    say("## The settle's cost at other lengths (turn starts with the read time logged, Inferno or Hellraiser up)")
    say("")
    say("| settle ms | turn starts that wait | mean wait, every turn start holding them (s) | mean, those that wait (s) | a fight (s) | early ones it covers (deciding time known or bounded under it) |")
    say("|---|---|---|---|---|---|")
    fights = max(1, len({(r["run_id"], r["floor"]) for r in timed}))
    early_all = [r for r in held if r["sig"] and not r["caught"]]
    configs = [(f"{ms}", {"INFERNO_POWER": ms, "HELLRAISER_POWER": ms}) for ms in (300, 500, 750, 1000, 1500)]
    configs.append(("Inferno 500, Hellraiser 1000", {"INFERNO_POWER": 500, "HELLRAISER_POWER": 1000}))
    for name, by_power in configs:
        def config_of(r, by_power=by_power):
            return max(by_power[p] for p in r["powers"])
        w = [max(0.0, config_of(r) - r["decide"]) for r in timed]
        n = sum(x > 0 for x in w)
        cover = sum(1 for r in early_all if (r["decide"] if r["decide"] is not None else r["least"]) < config_of(r))
        say(f"| {name} | {n} of {len(timed)} | {sum(w) / max(1, len(w)) / 1000:.2f} | {sum(w) / max(1, n) / 1000:.2f} | {sum(w) / 1000 / fights:.1f} | {cover} of {len(early_all)} |")
    for power_id in POWERS:
        g = [r for r in timed if power_id in r["powers"]]
        say(f"- {power_id}: {len(g)} turn starts with the read time logged, {len({(r['run_id'], r['floor']) for r in g})} fights")
    with open(args.out, "w", encoding="utf8") as handle:
        handle.write("\n".join(lines) + "\n")
    print("\n".join(lines[:40]))


if __name__ == "__main__":
    main()
