#!/usr/bin/env python3
"""
Plan adherence: are DeepSeek's run plans and fight plans actually carried out by code and Jev?

Usage
    python3 ops/plan_adherence.py            # summary tables (overall, by period, by arm)
    python3 ops/plan_adherence.py --runs     # + one row per run
    python3 ops/plan_adherence.py --json     # machine-readable output (everything)
    python3 ops/plan_adherence.py --md notes/plan-adherence.md   # also write the Markdown report
    python3 ops/plan_adherence.py --events RUNID   # every scored event of one run (for spot checks)

Stdlib only.  Reads jev-sts2/logs/{runs,run-plans,fight-plans,decisions,states}.jsonl, the cached
game data (jev-sts2/.cache/game-data.json: monster types, potion/card text) and the card-role sets
in jev-sts2/src/strategy/card-value.ts (parsed, so roles follow the current code).  Nothing is written
except the optional Markdown report.  Prompts / request text are never printed.

Scope
    A run counts when it has at least one run plan or fight plan (runs.jsonl ablation arms "code" and
    "jev" have neither and are excluded).  Arm "ds" (DeepSeek without Jev: the Jev answers are a stub)
    is tagged; its "jev" decider is reported as "jev(stub)".  A run that is not in runs.jsonl yet (in
    progress, or crashed without a summary) is shown in --runs as "unfinished" and left out of the
    aggregates.  Plans carry their run id (plan.run), so no timestamp matching is needed; decisions
    and states carry it in the fingerprint / state.run_id, and a decision is joined to its state by
    the identical timestamp.
    Period: "pre-892278c" = run started before 2026-09-27 16:48:01 +0800 (08:48:01Z, merge 892278c);
    "post-892278c" = on/after.  Arm: runs.jsonl "arm" (full/ds for the A8 ablation); runs without one
    ran the normal (full) configuration and are labelled "normal".

Who ("by whom") -- every scored action is attributed to the decision that chose it.  Combat cards and
potions are played as a whole-turn line; a "combat/plan-continue" step is attributed to the decision
that started the line that turn (the last non-continue combat decision of the same floor+turn):
    code         code's own pick: turn-solver rank 1 (combat/plan, lethal, least-loss, end_turn),
                 card-value pick on rewards, rest scoring
    map_scoring  code's route scoring on the map
    jev          Jev's answer played as chosen          jev(stub)  the same in the "ds" arm
    jev=rank1    Jev's answer, and it was also code's rank-1 line ("code rank 1" in the rationale):
                 code would have played the same line
    hp_guard     Jev's pick (or code's rank 1: combat/plan-guarded) swapped by the HP guard
    potion_veto  Jev's potion line refused by code (dry line / code-best line played instead)
    plan_potion  code auto-drank a potion because the fight plan said so (combat/plan-potion)
    fallback     code-fallback: Jev near-guess on a hallway turn, no usable answer, per-card fallback
    deepseek / claude   an escalation override (older versions)
    forced       only one legal option

Metrics (unit, honoured / broken / n/a):

 1 save_potions  Unit = (potion instance, act) for every potion that the run plan active at the time
   keeps for the act boss (plan.savePotions, role test = a Python copy of planSavesPotion in
   run-plan.ts, applied with the CURRENT classifier to all runs).  A potion counts once it is held
   while such a plan (made in the same act) is active.
     honoured = still in the belt when the act-boss fight starts (drinking it in the boss fight is fine)
     broken   = drunk (or discarded) before the boss fight of that act.  Each broken case records
                floor, fight kind (monster/elite/boss from the enemy types), turn, who, HP%, whether
                it was inside code's enforcement window (<= 10 floors to the boss: SAVE_POTIONS_WITHIN),
                and "justified" = HP < 40% max at the drink, or the line was least-loss (every line
                died) or lethal (won the fight), or the turn was costly (the question's cheapest dry
                line lost >= 30% of current HP or left < 25% max HP; only visible on Jev questions),
                or the run died in that same fight.
     n/a      = the run ended before the boss while the potion was held ("died holding"), or it
                vanished without a use/discard decision (event effect, logging gap).
   Only plans with the commitment fields (run NMLV5SYCFL8X on, 2026-09-27) can be scored.
   Each broken case also records the fight plan's use for that potion in that fight (fight_plan_use):
   a fight plan saying "early"/"big_hit" for a potion the run plan keeps is a plan-vs-plan conflict.
 1' save_potions_dropped  Same unit and rules, for roles DeepSeek put in save_potions that
   parseRunPlan dropped (it keeps only the first 2 roles: .slice(0, 2)).  Code never saw these
   commitments, so a "broken" here is a parser loss, not a code/Jev violation.

 2 entry_hp_pct  Unit = act-boss fight reached with a plan entryHp.  HP% at the first decision of
   the boss fight vs the entryHp of the plan active then.  met if HP% >= target - 0.5pp; missed by
   (target - HP%).  "by whom" for a miss lists the pre-boss choices that went against the plan's
   enforcement: rest sites within 6 floors of the boss below the target that did not HEAL, and elites
   entered within 8 floors of the boss below target+15pp (who chose them).  A miss with neither is
   "no_opportunity" (HP lost in forced fights; not a choice).

 3 must_have     (a) Unit = (act boss reached, role in plan.mustHave).  honoured = the deck holds >= 2
   cards with the role at boss entry (code's own "lacks" threshold is < 2; roles = cardRoles() in
   card-value.ts, parsed); partial = 1; broken = 0.  By whom = the deciders of the act's card rewards
   that passed up a card of that role (3b), else "no_opportunity" (never offered on a card reward;
   shops and events are not checked).  (b) Unit = card reward (reward/card screen)
   where an offered card fills a must-have role the deck lacks (< 2): honoured = a card of a lacking
   role was taken; broken = something else or skip, attributed to the decider.

 4 avoid         (a) cards: Unit = a card reward that offered a card in plan.avoid (honoured when not
   taken) plus every avoided card that entered the deck by any route (broken; by whom = the decision
   right before the deck changed; label shows the route: reward/shop/event/selection).  Shops that
   stocked an avoided card but did not sell it are not counted as honoured (n/a).  (b) elites: Unit =
   a map choice where an Elite and a non-Elite node were both available while the active plan said
   elites="avoid", or its entry-HP rule applied (<= 8 floors to the boss and HP < entryHp+15pp).
   honoured = non-Elite chosen; broken = Elite chosen; only-Elite choices are "forced" (n/a).

 5 focus_enemy   Unit = an enemy-targeted card play (target_index set; attacks and targeted debuffs
   alike) in a fight whose fight plan names a focus enemy, while that enemy is alive and at least one
   other enemy is alive.  honoured = aimed at an enemy with the focus id.  Also a per-turn view (turn
   honoured if the majority of its targeted plays hit the focus).  AoE damage is not counted.

 6 potion_timing Unit = (fight plan, potion id) for every use the plan gives (use re-read as in
   readPotionUse(): big_hit on an offensive potion = burst; burst on a non-offensive one = any; "any"
   is skipped).  Evaluated on drinks of that potion id in that fight:
     early     honoured: drunk on turn 1-2; broken: drunk later ("late") or not at all
     big_hit   (split: "big_hit" for potions code sees as blunting a hit, BLUNTS_HIT in combat-plan.ts;
               "big_hit(non-blunting)" e.g. Dexterity/Swift: code gives those the default rule)
               honoured: drunk on a big-hit turn (incoming - block >= max(12, 25% HP), from the state
               at the drink); broken: drunk on a quiet turn; not drunk: honoured if no big-hit turn came
               while it was held, otherwise broken ("missed")
     burst     (split: "burst(from big_hit)" = the plan said big_hit on an offensive potion)
               honoured: drunk on a turn where an enemy died / the fight ended, or at HP < 30%/pressed;
               broken: drunk on another turn; not drunk: "unused" (counted n/a)
     save      honoured: not drunk in this fight; broken: drunk (justified flag as in 1)
     emergency honoured: not drunk, or drunk at HP < 40%; broken: drunk at >= 40%
   The fight plan used is the latest one logged for (run, fight key) before the drink / fight end.

 7 setup         Unit = (fight plan, setup card).  The first of turns 1-2 on which the card is in hand
   and playable at some decision of the turn (drawn mid-turn counts).  honoured = played that turn;
   broken = not played that turn (by whom = who chose the last line of that turn while the card was
   still in hand and playable); n/a = never in hand and playable on T1-2.
   Since 31ad718 Dominate / Molten Fist only count as setup after Vulnerable; that nuance is ignored
   here (they count whenever played), so these two are slightly under-credited as "broken".

 8 plan_labels   Unit = a Jev combat question whose options carry DeepSeek-plan labels that differ
   between options (so there is a plan-consistent and a plan-inconsistent choice):
     setup   options tagged "plays planned setup ..." are plan-consistent
     keep    options that drink a potion the plan keeps ("... the plan keeps for a later fight/an
             emergency", or the run_plan "keeps this potion for the act boss" tag) are INconsistent
     vuln    options tagged "before the planned Vulnerable" are inconsistent
     focus   among options that deal damage, consistent = at least half of the option's damage goes to
             the kill-first enemy (options dealing no damage are neither; picking one is n/a)
   Reported: how often code's rank 1 (plan1) was consistent, how often Jev's own pick was, how often
   the line finally played was, and which override (hp_guard / potion_veto / fallback / deepseek)
   turned a consistent Jev pick inconsistent or vice versa.  A fallback to "the code-best potion-free
   plan" cannot be mapped to an option index; for "keep" it is consistent by construction, for the
   other tags it is "unknown" and excluded from the final-% denominator.

Approximations / limits (also in the report)
  * The plan classifiers (potion roles, card roles, offensive potions) are today's; older runs were
    played with older code that may have classified differently (e.g. Dexterity/Speed Potion as
    "block" came in 817ede7).  The metric measures the plan's intent, not the code's intent at the time.
  * Jev's options are only the lines code offered; a plan-consistent line code never offered is
    invisible to metric 8 (metric 7 covers code-decided turns).
  * "justified" is a heuristic; "HP otherwise died" is only visible on least-loss turns and Jev questions.
  * approach (race/setup/defend) and key_turns are free text -> n/a.
"""

