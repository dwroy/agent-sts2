#!/usr/bin/env python3
"""Potion equivalents: what each potion held is worth in the act boss fight, as HP, damage and block
(Dai 2026-09-30: a potion drunk is HP paid later; holding one is having some extra HP, attack or block).
Writes knowledge/characters/ironclad/potion-equivalents.json; docs/potion-equivalents.md explains every formula.

Inputs (nothing hand-typed except the named estimate constants below):
  data/game-data.json        the 66 potions (name, description template, rarity, usage, target, pool) and
                               the cards (type, hits, block, Strike tag) the per-turn counts are read with
  agent/src/knowledge/potion-values.ts   the measured template numbers (FIRE_POTION Damage 20, BLOCK_POTION Block 12, …)
  agent/src/strategy/card-model.ts   which potions the turn solver models exactly / by Monte Carlo (keys of
                               POTION_EFFECTS, CHOICE_POTIONS, DRAW_POTIONS)
  the log database (data/logdb, docs/logdb.md)   per act and ascension, from the boss fights' turns:
                               our damage a turn, the boss's unblocked damage a turn, fight length, attack
                               hits, block cards, energy, cards played; the Monte Carlo summaries of random
                               potions; the drink-vs-no-drink rollout numbers of boss drinks (the check column)

The conversion (per ascension, per act; n = boss fights):
  r        = L / D: HP per point of damage (L = unblocked boss damage a turn, D = our damage a turn: one more
             D shortens the fight by one turn and saves one L)
  block    = 1:1, capped by what that turn lets through: mean over hit turns of min(B, loss)
  Strength / per-turn damage X for the fight: the fight shortens by T·X/(D+X) turns (T = fight turns)
  Dexterity X for the fight: T × mean over turns of min(X × block cards, loss)
  energy, draw: the marginal value of one average card / one energy (its damage × r plus its block capped
             by the turn's loss); a drawn card is played DRAW_PLAY_SHARE of the time (estimate)
  random potions: as the cards they give (a free card = one card + one energy); the logged Monte Carlo
             this-turn gain is a second check column, not adopted
Hold value = max(0, HP): a potion is never worth less than not drinking it.

Gold (meta.gold_hp; Dai 2026-10-02, THIEF_COST, docs/thief.md §7): what a gold coin is worth in HP, for the gold a Gremlin
Merc / Fat Gremlin takes away: gold ÷ the median shop potion price at A8+ (the logged shop screens' potion offers) × the
act's median held value of those offered potions at this ascension.

Usage:
  data/logdb-venv/bin/python knowledge/builders/build-potion-equivalents.py [--out PATH] [--no-sync] [--markdown]
  python3 knowledge/builders/build-potion-equivalents.py --self-test      (formulas on a fixed sample; no DuckDB needed)
"""
import argparse
import collections
import datetime as dt
import json
import math
import os
import re
import statistics
import sys
from pathlib import Path

ROOT = str(Path(__file__).resolve().parents[2])  # the project root (docs/layout.md)
DEFAULT_OUT = os.path.join(ROOT, "knowledge", "characters", "ironclad", "potion-equivalents.json")
GAME_DATA = os.path.join(ROOT, "data", "game-data.json")
POTION_VALUES_TS = os.path.join(ROOT, "agent", "src", "knowledge", "potion-values.ts")
CARD_MODEL_TS = os.path.join(ROOT, "agent", "src", "strategy", "card-model.ts")

ASCENSIONS = (8, 9)
ACTS = (1, 2, 3)
# The shop potion prices for the gold rate (meta.gold_hp): the logged shop screens from this ascension up.
GOLD_PRICE_MIN_ASC = 8
# Shop frames read per visit to find its potion offers (the first frames of a visit can be the shop before it opens).
SHOP_FRAMES_PER_VISIT = 6
# Inputs of an (ascension, act) with fewer boss fights are borrowed from the nearest ascension that has enough.
MIN_N = 5

# ---- estimate constants (every one is marked 估 where it is used) -------------------------------------
DRAW_PLAY_SHARE = 0.5  # a drawn card is played this often (energy runs out)
HAND_SIZE = 5  # cards in hand when a draw potion is drunk
HAND_LIMIT = 10  # the game's hand cap
ENEMY_HITS = 1  # enemy attack hits a turn (Shackling, Liquid Bronze): the turns table has totals only
POWER_LASTING_STRENGTH = 1  # a random Power card's lasting part, as Strength for the fight
FORGE_UPGRADE_GAIN = 0.25  # an upgrade adds this share of a card's value each play
EXPENSIVE_CARD_COST = 2  # the card Touch of Insanity makes free / Duplicator plays twice
WEAK_FACTOR = 0.25  # Weak: enemy attacks deal 25% less
VULN_FACTOR = 0.5  # Vulnerable: our attacks deal 50% more

CATEGORY_ZH = {
    "damage": "伤害", "block": "格挡", "heal": "回血", "strength": "力量", "dexterity": "敏捷", "debuff": "易伤虚弱类减益",
    "energy": "能量", "draw": "抽牌", "random": "随机", "other": "其他",
}

# id -> (category, kind). The kind picks the formula (potion_value); None: no value (another character's
# potion, removed, test-only, or its numbers unknown).
SPECS = {
    "AMBERGRIS": ("heal", "extra_turn"),
    "ASHWATER": ("other", "ashwater"),
    "ATTACK_POTION": ("random", "choice"),
    "BEETLE_JUICE": ("debuff", "shrink"),
    "BLESSING_OF_THE_FORGE": ("other", "forge"),
    "BLOCK_POTION": ("block", "block"),
    "BLOOD_POTION": ("heal", "heal_pct"),
    "BONE_BREW": ("other", None),
    "BOTTLED_POTENTIAL": ("draw", "redraw"),
    "CLARITY": ("draw", "draw"),
    "COLORLESS_POTION": ("random", "choice"),
    "COSMIC_CONCOCTION": ("random", None),
    "CUNNING_POTION": ("damage", None),
    "CURE_ALL": ("energy", "energy_draw"),
    "DEPRECATED_POTION": ("other", None),
    "DEXTERITY_POTION": ("dexterity", "dex_fight"),
    "DISTILLED_CHAOS": ("random", "chaos"),
    "DROPLET_OF_PRECOGNITION": ("draw", "pick_draw"),
    "DUPLICATOR": ("other", "duplicate"),
    "ENERGY_POTION": ("energy", "energy"),
    "ENTROPIC_BREW": ("random", "entropic"),
    "ESSENCE_OF_DARKNESS": ("other", None),
    "EXPLOSIVE_AMPOULE": ("damage", "damage"),
    "FAIRY_IN_A_BOTTLE": ("heal", "fairy"),
    "FIRE_POTION": ("damage", "damage"),
    "FLEX_POTION": ("strength", "strength_turn"),
    "FOCUS_POTION": ("other", None),
    "FORTIFIER": ("block", "triple_block"),
    "FOUL_POTION": ("damage", "damage"),
    "FRUIT_JUICE": ("heal", "max_hp"),
    "FYSH_OIL": ("strength", "fysh"),
    "GAMBLERS_BREW": ("draw", "gamble"),
    "GHOST_IN_A_JAR": ("block", None),
    "GIGANTIFICATION_POTION": ("damage", "triple_attack"),
    "GLOWWATER_POTION": ("draw", "glowwater"),
    "HEART_OF_IRON": ("block", "plating"),
    "KINGS_COURAGE": ("other", None),
    "LIQUID_BRONZE": ("other", "thorns"),
    "LIQUID_MEMORIES": ("draw", "pick_discard_free"),
    "LUCKY_TONIC": ("block", "buffer"),
    "MAZALETHS_GIFT": ("strength", "ritual"),
    "MOCK_DISCARD_AND_ADD_SHIVS_POTION": ("other", None),
    "OROBIC_ACID": ("random", "choice3"),
    "POISON_POTION": ("damage", None),
    "POTION_OF_BINDING": ("debuff", "binding"),
    "POTION_OF_CAPACITY": ("other", None),
    "POTION_OF_DOOM": ("damage", None),
    "POTION_SHAPED_ROCK": ("damage", "damage"),
    "POT_OF_GHOULS": ("draw", None),
    "POWDERED_DEMISE": ("damage", "demise"),
    "POWER_POTION": ("random", "choice_power"),
    "RADIANT_TINCTURE": ("energy", "energy"),
    "REGEN_POTION": ("heal", "regen"),
    "SHACKLING_POTION": ("debuff", "enemy_str_turn"),
    "SHIP_IN_A_BOTTLE": ("block", "block"),
    "SKILL_POTION": ("random", "choice"),
    "SNECKO_OIL": ("draw", "snecko"),
    "SOLDIERS_STEW": ("damage", "stew"),
    "SPEED_POTION": ("dexterity", "dex_turn"),
    "STABLE_SERUM": ("draw", "retain"),
    "STAR_POTION": ("other", None),
    "STRENGTH_POTION": ("strength", "strength_fight"),
    "SWIFT_POTION": ("draw", "draw"),
    "TOUCH_OF_INSANITY": ("energy", "free_forever"),
    "VULNERABLE_POTION": ("debuff", "vuln"),
    "WEAK_POTION": ("debuff", "weak"),
}

