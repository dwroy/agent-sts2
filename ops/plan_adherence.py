#!/usr/bin/env python3
"""
Plan adherence: are DeepSeek's run plans and fight plans actually carried out by code and Jev?

Usage
    python3 ops/plan_adherence.py            # summary tables (overall, by period, by arm)
    python3 ops/plan_adherence.py --runs     # + one row per run
    python3 ops/plan_adherence.py --json     # machine-readable output (everything)
    python3 ops/plan_adherence.py --md notes/plan-adherence.md   # also write the Markdown report
    python3 ops/plan_adherence.py --events RUNID   # every scored event of one run (for spot checks)
    python3 ops/plan_adherence.py --logs DIR       # read another log directory (synthetic checks)

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
    Period (era): "pre-892278c" = run started before 2026-09-27 16:48:01 +0800 (08:48:01Z, merge 892278c);
    "892278c..0f2e648" = on/after, before the intent merge; "intent (from 0f2e648)" = see Eras below.  Arm: runs.jsonl "arm" (full/ds for the A8 ablation); runs without one
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

Eras (runs.jsonl start = first decision of the run)
    pre-892278c         before 2026-09-27 08:48:01Z
    892278c..0f2e648    from 892278c, before the intent merge
    intent (from 0f2e648)   the run has a new-format plan (run plan with `version`/`hpPolicy`, fight plan with
                        `objective`) or started at/after 2026-09-27 11:57:05Z (0f2e648, 19:57:05 +0800)
    redesign (from 2ba29ef)  the first run whose decisions carry ds_guidance / matched_reference /
                        differs_from_reference / differs_from_tempo (phase2 2ba29ef, 2026-09-28: DeepSeek guides,
                        code gives facts and a reference rank, Jev decides), and every run started after it
    "period" in the per-run table is this era.

Intent-era metrics (plans in the new closed vocabulary: jev-sts2/src/strategy/intent.ts, plan-validator.ts).
Older runs show "n/a" for all of these.  For new-format plans the old metrics still run where a field maps:
needs -> must_have (3), route_risk avoid_elites -> elites avoid (4b), kill_priority (first living) -> focus
(5); save_potions (1) is replaced by I5 (the reserve rule changed), potion timing / setup / labels (6-8) have
no new-format source and stay empty.
 I1 validator repairs   every `validator` string of a run plan / fight plan log entry that is not a
   rejected change, classified by type (e.g. fight "scale_then_kill→preserve_hp (low HP)", "reserved potion
   timing ignored", "unknown enemy dropped"; run "push→balanced (low HP)", "unknown card/role dropped").
 I2 re-plans            run-plan versions per run (checkpoint trigger start/act/hp_drop/review; failed requests
   counted apart), accepted changes (entry `changes`: field old→new, trigger, fact; fight plans log an
   objective change on a re-plan with trigger new_enemy), rejected changes (validator "rejected change ...",
   by reason: no_trigger, invalid_trigger, unsupported (the facts do not show it), wrong_direction, flip_flop).
 I3 execution after an accepted run-plan change, on the floors while the new value is in force in that act
   (plan_at(ts) still holds it):
     hp_policy→preserve     rest below the HP target (entry_hp_pct or 80%) heals; no elite while another node
                            was open
     hp_policy→push         rest at >= 55% HP more than 2 floors from the boss smiths (soft: +3 only)
     route_risk→avoid_elites  no elite while another node was open (hard filter in code)
     route_risk→seek_elites   elite taken when one was open and HP > 60% (soft: +2 only)
     entry_hp_pct raised    rest <= 6 floors from the boss below the target heals; no elite <= 8 floors from
                            the boss below target+15pp while another node was open
     reserve added roles    potions of the added roles flagged after the change: kept to the boss (from I5)
     needs added roles      a card reward offering a card of the added role the deck lacks (< 2): one taken
     avoid added            a card reward offering an added avoided card id / role card: not taken
   Other changes (balanced, normal, lowered entry HP, removals) have nothing to check: n/a.
 I4 picks differing from tempo   decisions carrying `differs_from_tempo` (2026-09-28 on) or the legacy
   `intent_deviation` / `tempo_deviation` (Jev picked an option whose tempo note says "differs from …", formerly
   "departs from …" / "breaks …"), by guidance item (the text after that phrase up to ":"), per run; plus the share
   of Jev decisions (decider jev) whose question carried a tempo note (`intent_fit` / `tempo`) on some option.
   A fact, not a verdict: whether such picks did well is section O.

 O  outcomes of differing picks (all eras; finished runs; Jev picks only).  differs = Jev's pick is not code's
   reference rank 1: `differs_from_reference` / `matched_reference` / `reference_rank` in new logs; in old logs
   the code rank in the rationale ("code rank N" / "code reference rank N"), a drink-first potion option (never
   the reference), or the option with the highest route_value (map) / code_value (reward) / code_rank 1.
   Rest, shop and event picks in old logs have no recoverable reference: "unknown".
     combat (combat/plan-choice[+potion]): HP lost to the next turn's first decision and to the first decision
       after the fight (0 HP when the run died there), fight won, per fight kind (hallway/elite/boss) and Jev
       confidence (<0.3, 0.3-0.5, 0.5-0.7, >=0.7); realised vs the solver's predicted hp_lost / damage_dealt for
       Jev's line and for the reference line (the option labelled "same as reference" / "code's reference line";
       before that label existed plan N was code rank N).
     non-combat (map, rest, shop, reward, event): HP% at the next act-boss entry, whether the boss was reached
       and passed, floors survived afterwards.  Every pick in a run-act shares one outcome.
     boss low confidence: Jev boss plan choices at confidence < 0.5, counted and listed for manual review.
   Correlations with confounders (Jev differs more in hard spots), not causal estimates.
 I5 reserve (new rule)  like metric 1 with plan.reserve: a potion of a reserved role held while a plan of the
   same act reserves it; kept = in the belt when the act-boss fight starts (drunk inside it is fine); broken =
   drunk/discarded before.  Exceptions (code releases the reserve): HP < 25% at the drink, a least-loss line
   (every line dies), or the option was tagged "released".  A drink outside the exceptions is flagged BUG
   (the reserve is a hard filter in code: it should never happen).  Discards are listed apart (not filtered by
   code).  A potion whose role a later plan stops reserving is closed n/a ("reserve change released it").

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
SRC = os.path.join(ROOT, "jev-sts2-v3", "src")  # the code that plays (branch v3)
GAME_DATA = os.path.join(ROOT, "jev-sts2", ".cache", "game-data.json")
CUTOFF = "2026-09-27T08:48:01Z"  # 892278c, 16:48:01 +0800
INTENT_CUTOFF = "2026-09-27T11:57:05Z"  # 0f2e648, 19:57:05 +0800 (strategy-intent merge)
ERA_PRE, ERA_MID, ERA_INTENT = "pre-892278c", "892278c..0f2e648", "intent (from 0f2e648)"
# Redesign merge (phase2 2ba29ef, 2026-09-28: DeepSeek guides, code gives facts and a reference rank, Jev
# decides). Detected per run: the first run whose decisions carry ds_guidance / matched_reference /
# differs_from_reference / differs_from_tempo, and every run started after it.
ERA_REDESIGN = "redesign (from 2ba29ef)"
ERAS = (ERA_PRE, ERA_MID, ERA_INTENT, ERA_REDESIGN)
REDESIGN_KEYS = ("ds_guidance", "matched_reference", "differs_from_reference", "differs_from_tempo")
CONF_BUCKETS = ((0.0, 0.3, "<0.3"), (0.3, 0.5, "0.3-0.5"), (0.5, 0.7, "0.5-0.7"), (0.7, 1.01, ">=0.7"))
NONCOMBAT_PREFIX = ("map/", "rest/", "shop/", "reward/", "event/")
RESERVE_RELEASE_HP = 0.25  # intent.ts RESERVE_RELEASE_HP
HP_TARGET = {"preserve": 0.8, "balanced": 0.7, "push": 0.6}  # intent.ts HP_TARGET
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
    if card_id in s.get("STRENGTH_CARDS", s.get("STRENGTH", ())):
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


# ------------------------------------------------------------------------- intent era (0f2e648 on)


def is_new_run_entry(entry: dict) -> bool:
    """A run-plan log entry in the intent vocabulary (run-plan.ts after 0f2e648)."""
    return "version" in entry or "hpPolicy" in (entry.get("plan") or {})


def is_new_fight_entry(entry: dict) -> bool:
    return "objective" in (entry.get("plan") or {}) or "validator" in entry


def plan_reserves(plan: dict | None, potion_id: str, text: str) -> bool:
    """isReserved() in intent.ts, on a new-format plan's reserve roles."""
    roles = (plan or {}).get("reserve") or []
    if not roles:
        return False
    # Petrified Toad makes a new Potion-Shaped Rock every combat; code never reserves it (99X7).
    if potion_id == "POTION_SHAPED_ROCK":
        return False
    if "any" in roles:
        return True
    r = potion_role(potion_id, text)
    return r is not None and r in roles


