#!/usr/bin/env python3
"""Fight value model from our own logs (OFFLINE; nothing in the player reads it yet).

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
    def observe(fight, state, ts):
        original(fight, state, ts)
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


def train(rows_path, decisions_path, out_path, notes_path, trees):
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
    final = Suite().fit(rows, feats, trees=trees)
    print(f"[{time.time() - t0:.0f}s] final model on all {len(rows)} rows", file=sys.stderr)
    export(final, rows, feats, out_path, report)
    imp = {"hp_loss": importance(final.gbm["hp_loss"]), "win": importance(final.gbm["win"]), "turns": importance(final.gbm["turns"])}
    write_notes(notes_path, report, rows, count_asc, flags, deciders, time.time() - t0, imp)
    return report


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
        "note": "Generated by tools/build-fight-value.py from logs/states.jsonl (A7+ hallway/elite/boss fights). OFFLINE: "
                "not read by any decision code. Value of the state at the END of our turn (after our plays, before the "
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

"""


def write_notes(path, report, rows, count_asc, flags, deciders, seconds, imp):
    L = []
    L.append("# Fight value model: backtest")
    L.append("")
    L.append("Generated by `tools/build-fight-value.py train` (numbers below are from the run that wrote this file).")
    L.append("OFFLINE: `src/knowledge/fight-value.json` and `src/strategy/fight-value.ts` are not read by any decision code.")
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
    parser.add_argument("stage", choices=["extract", "train", "all"])
    parser.add_argument("--states", default=os.path.join(logs, "states.jsonl"))
    parser.add_argument("--runs", default=os.path.join(logs, "runs.jsonl"))
    parser.add_argument("--decisions", default=os.path.join(logs, "decisions.jsonl"))
    parser.add_argument("--game-data", default=os.path.join(ROOT, ".cache/game-data.json"))
    parser.add_argument("--rows", default=DEFAULT_ROWS)
    parser.add_argument("--out", default=os.path.join(ROOT, "src/knowledge/fight-value.json"))
    parser.add_argument("--notes", default=os.path.join(ROOT, "notes/fight-value-backtest.md"))
    parser.add_argument("--trees", type=int, default=150)
    args = parser.parse_args(argv)
    start = time.time()
    if args.stage in ("extract", "all"):
        b = extract(args.states, args.runs, args.game_data, args.rows)
        print(f"extract: {b.rows} rows from {b.fights} fights (by ascension {dict(b.by_asc)}) in {time.time() - start:.0f}s -> {args.rows}")
    if args.stage in ("train", "all"):
        os.makedirs(os.path.dirname(args.notes), exist_ok=True)
        train(args.rows, args.decisions, args.out, args.notes, args.trees)
        print(f"train: done in {time.time() - start:.0f}s -> {args.out}, {args.notes}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
