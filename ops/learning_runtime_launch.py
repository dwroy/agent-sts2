"""Pin fixed data for a new run; a resumed run recovers its original directory/version."""
import argparse
import json
import os
from pathlib import Path
import re
import sys

from learning_runtime import capture
from learning_runtime_store import Store
from learning_runtime_data import managed_paths


def launch(root, screen, run_id, session, config_log, code, command):
    original = None
    if screen not in ("MAIN_MENU", "CHARACTER_SELECT", "GAME_OVER"):
        if not Path(config_log).exists():
            selected = capture(root)
            if not selected.get("enabled") or not managed_paths(selected):
                had_binding = False
                for old in selected.get("read_directories", []):
                    store = Store(old, readonly=True)
                    try:
                        had_binding = had_binding or bool(store.db.execute("SELECT 1 FROM data_bindings LIMIT 1").fetchone())
                    finally:
                        store.close()
                if not had_binding:
                    return command, {k: v for k, v in os.environ.items() if not k.startswith("STS2_DATA_")}
            raise ValueError("original data/run config unavailable")
        if not re.fullmatch(r"[A-Z0-9]{12}", run_id):
            raise ValueError("unknown existing run")
        with Path(config_log).open("rb") as stream:
            stream.seek(0, 2)
            size = stream.tell()
            stream.seek(max(0, size - 2 * 1024 * 1024))
            if size > 2 * 1024 * 1024:
                stream.readline()
            rows = stream.read().splitlines()
        row = next((json.loads(raw) for raw in reversed(rows) if json.loads(raw).get("run_id") == run_id), None)
        if row is None:
            raise ValueError("missing original run config")
        original = row.get("knowledge", {}).get("fixed_data")
        if original is None:
            # An existing run without D1 keeps the old file contract even if a
            # new control has enabled D1 in the meantime.
            return command, {k: v for k, v in os.environ.items() if not k.startswith("STS2_DATA_")}
        directory = Path(original["directory"])
        directory.relative_to(Path(root).resolve() / "data")
        if directory.resolve() != directory:
            raise ValueError("original fixed-data directory redirected")
        key = original["run"]
        patterns = None
    else:
        selected = capture(root)
        patterns = managed_paths(selected)
        if not selected.get("enabled") or not patterns:
            return command, {k: v for k, v in os.environ.items() if not k.startswith("STS2_DATA_")}
        directory = Path(selected["directory"])
        key = "launch:" + session
    if not (directory / "learning.sqlite").is_file():
        raise ValueError("original fixed-data runtime unavailable")
    store = Store(directory)
    try:
        bound = store.bind(key, code, patterns)
        dependencies = store.knowledge_dependencies(bound["version"], bound["managed_paths"])
        if original and original["version"] != bound["version"]:
            raise ValueError("original data version mismatch")
        if original and "managed_paths" in original and original["managed_paths"] != bound["managed_paths"]:
            raise ValueError("original data consumer selection mismatch")
    finally:
        store.close()
    return command, {**os.environ, "STS2_DATA_VERSION": bound["version"], "STS2_DATA_SNAPSHOT": bound["snapshot"],
                     "STS2_DATA_RUNTIME": str(directory), "STS2_DATA_RUN_KEY": key,
                     "STS2_DATA_KNOWLEDGE_DEPENDENCIES": json.dumps(dependencies), "STS2_DATA_MANAGED_PATHS": json.dumps(bound["managed_paths"])}


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__)
    for key in ("root", "screen", "run-id", "session", "config-log", "code"):
        p.add_argument("--" + key, required=True)
    a, command = p.parse_known_args()
    if not command or command[0] != "--" or len(command) < 2:
        p.error("requires -- command")
    try:
        argv, env = launch(a.root, a.screen, a.run_id, a.session, a.config_log, a.code, command[1:])
    except (OSError, ValueError, KeyError, TypeError) as error:
        print("fixed data launch held: original binding/config unavailable (" + type(error).__name__ + ")", file=sys.stderr)
        sys.exit(78)
    os.execvpe(argv[0], argv, env)