from __future__ import annotations

import argparse
import collections
import json
import os
import re
import sys
from typing import Any

ROOT = os.path.expanduser("~/Projects/sts2-jev")
LOGS = os.path.join(ROOT, "jev-sts2", "logs")
SRC = os.path.join(ROOT, "jev-sts2", "src")
GAME_DATA = os.path.join(ROOT, "jev-sts2", ".cache", "game-data.json")
CUTOFF = "2026-09-27T08:48:01Z"  # 892278c, 16:48:01 +0800
BOSS_FLOORS = (17, 33, 48)
SAVE_POTIONS_WITHIN = 10
SPOT_RUNS = ("EJXCAQ56PWLK", "WR2Y98A43YCY", "GZ24W7LC496Q")

# ----------------------------------------------------------------------------------------- helpers


def jl(path: str):
    """Stream a jsonl file; a torn line (the live run appends) is skipped."""
    with open(path, "rb") as fh:
        for raw in fh:
            try:
                yield json.loads(raw)
            except ValueError:
                continue


def floors_to_boss(floor: int) -> int:
    for b in BOSS_FLOORS:
        if b >= floor:
            return b - floor
    return 0


def pct(a: int, n: int) -> str:
    return f"{100.0 * a / n:.0f}%" if n else "-"


def load_game_data():
    try:
        d = json.load(open(GAME_DATA))["collections"]
    except (OSError, ValueError, KeyError):
        return {}, {}, {}
    monsters = {m["id"]: m.get("type", "") for m in d.get("monsters", [])}
    potions = {p["id"]: p.get("description", "") or "" for p in d.get("potions", [])}
    cards = {c["id"]: c.get("type", "") for c in d.get("cards", [])}
    return monsters, potions, cards


def parse_ts_sets(path: str) -> dict[str, set[str]]:
    out: dict[str, set[str]] = {}
    try:
        text = open(path, encoding="utf8").read()
    except OSError:
        return out
    for m in re.finditer(r"const\s+(\w+)\s*=\s*new Set\(\[(.*?)\]\)", text, re.S):
        out[m.group(1)] = set(re.findall(r'"([A-Z0-9_]+)"', m.group(2)))
    return out


CARD_SETS = parse_ts_sets(os.path.join(SRC, "strategy", "card-value.ts"))
FP_SETS = parse_ts_sets(os.path.join(SRC, "strategy", "fight-plan.ts"))
BLUNTS_HIT = re.compile(r"格挡|block|无实体|intangible|伤害减少|less damage|荆棘|thorns|虚弱|weak", re.I)
POTION_TEXT: dict[str, str] = {}
OFFENSIVE_POTIONS = FP_SETS.get("OFFENSIVE_POTIONS") or {
    "FIRE_POTION", "EXPLOSIVE_AMPOULE", "STRENGTH_POTION", "FLEX_POTION", "VULNERABLE_POTION", "FEAR_POTION",
    "ATTACK_POTION", "POWDERED_DEMISE", "GIGANTIFICATION_POTION", "DUPLICATOR", "ENERGY_POTION", "POTION_SHAPED_ROCK"}


def card_roles(card_id: str) -> set[str]:
    """Python copy of cardRoles() in card-value.ts (sets parsed from the source)."""
    s = CARD_SETS
    roles = set()
    if card_id in s.get("AOE", ()):
        roles.add("aoe")
    if card_id in s.get("STRENGTH", ()):
        roles.add("strength")
    if card_id in s.get("BLOCK", ()):
        roles.add("block")
    if card_id in s.get("DRAW_CARDS", ()):
        roles.add("draw")
    if card_id in s.get("EXHAUST_CARDS", ()):
        roles.add("exhaust")
    if card_id in s.get("MULTI_HIT", ()):
        roles.add("multi_hit")
    if card_id in s.get("FRONTLOAD", ()):
        roles.add("frontload")
    if card_id in s.get("DEBUFF_CARDS", ()):
        roles.add("debuff")
    return roles


def potion_role(potion_id: str, text: str) -> str | None:
    """Python copy of the role test in planSavesPotion() (run-plan.ts)."""
    pid = potion_id or ""
    if re.search(r"STRENGTH|FLEX", pid):
        return "strength"
    if re.search(r"REGEN|BLOOD_POTION|FAIRY", pid) or re.search(r"回复|heal|恢复|再生|regen", text, re.I):
        return "heal"
    if re.search(r"DEXTERITY|BLOCK_POTION|FORTIFIER|SPEED_POTION|GHOST_IN_A_JAR|HEART_OF_IRON|SHIP_IN_A_BOTTLE", pid) or re.search(
            r"格挡|block|无实体|intangible|敏捷|dexterity", text, re.I):
        return "block"
    if re.search(r"虚弱|weak", text, re.I):
        return "weak"
    if re.search(r"伤害|damage", text, re.I):
        return "damage"
    return None


def plan_saves(plan: dict | None, potion_id: str, text: str) -> bool:
    roles = (plan or {}).get("savePotions") or []
    if not roles:
        return False
    if "any" in roles:
        return True
    r = potion_role(potion_id, text)
    return r is not None and r in roles


def plan_saves_dropped(plan: dict | None, potion_id: str, text: str) -> bool:
    """A role in DeepSeek's raw save_potions that the parsed plan lost (slice(0, 2) in parseRunPlan)."""
    raw = [r for r in ((plan or {}).get("_raw_save") or []) if r in ("block", "weak", "damage", "strength", "heal", "any")]
    kept = (plan or {}).get("savePotions") or []
    dropped = [r for r in raw if r not in kept]
    if not dropped or "any" in kept:
        return False
    r = potion_role(potion_id, text)
    return "any" in dropped or (r is not None and r in dropped)


def read_potion_use(use: str | None, potion_id: str) -> str | None:
    if use == "big_hit" and potion_id in OFFENSIVE_POTIONS:
        return "burst"
    if use == "burst" and potion_id not in OFFENSIVE_POTIONS:
        return "any"
    return use


# ----------------------------------------------------------------------------------------- loading


def load_runs():
    runs = {}
    for d in jl(os.path.join(LOGS, "runs.jsonl")):
        runs[d["run_id"]] = d
    run_plans = collections.defaultdict(list)
    for d in jl(os.path.join(LOGS, "run-plans.jsonl")):
        if d.get("plan"):
            run_plans[d["run"]].append(d)
    fight_plans = collections.defaultdict(list)
    for d in jl(os.path.join(LOGS, "fight-plans.jsonl")):
        if d.get("plan"):
            fight_plans[d["run"]].append(d)
    return runs, run_plans, fight_plans


def fp_fields(fp: str) -> dict:
    try:
        return json.loads(fp)
    except (ValueError, TypeError):
        return {}


