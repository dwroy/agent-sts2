#!/usr/bin/env python3
"""Cross-check src/knowledge/monster-db.json against the hand-written tables -> a markdown report.

Compared: (a) src/strategy/boss-clock.ts BOSSES (hp, hpA8, lossPerTurn, scriptTurns) and
testSubjectPhases; (b) the enemy dossiers (hp a7/a8, need_damage_per_turn, deaths) - read from
src/knowledge/enemy-dossiers.json, or from git (`--dossiers-rev`, default the tag redesign-end) when the
file is not in the tree; (c) src/knowledge/move-model.json (moves, average damage, successors).

Usage: python3 tools/monster-db-check.py [--out PATH] [--dossiers PATH | --dossiers-rev REV]
"""
import argparse
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load_dossiers(path, rev):
    if path and os.path.exists(path):
        return json.load(open(path, encoding="utf8")), path
    raw = subprocess.run(["git", "-C", ROOT, "show", f"{rev}:src/knowledge/enemy-dossiers.json"], capture_output=True, text=True, check=True).stdout
    return json.loads(raw), f"git {rev}:src/knowledge/enemy-dossiers.json"


def parse_boss_clock(path):
    text = open(path, encoding="utf8").read()
    bosses = {}
    for match in re.finditer(r"^\s+([A-Z_]+): \{ hp: (\d+), hpA8: (\d+), scriptTurns: (\d+), lossPerTurn: ([\d.]+),", text, re.M):
        bosses[match.group(1)] = {"hp": int(match.group(2)), "hpA8": int(match.group(3)), "scriptTurns": int(match.group(4)), "lossPerTurn": float(match.group(5))}
    phases = re.search(r"ascension >= 8 \? \[(\d+), (\d+), (\d+)\] : \[(\d+), (\d+), (\d+)\]", text)
    return bosses, [int(x) for x in phases.groups()] if phases else None


def rel(a, b):
    if a is None or b is None or b == 0:
        return None
    return (a - b) / b