# Why a potion has no value (kind None).
NO_VALUE_NOTE = {
    "DEPRECATED_POTION": "游戏里已移除",
    "MOCK_DISCARD_AND_ADD_SHIVS_POTION": "测试用，不会出现",
}
# Kinds whose value is the same whenever the potion is drunk (drinking it early costs nothing).
TIMING_FREE = {"max_hp"}


# ---------------------------------------------------------------- sources: TypeScript tables

def parse_potion_values(path=POTION_VALUES_TS):
    """POTION_VALUES of potion-values.ts: {id: {name: number}}."""
    text = open(path, encoding="utf8").read()
    block = re.search(r"POTION_VALUES[^=]*=\s*\{(.*?)\n\};", text, re.S)
    if not block:
        raise SystemExit(f"POTION_VALUES not found in {path}")
    values = {}
    for pid, body in re.findall(r"^\s*([A-Z_]+):\s*\{([^}]*)\}", block.group(1), re.M):
        values[pid] = {k: float(v) if "." in v else int(v) for k, v in re.findall(r"([A-Za-z]+):\s*(-?[\d.]+)", body)}
    if not values:
        raise SystemExit(f"POTION_VALUES in {path} parsed empty")
    return values


def ts_object_keys(text, name):
    """The top-level keys of `const|export const NAME ... = { ... };` in a TypeScript file."""
    match = re.search(r"(?:const|export const)\s+" + name + r"\b[^=]*=\s*\{", text)
    if not match:
        raise SystemExit(f"{name} not found in card-model.ts")
    depth, i, start = 1, match.end(), match.end()
    while depth > 0 and i < len(text):
        depth += {"{": 1, "}": -1}.get(text[i], 0)
        i += 1
    body = text[start:i - 1]
    keys, depth = [], 0
    for line in body.split("\n"):
        stripped = line.strip()
        if depth == 0:
            key = re.match(r"([A-Z_]+):", stripped)
            if key:
                keys.append(key.group(1))
        depth += line.count("{") - line.count("}")
    return keys


def solver_models(path=CARD_MODEL_TS):
    """{id: "exact" | "mc"}: the turn solver's POTION_EFFECTS (exact) and the Monte Carlo classes."""
    text = open(path, encoding="utf8").read()
    effects = set(ts_object_keys(text, "POTION_EFFECTS"))
    mc = set(ts_object_keys(text, "CHOICE_POTIONS")) | set(ts_object_keys(text, "DRAW_POTIONS"))
    out = {pid: "exact" for pid in effects}
    out.update({pid: "mc" for pid in mc})
    return out


# ---------------------------------------------------------------- game data

def load_game_data(path=GAME_DATA):
    data = json.load(open(path, encoding="utf8"))
    potions = data["collections"]["potions"]
    cards = {}
    for card in data["collections"]["cards"]:
        cards[card["id"]] = card_info(card)
    return potions, cards


CN_TIMES = {"两": 2, "二": 2, "三": 3, "四": 4, "五": 5}


def card_info(card):
    """What a played card counts for: attack hits (Repeat, 「两次」…, X = energy), gives block, a Strike."""
    var = {v["name"]: v.get("base_value") for v in card.get("vars") or []}
    desc = card.get("description_raw") or card.get("description") or ""
    hits = 0
    if card.get("type") == "Attack":
        if isinstance(var.get("Repeat"), (int, float)) and var["Repeat"] > 0:
            hits = var["Repeat"]
        elif card.get("is_x_cost"):
            hits = "X"
        else:
            match = re.search(r"伤害([两二三四五])次", desc)
            hits = CN_TIMES[match.group(1)] if match else 1
    return {
        "type": card.get("type"),
        "hits": hits,
        "damage": card.get("damage") or 0,
        "block": bool(card.get("block")) or "Block" in var,
        "strike": "Strike" in (card.get("tags") or []),
    }


def pool_of(potion):
    pool = (potion.get("pool") or "").split(" ")[0].replace("potion_pool.", "").replace("_potion_pool", "")
    return pool or "none"


IRONCLAD_POOLS = {"shared", "ironclad", "event", "token"}


# ---------------------------------------------------------------- rates (pure)

def mean(values):
    values = [v for v in values if v is not None]
    return sum(values) / len(values) if values else None


def median(values):
    values = [v for v in values if v is not None]
    return statistics.median(values) if values else None


def turn_counts(turn, cards):
    """Hits, attack cards, block cards, Strike plays and Strike damage of one turn's played cards."""
    hits = attacks = blocks = strikes = strike_damage = 0
    for cid in turn["cards"] or []:
        info = cards.get(cid.rstrip("+"))
        if not info:
            continue
        if info["type"] == "Attack":
            attacks += 1
            h = info["hits"]
            h = (turn.get("energy") or 3) if h == "X" else h
            hits += h
            if info["strike"]:
                strikes += 1
                strike_damage += info["damage"] * h
        if info["block"]:
            blocks += 1
    return hits, attacks, blocks, strikes, strike_damage


def compute_rates(turns, fights, cards):
    """The conversion inputs of one (ascension, act) from its boss fights.

    turns: [{fight, turn, last, dmg (enemy HP drop to the next turn start, None on the last turn), loss
    (HP lost in the enemy turn), intent, end_block, energy (start of turn), cards [ids], cards_n (plays,
    including the ones whose card id is unknown)}]
    fights: [{fight, turns, max_hp, deck}]
    Only the non-last turns count (the last turn is cut short by the kill or the death)."""
    body = [t for t in turns if not t["last"] and t["dmg"] is not None and t["loss"] is not None]
    if not body or not fights:
        return None
    counts = [turn_counts(t, cards) for t in body]
    D = mean([t["dmg"] for t in body])
    L = mean([t["loss"] for t in body])
    hit_losses = [t["loss"] for t in body if t["loss"] > 0]
    C = mean([t["cards_n"] if t.get("cards_n") is not None else len(t["cards"] or []) for t in body])
    E = mean([t["energy"] for t in body if t["turn"] > 1 and t["energy"]])
    B = mean([t["end_block"] for t in body])
    strike_plays = sum(c[3] for c in counts)
    rates = {
        "fights": len(fights),
        "turns_n": len(body),
        "T": round(median([f["turns"] for f in fights]), 1),
        "D": D,
        "L": L,
        "r": L / D if D else None,
        "hit_share": len(hit_losses) / len(body),
        "L_hit": mean(hit_losses),
        "I": mean([t["intent"] for t in body]),
        "h": mean([c[0] for c in counts]),
        "a": mean([c[1] for c in counts]),
        "b": mean([c[2] for c in counts]),
        "C": C,
        "E": E,
        "B": B,
        "max_hp": median([f["max_hp"] for f in fights]),
        "deck": median([f["deck"] for f in fights]),
        "s": strike_plays / len(body),
        "sd": sum(c[4] for c in counts) / strike_plays if strike_plays else 0,
    }
    # Per-turn samples for the capped (min) formulas: (loss, intent, end_block, block cards).
    rates["_turns"] = [(t["loss"], t["intent"] or 0, t["end_block"] or 0, c[2]) for t, c in zip(body, counts)]
    # One more average card / energy, marginal: its damage × r, plus its block capped by what the turn lets through.
    rates["v_card"] = marginal(rates, rates["C"])
    rates["v_energy"] = marginal(rates, rates["E"])
    return rates


def marginal(rates, per):
    if not per:
        return None
    share_block = rates["B"] / per
    return (rates["D"] / per) * rates["r"] + mean([min(share_block, loss) for loss, _i, _b, _n in rates["_turns"]])