def plan_field(plan: dict | None, field: str):
    """getField() in plan-validator.ts on a logged plan (lists sorted)."""
    p = plan or {}
    if field == "hp_policy":
        return p.get("hpPolicy")
    if field == "route_risk":
        return p.get("routeRisk")
    if field == "entry_hp_pct":
        return p.get("entryHp")
    if field == "reserve":
        return sorted(p.get("reserve") or [])
    if field == "needs":
        return sorted(p.get("needs") or [])
    if field == "avoid":
        return sorted((p.get("avoid") or []) + (p.get("avoidRoles") or []))
    return None


def same_value(field: str, a, b) -> bool:
    if field == "entry_hp_pct":
        return a == b or (isinstance(a, (int, float)) and isinstance(b, (int, float)) and abs(a - b) < 0.03)
    if isinstance(a, list) and isinstance(b, list):
        return sorted(map(str, a)) == sorted(map(str, b))
    return a == b


REPAIR_TYPES = [
    # fight plans (validateFightPlan / parseFightPlan)
    (r"^objective scale_then_kill at \d+% HP", "scale_then_kill→preserve_hp (low HP)"),
    (r"^objective scale_then_kill with \d+ incoming", "scale_then_kill→preserve_hp (big hit)"),
    (r"^objective (kill_fast|race) under run hp_policy preserve", "kill_fast/race→preserve_hp (hp_policy preserve)"),
    (r"^kill_priority: .* not in this fight", "unknown enemy dropped"),
    (r"^kill_priority: .* must die together", "together-enemy dropped from kill_priority"),
    (r"^potion \S+ .* ignored: the run plan reserves it", "reserved potion timing ignored"),
    (r"^potion timing ", "potion timing ignored"),
    (r"^(setup_cards|cards|key_turns|turns) ignored", "card/turn order ignored"),
    (r"^objective .* unknown", "unknown objective"),
    (r"^old-format approach", "old-format approach read"),
    (r"^no objective", "no objective"),
    # run plans (parseRunPlan / repairRunPlan)
    (r"^hp_policy push at \d+% HP", "push→balanced (low HP)"),
    (r"^hp_policy push \d+ floors from the boss", "push→balanced (near boss below entry)"),
    (r"^route_risk seek_elites contradicts", "seek_elites→normal (hp_policy preserve)"),
    (r"^route_risk seek_elites at \d+% HP", "seek_elites→normal (low HP)"),
    (r"^avoid roles .* also needed", "avoid role also needed: dropped"),
    (r"^cards .* both wanted and avoided", "card wanted and avoided: dropped"),
    (r"^reserve lists 'any'", "reserve any+roles→any"),
    (r"^entry_hp_pct: .* not a fraction", "entry_hp_pct not a fraction"),
    (r"^(\w+): dropped unknown", "unknown {0} dropped"),
    (r"^(\w+): unknown value", "unknown {0} value ignored"),
]


def classify_repair(text: str) -> str:
    for pat, name in REPAIR_TYPES:
        m = re.search(pat, text)
        if m:
            return name.format(*m.groups()) if "{0}" in name else name
    return "other"


def classify_rejection(text: str) -> tuple[str, str]:
    """(field, reason) of a validator "rejected change FIELD ...: WHY; kept ..." note."""
    m = re.match(r"rejected change (\w+) ", text)
    field = m.group(1) if m else "?"
    if "no trigger given" in text:
        why = "no_trigger"
    elif "is not one of" in text:
        why = "invalid_trigger"
    elif "not supported by the facts" in text:
        why = "unsupported"
    elif "points the other way" in text:
        why = "wrong_direction"
    elif re.search(r"reverses the F\d+ change", text):
        why = "flip_flop"
    else:
        why = "other"
    return field, why


def deviation_intents(label: str) -> list[str]:
    """The guidance items a tempo note says the pick differs from. Reads every wording the logs used:
    'differs from DeepSeek's race: …' (2026-09-28 on), 'departs from …' and 'breaks …' (older)."""
    out = [re.sub(r"^DeepSeek's ", "", m.group(1).strip())
           for m in re.finditer(r"(?:breaks|departs from|differs from) ([^:;]+)", label or "")]
    if not out and label:
        # 2026-09-27 wording: "costs 27 damage vs the best line for kill_fast (saves 6 HP)"
        m = re.search(r"vs the best line for ([a-z_]+)", label)
        out = [m.group(1)] if m else ["drinks a potion held for the act boss"] if "holds for the act boss" in label else [label.split(":")[0][:60]]
    return out or ["?"]


# ----------------------------------------------------------------------------------------- loading