def fmt(value):
    if value is None:
        return "-"
    if isinstance(value, float):
        return f"{value:.1f}".rstrip("0").rstrip(".")
    return str(value)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=os.path.join(ROOT, "src/knowledge/monster-db.json"))
    parser.add_argument("--out", default=os.path.expanduser("~/Projects/sts2-jev/notes/monster-db-check.md"))
    parser.add_argument("--dossiers", default=os.path.join(ROOT, "src/knowledge/enemy-dossiers.json"))
    parser.add_argument("--dossiers-rev", default="redesign-end")
    args = parser.parse_args()
    db = json.load(open(args.db, encoding="utf8"))
    monsters, bosses, encounters = db["monsters"], db["bosses"], db["encounters"]
    clock, phases = parse_boss_clock(os.path.join(ROOT, "src/strategy/boss-clock.ts"))
    dossiers, dossier_src = load_dossiers(args.dossiers, args.dossiers_rev)
    move_model = json.load(open(os.path.join(ROOT, "src/knowledge/move-model.json"), encoding="utf8"))
    meta = db["meta"]["generated_from"]
    out = []
    w = out.append
    w("# Monster DB cross-check\n")
    w(f"DB: `src/knowledge/monster-db.json` from {meta['fights']} logged fights ({meta['first_seen']} .. {meta['last_seen']}), fights by ascension {meta['fights_by_asc']}.")
    w("Regenerate: `python3 tools/build-monster-db.py && python3 tools/monster-db-check.py`.\n")
    w("Columns: DB value (n = fights), hand value, difference. `A<8` = the DB value at A7 (A0-A6 give the same max HP for every boss logged; A8 raises HP). "
      "Flagged (**bold**) when HP differs at all, or loss/turns/need differ by more than 20%.\n")

    # (a) boss clock
    w("## (a) boss-clock.ts `BOSSES`\n")
    w("| boss | DB HP A7 (n) | hand hp | DB HP A8 (n) | hand hpA8 | DB loss/turn p75 A8 (n) | hand lossPerTurn | DB won-fight turns p75 A8 (n) | hand scriptTurns | note |")
    w("|---|---|---|---|---|---|---|---|---|---|")
    extras_note = {
        "AEONGLASS": "hand hp adds 2x33 Ebb block on purpose",
        "QUEEN": "hand hp = Queen + ~60 block, Amalgam left out on purpose; DB = Queen + Amalgam",
        "WATERFALL_GIANT": "hand hp adds ~20 Siphon heal on purpose",
        "THE_KIN": "hand hp = priest + ~60 into followers on purpose; DB = priest + 2 followers",
        "TEST_SUBJECT": "hand hp = sum of 3 phases; DB = phase 1 (phases below)",
    }
    for boss, hand in sorted(clock.items()):
        data = bosses.get(boss, {})
        a7, a8 = data.get("7"), data.get("8")
        hp7 = a7["start_hp_total"]["median"] if a7 else None
        hp8 = a8["start_hp_total"]["median"] if a8 else None
        lpt = a8["hp_loss_per_turn"] if a8 else None
        turns = a8["turns_won"] if a8 else None
        cells = []
        def flag(text, bad):
            return f"**{text}**" if bad else text
        cells.append(f"{fmt(hp7)} ({a7['fights'] if a7 else 0})")
        cells.append(flag(fmt(hand["hp"]), hp7 is not None and hand["hp"] != hp7))
        cells.append(f"{fmt(hp8)} ({a8['fights'] if a8 else 0})")
        cells.append(flag(fmt(hand["hpA8"]), hp8 is not None and hand["hpA8"] != hp8))
        cells.append(f"{fmt(lpt['p75']) if lpt else '-'} ({lpt['n'] if lpt else 0})")
        cells.append(flag(fmt(hand["lossPerTurn"]), lpt and lpt["p75"] is not None and abs(rel(hand["lossPerTurn"], lpt["p75"])) > 0.2))
        cells.append(f"{fmt(turns['p75']) if turns else '-'} ({turns['n'] if turns else 0})")
        cells.append(flag(fmt(hand["scriptTurns"]), turns and turns["p75"] is not None and abs(rel(hand["scriptTurns"], turns["p75"])) > 0.2))
        w(f"| {boss} | " + " | ".join(cells) + f" | {extras_note.get(boss, '')} |")
    w("")
    if phases:
        ts = monsters.get("TEST_SUBJECT", {}).get("phases_by_asc", {})
        w(f"Test Subject phases: hand A8 {phases[:3]}, A<8 {phases[3:]}; DB (max_hp sequence of the one enemy, n fights): "
          + "; ".join(f"A{a}: " + ", ".join(f"{k} (n={n})" for k, n in v.items()) for a, v in ts.items()) + ". Phase 3 at A8 is still unlogged.\n")
    w("Loss/turn = (entry HP - HP at the end, all of it on a death) / our turns, 75th percentile over the A8 fights with a known outcome, "
      "as the boss-clock comment defines it. Won-fight turns = our turn count in A8 wins.\n")

    # boss parts
    w("### Boss parts (DB, A7 / A8 median max HP, n instances)\n")
    for boss in sorted(bosses):
        parts = []
        for asc in ("7", "8"):
            if asc in bosses[boss]:
                b = bosses[boss][asc]
                parts.append(f"A{asc}: " + ", ".join(f"{pid} {fmt(p['median'])} (n={p['n']}, x{fmt(p['count_per_fight'])}/fight)" for pid, p in b["parts"].items())
                             + (f"; phases {b['phases']}" if b["phases"] else "")
                             + f"; win {fmt(b['win_rate'])} of {b['n_outcome_known']}, deaths {len(b['death_runs'])}")
        w(f"- **{boss}** — " + " | ".join(parts))
    w("")

    # (b) dossiers
    w(f"## (b) enemy dossiers ({dossier_src})\n")
    w("The dossier file is not in the step1-bugfix tree (removed with the pre-ablation restore 910671b); the last committed version is compared.\n")
    w("HP: the dossier `hp` is the sum of all bodies for multi-body fights. DB: the median starting HP total of the logged encounter "
      "made only of the dossier's ids whose HP is closest to the hand value (with spawned bodies counted when that is closer; bosses: the boss "
      "summary); a hand value is flagged when it is outside the logged [min-max] of that total and outside the main body's own range. Need: the dossier's need_damage_per_turn vs the DB's A8 HP / median turns of the A8 wins "
      "(what the winning decks actually dealt a turn; not a clock). Deaths: dossier count (runs.jsonl, 157 runs at the time) vs DB deaths at all ascensions.\n")
    w("| dossier id | kind | DB HP A7 median [range] (n) | hand a7 | DB HP A8 median [range] (n) | hand a8 | DB main body A8 | DB A8 HP/won turns (n wins) | hand need | DB deaths (all asc) | hand deaths | encounter used |")
    w("|---|---|---|---|---|---|---|---|---|---|---|---|")
    rows_b = []
    for did, dos in sorted(dossiers["enemies"].items()):
        ids = dos.get("ids") or [did]
        per_asc = {}
        note = ""
        if did in bosses:
            used = f"boss {did}"
            for asc in ("7", "8"):
                b = bosses[did].get(asc)
                if b:
                    t = b["start_hp_total"]
                    per_asc[asc] = {"hp": t, "fights": b["fights"], "turns": b["turns_won"]["median"], "wins": b["turns_won"]["n"]}
            deaths = sum(len(v["death_runs"]) for v in bosses[did].values())
            main = did
        else:
            wanted = set(ids)
            main = did if did in monsters else ids[0]
            cands = [key for key in encounters if main in key.split("+") and set(key.split("+")) <= wanted]
            if not cands:
                cands = [key for key in encounters if main in key.split("+")]
            if not cands:
                w(f"| {did} | {dos.get('kind')} | not logged | {dos['hp'].get('a7')} | not logged | {dos['hp'].get('a8')} | - | - | {fmt(dos.get('need_damage_per_turn'))} | - | {dos.get('deaths', '-')} | - |")
                continue

            # The composition the dossier means: of the logged encounters made of its ids only, the one whose
            # HP (at the start, or with spawned bodies) is closest to the hand value.
            def closeness(key):
                x = encounters[key]["by_asc"].get("8") or encounters[key]["by_asc"].get("7")
                hand_hp = dos["hp"].get("a8") if encounters[key]["by_asc"].get("8") else dos["hp"].get("a7")
                if not x or hand_hp is None:
                    return 10 ** 6
                return min(abs(x["start_hp_total"]["median"] - hand_hp), abs(x["hp_total_incl_spawned"]["median"] - hand_hp))
            cands.sort(key=lambda key: (closeness(key), -sum(encounters[key]["rooms"].values())))
            used = cands[0]
            enc = encounters[used]
            for asc in ("7", "8"):
                x = enc["by_asc"].get(asc)
                if x:
                    hand_hp = dos["hp"].get("a" + asc)
                    t = x["start_hp_total"]
                    sp = x["hp_total_incl_spawned"]
                    if hand_hp is not None and sp["median"] != t["median"] and abs(sp["median"] - hand_hp) < abs(t["median"] - hand_hp):
                        t = sp
                        note = " (with spawned bodies)"
                    per_asc[asc] = {"hp": t, "fights": x["fights"], "turns": x["turns_won"]["median"], "wins": x["turns_won"]["n"]}
            deaths = sum(t["deaths"] for t in monsters.get(main, {}).get("threat_by_asc", {}).values())
        body8 = monsters.get(main, {}).get("hp_by_asc", {}).get("8")

        def cell(asc):
            x = per_asc.get(asc)
            if not x:
                return "- (0)"
            h = x["hp"]
            rng = f" [{h['min']}-{h['max']}]" if h["min"] != h["max"] else ""
            return f"{fmt(h['median'])}{rng} ({x['fights']})"

        def wrong(asc):
            # Wrong = outside the observed range of the encounter total and not the main body's HP either.
            x = per_asc.get(asc)
            hand_hp = dos["hp"].get("a" + asc)
            if not x or hand_hp is None:
                return False
            if x["hp"]["min"] <= hand_hp <= x["hp"]["max"]:
                return False
            body = monsters.get(main, {}).get("hp_by_asc", {}).get(asc)
            return not (body and body["min"] <= hand_hp <= body["max"])
        need_db = per_asc["8"]["hp"]["median"] / per_asc["8"]["turns"] if "8" in per_asc and per_asc["8"]["turns"] else None
        hand_need = dos.get("need_damage_per_turn")
        bad7, bad8 = wrong("7"), wrong("8")
        badn = need_db is not None and hand_need is not None and abs(rel(hand_need, need_db)) > 0.2
        f = lambda text, bad: f"**{text}**" if bad else text
        body_cell = (fmt(body8["median"]) + (f" [{body8['min']}-{body8['max']}]" if body8["min"] != body8["max"] else "")) if body8 else "-"
        w(f"| {did} | {dos.get('kind')} | {cell('7')} | {f(fmt(dos['hp'].get('a7')), bad7)} | {cell('8')} | {f(fmt(dos['hp'].get('a8')), bad8)} | {body_cell} | "
          f"{fmt(need_db)} ({per_asc.get('8', {}).get('wins', 0)}) | {f(fmt(hand_need), badn)} | {deaths} | {dos.get('deaths', '-')} | {used}{note} |")
        rows_b.append({"id": did, "bad7": bad7, "bad8": bad8, "badn": badn, "hp8": per_asc.get("8", {}).get("hp", {}).get("median"),
                       "hand8": dos["hp"].get("a8"), "need": need_db, "hand_need": hand_need})
    w("")
    wrong8 = [r for r in rows_b if r["bad8"]]
    w(f"Dossier A8 HP outside the logged range in {len(wrong8)} of {len(rows_b)} logged entries: "
      + ", ".join(f"{r['id']} (hand {r['hand8']} vs DB {fmt(r['hp8'])})" for r in wrong8) + ".\n")
    wrongn = [r for r in rows_b if r["badn"]]
    w(f"Dossier need_damage_per_turn more than 20% off what A8 winners dealt: "
      + ", ".join(f"{r['id']} (hand {r['hand_need']} vs DB {fmt(r['need'])})" for r in wrongn) + ".\n")

    # (c) move model
    w("## (c) move-model.json\n")
    w("move-model.json comes from the same logs (tools/build-move-model.py) but keys moves per (run, enemy index, id): an enemy met twice in a run "
      "mixes two fights, and the mod's index shifts when an enemy dies (Kin: the priest moves from index 2 to 1), which mixes enemies of the same id "
      "and drops turns. The DB keys per fight and tracks enemies across index shifts. Listed: enemies/moves in one and not the other, average shown "
      "damage (all ascensions) differing by more than max(2, 15%), and successors the move-model has that the DB never saw.\n")
    only_mm = sorted(set(move_model) - set(monsters))
    only_db = sorted(set(monsters) - set(move_model))
    w(f"- enemies only in move-model: {only_mm or 'none'}; only in the DB: {only_db or 'none'}")
    dmg_rows, move_rows, next_rows = [], [], []
    for eid in sorted(set(move_model) & set(monsters)):
        mm = move_model[eid]
        dbm = monsters[eid]["moves"]
        mm_moves = set(mm.get("damage", {})) | set(mm.get("next", {}))
        missing = sorted(mm_moves - set(dbm))
        extra = sorted(set(dbm) - mm_moves)
        if missing or extra:
            move_rows.append(f"- {eid}: only move-model {missing or '-'}; only DB {extra or '-'}")
        for move, avg in mm.get("damage", {}).items():
            d = dbm.get(move, {}).get("avg_total_shown")
            if d is None:
                continue
            if abs(avg - d) > max(2, 0.15 * max(avg, d)):
                dmg_rows.append((abs(avg - d), f"| {eid} | {move} | {fmt(d)} ({dbm[move]['n_seen']}) | {fmt(avg)} |"))
        for move, succ in mm.get("next", {}).items():
            dnext = dbm.get(move, {}).get("next", {})
            ghosts = {m: n for m, n in succ.items() if m not in dnext}
            if ghosts:
                next_rows.append(f"- {eid} {move} -> " + ", ".join(f"{m} x{n}" for m, n in ghosts.items()) + f" (DB successors: {dnext or '-'})")
    w(f"- moves differing: {len(move_rows)} enemies")
    out.extend(move_rows)
    w("\nAverage shown attack damage (all ascensions, Strength included) differing:\n")
    w("| enemy | move | DB avg (n turns) | move-model avg |")
    w("|---|---|---|---|")
    out.extend(r for _, r in sorted(dmg_rows, reverse=True))
    w(f"\nSuccessors in move-model never seen per fight in the DB ({len(next_rows)}; mostly index-shift or cross-fight artefacts):\n")
    out.extend(next_rows)
    w("")
    observed_section(db, w)
    move_rules_section(db, w)
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf8") as handle:
        handle.write("\n".join(out) + "\n")
    print(f"-> {args.out}")


