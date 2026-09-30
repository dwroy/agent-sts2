#!/usr/bin/env python3
"""Pinned knowledge for tests/boss-lines-off.test.ts: the monster DB and move model trimmed to the enemies of its logged
boards, so the pre-B2 question it pins does not move when the knowledge data is refreshed (every run). Run once, from
the repo root: python3 tests/boss-lines-data/make-pinned.py"""
import json

IDS = {"VANTOM", "KIN_FOLLOWER", "KIN_PRIEST", "CEREMONIAL_BEAST", "WATERFALL_GIANT", "CUBEX_CONSTRUCT", "TORCH_HEAD_AMALGAM", "QUEEN"}
db = json.load(open("src/knowledge/monster-db.json"))
mm = json.load(open("src/knowledge/move-model.json"))
keep = lambda key: any(part in IDS for part in key.split("+"))
pinned = {
    "monster-db.json": {
        "meta": db["meta"],
        "bosses": {k: v for k, v in db["bosses"].items() if k in IDS or k in ("THE_KIN",)},
        "encounters": {k: v for k, v in db["encounters"].items() if keep(k)},
        "monsters": {k: v for k, v in db["monsters"].items() if k in IDS},
    },
    "move-model.json": {k: v for k, v in mm.items() if k in IDS},
}
json.dump(pinned, open("tests/boss-lines-data/pinned-knowledge.json", "w"), ensure_ascii=False, separators=(",", ":"))