def load_runs():
    runs = {}
    for d in jl(os.path.join(LOGS, "runs.jsonl")):
        runs[d["run_id"]] = d
    run_plans = collections.defaultdict(list)
    errors = collections.defaultdict(lambda: {"run": 0, "fight": 0})
    for d in jl(os.path.join(LOGS, "run-plans.jsonl")):
        if d.get("plan"):
            run_plans[d["run"]].append(d)
        elif d.get("error") and d.get("run"):
            errors[d["run"]]["run"] += 1
    fight_plans = collections.defaultdict(list)
    for d in jl(os.path.join(LOGS, "fight-plans.jsonl")):
        if d.get("plan"):
            fight_plans[d["run"]].append(d)
        elif d.get("error") and d.get("run"):
            errors[d["run"]]["fight"] += 1
    return runs, run_plans, fight_plans, errors


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
        has_fit = any(("intent_fit" in str(v) or '"tempo"' in str(v)) for q in qs.values() if isinstance(q, dict)
                      for v in (q.get("criteria") or {}).values())
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
            # a pick that differs from DeepSeek's tempo: new neutral field first, legacy names after
            "deviation": ({"intent": d["differs_from_tempo"], **(d.get("tempo_context") or {})} if d.get("differs_from_tempo")
                          else d.get("intent_deviation") or ({"intent": d["tempo_deviation"]} if d.get("tempo_deviation") else None)),
            "has_fit": has_fit,
            "ref": {k: d[k] for k in ("differs_from_reference", "matched_reference", "reference_rank", "reference_of") if k in d},
            "redesign": any(k in d for k in REDESIGN_KEYS),
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
        return base + "=rank1" if re.search(r"code (?:reference )?rank 1\b", rat) else base
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
    def __init__(self, rid, meta, rplans, fplans, rows, arm, period, errors=None):
        self.rid, self.meta, self.rplans, self.fplans, self.rows = rid, meta, rplans, fplans, rows
        self.arm, self.period = arm, period
        self.errors = errors or {"run": 0, "fight": 0}
        self.new = any(is_new_run_entry(p) for p in rplans) or any(is_new_fight_entry(p) for p in fplans)
        self.jev_decisions = 0
        self.jev_with_fit = 0
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
    def m_save_potions(self, metric="save_potions", saves=None, roles_key="savePotions"):
        saves = saves or plan_saves
        self._metric = metric
        reserve = metric == "reserve"
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
                if reserve and it["flag_act"] == act and plan and plan.get("act") == act and not saves(plan, it["id"], it["text"]):
                    # a later plan of this act stopped reserving its role: released by a change
                    self.ev(metric, "n/a", who="n/a", potion=it["id"], act=act, floor=r["floor"],
                            role=potion_role(it["id"], it["text"]), flagged_floor=it["flag_floor"],
                            note="reserve change released it")
                    it["flag_act"] = None
                    continue
                if plan and plan.get("act") == act and saves(plan, it["id"], it["text"]) and it["flag_act"] is None \
                        and not (reserve and it.get("closed_act") == act):
                    it["flag_act"], it["flag_floor"], it["roles"] = act, r["floor"], plan.get(roles_key)
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
                boss_floor=b["floor"] if b else None, role=potion_role(it["id"], it["text"]))
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
        if self._metric == "reserve":
            opt = crit_json(o).get(o.get("jev_choice") or "") or {}
            exception = None
            if how == "drunk":
                if hf is not None and hf < RESERVE_RELEASE_HP:
                    exception = f"HP < {int(RESERVE_RELEASE_HP * 100)}%"
                elif o["label"] == "combat/least-loss":
                    exception = "every line dies (least-loss)"
                elif "released" in str(opt.get("reserve", "")):
                    exception = "option tagged released"
            self.ev("reserve", "broken", who=who, potion=it["id"], role=potion_role(it["id"], it["text"]), act=act,
                    floor=floor, turn=last_row["turn"], how=how,
                    fight=self.fight_kind.get(floor, "-") if last_row["screen"] == "COMBAT" else last_row["screen"],
                    hp_pct=round(hf * 100) if hf is not None else None, exception=exception,
                    bug=how == "drunk" and exception is None, label=o["label"], flagged_floor=it["flag_floor"])
            it["flag_act"] = None
            return
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
                if not focus and (plan or {}).get("killPriority"):
                    # new format: the first living kill-priority enemy is the solver's focus
                    living = {e["id"] for e in r["st"].get("enemies") or [] if e["alive"]}
                    focus = next((x for x in plan["killPriority"] if x in living), None)
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

    # --- intent era: I1 repairs, I2 re-plans / changes
    def m_intent_plans(self):
        for src, entries in (("run", self.rplans), ("fight", self.fplans)):
            for p in entries:
                if not (is_new_run_entry(p) if src == "run" else is_new_fight_entry(p)):
                    continue
                version = p.get("version") if src == "run" else p.get("run_plan_version")
                floor = p.get("floor")
                if src == "run":
                    self.ev("replan", "n/a", who="deepseek", version=version, trigger=p.get("trigger"), floor=floor)
                for note in p.get("validator") or (p.get("plan") or {}).get("validator") or []:
                    note = str(note)
                    if note.startswith("rejected change "):
                        field, why = classify_rejection(note)
                        self.ev("change_rejected", "n/a", who="validator", source=src, field=field, reason=why,
                                floor=floor, version=version, text=note[:200])
                    else:
                        self.ev("validator_repair", "n/a", who="validator", source=src, type=classify_repair(note),
                                floor=floor, version=version, kind=p.get("kind"), text=note[:200])
                for ch in p.get("changes") or []:
                    self.ev("change_accepted", "n/a", who="deepseek", source=src, field=ch.get("field"),
                            frm=ch.get("from"), to=ch.get("to"), trigger=ch.get("trigger"), fact=ch.get("fact"),
                            floor=ch.get("floor", floor), act=ch.get("act"), version=ch.get("version", version),
                            ts=p["ts"])

    # --- I3 execution after an accepted run-plan change
    def m_change_exec(self):
        for p in self.rplans:
            if not is_new_run_entry(p):
                continue
            for ch in p.get("changes") or []:
                self._exec_change(p, ch)

    def _exec_change(self, entry, ch):
        field, frm, to, act = ch.get("field"), ch.get("from"), ch.get("to"), ch.get("act")
        base = dict(field=field, change=f"{field} {json.dumps(frm)}→{json.dumps(to)}", trigger=ch.get("trigger"),
                    change_floor=ch.get("floor"))
        checks: list[str] = []
        if field == "hp_policy" and to == "preserve":
            checks = ["rest_heal_below_target", "no_optional_elite"]
        elif field == "hp_policy" and to == "push":
            checks = ["rest_smith_healthy"]
        elif field == "route_risk" and to == "avoid_elites":
            checks = ["no_optional_elite"]
        elif field == "route_risk" and to == "seek_elites":
            checks = ["elite_when_healthy"]
        elif field == "entry_hp_pct" and isinstance(to, (int, float)) and (not isinstance(frm, (int, float)) or to > frm):
            checks = ["rest_heal_near_boss", "no_elite_near_boss"]
        elif field == "reserve":
            added = [x for x in (to or []) if x not in (frm or [])]
            if added:
                es = [e for e in self.events if e["metric"] == "reserve" and e.get("act") == act and e["outcome"] != "n/a"
                      and (e.get("flagged_floor") or 0) >= (ch.get("floor") or 0) and (e.get("role") in added or "any" in added)]
                for e in es:
                    # a drink under a release exception (HP < 25%, every line dies) is within the rule
                    released = e["outcome"] == "broken" and e.get("exception")
                    self.ev("change_exec", "n/a" if released else e["outcome"], who=e["who"], check="reserve_added_kept",
                            floor=e.get("floor") or e.get("boss_floor"), potion=e.get("potion"),
                            **({"note": f"released: {e['exception']}"} if released else {}), **base)
                if not es:
                    self.ev("change_exec", "n/a", who="-", check="reserve_added_kept", note="no potion of the added role held", **base)
                return
        elif field == "needs":
            added = [x for x in (to or []) if x not in (frm or [])]
            if added:
                checks = ["needs_reward"]
        elif field == "avoid":
            added = [x for x in (to or []) if x not in (frm or [])]
            if added:
                checks = ["avoid_reward"]
        if not checks:
            self.ev("change_exec", "n/a", who="-", check="none", note="nothing to check for this change", **base)
            return
        added = [x for x in ((to if isinstance(to, list) else []) or []) if x not in ((frm if isinstance(frm, list) else []) or [])]
        seen = 0
        for r in self.rows:
            if r["ts"] <= entry["ts"]:
                continue
            if r["st"].get("act") is not None and act is not None and r["st"].get("act") != act:
                break
            plan = self.plan_at(r["ts"])
            if not plan or not same_value(field, plan_field(plan, field), to):
                if plan and plan.get("act") == act:
                    break  # changed again (or repaired away) within the act
                continue
            hf = hp_frac(r)
            fl = r["floor"] or 0
            target = plan.get("entryHp") or HP_TARGET.get(plan.get("hpPolicy") or "balanced", 0.7)
            if r["label"] == "rest/choose" and hf is not None:
                opts = r["st"].get("rest_opts") or []
                oi = r["chosen"].get("option_index")
                pick = opts[oi] if oi is not None and oi < len(opts) else None
                if pick is None:
                    continue
                want = None
                if "rest_heal_below_target" in checks and hf < target and "HEAL" in opts:
                    want, chk = "HEAL", "rest_heal_below_target"
                elif "rest_heal_near_boss" in checks and floors_to_boss(fl) <= 6 and hf < (plan.get("entryHp") or 1) and "HEAL" in opts:
                    want, chk = "HEAL", "rest_heal_near_boss"
                elif "rest_smith_healthy" in checks and hf >= 0.55 and floors_to_boss(fl) > 2 and "SMITH" in opts:
                    want, chk = "SMITH", "rest_smith_healthy"
                if want:
                    seen += 1
                    self.ev("change_exec", "honoured" if pick == want else "broken", who=who_of(r, self.arm), check=chk,
                            floor=fl, pick=pick, hp_pct=round(hf * 100), **base)
            elif r["label"] == "map/route":
                avail = r["st"].get("map_avail") or []
                oi = r["chosen"].get("option_index")
                pick = avail[oi] if oi is not None and oi < len(avail) else None
                if pick is None or "Elite" not in avail:
                    continue
                alt = any(a != "Elite" for a in avail)
                nxt = fl + 1
                chk = None
                ok = None
                if "no_optional_elite" in checks and alt:
                    chk, ok = "no_optional_elite", pick != "Elite"
                elif "no_elite_near_boss" in checks and alt and hf is not None and floors_to_boss(nxt) <= 8 \
                        and hf < (plan.get("entryHp") or 0) + 0.15:
                    chk, ok = "no_elite_near_boss", pick != "Elite"
                elif "elite_when_healthy" in checks and hf is not None and hf > 0.6:
                    chk, ok = "elite_when_healthy", pick == "Elite"
                if chk:
                    seen += 1
                    who = who_of(r, self.arm)
                    if who == "forced" and alt:
                        who = "code_filter"  # route_risk avoid_elites removed the elite: one option left
                    self.ev("change_exec", "honoured" if ok else "broken", who=who, check=chk,
                            floor=nxt, pick=pick, hp_pct=round(hf * 100) if hf is not None else None, **base)
            elif r["label"] == "reward/card" and ("needs_reward" in checks or "avoid_reward" in checks):
                opts = r["st"].get("card_options") or []
                c = r["chosen"]
                took = opts[c["option_index"]] if c.get("action") == "choose_reward_card" and c.get("option_index") is not None \
                    and c["option_index"] < len(opts) else None
                if "needs_reward" in checks:
                    deck = r["st"].get("deck") or []
                    lacking = [ro for ro in added if sum(1 for x in deck if ro in card_roles(x)) < 2]
                    fits = [x for x in opts if card_roles(x) & set(lacking)]
                    if fits:
                        seen += 1
                        self.ev("change_exec", "honoured" if took and card_roles(took) & set(lacking) else "broken",
                                who=who_of(r, self.arm), check="needs_reward", floor=fl, offered=fits, took=took or "skip", **base)
                if "avoid_reward" in checks:
                    bad = [x for x in opts if x in added or card_roles(x) & set(added)]
                    if bad:
                        seen += 1
                        self.ev("change_exec", "broken" if took in bad else "honoured", who=who_of(r, self.arm),
                                check="avoid_reward", floor=fl, offered=bad, took=took or "skip", **base)
        if not seen:
            self.ev("change_exec", "n/a", who="-", check="/".join(checks), note="no opportunity while in force", **base)

    # --- I4 intent deviations, intent_fit coverage
    def m_deviations(self):
        for r in self.rows:
            if r["decider"] == "jev":
                self.jev_decisions += 1
                if r.get("has_fit"):
                    self.jev_with_fit += 1
            dv = r.get("deviation")
            if not dv:
                continue
            label = str(dv.get("intent", "")) if isinstance(dv, dict) else str(dv)
            for intent in deviation_intents(label):
                self.ev("intent_deviation", "n/a", who=who_of(r, self.arm), intent=intent, screen=r["screen"],
                        floor=r["floor"], turn=r["turn"], version=dv.get("run_plan_version") if isinstance(dv, dict) else None,
                        objective=dv.get("fight_objective") if isinstance(dv, dict) else None, label=label[:200])

    # --- O: outcomes of Jev's picks that differ from code's reference (correlational, not causal)
    def _differs(self, r) -> bool | None:
        """Jev's pick is not code's reference rank 1. New logs: differs_from_reference / matched_reference;
        old logs: the code rank in the rationale (combat), or the option values (map route_value, reward
        code_value, any code_rank field). None when the reference cannot be recovered."""
        ref = r.get("ref") or {}
        if "differs_from_reference" in ref:
            return bool(ref["differs_from_reference"])
        if "matched_reference" in ref:
            return not ref["matched_reference"]
        if isinstance(ref.get("reference_rank"), int):
            return ref["reference_rank"] != 1
        rat = r["rationale"]
        m = re.search(r"code (?:reference )?rank (\d+)", rat)
        if m:
            return m.group(1) != "1"
        if r["label"].startswith("combat/plan-choice") and re.match(r"Jev chose to drink", rat):
            return True  # a drink-first potion option is never code's reference line
        crit = crit_json(r)
        pick = r.get("jev_choice")
        if not crit or pick not in crit:
            return None
        for field in ("code_rank",):
            ranks = {k: o.get(field) for k, o in crit.items() if isinstance(o.get(field), (int, float))}
            if pick in ranks:
                return ranks[pick] != 1
        for field in ("route_value", "code_value"):
            vals = {k: o.get(field) for k, o in crit.items() if isinstance(o.get(field), (int, float))}
            if pick in vals and len(vals) >= 2:
                return vals[pick] < max(vals.values()) - 1e-9
        return None

    def _next_hp(self, i: int, same_turn_ok=False):
        """(hp at the start of the next turn of this fight, hp right after the fight, fight ended this turn)
        from the decisions after row i; hp 0 when the run died in this fight."""
        r = self.rows[i]
        fl, turn = r["floor"], r["turn"]
        turn_end = fight_end = None
        for j in range(i + 1, len(self.rows)):
            q = self.rows[j]
            hp = q["fp"].get("hp")
            in_fight = q["screen"] == "COMBAT" and q["floor"] == fl
            if in_fight and turn_end is None and isinstance(q["turn"], int) and isinstance(turn, int) and q["turn"] > turn:
                turn_end = hp
            if not in_fight:
                fight_end = hp
                break
        ended_this_turn = turn_end is None
        if fight_end is None and self.died_on(fl):
            fight_end = 0
        if turn_end is None:
            turn_end = fight_end
        return turn_end, fight_end, ended_this_turn

    def _enemy_damage(self, i: int) -> int | None:
        """Enemy HP lost between row i and the first decision of the next turn (approximate)."""
        r = self.rows[i]
        before = {e["i"]: e.get("hp") or 0 for e in r["st"].get("enemies") or [] if e.get("alive")}
        if r["state_missing"] or not before:
            return None
        for j in range(i + 1, len(self.rows)):
            q = self.rows[j]
            if q["screen"] != "COMBAT" or q["floor"] != r["floor"]:
                return sum(before.values())  # fight over: every enemy's HP went
            if isinstance(q["turn"], int) and isinstance(r["turn"], int) and q["turn"] > r["turn"]:
                if q["state_missing"]:
                    return None
                after = {e["i"]: (e.get("hp") or 0) if e.get("alive") else 0 for e in q["st"].get("enemies") or []}
                return sum(max(0, hp - after.get(k, 0)) for k, hp in before.items())
        return None

    def m_outcomes(self):
        if self.meta is None:
            return  # unfinished: no fight / run outcome yet
        final_floor = self.meta.get("floor") or 0
        won_run = bool(self.meta.get("victory"))
        entries = self.boss_entries()
        for i, r in enumerate(self.rows):
            if r["decider"] != "jev":
                continue
            conf = r.get("jev_conf")
            bucket = next((b for lo, hi, b in CONF_BUCKETS if isinstance(conf, (int, float)) and lo <= conf < hi), "?")
            differs = self._differs(r)
            hp = r["fp"].get("hp")
            mx = r["st"].get("max_hp")
            if r["label"].startswith("combat/plan-choice"):
                kind = {"monster": "hallway"}.get(self.fight_kind.get(r["floor"]), self.fight_kind.get(r["floor"], "?"))
                turn_end, fight_end, ended = self._next_hp(i)
                crit = crit_json(r)
                own = crit.get(r.get("jev_choice") or "") or {}
                refk = next((k for k, o in crit.items() if re.match(r"(same as reference|code's reference line)", str(o.get("reference", "")))), None)
                if refk is None and "plan1" in crit and not any("reference" in o for o in crit.values()):
                    refk = "plan1"  # before the reference label, plan N was code rank N (9031/9042 Jev picks agree)
                refo = crit.get(refk or "") or {}
                pred = lambda o, k: o.get(k) if isinstance(o.get(k), (int, float)) else None
                self.ev("outcome_combat", "n/a", who="jev", differs=differs, kind=kind, conf=conf, bucket=bucket,
                        floor=r["floor"], turn=r["turn"], hp=hp, max_hp=mx,
                        turn_loss=(hp - turn_end) if hp is not None and turn_end is not None else None,
                        fight_loss=(hp - fight_end) if hp is not None and fight_end is not None else None,
                        ended_this_turn=ended, won=not self.died_on(r["floor"]),
                        own_pred_loss=pred(own, "hp_lost"), ref_pred_loss=pred(refo, "hp_lost"),
                        own_pred_dmg=pred(own, "damage_dealt"), ref_pred_dmg=pred(refo, "damage_dealt"),
                        real_dmg=self._enemy_damage(i) if not ended else None,
                        potion_first=bool(re.match(r"Jev chose to drink", r["rationale"])), ts=r["ts"])
            elif r["label"].startswith(NONCOMBAT_PREFIX):
                act = r["st"].get("act")
                boss_floor = BOSS_FLOORS[act - 1] if isinstance(act, int) and 1 <= act <= len(BOSS_FLOORS) else None
                entry = entries.get(act)
                ehp = entry["fp"].get("hp") if entry else None
                emx = entry["st"].get("max_hp") if entry else None
                self.ev("outcome_noncombat", "n/a", who="jev", differs=differs, screen=r["label"].split("/")[0],
                        bucket=bucket, conf=conf, floor=r["floor"], act=act,
                        boss_hp_pct=round(100 * ehp / emx) if ehp is not None and emx else None,
                        reached_boss=entry is not None,
                        floors_after=max(0, final_floor - (r["floor"] or 0)),
                        boss_passed=(won_run or (boss_floor is not None and final_floor > boss_floor)) if boss_floor else None)

    def analyse(self):
        self.m_save_potions()
        # roles DeepSeek asked to keep that parse_run_plan dropped (it keeps only the first 2 roles)
        self.m_save_potions("save_potions_dropped", plan_saves_dropped)
        for f in (self.m_cards, self.m_boss_entry, self.m_elites, self.m_fights, self.m_labels):
            f()
        if self.new:
            self.m_save_potions("reserve", plan_reserves, "reserve")
            self.m_intent_plans()
            self.m_change_exec()
            self.m_deviations()
        self.m_outcomes()
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