def compact_state(s: dict, monsters: dict) -> dict:
    run = s.get("run") or {}
    combat = s.get("combat") or {}
    act_raw = str(run.get("act_id", ""))
    out: dict[str, Any] = {
        "floor": run.get("floor"),
        "act": int(act_raw) + 1 if act_raw.isdigit() else None,
        "hp": run.get("current_hp"),
        "max_hp": run.get("max_hp"),
        "potions": [(p.get("potion_id") if p.get("occupied") else None, p.get("description") or "") for p in run.get("potions") or []],
        "deck": [c.get("card_id") for c in run.get("deck") or []],
        "turn": s.get("turn"),
    }
    if combat:
        pl = combat.get("player") or {}
        out["block"] = pl.get("block", 0)
        out["hand"] = [(c.get("card_id"), bool(c.get("playable"))) for c in combat.get("hand") or []]
        ens = []
        for e in combat.get("enemies") or []:
            inc = 0
            for it in e.get("intents") or []:
                td = it.get("total_damage")
                if td is None and it.get("damage") is not None:
                    td = (it.get("damage") or 0) * (it.get("hits") or 1)
                inc += td or 0
            ens.append({"i": e.get("index"), "id": e.get("enemy_id"), "hp": e.get("current_hp"),
                        "alive": e.get("is_alive") is not False and (e.get("current_hp") or 0) > 0,
                        "inc": inc, "type": monsters.get(e.get("enemy_id"), "")})
        out["enemies"] = ens
    rw = s.get("reward") or {}
    if rw.get("card_options"):
        out["card_options"] = [c.get("card_id") for c in rw["card_options"]]
    mp = s.get("map") or {}
    if mp.get("nodes") and s.get("screen") == "MAP":
        out["map_avail"] = [n.get("node_type") for n in mp["nodes"] if n.get("is_available")]
    rest = s.get("rest") or {}
    if rest.get("options"):
        out["rest_opts"] = [o.get("option_id") for o in rest["options"]]
    return out


def load_timelines(target: set[str], monsters: dict):
    """Per run: decisions in time order, each joined to the compact state logged at the same ts."""
    dec = collections.defaultdict(list)
    for d in jl(os.path.join(LOGS, "decisions.jsonl")):
        fp = fp_fields(d.get("fingerprint", ""))
        rid = fp.get("run")
        if rid not in target:
            continue
        crit = None
        qs = d.get("questions") or {}
        for q in qs.values():
            crit = q.get("criteria")
            break
        ans = None
        for a in (d.get("answers") or {}).values():
            ans = a
            break
        dec[rid].append({
            "ts": d["ts"], "screen": d.get("screen"), "label": d.get("label", ""), "decider": d.get("decider"),
            "floor": d.get("floor"), "turn": d.get("turn"), "chosen": d.get("chosen") or {},
            "rationale": d.get("rationale") or "", "criteria": crit,
            "jev_choice": (ans or {}).get("choice"), "jev_conf": (ans or {}).get("confidence"),
            "esc": d.get("escalation"), "fp": fp,
        })
    states = collections.defaultdict(dict)
    with open(os.path.join(LOGS, "states.jsonl"), "rb") as fh:
        for raw in fh:
            m = re.search(rb'\\"run\\":\\"([A-Z0-9_a-z]+)\\"', raw[:6000])
            if not m or m.group(1).decode() not in target:
                continue
            try:
                d = json.loads(raw)
            except ValueError:
                continue
            s = d.get("state") or {}
            rid = s.get("run_id")
            if rid in target:
                states[rid][d["ts"]] = compact_state(s, monsters)
    for rid, rows in dec.items():
        rows.sort(key=lambda r: r["ts"])
        last = None
        for r in rows:
            st = states[rid].get(r["ts"])
            r["state_missing"] = st is None
            if st is None and last is not None:
                st = {k: last.get(k) for k in ("act", "max_hp", "deck", "potions")}
                st["floor"] = r["floor"]
            r["st"] = st or {}
            if not r["state_missing"]:
                last = st
    return dec


# ------------------------------------------------------------------------------------ attribution


def who_of(d: dict, arm: str | None) -> str:
    label, decider, rat = d["label"], d["decider"], d["rationale"]
    stub = arm == "ds"
    if d["screen"] == "MAP":
        if rat.startswith("only one legal option"):
            return "forced"
        if decider == "code":
            return "map_scoring"
    if label == "combat/plan-guarded" or "HP guard:" in rat:
        return "hp_guard"
    if label == "combat/plan-potion":
        return "plan_potion"
    if decider == "code-fallback":
        if re.search(r"chose (a potion|an attack potion)|potion line below code rank", rat):
            return "potion_veto"
        return "fallback"
    if decider in ("deepseek", "claude"):
        return decider
    if decider == "jev" or (decider is None and rat.startswith("Jev chose")):
        base = "jev(stub)" if stub else "jev"
        # Jev's pick was also code's rank 1: the plan was broken by a line code ranked first too
        return base + "=rank1" if re.search(r"code rank 1\b", rat) else base
    return "code"


def hp_frac(d: dict) -> float | None:
    hp = d["fp"].get("hp")
    mx = d["st"].get("max_hp")
    if hp is None or not mx:
        return None
    return hp / mx


def crit_json(d: dict) -> dict[str, dict]:
    out = {}
    for k, v in (d.get("criteria") or {}).items():
        if not v:
            continue
        try:
            o = json.loads(v)
        except (ValueError, TypeError):
            continue
        if isinstance(o, dict):
            out[k] = o
    return out


def costly_turn(d: dict) -> bool:
    """From a Jev question: the cheapest dry card line loses >= 30% of HP or ends < 25% max."""
    hp = d["fp"].get("hp")
    mx = d["st"].get("max_hp")
    if not hp or not mx:
        return False
    crit = crit_json(d)
    dry = [o for k, o in crit.items() if k.startswith("plan") and "potion" not in str(o.get("plays", "")).lower() and "药水" not in str(o.get("plays", ""))]
    losses = [o.get("hp_lost") for o in dry if isinstance(o.get("hp_lost"), (int, float))]
    if not losses:
        for o in crit.values():
            m = re.search(r"cheapest card plan alone loses (\d+) HP", str(o.get("note", "")))
            if m:
                losses = [int(m.group(1))]
                break
    if not losses:
        return False
    lo = min(losses)
    return lo >= 0.3 * hp or (hp - lo) < 0.25 * mx


# ---------------------------------------------------------------------------------------- analysis