def observed_section(db, w):
    """(d) The observed mechanics (build-monster-db.py `observed`; docs/mechanics-learning.md): each stripped power pooled,
    with the stun-rule thresholds of src/knowledge/mechanics.ts (n >= 5, >= 80% stunned, attacks cancelled and not landing)."""
    pooled = (db.get("observed") or {}).get("powers_stripped")
    w("## (d) observed mechanics (`observed`)\n")
    if pooled is None:
        w("No `observed` block (a DB built before the mining, or the mining failed: see the build's stderr).\n")
        return
    w("| power | strips (fights) | move after | stunned | attack cancelled | attack landed | co-removed | stun rule | monsters |")
    w("|---|---|---|---|---|---|---|---|---|")
    for pid, t in sorted(pooled.items(), key=lambda kv: -kv[1].get("n", 0)):
        n = t.get("n", 0)
        stunned = (t.get("move_after") or {}).get("STUNNED", 0)
        before, cancelled = t.get("attack_before", 0), t.get("attack_cancelled", 0)
        check = t.get("hp_check") or {}
        rule = n >= 5 and stunned >= 0.8 * n and (before < 3 or cancelled >= 0.8 * before) and (check.get("n", 0) < 3 or check.get("landed", 0) <= 0.2 * check.get("n", 0))
        moves = ", ".join(f"{m} {k}" for m, k in list((t.get("move_after") or {}).items())[:3])
        co = ", ".join(f"{p} {k}" for p, k in (t.get("co_removed") or {}).items())
        mons = ", ".join(f"{m} {k}" for m, k in list((t.get("monsters") or {}).items())[:3])
        w(f"| {pid} | {n} ({t.get('fights', 0)}) | {moves} | {stunned} | {cancelled}/{before} | {check.get('landed', 0)}/{check.get('n', 0)} | {co or '-'} | {'**yes**' if rule else 'no'} | {mons} |")
    w("")