def summarize_intent(analyses: list) -> dict:
    """I1-I5 over the intent-era runs given (old-format runs are not passed in)."""
    ev = [e for a in analyses for e in a.events]

    def of(metric):
        return [e for e in ev if e["metric"] == metric]
    rep, acc, rej, exe, dev, res, rpl = (of(m) for m in ("validator_repair", "change_accepted", "change_rejected",
                                                         "change_exec", "intent_deviation", "reserve", "replan"))
    n_runs = len(analyses)
    n_fplans = sum(1 for a in analyses for p in a.fplans if is_new_fight_entry(p))
    out: dict[str, Any] = {"_runs": n_runs}
    out["repairs"] = {
        "total": len(rep), "run_plan": sum(1 for e in rep if e["source"] == "run"),
        "fight_plan": sum(1 for e in rep if e["source"] == "fight"),
        "run_plans": len(rpl), "fight_plans": n_fplans,
        "by_type": dict(collections.Counter(f"{e['source']}: {e['type']}" for e in rep).most_common()),
    }
    by_version = collections.Counter(a.rid for a in analyses for e in a.events if e["metric"] == "replan")
    out["replans"] = {
        "versions": len(rpl), "per_run": round(len(rpl) / n_runs, 1) if n_runs else None,
        "max_per_run": max(by_version.values()) if by_version else 0,
        "by_trigger": dict(collections.Counter(e.get("trigger") for e in rpl).most_common()),
        "failed_run_plan_requests": sum(a.errors["run"] for a in analyses),
        "failed_fight_plan_requests": sum(a.errors["fight"] for a in analyses),
    }
    out["accepted"] = {
        "total": len(acc),
        "by_field": dict(collections.Counter(f"{e['source']}: {e['field']}" for e in acc).most_common()),
        "by_trigger": dict(collections.Counter(e.get("trigger") for e in acc).most_common()),
        "by_change": dict(collections.Counter(f"{e['field']} {json.dumps(e.get('frm'))}→{json.dumps(e.get('to'))} ({e.get('trigger')})"
                                              for e in acc).most_common(12)),
    }
    out["rejected"] = {
        "total": len(rej),
        "by_reason": dict(collections.Counter(e["reason"] for e in rej).most_common()),
        "by_field": dict(collections.Counter(e["field"] for e in rej).most_common()),
    }
    ex = {}
    for e in exe:
        k = (e["change"].split(" ")[0] + " → " + e["change"].split("→", 1)[-1], e["check"])
        row = ex.setdefault(k, {"honoured": 0, "broken": 0, "na": 0, "broken_by": collections.Counter()})
        if e["outcome"] == "n/a":
            row["na"] += 1
        else:
            row[e["outcome"]] += 1
            if e["outcome"] == "broken":
                row["broken_by"][e["who"]] += 1
    out["execution"] = {
        "honoured": sum(1 for e in exe if e["outcome"] == "honoured"), "broken": sum(1 for e in exe if e["outcome"] == "broken"),
        "na": sum(1 for e in exe if e["outcome"] == "n/a"),
        "rows": [{"change": k[0], "check": k[1], "honoured": v["honoured"], "broken": v["broken"], "na": v["na"],
                  "broken_by": dict(v["broken_by"])} for k, v in sorted(ex.items())],
    }
    jd = sum(a.jev_decisions for a in analyses)
    jf = sum(a.jev_with_fit for a in analyses)
    dev_decisions = sum(1 for a in analyses for r in a.rows if r.get("deviation"))
    out["deviations"] = {
        "decisions": dev_decisions, "by_intent": dict(collections.Counter(e["intent"] for e in dev).most_common()),
        "by_screen": dict(collections.Counter(e["screen"] for e in dev).most_common()),
        "by_objective": dict(collections.Counter(str(e.get("objective")) for e in dev if e.get("objective")).most_common()),
        "jev_decisions": jd, "jev_with_intent_fit": jf, "fit_share": pct(jf, jd),
        "deviation_share_of_jev": pct(dev_decisions, jd),
    }
    br = [e for e in res if e["outcome"] == "broken"]
    out["reserve"] = {
        "n": sum(1 for e in res if e["outcome"] in ("honoured", "broken")),
        "kept": sum(1 for e in res if e["outcome"] == "honoured"), "broken": len(br),
        "na": sum(1 for e in res if e["outcome"] == "n/a"),
        "released_by_change": sum(1 for e in res if e.get("note") == "reserve change released it"),
        "broken_by": dict(collections.Counter(e["who"] for e in br).most_common()),
        "exceptions": dict(collections.Counter(e["exception"] for e in br if e.get("exception")).most_common()),
        "discarded": sum(1 for e in br if e.get("how") == "discarded"),
        "bugs": [{k: e.get(k) for k in ("run", "potion", "role", "act", "floor", "turn", "fight", "who", "hp_pct", "label")}
                 for e in br if e.get("bug")],
    }
    return out


