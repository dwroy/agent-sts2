"""Freeze raw-log timing projections and SHA-bound offsets; no database sync or game calls."""
from pathlib import Path
from datetime import datetime, date
import argparse
import gzip
import hashlib
import json
import mmap
import sys

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
sys.path.insert(0, str(ROOT / "agent/tools/logdb"))
import extract


def clean(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items()}
    if isinstance(value, (tuple, list)):
        return [clean(v) for v in value]
    return value


def project(name, row, raw, offset):
    if name == "states":
        result = clean(extract.frame_row(raw, offset))
        for k in ("fingerprint", "deck", "relics", "player_powers", "map_avail"):
            result.pop(k, None)
    elif name == "decisions":
        keys = ("ts", "observed_ts", "run_id", "decision_id", "mode", "screen", "floor", "turn", "label",
                "decider", "latency_ms", "timing", "time_budget", "sl_attempt", "sl_reloads", "fallback",
                "deepseek_fallback", "reused_answer", "result", "deepseek", "escalation")
        result = {k: row[k] for k in keys if k in row}
        sim = row.get("boss_sim")
        if isinstance(sim, dict):
            result["boss_sim"] = {k: v for k, v in sim.items() if k not in ("construction", "f48_joint_shadow", "s_readiness", "build_ranking", "s_relative", "global_build")}
            global_build = sim.get("global_build")
            if isinstance(global_build, dict):
                result["boss_sim"]["global_build_timing"] = {k: v for k, v in global_build.items() if k in ("wall_ms", "b3_plus_shadow_wall_ms", "status", "reason")}
    elif name == "brain":
        result = {k: row[k] for k in ("ts", "run_id", "question_id", "engine", "model", "effort", "label", "latency_ms", "accepted", "error", "error_kind", "problems", "attempts", "reasks", "fallback", "fallback_from", "primary_ms") if k in row}
    elif name == "codex-calls":
        result = {k: row[k] for k in ("ts", "run_id", "question_id", "label", "model", "effort", "attempt", "outcome", "ms", "call_ms", "ttft_ms", "thread_id", "turn_id", "errors", "retries") if k in row}
    elif name == "sl-attempts":
        result = {k: row[k] for k in ("ts", "run_id", "act", "floor", "encounter", "fight_kind", "attempt", "max_attempts", "started_at", "ended_at", "result", "turns", "judge", "reload", "give_up_reason") if k in row}
    else:
        result = row
    result["_source"] = {"path": f"logs/{name}.jsonl", "off": offset, "len": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output")
    parser.add_argument("runs", nargs="+")
    parser.add_argument("--new-only", action="store_true", help="Only bytes appended after the initial baseline cut")
    args = parser.parse_args()
    assert all(r.isalnum() for r in args.runs)
    out = HERE / args.output
    out.mkdir()
    cut = json.loads((HERE / "data-cut.json").read_bytes())
    wanted = {x.encode(): x for x in args.runs}
    sources, counts = {}, {}
    for name in ("run-config", "runs", "decisions", "states", "brain", "codex-calls", "sl-attempts"):
        path = ROOT / "logs" / f"{name}.jsonl"
        st = path.stat()
        lower = cut.get("additional_source_bounds", {}).get(f"logs/{name}.jsonl", {}).get("bytes", 0) if args.new_only else 0
        count = {run: 0 for run in args.runs}
        with path.open("rb") as source, mmap.mmap(source.fileno(), 0, access=mmap.ACCESS_READ) as mm:
            complete = mm.rfind(b"\n") + 1
            starts = [mm.find(key, lower, complete) for key in wanted]
            positions = [v for v in starts if v >= 0]
            start = mm.rfind(b"\n", 0, min(positions)) + 1 if positions else complete
            with (out / f"{name}.jsonl.gz").open("xb") as sink, gzip.GzipFile(fileobj=sink, mode="wb", mtime=0) as zipped:
                cursor = start
                while cursor < complete:
                    end = mm.find(b"\n", cursor, complete) + 1
                    raw = mm[cursor:end]
                    if any(key in raw for key in wanted):
                        row = json.loads(raw)
                        run = row.get("run_id") or (row.get("state") or {}).get("run_id")
                        if run in count:
                            value = project(name, row, raw, cursor)
                            zipped.write((json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n").encode())
                            count[run] += 1
                    cursor = end
            sources[name] = {"path": str(path.relative_to(ROOT)), "inode": st.st_ino, "complete_prefix_bytes": complete, "scan_start": start,
                             "mtime_ns": st.st_mtime_ns, "prefix_hash": "per selected raw row SHA256; whole historical source not reread for hashing"}
        counts[name] = count
        print(json.dumps({"stream": name, "rows": count}), flush=True)
    files = [{"path": str(p.relative_to(HERE)), "bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(out.glob("*.gz"))]
    (out / "manifest.json").write_text(json.dumps({"at": datetime.now().astimezone().isoformat(), "runs": args.runs, "sources": sources, "counts": counts, "files": files,
        "frame_extractor": {"path": "agent/tools/logdb/extract.py", "sha256": hashlib.sha256((ROOT / "agent/tools/logdb/extract.py").read_bytes()).hexdigest()},
        "scope": "raw append logs, original offsets/bytes/SHA; no SQL sync, simulation or model calls"}, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
