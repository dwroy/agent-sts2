#!/usr/bin/env python3
"""Fight value model from our own logs (live only as facts for Jev: src/strategy/rollout-live.ts).

What happens AFTER one of our turns ends, learned from logs/states.jsonl (+ runs.jsonl, decisions.jsonl):
from the state at the end of our turn (after our plays, before the enemies act) until the fight ends,
  - hp_loss: further HP we lose (the coming enemy turn included; a death counts the HP we had),
  - win: whether we win the fight,
  - turns: turns still to play after this one.

Stages:
  extract  stream states.jsonl once -> .cache/fight-value-rows.jsonl (one row per combat turn: the
           start-of-turn and end-of-turn snapshot, fight constants, the realised outcome)
  train    rows -> baselines + learned models, backtest by run and by time, the ranking test,
           src/knowledge/fight-value.json and notes/fight-value-backtest.md

Models (pure Python, stdlib only):
  B0 "solver"  the code's implied estimate: this enemy turn's incoming after block + the move model's
               next-turn threat (combat-plan.ts enemy_threat_next); win = survives that.
  B1 "clock"   incoming now + next-turn threat x (turns to kill - 1), turns to kill from the deck's
               damage per turn (a boss-clock style estimate).
  T  "table"   hierarchical binned table (encounter x enemy-HP-left bin x our-HP bin), shrunk towards
               fight kind x act, then global.
  G  "gbm"     gradient-boosted depth-3 trees on the feature vector (squared loss for hp_loss/turns,
               log loss for win), monster ids target-encoded.

Usage:
  python3 tools/build-fight-value.py extract [--states PATH] [--rows PATH]
  python3 tools/build-fight-value.py train   [--rows PATH] [--decisions PATH] [--out PATH] [--notes PATH]
  python3 tools/build-fight-value.py all
  python3 tools/build-fight-value.py folds --fold-dir DIR        (out-of-fold models + gates for the rollout backtest)
  python3 tools/build-fight-value.py rollout-report --work DIR   (after tools/rollout-backtest.ts; see notes/rollout-backtest.md)
`train` also writes src/knowledge/fight-value-gates.json (Part A: per-segment blend weight of the model vs the
current solver weights, and the win-probability calibration). Rebuild after each run: `python3 tools/build-fight-value.py all`.
Parsing (fight boundaries, room kind, enemy identity across a fight) is tools/build-monster-db.py's.
"""
import argparse
import bisect
import collections
import hashlib
import importlib.util
import json
import math
import os
import random
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_spec = importlib.util.spec_from_file_location("bmd", os.path.join(ROOT, "tools", "build-monster-db.py"))
bmd = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(bmd)

DEFAULT_ROWS = os.path.join(ROOT, ".cache", "fight-value-rows.jsonl")
MIN_ASC = 7  # the models are trained and tested on A7-A8; rows below are extracted and counted only

# ---------------------------------------------------------------- extract


def deck_summary(run):
    out = {"n": 0, "atk": 0, "skl": 0, "pow": 0, "junk": 0, "dmg": 0.0, "blk": 0.0, "up": 0}
    for card in run.get("deck") or []:
        if not isinstance(card, dict):
            continue
        out["n"] += 1
        kind = card.get("card_type")
        if kind == "Attack":
            out["atk"] += 1
        elif kind == "Skill":
            out["skl"] += 1
        elif kind == "Power":
            out["pow"] += 1
        else:
            out["junk"] += 1
        if card.get("upgraded"):
            out["up"] += 1
        for value in card.get("dynamic_values") or []:
            name = value.get("name")
            amount = value.get("current_value")
            if not isinstance(amount, (int, float)):
                continue
            if name == "Damage":
                out["dmg"] += amount
            elif name == "Block":
                out["blk"] += amount
    return out


def snap(state, fight):
    combat = state.get("combat") or {}
    player = combat.get("player") or {}
    enemies = [e for e in combat.get("enemies") or [] if e.get("enemy_id")]
    tracked = fight.tracked  # set by bmd.track for this very state, same order
    out_enemies = []
    for (serial, eid, hp, max_hp, alive), enemy in zip(tracked, enemies):
        powers = bmd.powers_of(enemy)
        out_enemies.append([
            serial, eid, hp, max_hp if isinstance(max_hp, int) and max_hp < bmd.HUGE_HP else hp,
            enemy.get("block") or 0, bool(alive and hp > 0), "MINION_POWER" in powers,
            bmd.intent_total(enemy.get("intents")), enemy.get("move_id"), powers,
        ])
    potions = sum(1 for p in (state.get("run") or {}).get("potions") or [] if isinstance(p, dict) and p.get("occupied"))
    return {
        "hp": player.get("current_hp"), "mhp": player.get("max_hp"), "blk": player.get("block") or 0,
        "en": player.get("energy") or 0, "pw": bmd.powers_of(player), "hand": len(combat.get("hand") or []),
        "pots": potions, "E": out_enemies,
    }


class RowBuilder(bmd.Builder):
    def __init__(self, runs, out):
        super().__init__(runs)
        self.out = out
        self.rows = 0
        self.by_asc = collections.Counter()

    def commit(self, fight):
        if not fight.initial:
            return
        run = self.runs.get(fight.run_id)
        if fight.outcome is None and run is not None and run.get("floor") == fight.floor and not run.get("victory") and run.get("death_fight"):
            fight.outcome = "died"
        if fight.outcome not in ("won", "died"):
            return
        kind = self.room_kind(fight, bmd.GAME_TYPES) or "unknown"
        final_hp = 0 if fight.outcome == "died" else fight.last_hp
        turns = sorted(t for t in getattr(fight, "fv_last", {}) if isinstance(t, int))
        if not turns:
            return
        fid = f"{fight.run_id}:{fight.act}:{fight.floor}"
        for i, t in enumerate(turns):
            first = fight.fv_first[t]
            last = fight.fv_last[t]
            nxt = fight.fv_first.get(turns[i + 1]) if i + 1 < len(turns) else None
            row = {
                "fid": fid, "run": fight.run_id, "asc": fight.asc, "act": fight.act, "floor": fight.floor,
                "kind": kind, "enc": "+".join(fight.initial), "boss": fight.boss_id, "t": t, "max_t": fight.max_turn,
                "outcome": fight.outcome, "final_hp": final_hp, "post_hp": fight.post_hp, "entry_hp": fight.entry_hp,
                "deck": fight.fv_deck, "relics": fight.fv_relics, "max_en": fight.fv_max_en,
                "ts0": fight.fv_ts[t][0], "ts1": fight.fv_ts[t][1],
                "S": first, "E": last, "next_hp": nxt["hp"] if nxt else final_hp,
            }
            self.out.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
            self.rows += 1
            self.by_asc[fight.asc] += 1
        self.fights += 1


def _observe(original):
    # Takes and passes on whatever build-monster-db.observe_combat takes: it gained the draw/discard piles (`piles`,
    # 2026-09-30) and then `observed` (MECH_RULES), and each time a wrapper of the old arity raised TypeError on every
    # fight and stopped the fight-value refresh (fight-value.json unchanged since 2026-10-02 13:47 on v4-live).
    def observe(fight, state, ts, *rest, **named):
        original(fight, state, ts, *rest, **named)
        turn = state.get("turn")
        if not isinstance(turn, int):
            return
        if not hasattr(fight, "fv_first"):
            run = state.get("run") or {}
            fight.fv_first, fight.fv_last, fight.fv_ts = {}, {}, {}
            fight.fv_deck = deck_summary(run)
            fight.fv_relics = len(run.get("relics") or [])
            fight.fv_max_en = run.get("max_energy") or 3
        s = snap(state, fight)
        if s["hp"] is None:
            return
        fight.fv_first.setdefault(turn, s)
        fight.fv_last[turn] = s
        span = fight.fv_ts.setdefault(turn, [ts, ts])
        span[1] = ts
    return observe


def extract(states, runs_path, game_path, rows_path):
    game = {}
    if game_path and os.path.exists(game_path):
        raw = json.load(open(game_path, encoding="utf8"))
        game = raw.get("collections", raw)
    bmd.GAME_TYPES.clear()
    bmd.GAME_TYPES.update({m["id"]: m.get("type") for m in game.get("monsters") or []})
    bmd.observe_combat = _observe(bmd.observe_combat)
    os.makedirs(os.path.dirname(rows_path), exist_ok=True)
    tmp = rows_path + ".tmp"
    with open(tmp, "w", encoding="utf8") as out:
        builder = RowBuilder(bmd.load_runs(runs_path), out)
        for screen, entry in bmd.iter_entries(states):
            builder.feed(screen, entry)
        builder.finish()
    os.replace(tmp, rows_path)
    return builder


# ---------------------------------------------------------------- features

PLAYER_POWERS = ["STRENGTH_POWER", "DEXTERITY_POWER", "WEAK_POWER", "FRAIL_POWER", "VULNERABLE_POWER",
                 "DEMON_FORM_POWER", "METALLICIZE_POWER", "PLATING_POWER", "BARRICADE_POWER", "FEEL_NO_PAIN_POWER",
                 "REGEN_POWER", "INTANGIBLE_POWER", "BUFFER_POWER", "THORNS_POWER", "RAGE_POWER", "JUGGERNAUT_POWER"]
FIGHT_KINDS = ["hallway", "elite", "boss"]
WEIGHTS = None  # filled by load_move_model


def load_move_model():
    path = os.path.join(ROOT, "src", "knowledge", "move-model.json")
    try:
        return json.load(open(path, encoding="utf8"))
    except (OSError, ValueError):
        return {}


def expected_next(mm, eid, move):
    entry = mm.get(eid)
    if not entry or not move:
        return None
    succ = (entry.get("next") or {}).get(move)
    if not succ:
        return None
    total = count = 0
    for m, n in succ.items():
        d = (entry.get("damage") or {}).get(m)
        if d is None:
            continue
        total += d * n
        count += n
    return total / count if count else None


def living(snapshot):
    return [e for e in snapshot["E"] if e[5]]


def base_features(row, mm):
    """Named raw features of the end-of-turn state (the TS stub computes the same names)."""
    E = row["E"]
    pw = E["pw"]
    live = living(E)
    main = [e for e in live if not e[6]] or live
    deck = row["deck"]
    f = {}
    f["hp"] = E["hp"]
    f["max_hp"] = E["mhp"] or 80
    f["hp_frac"] = E["hp"] / max(1, f["max_hp"])
    f["block"] = E["blk"]
    for p in PLAYER_POWERS:
        f["p_" + p.replace("_POWER", "").lower()] = pw.get(p, 0)
    f["n_powers"] = len(pw)
    f["energy_per_turn"] = row["max_en"]
    f["hand"] = E["hand"]
    f["potions"] = E["pots"]
    f["relics"] = row["relics"]
    f["deck_n"] = deck["n"]
    n = max(1, deck["n"])
    f["deck_atk_frac"] = deck["atk"] / n
    f["deck_pow"] = deck["pow"]
    f["deck_junk"] = deck["junk"]
    f["deck_dmg_per_card"] = deck["dmg"] / n
    f["deck_blk_per_card"] = deck["blk"] / n
    f["deck_up_frac"] = deck["up"] / n
    f["act"] = row["act"] or 1
    f["turn"] = row["t"]
    f["asc"] = row["asc"] or 0
    f["kind_elite"] = 1 if row["kind"] == "elite" else 0
    f["kind_boss"] = 1 if row["kind"] == "boss" else 0
    f["n_living"] = len(live)
    f["n_minions"] = sum(1 for e in live if e[6])
    hp_left = [e[2] for e in main]
    f["enemy_hp_sum"] = sum(max(0, e[2]) for e in main)
    f["enemy_hp_max"] = max(hp_left) if hp_left else 0
    f["enemy_maxhp_sum"] = sum(e[3] or 0 for e in main)
    f["enemy_hp_frac"] = f["enemy_hp_sum"] / max(1, f["enemy_maxhp_sum"])
    f["enemy_block_sum"] = sum(e[4] for e in live)
    strs = [e[9].get("STRENGTH_POWER", 0) for e in live]
    f["enemy_str_sum"] = sum(strs)
    f["enemy_str_max"] = max(strs) if strs else 0
    f["enemy_vuln_max"] = max([e[9].get("VULNERABLE_POWER", 0) for e in live] or [0])
    f["enemy_weak_max"] = max([e[9].get("WEAK_POWER", 0) for e in live] or [0])
    f["enemy_artifact"] = sum(e[9].get("ARTIFACT_POWER", 0) for e in live)
    f["enemy_npowers"] = sum(len(e[9]) for e in live)
    incoming = sum(e[7] for e in live)
    f["intent_dmg"] = incoming
    f["intent_dmg_max"] = max([e[7] for e in live] or [0])
    f["incoming_after_block"] = max(0, incoming - E["blk"])
    nxt = 0.0
    unknown = 0
    for e in live:
        x = expected_next(mm, e[1], e[8])
        if x is None:
            unknown += 1
            x = e[7]
        nxt += x
    f["threat_next"] = nxt
    f["threat_next_unknown"] = unknown
    dmg_turn = deck_damage_per_turn(row, f)
    f["deck_dmg_turn"] = dmg_turn
    f["turns_to_kill"] = f["enemy_hp_sum"] / max(1.0, dmg_turn)
    f["hp_minus_incoming"] = E["hp"] - f["incoming_after_block"]
    return f