class RunAnalysis:
    def __init__(self, rid, meta, rplans, fplans, rows, arm, period):
        self.rid, self.meta, self.rplans, self.fplans, self.rows = rid, meta, rplans, fplans, rows
        self.arm, self.period = arm, period
        self.events: list[dict] = []  # every scored unit
        self.fight_kind: dict[int, str] = {}
        self.last_combat_floor = None
        self._index()

    # --- structure
    def _index(self):
        kinds = collections.defaultdict(set)
        for r in self.rows:
            if r["screen"] == "COMBAT":
                for e in r["st"].get("enemies") or []:
                    kinds[r["floor"]].add(e.get("type"))
                self.last_combat_floor = r["floor"]
        for fl, ts in kinds.items():
            self.fight_kind[fl] = "boss" if "Boss" in ts else "elite" if "Elite" in ts else "monster"
        # line origin for every combat decision
        origin = None
        for r in self.rows:
            if r["screen"] != "COMBAT":
                continue
            if r["label"] == "combat/plan-continue":
                if origin is not None and origin["floor"] == r["floor"] and origin["turn"] == r["turn"]:
                    r["origin"] = origin
                else:
                    r["origin"] = r
                    m = re.search(r"continuing the (\w+)-chosen plan", r["rationale"])
                    r["origin_who"] = {"Jev": "jev", "DeepSeek": "deepseek", "Claude": "claude"}.get(m.group(1) if m else "", "code")
            else:
                origin = r
                r["origin"] = r

    def origin_who(self, r) -> str:
        o = r.get("origin") or r
        if o is r and "origin_who" in r:
            w = r["origin_who"]
            return "jev(stub)" if w == "jev" and self.arm == "ds" else w
        return who_of(o, self.arm)

    def died_on(self, floor) -> bool:
        return self.meta is not None and not self.meta.get("victory") and floor == self.last_combat_floor

    def plan_at(self, ts: str) -> dict | None:
        cur = None
        for p in self.rplans:
            if p["ts"] <= ts:
                cur = p["plan"]
        return cur

    def fight_plan_at(self, floor: int, ts: str) -> dict | None:
        cur = None
        for p in self.fplans:
            if p.get("floor") == floor and p["ts"] <= ts:
                cur = p["plan"]
        if cur is None:  # a plan logged a moment after the first decision
            for p in self.fplans:
                if p.get("floor") == floor:
                    return p["plan"]
        return cur

    def ev(self, metric, outcome, **kw):
        e = {"run": self.rid, "metric": metric, "outcome": outcome}
        e.update(kw)
        self.events.append(e)

    def boss_entries(self) -> dict[int, dict]:
        """act -> first decision of the act-boss fight."""
        out = {}
        for r in self.rows:
            if r["screen"] == "COMBAT" and self.fight_kind.get(r["floor"]) == "boss":
                act = r["st"].get("act")
                if act is not None and act not in out:
                    out[act] = r
        return out

    # --- metric 1
    def m_save_potions(self, metric="save_potions", saves=None):
        saves = saves or plan_saves
        self._metric = metric
        boss = self.boss_entries()
        prev_slots: list[str | None] = []
        inst: dict[int, dict] = {}  # slot -> instance
        seq = 0
        rows = self.rows
        for i, r in enumerate(rows):
            slots = []
            for part in (r["fp"].get("potions") or "").split("|"):
                bits = part.split(":")
                slots.append(bits[0] or None if bits and bits[0] else None)
            texts = [t for (_, t) in (r["st"].get("potions") or [])]
            # disappearances since the previous decision
            for s, old in enumerate(prev_slots):
                new = slots[s] if s < len(slots) else None
                if old is not None and new != old and s in inst:
                    self._close_instance(inst.pop(s), rows[i - 1], boss, rows, i - 1)
            for s, pid in enumerate(slots):
                if pid is not None and s not in inst:
                    seq += 1
                    inst[s] = {"id": pid, "seq": seq, "flag_act": None, "flag_floor": None, "slot": s,
                               "text": texts[s] if s < len(texts) else ""}
            plan = self.plan_at(r["ts"])
            act = r["st"].get("act")
            for s, it in inst.items():
                if it["flag_act"] is not None and it["flag_act"] != act:
                    # the act changed while held: the flagged act's boss must have been passed with it
                    self._close_flag(it, "honoured", r, boss)
                if plan and plan.get("act") == act and saves(plan, it["id"], it["text"]) and it["flag_act"] is None:
                    it["flag_act"], it["flag_floor"], it["roles"] = act, r["floor"], plan.get("savePotions")
                # the boss fight of the flagged act has started with it in the belt
                b = boss.get(it["flag_act"]) if it["flag_act"] is not None else None
                if b is not None and r["ts"] >= b["ts"]:
                    self._close_flag(it, "honoured", r, boss)
            prev_slots = slots
        for it in inst.values():
            if it["flag_act"] is not None:
                self.ev(self._metric, "n/a", who="n/a", potion=it["id"], act=it["flag_act"],
                        note="run ended before the boss while holding it" if self.meta else "run unfinished")

    def _close_flag(self, it, outcome, r, boss):
        if it.get("closed_act") == it["flag_act"]:
            it["flag_act"] = None
            return
        b = boss.get(it["flag_act"])
        self.ev(self._metric, outcome, who="-", potion=it["id"], act=it["flag_act"], flagged_floor=it["flag_floor"],
                boss_floor=b["floor"] if b else None)
        it["closed_act"] = it["flag_act"]
        it["flag_act"] = None

    def _close_instance(self, it, last_row, boss, rows, idx):
        if it["flag_act"] is None:
            return
        ch = last_row["chosen"]
        act = it["flag_act"]
        b = boss.get(act)
        floor = last_row["floor"]
        # drunk inside the boss fight (or after it started) = kept for the boss
        if b is not None and last_row["ts"] >= b["ts"]:
            self._close_flag(it, "honoured", last_row, boss)
            return
        how = "drunk" if ch.get("action") == "use_potion" and ch.get("option_index") == it["slot"] else \
            "discarded" if ch.get("action") == "discard_potion" else "vanished"
        if how == "vanished":
            self.ev(self._metric, "n/a", who="n/a", potion=it["id"], act=act, floor=floor,
                    note=f"left the belt without a use/discard decision ({last_row['label']})")
            it["flag_act"] = None
            return
        who = self.origin_who(last_row) if last_row["screen"] == "COMBAT" else who_of(last_row, self.arm)
        hf = hp_frac(last_row)
        o = last_row.get("origin") or last_row
        justified = bool(
            (hf is not None and hf < 0.4) or o["label"] in ("combat/least-loss", "combat/lethal")
            or costly_turn(o) or self.died_on(floor))
        fpl = self.fight_plan_at(floor, last_row["ts"]) if last_row["screen"] == "COMBAT" and any(p.get("floor") == floor for p in self.fplans) else None
        fp_use = read_potion_use(((fpl or {}).get("potions") or {}).get(it["id"]), it["id"]) if fpl else None
        self.ev(self._metric, "broken", who=who, potion=it["id"], act=act, floor=floor, turn=last_row["turn"],
                fight_plan_use=fp_use or ("none" if fpl else "no fight plan"),
                how=how, fight=self.fight_kind.get(floor, "-") if last_row["screen"] == "COMBAT" else last_row["screen"],
                hp_pct=round(hf * 100) if hf is not None else None, in_window=floors_to_boss(floor or 0) <= SAVE_POTIONS_WITHIN,
                justified=justified, label=o["label"], flagged_floor=it["flag_floor"])
        it["flag_act"] = None

    # --- metric 2 + 3a
    def m_boss_entry(self):
        for act, r in sorted(self.boss_entries().items()):
            plan = self.plan_at(r["ts"])
            hf = hp_frac(r)
            if plan and plan.get("entryHp") and hf is not None:
                target = plan["entryHp"]
                if hf >= target - 0.005:
                    self.ev("entry_hp", "honoured", who="-", act=act, hp_pct=round(hf * 100), target=round(target * 100))
                else:
                    causes = self._entry_causes(act, r, target)
                    self.ev("entry_hp", "broken", who=",".join(sorted(set(c["who"] for c in causes))) or "no_opportunity",
                            act=act, hp_pct=round(hf * 100), target=round(target * 100),
                            short_by=round((target - hf) * 100), causes=causes)
            elif plan is None or not plan.get("entryHp"):
                pass  # no commitment in this plan (older plans)
            # 3a must-have at boss entry
            if plan and plan.get("mustHave"):
                deck = r["st"].get("deck") or []
                for role in plan["mustHave"]:
                    n = sum(1 for c in deck if role in card_roles(c))
                    who = "-"
                    if n < 2:
                        missed = [e for e in self.events if e["metric"] == "must_have_reward" and e["outcome"] == "broken"
                                  and e.get("act") == act and role in e.get("roles", [])]
                        who = ",".join(sorted({e["who"] for e in missed})) or "no_opportunity"
                    self.ev("must_have_deck", "honoured" if n >= 2 else "partial" if n == 1 else "broken", who=who,
                            act=act, role=role, count=n)

    def _entry_causes(self, act, boss_row, target):
        causes = []
        for r in self.rows:
            if r["ts"] >= boss_row["ts"]:
                break
            if r["st"].get("act") != act:
                continue
            fl = r["floor"] or 0
            hf = hp_frac(r)
            if hf is None:
                continue
            if r["screen"] == "REST" and r["label"] == "rest/choose" and floors_to_boss(fl) <= 6 and hf < target:
                opts = r["st"].get("rest_opts") or []
                oi = r["chosen"].get("option_index")
                pick = opts[oi] if oi is not None and oi < len(opts) else None
                if pick and pick != "HEAL" and "HEAL" in opts:
                    causes.append({"what": f"rest {pick} at F{fl} ({round(hf*100)}%)", "who": who_of(r, self.arm)})
            if r["screen"] == "MAP" and r["label"] == "map/route":
                avail = r["st"].get("map_avail") or []
                oi = r["chosen"].get("option_index")
                pick = avail[oi] if oi is not None and oi < len(avail) else None
                nxt = fl + 1
                if pick == "Elite" and floors_to_boss(nxt) <= 8 and hf < target + 0.15:
                    w = who_of(r, self.arm)
                    if any(a != "Elite" for a in avail):
                        causes.append({"what": f"elite at F{nxt} ({round(hf*100)}%)", "who": w})
        return causes

    # --- metric 3b + 4a (card rewards, deck additions)
    def m_cards(self):
        rows = self.rows
        for i, r in enumerate(rows):
            plan = self.plan_at(r["ts"])
            if not plan:
                continue
            if r["label"] == "reward/card":
                opts = r["st"].get("card_options") or []
                if not opts:
                    continue
                ch = r["chosen"]
                took = opts[ch["option_index"]] if ch.get("action") == "choose_reward_card" and ch.get("option_index") is not None and ch["option_index"] < len(opts) else None
                who = who_of(r, self.arm)
                deck = r["st"].get("deck") or []
                lacking = [ro for ro in (plan.get("mustHave") or []) if sum(1 for c in deck if ro in card_roles(c)) < 2]
                if lacking:
                    fits = [c for c in opts if card_roles(c) & set(lacking)]
                    if fits:
                        ok = took is not None and bool(card_roles(took) & set(lacking))
                        self.ev("must_have_reward", "honoured" if ok else "broken", who=who, floor=r["floor"], act=r["st"].get("act"),
                                roles=lacking, offered=fits, took=took or "skip")
                avoid = set(plan.get("avoid") or [])
                offered_bad = [c for c in opts if c in avoid]
                if offered_bad and (took is None or took not in avoid):
                    self.ev("avoid_card", "honoured", who=who, floor=r["floor"], card=",".join(offered_bad), took=took or "skip")
            # deck additions of avoided cards (any route)
            if i + 1 < len(rows) and not rows[i + 1]["state_missing"] and not r["state_missing"]:
                before = collections.Counter(r["st"].get("deck") or [])
                after = collections.Counter(rows[i + 1]["st"].get("deck") or [])
                added = after - before
                for c in added:
                    if c in set(plan.get("avoid") or []):
                        self.ev("avoid_card", "broken", who=who_of(r, self.arm), floor=r["floor"], card=c, label=r["label"])

    # --- metric 4b elites
    def m_elites(self):
        for r in self.rows:
            if r["screen"] != "MAP" or r["label"] != "map/route":
                continue
            plan = self.plan_at(r["ts"])
            if not plan:
                continue
            avail = r["st"].get("map_avail") or []
            if "Elite" not in avail:
                continue
            hf = hp_frac(r)
            nxt = (r["floor"] or 0) + 1
            rule = None
            if plan.get("entryHp") and hf is not None and floors_to_boss(nxt) <= 8 and hf < plan["entryHp"] + 0.15:
                rule = "entry_hp"
            elif plan.get("elites") == "avoid":
                rule = "avoid"
            if not rule:
                continue
            oi = r["chosen"].get("option_index")
            pick = avail[oi] if oi is not None and oi < len(avail) else None
            if all(a == "Elite" for a in avail):
                self.ev("avoid_elite", "n/a", who="forced", floor=nxt, rule=rule)
                continue
            if pick is None:
                continue
            self.ev("avoid_elite", "broken" if pick == "Elite" else "honoured", who=who_of(r, self.arm), floor=nxt, rule=rule,
                    hp_pct=round(hf * 100) if hf is not None else None)

    # --- metrics 5, 6, 7 (per fight)
    def m_fights(self):
        by_floor = collections.defaultdict(list)
        for r in self.rows:
            if r["screen"] == "COMBAT":
                by_floor[r["floor"]].append(r)
        for fl, rows in by_floor.items():
            if not any(p.get("floor") == fl for p in self.fplans):
                continue
            first_plan = self.fight_plan_at(fl, rows[0]["ts"])
            last_plan = self.fight_plan_at(fl, rows[-1]["ts"])
            kind = self.fight_kind.get(fl, "-")
            # 5 focus
            turn_votes = collections.defaultdict(lambda: [0, 0, None])
            for r in rows:
                plan = self.fight_plan_at(fl, r["ts"])
                focus = (plan or {}).get("focus")
                ch = r["chosen"]
                if not focus or ch.get("action") != "play_card" or ch.get("target_index") is None:
                    continue
                ens = r["st"].get("enemies") or []
                alive = [e for e in ens if e["alive"]]
                if not any(e["id"] == focus for e in alive) or len(alive) < 2:
                    continue
                tgt = next((e for e in ens if e["i"] == ch["target_index"]), None)
                if tgt is None:
                    continue
                ok = tgt["id"] == focus
                who = self.origin_who(r)
                self.ev("focus_play", "honoured" if ok else "broken", who=who, floor=fl, turn=r["turn"], focus=focus, target=tgt["id"])
                tv = turn_votes[r["turn"]]
                tv[0 if ok else 1] += 1
                tv[2] = tv[2] or who
            for t, (a, b, who) in turn_votes.items():
                self.ev("focus_turn", "honoured" if a > b else "broken", who=who if a <= b else "-", floor=fl, turn=t)
            # 6 potion timing
            drinks = []
            for idx, r in enumerate(rows):
                ch = r["chosen"]
                if ch.get("action") != "use_potion":
                    continue
                slot = ch.get("option_index")
                parts = (r["fp"].get("potions") or "").split("|")
                pid = parts[slot].split(":")[0] if slot is not None and slot < len(parts) else ""
                st = r["st"]
                inc = sum(e["inc"] for e in st.get("enemies") or [] if e["alive"])
                hp = r["fp"].get("hp") or 0
                big = inc - (st.get("block") or 0) >= max(12, 0.25 * hp)
                # did an enemy die / the fight end this turn?
                alive0 = {e["i"] for e in st.get("enemies") or [] if e["alive"]}
                killed = False
                for r2 in rows[idx + 1:]:
                    if r2["turn"] != r["turn"]:
                        break
                    alive2 = {e["i"] for e in r2["st"].get("enemies") or [] if e["alive"]}
                    if alive0 - alive2:
                        killed = True
                        break
                else:
                    killed = killed or idx == len(rows) - 1 or all(r2["turn"] == r["turn"] for r2 in rows[idx + 1:])
                if rows[-1]["turn"] == r["turn"] and not self.died_on(fl):
                    killed = True
                drinks.append({"pid": pid, "turn": r["turn"], "big": big, "killed": killed, "row": r,
                               "hf": hp_frac(r), "who": self.origin_who(r)})
            plan = last_plan or first_plan
            for pid, use0 in ((plan or {}).get("potions") or {}).items():
                use = read_potion_use(use0, pid)
                if use in (None, "any"):
                    continue
                ds = [d for d in drinks if d["pid"] == pid]
                d = ds[0] if ds else None
                # variants the code reads differently from the plan's word: an offensive potion's
                # big_hit is its burst turn; big_hit on a potion code does not see as blunting a hit
                # (BLUNTS_HIT, e.g. Dexterity, Swift) gets the default potion rule, no plan timing
                label = use
                if use == "burst" and use0 == "big_hit":
                    label = "burst(from big_hit)"
                if use == "big_hit" and not BLUNTS_HIT.search(POTION_TEXT.get(pid, "")):
                    label = "big_hit(non-blunting)"
                base = dict(floor=fl, fight=kind, potion=pid, use=label)
                if use == "early":
                    if d is None:
                        self.ev("potion_timing", "broken", who="not_drunk", note="never drunk", **base)
                    elif (d["turn"] or 99) <= 2:
                        self.ev("potion_timing", "honoured", who=d["who"], turn=d["turn"], **base)
                    else:
                        self.ev("potion_timing", "broken", who=d["who"], turn=d["turn"], note="late", **base)
                elif use == "big_hit":  # both big_hit labels
                    if d is None:
                        # a big-hit turn while it was held?
                        seen_big = False
                        for r in rows:
                            st = r["st"]
                            inc = sum(e["inc"] for e in st.get("enemies") or [] if e["alive"])
                            if pid in (r["fp"].get("potions") or "") and inc - (st.get("block") or 0) >= max(12, 0.25 * (r["fp"].get("hp") or 0)):
                                seen_big = True
                                break
                        self.ev("potion_timing", "broken" if seen_big else "honoured", who="not_drunk" if seen_big else "-",
                                note="big hit came, not drunk" if seen_big else "no big hit, kept", **base)
                    else:
                        self.ev("potion_timing", "honoured" if d["big"] else "broken", who=d["who"], turn=d["turn"],
                                note=None if d["big"] else "drunk on a quiet turn", **base)
                elif use == "burst":
                    if d is None:
                        self.ev("potion_timing", "n/a", who="-", note="unused", **base)
                    else:
                        ok = d["killed"] or (d["hf"] is not None and d["hf"] < 0.3)
                        note = None
                        if not ok:
                            note = "drunk off the kill turn"
                            if label == "burst(from big_hit)" and d["big"]:
                                note += " (but on a big-hit turn: the plan's literal word)"
                        self.ev("potion_timing", "honoured" if ok else "broken", who=d["who"], turn=d["turn"],
                                note=note, **base)
                elif use == "save":
                    if d is None:
                        self.ev("potion_timing", "honoured", who="-", **base)
                    else:
                        just = d["hf"] is not None and d["hf"] < 0.4
                        self.ev("potion_timing", "broken", who=d["who"], turn=d["turn"], justified=just, **base)
                elif use == "emergency":
                    if d is None or (d["hf"] is not None and d["hf"] < 0.4):
                        self.ev("potion_timing", "honoured", who=d["who"] if d else "-", **base)
                    else:
                        self.ev("potion_timing", "broken", who=d["who"], turn=d["turn"], hp_pct=round(d["hf"] * 100) if d["hf"] else None, **base)
            # 7 setup
            setup = (first_plan or {}).get("setup") or []
            turn_rows = collections.defaultdict(list)
            for r in rows:
                turn_rows[r["turn"]].append(r)
            for card in setup:
                done = False
                for t in (1, 2):
                    trs = turn_rows.get(t) or []
                    if not trs:
                        continue
                    # in hand and playable at any point of the turn (drawn mid-turn counts too)
                    if not any(any(c == card and p for c, p in (r["st"].get("hand") or [])) for r in trs):
                        continue
                    played = False
                    for r in trs:
                        ch = r["chosen"]
                        if ch.get("action") == "play_card":
                            h = r["st"].get("hand") or []
                            ci = ch.get("card_index")
                            if ci is not None and ci < len(h) and h[ci][0] == card:
                                played = True
                                break
                    # who: the last line chosen that turn while the card was still in hand and playable
                    who = self.origin_who(trs[0])
                    for r in trs:
                        if r["label"] != "combat/plan-continue" and any(c == card and p for c, p in (r["st"].get("hand") or [])):
                            who = who_of(r, self.arm)
                    self.ev("setup", "honoured" if played else "broken", who=who if not played else "-", floor=fl, fight=kind, card=card, turn=t)
                    done = True
                    break
                if not done:
                    self.ev("setup", "n/a", who="not_in_hand", floor=fl, fight=kind, card=card)

    # --- metric 8
    def m_labels(self):
        for r in self.rows:
            if r["screen"] != "COMBAT" or not r.get("criteria"):
                continue
            crit = crit_json(r)
            if not any("fight_plan_fit" in o or "run_plan" in o for o in crit.values()):
                continue
            tags: dict[str, dict[str, bool]] = collections.defaultdict(dict)
            focus_dmg, total_dmg = {}, {}
            for k, o in crit.items():
                fit = str(o.get("fight_plan_fit", ""))
                tags["setup"][k] = "plays planned setup" in fit
                tags["keep"][k] = not ("the plan keeps for" in fit or "run_plan" in o)
                tags["vuln"][k] = "before the planned Vulnerable" not in fit
                m = re.search(r"(\d+) damage to the kill-first enemy", fit)
                focus_dmg[k] = int(m.group(1)) if m else 0
                dd = o.get("damage_dealt", o.get("dmg"))
                total_dmg[k] = dd if isinstance(dd, (int, float)) else None
            # focus: among options that deal damage, consistent = at least half of it goes to the
            # kill-first enemy (a defensive line is neither; AoE counts only its focus share)
            if "fight_plan_fit" in json.dumps(crit) and "kill-first" in json.dumps(crit, ensure_ascii=False):
                tags["focus"] = {k: (focus_dmg[k] >= 0.5 * total_dmg[k]) for k in focus_dmg if total_dmg.get(k)}
            else:
                tags.pop("focus", None)
            # picks
            esc = r.get("esc") or {}
            jev_pick = esc.get("jev_choice") if esc else r.get("jev_choice")
            who = who_of(r, self.arm)
            final: str | None
            rat = r["rationale"]
            if who == "hp_guard":
                m = re.search(r"playing plan (\d+)", rat)
                final = f"plan{m.group(1)}" if m else None
            elif who in ("fallback", "potion_veto"):
                final = "DRY" if "potion-free plan" in rat else "plan1"
            elif who in ("deepseek", "claude"):
                final = esc.get("choice") or r.get("jev_choice")
            else:
                final = r.get("jev_choice")
            for tag, cons in tags.items():
                if len(set(cons.values())) < 2:
                    continue
                jc = cons.get(jev_pick) if jev_pick in cons else None
                if final == "DRY":
                    fc = True if tag == "keep" else None
                else:
                    fc = cons.get(final) if final in cons else None
                # an override only "broke" it when Jev's own pick was consistent; otherwise Jev did
                w = who
                if jc is False and who in ("hp_guard", "fallback", "potion_veto"):
                    w = ("jev(stub)" if self.arm == "ds" else "jev") + ("=rank1" if jev_pick == "plan1" else "")
                self.ev("plan_label", "honoured" if fc else "broken" if fc is False else "n/a", who=w, tag=tag,
                        floor=r["floor"], turn=r["turn"], code_rank1=cons.get("plan1"), jev=jc, final=fc, override=who,
                        jev_pick=jev_pick, final_pick=final)

    def analyse(self):
        self.m_save_potions()
        # roles DeepSeek asked to keep that parse_run_plan dropped (it keeps only the first 2 roles)
        self.m_save_potions("save_potions_dropped", plan_saves_dropped)
        for f in (self.m_cards, self.m_boss_entry, self.m_elites, self.m_fights, self.m_labels):
            f()
        return self


