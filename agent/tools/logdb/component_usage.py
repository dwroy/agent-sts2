"""Whitelist component usage records; discover only task-linked session rollouts.

The database keeps cumulative counters as raw rows. SQL derives positive watermark deltas,
so an incremental sync does not need in-memory session state or replay old token events.
"""
import hashlib
import json
import math
from pathlib import Path

COUNTERS = ("input_tokens", "cache_hit_tokens", "cache_write_tokens", "output_tokens", "reasoning_tokens")
TABLE = [("src", "VARCHAR"), ("off", "BIGINT"), ("len", "INTEGER"), ("ts", "TIMESTAMP"),
         ("component", "VARCHAR"), ("provider", "VARCHAR"), ("session", "VARCHAR"), ("batch", "VARCHAR"),
         ("character", "VARCHAR"), ("run_ids", "VARCHAR[]"), ("cumulative", "BOOLEAN"), ("usage_recorded", "BOOLEAN"),
         ("calls", "BIGINT"), ("latency_ms", "BIGINT")] + [(k, "BIGINT") for k in COUNTERS]


def number(value):
    return int(value) if isinstance(value, (int, float)) and not isinstance(value, bool) and 0 <= value < 2**63 and math.isfinite(value) else 0


def counters(raw, exclusive=False, creation_extra=False):
    raw = raw if isinstance(raw, dict) else {}
    def pick(*names):
        return next((number(raw[n]) for n in names if n in raw), 0)
    inp = pick("input", "input_tokens")
    cache = pick("cacheRead", "cached_input_tokens", "cache_hit_tokens", "cache_read_input_tokens")
    creation = pick("cacheCreation", "cache_creation_input_tokens")
    out = pick("output", "output_tokens")
    reason = pick("reasoning", "reasoning_output_tokens", "reasoning_tokens")
    inp += (cache if exclusive else 0) + (creation if creation_extra else 0)
    return dict(zip(COUNTERS, (inp, min(inp, cache), creation, out, min(out, reason))))


def rows(path):
    """Read only complete lines within a captured file length; never export free text."""
    limit = path.stat().st_size
    with path.open("rb") as handle:
        while handle.tell() < limit:
            raw = handle.readline()
            if handle.tell() > limit or not raw.endswith(b"\n"):
                break
            try:
                row = json.loads(raw)
                if isinstance(row, dict):
                    yield row
            except (ValueError, UnicodeError):
                continue


def extractor(src, metadata, rollout=False):
    def row_of(raw, off):
        from extract import scrub
        r = json.loads(raw)
        row = {"src": src, "off": off, "len": len(raw), **metadata, "cumulative": rollout}
        if rollout:
            p = r.get("payload") or {}
            usage = (p.get("info") or {}).get("total_token_usage")
            if p.get("type") != "token_count" or not isinstance(usage, dict):
                return None
            row.update(ts=r.get("timestamp") or r.get("ts"), calls=1, latency_ms=0, usage_recorded=True)
        else:
            if metadata["component"].startswith("learner:"):
                if r.get("type") != "learner_summary":
                    return None
                s = r.get("summary") or {}
                row["provider"] = s.get("engine", "codex")
                row["session"] = s.get("sessionId") or metadata["session"]
                row["calls"] = number(s.get("turns"))
                usage = s.get("tokens")
            else:
                if not r.get("session"):
                    return None
                row["session"], row["calls"] = r["session"], 1
                usage = r.get("tokens")
            row.update(ts=r.get("ts"), latency_ms=number(r.get("wall_ms")), usage_recorded=isinstance(usage, dict))
        row.update(counters(usage, exclusive=not rollout, creation_extra=row["provider"] == "claude" and not rollout))
        # Identifiers are capped too; prompts, errors, account payloads and arbitrary fields never enter the table.
        for key in ("src", "component", "provider", "session", "batch", "character"):
            value = row.get(key)
            row[key] = scrub(str(value), cap=300) if value is not None else None
        row["run_ids"] = [scrub(str(v), cap=100) for v in row.get("run_ids", [])]
        return row
    return row_of


def discover(logs, codex_home=None):
    # Worktrees share logs through a symlink; learner/wake logs live beside the physical log directory.
    root = Path(logs).resolve().parent
    sources, sessions = {}, {}
    def register(path, metadata, rollout=False):
        key = "usage-" + hashlib.sha1(str(path).encode()).hexdigest()[:20]
        sources[key] = (str(path), "component_usage_raw", extractor(key, metadata, rollout))
        return key
    for path in sorted((root / "learner/runs").glob("*.jsonl")):
        launch, summaries = {}, []
        for r in rows(path):
            if r.get("type") == "learner_launch":
                launch = r
            elif r.get("type") == "learner_summary":
                summaries.append(r)
        params = launch.get("params") or {}
        meta = {"component": "learner:" + str(launch.get("task", "unknown")), "provider": launch.get("engine", "codex"),
                "batch": path.stem, "session": path.stem, "character": params.get("character"),
                "run_ids": [v for v in str(params.get("runs", params.get("run", ""))).split(",") if v]}
        register(path, meta)
        for r in summaries:
            s = r.get("summary") or {}
            if s.get("sessionId") and s.get("engine", "codex") == "codex":
                sessions.setdefault(s["sessionId"], {**meta, "session": s["sessionId"], "provider": "codex"})
    for path in sorted((root / "ops/codex-ops").glob("wakes*.jsonl")):
        meta = {"component": "ops:codex", "provider": "codex", "batch": "", "session": "", "character": None, "run_ids": []}
        register(path, meta)
        for r in rows(path):
            if r.get("session"):
                sessions.setdefault(r["session"], {**meta, "session": r["session"]})
    home = Path(codex_home) if codex_home else Path.home() / ".codex"
    paths = sorted((home / "sessions").glob("*/*/*/rollout-*.jsonl"))
    paths += sorted((root / "paper/materials/session/codex").glob("**/*.jsonl"))
    for session, meta in sessions.items():
        path = next((p for p in paths if p.name.endswith(session + ".jsonl")), None)
        if path:
            register(path, meta, rollout=True)
    return sources
