#!/usr/bin/env python3
"""Refresh the paper's component cost outputs after a run; skip overlapping work."""
import fcntl
import argparse
import os
from pathlib import Path

from paths import ROOT
from paper_dataset import component_costs


CODE_ROOT = str(Path(__file__).resolve().parents[1])


def main(root=ROOT, live=CODE_ROOT):
    with (Path(root) / "ops/cost-refresh.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return 0
        return 0 if component_costs(root=root, code_root=live) else 1


if __name__ == "__main__":
    try:
        os.nice(19 - os.nice(0))
    except OSError:
        pass
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", default=ROOT)
    parser.add_argument("--code-root", default=CODE_ROOT)
    args = parser.parse_args()
    raise SystemExit(main(args.root, args.code_root))
