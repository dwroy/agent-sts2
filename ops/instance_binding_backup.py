#!/usr/bin/env python3
"""Preserve one runtime's binding across removal of its tracked Git copy; run explicitly at integration."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
import learner_retention as retention
from instance_env import binding_env


def paths(root):
    return (retention.safe_path(root, root / "ops/instance-binding.json"),
            retention.safe_path(root, root / "ops/codex-ops/retention/instance-binding-backup.json"))


def preserve(root, command):
    target, receipt = paths(root)
    if command == "backup":
        if not target.is_file() or target.stat().st_size > 65536:
            raise ValueError("existing regular binding required; an absent binding cannot be invented")
        raw = target.read_bytes()
        binding_env(json.loads(raw))
        value = {"schema": "instance-binding-backup-v1", "root": str(root), "at": retention.stamp(),
                 "sha256": hashlib.sha256(raw).hexdigest(), "content": raw.decode(),
                 "mode": target.stat().st_mode & 0o777}
        if receipt.exists() and retention.load(receipt) != value:
            # Repeating backup is safe only for the same original identity and bytes.
            previous = retention.load(receipt)
            if any(previous.get(k) != value[k] for k in ("schema", "root", "sha256", "content", "mode")):
                raise ValueError("different prior binding backup retained")
        else:
            retention.atomic(receipt, value)
    saved = retention.load(receipt)
    raw = saved["content"].encode()
    if (saved.get("schema") != "instance-binding-backup-v1" or saved.get("root") != str(root)
            or hashlib.sha256(raw).hexdigest() != saved.get("sha256")):
        raise ValueError("binding backup identity or hash mismatch")
    binding_env(json.loads(raw))
    if command == "restore" and not target.exists():
        target.parent.mkdir(parents=True, exist_ok=True)
        # Exclusive creation never overwrites a concurrent runtime rebind.
        with target.open("xb") as stream:
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        target.chmod(saved["mode"])
    if not target.is_file() or target.read_bytes() != raw:
        raise ValueError("runtime binding missing or changed; stop integration and preserve both identities")
    return {"state": "verified", "root": str(root), "sha256": saved["sha256"],
            "backup": str(receipt.relative_to(root))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["backup", "restore", "verify"])
    parser.add_argument("--root", required=True, type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(preserve(args.root.resolve(), args.command)))
    except (OSError, ValueError, KeyError, TypeError) as error:
        print(json.dumps({"state": "retained", "reason": str(error)}))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
