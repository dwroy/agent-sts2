#!/usr/bin/env python3
"""Finished-character boss attempts, including censored SL retries. Logs are read-only."""
import collections
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from trust import BOSS_KEYS


def read_jsonl(path):
    with open(path, encoding="utf8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def timestamp(value):
    return dt.datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)


def finished_runs(rows, character, ascensions):
    # No legacy/default character inference is allowed in this extraction.
    return {r["run_id"]: r for r in rows if r.get("character") == character.upper()
            and r.get("ended") and r.get("ascension") in ascensions}


def boss_encounter(frame):
    ids = sorted(e["id"] for e in frame.get("enemies") or [])
    enc = "+".join(ids)
    if enc in BOSS_KEYS:
        return enc
    # Keep the opening encounter across summons and multi-phase continuations.
    return next((key for key in BOSS_KEYS if set(key.split("+")) <= set(ids)), None)


def attempt_frames(frames, attempts):
    """Partition by actual SL event intervals; untracked fights by combat boundaries/rewinds."""
    tracked = {(e["run_id"], e["floor"]) for e in attempts}
    used = set()
    groups = []
    previous_end = {}
    for event in sorted(attempts, key=lambda e: (e["run_id"], e["floor"], e["ended_at"])):
        scope = (event["run_id"], event["floor"])
        begin, end = previous_end.get(scope, dt.datetime.min), timestamp(event["ended_at"])
        mine = [f for f in frames if f["run_id"] == event["run_id"] and f["floor"] == event["floor"]
                and begin <= f["ts"] <= end and f["screen"] == "COMBAT" and f.get("enemies")]
        # A shared interval endpoint must belong to only one attempt.
        mine = [f for f in mine if f["off"] not in used]
        used.update(f["off"] for f in mine)
        groups.append((mine, event))
        previous_end[scope] = end
    active = []
    for f in frames:
        combat = (f["screen"] == "COMBAT" and f.get("enemies") and f["off"] not in used
                  and (f["run_id"], f["floor"]) not in tracked)
        if active and (f["run_id"] != active[-1]["run_id"] or f["floor"] != active[-1]["floor"]
                       or not combat and not f.get("in_combat")
                       or combat and (f.get("turn") or 0) < (active[-1].get("turn") or 0)):
            groups.append((active, None))
            active = []
        if combat and (active or boss_encounter(f)):
            active.append(f)
    if active:
        groups.append((active, None))
    return sorted(groups, key=lambda g: g[0][0]["off"] if g[0] else float("inf"))


def extraction_counts(manifest):
    rooms = {(r["run_id"], r["floor"]) for r in manifest}
    actual_rooms = {(r["run_id"], r["floor"]) for r in manifest if not r.get("excluded")}
    return {"boss_rooms": len(rooms),
            "first_attempt_outcomes": dict(collections.Counter(r.get("outcome") for r in manifest if r["attempt"] == 1)),
            "retry_outcomes": dict(collections.Counter(r.get("outcome") for r in manifest if r["attempt"] > 1)),
            "rooms_without_actual_outcome": [{"run_id": run, "floor": floor} for run, floor in sorted(rooms - actual_rooms)]}


