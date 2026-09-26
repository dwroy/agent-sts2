#!/usr/bin/env python3
"""Milestones of back-to-back runs: new run, every 5th floor, boss floors, game over, stalls, loop exit."""
import json, os, subprocess, time, urllib.request
L = os.path.expanduser("~/Projects/sts2-jev/jev-sts2/logs/decisions.jsonl")
seen = sum(1 for _ in open(L)) if os.path.exists(L) else 0
run = None; floor = None; last_new = time.time(); stalled = False; idle_since = None
def loop_alive():
    for pid in subprocess.run(["pgrep", "-x", "node"], capture_output=True, text=True).stdout.split():
        try:
            if "index.ts play" in open(f"/proc/{pid}/cmdline").read().replace("\0", " "): return True
        except OSError: pass
    return False
while True:
    lines = open(L).read().splitlines() if os.path.exists(L) else []
    for l in lines[seen:]:
        try: r = json.loads(l)
        except Exception: continue
        last_new = time.time(); stalled = False
        try: rid = json.loads(r["fingerprint"]).get("run")
        except Exception: rid = None
        if rid and rid != run:
            run = rid; floor = None; print(f"new run {rid}", flush=True)
        f = r.get("floor")
        if f is not None and f != floor:
            floor = f
            if f % 5 == 0 or f in (17, 34, 51): print(f"run {run} floor {f} ({r['screen']})", flush=True)
        if r["screen"] == "GAME_OVER": print(f"GAME_OVER run {run} at floor {floor}", flush=True)
    seen = len(lines)
    if time.time() - last_new > 150 and not stalled:
        try:
            d = json.load(urllib.request.urlopen("http://127.0.0.1:8080/state", timeout=5))["data"]
            print(f"stalled 150s: screen={d['screen']} actions={d['available_actions']} loop_alive={loop_alive()}", flush=True)
        except Exception as e: print(f"stalled 150s; /state unreachable: {e}", flush=True)
        stalled = True
    time.sleep(10)
