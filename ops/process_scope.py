"""Select only processes belonging to one ops checkout and live controller."""
import argparse
from pathlib import Path
import sys


def belongs(pid, root, live, proc=Path("/proc"), kind="any"):
    try:
        directory = proc / str(int(pid))
        argv = directory.joinpath("cmdline").read_bytes().split(b"\0")
        argv = [a.decode("utf-8", errors="replace") for a in argv if a]
        cwd = directory.joinpath("cwd").resolve(strict=True)
    except (OSError, ValueError):
        return False
    is_play = any(a.endswith("index.ts") and i + 1 < len(argv) and argv[i + 1] == "play"
                  for i, a in enumerate(argv))
    if is_play:
        return kind in ("any", "play") and cwd == (Path(live) / "agent").resolve()
    if kind == "play":
        return False
    root = Path(root).resolve()
    allowed = {"autoplay.sh", "autoplay-console.sh", "autoplay-pane.sh", "report.py", "report_run.py",
               "codex-ops-learner.sh", "codex-ops.sh", "main.ts", "run.ts"}
    for arg in argv:
        path = Path(arg)
        resolved = (path if path.is_absolute() else cwd / path).resolve()
        if kind == "any" and any(resolved.is_relative_to(base / "knowledge/builders")
                                 for base in (root, Path(live).resolve())):
            return True
        if path.name not in allowed and not (path.name.startswith("stop-after") and path.suffix == ".sh"):
            continue
        path = resolved
        if not any(path.is_relative_to(root / directory) for directory in ("ops", "learner")):
            continue
        if kind == "autoplay" and path.name != "autoplay.sh":
            continue
        if kind == "report" and path.name != "report.py":
            continue
        return True
    return False


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["filter", "owns"])
    parser.add_argument("pid", nargs="?")
    parser.add_argument("--root", required=True)
    parser.add_argument("--live", required=True)
    parser.add_argument("--kind", default="any", choices=["any", "play", "autoplay", "report"])
    args = parser.parse_args()
    if args.action == "owns":
        return 0 if belongs(args.pid, args.root, args.live, kind=args.kind) else 1
    for line in sys.stdin:
        parts = line.split(None, 1)
        if parts and belongs(parts[0], args.root, args.live, kind=args.kind):
            print(line.rstrip("\n"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