# ----------------------------------------------------------------------------------------- summary

METRICS = [
    ("save_potions", "1 run plan: boss potions kept until the act boss (per potion x act)"),
    ("save_potions_dropped", "1' potions DeepSeek also asked to keep, role dropped by the parser (3rd role)"),
    ("entry_hp", "2 run plan: act-boss entry HP >= target"),
    ("must_have_deck", "3a run plan: must-have role in deck (>=2 cards) at boss entry"),
    ("must_have_reward", "3b run plan: card reward offering a lacking must-have role -> taken"),
    ("avoid_card", "4a run plan: avoided cards not taken (offers skipped vs cards added)"),
    ("avoid_elite", "4b run plan: elites avoided on the map (avoid / entry-HP rule)"),
    ("focus_play", "5 fight plan: targeted plays at the kill-first enemy (per play)"),
    ("focus_turn", "5' fight plan: turns mostly aimed at the kill-first enemy"),
    ("potion_timing", "6 fight plan: potion drunk at the planned moment"),
    ("setup", "7 fight plan: setup card played on the first T1-2 turn it is in hand"),
    ("plan_label", "8 Jev questions with plan labels: plan-consistent line finally played"),
]


def summarize(events: list[dict]) -> dict:
    out = {}
    for key, _ in METRICS:
        es = [e for e in events if e["metric"] == key]
        c = collections.Counter(e["outcome"] for e in es)
        by = collections.Counter(e["who"] for e in es if e["outcome"] in ("broken", "partial"))
        scored = c["honoured"] + c["broken"] + c["partial"]
        row = {"n": scored, "honoured": c["honoured"], "broken": c["broken"], "partial": c["partial"], "na": c["n/a"],
               "broken_by": dict(by.most_common())}
        if key in ("save_potions", "save_potions_dropped"):
            br = [e for e in es if e["outcome"] == "broken"]
            row["broken_justified"] = sum(1 for e in br if e.get("justified"))
            row["broken_in_window"] = sum(1 for e in br if e.get("in_window"))
            row["broken_where"] = dict(collections.Counter(e.get("fight") for e in br))
            row["broken_fight_plan_use"] = dict(collections.Counter(e.get("fight_plan_use") for e in br))
        if key == "entry_hp":
            br = [e for e in es if e["outcome"] == "broken"]
            row["mean_short_by_pp"] = round(sum(e["short_by"] for e in br) / len(br), 1) if br else None
        if key == "plan_label":
            row["by_tag"] = {}
            for tag in ("setup", "keep", "focus", "vuln"):
                ts = [e for e in es if e["tag"] == tag]
                if not ts:
                    continue
                rk = [e for e in ts if e["code_rank1"] is not None]
                jv = [e for e in ts if e["jev"] is not None and e["who"] not in ("deepseek", "claude")]
                fn = [e for e in ts if e["final"] is not None]
                flips = collections.Counter()
                for e in ts:
                    if e["jev"] is True and e["final"] is False:
                        flips[f"{e.get('override', e['who'])} made it inconsistent"] += 1
                    if e["jev"] is False and e["final"] is True:
                        flips[f"{e.get('override', e['who'])} made it consistent"] += 1
                row["by_tag"][tag] = {
                    "n": len(ts),
                    "code_rank1_consistent": pct(sum(1 for e in rk if e["code_rank1"]), len(rk)),
                    "jev_pick_consistent": pct(sum(1 for e in jv if e["jev"]), len(jv)),
                    "final_consistent": pct(sum(1 for e in fn if e["final"]), len(fn)),
                    "overrides": dict(flips),
                }
        if key == "potion_timing":
            row["by_use"] = {}
            for use in ("early", "big_hit", "big_hit(non-blunting)", "burst", "burst(from big_hit)", "save", "emergency"):
                us = [e for e in es if e.get("use") == use]
                if us:
                    cu = collections.Counter(e["outcome"] for e in us)
                    row["by_use"][use] = {"honoured": cu["honoured"], "broken": cu["broken"], "na": cu["n/a"],
                                          "notes": dict(collections.Counter(e.get("note") for e in us if e["outcome"] == "broken" and e.get("note")))}
        out[key] = row
    return out


