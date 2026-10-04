#!/usr/bin/env python3
"""Surface each new escalation question from the play loop as one compact event for the Claude session."""
import glob, json, os, sys, time
d = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs", "escalation"))
os.makedirs(d, exist_ok=True)
seen = set(os.path.basename(p) for p in glob.glob(os.path.join(d, "pending-*.json")))
while True:
    for path in sorted(glob.glob(os.path.join(d, "pending-*.json"))):
        name = os.path.basename(path)
        if name in seen:
            continue
        seen.add(name)
        try:
            q = json.load(open(path, encoding="utf8"))
        except Exception:
            seen.discard(name); continue
        c = q.get("context", {})
        opts = " || ".join(f"{k}: {json.dumps(v, ensure_ascii=False)[:260]}" for k, v in q.get("options", {}).items())
        print(f"ESCALATION {c.get('label')} F{c.get('floor')} T{c.get('turn')} jev={c.get('jev_choice')}@{c.get('jev_confidence')} | {q.get('question')} | {opts} | file={path}", flush=True)
    time.sleep(0.5)