def capped(rates, amount_of, hit_only=False):
    """Mean over the turns (the hit turns only: loss > 0) of min(amount_of(turn), loss)."""
    rows = [row for row in rates["_turns"] if row[0] > 0] if hit_only else rates["_turns"]
    return mean([min(amount_of(row), row[0]) for row in rows]) or 0.0


def turns_saved(rates, extra):
    """Fight turns saved by `extra` damage every turn: T·X / (D + X)."""
    T, D = rates["T"], rates["D"]
    return T * extra / (D + extra) if D + extra > 0 else 0.0


# ---------------------------------------------------------------- potion values (pure)

def potion_value(pid, kind, values, rates, extras=None):
    """{hp, damage, block, source, formula, inputs} of one potion in one act's boss fight, or None.

    hp: HP saved (or healed) in the boss fight; damage = hp / r; block = hp (1:1). source: "公式" (a
    formula on the logged inputs) or "估" (an estimate constant, or the logged Monte Carlo).
    `extras`: {"mc": {pid: {hp, dmg, n}}, "entropic_slots": x, "pool_mean_hp": y} (log-derived)."""
    extras = extras or {}
    r, T, L = rates["r"], rates["T"], rates["L"]
    v = values
    R1 = lambda x: round(x, 1)  # noqa: E731
    estimate = False
    inputs = {}

    def by_damage(dmg, text):
        return dmg * r, dmg, text

    if kind == "damage":
        dmg = v["Damage"]
        self_hit = dmg if pid == "FOUL_POTION" else 0
        hp = dmg * r - self_hit
        text = f"{dmg} 伤害 × r {r:.3f}" + (f" − 自伤 {self_hit}" if self_hit else "") + ("（群体：按 boss 单体算）" if pid in ("EXPLOSIVE_AMPOULE", "FOUL_POTION") else "")
        inputs = {"Damage": dmg}
        return finish(hp, hp / r, text, inputs, estimate, r)
    if kind in ("demise", "strength_fight", "ritual", "stew"):
        if kind == "demise":
            extra, what = v["Demise"], f"每回合 {v['Demise']} 点（消亡）"
        elif kind == "strength_fight":
            extra, what = v["StrengthPower"] * rates["h"], f"{v['StrengthPower']} 力量 × 每回合 {R1(rates['h'])} 段"
        elif kind == "ritual":
            avg = v["RitualPower"] * (T - 1) / 2
            extra, what = avg * rates["h"], f"仪式 {v['RitualPower']}：平均力量 {R1(avg)} × 每回合 {R1(rates['h'])} 段"
        else:
            extra, what = rates["s"] * rates["sd"], f"每回合 {R1(rates['s'])} 次打击 × 每次 {R1(rates['sd'])} 伤害（重放一次）"
        saved = turns_saved(rates, extra)
        hp = saved * L
        text = f"{what} = 每回合多 {R1(extra)} 伤害；战斗 {T} 回合缩短 T·X/(D+X) = {saved:.2f} 回合 × 每回合 {R1(L)} 血"
        return finish(hp, saved * rates["D"], text, {"extra_per_turn": R1(extra)}, False, r)
    if kind == "strength_turn":
        dmg = v["StrengthPower"] * rates["h"]
        return finish(dmg * r, dmg, f"{v['StrengthPower']} 力量 × 本回合 {R1(rates['h'])} 段 = {R1(dmg)} 伤害 × r", {}, False, r)
    if kind == "triple_attack":
        avg = rates["D"] / rates["a"] if rates["a"] else 0
        dmg = 2 * avg
        return finish(dmg * r, dmg, f"下一张攻击三倍：多 2 × 每张攻击牌 {R1(avg)} 伤害 = {R1(dmg)} × r", {}, False, r)
    if kind == "vuln":
        turns = min(v["VulnerablePower"], T)
        dmg = VULN_FACTOR * rates["D"] * turns
        return finish(dmg * r, dmg, f"易伤 {turns} 回合 × 我方每回合 {R1(rates['D'])} 伤害 × 50%", {}, False, r)
    if kind == "weak":
        turns = min(v["WeakPower"], T)
        per = capped(rates, lambda row: WEAK_FACTOR * row[1])
        return finish(per * turns, per * turns / r, f"虚弱 {turns} 回合 × 每回合 min(25% × 敌方意图, 打进来的) = {R1(per)} 血", {}, False, r)
    if kind == "shrink":
        turns = min(v["Repeat"], T)
        share = v["DamageDecrease"] / 100
        per = capped(rates, lambda row: share * row[1])
        return finish(per * turns, per * turns / r, f"敌方攻击 −{v['DamageDecrease']}% × {turns} 回合：每回合 min({v['DamageDecrease']}% × 意图, 打进来的) = {R1(per)} 血", {}, False, r)
    if kind == "binding":
        dmg = VULN_FACTOR * rates["D"] * min(v["VulnerablePower"], T)
        weak = capped(rates, lambda row: WEAK_FACTOR * row[1]) * min(v["WeakPower"], T)
        hp = dmg * r + weak
        return finish(hp, hp / r, f"易伤 {v['VulnerablePower']} 回合（{R1(dmg)} 伤害 × r）+ 虚弱 {v['WeakPower']} 回合（{R1(weak)} 血）", {}, False, r)
    if kind == "enemy_str_turn":
        per_hit = v["StrengthPower"] * ENEMY_HITS
        hp = capped(rates, lambda row: per_hit, hit_only=True)
        return finish(hp, hp / r, f"本回合敌方每段 −{v['StrengthPower']}，按每回合 {ENEMY_HITS} 段（估）：挨打回合 min({per_hit}, 打进来的)", {}, True, r)
    if kind == "block":
        amount = v["Block"]
        hp = capped(rates, lambda row: amount, hit_only=True)
        text = f"{amount} 格挡，挨打回合 min({amount}, 打进来的)"
        if pid == "SHIP_IN_A_BOTTLE":
            hp += capped(rates, lambda row: amount)
            text += f" + 下回合 {amount} 格挡 min({amount}, 打进来的)"
        return finish(hp, hp / r, text, {"Block": amount}, False, r)
    if kind == "triple_block":
        hp = capped(rates, lambda row: 2 * row[2], hit_only=True)
        return finish(hp, hp / r, f"格挡变三倍：挨打回合 min(2 × 回合末格挡（均 {R1(rates['B'])}）, 打进来的)", {}, False, r)
    if kind == "plating":
        stacks = v["PlatingPower"]
        hp = sum(capped(rates, lambda row, k=k: stacks - k) for k in range(int(min(stacks, T))))
        return finish(hp, hp / r, f"覆甲 {stacks}：每回合 {stacks}、{stacks - 1}…格挡，各回合 min(当回合格挡, 打进来的) 相加（{int(min(stacks, T))} 回合）", {}, False, r)
    if kind == "thorns":
        attack_share = mean([1 if row[1] > 0 else 0 for row in rates["_turns"]]) or 0
        extra = v["ThornsPower"] * ENEMY_HITS * attack_share
        saved = turns_saved(rates, extra)
        return finish(saved * L, saved * rates["D"], f"荆棘 {v['ThornsPower']} × 每回合 {ENEMY_HITS} 段（估）× 敌方攻击回合占 {attack_share:.0%} = 每回合 {R1(extra)} 伤害，缩短 {saved:.2f} 回合 × {R1(L)} 血", {}, True, r)
    if kind == "buffer":
        hp = rates["L_hit"] or 0
        return finish(hp, hp / r, f"缓冲 {v['BufferPower']}：挡掉下一次掉血，按挨打回合平均打进来的 {R1(hp)}", {}, False, r)
    if kind == "dex_fight":
        per = capped(rates, lambda row: v["DexterityPower"] * row[3])
        hp = per * T
        return finish(hp, hp / r, f"{v['DexterityPower']} 敏捷 × 每回合格挡牌数，每回合 min(多的格挡, 打进来的) = {R1(per)} 血 × {T} 回合", {}, False, r)
    if kind == "dex_turn":
        hp = capped(rates, lambda row: v["DexterityPower"] * row[3], hit_only=True)
        return finish(hp, hp / r, f"本回合 {v['DexterityPower']} 敏捷 × 格挡牌数，挨打回合 min(多的格挡, 打进来的)", {}, False, r)
    if kind == "fysh":
        strength = potion_value(pid, "strength_fight", {"StrengthPower": v["StrengthPower"]}, rates)
        dex = potion_value(pid, "dex_fight", {"DexterityPower": v["DexterityPower"]}, rates)
        hp = strength["hp"] + dex["hp"]
        return finish(hp, hp / r, f"力量 {v['StrengthPower']}（{strength['hp']} 血）+ 敏捷 {v['DexterityPower']}（{dex['hp']} 血）", {}, False, r)
    if kind == "heal_pct":
        hp = v["HealPercent"] / 100 * rates["max_hp"]
        return finish(hp, hp / r, f"回复 {v['HealPercent']}% × 最大生命 {rates['max_hp']}", {}, False, r)
    if kind == "fairy":
        hp = 0.30 * rates["max_hp"]
        return finish(hp, hp / r, f"濒死时回复 30% × 最大生命 {rates['max_hp']}（只在要死时起作用，估）", {}, True, r)
    if kind == "regen":
        n = int(min(v["RegenPower"], T))
        hp = sum(v["RegenPower"] - k for k in range(n))
        return finish(hp, hp / r, f"再生 {v['RegenPower']}：{'+'.join(str(v['RegenPower'] - k) for k in range(n))}", {}, False, r)
    if kind == "max_hp":
        hp = v["MaxHp"]
        return finish(hp, hp / r, f"最大生命 +{hp}（永久，什么时候喝都一样）", {}, False, r)
    if kind == "extra_turn":
        hp = rates["v_card"] * rates["C"]
        return finish(hp, hp / r, f"战斗中额外一回合 ≈ 一回合的牌 {R1(rates['C'])} 张 × 每张 {rates['v_card']:.2f} 血（回血比例未知，没算）", {}, True, r)

    # ---- estimates: energy, draw, cards (marginal card / energy value)
    vc, ve = rates["v_card"], rates["v_energy"]
    vd = vc * DRAW_PLAY_SHARE
    unit = f"每张牌 {vc:.2f} 血、每点能量 {ve:.2f} 血、抽到的牌打出 {DRAW_PLAY_SHARE:.0%}"
    later_turns = lambda n: min(n, max(T - 1, 0))  # noqa: E731
    if kind == "energy":
        now = v.get("Energy", 0)
        later = later_turns(v.get("RadiancePower", 0))
        return finish((now + later) * ve, (now + later) * ve / r, f"能量 {now}{f' + 之后 {later} 回合各 1' if later else ''} × 每点能量 {ve:.2f} 血", {}, True, r)
    if kind == "energy_draw":
        hp = v["Energy"] * ve + v["Cards"] * vd
        return finish(hp, hp / r, f"能量 {v['Energy']} × {ve:.2f} + 抽 {v['Cards']} × {vd:.2f}（{unit}）", {}, True, r)
    if kind == "draw":
        now = v["Cards"]
        later = later_turns(v.get("ClarityPower", 0))
        hp = (now + later) * vd
        return finish(hp, hp / r, f"抽 {now}{f' + 之后 {later} 回合各 1' if later else ''} × {vd:.2f}（{unit}）", {}, True, r)
    if kind == "snecko":
        cards = min(v["Cards"], HAND_LIMIT - HAND_SIZE)
        return finish(cards * vd, cards * vd / r, f"抽 {v['Cards']} 张但手牌上限 {HAND_LIMIT}（手里 {HAND_SIZE}）= {cards} 张 × {vd:.2f}；耗能随机不计", {}, True, r)
    if kind == "glowwater":
        cards = v["Cards"] - HAND_SIZE
        return finish(cards * vd, cards * vd / r, f"消耗手牌再抽 {v['Cards']}：净多 {cards} 张 × {vd:.2f}", {}, True, r)
    if kind in ("redraw", "gamble", "ashwater"):
        return finish(vd, vd / r, f"换牌（净 0 张），挑牌的好处按 1 张抽牌 {vd:.2f}", {}, True, r)
    if kind == "retain":
        cards = v["Repeat"]
        return finish(cards * vd, cards * vd / r, f"保留手牌 {cards} 回合，按每回合多 1 张抽牌 × {vd:.2f}", {}, True, r)
    if kind == "chaos":
        cards = v["Repeat"]
        return finish(cards * vc, cards * vc / r, f"免费打出牌堆顶 {cards} 张 × 每张 {vc:.2f}", {}, True, r)
    if kind == "pick_draw":
        return finish(vc, vc / r, f"从抽牌堆挑 1 张（要付费）≈ 1 张牌 {vc:.2f}", {}, True, r)
    if kind == "pick_discard_free":
        return finish(vc + ve, (vc + ve) / r, f"弃牌堆挑 1 张、本回合免费 ≈ 1 张牌 {vc:.2f} + 1 能量 {ve:.2f}", {}, True, r)
    if kind == "duplicate":
        hp = EXPENSIVE_CARD_COST * ve
        return finish(hp, hp / r, f"下一张牌打两次：按一张 {EXPENSIVE_CARD_COST} 费牌 = {EXPENSIVE_CARD_COST} × {ve:.2f}", {}, True, r)
    if kind == "free_forever":
        plays = 1 + (T - 1) * HAND_SIZE / rates["deck"] if rates["deck"] else 1
        hp = EXPENSIVE_CARD_COST * plays * ve
        return finish(hp, hp / r, f"一张 {EXPENSIVE_CARD_COST} 费牌整场免费：打出约 1 + (T−1)×{HAND_SIZE}/牌组 {rates['deck']} = {plays:.1f} 次 × {EXPENSIVE_CARD_COST} 能量 × {ve:.2f}", {}, True, r)
    if kind == "forge":
        plays = 1 + (T - 1) * HAND_SIZE / rates["deck"] if rates["deck"] else 1
        hp = HAND_SIZE * FORGE_UPGRADE_GAIN * vc * plays
        return finish(hp, hp / r, f"手牌 {HAND_SIZE} 张升级：每次打出多 {FORGE_UPGRADE_GAIN:.0%} × {vc:.2f}，约打出 {plays:.1f} 次", {}, True, r)
    if kind in ("choice", "choice3", "choice_power"):
        cards = 3 if kind == "choice3" else 1
        hp = cards * (vc + ve)
        text = f"{cards} 张免费牌 × (1 张牌 {vc:.2f} + 1 能量 {ve:.2f})"
        if kind in ("choice3", "choice_power"):
            lasting = potion_value(pid, "strength_fight", {"StrengthPower": POWER_LASTING_STRENGTH}, rates)["hp"]
            hp += lasting
            text += f" + 能力牌持续部分按整场 {POWER_LASTING_STRENGTH} 力量 {lasting}"
        return finish(hp, hp / r, text, {}, True, r)
    if kind == "entropic":
        slots, pool = extras.get("entropic_slots"), extras.get("pool_mean_hp")
        if slots is None or pool is None:
            return None
        hp = slots * pool
        return finish(hp, hp / r, f"空栏位平均 {slots:.1f} 个（日志）× 药水池平均持有价值 {pool:.1f} 血", {}, True, r)
    raise ValueError(f"unknown kind {kind} for {pid}")


