#!/usr/bin/env python3
"""Fixtures for tests/template-target.test.ts (a card template's conditional placeholders no longer decide what the card does;
the mod's target fields come first: card-model unconditionalText / targetMode).

Boards, each the state behind a logged combat decision (logs/states.jsonl, found through the log DB), as tests/logged.ts's
boards are ({source, decision, state}):
- RNTVAT76BPV0, Shiv in the hand, the gate refusing its untargeted play (F30 T1, F33 T1, F38 T1 twice) or a line playing it
  untargeted later (F38 T1 after Defend);
- controls holding no changed card: the same run's F30 T1 before Cloak and Dagger made the Shiv, True Grit's conditional
  template in the hand (PW7Y9EWUW8SB F44 T1, A9, Mad Science with the Expertise rider in the deck), Primal Force's against
  four enemies (JW925EDF9ZTQ F30 T1);
- the SL judge's draw test: 7DFB21JE2DTK F48 T7, a least-loss end of turn with Mad Science (Sapping rider) and Pommel Strike;
- the deck profile: that board's deck, and JJ75S331VUKX's last frame (Mad Science with the Expertise rider).

Also game-data.json (the mod's collections trimmed to what the boards reference, the cards the tests model, and the Ironclad
and colorless Common / Uncommon / Rare pools a card potion offers) and pinned-knowledge.json (the knowledge files the planner
reads, from v4 REV, the monster DB and the move model trimmed to the boards' enemies). Reads the logs once, run by hand from
the repo root: python3 tests/template-target-data/make-fixtures.py. The tests read only the files it writes.
"""
import json
import subprocess
import sys

REV = "6bd48a9"
P = ".cache/logdb-venv/bin/python"
OUT = "tests/template-target-data"
BOARDS = [
    # name, run, ts (UTC)
    ("rntv-f30-t1-shiv", "RNTVAT76BPV0", "2026-10-03T11:11:06.975"),
    ("rntv-f33-t1-shiv", "RNTVAT76BPV0", "2026-10-03T11:12:52.111"),
    ("rntv-f38-t1-shiv-code", "RNTVAT76BPV0", "2026-10-03T11:34:57.584"),
    ("rntv-f38-t1-defend-shiv", "RNTVAT76BPV0", "2026-10-03T11:35:25.034"),
    ("rntv-f30-t1-cloak", "RNTVAT76BPV0", "2026-10-03T11:10:58.334"),
    ("pw7y-f44-t1-true-grit", "PW7Y9EWUW8SB", "2026-10-02T23:25:05.039"),
    ("jw92-f30-t1-primal-force", "JW925EDF9ZTQ", "2026-10-02T03:33:11.145"),
    ("7dfb-f48-t7-mad-science", "7DFB21JE2DTK", "2026-09-26T12:17:40.537"),
    # The deck profile: Mad Science with the Expertise rider in the deck (the run's last frame).
    ("jj75-f48-mad-science-expertise", "JJ75S331VUKX", "2026-10-02T02:04:38.008"),
]
# Cards the tests model apart from the boards (Self-target text AoE, the conditionals' kinds).
EXTRA_CARDS = {"SHIV", "SOVEREIGN_BLADE", "MAD_SCIENCE", "THE_BOMB", "CORROSIVE_WAVE", "TRUE_GRIT", "KNIFE_TRAP", "GLOW", "CASCADE", "FAN_OF_KNIVES", "SWORD_BOOMERANG"}


def query(sql):
    out = subprocess.run([P, "tools/logdb/query.py", "--no-sync", "--json", "--max-rows", "1000", sql], check=True, capture_output=True, text=True).stdout
    data = json.loads(out)
    if "error" in data:
        raise SystemExit(data["error"])
    return [dict(zip(data["columns"], row)) for row in data["rows"]]


def load(name):
    return json.loads(subprocess.run(["git", "show", f"{REV}:src/knowledge/{name}"], check=True, capture_output=True, text=True).stdout)


