"""Project-local knowledge configuration at natural entry boundaries; never opens the database."""
import argparse
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import stat

RUNTIME = "STS2_KNOWLEDGE_RUNTIME"
ROOT = "STS2_KNOWLEDGE_RUNTIME_ROOT"
SHA = "STS2_KNOWLEDGE_RUNTIME_CONTROL_SHA256"
SOURCE = "STS2_KNOWLEDGE_RUNTIME_SOURCE"


def runtime_path(root, value, *, configured=False):
    if not isinstance(value, str) or not value or not Path(value).is_absolute():
        raise ValueError("runtime directory must be absolute")
    path = Path(value).resolve()
    if configured:
        path.relative_to((root / "data").resolve())
        if path == (root / "data").resolve():
            raise ValueError("runtime needs its own data directory")
    return str(path)


def snapshot(root, state_dir=None, *, env=None, preserve=False):
    env = os.environ if env is None else env
    root = Path(root).resolve()
    # Wrappers retain the parent's selection through launcher and finish, even if control changes meanwhile.
    if preserve and env.get(ROOT):
        if (Path(env[ROOT]).resolve() != root or not re.fullmatch(r"[a-f0-9]{64}", env.get(SHA, ""))
                or env.get(SOURCE) not in ("control", "explicit", "disabled")):
            raise ValueError("inherited runtime selection belongs to another root or is incomplete")
        return {RUNTIME: runtime_path(root, env[RUNTIME]) if env.get(RUNTIME) else None,
                ROOT: str(root), SHA: env[SHA], SOURCE: env[SOURCE]}
    if preserve and env.get(RUNTIME):
        value = runtime_path(root, env[RUNTIME])
        return {RUNTIME: value, ROOT: str(root), SHA: hashlib.sha256(("explicit:" + value).encode()).hexdigest(), SOURCE: "explicit"}
    directory = Path(state_dir) if state_dir is not None else root / "ops/codex-ops"
    directory = directory.resolve()
    path = directory / "knowledge-runtime.json"
    try:
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
    except FileNotFoundError:
        # A removed control file disables an old control-derived value at the NEXT natural entry.
        value = env.get(RUNTIME) if env.get(SOURCE) not in ("control", "disabled") else None
        value = runtime_path(root, value) if value else None
        origin = "explicit" if value else "disabled"
        return {RUNTIME: value, ROOT: str(root), SHA: hashlib.sha256((origin + ":" + (value or "")).encode()).hexdigest(), SOURCE: origin}
    try:
        directory.relative_to(root)
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_size > 4096:
            raise ValueError("runtime control must be a small regular file")
        raw = os.read(fd, 4097)
        if len(raw) > 4096:
            raise ValueError("runtime control exceeds size limit")
    finally:
        os.close(fd)
    body = json.loads(raw)
    if (not isinstance(body, dict) or set(body) - {"schema", "root", "enabled", "runtime_dir"}
            or body.get("schema") != "knowledge-runtime-control-v1" or type(body.get("enabled")) is not bool
            or not isinstance(body.get("root"), str) or not Path(body["root"]).is_absolute()
            or Path(body["root"]).resolve() != root):
        raise ValueError("runtime control schema/root mismatch")
    value = runtime_path(root, body.get("runtime_dir"), configured=True) if body["enabled"] else None
    return {RUNTIME: value, ROOT: str(root), SHA: hashlib.sha256(raw).hexdigest(), SOURCE: "control"}


def apply(root, state_dir=None, *, env=None, preserve=False):
    env = os.environ if env is None else env
    selected = snapshot(root, state_dir, env=env, preserve=preserve)
    for name, value in selected.items():
        if value is None:
            env.pop(name, None)
        else:
            env[name] = value
    return selected


def capture(root, state_dir=None):
    """Capture before spawning; the original registration transaction persists this with the batch."""
    selected = apply(root, state_dir)
    return {"schema": "knowledge-runtime-selection-v1", "root": selected[ROOT],
            "enabled": selected[RUNTIME] is not None, "directory": selected[RUNTIME],
            "control_sha256": selected[SHA], "source": selected[SOURCE]}


@contextmanager
def bound_batch(root, batch, *, env=None):
    """Recover from persisted identity, never a fresh process's current control or inherited directory."""
    env = os.environ if env is None else env
    root = Path(root).resolve()
    saved = batch.get("knowledge_runtime")
    if (not isinstance(saved, dict) or set(saved) != {"schema", "root", "enabled", "directory", "control_sha256", "source"}
            or saved.get("schema") != "knowledge-runtime-selection-v1" or type(saved.get("enabled")) is not bool
            or not isinstance(saved.get("root"), str) or not Path(saved["root"]).is_absolute()
            or saved["root"] != str(root) or saved.get("source") not in ("control", "explicit", "disabled")
            or not isinstance(saved.get("control_sha256"), str) or not re.fullmatch(r"[a-f0-9]{64}", saved["control_sha256"])):
        raise ValueError("original batch runtime selection is absent or invalid; preserve original contract")
    value = runtime_path(root, saved["directory"], configured=saved["source"] == "control") if saved["enabled"] else None
    if value is not None and value != saved["directory"]:
        raise ValueError("original runtime directory was redirected; do not rebind recovery")
    if (not saved["enabled"] and saved["directory"] is not None
            or saved["enabled"] and saved["source"] == "disabled"
            or not saved["enabled"] and saved["source"] == "explicit"):
        raise ValueError("disabled batch has an inconsistent runtime directory")
    selected = {RUNTIME: value, ROOT: str(root), SHA: saved["control_sha256"], SOURCE: saved["source"]}
    original = {key: env.get(key) for key in selected}
    try:
        for key, item in selected.items():
            if item is None:
                env.pop(key, None)
            else:
                env[key] = item
        yield selected
    finally:
        for key, item in original.items():
            if item is None:
                env.pop(key, None)
            else:
                env[key] = item


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True)
    parser.add_argument("--state-dir")
    args = parser.parse_args()
    try:
        selected = snapshot(args.root, args.state_dir)
    except (OSError, ValueError, TypeError, KeyError):
        raise SystemExit("invalid project knowledge runtime control; no action started")
    for name, value in selected.items():
        print("unset " + name if value is None else "export " + name + "=" + shlex.quote(value))


if __name__ == "__main__":
    main()