def fmt_table(title: str, summ: dict) -> list[str]:
    lines = [f"### {title}", "", "| metric | n | honoured | broken | n/a | broken by |", "|---|---:|---:|---:|---:|---|"]
    for key, desc in METRICS:
        s = summ[key]
        n = s["n"]
        hon = f"{s['honoured']} ({pct(s['honoured'], n)})"
        brk = f"{s['broken'] + s['partial']} ({pct(s['broken'] + s['partial'], n)})" + (f" [{s['partial']} partial]" if s["partial"] else "")
        by = ", ".join(f"{k} {v}" for k, v in s["broken_by"].items()) or "-"
        extra = []
        if key in ("save_potions", "save_potions_dropped") and s["broken"]:
            extra.append(f"justified {s['broken_justified']}/{s['broken']}, inside 10-floor window {s['broken_in_window']}/{s['broken']}")
            fu = s.get("broken_fight_plan_use") or {}
            extra.append("that fight's plan said: " + ", ".join(f"{k} {v}" for k, v in sorted(fu.items(), key=lambda x: -x[1])))
        if key == "entry_hp" and s.get("mean_short_by_pp") is not None:
            extra.append(f"missed by {s['mean_short_by_pp']}pp on average")
        if extra:
            by += " (" + "; ".join(extra) + ")"
        lines.append(f"| {desc} | {n} | {hon} | {brk} | {s['na']} | {by} |")
    pl = summ["plan_label"].get("by_tag") or {}
    if pl:
        lines += ["", "Plan labels on Jev questions (metric 8), per label type:", "",
                  "| label | n | code rank-1 consistent | Jev pick consistent | finally played consistent | overrides that flipped it |",
                  "|---|---:|---:|---:|---:|---|"]
        for tag, t in pl.items():
            ov = ", ".join(f"{k} {v}" for k, v in t["overrides"].items()) or "-"
            lines.append(f"| {tag} | {t['n']} | {t['code_rank1_consistent']} | {t['jev_pick_consistent']} | {t['final_consistent']} | {ov} |")
    bu = summ["potion_timing"].get("by_use") or {}
    if bu:
        lines += ["", "Fight-plan potion timing (metric 6), per planned use:", "", "| use | honoured | broken | n/a | broken because |", "|---|---:|---:|---:|---|"]
        for use, u in bu.items():
            lines.append(f"| {use} | {u['honoured']} | {u['broken']} | {u['na']} | {', '.join(f'{k} {v}' for k, v in u['notes'].items()) or '-'} |")
    return lines