def fmt_intent(title: str, s: dict) -> list[str]:
    lines = [f"### {title}", ""]
    if not s["_runs"]:
        return lines + ["No runs yet with new-format (intent) plans: I1-I5 have no data.", ""]

    def kv(d):
        return ", ".join(f"{k} {v}" for k, v in d.items()) or "-"
    r, p = s["repairs"], s["replans"]
    a, j, x, d, v = s["accepted"], s["rejected"], s["execution"], s["deviations"], s["reserve"]
    lines += [
        f"- **I1 validator repairs**: {r['total']} ({r['run_plan']} on {r['run_plans']} run plans, {r['fight_plan']} on "
        f"{r['fight_plans']} fight plans). By type: {kv(r['by_type'])}.",
        f"- **I2 re-plans**: {p['versions']} run-plan versions ({p['per_run']} per run, max {p['max_per_run']}); by checkpoint: "
        f"{kv(p['by_trigger'])}; failed requests: run {p['failed_run_plan_requests']}, fight {p['failed_fight_plan_requests']}.",
        f"  - changes accepted {a['total']}: by field {kv(a['by_field'])}; by trigger {kv(a['by_trigger'])}.",
        f"  - changes rejected {j['total']}: by reason {kv(j['by_reason'])}; by field {kv(j['by_field'])}.",
        f"- **I3 execution after an accepted change**: honoured {x['honoured']}/{x['honoured'] + x['broken']} "
        f"({pct(x['honoured'], x['honoured'] + x['broken'])}), n/a {x['na']} (no check or no opportunity).",
        f"- **I4 picks that differ from DeepSeek's tempo** (a fact, not a verdict; outcomes in section O): {d['decisions']} Jev decisions "
        f"({d['deviation_share_of_jev']} of {d['jev_decisions']} Jev decisions); by guidance item {kv(d['by_intent'])}; by screen {kv(d['by_screen'])}. "
        f"Jev decisions with a tempo note (intent_fit / tempo) on some option: {d['jev_with_intent_fit']}/{d['jev_decisions']} ({d['fit_share']}).",
        f"- **I5 reserve (whole act; released < 25% HP / every line dies)**: kept {v['kept']}/{v['n']} ({pct(v['kept'], v['n'])}), "
        f"broken {v['broken']} (by {kv(v['broken_by'])}; exceptions {kv(v['exceptions'])}; discarded {v['discarded']}), "
        f"n/a {v['na']} (of which released by a reserve change {v['released_by_change']}). "
        + (f"**BUG: {len(v['bugs'])} reserved potion(s) drunk outside the exceptions**: "
           + "; ".join(f"{b['run']} {b['potion']} F{b['floor']} T{b['turn']} {b['fight']} by {b['who']} at {b['hp_pct']}% ({b['label']})" for b in v["bugs"])
           if v["bugs"] else "No reserved potion drunk outside the exceptions."),
        "",
    ]
    if x["rows"]:
        lines += ["| accepted change | check | honoured | broken | n/a | broken by |", "|---|---|---:|---:|---:|---|"]
        for row in x["rows"]:
            lines.append(f"| {row['change']} | {row['check']} | {row['honoured']} | {row['broken']} | {row['na']} | {kv(row['broken_by']) } |")
        lines.append("")
    return lines


