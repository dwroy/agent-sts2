"""Freeze future H2 natural-run evidence once, bounded by initial and final raw prefixes."""
from pathlib import Path
from datetime import datetime
import argparse
import gzip
import hashlib
import importlib.util
import json
import mmap

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
H1 = ROOT / "paper/materials/20261017-human-pace-h1/natural"
spec = importlib.util.spec_from_file_location("h1_freezer", H1 / "freeze-inputs.py")
h1 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h1)


def project(name, row, raw, offset):
    if name in ("states", "brain", "codex-calls"):
        value = h1.project(name, row, raw, offset)
    elif name == "run-plans":
        value = {k: v for k, v in row.items() if k not in ("prompt", "state", "knowledge")}
    else:
        # Decisions include chosen/result, B2/B3, and sidecars include every option and reason.
        value = row.copy()
    if not value.get("run_id") and isinstance(value.get("run"), str):
        value["run_id"] = value["run"]
    value["_source"] = {"path": f"logs/{name}.jsonl", "off": offset, "len": len(raw),
                        "sha256": hashlib.sha256(raw).hexdigest()}
    return value


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", default="inputs-final")
    args = parser.parse_args()
    state = json.loads((HERE / "three-terminal-event.json").read_bytes())
    runs = state["admitted"]
    assert len(runs) == 3 and len(set(runs)) == 3
    cut = json.loads((HERE / "initial-data-cut.json").read_bytes())
    out = HERE / args.output
    out.mkdir()
    wanted = {r.encode() for r in runs}
    sources, counts, invalid = {}, {}, []
    for name, old in cut["streams"].items():
        path = ROOT / old["path"]
        if not path.exists():
            sources[name] = {"exists": False}
            counts[name] = {r: 0 for r in runs}
            continue
        st = path.stat()
        if old["exists"]:
            assert st.st_ino == old["inode"], f"rotation: {name}"
        lower = old["complete_prefix_bytes"]
        per_run = {r: 0 for r in runs}
        with path.open("rb") as src, mmap.mmap(src.fileno(), 0, access=mmap.ACCESS_READ) as mm:
            final = mm.rfind(b"\n") + 1
            assert final >= lower
            with (out / f"{name}.jsonl.gz").open("xb") as sink, gzip.GzipFile(fileobj=sink, mode="wb", mtime=0) as gz:
                pos = lower
                while pos < final:
                    end = mm.find(b"\n", pos, final) + 1
                    raw = mm[pos:end]
                    if any(key in raw for key in wanted):
                        try:
                            row = json.loads(raw)
                        except Exception as error:
                            invalid.append({"stream": name, "off": pos, "len": len(raw),
                                            "sha256": hashlib.sha256(raw).hexdigest(), "error": str(error)})
                            (out / f"invalid-{name}-{pos}.raw").write_bytes(raw)
                            pos = end
                            continue
                        run = row.get("run_id") or row.get("run") or (row.get("state") or {}).get("run_id")
                        if run in per_run:
                            value = project(name, row, raw, pos)
                            gz.write((json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n").encode())
                            per_run[run] += 1
                    pos = end
        sources[name] = {"path": old["path"], "inode": st.st_ino, "scan_start": lower,
                         "complete_prefix_bytes": final, "size_at_freeze": st.st_size,
                         "mtime_ns": st.st_mtime_ns, "hash_scope": "each selected original row, never a fabricated full-source hash"}
        counts[name] = per_run
        print(json.dumps({"stream": name, "rows": per_run}), flush=True)
    manifest = {"at": datetime.now().astimezone().isoformat(), "runs": runs, "sources": sources,
                "counts": counts, "invalid_rows": invalid,
                "files": [{"path": p.name, "bytes": p.stat().st_size, "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
                          for p in sorted(out.glob("*.gz"))],
                "tools": [{"path": str(p.relative_to(ROOT)), "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
                          for p in (Path(__file__), H1 / "freeze-inputs.py", ROOT / "agent/tools/logdb/extract.py")],
                "scope": "raw log export only, no SQL sync, models, simulations or game calls"}
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