def move_rules_section(db, w):
    """(e) The class-B move changes (MECH_MOVE_RULES; docs/mechanics-learning.md §8): per monster and power, the strips (and
    lowerings) whose own frame showed another move, with the thresholds of src/knowledge/mechanics.ts moveChangeOf (n >= 5,
    >= 80% changed, >= 80% to one move other than STUNNED). Only the (monster, power) pairs that changed it at least once."""
    w("## (e) move changes on a power's removal (`move_changed`, class B)\n")
    rows = []
    for eid, monster in sorted((db.get("monsters") or {}).items()):
        observed = monster.get("observed") or {}
        for how, table in (("removed", observed.get("powers_stripped") or {}), ("lowered", observed.get("powers_lowered") or {})):
            for pid, t in sorted(table.items()):
                n, changed = t.get("n", 0), t.get("move_changed", 0)
                if not changed:
                    continue
                targets = sorted(((m, k) for m, k in (t.get("changed_to") or {}).items() if m != "STUNNED"), key=lambda mk: -mk[1])
                rule = n >= 5 and changed >= 0.8 * n and bool(targets) and targets[0][1] >= 0.8 * n
                to = ", ".join(f"{m} {k}" for m, k in (t.get("changed_to") or {}).items())
                nxt = ", ".join(f"{m} {k}" for m, k in list((t.get("changed_next") or {}).items())[:2])
                rows.append(f"| {eid} | {pid} | {how} | {changed}/{n} | {to} | {nxt or '-'} | {t.get('revived', 0)} | {'**yes**' if rule else 'no'} |")
    if not rows:
        w("No move change recorded (a DB built before the class-B counters, or none happened).\n")
        return
    w("| monster | power | how | changed / n | to | next (after a change) | revived | move rule |")
    w("|---|---|---|---|---|---|---|---|")
    for row in rows:
        w(row)
    w("")


if __name__ == "__main__":
    main()