cards, monsters, powers, relics, potions = set(EXTRA_CARDS), set(), set(), set(), set()
with open("logs/states.jsonl", "rb") as states:
    for name, run, ts in BOARDS:
        frame = query(f"SELECT off, len FROM frames WHERE run_id = '{run}' AND ts = TIMESTAMP '{ts}' AND coalesce(observed, false) = false")
        decision = query(f"SELECT label, decider, action, card_index, target_index, rationale FROM decisions WHERE run_id = '{run}' AND ts = TIMESTAMP '{ts}'")
        if not frame or not decision:
            raise SystemExit(f"{name}: no frame or decision at {ts}")
        states.seek(frame[0]["off"])
        state = json.loads(states.read(frame[0]["len"]))["state"]
        d = decision[0]
        out = {"source": f"{run} F{state['run'].get('floor')} T{state.get('turn')} {ts}Z {d['label']}", "decision": d, "state": state}
        with open(f"{OUT}/{name}.json", "w") as handle:
            json.dump(out, handle, ensure_ascii=False, indent=1)
        cards.update(c["card_id"] for c in state["run"]["deck"])
        combat = state.get("combat") or {}
        cards.update(c["card_id"] for c in combat.get("hand") or [])
        view = (state.get("agent_view") or {}).get("combat") or {}
        for pile in ("draw", "discard", "exhaust"):
            for line in view.get(pile) or []:
                cards.update(line.get("card_ids") or [])
        for e in combat.get("enemies") or []:
            monsters.add(e["enemy_id"])
            powers.update(p["power_id"] for p in e.get("powers") or [])
        powers.update(p["power_id"] for p in (combat.get("player") or {}).get("powers") or [])
        relics.update(r["relic_id"] for r in state["run"].get("relics") or [])
        potions.update(p["potion_id"] for p in state["run"].get("potions") or [] if p.get("potion_id"))
        print(f"{name}: {d['label']} {d['action']} | {str(d['rationale'])[:90]}", file=sys.stderr)

gd = json.load(open(".cache/game-data.json"))["collections"]
pool = lambda c: c["color"] in ("ironclad", "colorless") and c["rarity"] in ("Common", "Uncommon", "Rare")
subset = {
    "cards": [c for c in gd["cards"] if c["id"] in cards or pool(c)],
    "monsters": [m for m in gd["monsters"] if m["id"] in monsters],
    "relics": [r for r in gd["relics"] if r["id"] in relics],
    "potions": [p for p in gd["potions"] if p["id"] in potions or p["id"] in ("POWER_POTION", "ATTACK_POTION", "SKILL_POTION", "COLORLESS_POTION")],
    "powers": [p for p in gd["powers"] if p["id"] in powers],
    "events": [],
    "characters": [c for c in gd["characters"] if c.get("id") == "IRONCLAD"],
}
with open(f"{OUT}/game-data.json", "w") as handle:
    json.dump(subset, handle, ensure_ascii=False, separators=(",", ":"))

db, mm, pe = load("monster-db.json"), load("move-model.json"), load("potion-equivalents.json")
keep = lambda key: any(part in monsters for part in key.split("+"))
pinned = {
    "monster-db.json": {
        "meta": db["meta"],
        "bosses": db["bosses"],
        "encounters": {k: v for k, v in db["encounters"].items() if keep(k)},
        "monsters": {k: v for k, v in db["monsters"].items() if k in monsters},
    },
    "move-model.json": {k: v for k, v in mm.items() if k in monsters},
    "experience.json": load("experience.json"),
    "boss-damage.json": load("boss-damage.json"),
    "card-upgrades.json": load("card-upgrades.json"),
    "potion-equivalents.json": {**{k: v for k, v in pe.items() if k != "potions"}, "potions": {k: v for k, v in pe["potions"].items() if k in potions}},
}
with open(f"{OUT}/pinned-knowledge.json", "w") as handle:
    json.dump(pinned, handle, ensure_ascii=False, separators=(",", ":"))
print(f"{len(BOARDS)} boards; {len(subset['cards'])} cards, {len(subset['monsters'])} monsters, {len(subset['powers'])} powers, {len(subset['relics'])} relics, {len(subset['potions'])} potions", file=sys.stderr)