def run_row(a: RunAnalysis) -> dict:
    s = summarize(a.events)

    def hb(k):
        x = s[k]
        return f"{x['honoured']}/{x['n']}" if x["n"] else "-"
    ent = [e for e in a.events if e["metric"] == "entry_hp"]
    return {
        "run": a.rid, "start": a.rows[0]["ts"][:16] if a.rows else "", "arm": a.arm, "period": a.period,
        "code": (a.meta or {}).get("code", "?"), "floor": (a.meta or {}).get("floor", "?"),
        "win": (a.meta or {}).get("victory") if a.meta else "unfinished",
        "save_pot": hb("save_potions"), "entry_hp": " ".join(f"A{e['act']}:{e['hp_pct']}/{e['target']}" for e in ent) or "-",
        "must_deck": hb("must_have_deck"), "must_rew": hb("must_have_reward"), "avoid_card": hb("avoid_card"),
        "avoid_elite": hb("avoid_elite"), "focus": hb("focus_play"), "pot_time": hb("potion_timing"),
        "setup": hb("setup"), "labels": hb("plan_label"),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--runs", action="store_true", help="per-run table")
    ap.add_argument("--json", action="store_true", help="machine output (summaries, per-run rows, events)")
    ap.add_argument("--md", metavar="PATH", help="write the Markdown report here")
    ap.add_argument("--events", metavar="RUNID", help="print every scored event of one run")
    args = ap.parse_args()

    monsters, potion_text, _cards = load_game_data()
    POTION_TEXT.update(potion_text)
    runs, run_plans, fight_plans = load_runs()
    target = set(run_plans) | set(fight_plans)
    target = {r for r in target if (runs.get(r) or {}).get("arm") not in ("code", "jev")}
    timelines = load_timelines(target, monsters)

    analyses = []
    for rid in sorted(target, key=lambda r: (timelines.get(r) or [{"ts": ""}])[0]["ts"]):
        rows = timelines.get(rid) or []
        if not rows:
            continue
        meta = runs.get(rid)
        arm = (meta or {}).get("arm") or "normal"
        period = "post-892278c" if rows[0]["ts"] >= CUTOFF else "pre-892278c"
        rp = sorted(run_plans.get(rid, []), key=lambda p: p["ts"])
        for p in rp:
            p["plan"]["_raw_save"] = (p.get("raw") or {}).get("save_potions") or []
        fp = sorted(fight_plans.get(rid, []), key=lambda p: p["ts"])
        analyses.append(RunAnalysis(rid, meta, rp, fp, rows, arm, period).analyse())

    done = [a for a in analyses if a.meta is not None]
    groups = {"ALL finished runs": done}
    for per in ("pre-892278c", "post-892278c"):
        groups[f"period {per}"] = [a for a in done if a.period == per]
    for arm in ("normal", "full", "ds"):
        groups[f"arm {arm}"] = [a for a in done if a.arm == arm]
    groups["runs with commitment fields (entryHp/savePotions/mustHave)"] = [
        a for a in done if any(p["plan"].get("savePotions") or p["plan"].get("entryHp") for p in a.rplans)]
    summaries = {g: summarize([e for a in rs for e in a.events]) | {"_runs": len(rs)} for g, rs in groups.items()}
    rows = [run_row(a) for a in analyses]

    if args.events:
        for a in analyses:
            if a.rid == args.events:
                for e in a.events:
                    print(json.dumps(e, ensure_ascii=False, default=str))
        return
    if args.json:
        json.dump({"summaries": summaries, "runs": rows,
                   "events": [e for a in analyses for e in a.events]}, sys.stdout, ensure_ascii=False, indent=1, default=str)
        print()
        return

    out = []
    out.append(f"Plan adherence: {len(done)} finished runs with DeepSeek plans (+{len(analyses) - len(done)} unfinished, not aggregated).")
    out.append("honoured / broken per commitment; 'broken by' = who made the choice that broke it (see --help / docstring).")
    for g, rs in groups.items():
        if not rs:
            continue
        out.append("")
        out += fmt_table(f"{g} ({len(rs)} runs)", summaries[g])
    if args.runs or args.md:
        run_lines = ["", "### Per run (honoured/scored)", "",
                     "| run | start (UTC) | arm | period | code | floor | win | save_pot | entry HP% A:hp/target | must deck | must reward | avoid card | avoid elite | focus plays | potion timing | setup | labels |",
                     "|---|---|---|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|"]
        for r in rows:
            run_lines.append("| " + " | ".join(str(r[k]) for k in ("run", "start", "arm", "period", "code", "floor", "win", "save_pot", "entry_hp",
                                                                   "must_deck", "must_rew", "avoid_card", "avoid_elite", "focus", "pot_time", "setup", "labels")) + " |")
    else:
        run_lines = []
    text = "\n".join(out + (run_lines if args.runs else []))
    print(text)

    if args.md:
        spot = ["", "## Spot-check evidence (events the script scored for the named runs)", ""]
        for a in analyses:
            if a.rid in SPOT_RUNS:
                spot.append(f"**{a.rid}**")
                spot.append("")
                for e in a.events:
                    if e["outcome"] in ("broken", "partial") and e["metric"] in ("save_potions", "avoid_card", "potion_timing", "plan_label", "entry_hp"):
                        spot.append("- " + json.dumps({k: v for k, v in e.items() if k != "run"}, ensure_ascii=False, default=str))
                spot.append("")
        md = [MD_HEAD] + headlines(summaries) + out + run_lines + [SPOT_CHECKS] + spot + [MD_TAIL]
        os.makedirs(os.path.dirname(os.path.abspath(args.md)), exist_ok=True)
        with open(args.md, "w", encoding="utf8") as fh:
            fh.write("\n".join(md) + "\n")
        print(f"\nwrote {args.md}", file=sys.stderr)


def headlines(summaries: dict) -> list[str]:
    """Plain-language headline bullets, numbers filled from the summaries."""
    a = summaries["ALL finished runs"]
    c = summaries.get("runs with commitment fields (entryHp/savePotions/mustHave)") or a

    def hb(x, k):
        r = x[k]
        return f"{r['honoured']}/{r['n']} ({pct(r['honoured'], r['n'])})"

    def by(x, k):
        return ", ".join(f"{w} {v}" for w, v in x[k]["broken_by"].items()) or "-"
    sp = c["save_potions"]
    fu = sp.get("broken_fight_plan_use") or {}
    conflict = fu.get("early", 0) + fu.get("big_hit", 0)
    pl = a["plan_label"].get("by_tag", {})
    st = pl.get("setup", {})
    kp = pl.get("keep", {})
    pt = a["potion_timing"]["by_use"]
    lines = ["## Headlines", "",
             f"- **Boss potions (run plan save_potions)**: kept until the act boss {hb(c, 'save_potions')}. "
             f"Broken by: {by(c, 'save_potions')}; only {sp.get('broken_justified', 0)}/{sp['broken']} at low HP / dying lines, "
             f"{sp.get('broken_in_window', 0)}/{sp['broken']} inside code's 10-floor keep window. In {conflict}/{sp['broken']} the "
             "fight plan of that same fight told code/Jev to drink it (early or big_hit): the two DeepSeek plans contradict each other.",
             f"- **Parser loss**: DeepSeek often lists 3 save_potions roles; parseRunPlan keeps 2. Potions of the dropped role: "
             f"{hb(c, 'save_potions_dropped')} kept anyway.",
             f"- **Entry HP**: met {hb(c, 'entry_hp')}; misses average {c['entry_hp'].get('mean_short_by_pp')}pp. Broken by: {by(c, 'entry_hp')} "
             "(no_opportunity = no smithing below target and no optional elite near the boss: the HP went in fights).",
             f"- **Must-have roles**: deck had >= 2 cards of the role at the boss {hb(c, 'must_have_deck')}; a card reward offering a lacking "
             f"role was taken {hb(c, 'must_have_reward')} (misses: {by(c, 'must_have_reward')}).",
             f"- **Avoid**: avoided cards stayed out {hb(a, 'avoid_card')} (added anyway: {by(a, 'avoid_card')}); "
             f"elites avoided {hb(a, 'avoid_elite')} (taken by: {by(a, 'avoid_elite')}).",
             f"- **Kill-first enemy**: {hb(a, 'focus_play')} of targeted plays hit it (misses: {by(a, 'focus_play')}).",
             f"- **Fight-plan potions**: early {pt.get('early', {}).get('honoured', 0)}/{sum(pt.get('early', {}).get(k, 0) for k in ('honoured', 'broken'))}, "
             f"save {pt.get('save', {}).get('honoured', 0)}/{sum(pt.get('save', {}).get(k, 0) for k in ('honoured', 'broken'))}, "
             f"emergency {pt.get('emergency', {}).get('honoured', 0)}/{sum(pt.get('emergency', {}).get(k, 0) for k in ('honoured', 'broken'))} honoured; "
             f"big_hit {pt.get('big_hit', {}).get('honoured', 0)}/{sum(pt.get('big_hit', {}).get(k, 0) for k in ('honoured', 'broken'))} and "
             f"burst(from big_hit) {pt.get('burst(from big_hit)', {}).get('honoured', 0)}/{sum(pt.get('burst(from big_hit)', {}).get(k, 0) for k in ('honoured', 'broken'))} "
             "are the weak spots (mostly offensive potions drunk on T1-2, the case code later re-read as burst).",
             f"- **Setup cards**: played on the first T1-2 turn in hand {hb(a, 'setup')} (misses: {by(a, 'setup')}).",
             f"- **Plan labels on Jev's options**: setup-labelled line: code rank 1 {st.get('code_rank1_consistent')}, Jev's pick {st.get('jev_pick_consistent')}, "
             f"finally played {st.get('final_consistent')} (the HP guard is what undoes Jev's setup picks); potion-keep labels: Jev {kp.get('jev_pick_consistent')}, "
             f"finally {kp.get('final_consistent')} (the potion veto repairs some).",
             ""]
    return lines


SPOT_CHECKS = """## Spot checks against the raw logs (by hand, 2026-09-27)

- **EJXCAQ56PWLK F28 (elite, Entomancer) T1 -- Flex and Speed drunk.** decisions.jsonl: 10:06:42Z Jev chose plan 2/4
  "potion Speed, Taunt, potion Flex, Pommel, Bash+, Bully, Boomerang" at 0.56 (code rank 2) -> Speed drunk; the re-plan
  was a potion veto (0.40, dry line), then Jev chose plan 2/4 "Inflame, potion Flex, Bully, Boomerang" at 0.51 (code
  rank 2) -> Flex drunk at 79/85 HP. Run plan (act 2, F17/F25): savePotions [damage, strength] (raw
  [damage, strength, block]); the F28 fight plan said FLEX early, SPEED big_hit. Script: save_potions broken, who=jev,
  FLEX F28 T1 (fight_plan_use=early) and save_potions_dropped broken, who=jev, SPEED F28 T1. **Matches.** (Bash, a
  planned setup card, was in the first two lines but never played on T1: setup broken, who=jev -- also matches.)
- **WR2Y98A43YCY F33 boss (Kaiser Crab) T1 -- Flex on T1.** Fight plan FLEX_POTION: big_hit (read by code as burst).
  Jev chose plan 1/4 "Dominate, potion Flex, Molten Fist" at 0.69, code rank 1; the Flex step ran as plan-continue; no
  claw died that turn (219/209 -> 192/209). Script: potion_timing broken, use burst(from big_hit), who=jev=rank1, turn 1.
  **Matches**, and adds that code's own rank 1 was the same line.
- **GZ24W7LC496Q F4 card reward -- Thunderclap taken though avoided.** Run plan (F1) avoid includes THUNDERCLAP; card
  reward offered Thunderclap (code_value 71, "run plan: avoid"), Bludgeon 98, Twin Strike 96; Jev chose card0
  (Thunderclap) at 0.56. Script: avoid_card broken, who=jev, THUNDERCLAP F4 (label reward/card). **Matches.** (The same
  plan also listed aoe as must_have, so the offer was honoured under metric 3b: the plan contradicted itself.)
- Also checked: WR2Y F13 T1 Weak + Dexterity potions (kept for the boss) drunk on the elite's T1 inside HP-guard swaps
  (08:06:39Z and 08:06:42Z: "HP guard: plan 1 ... loses 8 HP ... playing plan 2 (... potion Weak ..., potion Dexterity
  ...)") -> script who=hp_guard. Note Jev's pick was code rank 1 and drank both too: the guard only swapped to a cheaper
  line that still drank them (the guard filters fight-plan-kept potions, not run-plan boss potions). GZ24 F8 Dexterity
  Potion on the elite's T1 by code rank 1 (combat/plan) -> who=code. Both match the rationale text.
"""


MD_HEAD = """# Plan adherence: are DeepSeek's run plans and fight plans carried out?

Generated by `python3 ops/plan_adherence.py --runs --md notes/plan-adherence.md` (definitions: the
script's docstring; `--json` for raw events, `--events RUNID` for one run).
"""

MD_TAIL = """
## Limitations

- Plan classifiers (potion roles, card roles, offensive potions) are today's code, applied to every run;
  older runs were played with code that may have classified a potion differently (e.g. Dexterity/Speed
  Potion = "block" by id only since 817ede7). The numbers measure the plan's intent, not the code's intent at the time.
- Commitment fields (entryHp, savePotions, mustHave) exist only from NMLV5SYCFL8X (A8 ablation) on:
  metrics 1, 2, 3 have ~20 runs; earlier run plans only have want/avoid/elites/rest.
- Metric 8 only sees Jev questions; code-decided turns (most turns) never show the labels, so the
  setup metric (7) is the one that covers them.
- "justified" potion drinks: HP < 40%, least-loss/lethal line, costly turn (visible only on Jev
  questions), or the fight the run died in. A heuristic, not a counterfactual.
- Burst / big-hit detection comes from the logged state (intents, block, enemies alive after the
  turn's steps), approximate for multi-phase enemies and minions.
- approach (race/setup/defend) and key_turns are free text: n/a.
"""


if __name__ == "__main__":
    main()