def finish(hp, damage, formula, inputs, estimate, r):
    return {
        "hp": round(hp, 1),
        "damage": round(damage, 1),
        "block": round(hp, 1),
        "hold_hp": round(max(0.0, hp), 1),
        "source": "估" if estimate else "公式",
        "formula": formula,
        **({"inputs": inputs} if inputs else {}),
    }


def mc_check(pid, rates, mc):
    """The second check column: the logged Monte Carlo this-turn gain of a random potion (HP saved + damage
    gained × r, mean over every combat question it was held on), or None. Not adopted: most of those turns
    are ones nobody would drink it on, so the mean understates a well-timed drink; it leaves out lasting
    parts (Clarity's later draws, a Power card)."""
    row = mc.get(pid)
    if not row:
        return None
    return {"hp": round(row["hp"] + row["dmg"] * rates["r"], 1), "n": row["n"]}


# ---------------------------------------------------------------- the check column (rollout numbers)

LOSS_RE = re.compile(r"expected further HP loss ([\d.]+)")
DEAD_RE = re.compile(r"dead within \d+ turns? in (\d+)/(\d+)")
# A random potion's option ("p1": drink it now, then re-plan): no potions_used, a Monte Carlo sample line.
RANDOM_KEY = re.compile(r"^p\d+$")


