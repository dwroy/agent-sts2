#!/usr/bin/env python3
"""Compare two restructure-check result dirs (run-all.sh): prefix.json, digests.json and builders/hashes.txt.

  python3 compare.py BASE_DIR NEW_DIR

Prints every key whose value differs and exits 1 when anything does.
"""
import json
import os
import sys


def flat(value, prefix=""):
    if isinstance(value, dict):
        out = {}
        for key, item in value.items():
            out.update(flat(item, f"{prefix}{key}."))
        return out
    return {prefix.rstrip("."): value}


def main():
    base, new = sys.argv[1], sys.argv[2]
    bad = 0
    for name in ("prefix.json", "digests.json"):
        a = flat(json.load(open(os.path.join(base, name), encoding="utf8")))
        b = flat(json.load(open(os.path.join(new, name), encoding="utf8")))
        diff = sorted(key for key in set(a) | set(b) if a.get(key) != b.get(key))
        print(f"{name}: {len(a)} values, {len(diff)} differ")
        for key in diff[:40]:
            print(f"  {key}: {a.get(key)!r} -> {b.get(key)!r}")
        bad += len(diff)
    ha = open(os.path.join(base, "builders", "hashes.txt"), encoding="utf8").read()
    hb = open(os.path.join(new, "builders", "hashes.txt"), encoding="utf8").read()
    print(f"builders: {'identical' if ha == hb else 'DIFFER'}")
    if ha != hb:
        print(ha, hb, sep="\n---\n")
        bad += 1
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