def deck_damage_per_turn(row, f):
    """Rough damage a turn: the deck's damage per card x cards a turn (energy-bound), plus Strength per attack."""
    deck = row["deck"]
    n = max(1, deck["n"])
    cards_turn = min(5.0, row["max_en"] * 1.4)
    atk_turn = cards_turn * deck["atk"] / n
    raw = cards_turn * deck["dmg"] / n + atk_turn * f.get("p_strength", 0)
    return 9 + 1.04 * raw  # boss-clock.ts calibrated(): realised = 9 + 1.04 x raw


# ---------------------------------------------------------------- targets / baselines


def targets(row):
    hp_e = row["E"]["hp"]
    loss = hp_e if row["outcome"] == "died" else max(0, hp_e - row["final_hp"])
    return {"hp_loss": loss, "win": 1 if row["outcome"] == "won" else 0, "turns": max(0, row["max_t"] - row["t"])}


def baseline_b0(f):
    loss = f["incoming_after_block"] + f["threat_next"] * (1 if f["n_living"] > 0 and f["enemy_hp_sum"] > 0 else 0)
    if f["n_living"] == 0:
        loss = 0
    win = 0.97 if f["hp"] > f["incoming_after_block"] else 0.05
    return loss, win, (1 if f["n_living"] else 0)


def baseline_b1(f):
    if f["n_living"] == 0 or f["enemy_hp_sum"] <= 0:
        return 0.0, 0.99, 0
    ttk = min(15.0, max(1.0, math.ceil(f["turns_to_kill"])))
    per = max(0.0, f["threat_next"] - 0.5 * f["deck_blk_per_card"] * min(5.0, f["energy_per_turn"] * 1.4) * (1 - f["deck_atk_frac"]))
    loss = f["incoming_after_block"] + per * (ttk - 1)
    margin = f["hp"] - loss
    win = 1 / (1 + math.exp(-margin / 8.0))
    return loss, win, ttk - 1


def solver_weights_value(row):
    """turn-solver.ts's score of the turn we played, from the realised deltas (start -> end of our turn)."""
    S, E = row["S"], row["E"]
    kind = row["kind"]
    hp_frac = S["hp"] / max(1, S["mhp"] or 80)
    w_hp = 1.0 + 1.5 * max(0.0, 0.6 - hp_frac) / 0.6
    w_dmg = 0.8 if kind == "boss" else 0.7 if kind == "elite" else 0.45
    won_now = row["outcome"] == "won" and row["t"] == row["max_t"]
    # hpLoss as the solver sees it: HP lost during our own turn + the shown incoming after our block
    # (not the realised enemy turn, which the solver cannot see either).
    incoming = sum(e[7] for e in E["E"] if e[5])
    hp_loss = max(0, S["hp"] - E["hp"]) + (0 if won_now else max(0, incoming - E["blk"]))
    end = {e[0]: e for e in E["E"]}
    dmg = 0
    kills = 0.0
    debuff = 0.0
    for e in S["E"]:
        if not e[5]:
            continue
        after = end.get(e[0])
        hp_after = max(0, after[2]) if after else 0
        dmg += max(0, e[2] - hp_after)
        if after is None or not after[5]:
            kills += 6 + 1.2 * e[7]
        else:
            dv = max(0, after[9].get("VULNERABLE_POWER", 0) - e[9].get("VULNERABLE_POWER", 0))
            dw = max(0, after[9].get("WEAK_POWER", 0) - e[9].get("WEAK_POWER", 0))
            debuff += 2.5 * min(dv, 3) + (1.5 * min(dw, 3) if e[7] > 0 else 0)
            debuff -= 3 * max(0, after[9].get("STRENGTH_POWER", 0) - e[9].get("STRENGTH_POWER", 0))
    strength = max(0, E["pw"].get("STRENGTH_POWER", 0) - S["pw"].get("STRENGTH_POWER", 0))
    length = 1.8 if kind == "boss" else 1.4 if kind == "elite" else 0.8
    earliness = max(0.4, 1 - 0.08 * (row["t"] - 1))
    lasting = 0 if won_now else 5 * strength * length * earliness
    score = (1000 if won_now else 0) - w_hp * hp_loss + w_dmg * dmg + kills + debuff + lasting
    return score


# ---------------------------------------------------------------- learned models


class Encoder:
    """Monster / encounter target encoding with shrinkage (fit on train rows only)."""

    def __init__(self, k=20.0):
        self.k = k
        self.mon = {}
        self.enc = {}
        self.prior = 0.0

    def fit(self, rows, ys):
        self.prior = sum(ys) / max(1, len(ys))
        mon = collections.defaultdict(lambda: [0.0, 0])
        enc = collections.defaultdict(lambda: [0.0, 0])
        for row, y in zip(rows, ys):
            for eid in {e[1] for e in living(row["E"])}:
                mon[eid][0] += y
                mon[eid][1] += 1
            enc[row["enc"]][0] += y
            enc[row["enc"]][1] += 1
        shrink = lambda s, n: (s + self.k * self.prior) / (n + self.k)
        self.mon = {k: [round(shrink(*v), 4), v[1]] for k, v in mon.items()}
        self.enc = {k: [round(shrink(*v), 4), v[1]] for k, v in enc.items()}
        return self

    def features(self, row):
        vals = [self.mon.get(e[1], [self.prior])[0] for e in living(row["E"])]
        return {"mon_te_max": max(vals) if vals else self.prior, "mon_te_sum": sum(vals),
                "enc_te": self.enc.get(row["enc"], [self.prior])[0]}


def quantile_edges(values, bins=24):
    s = sorted(values)
    edges = []
    for i in range(1, bins):
        v = s[min(len(s) - 1, int(len(s) * i / bins))]
        if not edges or v > edges[-1]:
            edges.append(v)
    return edges


class GBM:
    """Gradient-boosted regression trees on binned features (depth-limited, histogram splits)."""

    def __init__(self, loss="l2", trees=150, depth=3, lr=0.08, min_leaf=40, subsample=0.7, seed=7):
        self.loss, self.n_trees, self.depth, self.lr, self.min_leaf, self.subsample = loss, trees, depth, lr, min_leaf, subsample
        self.seed = seed
        self.trees = []
        self.edges = []
        self.base = 0.0
        self.gain = None

    def _bin(self, X):
        return [[bisect.bisect_right(self.edges[j], x[j]) for j in range(len(self.edges))] for x in X]

    def fit(self, X, y, names):
        rng = random.Random(self.seed)
        nf = len(names)
        self.names = names
        self.edges = [quantile_edges([x[j] for x in X]) for j in range(nf)]
        B = self._bin(X)
        cols = [[b[j] for b in B] for j in range(nf)]
        nb = [len(e) + 1 for e in self.edges]
        n = len(y)
        if self.loss == "logloss":
            p = min(0.999, max(0.001, sum(y) / n))
            self.base = math.log(p / (1 - p))
        else:
            self.base = sum(y) / n
        F = [self.base] * n
        self.gain = [0.0] * nf
        for _ in range(self.n_trees):
            if self.loss == "logloss":
                probs = [1 / (1 + math.exp(-v)) for v in F]
                g = [y[i] - probs[i] for i in range(n)]
                h = [max(1e-6, probs[i] * (1 - probs[i])) for i in range(n)]
            else:
                g = [y[i] - F[i] for i in range(n)]
                h = None
            idx = [i for i in range(n) if rng.random() < self.subsample]
            tree = self._grow(idx, g, h, cols, nb, 0)
            self.trees.append(tree)
            for i in range(n):
                F[i] += self.lr * self._leaf(tree, B[i])
        return self

    def _grow(self, idx, g, h, cols, nb, depth):
        sg = sum(g[i] for i in idx)
        sh = sum(h[i] for i in idx) if h else float(len(idx))
        value = sg / (sh + 1.0)
        if depth >= self.depth or len(idx) < 2 * self.min_leaf:
            return value
        best = None
        parent = sg * sg / (sh + 1.0)
        for j, col in enumerate(cols):
            hg = [0.0] * nb[j]
            hh = [0.0] * nb[j]
            hc = [0] * nb[j]
            if h:
                for i in idx:
                    b = col[i]
                    hg[b] += g[i]
                    hh[b] += h[i]
                    hc[b] += 1
            else:
                for i in idx:
                    b = col[i]
                    hg[b] += g[i]
                    hc[b] += 1
                hh = hc
            lg = lh = 0.0
            lc = 0
            for b in range(nb[j] - 1):
                lg += hg[b]
                lh += hh[b]
                lc += hc[b]
                rc = len(idx) - lc
                if lc < self.min_leaf or rc < self.min_leaf:
                    continue
                gain = lg * lg / (lh + 1.0) + (sg - lg) ** 2 / (sh - lh + 1.0) - parent
                if best is None or gain > best[0]:
                    best = (gain, j, b)
        if best is None or best[0] <= 1e-9:
            return value
        gain, j, b = best
        self.gain[j] += gain
        left = [i for i in idx if cols[j][i] <= b]
        right = [i for i in idx if cols[j][i] > b]
        thr = self.edges[j][b]  # x <= thr goes left (bin b means edges[b-1] <= x < edges[b])
        return [j, thr, self._grow(left, g, h, cols, nb, depth + 1), self._grow(right, g, h, cols, nb, depth + 1), b]

    def _leaf(self, tree, bins):
        while isinstance(tree, list):
            tree = tree[2] if bins[tree[0]] <= tree[4] else tree[3]
        return tree

    def raw(self, x):
        total = self.base
        for tree in self.trees:
            node = tree
            while isinstance(node, list):
                node = node[2] if x[node[0]] < node[1] else node[3]
            total += self.lr * node
        return total

    def predict(self, x):
        r = self.raw(x)
        return 1 / (1 + math.exp(-r)) if self.loss == "logloss" else r

    def export(self):
        def strip(node):
            if isinstance(node, list):
                return [node[0], node[1], strip(node[2]), strip(node[3])]
            return round(node, 4)
        return {"loss": self.loss, "base": round(self.base, 5), "lr": self.lr, "trees": [strip(t) for t in self.trees]}


class Table:
    """Binned table with hierarchical shrinkage: encounter x enemy-HP-left x our-HP -> kind x act -> global."""

    K = 15.0

    @staticmethod
    def keys(row, f):
        ehp = min(4, int(f["enemy_hp_frac"] * 5))
        php = min(3, int(f["hp_frac"] * 4))
        return [("g", ehp), ("k", row["kind"], row["act"], ehp, php), ("e", row["enc"], ehp, php)]

    def fit(self, rows, feats, ys):
        acc = collections.defaultdict(lambda: [0.0, 0])
        for row, f, y in zip(rows, feats, ys):
            for key in self.keys(row, f):
                acc[key][0] += y
                acc[key][1] += 1
        self.acc = dict(acc)
        self.mean = sum(ys) / max(1, len(ys))
        return self

    def predict(self, row, f):
        est = self.mean
        n = 0
        for key in self.keys(row, f):
            s, c = self.acc.get(key, (0.0, 0))
            est = (s + self.K * est) / (c + self.K)
            n = c
        return est, n


# ---------------------------------------------------------------- metrics


def mae(p, y):
    return sum(abs(a - b) for a, b in zip(p, y)) / max(1, len(y))


def rmse(p, y):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(p, y)) / max(1, len(y)))


def brier(p, y):
    return sum((a - b) ** 2 for a, b in zip(p, y)) / max(1, len(y))


def logloss(p, y):
    return -sum(b * math.log(min(1 - 1e-6, max(1e-6, a))) + (1 - b) * math.log(min(1 - 1e-6, max(1e-6, 1 - a))) for a, b in zip(p, y)) / max(1, len(y))


def reliability(p, y, bins=(0, 0.5, 0.8, 0.9, 0.95, 0.98, 1.0001)):
    out = []
    for lo, hi in zip(bins, bins[1:]):
        sel = [(a, b) for a, b in zip(p, y) if lo <= a < hi]
        if sel:
            out.append((f"{lo:.2f}-{min(hi, 1):.2f}", len(sel), sum(a for a, _ in sel) / len(sel), sum(b for _, b in sel) / len(sel)))
    return out


def spearman(a, b):
    def ranks(v):
        order = sorted(range(len(v)), key=lambda i: v[i])
        r = [0.0] * len(v)
        i = 0
        while i < len(order):
            j = i
            while j + 1 < len(order) and v[order[j + 1]] == v[order[i]]:
                j += 1
            for k in range(i, j + 1):
                r[order[k]] = (i + j) / 2
            i = j + 1
        return r
    ra, rb = ranks(a), ranks(b)
    n = len(a)
    if n < 3:
        return float("nan")
    ma, mb = sum(ra) / n, sum(rb) / n
    cov = sum((x - ma) * (y - mb) for x, y in zip(ra, rb))
    va = math.sqrt(sum((x - ma) ** 2 for x in ra))
    vb = math.sqrt(sum((y - mb) ** 2 for y in rb))
    return cov / (va * vb) if va and vb else float("nan")