def rollout_numbers(facts):
    """(deaths share, expected further HP loss) of an option's rollout text, or None (no rollout, fallback)."""
    text = facts.get("rollout") if isinstance(facts, dict) else None
    if not isinstance(text, str) or text.startswith("no rollout"):
        return None
    loss = LOSS_RE.search(text)
    if not loss:
        return None
    dead = DEAD_RE.search(text)
    return (int(dead.group(1)) / int(dead.group(2)) if dead else 0.0, float(loss.group(1)))


def option_potions(key, facts, names):
    """The potion ids an option drinks: potions_used (「A, B」 names) or a random potion's 「drink X now」."""
    used = facts.get("potions_used")
    found = []
    if isinstance(used, str) and used != "none":
        found = [names.get(name.strip()) for name in used.split(", ")]
    elif RANDOM_KEY.match(key):
        match = re.match(r"drink (.+?) now", str(facts.get("plays", "")))
        if match:
            found = [names.get(match.group(1).strip())]
    return [pid for pid in found if pid]


def drink_delta(criteria, choice, pid, names):
    """Δ = the best no-drink line's expected further HP loss − the chosen drink line's (fewest deaths first,
    as notes/potion-drinks-2026-09-29.md), or None. Positive: drinking now saves HP."""
    parsed = {}
    for key, text in criteria.items():
        try:
            facts = json.loads(text) if isinstance(text, str) else text
        except ValueError:
            continue
        if isinstance(facts, dict):
            parsed[key] = facts
    chosen = parsed.get(choice)
    if not chosen or option_potions(choice, chosen, names) != [pid]:
        return None
    drink = rollout_numbers(chosen)
    dry = [rollout_numbers(f) for k, f in parsed.items() if not RANDOM_KEY.match(k) and f.get("potions_used") == "none"]
    dry = [d for d in dry if d is not None]
    if drink is None or not dry:
        return None
    best = min(dry)
    return best[1] - drink[1]


# ---------------------------------------------------------------- log database

def fetch(con, sql):
    cur = con.execute(sql)
    cols = [c[0] for c in cur.description]
    return [dict(zip(cols, row)) for row in cur.fetchall()]


def load_logs(con, ascensions):
    ascs = ",".join(str(a) for a in sorted(set(ascensions)))
    turns = fetch(con, f"""
        WITH b AS (
          SELECT t.*, lead(enemy_hp) OVER (PARTITION BY run_id, fight_no ORDER BY turn) AS next_enemy_hp
          FROM turns t WHERE room = 'boss' AND ascension IN ({ascs}))
        SELECT ascension, act, run_id || ':' || fight_no AS fight, turn, last_turn AS last,
               CASE WHEN next_enemy_hp IS NULL THEN NULL ELSE greatest(enemy_hp - next_enemy_hp, 0) END AS dmg,
               enemy_turn_hp_lost AS loss, intent_damage AS intent, end_block, start_energy AS energy, cards_played AS cards, cards_n
        FROM b""")
    fights = fetch(con, f"""
        SELECT ascension, act, run_id || ':' || fight_no AS fight, turns, max_hp, deck_size AS deck, outcome
        FROM fights WHERE room = 'boss' AND ascension IN ({ascs}) AND turns IS NOT NULL""")
    seen = fetch(con, """
        WITH s AS (SELECT DISTINCT run_id, unnest(potions) AS id FROM frames WHERE potions IS NOT NULL)
        SELECT id, count(*) AS runs FROM s GROUP BY 1""")
    drinks = fetch(con, "SELECT potion_id AS id, count(*) AS n FROM decisions WHERE action = 'use_potion' AND potion_id IS NOT NULL GROUP BY 1")
    boss_drinks = fetch(con, f"""
        WITH u AS (SELECT ascension, unnest(potions_used) AS id FROM turns WHERE room = 'boss' AND ascension IN ({ascs}))
        SELECT id, ascension, count(*) AS n FROM u GROUP BY 1, 2""")
    entropic = fetch(con, """
        SELECT avg(potion_slots - len(potions) + 1) AS slots, count(*) AS n FROM frames
        WHERE list_contains(potions, 'ENTROPIC_BREW') AND potion_slots IS NOT NULL""")
    # Every combat question of these ascensions (the Monte Carlo summaries) and the boss drinks (the check).
    questions = fetch(con, f"""
        SELECT d.off, d.run_id, d.floor, d.turn, f.act, f.ascension, f.room
        FROM decisions d JOIN fights f ON f.run_id = d.run_id AND f.floor = d.floor
        WHERE d.label LIKE 'combat/plan-choice%' AND f.ascension IN ({ascs}) ORDER BY d.off""")
    boss_drink_rows = fetch(con, f"""
        SELECT d.off, d.run_id, d.floor, d.turn, d.label, d.potion_id, f.act, f.ascension
        FROM decisions d JOIN fights f ON f.run_id = d.run_id AND f.floor = d.floor AND f.room = 'boss'
        WHERE d.action = 'use_potion' AND d.potion_id IS NOT NULL AND f.ascension IN ({ascs}) ORDER BY d.off""")
    last = fetch(con, "SELECT max(last_ts) AS last, count(*) AS n FROM fights")[0]
    return {
        "turns": turns, "fights": fights, "seen": {r["id"]: r["runs"] for r in seen}, "drinks": {r["id"]: r["n"] for r in drinks},
        "boss_drinks": boss_drinks, "entropic": entropic[0], "questions": questions, "boss_drink_rows": boss_drink_rows,
        "last_fight": str(last["last"]), "all_fights": last["n"],
    }


def read_raw(handle, off):
    handle.seek(off)
    return json.loads(handle.readline())


def load_shop_offers(con, states_handle, min_asc=GOLD_PRICE_MIN_ASC):
    """The potion offers of the logged shop visits from `min_asc` up: [{id, rarity, price, act, asc}], one visit's offers
    from the first of its SHOP frames (up to SHOP_FRAMES_PER_VISIT) that lists priced potions; and the visits read."""
    visits = fetch(con, f"""
        SELECT si.run_id, si.floor, any_value(si.act) AS act, any_value(r.ascension) AS asc,
               list(si.off ORDER BY si.off) AS offs, list(si.len ORDER BY si.off) AS lens
        FROM state_index si JOIN runs r ON r.run_id = si.run_id
        WHERE si.screen = 'SHOP' AND r.ascension >= {int(min_asc)} GROUP BY 1, 2 ORDER BY 1, 2""")
    offers = []
    seen = 0
    for visit in visits:
        for off, length in list(zip(visit["offs"], visit["lens"]))[:SHOP_FRAMES_PER_VISIT]:
            states_handle.seek(off)
            state = (json.loads(states_handle.read(length)) or {}).get("state") or {}
            potions = [p for p in ((state.get("shop") or {}).get("potions") or []) if isinstance(p.get("price"), (int, float)) and p.get("potion_id")]
            if potions:
                seen += 1
                offers.extend({"id": p["potion_id"], "rarity": p.get("rarity"), "price": p["price"], "act": visit["act"], "asc": visit["asc"]} for p in potions)
                break
    return offers, seen


def gold_rates(offers, visits, entry, ascensions):
    """meta.gold_hp: HP a gold coin is worth per ascension and act = the median held value (hold_hp) of the offered
    potions in that act ÷ the median offer price (A8+ pooled). None without offers."""
    prices = [o["price"] for o in offers]
    if not prices:
        return None
    price = median(prices)
    by_rarity = collections.defaultdict(list)
    for o in offers:
        by_rarity[o["rarity"] or "?"].append(o["price"])
    out = {
        "price": {"median": price, "n": len(prices), "visits": visits, "min_asc": GOLD_PRICE_MIN_ASC, "by_rarity": {k: {"median": median(v), "n": len(v)} for k, v in sorted(by_rarity.items())}},
        "by_asc": {},
        "formula": "gold × hold_hp ÷ price: hold_hp = the median held value (血) of the shop-offered potions in this act at this ascension, price = the median shop potion price (A8+)",
        "note": "金币的血量价值（Dai 2026-10-02，THIEF_COST，docs/thief.md §7）：金币 ÷ A8+ 商店药水价格中位 × 本幕本进阶商店药水持有价值中位。小偷（地精佣兵 / 胖地精）带走的金币按它折血。",
    }
    for asc in ascensions:
        for act in ACTS:
            values = [((entry.get(o["id"]) or {}).get("by_asc") or {}).get(str(asc), {}).get(str(act), {}).get("hold_hp") for o in offers]
            values = [v for v in values if v is not None]
            if not values:
                continue
            hold = median(values)
            out["by_asc"].setdefault(str(asc), {})[str(act)] = {
                "per_gold": round(hold / price, 4),
                "hold_hp": round(hold, 2),
                "n": len(values),
                "formula": f"{round(hold, 2):g} 血（商店药水持有价值中位，n={len(values)}）÷ {price:g} 金币（A8+ 商店药水价格中位）",
            }
    return out