def _mean(xs, nd=1):
    xs = [x for x in xs if isinstance(x, (int, float)) and not isinstance(x, bool)]
    return round(sum(xs) / len(xs), nd) if xs else None


def _share(flags):
    flags = [f for f in flags if f is not None]
    return f"{100.0 * sum(1 for f in flags if f) / len(flags):.0f}%" if flags else "-"


def _combat_cell(es: list[dict]) -> dict:
    fights = {}
    for e in es:
        fights.setdefault((e["run"], e["floor"]), e["won"])
    return {"n": len(es), "turn_loss": _mean([e["turn_loss"] for e in es]), "fight_loss": _mean([e["fight_loss"] for e in es]),
            "won": _share([e["won"] for e in es]), "fights": len(fights), "fights_won": _share(list(fights.values()))}


def _noncombat_cell(es: list[dict]) -> dict:
    run_acts = {(e["run"], e["act"]) for e in es}
    return {"n": len(es), "run_acts": len(run_acts), "boss_hp": _mean([e["boss_hp_pct"] for e in es if e["reached_boss"]], 0),
            "reached": _share([e["reached_boss"] for e in es]), "passed": _share([e["boss_passed"] for e in es]),
            "floors_after": _mean([e["floors_after"] for e in es])}


def _side(d) -> str:
    return "differs" if d is True else "matches" if d is False else "unknown"


def summarize_outcomes(analyses: list) -> dict:
    """Section O: outcomes of Jev picks that match vs differ from code's reference rank 1, per era."""
    out: dict[str, Any] = {}
    by_era = collections.defaultdict(list)
    for a in analyses:
        by_era[a.period].extend(a.events)
    by_era["ALL"] = [e for a in analyses for e in a.events]
    for era in ("ALL",) + ERAS:
        ev = by_era.get(era) or []
        cb = [e for e in ev if e["metric"] == "outcome_combat"]
        nc = [e for e in ev if e["metric"] == "outcome_noncombat"]
        o: dict[str, Any] = {"runs": len({e["run"] for e in cb + nc}), "combat": {}, "combat_kind": {}, "combat_bucket": {},
                             "combat_kind_bucket": {}, "predicted": {}, "noncombat": {}, "noncombat_screen": {}}
        for side in ("matches", "differs", "unknown"):
            cs = [e for e in cb if _side(e["differs"]) == side]
            o["combat"][side] = _combat_cell(cs)
            for kind in ("hallway", "elite", "boss"):
                o["combat_kind"].setdefault(kind, {})[side] = _combat_cell([e for e in cs if e["kind"] == kind])
                for _lo, _hi, b in CONF_BUCKETS:
                    o["combat_kind_bucket"].setdefault(f"{kind} {b}", {})[side] = _combat_cell([e for e in cs if e["kind"] == kind and e["bucket"] == b])
            for _lo, _hi, b in CONF_BUCKETS:
                o["combat_bucket"].setdefault(b, {})[side] = _combat_cell([e for e in cs if e["bucket"] == b])
            # realised vs predicted: turns the fight went on after (the prediction is "before healing" at the
            # end of the enemy turn; a fight that ended this turn has post-fight HP instead)
            ps = [e for e in cs if not e["ended_this_turn"] and e["turn_loss"] is not None and e["ref_pred_loss"] is not None and e["own_pred_loss"] is not None]
            o["predicted"][side] = {
                "n": len(ps), "own_pred_loss": _mean([e["own_pred_loss"] for e in ps]), "ref_pred_loss": _mean([e["ref_pred_loss"] for e in ps]),
                "real_loss": _mean([e["turn_loss"] for e in ps]),
                "real_minus_ref_pred": _mean([e["turn_loss"] - e["ref_pred_loss"] for e in ps]),
                "real_minus_own_pred": _mean([e["turn_loss"] - e["own_pred_loss"] for e in ps]),
                "n_dmg": sum(1 for e in ps if e["real_dmg"] is not None and e["ref_pred_dmg"] is not None),
                "ref_pred_dmg": _mean([e["ref_pred_dmg"] for e in ps if e["real_dmg"] is not None and e["ref_pred_dmg"] is not None]),
                "own_pred_dmg": _mean([e["own_pred_dmg"] for e in ps if e["real_dmg"] is not None and e["own_pred_dmg"] is not None]),
                "real_dmg": _mean([e["real_dmg"] for e in ps if e["real_dmg"] is not None and e["ref_pred_dmg"] is not None]),
            }
            ns = [e for e in nc if _side(e["differs"]) == side]
            o["noncombat"][side] = _noncombat_cell(ns)
            for scr in ("map", "rest", "shop", "reward", "event"):
                o["noncombat_screen"].setdefault(scr, {})[side] = _noncombat_cell([e for e in ns if e["screen"] == scr])
        low = [e for e in cb if e["kind"] == "boss" and isinstance(e["conf"], (int, float)) and e["conf"] < 0.5]
        o["boss_low_conf"] = {
            "n": len(low), "of": sum(1 for e in cb if e["kind"] == "boss"),
            "differs": sum(1 for e in low if e["differs"] is True), "fights": len({(e["run"], e["floor"]) for e in low}),
            "fights_won": _share(list({(e["run"], e["floor"]): e["won"] for e in low}.values())),
            "list": [{k: e.get(k) for k in ("run", "floor", "turn", "conf", "differs", "hp", "max_hp", "turn_loss", "fight_loss", "won", "ts")} for e in low],
        }
        out[era] = o
    return out


BOSS_LIST_MAX = 40