# ---------------------------------------------------------------- train / backtest


def run_hash(run_id):
    return int(hashlib.md5(run_id.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


def load_rows(path):
    rows = []
    with open(path, encoding="utf8") as handle:
        for line in handle:
            row = json.loads(line)
            if row["E"]["hp"] is None or row["S"]["hp"] is None:
                continue
            rows.append(row)
    return rows


def feature_matrix(rows, feats, enc_loss, enc_win, folds=None):
    """folds: per-row (loss, win) encoders fitted without that row's run (out-of-fold, for training rows)."""
    names = None
    X = []
    for i, (row, f) in enumerate(zip(rows, feats)):
        g = dict(f)
        el, ew = folds[i] if folds else (enc_loss, enc_win)
        for k, v in el.features(row).items():
            g["loss_" + k] = v
        for k, v in ew.features(row).items():
            g["win_" + k] = v
        if names is None:
            names = sorted(g)
        X.append([float(g[k]) for k in names])
    return X, names


class Suite:
    """All learned models for one training set."""

    def fit(self, rows, feats, trees=150):
        ys = [targets(r) for r in rows]
        self.enc_loss = Encoder().fit(rows, [y["hp_loss"] for y in ys])
        self.enc_win = Encoder().fit(rows, [y["win"] for y in ys])
        # Out-of-fold encodings for the training rows (5 folds by run): an in-sample encoding of the
        # encounter's outcome would let the trees trust it far more than it holds on unseen runs.
        fold_of = [int(run_hash(r["run"] + "#fold") * 5) % 5 for r in rows]
        encs = []
        for k in range(5):
            sub = [i for i in range(len(rows)) if fold_of[i] != k]
            encs.append((Encoder().fit([rows[i] for i in sub], [ys[i]["hp_loss"] for i in sub]),
                         Encoder().fit([rows[i] for i in sub], [ys[i]["win"] for i in sub])))
        X, self.names = feature_matrix(rows, feats, None, None, folds=[encs[k] for k in fold_of])
        self.gbm = {
            "hp_loss": GBM("l2", trees=trees).fit(X, [y["hp_loss"] for y in ys], self.names),
            "win": GBM("logloss", trees=trees, lr=0.1).fit(X, [y["win"] for y in ys], self.names),
            "turns": GBM("l2", trees=max(60, trees // 2)).fit(X, [y["turns"] for y in ys], self.names),
        }
        self.table = {k: Table().fit(rows, feats, [y[k] for y in ys]) for k in ("hp_loss", "win", "turns")}
        return self

    def predict(self, rows, feats):
        X, _ = feature_matrix(rows, feats, self.enc_loss, self.enc_win)
        out = []
        for row, f, x in zip(rows, feats, X):
            t_loss, n = self.table["hp_loss"].predict(row, f)
            out.append({
                "gbm": (max(0.0, self.gbm["hp_loss"].predict(x)), self.gbm["win"].predict(x), max(0.0, self.gbm["turns"].predict(x))),
                "table": (t_loss, min(0.999, max(0.001, self.table["win"].predict(row, f)[0])), self.table["turns"].predict(row, f)[0]),
                "n": n,
            })
        return out


def evaluate(rows, feats, preds):
    """Per model x fight kind: MAE/RMSE of hp_loss, Brier/logloss of win, MAE of turns."""
    ys = [targets(r) for r in rows]
    models = {
        "B0 solver": [baseline_b0(f) for f in feats],
        "B1 clock": [baseline_b1(f) for f in feats],
        "T table": [p["table"] for p in preds],
        "G gbm": [p["gbm"] for p in preds],
    }
    groups = {"all": list(range(len(rows)))}
    for kind in FIGHT_KINDS:
        groups[kind] = [i for i, r in enumerate(rows) if r["kind"] == kind]
    table = {}
    for gname, idx in groups.items():
        if not idx:
            continue
        for mname, pred in models.items():
            p = [pred[i] for i in idx]
            y = [ys[i] for i in idx]
            table[(gname, mname)] = {
                "n": len(idx), "fights": len({rows[i]["fid"] for i in idx}),
                "mae": mae([a[0] for a in p], [b["hp_loss"] for b in y]),
                "rmse": rmse([a[0] for a in p], [b["hp_loss"] for b in y]),
                "brier": brier([a[1] for a in p], [b["win"] for b in y]),
                "logloss": logloss([a[1] for a in p], [b["win"] for b in y]),
                "turns_mae": mae([a[2] for a in p], [b["turns"] for b in y]),
                "win_rate": sum(b["win"] for b in y) / len(y),
            }
    rel = {m: reliability([models[m][i][1] for i in groups["all"]], [ys[i]["win"] for i in groups["all"]]) for m in ("T table", "G gbm", "B1 clock")}
    return table, rel


def per_boss(rows, feats, preds):
    """Boss fights one by one (the encounter's ids): B0 vs table vs GBM."""
    groups = collections.defaultdict(list)
    for i, r in enumerate(rows):
        if r["kind"] == "boss":
            groups[(r["boss"] or "?").replace("_BOSS", "")].append(i)
    out = []
    for boss, idx in sorted(groups.items(), key=lambda kv: -len(kv[1])):
        ys = [targets(rows[i]) for i in idx]
        b0 = [baseline_b0(feats[i]) for i in idx]
        tb = [preds[i]["table"] for i in idx]
        gb = [preds[i]["gbm"] for i in idx]
        yl = [y["hp_loss"] for y in ys]
        yw = [y["win"] for y in ys]
        out.append({"boss": boss, "n": len(idx), "fights": len({rows[i]["fid"] for i in idx}), "win_rate": sum(yw) / len(yw),
                    "mae_b0": mae([p[0] for p in b0], yl), "mae_table": mae([p[0] for p in tb], yl), "mae_gbm": mae([p[0] for p in gb], yl),
                    "brier_b0": brier([p[1] for p in b0], yw), "brier_table": brier([p[1] for p in tb], yw), "brier_gbm": brier([p[1] for p in gb], yw)})
    return out


def ranking_test(rows, feats, preds, choice_flags):
    """Does the value of the realised end-of-turn state track the realised outcome better than the solver's score?

    Outcome of turn t: HP lost from the START of turn t to the fight's end (a death: all HP we had).
    Solver value: turn-solver's weights applied to the turn's realised deltas.
    Model value: -(HP lost during our own turn) - predicted further loss from the end-of-turn state.
    Pooled Spearman per fight kind, and pair concordance inside groups of similar starting states
    (same encounter, turn, our HP // 8, enemy HP left // 20), where the start state is held fixed and
    only the line played differs.
    """
    out = {}
    recs = []
    for row, f, p, flag in zip(rows, feats, preds, choice_flags):
        S = row["S"]
        died = row["outcome"] == "died"
        y = S["hp"] if died else max(0, S["hp"] - row["final_hp"])
        own = max(0, S["hp"] - row["E"]["hp"])
        vm = -own - p["gbm"][0] - 40 * (1 - p["gbm"][1])
        vt = -own - p["table"][0]
        vw = solver_weights_value(row)
        vb = -own - baseline_b1(f)[0]
        ehp = sum(max(0, e[2]) for e in S["E"] if e[5] and not e[6])
        key = (row["enc"], row["t"], S["hp"] // 10, ehp // 20)
        recs.append((row["kind"], key, row["fid"], y, died, vw, vm, vt, vb, flag))
    names = ["solver weights", "gbm value", "table value", "clock value"]
    for kind in ["all"] + FIGHT_KINDS + ["choice points"]:
        sel = [r for r in recs if kind == "all" or r[0] == kind or (kind == "choice points" and r[9])]
        if len(sel) < 20:
            continue
        ys = [-r[3] for r in sel]
        res = {"n": len(sel)}
        for k, name in enumerate(names):
            res["spearman " + name] = spearman([r[5 + k] for r in sel], ys)
        groups = collections.defaultdict(list)
        for r in sel:
            groups[r[1]].append(r)
        conc = [[0, 0] for _ in names]
        pairs = 0
        for g in groups.values():
            if len(g) < 2:
                continue
            for i in range(len(g)):
                for j in range(i + 1, len(g)):
                    a, b = g[i], g[j]
                    if a[2] == b[2] or a[3] == b[3]:
                        continue
                    pairs += 1
                    better_a = a[3] < b[3]
                    for k in range(len(names)):
                        va, vb_ = a[5 + k], b[5 + k]
                        if va == vb_:
                            conc[k][0] += 0.5
                        elif (va > vb_) == better_a:
                            conc[k][0] += 1
                        conc[k][1] += 1
        res["pairs"] = pairs
        for k, name in enumerate(names):
            res["concordance " + name] = conc[k][0] / conc[k][1] if conc[k][1] else float("nan")
        res["se"] = 0.5 / math.sqrt(pairs) if pairs else float("nan")
        out[kind] = res
    return out


# ---------------------------------------------------------------- gates (Part A: when to trust the model)
#
# The model's say in a line's value is earned per segment of decision points, by measured effect and
# sample size, never by fight kind: segment = encounter (the fight's initial enemy ids), backing off to
# (act, fight kind), then fight kind over all acts, then everything, when fewer than GATE_MIN_ROWS of its
# decision points are in comparable pairs (the kind is a pooling level for thin data, not a switch).
# Effect = the fair same-state ranking test (pairs of turns from different fights with the same encounter,
# turn, our HP//10 and enemy HP//20 at the start; which of the two played lines ended the fight with less
# HP lost) on out-of-fold predictions: the concordance of the blend w x model + (1 - w) x current, minus
# that of the current weights alone, for w on GATE_GRID (w = 1 is the model alone), with a cluster
# bootstrap over the similar-state groups (pairs inside one group are not independent).
#   w_cap = the grid weight with the highest lower CI bound (lcb)
#   w     = w_cap x n / (n + GATE_N0) x smoothstep(clamp(lcb / GATE_A_FULL, 0, 1))
# so w is 0 until some blend's advantage has a lower bound above 0, and grows smoothly with that bound
# and the number of pairs n.
# Common scale (HP-equivalent): model value = -(HP lost on our own turn) - E[further HP loss]
# - DEATH_HP x (1 - calibrated win prob); current value = turn-solver score / its HP weight.

GATE_MIN_ROWS = 120  # an encounter carries its own gate from this many similar-state decision points (rows in pairs)
GATE_N0 = 100.0
GATE_A_FULL = 0.02
GATE_BOOT = 400
GATE_CI = 0.90  # two-sided; the lower bound is the 5th percentile
GATE_GRID = (0.25, 0.5, 0.75, 1.0)
DEATH_HP = 40.0
CAL_MIN_GAIN = 0.0005  # a calibration map is used only if it lowers the nested out-of-fold Brier by this much


def smoothstep(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3 - 2 * x)


def gate_weight(n, lcb, w_cap=1.0):
    """The blend weight of the model in one segment (fight-value-gates.json `w`; rollout.ts gateWeight).
    n = decision points (rows) behind the segment's pairs: pairs inside a group share rows, so the pair count
    overstates the evidence (FUZZY_WURM_CRAWLER: 1658 pairs from 183 rows)."""
    if n <= 0:
        return 0.0
    return w_cap * (n / (n + GATE_N0)) * smoothstep(lcb / GATE_A_FULL)


def iso_fit(xs, ys, max_points=40):
    """Isotonic regression (pool adjacent violators) -> [[x, y], ...] knots for linear interpolation."""
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    blocks = []  # [sum_x, sum_y, n]
    for i in order:
        blocks.append([xs[i], ys[i], 1])
        while len(blocks) > 1 and blocks[-2][1] / blocks[-2][2] >= blocks[-1][1] / blocks[-1][2]:
            sx, sy, n = blocks.pop()
            blocks[-1][0] += sx
            blocks[-1][1] += sy
            blocks[-1][2] += n
    # Thin to at most max_points knots by merging the lightest neighbours (merged means stay ordered).
    while len(blocks) > max_points:
        k = min(range(len(blocks) - 1), key=lambda j: blocks[j][2] + blocks[j + 1][2])
        sx, sy, n = blocks.pop(k + 1)
        blocks[k][0] += sx
        blocks[k][1] += sy
        blocks[k][2] += n
    return [[round(b[0] / b[2], 5), round(b[1] / b[2], 5)] for b in blocks]


def iso_apply(knots, x):
    """Linear interpolation between the knots, flat outside (rollout.ts calibrate())."""
    if not knots:
        return x
    if x <= knots[0][0]:
        return knots[0][1]
    if x >= knots[-1][0]:
        return knots[-1][1]
    j = bisect.bisect_right([k[0] for k in knots], x)
    (x0, y0), (x1, y1) = knots[j - 1], knots[j]
    return y0 if x1 == x0 else y0 + (y1 - y0) * (x - x0) / (x1 - x0)


def _logit(p):
    p = min(1 - 1e-4, max(1e-4, p))
    return math.log(p / (1 - p))


def platt_fit(xs, ys):
    """Logistic regression of the outcome on logit(p) (Newton steps): [a, b]."""
    z = [_logit(x) for x in xs]
    a, b = 1.0, 0.0
    for _ in range(30):
        g0 = g1 = h00 = h01 = h11 = 0.0
        for zi, y in zip(z, ys):
            p = 1 / (1 + math.exp(-(a * zi + b)))
            r, w = p - y, p * (1 - p)
            g0 += r * zi
            g1 += r
            h00 += w * zi * zi
            h01 += w * zi
            h11 += w
        h00 += 1e-6
        h11 += 1e-6
        det = h00 * h11 - h01 * h01
        if det <= 0:
            break
        a -= (h11 * g0 - h01 * g1) / det
        b -= (-h01 * g0 + h00 * g1) / det
    return [round(a, 5), round(b, 5)]


def cal_apply(cal, p):
    """{"method": "none" | "isotonic" | "platt", ...} -> calibrated p (rollout.ts calibrate())."""
    if not cal or cal["method"] == "none":
        return p
    if cal["method"] == "platt":
        a, b = cal["ab"]
        return 1 / (1 + math.exp(-(a * _logit(p) + b)))
    return iso_apply(cal["knots"], p)


def cal_fit(method, xs, ys):
    if method == "platt":
        return {"method": "platt", "ab": platt_fit(xs, ys)}
    if method == "isotonic":
        return {"method": "isotonic", "knots": iso_fit(xs, ys)}
    return {"method": "none"}


def solver_hp_weight(row):
    S = row["S"]
    hp_frac = S["hp"] / max(1, S["mhp"] or 80)
    return 1.0 + 1.5 * max(0.0, 0.6 - hp_frac) / 0.6


def choose_calibration(rows, preds, fold_of_run):
    """Per fight kind: none / isotonic / Platt, whichever has the lowest nested out-of-fold Brier (a map must
    beat raw by CAL_MIN_GAIN). Returns the chosen method per kind, the check table, and per-row nested p."""
    folds = sorted(set(fold_of_run.values()))
    check = {}
    methods = {}
    p_nested = [None] * len(rows)
    for kind in FIGHT_KINDS:
        idx = [i for i, r in enumerate(rows) if r["kind"] == kind]
        ys = {i: 1 if rows[i]["outcome"] == "won" else 0 for i in idx}
        nested = {m: {} for m in ("none", "isotonic", "platt")}
        for k in folds:
            tr = [i for i in idx if fold_of_run[rows[i]["run"]] != k]
            te = [i for i in idx if fold_of_run[rows[i]["run"]] == k]
            for m in nested:
                cal = cal_fit(m, [preds[i]["gbm"][1] for i in tr], [ys[i] for i in tr])
                for i in te:
                    nested[m][i] = cal_apply(cal, preds[i]["gbm"][1])
        scores = {m: brier([nested[m][i] for i in idx], [ys[i] for i in idx]) for m in nested}
        best = min(scores, key=scores.get)
        if scores["none"] - scores[best] < CAL_MIN_GAIN:
            best = "none"
        methods[kind] = best
        for i in idx:
            p_nested[i] = nested[best][i]
        check[kind] = {"n": len(idx), "method": best, **{f"brier_{m}": round(v, 4) for m, v in scores.items()},
                       "reliability_raw": [[b[0], b[1], round(b[2], 3), round(b[3], 3)] for b in reliability([preds[i]["gbm"][1] for i in idx], [ys[i] for i in idx])],
                       "reliability_chosen": [[b[0], b[1], round(b[2], 3), round(b[3], 3)] for b in reliability([nested[best][i] for i in idx], [ys[i] for i in idx])]}
    return methods, check, p_nested


def gate_records(rows, preds, p_cal, choice_flags):
    """Per test row: the similar-state key, the realised outcome, and both values on the HP scale."""
    recs = []
    for row, p, pc, flag in zip(rows, preds, p_cal, choice_flags):
        S = row["S"]
        died = row["outcome"] == "died"
        y = S["hp"] if died else max(0, S["hp"] - row["final_hp"])
        own = max(0, S["hp"] - row["E"]["hp"])
        vm = -own - p["gbm"][0] - DEATH_HP * (1 - pc)
        vw = solver_weights_value(row) / solver_hp_weight(row)
        ehp = sum(max(0, e[2]) for e in S["E"] if e[5] and not e[6])
        recs.append({
            "key": (row["enc"], row["t"], S["hp"] // 10, ehp // 20), "fid": row["fid"], "y": y, "win": 0 if died else 1,
            "vm": vm, "vw": vw, "p_raw": p["gbm"][1], "p_cal": pc, "enc": row["enc"], "act": row["act"], "kind": row["kind"],
            "choice": flag,
        })
    return recs


def pair_groups(recs):
    """Similar-state groups -> list of pairs (a, b, a_better) across fights with different outcomes."""
    groups = collections.defaultdict(list)
    for r in recs:
        groups[r["key"]].append(r)
    out = {}
    for key, g in groups.items():
        pairs = []
        for i in range(len(g)):
            for j in range(i + 1, len(g)):
                a, b = g[i], g[j]
                if a["fid"] == b["fid"] or a["y"] == b["y"]:
                    continue
                pairs.append((a, b, a["y"] < b["y"]))
        if pairs:
            out[key] = pairs
    return out


def _conc(va, vb, a_better):
    if va == vb:
        return 0.5
    return 1.0 if (va > vb) == a_better else 0.0


def group_sums(pairs, weights=GATE_GRID):
    """[current correct, blend correct for each weight...], pairs, rows: one similar-state group."""
    out = [0.0] * (1 + len(weights))
    for a, b, better in pairs:
        out[0] += _conc(a["vw"], b["vw"], better)
        for k, w in enumerate(weights):
            out[1 + k] += _conc(w * a["vm"] + (1 - w) * a["vw"], w * b["vm"] + (1 - w) * b["vw"], better)
    rows_in = len({id(a) for a, _, _ in pairs} | {id(b) for _, b, _ in pairs})
    return out, len(pairs), rows_in


def segment_stats(entries, rng, boots=GATE_BOOT):
    """Concordance of the current weights and of each blend, each blend's advantage and its cluster-bootstrap CI."""
    n = sum(e[1] for e in entries)
    rows_in = sum(e[2] for e in entries)
    grid = list(GATE_GRID)
    if n == 0:
        return {"n_pairs": 0, "n_rows": 0, "conc_current": None, "conc_model": None, "advantage": 0.0, "ci": [None, None],
                "w_cap": 1.0, "blend": {}}
    tot = [sum(e[0][k] for e in entries) for k in range(1 + len(grid))]
    diffs = [[] for _ in grid]
    m = len(entries)
    for _ in range(boots):
        t = [0.0] * (1 + len(grid))
        tn = 0
        for _ in range(m):
            e = entries[rng.randrange(m)]
            for k in range(len(t)):
                t[k] += e[0][k]
            tn += e[1]
        for k in range(len(grid)):
            diffs[k].append((t[1 + k] - t[0]) / tn if tn else 0.0)
    blend = {}
    for k, w in enumerate(grid):
        d = sorted(diffs[k])
        lo = d[int(boots * (1 - GATE_CI) / 2)]
        hi = d[min(boots - 1, int(boots * (1 + GATE_CI) / 2))]
        blend[str(w)] = {"conc": round(tot[1 + k] / n, 4), "advantage": round((tot[1 + k] - tot[0]) / n, 4), "ci": [round(lo, 4), round(hi, 4)]}
    w_cap = max(grid, key=lambda w: (blend[str(w)]["ci"][0], w))
    chosen = blend[str(w_cap)]
    return {"n_pairs": n, "n_rows": rows_in, "conc_current": round(tot[0] / n, 4), "conc_model": blend["1.0"]["conc"],
            "advantage_model": blend["1.0"]["advantage"], "ci_model": blend["1.0"]["ci"],
            "w_cap": w_cap, "advantage": chosen["advantage"], "ci": chosen["ci"], "blend": blend}


def segment_keys(rec):
    """Most specific first: encounter, act x fight kind, fight kind (all acts), everything."""
    return ["enc:" + rec["enc"], f"ak:{rec['act']}|{rec['kind']}", f"k:{rec['kind']}", "global"]


def build_segments(groups, rng, boots=GATE_BOOT, model_only=False):
    """Every segment's stats, the level each encounter uses (its own, or backed off), and w.
    model_only: the rule measured on the model alone (w_cap = 1), for the nested comparison."""
    members = collections.defaultdict(list)
    meta = {}
    for key, pairs in groups.items():
        rec = pairs[0][0]
        entry = group_sums(pairs)
        for seg in segment_keys(rec):
            members[seg].append(entry)
        meta.setdefault("enc:" + rec["enc"], {"act": rec["act"], "kind": rec["kind"]})
        meta.setdefault(f"ak:{rec['act']}|{rec['kind']}", {"act": rec["act"], "kind": rec["kind"]})
        meta.setdefault(f"k:{rec['kind']}", {"kind": rec["kind"]})
    segs = {}
    for seg in sorted(members):
        st = segment_stats(members[seg], rng, boots)
        if model_only:
            st["w_cap"], st["advantage"], st["ci"] = 1.0, st["advantage_model"], st["ci_model"]
        st.update(meta.get(seg, {}))
        st["level"] = seg.split(":")[0] if seg != "global" else "global"
        segs[seg] = st
    for seg, st in segs.items():
        uses = seg
        if st["level"] == "enc" and st["n_rows"] < GATE_MIN_ROWS:
            uses = f"ak:{st['act']}|{st['kind']}"
        if uses.startswith("ak:") and segs.get(uses, {}).get("n_rows", 0) < GATE_MIN_ROWS:
            uses = f"k:{st['kind']}"
        if uses.startswith("k:") and segs.get(uses, {}).get("n_rows", 0) < GATE_MIN_ROWS:
            uses = "global"
        st["uses"] = uses
    for seg, st in segs.items():
        own = segs[st["uses"]]
        st["w"] = round(gate_weight(own["n_rows"], own["ci"][0] if own["ci"][0] is not None else 0.0, own["w_cap"]), 4)
    return segs


def resolve_segment(segs, enc, act, kind):
    """The segment an encounter's decision uses and its w (rollout.ts gateFor)."""
    for key in ("enc:" + enc, f"ak:{act}|{kind}", f"k:{kind}", "global"):
        if key in segs:
            return segs[key]["uses"], segs[key]["w"]
    return None, 0.0


def gate_nested_check(recs, boots=200):
    """Honest check of the gating rule: w per segment from 4/5 of the similar-state groups, scored on the
    held-out 1/5 (groups assigned to folds by a hash of their key). Both rules: blend-aware (w_cap from the
    grid) and model-only (the model alone must beat the current weights)."""
    groups = pair_groups(recs)
    fold = {key: int(run_hash("|".join(map(str, key)) + "#gate") * 5) % 5 for key in groups}
    rng = random.Random(11)
    labels = ["current", "model", "gated", "gated model-only", "blend 0.5"]
    tallies = collections.defaultdict(lambda: [0.0] * (len(labels) + 1))
    for k in range(5):
        train_groups = {key: p for key, p in groups.items() if fold[key] != k}
        segs = build_segments(train_groups, rng, boots)
        segs_m = build_segments(train_groups, rng, boots, model_only=True)
        for key, pairs in groups.items():
            if fold[key] != k:
                continue
            rec = pairs[0][0]
            _, w = resolve_segment(segs, rec["enc"], rec["act"], rec["kind"])
            _, wm = resolve_segment(segs_m, rec["enc"], rec["act"], rec["kind"])
            for a, b, better in pairs:
                vals = [_conc(a["vw"], b["vw"], better), _conc(a["vm"], b["vm"], better)]
                for ww in (w, wm, 0.5):
                    vals.append(_conc(ww * a["vm"] + (1 - ww) * a["vw"], ww * b["vm"] + (1 - ww) * b["vw"], better))
                subsets = ["all", rec["kind"]] + (["choice points"] if a["choice"] and b["choice"] else [])
                for label in subsets:
                    t = tallies[label]
                    for j, v in enumerate(vals):
                        t[j] += v
                    t[-1] += 1
    return {label: {"pairs": int(t[-1]), **{labels[j]: t[j] / t[-1] for j in range(len(labels))}} for label, t in tallies.items() if t[-1]}


def build_gates(rows, preds, fold_of_run, choice_flags):
    """fight-value-gates.json: calibration (chosen per kind by nested Brier, fitted on all out-of-fold rows)
    and the segment table."""
    t0 = time.time()
    methods, cal_check, p_nested = choose_calibration(rows, preds, fold_of_run)
    recs = gate_records(rows, preds, p_nested, choice_flags)
    groups = pair_groups(recs)
    segs = build_segments(groups, random.Random(5))
    calibration = {}
    for kind in FIGHT_KINDS:
        sel = [i for i, r in enumerate(rows) if r["kind"] == kind]
        calibration[kind] = cal_fit(methods[kind], [preds[i]["gbm"][1] for i in sel], [1 if rows[i]["outcome"] == "won" else 0 for i in sel])
    nested = gate_nested_check(recs)
    print(f"[gates] {len(segs)} segments, {sum(len(p) for p in groups.values())} pairs in {time.time() - t0:.0f}s", file=sys.stderr)
    return {"segments": segs, "calibration": calibration, "calibration_check": cal_check, "nested": nested,
            "recs": len(recs), "pairs": sum(len(p) for p in groups.values())}


def write_gates(path, gates, rows):
    out = {
        "note": "Generated by tools/build-fight-value.py train (Part A gating). Live, only as FACTS on Jev's combat options (src/strategy/rollout-live.ts), never in the ranking. "
                "Per segment of decision points (encounter; backed off to act x fight kind, then fight kind, then global, below "
                f"{GATE_MIN_ROWS} similar-state decision points): the fair same-state ranking test of blends of the fight-value model with the "
                "current turn-solver weights, against the current weights alone, on out-of-fold predictions, with a cluster-bootstrap "
                "CI; the model's blend weight w. Line value (HP-equivalent) = w x model value + (1 - w) x current value; model value = "
                f"-own-turn HP loss - E[further HP loss] - {DEATH_HP:g} x (1 - calibrated win prob); current value = solver score / "
                "solver HP weight. Win probabilities: calibration per fight kind (none / isotonic knots / Platt), chosen by nested "
                "out-of-fold Brier. See notes/rollout-backtest.md.",
        "generated_from": {"rows": len(rows), "fights": len({r["fid"] for r in rows}), "runs": len({r["run"] for r in rows}),
                           "last_ts": max(r["ts1"] for r in rows), "pairs": gates["pairs"]},
        "params": {"min_rows": GATE_MIN_ROWS, "n0": GATE_N0, "a_full": GATE_A_FULL, "bootstrap": GATE_BOOT, "ci": GATE_CI,
                   "grid": list(GATE_GRID), "death_hp": DEATH_HP,
                   "formula": "w = w_cap * n/(n+n0) * smoothstep(clamp(ci_lo/a_full, 0, 1)); n = rows; w_cap = grid weight with the highest ci_lo"},
        "calibration": gates["calibration"],
        "calibration_check": gates["calibration_check"],
        "nested_check": {k: {kk: round(vv, 4) if isinstance(vv, float) else vv for kk, vv in v.items()} for k, v in gates["nested"].items()},
        "segments": gates["segments"],
    }
    with open(path, "w", encoding="utf8") as handle:
        json.dump(out, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")


def gate_notes(gates):
    segs = gates["segments"]
    L = ["## Gates (Part A): where the model earns a say", ""]
    L.append(f"Segments = encounters (backed off to act x kind, then kind, then global, below {GATE_MIN_ROWS} decision points in pairs). Advantage = concordance of "
             f"the blend w_cap x model + (1 - w_cap) x current minus the current weights' (w_cap on {list(GATE_GRID)}, the one with the "
             f"highest lower bound); w = w_cap x n/(n+{GATE_N0:g}) x smoothstep(CI low / {GATE_A_FULL}). {GATE_BOOT} cluster-bootstrap "
             f"resamples of the similar-state groups, {int(GATE_CI * 100)}% CI. Written to src/knowledge/fight-value-gates.json.")
    L.append("")
    own = [(k, s) for k, s in segs.items() if s["uses"] == k]
    L.append(f"- {len(segs)} segments ({sum(1 for s in segs.values() if s['level'] == 'enc')} encounters); {len(own)} carry their own gate, "
             f"{sum(1 for _, s in own if s['w'] > 0.05)} of them with w > 0.05; {sum(1 for s in segs.values() if s['level'] == 'enc' and s['w'] > 0.05)} "
             "encounters end up with w > 0.05 (own or backed off).")
    L.append("")
    L.append("| segment | pairs | rows | conc. current | conc. model | model adv. [90% CI] | w_cap | blend adv. [90% CI] | w | used by |")
    L.append("|---|---|---|---|---|---|---|---|---|---|")
    users = collections.Counter(s["uses"] for s in segs.values())
    for k, s in sorted(own, key=lambda kv: -kv[1]["n_pairs"]):
        L.append(f"| {k} | {s['n_pairs']} | {s['n_rows']} | {s['conc_current']} | {s['conc_model']} | {s['advantage_model']:+.3f} "
                 f"[{s['ci_model'][0]:+.3f}, {s['ci_model'][1]:+.3f}] | {s['w_cap']} | {s['advantage']:+.3f} [{s['ci'][0]:+.3f}, {s['ci'][1]:+.3f}] | "
                 f"{s['w']:.2f} | {users[k]} |")
    L.append("")
    L.append("Nested check (w fitted on 4/5 of the similar-state groups, scored on the held-out 1/5; concordance, 0.5 = chance):")
    L.append("")
    L.append("| subset | pairs | current | model | gated (blend-aware) | gated (model-only rule) | fixed 0.5 blend |")
    L.append("|---|---|---|---|---|---|---|")
    for label in ["all"] + FIGHT_KINDS + ["choice points"]:
        r = gates["nested"].get(label)
        if r:
            L.append(f"| {label} | {r['pairs']} | {r['current']:.3f} | {r['model']:.3f} | {r['gated']:.3f} | {r['gated model-only']:.3f} | {r['blend 0.5']:.3f} |")
    L.append("")
    L.append("Win-probability calibration (per fight kind; Brier of out-of-fold predictions, each map fitted on the other folds):")
    L.append("")
    L.append("| kind | n | raw | isotonic | Platt | used |")
    L.append("|---|---|---|---|---|---|")
    for kind, c in gates["calibration_check"].items():
        L.append(f"| {kind} | {c['n']} | {c['brier_none']:.4f} | {c['brier_isotonic']:.4f} | {c['brier_platt']:.4f} | {c['method']} |")
    L.append("")
    return "\n".join(L)


# ---------------------------------------------------------------- rollout backtest report (Part C)

EVALUATORS = [("i", "cur", "(i) current score"), ("ii", "ii", "(ii) 1 turn + gated terminal"), ("iii", "iii", "(iii) 5-turn rollout + gated terminal"),
              ("ii_m", "iiModel", "(ii') 1 turn + model, w = 1"), ("iii_m", "iiiModel", "(iii') rollout + model terminal, w = 1")]


def load_evals(work):
    out = []
    for name in sorted(os.listdir(work)):
        if name.startswith("eval-") and name.endswith(".jsonl"):
            with open(os.path.join(work, name), encoding="utf8") as handle:
                out += [json.loads(line) for line in handle if line.strip()]
    return out


def pair_test(points, labels, rng, boots=GATE_BOOT):
    """Fair same-state pairing on decision points: concordance per evaluator and the cluster-bootstrap CI of
    each evaluator's difference to (i)."""
    groups = collections.defaultdict(list)
    for p in points:
        groups[p["key"]].append(p)
    sums = []
    for g in groups.values():
        s = [0.0] * len(labels)
        n = 0
        for i in range(len(g)):
            for j in range(i + 1, len(g)):
                a, b = g[i], g[j]
                if a["fid"] == b["fid"] or a["y"] == b["y"]:
                    continue
                n += 1
                for k, lab in enumerate(labels):
                    s[k] += _conc(a["v"][lab], b["v"][lab], a["y"] < b["y"])
        if n:
            sums.append((s, n))
    n = sum(x[1] for x in sums)
    if not n:
        return None
    res = {"pairs": n, "groups": len(sums), "conc": {lab: sum(x[0][k] for x in sums) / n for k, lab in enumerate(labels)}, "ci": {}}
    m = len(sums)
    diffs = {lab: [] for lab in labels[1:]}
    for _ in range(boots):
        t = [0.0] * len(labels)
        tn = 0
        for _ in range(m):
            s, c = sums[rng.randrange(m)]
            for k in range(len(labels)):
                t[k] += s[k]
            tn += c
        for k, lab in enumerate(labels[1:], start=1):
            diffs[lab].append((t[k] - t[0]) / tn)
    for lab, d in diffs.items():
        d.sort()
        res["ci"][lab] = (d[int(boots * 0.05)], d[min(boots - 1, int(boots * 0.95))])
    return res


def rollout_report(work, rows_path, notes_path, gates_path):
    rows = {}
    for r in load_rows(rows_path):
        rows[f"{r['run']}|{r['floor']}|{r['t']}"] = r
    evals = load_evals(work)
    errors = collections.Counter(e["error"].split(":")[0] for e in evals if "error" in e)
    ok = [e for e in evals if "error" not in e]
    points = []
    unmatched = 0
    for e in ok:
        row = rows.get(e["key"])
        played = [l for l in e["lines"] if l["played"]]
        if row is None or not played:
            unmatched += 1
            continue
        l = played[0]
        S = row["S"]
        died = row["outcome"] == "died"
        y = S["hp"] if died else max(0, S["hp"] - row["final_hp"])
        ehp = sum(max(0, x[2]) for x in S["E"] if x[5] and not x[6])
        v = {lab: l[field] for lab, field, _ in EVALUATORS}
        if v["ii_m"] is None:
            v["ii_m"] = v["ii"]
        if v["iii_m"] is None:
            v["iii_m"] = v["iii"]
        # Regret: the played line's value minus the best offered line's, per evaluator (0 = it agrees with
        # the choice). It does not carry the state's own strength (deck, relics), only the choice.
        offered = [x for x in e["lines"] if x["offer"]] or [l]
        for lab, field, _ in EVALUATORS:
            alt = "ii" if lab == "ii_m" else "iii" if lab == "iii_m" else field
            vals = [x[field] if x[field] is not None else x[alt] for x in offered]
            v["r_" + lab] = v[lab] - max(vals)
        points.append({"key": (row["enc"], row["t"], S["hp"] // 10, ehp // 20), "fid": row["fid"], "y": y, "win": 0 if died else 1,
                       "kind": row["kind"], "seg": l["seg"], "w": l["w"], "v": v, "line": l, "e": e})
    labels = [lab for lab, _, _ in EVALUATORS]
    rlabels = ["r_" + lab for lab in labels]
    rng = random.Random(21)
    subsets = [("all", lambda p: True)] + [(k, (lambda k: lambda p: p["kind"] == k)(k)) for k in FIGHT_KINDS]
    subsets += [("gate w > 0.05", lambda p: p["w"] > 0.05), ("gate w <= 0.05", lambda p: p["w"] <= 0.05)]
    segs = collections.Counter(p["seg"] for p in points)
    for seg, _ in segs.most_common():
        subsets.append((f"segment {seg}", (lambda s: lambda p: p["seg"] == s)(seg)))
    table = []
    rtable = []
    for name, sel in subsets:
        pts = [p for p in points if sel(p)]
        res = pair_test(pts, labels, rng)
        if res and res["pairs"] >= 20:
            table.append((name, len(pts), res))
        res = pair_test(pts, rlabels, rng)
        if res and res["pairs"] >= 20:
            rtable.append((name, len(pts), res))
    # Pooled: realised loss when the evaluator's best offered line was played vs when it was not.
    pooled = {}
    for lab in labels:
        for kind in ["all"] + FIGHT_KINDS:
            pts = [p for p in points if (kind == "all" or p["kind"] == kind) and len([x for x in p["e"]["lines"] if x["offer"]]) >= 2]
            top = [p["y"] for p in pts if p["v"]["r_" + lab] >= -1e-9]
            other = [p["y"] for p in pts if p["v"]["r_" + lab] < -1e-9]
            pooled[(lab, kind)] = (len(top), sum(top) / max(1, len(top)), len(other), sum(other) / max(1, len(other)))
    # Agreement with realised outcomes: HP-loss forecast of the played line (from the turn's start to the
    # fight's end) and win probability.
    def mae_of(pts, f):
        return sum(abs(f(p) - p["y"]) for p in pts) / max(1, len(pts))
    forecast = []
    for name, sel in [("all", lambda p: True)] + [(k, (lambda k: lambda p: p["kind"] == k)(k)) for k in FIGHT_KINDS]:
        pts = [p for p in points if sel(p)]
        if not pts:
            continue
        lm = lambda p, k, alt: p["line"][k] if p["line"].get(k) is not None else p["line"][alt]
        forecast.append((name, len(pts), {
            "this turn only (solver)": mae_of(pts, lambda p: p["line"]["hpLoss0"]),
            "(ii) 1 turn + terminal": mae_of(pts, lambda p: p["line"]["iiLoss"]),
            "(iii) rollout + terminal": mae_of(pts, lambda p: p["line"]["iiiLoss"]),
            "ii_m": mae_of(pts, lambda p: lm(p, "iiLossM", "iiLoss")),
            "iii_m": mae_of(pts, lambda p: lm(p, "iiiLossM", "iiiLoss")),
        }, {
            "(ii)": brier([p["line"]["iiWin"] for p in pts], [p["win"] for p in pts]),
            "(iii)": brier([p["line"]["iiiWin"] for p in pts], [p["win"] for p in pts]),
            "ii_m": brier([lm(p, "iiWinM", "iiWin") for p in pts], [p["win"] for p in pts]),
            "iii_m": brier([lm(p, "iiiWinM", "iiiWin") for p in pts], [p["win"] for p in pts]),
        }, sum(p["win"] for p in pts) / len(pts)))
    # Within a decision: which offered line each evaluator ranks first, and how often that is the line played.
    agree = collections.defaultdict(lambda: [0, 0])
    same_top = collections.defaultdict(lambda: [0, 0])
    for p in points:
        offered = [l for l in p["e"]["lines"] if l["offer"]]
        if len(offered) < 2:
            continue
        tops = {}
        for lab, field, _ in EVALUATORS:
            vals = [(l[field] if l[field] is not None else l["ii" if lab == "ii_m" else "iii"]) for l in offered]
            tops[lab] = offered[max(range(len(offered)), key=lambda i: vals[i])]
            agree[lab][0] += 1 if tops[lab]["played"] else 0
            agree[lab][1] += 1
        for lab in labels[1:]:
            same_top[lab][0] += 1 if tops[lab] is tops["i"] else 0
            same_top[lab][1] += 1
    ms = sorted(e["ms"] for e in ok)
    pct = lambda q: ms[min(len(ms) - 1, int(len(ms) * q))] if ms else 0
    horizons = collections.Counter((e["horizon"], e["samples"]) for e in ok)
    pol_turns = sum(e["policyTurns"] for e in ok)
    pol_ms = sum(e["policyMs"] for e in ok)
    pol_nodes = sum(e["policyNodes"] for e in ok)
    piles = collections.Counter(e["piles"] for e in ok)
    matched = sum(e["matched"] for e in ok)
    offered_n = sum(e["offered"] for e in ok)
    gates = json.load(open(gates_path, encoding="utf8")) if os.path.exists(gates_path) else {"segments": {}}
    own = [(k, s) for k, s in gates["segments"].items() if s["uses"] == k]

    L = ["# Rollout and gated fight value: backtest", "",
         "Generated by `python3 tools/build-fight-value.py rollout-report` from `npx tsx tools/rollout-backtest.ts` "
         "(numbers below are from the run that wrote this file). `src/strategy/rollout.ts` and "
         "`src/knowledge/fight-value-gates.json`: Live, only as FACTS on Jev's combat options (src/strategy/rollout-live.ts), never in the ranking.", "", ROLLOUT_FINDINGS]
    L.append("## Setup")
    L.append("")
    L.append(f"- Decision points: {len(evals)} logged plan choices (A7+, first of the turn, joined to a fight-value row); "
             f"{len(ok)} replayed ({dict(errors) or 'no errors'}), {len(points)} with the played line identified and evaluated.")
    L.append(f"- Offered lines matched to the replayed solver's plans by plays text: {matched}/{offered_n} "
             f"({matched / max(1, offered_n):.1%}); the live planner is re-run on the logged board with empty per-fight memory "
             "and FIGHT_PLAN off, so a few offers differ.")
    L.append(f"- Piles: {dict(piles)} (logged = the state's agent_view draw/discard piles; deck-minus-hand = approximation when the log has none).")
    L.append(f"- Candidates per decision: top 6 by score + most damage + least HP lost + most setup + every offered line "
             f"(mean {sum(len(e['lines']) for e in ok) / max(1, len(ok)):.1f}).")
    L.append("- Rollout: 5 turns x 8 samples (common random numbers across lines), enemies by move model + monster DB "
             "(base damage, hits, Strength and Block per move), our turns by the solver capped at 1500 nodes, no potions after turn 0; "
             "terminal = w x model (calibrated) + (1 - w) x deck-damage clock, w from the gate of the encounter's segment.")
    L.append("- Played line = the HP guard's replacement when the rationale says so, else the answer's choice.")
    L.append("- Realised outcome = HP lost from the start of the turn to the fight's end (death: all HP), from the fight-value rows.")
    L.append("")
    L.append("## Runtime per decision (all candidate lines)")
    L.append("")
    L.append(f"- median {pct(0.5)} ms, p95 {pct(0.95)} ms, max {ms[-1] if ms else 0} ms over all {len(ms)} decisions "
             "(budget 1500 ms; 16 shards in parallel on 32 cores, so slower than alone).")
    solo_dir = os.path.join(work, "solo")
    solo = load_evals(solo_dir) if os.path.isdir(solo_dir) else []
    solo = [e for e in solo if "ms" in e]
    if solo:
        sm = sorted(e["ms"] for e in solo)
        st = sum(e["policyTurns"] for e in solo)
        L.append(f"- Alone (one process, {len(sm)} decisions = 1/8 of them): median {sm[len(sm) // 2]} ms, p95 {sm[int(len(sm) * 0.95)]} ms, "
                 f"max {sm[-1]} ms; policy {sum(e['policyMs'] for e in solo) / max(1, st):.2f} ms per simulated turn.")
    L.append(f"- (horizon, samples) used: {dict(horizons.most_common())}.")
    L.append(f"- Fast policy: {pol_turns} solver turns, {pol_ms / max(1, pol_turns):.2f} ms and {pol_nodes / max(1, pol_turns):.0f} nodes per turn on average.")
    L.append("")
    L.append("## Fair same-state pairing test (played line's value vs realised outcome)")
    L.append("")
    L.append("Pairs of decision points from different fights with the same encounter, turn, our HP//10 and enemy HP//20 at the start; "
             "an evaluator is right when it values the played line of the pair that lost less HP by the fight's end higher. "
             "0.5 = chance. CI: 90% cluster bootstrap (groups resampled) of the difference to (i).")
    L.append("")
    L.append("| subset | points | pairs (groups) | (i) current | (ii) 1-turn gated | (iii) rollout gated | (ii') model w=1 | (iii') rollout model | ii - i [CI] | iii - i [CI] |")
    L.append("|---|---|---|---|---|---|---|---|---|---|")
    for name, npts, r in table:
        c = r["conc"]
        ci = r["ci"]
        L.append(f"| {name} | {npts} | {r['pairs']} ({r['groups']}) | {c['i']:.3f} | {c['ii']:.3f} | {c['iii']:.3f} | {c['ii_m']:.3f} | {c['iii_m']:.3f} | "
                 f"{c['ii'] - c['i']:+.3f} [{ci['ii'][0]:+.3f}, {ci['ii'][1]:+.3f}] | {c['iii'] - c['i']:+.3f} [{ci['iii'][0]:+.3f}, {ci['iii'][1]:+.3f}] |")
    L.append("")
    L.append("Same test on the regret (played line's value minus the best offered line's value, per evaluator): it keeps only "
             "what the evaluator says about the CHOICE, not the strength of the state (deck, relics, draw pile), which the plain "
             "values above also carry.")
    L.append("")
    L.append("| subset | points | pairs (groups) | (i) | (ii) | (iii) | (ii') | (iii') | ii - i [CI] | iii - i [CI] |")
    L.append("|---|---|---|---|---|---|---|---|---|---|")
    for name, npts, r in rtable:
        c = r["conc"]
        ci = r["ci"]
        L.append(f"| {name} | {npts} | {r['pairs']} ({r['groups']}) | {c['r_i']:.3f} | {c['r_ii']:.3f} | {c['r_iii']:.3f} | {c['r_ii_m']:.3f} | {c['r_iii_m']:.3f} | "
                 f"{c['r_ii'] - c['r_i']:+.3f} [{ci['r_ii'][0]:+.3f}, {ci['r_ii'][1]:+.3f}] | {c['r_iii'] - c['r_i']:+.3f} [{ci['r_iii'][0]:+.3f}, {ci['r_iii'][1]:+.3f}] |")
    L.append("")
    L.append("Pooled (decisions with 2+ offers): mean realised HP loss to the fight's end when the evaluator's best offered line was played, and when it was not.")
    L.append("")
    L.append("| evaluator | subset | n played its top | mean loss | n played another | mean loss | difference |")
    L.append("|---|---|---|---|---|---|---|")
    for lab, _, title in EVALUATORS:
        for kind in ["all"] + FIGHT_KINDS:
            nt, mt, no, mo = pooled[(lab, kind)]
            L.append(f"| {title} | {kind} | {nt} | {mt:.1f} | {no} | {mo:.1f} | {mo - mt:+.1f} |")
    L.append("")
    L.append("## Forecast of the played line vs what happened")
    L.append("")
    L.append("Expected HP lost from the start of the turn to the fight's end for the played line, against the realised loss; "
             "gated = terminal w x model + (1 - w) x clock; model = terminal from the model alone (w = 1).")
    L.append("")
    L.append("| subset | points | win rate | MAE: this turn only | MAE (ii) gated | MAE (ii') model | MAE (iii) gated | MAE (iii') model | Brier (ii) | Brier (ii') | Brier (iii) | Brier (iii') |")
    L.append("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for name, npts, m, b, wr in forecast:
        L.append(f"| {name} | {npts} | {wr:.3f} | {m['this turn only (solver)']:.2f} | {m['(ii) 1 turn + terminal']:.2f} | {m['ii_m']:.2f} | "
                 f"{m['(iii) rollout + terminal']:.2f} | {m['iii_m']:.2f} | {b['(ii)']:.4f} | {b['ii_m']:.4f} | {b['(iii)']:.4f} | {b['iii_m']:.4f} |")
    L.append("")
    L.append("## Within a decision")
    L.append("")
    L.append("Among the offered lines (decisions with 2+ offers): how often each evaluator's best line is the one played, and how often it is (i)'s best.")
    L.append("")
    L.append("| evaluator | top = played | top = (i)'s top |")
    L.append("|---|---|---|")
    for lab, _, title in EVALUATORS:
        a = agree[lab]
        s = same_top.get(lab)
        L.append(f"| {title} | {a[0] / max(1, a[1]):.3f} ({a[1]}) | {'-' if s is None else f'{s[0] / max(1, s[1]):.3f}'} |")
    L.append("")
    L.append("## Gate table (src/knowledge/fight-value-gates.json)")
    L.append("")
    L.append(f"- {len(gates['segments'])} segments, {len(own)} with their own gate; {sum(1 for _, s in own if s['w'] > 0.05)} of those with w > 0.05; "
             f"{sum(1 for s in gates['segments'].values() if s['level'] == 'enc' and s['w'] > 0.05)} of "
             f"{sum(1 for s in gates['segments'].values() if s['level'] == 'enc')} encounters end up with w > 0.05. "
             "Full table and the nested check: notes/fight-value-backtest.md.")
    L.append("")
    L.append("| segment | rows | conc. current | model adv. [CI] | w_cap | blend adv. [CI] | w |")
    L.append("|---|---|---|---|---|---|---|")
    for k, s in sorted(own, key=lambda kv: -kv[1]["n_rows"]):
        L.append(f"| {k} | {s['n_rows']} | {s['conc_current']} | {s['advantage_model']:+.3f} [{s['ci_model'][0]:+.3f}, {s['ci_model'][1]:+.3f}] | "
                 f"{s['w_cap']} | {s['advantage']:+.3f} [{s['ci'][0]:+.3f}, {s['ci'][1]:+.3f}] | {s['w']:.2f} |")
    L.append("")
    L.append("## Rebuild (after each run)")
    L.append("")
    L.append("```")
    L.append("export PATH=$HOME/.local/node/bin:$PATH")
    L.append("# 1. model + gates + calibration (src/knowledge/fight-value.json, fight-value-gates.json, notes/fight-value-backtest.md), ~5 min")
    L.append("python3 tools/build-fight-value.py all      # extract logs -> .cache/fight-value-rows.jsonl, then train")
    L.append("# 2. optional backtest of the rollout (this file), ~5 min")
    L.append("python3 tools/build-fight-value.py folds --fold-dir /tmp/rb/folds")
    L.append("npx tsx tools/rollout-backtest.ts extract --work /tmp/rb")
    L.append("for i in $(seq 0 15); do npx tsx tools/rollout-backtest.ts run --work /tmp/rb --shard $i --shards 16 --fold-dir /tmp/rb/folds & done; wait")
    L.append("mkdir -p /tmp/rb/solo && ln -sf /tmp/rb/decisions.jsonl /tmp/rb/solo/ && npx tsx tools/rollout-backtest.ts run --work /tmp/rb/solo --shard 3 --shards 8 --fold-dir /tmp/rb/folds")
    L.append("python3 tools/build-fight-value.py rollout-report --work /tmp/rb")
    L.append("```")
    L.append("")
    with open(notes_path, "w", encoding="utf8") as handle:
        handle.write("\n".join(L) + "\n")
    print(f"rollout-report: {len(points)} points -> {notes_path}")


ROLLOUT_FINDINGS = """## Reading (hand-written 2026-09-28 from the run below; regenerate the numbers, re-read this)

- Evaluators, all on one HP-equivalent scale: (i) the current solver score / its HP weight; (ii) the line's own
  turn + the fight-value terminal of its end-of-turn state, blended with (i) by the gate weight w of the
  encounter's segment; (iii) the line + 4 more simulated turns x 8 samples + the gated terminal. The terminal
  model and the gates are OUT OF FOLD (build-fight-value.py folds: each decision is scored by a model and gates
  that never saw its run); the enemy move tables (move model, monster DB) are in-sample aggregates.
- Plain pairing test (played line's value, pairs of similar start states): (iii) 0.679 vs (i) 0.575,
  +0.104 [+0.061, +0.145]. This flatters any evaluator that sees the whole state (deck, draw pile): part of
  it is "this run's deck is stronger", not "this line is better".
- Regret test (the played line's value minus the best offered line's, same pairs) isolates the CHOICE:
  (iii) 0.579 vs (i) 0.537, +0.042 [+0.011, +0.068] overall; hallway +0.042 [+0.010, +0.074]; elite
  +0.079 [+0.028, +0.131]; boss +0.024 [-0.017, +0.068] (not established). (ii) adds nothing over (i)
  (+0.003 [-0.008, +0.013]): the 1-turn terminal mostly re-ranks within noise, and w = 0 for every elite
  and boss segment, where (ii) is (i) by construction.
- Pooled, when the rollout's favourite offered line was the one played, the fight cost 1.8 HP less
  (boss 6.7, elite 4.7; (i): 3.2 and 3.1). Confounded (the state differs), but it points the same way.
- Forecasts for Jev: the model terminal (w = 1) is the best forecast of HP lost to the fight's end (MAE 7.3
  rollout / 7.6 one turn vs 14.2 for "this turn only"; boss 9.9 vs 30.9) and of the win (Brier 0.079).
  The GATED terminal is a poor forecast (boss MAE 24-64): with w = 0 it falls back to the deck-damage
  clock, which is fine as a ranking fallback but not as a number to show. Show the model's numbers with
  their n; use w only to weight the model in the RANKING.
- The rollout disagrees with (i)'s top line in 44% of decisions (Jev played (i)'s top 59% of the time,
  the rollout's 49%): wiring it in as the ranking is a large behaviour change, not a tweak.
- Runtime: alone, median 47 ms, p95 367 ms, max 1.41 s per decision (all 7-8 candidate lines, 5 turns x 8
  samples in 96% of decisions); the fast policy (solver capped at 1500 nodes, ~27 nodes used) costs
  ~0.5 ms per simulated turn. Under 16-way parallel load the max was 1.6 s: the deadline is checked
  between simulated turns, so a decision can overrun the 1.5 s budget by one turn plus bookkeeping.
- Limits: the draw pile order is unknown (shuffled per sample; the logged pile contents are used, so the
  "deck minus hand" approximation was never needed here); cards drawn during the candidate line are
  counted as drawn and discarded; after turn 0 no potions; powers carried: Strength (incl. Demon Form),
  Metallicize, Plating, Juggernaut, Barricade, Feel No Pain (others only through the solver's score);
  enemy Debuff/status moves are not modelled; our own play after turn 0 is the solver's top line, not
  Jev's; outcomes are those of the bot's own later play (policy bias, as for the fight value model).

"""


def decision_flags(rows, decisions_path):
    """Mark turns where a plan was chosen among several lines (Jev / DeepSeek / code-fallback plan-choice)."""
    spans = sorted((r["ts0"], r["ts1"], i) for i, r in enumerate(rows) if r.get("ts0"))
    starts = [s[0] for s in spans]
    flags = [False] * len(rows)
    deciders = collections.Counter()
    if not decisions_path or not os.path.exists(decisions_path):
        return flags, deciders
    with open(decisions_path, encoding="utf8") as handle:
        for line in handle:
            if '"combat/plan-choice' not in line:
                continue
            try:
                d = json.loads(line)
            except ValueError:
                continue
            ts = d.get("ts")
            k = bisect.bisect_right(starts, ts) - 1
            if k < 0:
                continue
            t0, t1, i = spans[k]
            if ts <= t1 and str(rows[i]["t"]) == str(d.get("turn")):
                if not flags[i]:
                    deciders[d.get("decider")] += 1
                flags[i] = True
    return flags, deciders


def importance(gbm, top=15):
    total = sum(gbm.gain) or 1
    pairs = sorted(zip(gbm.names, gbm.gain), key=lambda kv: -kv[1])[:top]
    return [(k, v / total) for k, v in pairs]


def fmt_table(table, groups, models, cols):
    lines = ["| fight kind | model | rows (fights) | " + " | ".join(c[0] for c in cols) + " |",
             "|---|---|---|" + "---|" * len(cols)]
    for g in groups:
        for m in models:
            r = table.get((g, m))
            if not r:
                continue
            vals = " | ".join(c[1].format(r[c[2]]) for c in cols)
            lines.append(f"| {g} | {m} | {r['n']} ({r['fights']}) | {vals} |")
    return "\n".join(lines)


def train(rows_path, decisions_path, out_path, notes_path, trees, gates_path=None):
    t0 = time.time()
    mm = load_move_model()
    all_rows = load_rows(rows_path)
    count_asc = collections.Counter(r["asc"] for r in all_rows)
    rows = [r for r in all_rows if isinstance(r["asc"], int) and r["asc"] >= MIN_ASC and r["kind"] in FIGHT_KINDS]
    feats = [base_features(r, mm) for r in rows]
    flags, deciders = decision_flags(rows, decisions_path)
    run_first = {}
    for r in rows:
        run_first[r["run"]] = min(run_first.get(r["run"], r["ts0"]), r["ts0"])
    runs = sorted(run_first, key=run_first.get)
    newest = set(runs[int(len(runs) * 0.8):])
    fold_of = {rid: min(4, int(run_hash(rid) * 5)) for rid in runs}
    splits = {
        "by run (5-fold cross-validation, folds = runs)": [lambda r, k=k: fold_of[r["run"]] == k for k in range(5)],
        "by time (train on the older 80% of runs, test on the newest 20%)": [lambda r: r["run"] in newest],
    }
    report = {}
    for sname, tests in splits.items():
        te_all, preds_all = [], []
        n_train = []
        for is_test in tests:
            tr = [i for i, r in enumerate(rows) if not is_test(r)]
            te = [i for i, r in enumerate(rows) if is_test(r)]
            suite = Suite().fit([rows[i] for i in tr], [feats[i] for i in tr], trees=trees)
            preds_all += suite.predict([rows[i] for i in te], [feats[i] for i in te])
            te_all += te
            n_train.append(len(tr))
            print(f"[{time.time() - t0:.0f}s] {sname}: train {len(tr)} test {len(te)}", file=sys.stderr)
        te = te_all
        trs, tes, fs = [rows[i] for i in te], [feats[i] for i in te], [flags[i] for i in te]
        table, rel = evaluate(trs, tes, preds_all)
        rank = ranking_test(trs, tes, preds_all, fs)
        report[sname] = {"train": round(sum(n_train) / len(n_train)), "test": len(te), "folds": len(tests),
                         "test_runs": len({r["run"] for r in trs}), "table": table, "rel": rel, "rank": rank,
                         "bosses": per_boss(trs, tes, preds_all)}
        if sname.startswith("by run") and gates_path:
            gates = build_gates(trs, preds_all, fold_of, fs)
            write_gates(gates_path, gates, rows)
            report["_gates"] = gates
    gates = report.pop("_gates", None)
    final = Suite().fit(rows, feats, trees=trees)
    print(f"[{time.time() - t0:.0f}s] final model on all {len(rows)} rows", file=sys.stderr)
    export(final, rows, feats, out_path, report)
    imp = {"hp_loss": importance(final.gbm["hp_loss"]), "win": importance(final.gbm["win"]), "turns": importance(final.gbm["turns"])}
    write_notes(notes_path, report, rows, count_asc, flags, deciders, time.time() - t0, imp, gates)
    return report


def fold_models(rows_path, decisions_path, fold_dir, trees):
    """Out-of-fold models for the rollout backtest: per run fold k, the model trained without fold k's runs
    (fight-value-<k>.json) and gates measured on the other folds' out-of-fold predictions (gates-<k>.json),
    plus folds.json (run -> fold). tools/rollout-backtest.ts --fold-dir evaluates each decision with the
    model and gates that never saw its run."""
    t0 = time.time()
    os.makedirs(fold_dir, exist_ok=True)
    mm = load_move_model()
    rows = [r for r in load_rows(rows_path) if isinstance(r["asc"], int) and r["asc"] >= MIN_ASC and r["kind"] in FIGHT_KINDS]
    feats = [base_features(r, mm) for r in rows]
    flags, _ = decision_flags(rows, decisions_path)
    runs = sorted({r["run"] for r in rows})
    fold_of = {rid: min(4, int(run_hash(rid) * 5)) for rid in runs}
    te_all, preds_all = [], []
    for k in range(5):
        tr = [i for i, r in enumerate(rows) if fold_of[r["run"]] != k]
        te = [i for i, r in enumerate(rows) if fold_of[r["run"]] == k]
        suite = Suite().fit([rows[i] for i in tr], [feats[i] for i in tr], trees=trees)
        preds_all += suite.predict([rows[i] for i in te], [feats[i] for i in te])
        te_all += te
        export(suite, [rows[i] for i in tr], [feats[i] for i in tr], os.path.join(fold_dir, f"fight-value-{k}.json"), {"x": {"table": {}}})
        print(f"[{time.time() - t0:.0f}s] fold {k}", file=sys.stderr)
    for k in range(5):
        sel = [j for j, i in enumerate(te_all) if fold_of[rows[i]["run"]] != k]
        gates = build_gates([rows[te_all[j]] for j in sel], [preds_all[j] for j in sel], {r: f for r, f in fold_of.items() if f != k},
                            [flags[te_all[j]] for j in sel])
        write_gates(os.path.join(fold_dir, f"gates-{k}.json"), gates, [rows[te_all[j]] for j in sel])
    with open(os.path.join(fold_dir, "folds.json"), "w", encoding="utf8") as handle:
        json.dump(fold_of, handle)
    print(f"folds: done in {time.time() - t0:.0f}s -> {fold_dir}")


def export(suite, rows, feats, out_path, report):
    table = suite.table
    def acc(t):
        return {"|".join(str(x) for x in k): [round(v[0] / v[1], 3), v[1]] for k, v in t.acc.items() if v[1] >= 3}
    kinds = {}
    for kind in FIGHT_KINDS:
        r = next(iter(report.values()))["table"].get((kind, "G gbm"))
        if r:
            kinds[kind] = {"mae": round(r["mae"], 2), "rmse": round(r["rmse"], 2), "brier": round(r["brier"], 4)}
    out = {
        "note": "Generated by tools/build-fight-value.py from logs/states.jsonl (A7+ hallway/elite/boss fights). "
                "Live, only as FACTS on Jev's combat options (src/strategy/rollout-live.ts), never in the ranking. Value of the state at the END of our turn (after our plays, before the "
                "enemy turn): further HP loss until the fight ends (the coming enemy turn included; death = all HP), "
                "win probability, turns left after this one. See notes/fight-value-backtest.md.",
        "generated_from": {"rows": len(rows), "fights": len({r["fid"] for r in rows}), "runs": len({r["run"] for r in rows}),
                           "first_ts": min(r["ts0"] for r in rows), "last_ts": max(r["ts1"] for r in rows)},
        "features": suite.names,
        "gbm": {k: g.export() for k, g in suite.gbm.items()},
        "encoders": {
            "loss": {"prior": round(suite.enc_loss.prior, 4), "k": suite.enc_loss.k, "monster": suite.enc_loss.mon, "encounter": suite.enc_loss.enc},
            "win": {"prior": round(suite.enc_win.prior, 4), "k": suite.enc_win.k, "monster": suite.enc_win.mon, "encounter": suite.enc_win.enc},
        },
        "support": {"k": Table.K, "hp_loss": acc(table["hp_loss"])},
        "test_error": kinds,
    }
    # Golden examples for the TS loader (src/strategy/fight-value.ts must reproduce them exactly).
    rng = random.Random(3)
    examples = []
    for i in sorted(rng.sample(range(len(rows)), 6)):
        inp = example_input(rows[i], feats[i])
        examples.append({"input": inp, "output": {k: round(v, 6) for k, v in reference_value(out, inp).items()}})
    out["examples"] = examples
    # Raw end-of-turn rows and their base_features(): rollout.ts featuresOf() must reproduce them.
    picks = [i for i in sorted(rng.sample(range(len(rows)), 40)) if len(living(rows[i]["E"])) >= 1][:4]
    boss = next((i for i in range(len(rows)) if rows[i]["kind"] == "boss" and any(e[9] for e in living(rows[i]["E"]))), None)
    if boss is not None:
        picks.append(boss)
    keep = ("act", "t", "asc", "kind", "enc", "deck", "relics", "max_en", "E")
    out["feature_examples"] = [{"row": {k: rows[i][k] for k in keep},
                                "features": {k: round(v, 6) if isinstance(v, float) else v for k, v in feats[i].items()}} for i in picks]
    with open(out_path, "w", encoding="utf8") as handle:
        json.dump(out, handle, ensure_ascii=False, separators=(",", ":"))
        handle.write("\n")


def example_input(row, f):
    return {"features": {k: round(v, 6) if isinstance(v, float) else v for k, v in f.items()},
            "enemyIds": [e[1] for e in living(row["E"])], "encounter": row["enc"], "kind": row["kind"], "act": row["act"]}


def reference_value(model, inp):
    """valueOf() of fight-value.ts, on the exported model (the TS test checks it against these outputs)."""
    named = dict(inp["features"])
    for prefix, enc in (("loss_", model["encoders"]["loss"]), ("win_", model["encoders"]["win"])):
        vals = [enc["monster"].get(e, [enc["prior"]])[0] for e in inp["enemyIds"]]
        named[prefix + "mon_te_max"] = max(vals) if vals else enc["prior"]
        named[prefix + "mon_te_sum"] = sum(vals)
        named[prefix + "enc_te"] = enc["encounter"].get(inp["encounter"], [enc["prior"]])[0]
    x = [named.get(k, 0) for k in model["features"]]

    def run(g):
        total = g["base"]
        for tree in g["trees"]:
            node = tree
            while isinstance(node, list):
                node = node[2] if x[node[0]] < node[1] else node[3]
            total += g["lr"] * node
        return 1 / (1 + math.exp(-total)) if g["loss"] == "logloss" else total
    ehp = min(4, int(math.floor(inp["features"]["enemy_hp_frac"] * 5)))
    php = min(3, int(math.floor(inp["features"]["hp_frac"] * 4)))
    n = 0
    for key in (f"k|{inp['kind']}|{inp['act']}|{ehp}|{php}", f"e|{inp['encounter']}|{ehp}|{php}"):
        cell = model["support"]["hp_loss"].get(key)
        if cell and cell[1] > 0:
            n = cell[1]
    conf = n / (n + model["support"]["k"])
    if inp["features"]["n_living"] == 0:
        return {"hpLoss": 0.0, "winProb": 1.0, "turns": 0.0, "n": n, "confidence": conf}
    return {"hpLoss": max(0.0, run(model["gbm"]["hp_loss"])), "winProb": run(model["gbm"]["win"]),
            "turns": max(0.0, run(model["gbm"]["turns"])), "n": n, "confidence": conf}


FINDINGS = """## Reading (hand-written 2026-09-28 from the run below; regenerate the numbers, re-read this)

- Prediction: on held-out runs the GBM cuts the further-HP-loss MAE of the solver-implied
  estimate (B0: this enemy turn + next-turn threat) by 40-58% in every fight kind (CV: all 14.0 -> 6.5,
  hallway 10.9 -> 4.6, elite 15.7 -> 9.5, boss 21.3 -> 9.5), and by as much in the
  time split too (newest runs, where boss win rate fell to 0.50). The binned table sits between.
  B1 (a deck-damage clock) is worse than B0 for bosses: deck damage per turn is too crude for 400-HP fights.
- Win probability: the GBM has the best Brier/log loss, but it is over-confident in the 0.8-0.98 band
  (predicted ~0.93, observed ~0.86 under CV; worse on the newest runs). Calibrate (Platt/isotonic on
  out-of-fold predictions) before showing a win % to Jev.
- Ranking: pooled over states the model value tracks the final outcome far better than the solver's turn
  score (Spearman ~0.79 vs ~0.44), but that mostly reflects the model seeing the whole state. The fair test
  holds the start state fixed (pair concordance within encounter x turn x HP buckets): GBM 0.644 vs solver
  0.637 overall (se ~0.004), better in hallways (0.660 vs 0.645) and at logged plan-choice points
  (0.638 vs 0.592), NOT better for elites (0.593 vs 0.619) or bosses (0.508 vs 0.563). The time split
  favours the GBM (0.702 vs 0.647) but on only ~500 pairs.
- Policy bias: every row is a state our own bot reached and played on from; lines it never played (e.g.
  heavy-block turns in boss fights, early potion use) have no support, and the outcome reflects the bot's
  later play. The model estimates "what happens if we keep playing like we did", not the value under a better
  policy. Deaths concentrate in a few bosses (Kaiser Crab, Knowledge Demon, Queen, Aeonglass, Test Subject)
  with 4-26 fights each: per-boss numbers are thin.
- Other biases: the enemy damage feature is the displayed intent (mod), deck features come from run.deck (no
  draw pile in the logs), end-of-fight heals are not netted out (hp_loss is to the last combat state), and
  A7/A8 are pooled (A8 dominates, 7177 of 9860 A7+ rows).
- Gates (section below): with a cluster bootstrap over similar-state groups the model's own ranking edge is
  not established anywhere large (all: +0.007 [-0.017, +0.030]; the ±0.004 above ignored that pairs in one
  group share rows). A BLEND is: w_cap x model + (1 - w_cap) x current beats the current weights in hallways
  (+0.048 [+0.026, +0.069]); in elites and bosses no blend does, so w = 0 there. Nested check: gated 0.669
  vs current 0.637 (choice points 0.639 vs 0.593). Calibration: nested out-of-fold, isotonic and Platt make
  hallway/elite Brier WORSE (the over-confident bins above do not survive out of fold); only boss uses isotonic.

"""


def write_notes(path, report, rows, count_asc, flags, deciders, seconds, imp, gates=None):
    L = []
    L.append("# Fight value model: backtest")
    L.append("")
    L.append("Generated by `tools/build-fight-value.py train` (numbers below are from the run that wrote this file).")
    L.append("`src/knowledge/fight-value.json` and `src/strategy/fight-value.ts`: Live, only as FACTS on Jev's combat options (src/strategy/rollout-live.ts), never in the ranking.")
    L.append("")
    L.append(FINDINGS)
    L.append("## Dataset")
    L.append("")
    L.append(f"- One row per combat turn: the state at the END of our turn (last logged state before the enemy turn).")
    L.append(f"- Extracted rows by ascension: {dict(sorted((str(k), v) for k, v in count_asc.items()))}.")
    L.append(f"- Used (A{MIN_ASC}+, hallway/elite/boss, outcome known): {len(rows)} turns, {len({r['fid'] for r in rows})} fights, "
             f"{len({r['run'] for r in rows})} runs; kinds {dict(collections.Counter(r['kind'] for r in rows))}.")
    L.append(f"- Turns with a logged plan choice among several lines: {sum(flags)} (deciders {dict(deciders)}).")
    L.append(f"- Targets: hp_loss = HP at end of our turn - HP on the last combat state (death: all HP); win; turns left.")
    L.append(f"- Runtime of this training stage: {seconds:.0f}s.")
    L.append("")
    L.append("Models: B0 = the solver's implied estimate (incoming after block this enemy turn + move-model threat next turn; "
             "win = survives this turn); B1 = clock (incoming now + next-turn threat x (turns to kill - 1) from deck damage/turn, "
             "win = logistic on HP margin); T = binned table with shrinkage (encounter x enemy HP left x our HP -> kind x act -> global); "
             "G = gradient-boosted depth-3 trees on ~60 features with target-encoded monsters/encounters.")
    L.append("")
    cols = [("hp MAE", "{:.2f}", "mae"), ("hp RMSE", "{:.2f}", "rmse"), ("win Brier", "{:.4f}", "brier"),
            ("win logloss", "{:.3f}", "logloss"), ("turns MAE", "{:.2f}", "turns_mae"), ("win rate", "{:.3f}", "win_rate")]
    for sname, rep in report.items():
        L.append(f"## Split: {sname}")
        L.append("")
        L.append(f"{rep['folds']} fold(s); about {rep['train']} training rows per fold; {rep['test']} test rows from {rep['test_runs']} runs "
                 "(every test row predicted by a model that never saw its run).")
        L.append("")
        L.append(fmt_table(rep["table"], ["all"] + FIGHT_KINDS, ["B0 solver", "B1 clock", "T table", "G gbm"], cols))
        L.append("")
        L.append("Win-probability reliability (all test rows): bin, n, mean predicted, observed")
        L.append("")
        L.append("| model | bin | n | predicted | observed |")
        L.append("|---|---|---|---|---|")
        for m, bins in rep["rel"].items():
            for b in bins:
                L.append(f"| {m} | {b[0]} | {b[1]} | {b[2]:.3f} | {b[3]:.3f} |")
        L.append("")
        L.append("Ranking test (value of the realised end-of-turn state vs realised HP loss from the turn's start to the fight's end). "
                 "Spearman: pooled; concordance: pairs of turns from different fights with the same encounter, turn, our HP//10 and "
                 "enemy HP//20 at the start (only the line played differs); 0.5 = chance.")
        L.append("")
        L.append("| subset | n | pairs (±se) | Spearman solver | Spearman gbm | Spearman table | Spearman clock | conc. solver | conc. gbm | conc. table | conc. clock |")
        L.append("|---|---|---|---|---|---|---|---|---|---|---|")
        for kind, r in rep["rank"].items():
            L.append(f"| {kind} | {r['n']} | {r['pairs']} (±{r['se']:.3f}) | " + " | ".join(
                f"{r[k]:.3f}" for k in ["spearman solver weights", "spearman gbm value", "spearman table value", "spearman clock value",
                                          "concordance solver weights", "concordance gbm value", "concordance table value", "concordance clock value"]) + " |")
        L.append("")
        L.append("Boss fights one by one (hp MAE / win Brier):")
        L.append("")
        L.append("| boss | rows (fights) | win rate | MAE B0 | MAE table | MAE gbm | Brier B0 | Brier table | Brier gbm |")
        L.append("|---|---|---|---|---|---|---|---|---|")
        for b in rep["bosses"]:
            L.append(f"| {b['boss']} | {b['n']} ({b['fights']}) | {b['win_rate']:.2f} | {b['mae_b0']:.1f} | {b['mae_table']:.1f} | {b['mae_gbm']:.1f} | "
                     f"{b['brier_b0']:.3f} | {b['brier_table']:.3f} | {b['brier_gbm']:.3f} |")
        L.append("")
    if gates:
        L.append(gate_notes(gates))
    L.append("## Feature importance (final model, share of split gain)")
    L.append("")
    for target, pairs in imp.items():
        L.append(f"- {target}: " + ", ".join(f"{k} {v:.2f}" for k, v in pairs[:12]))
    L.append("")
    with open(path, "w", encoding="utf8") as handle:
        handle.write("\n".join(L) + "\n")


def main(argv=None):
    logs = bmd._default_logs()
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("stage", choices=["extract", "train", "all", "rollout-report", "folds"])
    parser.add_argument("--fold-dir", default="/tmp/rb/folds", help="folds: where the out-of-fold models and gates go")
    parser.add_argument("--work", default="/tmp/rb", help="rollout-report: the work dir of tools/rollout-backtest.ts")
    parser.add_argument("--rollout-notes", default=os.path.join(ROOT, "notes/rollout-backtest.md"))
    parser.add_argument("--states", default=os.path.join(logs, "states.jsonl"))
    parser.add_argument("--runs", default=os.path.join(logs, "runs.jsonl"))
    parser.add_argument("--decisions", default=os.path.join(logs, "decisions.jsonl"))
    parser.add_argument("--game-data", default=os.path.join(ROOT, ".cache/game-data.json"))
    parser.add_argument("--rows", default=DEFAULT_ROWS)
    parser.add_argument("--out", default=os.path.join(ROOT, "src/knowledge/fight-value.json"))
    parser.add_argument("--notes", default=os.path.join(ROOT, "notes/fight-value-backtest.md"))
    parser.add_argument("--gates", default=os.path.join(ROOT, "src/knowledge/fight-value-gates.json"))
    parser.add_argument("--trees", type=int, default=150)
    args = parser.parse_args(argv)
    start = time.time()
    if args.stage == "folds":
        fold_models(args.rows, args.decisions, args.fold_dir, args.trees)
        return 0
    if args.stage == "rollout-report":
        rollout_report(args.work, args.rows, args.rollout_notes, args.gates)
        return 0
    if args.stage in ("extract", "all"):
        b = extract(args.states, args.runs, args.game_data, args.rows)
        print(f"extract: {b.rows} rows from {b.fights} fights (by ascension {dict(b.by_asc)}) in {time.time() - start:.0f}s -> {args.rows}")
    if args.stage in ("train", "all"):
        os.makedirs(os.path.dirname(args.notes), exist_ok=True)
        train(args.rows, args.decisions, args.out, args.notes, args.trees, args.gates)
        print(f"train: done in {time.time() - start:.0f}s -> {args.out}, {args.notes}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