def mc_summaries(questions, handle):
    """{asc: {potion: {hp, dmg, n}}}: mean hp_saved_mean / dmg_gained_mean of the logged Monte Carlo runs
    (every combat question of that ascension: the boss fights alone have too few)."""
    acc = collections.defaultdict(lambda: collections.defaultdict(list))
    for q in questions:
        handle.seek(q["off"])
        line = handle.readline()
        if b'"random"' not in line:
            continue
        row = json.loads(line)
        for entry in (row.get("potions") or {}).get("random") or []:
            if isinstance(entry.get("hp_saved_mean"), (int, float)) and isinstance(entry.get("dmg_gained_mean"), (int, float)):
                acc[q["ascension"]][entry["potion"]].append((entry["hp_saved_mean"], entry["dmg_gained_mean"]))
    return {asc: {pid: {"hp": mean([x[0] for x in rows]), "dmg": mean([x[1] for x in rows]), "n": len(rows)} for pid, rows in by.items()} for asc, by in acc.items()}


def check_column(boss_drink_rows, questions, handle, names):
    """{(asc, act, pid): [Δ …]} over the boss drinks: the drink decision's own question, or (a drink that
    continues a plan) the latest plan question of that run, floor and turn before it. One Δ per question."""
    by_turn = collections.defaultdict(list)
    for q in questions:
        by_turn[(q["run_id"], q["floor"], q["turn"])].append(q["off"])
    seen = set()
    out = collections.defaultdict(list)
    for d in boss_drink_rows:
        candidates = [off for off in by_turn.get((d["run_id"], d["floor"], d["turn"]), []) if off <= d["off"]]
        for off in reversed(candidates):
            row = read_raw(handle, off)
            criteria = ((row.get("questions") or {}).get("plan") or {}).get("criteria")
            choice = ((row.get("answers") or {}).get("plan") or {}).get("choice")
            if not criteria or not choice:
                continue
            delta = drink_delta(criteria, choice, d["potion_id"], names)
            if delta is None:
                continue
            if (off, d["potion_id"]) not in seen:
                seen.add((off, d["potion_id"]))
                out[(d["ascension"], d["act"], d["potion_id"])].append(delta)
            break
    return out


# ---------------------------------------------------------------- assemble

def group_rates(logs, cards, ascensions):
    turns = collections.defaultdict(list)
    fights = collections.defaultdict(list)
    for t in logs["turns"]:
        turns[(t["ascension"], t["act"])].append(t)
    for f in logs["fights"]:
        fights[(f["ascension"], f["act"])].append(f)
    own = {key: compute_rates(turns[key], fights[key], cards) for key in fights}
    out = {}
    for asc in ascensions:
        for act in ACTS:
            rates = own.get((asc, act))
            src = asc
            if not rates or rates["fights"] < MIN_N:
                # Nearest ascension with enough boss fights of this act (the lower one on a tie).
                options = sorted((abs(a - asc), a) for (a, c), rr in own.items() if c == act and rr and rr["fights"] >= MIN_N)
                if not options:
                    continue
                src = options[0][1]
                rates = own[(src, act)]
            out[(asc, act)] = dict(rates, from_asc=src)
    return out


def public_rates(rates):
    keep = ["fights", "turns_n", "T", "D", "L", "r", "hit_share", "L_hit", "I", "h", "a", "b", "C", "E", "B", "max_hp", "deck", "s", "sd", "v_card", "v_energy", "from_asc"]
    return {k: (round(rates[k], 3) if isinstance(rates[k], float) else rates[k]) for k in keep}


def build(logs, potions, cards, values, solver, ascensions, mc, checks):
    rates = group_rates(logs, cards, ascensions)
    boss_drinks = collections.defaultdict(dict)
    for row in logs["boss_drinks"]:
        boss_drinks[row["id"]][str(row["ascension"])] = row["n"]
    entropic = logs["entropic"]
    entry = {}
    # Pass 1: every potion but Entropic Brew (its value is the pool's mean).
    for potion in sorted(potions, key=lambda p: p["id"]):
        pid = potion["id"]
        category, kind = SPECS.get(pid, ("other", None))
        pool = pool_of(potion)
        item = {
            "_pid": pid,
            "name": potion["name"],
            "description": potion.get("description") or "",
            "rarity": potion.get("rarity"),
            "usage": potion.get("usage"),
            "target": potion.get("target_type"),
            "pool": pool,
            "ironclad": pool in IRONCLAD_POOLS,
            "category": category,
            "kind": kind,
            "solver": "exact" if pid == "FAIRY_IN_A_BOTTLE" else solver.get(pid, "none"),
            "values": values.get(pid, {}),
            "log": {"runs_seen": logs["seen"].get(pid, 0), "drinks": logs["drinks"].get(pid, 0), "boss_drinks": boss_drinks.get(pid, {})},
            "timing_free": kind in TIMING_FREE,
            "by_asc": {},
        }
        if kind is None:
            item["note"] = NO_VALUE_NOTE.get(pid, "不在铁甲战士的药水池，日志里没出现" if pool not in IRONCLAD_POOLS else "数值未知")
        entry[pid] = item
    for pid, item in entry.items():
        if item["kind"] in (None, "entropic"):
            continue
        for asc in ascensions:
            for act in ACTS:
                rr = rates.get((asc, act))
                if not rr:
                    continue
                value = value_for(pid, item, rr, mc.get(asc, {}))
                attach(item, asc, act, value, rr, checks)
    for asc in ascensions:
        for act in ACTS:
            rr = rates.get((asc, act))
            if not rr:
                continue
            pool_values = [e["by_asc"][str(asc)][str(act)]["hold_hp"] for e in entry.values() if e["ironclad"] and e["kind"] not in (None, "entropic", "max_hp") and e["rarity"] in ("Common", "Uncommon", "Rare") and str(asc) in e["by_asc"] and str(act) in e["by_asc"][str(asc)]]
            extras = {"entropic_slots": entropic["slots"], "pool_mean_hp": mean(pool_values)}
            value = potion_value("ENTROPIC_BREW", "entropic", {}, rr, extras)
            if value:
                value["inputs"] = {"slots_n": entropic["n"], "pool_potions": len(pool_values)}
                attach(entry["ENTROPIC_BREW"], asc, act, value, rr, checks)
    # The check column pooled over the acts and ascensions (per act it is rarely n >= MIN_N).
    for pid, item in entry.items():
        pooled = [delta for (_asc, _act, key), deltas in sorted(checks.items()) if key == pid for delta in deltas]
        if pooled:
            item["check_all"] = {"median": round(median(pooled), 1), "n": len(pooled)}
    return rates, entry


def value_for(pid, item, rr, mc):
    value = potion_value(pid, item["kind"], item["values"], rr)
    measured = mc_check(pid, rr, mc)
    if value is not None and measured is not None:
        value["mc"] = measured
    return value


def attach(item, asc, act, value, rr, checks):
    if value is None:
        return
    value["n"] = rr["fights"]
    if rr["from_asc"] != asc:
        value["inputs_asc"] = rr["from_asc"]
    deltas = checks.get((asc, act, item["_pid"]), [])
    if deltas:
        value["check"] = {"median": round(median(deltas), 1), "n": len(deltas)}
    item["by_asc"].setdefault(str(asc), {})[str(act)] = value


# ---------------------------------------------------------------- output

PLACEHOLDER_RE = re.compile(r"\{([A-Za-z]+)(?::([A-Za-z]+)\((\d*)\))?\}")


def filled_text(pid, template, values):
    """The effect text with its numbers, for the doc table only (the program fills it with potion-values.ts
    fillPotionText, the one place that does)."""
    def one(match):
        name, fmt, arg = match.group(1), match.group(2), match.group(3)
        value = int(arg) if arg else values.get(name)
        if value is None:
            return "?"
        return f"{value}点能量" if fmt == "energyIcons" else f"{value}颗星" if fmt == "starIcons" else str(value)
    return re.sub(r"\[/?[a-z]+\]", "", PLACEHOLDER_RE.sub(one, template or "")).replace("\n", " ").replace("|", "/")


