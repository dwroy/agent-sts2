"""Shared pure trigger for the offline refresh and the operational scheduler."""


def cadence(runs, attempts, previous):
    finished = {r["run_id"]: r for r in runs if r.get("character") == "SILENT" and r.get("ended")}
    keys = sorted({f"{r['run_id']}:{r['floor']}:{r['attempt']}:{r['ended_at']}" for r in attempts
                   if r.get("run_id") in finished and r.get("fight_kind") == "boss" and r.get("result") in ("won", "died")})
    max_asc = max((r.get("ascension", 0) for r in finished.values()), default=0)
    old_keys = set((previous or {}).get("keys", []))
    new = len(set(keys) - old_keys)
    due = previous is None or max_asc > previous.get("max_asc", 0) or new >= 20
    return {"due": due, "new_completed_boss_attempts": new, "keys": keys, "max_asc": max_asc,
            "trigger": "initial" if previous is None else "ascension" if max_asc > previous.get("max_asc", 0) else "20-new-bosses" if new >= 20 else None}
