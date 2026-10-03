#!/usr/bin/env python3
"""PASSIVE_PIECES (src/strategy/passive-pieces.ts): the logged rules of the passive damage and block pieces.

Reads the log database (tools/logdb, read-only) for the A7+ boss and elite fights and every A7+ fight holding one of the
relics below, then those fights' combat frames from logs/states.jsonl by byte offset (never the whole file). Prints, per
piece, how often the logged numbers match the rule (and the alternatives: cut by Weak / Frail, raised by Vulnerable), and
the fire rates the boss clock uses (A8+ boss fights).

Turn transitions: the last frame of our turn whose action is end_turn, and the first frame of the next turn.

Usage: .cache/logdb-venv/bin/python tools/passive-pieces-check.py [--frames OUT.jsonl] [--reuse OUT.jsonl] [--examples N]
"""
import argparse
import json
import os
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools", "logdb"))

RELICS = ["SAI", "MERCURY_HOURGLASS", "ORICHALCUM", "LETTER_OPENER", "PARRYING_SHIELD", "ORNAMENTAL_FAN", "RIPPLE_BASIN",
          "HORN_CLEAT", "BRONZE_SCALES", "GORGET", "CAPTAINS_WHEEL", "ANCHOR"]


def extract(out_path):
    import query  # noqa: E402
    import sync as logsync  # noqa: E402

    db = os.path.abspath(os.environ.get("LOGDB_DIR", os.path.join(ROOT, ".cache", "logdb")))
    logs = os.path.abspath(os.environ.get("LOGDB_LOGS", os.path.join(ROOT, "logs")))
    sql = f"""
    WITH sel AS (
      SELECT run_id, fight_no, room, ascension, encounter, outcome FROM fights
      WHERE ascension >= 7 AND (room IN ('boss','elite') OR len(list_intersect(relics, {RELICS!r})) > 0)
    )
    SELECT ff.off, ff.len, ff.run_id, ff.fight_no, sel.room, sel.ascension, sel.encounter, sel.outcome
    FROM fight_frames ff JOIN sel USING (run_id, fight_no) WHERE ff.is_combat ORDER BY ff.run_id, ff.off
    """
    with logsync.read_lock(db, shared=True):
        con = query.connect(db, threads=2)
        rows = con.execute(sql).fetchall()
        acts = con.execute("""
          SELECT k.run_id, strftime(d.ts, '%Y-%m-%dT%H:%M:%S.%g'), d.action, d.card_id FROM decisions d
          JOIN (SELECT DISTINCT run_id, ts FROM fight_frames WHERE is_combat AND fight_no > 0) k ON k.run_id = d.run_id AND k.ts = d.ts
          WHERE d.action IN ('play_card','use_potion','end_turn')
        """).fetchall()
    action_at = {(run, ts): [action, card] for run, ts, action, card in acts}

    def powers(entry):
        return {p.get("power_id"): p.get("amount") for p in entry.get("powers") or []}

    with open(os.path.join(logs, "states.jsonl"), "rb") as src, open(out_path, "w", encoding="utf8") as out:
        for off, length, run_id, fight_no, room, asc, enc, outcome in rows:
            src.seek(off)
            try:
                row = json.loads(src.read(length))
            except Exception:
                continue
            st = row.get("state") or {}
            combat = st.get("combat") or {}
            player = combat.get("player") or {}
            run = st.get("run") or {}
            ts = row.get("ts") or ""
            rec = {
                "off": off, "run": run_id, "fn": fight_no, "room": room, "asc": asc, "enc": enc, "out": outcome, "floor": run.get("floor"), "turn": st.get("turn"),
                "p": {"hp": player.get("current_hp"), "blk": player.get("block"), "pw": powers(player), "ap": player.get("attacks_played_this_turn"), "sp": player.get("skills_played_this_turn")},
                "e": [{"i": e.get("index"), "id": e.get("enemy_id"), "hp": e.get("current_hp"), "blk": e.get("block"), "alive": e.get("is_alive"), "pw": powers(e),
                       "it": [[x.get("intent_type"), x.get("damage"), x.get("hits")] for x in e.get("intents") or []]} for e in combat.get("enemies") or []],
                "hand": [[c.get("card_id"), {v.get("name"): v.get("current_value") for v in c.get("dynamic_values") or []}] for c in combat.get("hand") or []],
                "relics": [r.get("relic_id") for r in run.get("relics") or []],
                "act": action_at.get((run_id, ts[:23])),
            }
            out.write(json.dumps(rec, ensure_ascii=False) + "\n")