def markdown_table(entry):
    """The enumeration table of docs/potion-equivalents.md: every potion, its held value (HP) per act at A8 and A9."""
    solver_zh = {"exact": "精确", "mc": "蒙特卡洛", "none": "未建模"}
    usage_zh = {"AnyTime": "能", "CombatOnly": "否", "Automatic": "自动"}
    rows = [
        "| id | 中文名 | 效果（数值已填） | 稀有度 | 战斗外 | 目标 | 类别 | 求解器 | 出现局/喝/boss 喝 A8+A9 | A8 持有价值（血）一/二/三幕 | A9 一/二/三幕 | 来源 | 校验 Δ 中位(n) |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]

    def acts(e, asc):
        cells = [e["by_asc"].get(str(asc), {}).get(str(act)) for act in ACTS]
        return "/".join("—" if c is None else f"{c['hold_hp']:g}" for c in cells)

    def first(e):
        cell = e["by_asc"].get("8", {}).get("1")
        return cell["hold_hp"] if cell else -1

    for pid in sorted(entry, key=lambda p: (-first(entry[p]), p)):
        e = entry[pid]
        cell = e["by_asc"].get("8", {}).get("1")
        source = cell["source"] if cell else (e.get("note") or "—")
        bd = sum(e["log"]["boss_drinks"].values())
        chk = f"{e['check_all']['median']:g}({e['check_all']['n']})" if e.get("check_all") else ""
        rows.append(f"| {pid} | {e['name']} | {filled_text(pid, e['description'], e['values'])} | {e['rarity']} | {usage_zh.get(e['usage'], e['usage'])} | {e['target']} | {CATEGORY_ZH[e['category']]} | {solver_zh[e['solver']]} | {e['log']['runs_seen']}/{e['log']['drinks']}/{bd} | {acts(e, 8)} | {acts(e, 9)} | {source} | {chk} |")
    return "\n".join(rows)


def rates_table(rates):
    """The conversion rates of docs/potion-equivalents.md §3."""
    rows = ["| 进阶·幕 | boss 战 n | 回合 T | 我方每回合伤害 D | boss 每回合打进来 L | r = L/D | 挨打回合占比 / 平均 | 每回合攻击段数 h | 格挡牌数 b | 出牌数 C | 能量 E | 每张牌 / 每点能量（血） | 输入来自 |", "|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for (asc, act), r in sorted(rates.items()):
        rows.append(f"| A{asc} {act} 幕 | {r['fights']}（{r['turns_n']} 回合） | {r['T']:g} | {r['D']:.1f} | {r['L']:.1f} | {r['r']:.3f} | {r['hit_share']:.0%} / {r['L_hit']:.1f} | {r['h']:.2f} | {r['b']:.2f} | {r['C']:.2f} | {r['E']:.2f} | {r['v_card']:.2f} / {r['v_energy']:.2f} | A{r['from_asc']} |")
    return "\n".join(rows)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--out", default=DEFAULT_OUT)
    parser.add_argument("--db", default=None)
    parser.add_argument("--logs", default=None)
    parser.add_argument("--no-sync", action="store_true")
    parser.add_argument("--markdown", action="store_true", help="also print the rates and the enumeration tables for docs/potion-equivalents.md")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--ascensions", default="", help="more ascensions to give numbers for, comma-separated (the run's TARGET_ASCENSION: tools/refresh-potion-equivalents.sh); always 8 and 9. One with too few boss fights borrows the nearest one's inputs")
    args = parser.parse_args(argv)
    if args.self_test:
        return self_test()
    ascensions = tuple(sorted(set(ASCENSIONS) | {int(a) for a in args.ascensions.split(",") if a.strip()}))

    sys.path.insert(0, os.path.join(ROOT, "agent", "tools", "logdb"))
    import query as logquery  # noqa: E402  (needs duckdb: run with .cache/logdb-venv/bin/python)
    import sync as logsync  # noqa: E402

    db = os.path.abspath(args.db or os.environ.get("LOGDB_DIR", logsync.DEFAULT_DB))
    logs_dir = os.path.abspath(args.logs or os.environ.get("LOGDB_LOGS", logsync.DEFAULT_LOGS))
    logsync.be_gentle()
    if not args.no_sync:
        logsync.sync(logs_dir, db, quiet=True, wait=True)
    potions, cards = load_game_data()
    values = parse_potion_values()
    solver = solver_models()
    names = {p["name"]: p["id"] for p in potions}
    names.update({p["id"]: p["id"] for p in potions})
    with logsync.read_lock(db, shared=True):
        con = logquery.connect(db, threads=2)
        logs = load_logs(con, ascensions)
    with open(os.path.join(logs_dir, "decisions.jsonl"), "rb") as handle:
        mc = mc_summaries(logs["questions"], handle)
        checks = check_column(logs["boss_drink_rows"], logs["questions"], handle, names)
    rates, entry = build(logs, potions, cards, values, solver, ascensions, mc, checks)
    # The gold rate (THIEF_COST): the logged shop visits' potion offers (states.jsonl by offset, read-only).
    with logsync.read_lock(db, shared=True):
        con = logquery.connect(db, threads=2)
        with open(os.path.join(logs_dir, "states.jsonl"), "rb") as handle:
            offers, shop_visits = load_shop_offers(con, handle)
    gold = gold_rates(offers, shop_visits, entry, ascensions)
    if gold is None:
        print("warning: no shop potion offers in the logs: no gold rate (meta.gold_hp)", file=sys.stderr)
    # Potion ids the logs hold or drink that the game data does not list (none on 2026-09-30).
    unknown = sorted((set(logs["seen"]) | set(logs["drinks"])) - set(entry))
    if unknown:
        print(f"warning: potion ids in the logs but not in the game data: {', '.join(unknown)}", file=sys.stderr)
    for item in entry.values():
        item.pop("_pid", None)
    out = {
        "meta": {
            "generator": "tools/build-potion-equivalents.py",
            "generated": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "doc": "docs/potion-equivalents.md",
            "logs": {"boss_fights": len(logs["fights"]), "all_fights": logs["all_fights"], "last_fight": logs["last_fight"], "potion_ids_seen": len(set(logs["seen"]) | set(logs["drinks"])), "unknown_potion_ids": unknown},
            "ascensions": list(ascensions),
            "min_n": MIN_N,
            "constants": {"DRAW_PLAY_SHARE": DRAW_PLAY_SHARE, "HAND_SIZE": HAND_SIZE, "HAND_LIMIT": HAND_LIMIT, "ENEMY_HITS": ENEMY_HITS, "POWER_LASTING_STRENGTH": POWER_LASTING_STRENGTH, "FORGE_UPGRADE_GAIN": FORGE_UPGRADE_GAIN, "EXPENSIVE_CARD_COST": EXPENSIVE_CARD_COST, "WEAK_FACTOR": WEAK_FACTOR, "VULN_FACTOR": VULN_FACTOR},
            **({"gold_hp": gold} if gold else {}),
            "note": "每瓶药在本幕 boss 战里值多少：hp = 省下（或回复）的血，damage = hp ÷ r，block = hp（1:1）；hold_hp = max(0, hp) 是持有价值。source 公式 = 日志输入代公式，估 = 公式里有估计常数（meta.constants）；n = 输入用到的 boss 战场数；inputs_asc = 输入借自另一进阶。check = boss 战喝这瓶时「喝」和「不喝」两条推演线整场掉血之差（不喝的线后面几回合仍可能喝它，所以量的是时机，不是持有价值），mc = 随机药水的蒙特卡洛本回合平均增益（拿着它的每一问都算），两者只作校验，不采用。",
        },
        "rates": {str(asc): {str(act): public_rates(rates[(asc, act)]) for act in ACTS if (asc, act) in rates} for asc in ascensions},
        "potions": entry,
    }
    text = json.dumps(out, ensure_ascii=False, indent=1, sort_keys=True) + "\n"
    tmp = args.out + ".tmp"
    with open(tmp, "w", encoding="utf8") as handle:
        handle.write(text)
    os.replace(tmp, args.out)
    n_checks = sum(len(deltas) for deltas in checks.values())
    print(f"wrote {args.out}: {len(entry)} potions, rates for {len(out['rates'])} ascensions, {len(logs['fights'])} boss fights, {n_checks} boss drinks with rollout numbers ({len(logs['boss_drink_rows'])} boss drinks)")
    if gold:
        print(f"gold rate: potion price {gold['price']['median']:g} (n={gold['price']['n']}, {shop_visits} shop visits); " + ", ".join(f"A{asc} act {act} {cell['per_gold']:.3f} HP/gold" for asc, acts in gold["by_asc"].items() for act, cell in acts.items()))
    if args.markdown:
        print(rates_table(rates))
        print()
        print(markdown_table(entry))
    return 0


# ---------------------------------------------------------------- self-test

def self_test():
    failures = []

    def check(name, got, want, tol=0.05):
        if got is None or abs(got - want) > tol:
            failures.append(f"{name}: got {got}, want {want}")

    cards = {
        "STRIKE": {"type": "Attack", "hits": 1, "damage": 6, "block": False, "strike": True},
        "TWIN": {"type": "Attack", "hits": 2, "damage": 5, "block": False, "strike": True},
        "WHIRL": {"type": "Attack", "hits": "X", "damage": 5, "block": False, "strike": False},
        "DEFEND": {"type": "Skill", "hits": 0, "damage": 0, "block": True, "strike": False},
    }
    # Two fights: 4 body turns (dmg 20/20/30/10, loss 10/0/6/0) and a last turn.
    turns = [
        {"fight": "a", "turn": 1, "last": False, "dmg": 20, "loss": 10, "intent": 20, "end_block": 10, "energy": 0, "cards": ["STRIKE", "DEFEND"]},
        {"fight": "a", "turn": 2, "last": False, "dmg": 20, "loss": 0, "intent": 0, "end_block": 0, "energy": 3, "cards": ["TWIN", "STRIKE"]},
        {"fight": "a", "turn": 3, "last": True, "dmg": None, "loss": None, "intent": 5, "end_block": 0, "energy": 3, "cards": ["STRIKE"]},
        {"fight": "b", "turn": 1, "last": False, "dmg": 30, "loss": 6, "intent": 12, "end_block": 6, "energy": 0, "cards": ["WHIRL", "DEFEND"]},
        {"fight": "b", "turn": 2, "last": False, "dmg": 10, "loss": 0, "intent": 8, "end_block": 8, "energy": 3, "cards": ["DEFEND", "DEFEND"]},
    ]
    fights = [{"fight": "a", "turns": 3, "max_hp": 80, "deck": 20}, {"fight": "b", "turns": 5, "max_hp": 90, "deck": 20}]
    rates = compute_rates(turns, fights, cards)
    check("D", rates["D"], 20)
    check("L", rates["L"], 4)
    check("r", rates["r"], 0.2)
    check("T", rates["T"], 4)
    check("L_hit", rates["L_hit"], 8)
    check("hits a turn", rates["h"], (1 + 3 + 3 + 0) / 4)  # Whirlwind X = energy 0 on turn 1 -> 3 (the fallback)
    check("block cards a turn", rates["b"], (1 + 0 + 1 + 2) / 4)
    check("energy", rates["E"], 3)
    check("strike plays", rates["s"], 3 / 4)
    check("strike damage a play", rates["sd"], (6 + 10 + 6) / 3)
    fire = potion_value("FIRE_POTION", "damage", {"Damage": 20}, rates)
    check("fire hp", fire["hp"], 4.0)
    check("fire damage", fire["damage"], 20)
    foul = potion_value("FOUL_POTION", "damage", {"Damage": 12}, rates)
    check("foul hp", foul["hp"], 12 * 0.2 - 12)
    check("foul hold", foul["hold_hp"], 0)
    block = potion_value("BLOCK_POTION", "block", {"Block": 12}, rates)
    check("block capped", block["hp"], (10 + 6) / 2)  # hit turns: min(12, 10), min(12, 6)
    ship = potion_value("SHIP_IN_A_BOTTLE", "block", {"Block": 10}, rates)
    check("ship", ship["hp"], (10 + 6) / 2 + (10 + 0 + 6 + 0) / 4)
    strength = potion_value("STRENGTH_POTION", "strength_fight", {"StrengthPower": 2}, rates)
    x = 2 * rates["h"]
    check("strength", strength["hp"], 4 * x / (20 + x) * 4)
    dex = potion_value("DEXTERITY_POTION", "dex_fight", {"DexterityPower": 2}, rates)
    check("dex", dex["hp"], ((min(2, 10) + 0 + min(2, 6) + 0) / 4) * 4)
    weak = potion_value("WEAK_POTION", "weak", {"WeakPower": 3}, rates)
    check("weak", weak["hp"], 3 * (min(5, 10) + 0 + min(3, 6) + 0) / 4)
    vuln = potion_value("VULNERABLE_POTION", "vuln", {"VulnerablePower": 3}, rates)
    check("vuln damage", vuln["damage"], 0.5 * 20 * 3)
    regen = potion_value("REGEN_POTION", "regen", {"RegenPower": 5}, rates)
    check("regen capped by T", regen["hp"], 5 + 4 + 3 + 2)
    plating = potion_value("HEART_OF_IRON", "plating", {"PlatingPower": 7}, rates)
    check("plating", plating["hp"], sum(mean([min(7 - k, loss) for loss in (10, 0, 6, 0)]) for k in range(4)), tol=0.06)
    blood = potion_value("BLOOD_POTION", "heal_pct", {"HealPercent": 20}, rates)
    check("blood", blood["hp"], 0.2 * 85)
    energy = potion_value("ENERGY_POTION", "energy", {"Energy": 2}, rates)
    check("energy", energy["hp"], 2 * rates["v_energy"])
    if energy["source"] != "估":
        failures.append("energy should be an estimate")
    # v_card: damage a card 20/2 × r + mean(min(block a card, loss)).
    check("v_card", rates["v_card"], 10 * 0.2 + mean([min(6 / 2, loss) for loss in (10, 0, 6, 0)]))
    mc = mc_check("SWIFT_POTION", rates, {"SWIFT_POTION": {"hp": 1.0, "dmg": 10.0, "n": 6}})
    check("mc swift", mc["hp"], 1.0 + 10 * 0.2)
    if mc_check("FIRE_POTION", rates, {}) is not None:
        failures.append("no Monte Carlo rows: no mc check")
    # The check column: the best dry line by deaths, then loss.
    names = {"火焰药水": "FIRE_POTION"}
    crit = {
        "plan1": json.dumps({"potions_used": "火焰药水", "rollout": "5-turn rollout (8 samples): expected further HP loss 20.5, fight over within 5 turns in 1/8"}),
        "plan2": json.dumps({"potions_used": "none", "rollout": "5-turn rollout (8 samples): expected further HP loss 18, fight over within 5 turns in 0/8, dead within 5 turns in 1/8 (~turn 4)"}),
        "plan3": json.dumps({"potions_used": "none", "rollout": "5-turn rollout (8 samples): expected further HP loss 26, fight over within 5 turns in 0/8"}),
    }
    check("delta", drink_delta(crit, "plan1", "FIRE_POTION", names), 26 - 20.5)
    if drink_delta(crit, "plan2", "FIRE_POTION", names) is not None:
        failures.append("a dry pick has no delta")
    # The gold rate: median held value of the offered potions in the act ÷ the median price.
    offers = [{"id": "FIRE_POTION", "rarity": "Common", "price": 50, "act": 1, "asc": 8}, {"id": "FIRE_POTION", "rarity": "Common", "price": 48, "act": 2, "asc": 8}, {"id": "BLOCK_POTION", "rarity": "Common", "price": 52, "act": 1, "asc": 8}, {"id": "REGEN_POTION", "rarity": "Uncommon", "price": 75, "act": 1, "asc": 9}]
    table = {"FIRE_POTION": {"by_asc": {"8": {"1": {"hold_hp": 4.0}}}}, "BLOCK_POTION": {"by_asc": {"8": {"1": {"hold_hp": 8.0}}}}, "REGEN_POTION": {"by_asc": {"8": {"1": {"hold_hp": 15.0}}}}}
    gold = gold_rates(offers, 4, table, (8,))
    check("gold price", gold["price"]["median"], 51)
    check("gold hold", gold["by_asc"]["8"]["1"]["hold_hp"], 6.0)  # median of 4, 4, 8, 15
    check("gold per gold", gold["by_asc"]["8"]["1"]["per_gold"], 6.0 / 51, tol=0.0001)
    if "2" in gold["by_asc"]["8"]:
        failures.append("no act 2 values: no act 2 rate")
    if gold_rates([], 0, table, (8,)) is not None:
        failures.append("no offers: no gold rate")
    if failures:
        print("self-test FAILED:\n  " + "\n  ".join(failures))
        return 1
    print("self-test ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
