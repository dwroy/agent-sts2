#!/usr/bin/env python3
"""Emit one line per notable event of a running jev-sts2 play loop (floor change, stall, odd result, exit)."""
import json, os, sys, time, urllib.request
pid = int(sys.argv[1]); L = sys.argv[2]
seen = sum(1 for _ in open(L)) if os.path.exists(L) else 0
floor = None; last_new = time.time(); stalled = False
def alive(p):
    try: os.kill(p, 0); return True
    except OSError: return False
while True:
    lines = open(L).read().splitlines() if os.path.exists(L) else []
    for l in lines[seen:]:
        try: r = json.loads(l)
        except Exception: continue
        last_new = time.time(); stalled = False
        if r.get("floor") != floor:
            floor = r.get("floor"); print(f"floor {floor} | {r['screen']} | decisions {len(lines)}", flush=True)
        res = str(r.get("result", ""))
        if "completed" not in res and "shadow" not in res:
            print(f"odd result {r['screen']}/{r['label']}: {res[:160]}", flush=True)
        if r["screen"] == "GAME_OVER": print("GAME_OVER", flush=True)
    seen = len(lines)
    if time.time() - last_new > 120 and not stalled:
        try:
            d = json.load(urllib.request.urlopen("http://127.0.0.1:8080/state", timeout=5))["data"]
            print(f"stalled 120s: screen={d['screen']} actions={d['available_actions']} modal={json.dumps(d.get('modal'), ensure_ascii=False)[:200]}", flush=True)
        except Exception as e: print(f"stalled 120s; /state unreachable: {e}", flush=True)
        stalled = True
    if not alive(pid):
        print("play process exited", flush=True); break
    time.sleep(10)