def load(path):
    fights = defaultdict(list)
    with open(path, encoding="utf8") as handle:
        for line in handle:
            r = json.loads(line)
            fights[(r["run"], r["fn"])].append(r)
    for frames in fights.values():
        frames.sort(key=lambda r: r["off"])
    return fights


def pw(fr, pid):
    return (fr["p"]["pw"] or {}).get(pid) or 0


def enemy(fr, idx):
    return next((e for e in fr["e"] if e["i"] == idx), None)


def hits_of(e):
    return sum((it[2] or 1) for it in e.get("it") or [] if it[0] and it[0].startswith("Attack") and it[1] is not None)


def incoming(fr):
    return sum(it[1] * (it[2] or 1) for e in fr["e"] if e["alive"] for it in e.get("it") or [] if it[0] and it[0].startswith("Attack") and it[1] is not None)


def transitions(frames):
    turns = defaultdict(list)
    for fr in frames:
        if fr["turn"] is not None:
            turns[fr["turn"]].append(fr)
    for t in sorted(turns):
        if t + 1 in turns and turns[t][-1]["act"] and turns[t][-1]["act"][0] == "end_turn":
            yield t, turns[t][-1], turns[t + 1][0]


CAPS = ("INTANGIBLE_POWER", "SLIPPERY_POWER", "HARDENED_SHELL_POWER", "REGENERATE_POWER", "REGEN_POWER", "PLATING_POWER", "PLATED_ARMOR_POWER")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", default=None, help="write the compact frames here (default: a temp file)")
    parser.add_argument("--reuse", default=None, help="read compact frames written earlier instead of the logs")
    parser.add_argument("--examples", type=int, default=2)
    args = parser.parse_args()
    path = args.reuse
    if not path:
        path = args.frames or os.path.join(os.environ.get("TMPDIR", "/tmp"), "passive-pieces-frames.jsonl")
        extract(path)
    fights = load(path)
    tally = defaultdict(Counter)
    examples = defaultdict(list)

    def note(piece, cond, verdict, ex):
        tally[piece][(cond, verdict)] += 1
        if len(examples[(piece, cond, verdict)]) < args.examples:
            examples[(piece, cond, verdict)].append(ex)

    for frames in fights.values():
        relics = frames[0]["relics"]
        for t, last, nxt in transitions(frames):
            where = f"{last['run']} F{last['floor']} T{t}"
            weak = pw(last, "WEAK_POWER") > 0
            frail = pw(nxt, "FRAIL_POWER") > 0 or pw(last, "FRAIL_POWER") > 0
            mantle = pw(last, "CRIMSON_MANTLE_POWER")
            inferno = pw(last, "INFERNO_POWER")
            hourglass = 3 if "MERCURY_HOURGLASS" in relics else 0
            # Start-of-turn block: Sai 7 a copy, Crimson Mantle its amount; Frail and Dexterity do not move them.
            sai = relics.count("SAI")
            other_start = pw(last, "SELF_FORMING_CLAY_POWER") or pw(last, "TORIC_TOUGHNESS_POWER") or ("HORN_CLEAT" in relics and t + 1 == 2) or ("CAPTAINS_WHEEL" in relics and t + 1 == 3)
            if (sai or mantle) and not other_start and not (pw(nxt, "BARRICADE_POWER") or pw(last, "BLUR_POWER") or "STURDY_CLAMP" in relics):
                exp = 7 * sai + mantle
                got = nxt["p"]["blk"]
                piece = "Sai" if sai and not mantle else "Crimson Mantle" if mantle and not sai else "Sai + Crimson Mantle"
                note(piece + " (start block)", ("Frail" if frail else "no Frail") + (", Dex" if pw(nxt, "DEXTERITY_POWER") else ""),
                     "exact" if got == exp else "x0.75" if got == int(exp * 0.75) else "other", f"{where}: {got} vs {exp}")
            # Retaliation: Thorns + Flame Barrier per hit landed; no start-of-turn sweep in the way.
            ret = pw(last, "THORNS_POWER") + pw(last, "FLAME_BARRIER_POWER")
            if ret and not (hourglass or inferno or pw(last, "ROLLING_BOULDER_POWER")):
                for e in last["e"]:
                    n = enemy(nxt, e["i"])
                    hits = hits_of(e)
                    if not e["alive"] or not n or not n["alive"] or n["id"] != e["id"] or not hits or any(e["pw"].get(c) for c in CAPS):
                        continue
                    exp = ret * hits
                    got = e["hp"] - n["hp"]
                    piece = "Flame Barrier" if pw(last, "FLAME_BARRIER_POWER") else "Thorns"
                    cond = ("Weak" if weak else "no Weak") + (", enemy Vulnerable" if (e["pw"].get("VULNERABLE_POWER") or 0) > 0 else "")
                    note(piece + " (per hit)", cond, "exact" if got == exp else "x0.75" if got == int(exp * 0.75) else "x1.5" if got == int(exp * 1.5) else "other",
                         f"{where} {e['id']} {hits} hits: {got} vs {exp}")
            # Start-of-turn sweep: Mercury Hourglass 3, Inferno per loss event; enemies that did not attack into retaliation.
            events = (1 + (1 if mantle else 0)) if inferno else 0
            aoe = hourglass + inferno * events
            if aoe and not pw(last, "ROLLING_BOULDER_POWER"):
                for e in last["e"]:
                    n = enemy(nxt, e["i"])
                    if not e["alive"] or not n or not n["alive"] or n["id"] != e["id"] or (ret and hits_of(e)) or any(e["pw"].get(c) for c in CAPS):
                        continue
                    got = e["hp"] - n["hp"]
                    piece = "Mercury Hourglass" if hourglass and not inferno else "Inferno" if inferno and not hourglass else "Hourglass + Inferno"
                    cond = ("Weak" if weak else "no Weak") + (", enemy Vulnerable" if (e["pw"].get("VULNERABLE_POWER") or 0) > 0 else "")
                    note(piece + " (turn-start sweep)", cond, "exact" if got == aoe else "x0.75" if got == int(aoe * 0.75) else "x1.5" if got == int(aoe * 1.5) else "other", f"{where} {e['id']}: {got} vs {aoe}")
            # End-of-turn block: Plating, Orichalcum (no card block left; Plating up does not stop it), Ripple Basin (no Attack).
            inc = incoming(last)
            if inc > 0 and not any(r in relics for r in ("CLOAK_CLASP", "TUNGSTEN_ROD", "BEATING_REMNANT", "TORII", "FOSSILIZED_HELIX")) and not any(
                    pw(last, p) for p in ("BUFFER_POWER", "INTANGIBLE_POWER", "METALLICIZE_POWER", "REGEN_POWER", "DISINTEGRATION_POWER", "CONSTRICT_POWER", "POISON_POWER")):
                blk = last["p"]["blk"]
                plating = pw(last, "PLATING_POWER")
                ori = 6 if "ORICHALCUM" in relics and blk == 0 else 0
                basin = 4 if "RIPPLE_BASIN" in relics and not last["p"]["ap"] else 0
                start_loss = (1 if inferno else 0) + (max(1, mantle // 7) if mantle else 0)
                got = last["p"]["hp"] - nxt["p"]["hp"] - start_loss
                exp = max(0, inc - blk - plating - ori - basin)
                for piece, on in (("Plating (end block)", plating and not ori and not basin), ("Orichalcum (end block)", ori), ("Ripple Basin (end block)", basin)):
                    if on:
                        cut = max(0, inc - blk - int(plating * 0.75) - int(ori * 0.75) - int(basin * 0.75))
                        note(piece, ("Frail" if frail else "no Frail") + (", Plating up" if piece.startswith("Orichalcum") and plating else ""),
                             "exact" if got == exp else "x0.75" if got == cut else "other", f"{where}: lost {got} vs {exp} ({inc} in, {blk} block, Plating {plating})")
        # Within a turn: Letter Opener on the 3rd Skill, Ornamental Fan on the 3rd Attack.
        for a, b in zip(frames, frames[1:]):
            if a["turn"] != b["turn"] or not a["act"] or a["act"][0] != "play_card":
                continue
            dyn = next((c[1] for c in a["hand"] if c[0] == a["act"][1]), {})
            where = f"{a['run']} F{a['floor']} T{a['turn']} {a['act'][1]}"
            if "LETTER_OPENER" in relics and (b["p"]["sp"] or 0) == (a["p"]["sp"] or 0) + 1 and (b["p"]["sp"] or 0) % 3 == 0 and "Damage" not in dyn and "HpLoss" not in dyn \
                    and not pw(a, "JUGGERNAUT_POWER") and not pw(a, "INFERNO_POWER"):
                drops = sorted({(e["hp"] + e["blk"]) - (enemy(b, e["i"])["hp"] + enemy(b, e["i"])["blk"]) for e in a["e"] if e["alive"] and enemy(b, e["i"])})
                note("Letter Opener (3rd Skill)", "Weak" if pw(a, "WEAK_POWER") else "no Weak", "exact" if drops == [5] else "other", f"{where}: {drops}")
            if "ORNAMENTAL_FAN" in relics and (b["p"]["ap"] or 0) == (a["p"]["ap"] or 0) + 1 and (b["p"]["ap"] or 0) % 3 == 0 and "Block" not in dyn and not pw(a, "FEEL_NO_PAIN_POWER"):
                gain = b["p"]["blk"] - a["p"]["blk"]
                note("Ornamental Fan (3rd Attack)", ("Frail" if pw(a, "FRAIL_POWER") else "no Frail") + (", Dex" if pw(a, "DEXTERITY_POWER") else ""), "exact" if gain == 4 else "x0.75" if gain == 3 else "other", f"{where}: +{gain}")
        # Juggernaut: a block card (no damage of its own) -> its amount to one enemy; our Weak does not cut it.
        for a, b in zip(frames, frames[1:]):
            jug = pw(a, "JUGGERNAUT_POWER")
            if not jug or a["turn"] != b["turn"] or not a["act"] or a["act"][0] != "play_card" or b["p"]["blk"] <= a["p"]["blk"]:
                continue
            dyn = next((c[1] for c in a["hand"] if c[0] == a["act"][1]), {})
            if "Damage" in dyn or "Block" not in dyn or (pw(a, "INFERNO_POWER") and "HpLoss" in dyn):
                continue
            dealt = sum(max(0, (e["hp"] + e["blk"]) - (enemy(b, e["i"])["hp"] + enemy(b, e["i"])["blk"])) for e in a["e"] if e["alive"] and enemy(b, e["i"]))
            note("Juggernaut (per block gain)", "Weak" if pw(a, "WEAK_POWER") else "no Weak", "exact" if dealt == jug else "x0.75" if dealt == int(jug * 0.75) else "other",
                 f"{a['run']} F{a['floor']} T{a['turn']} {a['act'][1]}: {dealt} vs {jug}")
        # Parrying Shield: 10+ block at the end (Plating counted) -> 6 to one enemy.
        if "PARRYING_SHIELD" in relics:
            for t, last, nxt in transitions(frames):
                if "MERCURY_HOURGLASS" in relics or any(pw(last, p) for p in ("INFERNO_POWER", "THORNS_POWER", "FLAME_BARRIER_POWER", "ROLLING_BOULDER_POWER")):
                    continue
                total = last["p"]["blk"] + pw(last, "PLATING_POWER")
                drops = sorted(e["hp"] - enemy(nxt, e["i"])["hp"] for e in last["e"] if e["alive"] and enemy(nxt, e["i"]))
                if not drops:
                    continue
                fired = drops.count(6) == 1 and all(d in (0, 6) for d in drops)
                cond = "10+ block" + (" (Plating needed)" if last["p"]["blk"] < 10 <= total else "") if total >= 10 else "under 10"
                note("Parrying Shield (end of turn)", cond, "6 to one enemy" if fired else "none" if all(d == 0 for d in drops) else "other", f"{last['run']} F{last['floor']} T{t}: {drops}")

    for piece in sorted(tally):
        print(f"\n## {piece}")
        for (cond, verdict), n in sorted(tally[piece].items()):
            print(f"  {cond:<36} {verdict:<16} {n:>5}   e.g. {'; '.join(examples[(piece, cond, verdict)])}")

    # Fire rates the boss clock uses (A8+ boss fights of the runs holding each relic).
    rate = Counter()
    for frames in fights.values():
        if frames[0]["room"] != "boss" or (frames[0]["asc"] or 0) < 8:
            continue
        relics = frames[0]["relics"]
        for t, last, nxt in transitions(frames):
            ap, sp = last["p"]["ap"] or 0, last["p"]["sp"] or 0
            if "PARRYING_SHIELD" in relics:
                rate["parrying_turns"] += 1
                rate["parrying_fired"] += 1 if last["p"]["blk"] + pw(last, "PLATING_POWER") >= 10 else 0
            if "ORICHALCUM" in relics and incoming(last) > 0:
                rate["orichalcum_attacked_turns"] += 1
                rate["orichalcum_fired"] += 1 if last["p"]["blk"] == 0 else 0
            if "ORNAMENTAL_FAN" in relics:
                rate["fan_turns"] += 1
                rate["fan_fired"] += ap // 3
            if "RIPPLE_BASIN" in relics:
                rate["basin_turns"] += 1
                rate["basin_fired"] += 1 if ap == 0 else 0
            if "LETTER_OPENER" in relics:
                rate["letter_turns"] += 1
                rate["letter_fired"] += sp // 3
    print("\n## Boss clock fire rates (A8+ boss fights)")
    for key in ("parrying", "orichalcum", "fan", "basin", "letter"):
        turns = rate[f"{key}_turns"] or rate[f"{key}_attacked_turns"]
        print(f"  {key:<12} {rate[f'{key}_fired']:>4} / {turns:<5} = {rate[f'{key}_fired'] / max(1, turns):.3f}")


if __name__ == "__main__":
    main()
