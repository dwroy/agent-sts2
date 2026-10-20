#!/usr/bin/env python3
"""Verify the immutable W0 subset without writing knowledge or fixture files."""
import hashlib
import json
from pathlib import Path
import subprocess

COMMIT = "78933a38d3349ec0b16615d852da89e5eee13871"
BOSSES = {"KAISER_CRAB", "SOUL_FYSH", "THE_KIN"}
MONSTERS = {"CRUSHER", "ROCKET", "KIN_PRIEST", "KIN_FOLLOWER", "SOUL_FYSH"}


def read(path):
    return json.loads(subprocess.check_output(["git", "show", f"{COMMIT}:{path}"]))


common = read("knowledge/common/monster-db.json")
records = read("knowledge/characters/ironclad/monster-records.json")
shares = read("knowledge/characters/ironclad/boss-damage.json")
result = {
    "monster_db": {
        "bosses": {key: value for key, value in records["bosses"].items() if key in BOSSES},
        "encounters": {
            key: value for key, value in records["encounters"].items()
            if set(key.split("+")) & MONSTERS
        },
        "monsters": {
            key: {**value, "threat_by_asc": records["threat_by_asc"][key]}
            for key, value in common["monsters"].items() if key in MONSTERS
        },
    },
    "shares": {key: value for key, value in shares.items() if key in BOSSES},
}
expected = (json.dumps(result, ensure_ascii=False, indent=1) + "\n").encode()
fixture = Path("agent/tests/fixtures/v6-off-boss-clock.json")
assert fixture.read_bytes() == expected, "W0 extraction differs from committed fixture"
print(json.dumps({"commit": COMMIT, "fixture": str(fixture), "bytes": len(expected),
                  "sha256": hashlib.sha256(expected).hexdigest(), "identical": True}, indent=2))
