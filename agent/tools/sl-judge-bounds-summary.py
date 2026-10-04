#!/usr/bin/env python3
"""Summary of tools/sl-judge-bounds-replay.ts (the SL judge before and after, on every logged end_turn board).

Prints, per reason class of the judge's verdict (the `live` verdict: the logged label; the `open` one: the tier forced
open, so the reason is the first veto or count that holds), how often it shows on the lethal boards (the mod's flag, or
our own count dies on either code) and on the boards that ended in a death; the deaths that become certain, by the reason
that refused them before; and every wrong verdict: certain (open: whatever the label) on a board we lived through.

Usage: python3 tools/sl-judge-bounds-summary.py DIR [--tag after]   (reads DIR/boards[-tag]*.jsonl)
"""
import glob
import json
import re
import sys
from collections import Counter, defaultdict

# (class, pattern) in order: the first that matches names the reason.
CLASSES = [
    ("certain", None),
    ("not flagged", r"^the mod does not flag"),
    ("revive: Sandpit", r"^a revive is left .*Sandpit eats us"),
    ("revive: Tungsten Rod", r"^a revive is left .*Tungsten Rod's cut"),
    ("revive: Beating Remnant", r"^a revive is left .*Beating Remnant's cap"),
    ("revive: HP back unknown", r"^a revive is left .*HP it brings us back to is not known"),
    ("revive: orders not all tried", r"^a revive is left .*orders are not all tried"),
    ("revive: start death after it", r"^a revive is left .*next turn's start would kill us"),
    ("revive: saves us", r"^a revive is left"),
    ("Buffer up", r"BUFFER_POWER(, INTANGIBLE_POWER)? up$"),
    ("Intangible up", r"^INTANGIBLE_POWER up$"),
    ("Buffer: not every loss blocked", r"^Buffer"),
    ("Intangible: count survives", r"^Intangible"),
    ("Ripple Basin (refused)", r"^Ripple Basin \(no attack played\): its block is not counted"),
    ("special phase", r"special phase|is a husk|DeathBlow intent|blast with other enemies"),
    ("Beating Remnant: lost so far unknown", r"^own count not exact: Beating Remnant"),
    ("own count survives", r"^own count survives"),
    ("held: amount not given", r"^only the held cards make it lethal .*the end-of-turn amount is not given"),
    ("held: on-HP-loss power", r"^only the held cards make it lethal .*hits the enemies when the held cards take HP"),
    ("held: acting by chance", r"^only the held cards make it lethal .*acting by chance"),
    ("start: blast ends the fight", r"^only our own loss at the next turn's start .*no next turn"),
    ("start: relic/power acts at the turn's start", r"^only our own loss at the next turn's start .*\((relic|power)\) acts at the turn's start"),
    ("start: power text unknown", r"^only our own loss at the next turn's start .*its text unknown"),
    ("start: Inferno's sweep may kill all", r"^only our own loss at the next turn's start .*Inferno's \d+ at that loss may kill every enemy"),
    ("start: every enemy may die first", r"^only our own loss at the next turn's start .*every enemy may die before it"),
    ("start: orbs", r"^only our own loss at the next turn's start .*orbs"),
    ("start: power hits on the opening", r"^only our own loss at the next turn's start .*hits the enemies on what the turn's opening"),
    ("start: Hellraiser unbounded", r"^only our own loss at the next turn's start .*Hellraiser"),
    ("start: other refusal", r"^only our own loss at the next turn's start"),
    ("end hits: Stampede", r"^the enemies may be hit before they act: .*plays an Attack in hand at a random enemy"),
    ("end hits: Screaming Flagon", r"^the enemies may be hit before they act: .*no cards in hand"),
    ("end hits: Ethereal exhaust relic", r"^the enemies may be hit before they act: .*Ethereal cards are exhausted"),
    ("end hits: Stone Calendar count", r"^the enemies may be hit before they act: .*'s count \("),
    ("end hits: exhaust-pile self-play", r"^the enemies may be hit before they act: .*plays itself from the exhaust pile at the end of the turn$"),
    ("end hits: held card acts on enemies", r"^the enemies may be hit before they act: .*in hand acts on the enemies"),
    ("end hits: other end-of-turn hitter", r"^the enemies may be hit before they act: hitting the enemies at the end of the turn"),
    ("end hits: an ally's death may change the others' moves", r"^the enemies may be hit before they act: .*an ally's death may change the move of .*does not kill"),
    ("end hits: an enemy may die first (computed)", r"^the enemies may be hit before they act: .*does not kill"),
    ("end hits: on-HP-loss power (not Inferno)", r"^the enemies may be hit before they act: .*hits the enemies when the held cards take HP"),
    ("Sandpit: guard", r"^only the Sandpit makes it lethal"),
    ("least-loss: revive order", r"^the planner sees every line die, but a revive is left"),
    ("least-loss: draws (any-draw refused)", r"draws \(unknown cards\); not with any draw"),
    ("least-loss: draws (unknown cards)", r"draws \(unknown cards\)$"),
    ("tier: cards or potions left", r"playable card\(s\) and \d+ potion\(s\) left$"),
    ("not in combat", r"^not in combat"),
    ("error", r"^error"),
]