def extract(logs, db, out_dir, character="silent", ascensions=range(11)):
    logs, out_dir = Path(logs), Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    run_bytes = (logs / "runs.jsonl").read_bytes()
    sl_bytes = (logs / "sl-attempts.jsonl").read_bytes()
    (out_dir / "runs-snapshot.jsonl").write_bytes(run_bytes)
    (out_dir / "sl-snapshot.jsonl").write_bytes(sl_bytes)
    runs = finished_runs([json.loads(l) for l in run_bytes.splitlines()], character, ascensions)
    attempts = [r for l in sl_bytes.splitlines() if (r := json.loads(l)).get("run_id") in runs
                and r.get("fight_kind") == "boss"]
    sys.path.insert(0, str(HERE.parent / "logdb"))
    import query
    import sync
    with sync.read_lock(str(db), shared=True):
        con = query.connect(str(db), threads=1)
        cursor = con.execute("SELECT off,len,ts,run_id,character,act,floor,turn,screen,in_combat,enemies,"
                             "player_hp,hp,max_hp,observed,incoming FROM frames WHERE run_id IN "
                             "(SELECT unnest(?::VARCHAR[])) ORDER BY run_id,off", [list(runs)])
        names = [d[0] for d in cursor.description]
        frames = [dict(zip(names, row)) for row in cursor.fetchall()]
    groups = attempt_frames(frames, attempts)
    by_run_floor = collections.Counter()
    manifest, fights, turns = [], [], []
    with open(logs / "states.jsonl", "rb") as states:
        for mine, event in groups:
            if not mine:
                manifest.append({"run_id": event["run_id"], "floor": event["floor"], "attempt": event["attempt"],
                                 "excluded": "no indexed combat frames", "sl": {k: event.get(k) for k in
                                 ("started_at", "ended_at", "result", "attempt")}})
                continue
            first = mine[0]
            run = runs[first["run_id"]]
            enc = boss_encounter(first)
            unsupported = enc is None
            if unsupported and not event:
                continue
            if unsupported:
                enc = "+".join(sorted(e["id"] for e in first["enemies"]))
            scope = (first["run_id"], first["floor"])
            by_run_floor[scope] += 1
            attempt = event["attempt"] if event else by_run_floor[scope]
            key = f"{first['run_id']}:{first['floor']}:{attempt}:{first['off']}"
            row = {"key": key, "run_id": first["run_id"], "character": character, "asc": run["ascension"],
                   "act": first["act"], "floor": first["floor"], "encounter": enc, "attempt": attempt,
                   "fight_no": by_run_floor[scope], "code": run.get("code"), "run_ended": run["ended"],
                   "first_ts": first["ts"].isoformat(), "turns": max(f.get("turn") or 0 for f in mine),
                   "source": {"file": str(logs / "states.jsonl"), "first_off": first["off"],
                              "last_off": mine[-1]["off"], "frames": len(mine)},
                   "sl": {k: event.get(k) for k in ("attempt", "result", "started_at", "ended_at", "reload")} if event else None}
            reasons = ["unsupported encounter in existing boss model"] if unsupported else []
            if any(f.get("character") != character.upper() for f in mine):
                reasons.append("state/run character mismatch")
            outcome = event.get("result") if event else None
            if outcome == "predicted_death":
                reasons.append("SL predicted_death: censored, no actual win/loss")
            after = next((f for f in frames if f["run_id"] == first["run_id"] and f["off"] > mine[-1]["off"]
                          and f["screen"] != "COMBAT" and not f.get("in_combat")), None)
            last_hp = mine[-1]["player_hp"]
            if last_hp is None:
                last_hp = mine[-1]["hp"]
            row["source"]["last_logged_hp"] = last_hp
            if event:
                row["sl"]["reported_end_hp"] = event.get("end_hp")
            if not event:
                outcome = "died" if last_hp == 0 else "won" if after and after.get("hp", 0) > 0 else None
            if outcome not in ("won", "died"):
                reasons.append("no observed completed outcome")
            candidates = [f for f in mine if f["turn"] == 1 and not f["observed"]]
            point = None
            for f in candidates:
                states.seek(f["off"])
                raw = states.read(f["len"])
                line = json.loads(raw)
                state = line.get("state", {})
                if not state.get("combat", {}).get("hand"):
                    continue
                if state.get("run", {}).get("character_id") != character.upper():
                    reasons.append("opening state/run character mismatch")
                if state.get("run", {}).get("ascension") != run["ascension"]:
                    reasons.append("opening state/run ascension mismatch")
                point = {"turn": 1, "hp": f["player_hp"], "state": state}
                row["source"].update({"t1_off": f["off"], "t1_len": f["len"], "t1_sha256": hashlib.sha256(raw).hexdigest()})
                break
            if not point:
                reasons.append("no turn-1 decision with drawn hand")
            end_candidates = [h for h in [last_hp, event.get("end_hp") if event else None,
                                           after.get("hp") if after and after["floor"] == first["floor"] else None] if h is not None]
            row.update({"outcome": outcome, "end_hp": 0 if outcome == "died" else min(end_candidates) if outcome == "won" and end_candidates else None,
                        "entry_hp": first["player_hp"] if first["player_hp"] is not None else first["hp"],
                        "max_hp": first["max_hp"], "excluded": "; ".join(reasons) or None})
            manifest.append(row)
            if reasons:
                continue
            fights.append({**row, "t1": point})
            by_turn = collections.defaultdict(list)
            for f in mine:
                if f.get("turn"):
                    by_turn[f["turn"]].append(f)
            actual_turns = []
            for t, fs in sorted(by_turn.items()):
                nxt = by_turn.get(t + 1)
                hp = fs[0]["player_hp"]
                next_hp = nxt[0]["player_hp"] if nxt else row["end_hp"]
                loss = hp - next_hp if hp is not None and next_hp is not None else None
                leak = fs[-1]["player_hp"] - next_hp if nxt and fs[-1]["player_hp"] is not None and next_hp is not None else None
                actual_turns.append([t, hp, sum(e["hp"] for e in fs[0]["enemies"] if e.get("alive")), loss, fs[0]["incoming"], leak])
            turns.append({"key": key, "turns": actual_turns})
    for name, rows in [("fights.jsonl", fights), ("turns.jsonl", turns), ("sources.jsonl", manifest)]:
        (out_dir / name).write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf8")
    summary = {"character": character, "finished_runs": len(runs), "attempts": len(manifest), "written": len(fights),
               "usable_runs": len({r["run_id"] for r in fights}), "usable_outcomes": dict(collections.Counter(r["outcome"] for r in fights)),
               "usable_by_asc": dict(sorted(collections.Counter(str(r["asc"]) for r in fights).items(), key=lambda item: int(item[0]))),
               "exclusions": dict(collections.Counter(r["excluded"] for r in manifest if r.get("excluded"))),
               "run_snapshot_bytes": len(run_bytes), "sl_snapshot_bytes": len(sl_bytes),
               "run_snapshot_sha256": hashlib.sha256(run_bytes).hexdigest(), "sl_snapshot_sha256": hashlib.sha256(sl_bytes).hexdigest()}
    boss_runs = {r["run_id"] for r in manifest}
    summary.update({"snapshot_ended_max": max((r["ended"] for r in runs.values()), default=None), "eligible_run_ids": sorted(runs),
                    "runs_without_boss": [{"run_id": r["run_id"], "asc": r["ascension"], "floor": r.get("floor"),
                                          "code": r.get("code"), "reason": "no logged boss attempt"}
                                         for r in runs.values() if r["run_id"] not in boss_runs]})
    summary.update(extraction_counts(manifest))
    (out_dir / "extraction.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n")
    return summary