def fmt_outcomes(s: dict) -> list[str]:
    def cell(c, keys):
        return " | ".join("-" if c.get(k) is None else str(c.get(k)) for k in keys)
    ck = ("n", "turn_loss", "fight_loss", "won", "fights", "fights_won")
    lines = ["## O. Outcomes of Jev's picks that differ from code's reference (correlation, not proof)", "",
             "Code's reference rank and tempo labels are rule-based and have been wrong (PCGH F23 T4, 9V09, FEY6), so a pick that differs "
             "from them is not scored as broken here: it is compared with picks that match reference rank 1 by what happened next. "
             "**These are correlations with strong confounders, not causal estimates**: Jev differs more often in hard spots (low "
             "confidence, elites and bosses, low HP, turns where every line is bad), so the differing group starts from worse positions; "
             "the reference itself was chosen by rules that changed between eras; decisions in the same fight / act share one outcome.", "",
             "- differs = Jev's pick is not code's reference rank 1 (`differs_from_reference` / `matched_reference` in new logs; older "
             "logs: the code rank in the rationale, a drink-first potion option, or the highest route_value / code_value on map and "
             "reward screens; rest, shop and event picks in older logs have no reference to recover: 'unknown').",
             "- combat: HP lost from the decision to the first decision of the next turn (turn loss) and to the first decision after the "
             "fight (fight loss; post-fight healing such as Burning Blood is included, a death counts the HP left), fight won = the run did "
             "not end in that fight. 'fights' counts each (run, floor) once per side (a fight with both kinds of picks is in both).", ""]
    for era in ("ALL",) + ERAS:
        o = s.get(era)
        if not o:
            continue
        c = o["combat"]
        if not any(c[side]["n"] for side in c) and not any(o["noncombat"][side]["n"] for side in o["noncombat"]):
            lines += [f"### {era}: no finished runs with Jev picks" + (" yet (no run log carries the redesign fields)" if era == ERA_REDESIGN else ""), ""]
            continue
        lines += [f"### {era} ({o['runs']} finished runs)", "",
                  "Combat plan choices by Jev:", "",
                  "| pick | n | turn HP loss (mean) | fight HP loss from here (mean) | fight won (per decision) | fights | fights won |",
                  "|---|---:|---:|---:|---:|---:|---:|"]
        for side in ("matches", "differs", "unknown"):
            if c[side]["n"]:
                lines.append(f"| {side} | {cell(c[side], ck)} |")
        lines += ["", "By fight kind and Jev confidence (matches vs differs: n, turn HP loss, fight HP loss, fight won):", "",
                  "| split | matches n | turn | fight | won | differs n | turn | fight | won |", "|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
        sk = ("n", "turn_loss", "fight_loss", "won")
        rows = [(k, v) for k, v in o["combat_kind"].items()] + [(f"conf {k}", v) for k, v in o["combat_bucket"].items()] + \
               ([(k, v) for k, v in o["combat_kind_bucket"].items()] if era == "ALL" else [])
        for name, v in rows:
            if v["matches"]["n"] or v["differs"]["n"]:
                lines.append(f"| {name} | {cell(v['matches'], sk)} | {cell(v['differs'], sk)} |")
        p = o["predicted"]
        lines += ["", "Realised vs predicted (approximate; turns the fight went on after, both lines' predictions logged). HP: the "
                  "solver's hp_lost for Jev's line and for the reference line vs the HP actually lost by the next turn; damage: enemy HP "
                  "lost by the next turn (block, regeneration, spawns and minions make it rough):", "",
                  "| pick | n | Jev line predicted HP loss | reference predicted HP loss | realised HP loss | realised - reference predicted | realised - own predicted | n dmg | reference predicted dmg | Jev line predicted dmg | realised dmg |",
                  "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|"]
        for side in ("matches", "differs"):
            if p[side]["n"]:
                lines.append(f"| {side} | {cell(p[side], ('n', 'own_pred_loss', 'ref_pred_loss', 'real_loss', 'real_minus_ref_pred', 'real_minus_own_pred', 'n_dmg', 'ref_pred_dmg', 'own_pred_dmg', 'real_dmg'))} |")
        nk = ("n", "run_acts", "boss_hp", "reached", "passed", "floors_after")
        lines += ["", "Non-combat picks by Jev (per decision; every pick in a run-act shares that act's outcome, approximate):", "",
                  "| screen | pick | n | run-acts | HP% at next act-boss entry (mean, reached) | reached boss | act boss passed | floors survived afterwards (mean) |",
                  "|---|---|---:|---:|---:|---:|---:|---:|"]
        for side in ("matches", "differs", "unknown"):
            if o["noncombat"][side]["n"]:
                lines.append(f"| all | {side} | {cell(o['noncombat'][side], nk)} |")
        for scr, v in o["noncombat_screen"].items():
            for side in ("matches", "differs", "unknown"):
                if v[side]["n"]:
                    lines.append(f"| {scr} | {side} | {cell(v[side], nk)} |")
        b = o["boss_low_conf"]
        lines += ["", f"Boss fights, Jev confidence < 0.5: {b['n']} of {b['of']} Jev boss plan choices ({b['differs']} differ from the "
                  f"reference) in {b['fights']} fights, {b['fights_won']} of those fights won. The counterfactual (what the other line "
                  "would have done) cannot be known from the logs: " + ("listed below for manual review." if era != "ALL" else "see the per-era lists."), ""]
        if era != "ALL" and b["list"]:
            shown = b["list"][-BOSS_LIST_MAX:]
            if len(b["list"]) > len(shown):
                lines.append(f"(latest {len(shown)} of {len(b['list'])}; all in --json under outcomes.{era}.boss_low_conf.list)")
            lines.append("")
            lines.append("| run | floor | turn | conf | differs | HP | turn loss | fight loss | fight won | ts |")
            lines.append("|---|---:|---:|---:|---|---|---:|---:|---|---|")
            for e in shown:
                lines.append(f"| {e['run']} | {e['floor']} | {e['turn']} | {e['conf']} | {e['differs']} | {e['hp']}/{e['max_hp']} | "
                             f"{e['turn_loss']} | {e['fight_loss']} | {e['won']} | {e['ts'][:19]} |")
            lines.append("")
    return lines


def intent_row(a: RunAnalysis) -> dict:
    if not a.new:
        return {"run": a.rid, "era": a.period, **{k: "n/a" for k in ("versions", "repairs", "accepted", "rejected", "exec",
                                                                      "deviations", "fit", "reserve")}}
    ev = collections.defaultdict(list)
    for e in a.events:
        ev[e["metric"]].append(e)
    ex = [e for e in ev["change_exec"] if e["outcome"] != "n/a"]
    res = [e for e in ev["reserve"] if e["outcome"] in ("honoured", "broken")]
    bugs = sum(1 for e in ev["reserve"] if e.get("bug"))
    return {
        "run": a.rid, "era": a.period,
        "versions": f"{len(ev['replan'])}" + (f" (+{a.errors['run']} failed)" if a.errors["run"] else ""),
        "repairs": f"{sum(1 for e in ev['validator_repair'] if e['source'] == 'run')}/{sum(1 for e in ev['validator_repair'] if e['source'] == 'fight')}",
        "accepted": ", ".join(f"{k} {n}" for k, n in collections.Counter(e["field"] for e in ev["change_accepted"]).items()) or "0",
        "rejected": ", ".join(f"{k} {n}" for k, n in collections.Counter(e["reason"] for e in ev["change_rejected"]).items()) or "0",
        "exec": f"{sum(1 for e in ex if e['outcome'] == 'honoured')}/{len(ex)}" if ex else "-",
        "deviations": ", ".join(f"{k} {n}" for k, n in collections.Counter(e["intent"] for e in ev["intent_deviation"]).items()) or "0",
        "fit": f"{a.jev_with_fit}/{a.jev_decisions}",
        "reserve": (f"{sum(1 for e in res if e['outcome'] == 'honoured')}/{len(res)}" if res else "-") + (f" BUG {bugs}" if bugs else ""),
    }


def main():
    global LOGS
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--logs", metavar="DIR", default=LOGS, help="log directory (default jev-sts2/logs; for synthetic checks)")
    ap.add_argument("--runs", action="store_true", help="per-run table")
    ap.add_argument("--json", action="store_true", help="machine output (summaries, per-run rows, events)")
    ap.add_argument("--md", metavar="PATH", help="write the Markdown report here")
    ap.add_argument("--events", metavar="RUNID", help="print every scored event of one run")
    args = ap.parse_args()
    LOGS = args.logs

    monsters, potion_text, _cards = load_game_data()
    POTION_TEXT.update(potion_text)
    runs, run_plans, fight_plans, errors = load_runs()
    target = set(run_plans) | set(fight_plans)
    target = {r for r in target if (runs.get(r) or {}).get("arm") not in ("code", "jev")}
    timelines = load_timelines(target, monsters)

    analyses = []
    # the redesign era starts with the first run whose decisions carry the redesign fields
    redesign_start = min((rows[0]["ts"] for rows in timelines.values() if rows and any(r.get("redesign") for r in rows)), default=None)
    for rid in sorted(target, key=lambda r: (timelines.get(r) or [{"ts": ""}])[0]["ts"]):
        rows = timelines.get(rid) or []
        if not rows:
            continue
        meta = runs.get(rid)
        arm = (meta or {}).get("arm") or "normal"
        rp = sorted(run_plans.get(rid, []), key=lambda p: p["ts"])
        fp = sorted(fight_plans.get(rid, []), key=lambda p: p["ts"])
        new = any(is_new_run_entry(p) for p in rp) or any(is_new_fight_entry(p) for p in fp)
        period = ERA_INTENT if new or rows[0]["ts"] >= INTENT_CUTOFF else ERA_MID if rows[0]["ts"] >= CUTOFF else ERA_PRE
        if redesign_start is not None and (rows[0]["ts"] >= redesign_start or any(r.get("redesign") for r in rows)):
            period = ERA_REDESIGN
        for p in rp:
            if is_new_run_entry(p):
                # new vocabulary read by the old metrics where a field maps (docstring); the parser no
                # longer drops reserve roles, so metric 1' has nothing to score
                pl = p["plan"]
                pl["_raw_save"] = []
                pl.setdefault("mustHave", pl.get("needs") or [])
                if pl.get("routeRisk") == "avoid_elites":
                    pl.setdefault("elites", "avoid")
            else:
                p["plan"]["_raw_save"] = (p.get("raw") or {}).get("save_potions") or []
        analyses.append(RunAnalysis(rid, meta, rp, fp, rows, arm, period, errors.get(rid)).analyse())

    done = [a for a in analyses if a.meta is not None]
    groups = {"ALL finished runs": done}
    for per in ERAS:
        groups[f"era {per}"] = [a for a in done if a.period == per]
    for arm in ("normal", "full", "ds"):
        groups[f"arm {arm}"] = [a for a in done if a.arm == arm]
    groups["runs with commitment fields (entryHp/savePotions/mustHave)"] = [
        a for a in done if any(p["plan"].get("savePotions") or p["plan"].get("entryHp") for p in a.rplans)]
    summaries = {g: summarize([e for a in rs for e in a.events]) | {"_runs": len(rs)} for g, rs in groups.items()}
    rows = [run_row(a) for a in analyses]
    intent_done = [a for a in done if a.new]
    intent_live = [a for a in analyses if a.new and a.meta is None]
    intent_summary = {"finished": summarize_intent(intent_done), "unfinished": summarize_intent(intent_live)}
    intent_rows = [intent_row(a) for a in analyses]
    outcomes = summarize_outcomes(done)

    if args.events:
        for a in analyses:
            if a.rid == args.events:
                for e in a.events:
                    print(json.dumps(e, ensure_ascii=False, default=str))
        return
    if args.json:
        json.dump({"summaries": summaries, "intent": intent_summary, "outcomes": outcomes, "runs": rows, "intent_runs": intent_rows,
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
    out += ["", "## Intent era (from 0f2e648): validator, re-plans, execution, picks differing from tempo, reserve", ""]
    if not intent_done and not intent_live:
        out.append("No runs yet with new-format (intent) plans.")
    else:
        out += fmt_intent(f"finished intent-era runs ({len(intent_done)})", intent_summary["finished"])
        if intent_live:
            out += fmt_intent(f"unfinished intent-era runs, not in the aggregates above ({len(intent_live)}: "
                              f"{', '.join(a.rid for a in intent_live)})", intent_summary["unfinished"])
    out += [""] + fmt_outcomes(outcomes)
    if args.runs or args.md:
        run_lines = ["", "### Per run (honoured/scored)", "",
                     "| run | start (UTC) | arm | period | code | floor | win | save_pot | entry HP% A:hp/target | must deck | must reward | avoid card | avoid elite | focus plays | potion timing | setup | labels |",
                     "|---|---|---|---|---|---:|---|---|---|---|---|---|---|---|---|---|---|"]
        for r in rows:
            run_lines.append("| " + " | ".join(str(r[k]) for k in ("run", "start", "arm", "period", "code", "floor", "win", "save_pot", "entry_hp",
                                                                   "must_deck", "must_rew", "avoid_card", "avoid_elite", "focus", "pot_time", "setup", "labels")) + " |")
        ir = [r for r in intent_rows if r["versions"] != "n/a"]
        run_lines += ["", "### Per run, intent era (I1-I5; older runs: n/a; 'differs from tempo' = I4)", ""]
        if not ir:
            run_lines.append("No runs yet with new-format (intent) plans.")
        else:
            run_lines += ["| run | run-plan versions | repairs run/fight | changes accepted | changes rejected | exec after change | "
                          "differs from tempo, by item | Jev decisions with a tempo note | reserve kept |",
                          "|---|---:|---|---|---|---|---|---|---|"]
            for r in ir:
                run_lines.append("| " + " | ".join(str(r[k]) for k in ("run", "versions", "repairs", "accepted", "rejected", "exec",
                                                                       "deviations", "fit", "reserve")) + " |")
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
        md = [MD_HEAD] + headlines(summaries, intent_summary, outcomes) + out + run_lines + [SPOT_CHECKS] + spot + [MD_TAIL]
        os.makedirs(os.path.dirname(os.path.abspath(args.md)), exist_ok=True)
        with open(args.md, "w", encoding="utf8") as fh:
            fh.write("\n".join(md) + "\n")
        print(f"\nwrote {args.md}", file=sys.stderr)


def headlines(summaries: dict, intent: dict | None = None, outcomes: dict | None = None) -> list[str]:
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
    if intent is not None:
        fi, li = intent["finished"], intent["unfinished"]
        if not fi["_runs"] and not li["_runs"]:
            lines[-1:] = ["- **Intent era (from 0f2e648)**: no runs yet with new-format plans; I1-I5 are empty.", ""]
        else:
            s = fi if fi["_runs"] else li
            which = f"{fi['_runs']} finished" if fi["_runs"] else f"{li['_runs']} unfinished (no finished run yet)"
            v = s["reserve"]
            lines[-1:] = [
                f"- **Intent era (from 0f2e648)**, {which} run(s): {s['repairs']['total']} validator repairs, "
                f"{s['replans']['versions']} run-plan versions, {s['accepted']['total']} changes accepted / {s['rejected']['total']} rejected; "
                f"execution after a change {s['execution']['honoured']}/{s['execution']['honoured'] + s['execution']['broken']}; "
                f"{s['deviations']['decisions']} Jev picks that differ from DeepSeek's tempo; a tempo note on {s['deviations']['fit_share']} of Jev decisions; "
                f"reserve kept {v['kept']}/{v['n']}, {len(v['bugs'])} bug(s).", ""]
    if outcomes is not None and outcomes.get("ALL"):
        o = outcomes["ALL"]
        m, d = o["combat"]["matches"], o["combat"]["differs"]
        nm, nd = o["noncombat"]["matches"], o["noncombat"]["differs"]
        b = o["boss_low_conf"]
        lines[-1:] = [
            f"- **Outcomes of differing picks (section O; correlation, not proof: Jev differs more in hard spots)**: combat, Jev's pick "
            f"= reference rank 1 in {m['n']} decisions (turn HP loss {m['turn_loss']}, fight won {m['won']}), differs in {d['n']} (turn HP "
            f"loss {d['turn_loss']}, fight won {d['won']}); non-combat matches {nm['n']} (act boss passed {nm['passed']}) vs differs "
            f"{nd['n']} ({nd['passed']}). Boss turns at Jev confidence < 0.5: {b['n']} (for manual review).", ""]
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
- Intent era (I1-I5): only runs whose logs carry the new plan format. Execution checks (I3) cover rest,
  map and card-reward choices on the floors the changed value stays in force in its act; combat-side
  effects of hp_policy (solver weights, guard slack) are not checked there (I4 sees Jev's side of them).
  I4's share counts decisions with decider "jev" whose question had an intent_fit label on any option;
  labels only exist when a run or fight plan is in force (early floors before the first plan have none).
  I5 exceptions are read from the logged HP (fingerprint hp / state max_hp), the least-loss label and the
  option's "released" tag; the per-card fallback's "lethal turn" release is not visible and would show as a BUG
  (check the event with --events before trusting a flagged case).
- Section O (outcomes of differing picks) is correlational. Jev differs from code's reference more often in
  hard spots (low confidence, elites and bosses, low HP, turns where every line loses a lot), the reference
  was produced by rules that changed between eras (and has been wrong), and decisions in one fight or one act
  share an outcome, so neither "differs did worse" nor "differs did better" is proof about the choice itself.
  Turn HP loss uses the HP at the next turn's first Jev/code decision (a fight that ended this turn uses the
  post-fight HP, which includes end-of-combat healing); realised damage is the drop in enemy HP (block,
  regeneration, spawns and minions distort it); non-combat outcomes (boss-entry HP, floors survived, boss
  passed) are per run-act and shared by every pick in it. Old rest / shop / event picks have no recoverable
  reference rank ("unknown"). The boss low-confidence list cannot say what the other line would have done.
"""


if __name__ == "__main__":
    main()