def classify(verdict):
    if verdict is None:
        return "-"
    if verdict["certain"]:
        return "certain"
    reason = verdict["reason"]
    for name, pattern in CLASSES[1:]:
        if re.search(pattern, reason):
            return name
    return "other: " + reason[:60]


def main():
    args = sys.argv[1:]
    directory = args[0]
    tag = args[args.index("--tag") + 1] if "--tag" in args else ""
    rows = []
    for path in sorted(glob.glob(f"{directory}/boards{'-' + tag if tag else ''}*.jsonl")):
        if not tag and re.search(r"boards-[a-z]", path):
            continue
        with open(path, encoding="utf8") as handle:
            rows += [json.loads(line) for line in handle if line.strip()]
    lived = {"survived", "won_in_enemy_turn"}
    print(f"{len(rows)} boards written; outcomes {dict(Counter(r['outcome'] for r in rows))}")
    for side in ("before", "after"):
        if f"{side}_live" not in rows[0]["v"]:
            continue
        lethal = [r for r in rows if r["flag"] or any(v and v["own"] for v in r["v"].values())]
        print(f"\n## {side}: reasons (open: the tier forced open) on the {len(lethal)} lethal boards (flag or own count dies) / on the deaths")
        table = defaultdict(Counter)
        for r in rows:
            cls = classify(r["v"][f"{side}_open"])
            if r in lethal:
                table[cls]["lethal"] += 1
            if r["outcome"] == "died":
                table[cls]["died"] += 1
            if r["outcome"] == "sl_reloaded":
                table[cls]["sl_reloaded"] += 1
            if r["outcome"] in lived and r in lethal:
                table[cls]["lived"] += 1
        for cls, c in sorted(table.items(), key=lambda kv: (-kv[1]["died"], -kv[1]["lethal"])):
            print(f"  {cls:<48} lethal {c['lethal']:>5}  died {c['died']:>4}  lived {c['lived']:>5}  sl_reloaded {c['sl_reloaded']:>3}")
        live = Counter(classify(r["v"][f"{side}_live"]) for r in rows if r["outcome"] == "died")
        print(f"  live verdict on the deaths: {dict(live.most_common())}")
    if "before_live" in rows[0]["v"]:
        print("\n## changes (before -> after)")
        for kind in ("live", "open"):
            moved = Counter()
            for r in rows:
                b, a = r["v"][f"before_{kind}"], r["v"][f"after_{kind}"]
                if b["certain"] != a["certain"]:
                    moved[(classify(b), "certain" if a["certain"] else classify(a), r["outcome"])] += 1
            print(f"  {kind}:")
            for (b, a, outcome), n in moved.most_common():
                print(f"    {b:<48} -> {a:<30} {outcome:<18} {n}")
        reasons = Counter()
        for r in rows:
            b, a = r["v"]["before_live"], r["v"]["after_live"]
            if r["outcome"] == "died" and not b["certain"] and a["certain"]:
                reasons[classify(r["v"]["before_open"])] += 1
        print(f"\n  deaths that become certain (live), by the reason before: {dict(reasons.most_common())} = {sum(reasons.values())}")
        changed = Counter()
        for r in rows:
            b, a = classify(r["v"]["before_open"]), classify(r["v"]["after_open"])
            if b != a and r["outcome"] == "died":
                changed[(b, a)] += 1
        print("  deaths whose open reason moved:")
        for (b, a), n in changed.most_common():
            print(f"    {b:<48} -> {a:<40} {n}")
    for side in ("before", "after"):
        if f"{side}_open" not in rows[0]["v"]:
            continue
        wrong = [r for r in rows if r["outcome"] in lived and (r["v"][f"{side}_open"]["certain"] or r["v"][f"{side}_live"]["certain"])]
        print(f"\n## {side}: wrong verdicts (certain, open or live, on a board we lived through): {len(wrong)}")
        for r in wrong:
            v = r["v"][f"{side}_open"]
            print(f"  {r['run']} F{r['floor']} T{r['turn']} {r['label']} hp {r['hp']} block {r['block']} -> {r['outcome']} {r.get('next_hp')}: live {r['v'][f'{side}_live']['certain']} | {v['reason'][:200]}")


if __name__ == "__main__":
    main()
