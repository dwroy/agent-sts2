#!/usr/bin/env python3
"""Scan explicit frozen leaves by stdin; keep a small manifest, never a checkout copy."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import uuid


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def atomic(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=".manifest-", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as handle:
            json.dump(value, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(name, path)
    finally:
        Path(name).unlink(missing_ok=True)


def safe_name(name):
    p = Path(name)
    if (not name or p.is_absolute() or ".." in p.parts or ".git" in p.parts
            or str(p) != name or re.search(r"[\x00-\x1f]", name)
            or any(re.search(r"(^\.env($|\.)|api.?key|credentials|auth\.json)", part, re.I) for part in p.parts)):
        raise ValueError("unsafe scan leaf retained")
    return name


def capture(root, names, ref=None):
    root = Path(root).resolve()
    base = subprocess.check_output(["git", "-C", str(root), "rev-parse", "--verify", (ref or "HEAD") + "^{commit}"], text=True).strip()
    result = {}
    for name in sorted(set(names)):
        safe_name(name)
        if ref:
            result[name] = subprocess.check_output(["git", "-C", str(root), "show", base + ":" + name])
        else:
            path = root / name
            if any(p.is_symlink() for p in (path, *path.parents)) or not path.resolve().is_relative_to(root):
                raise ValueError("symlinked scan leaf retained")
            if path.is_file():
                before = path.stat()
                raw = path.read_bytes()
                after = path.stat()
                if (before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns) != (after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns):
                    raise ValueError("scan leaf changed during capture")
                result[name] = raw
            elif path.exists():
                raise ValueError("scan needs explicit regular leaves, not a directory")
    return base, result


def scanner_identity(root):
    binary = shutil.which("gitleaks")
    if not binary:
        raise ValueError("gitleaks unavailable; retain scan inputs")
    data = {"binary_sha256": sha(Path(binary).read_bytes()), "mode": "stdin-redact-v1", "configs": {}}
    cacheable = True
    candidates = [Path(root) / ".gitleaks.toml", Path(root) / ".gitleaksignore"]
    if os.environ.get("GITLEAKS_CONFIG"):
        configured = Path(os.environ["GITLEAKS_CONFIG"])
        candidates.append(configured if configured.is_absolute() else Path(root) / configured)
    for path in candidates:
        if path.exists():
            # Custom configurations may extend other files: scan every leaf rather than
            # reuse a receipt whose complete policy dependency graph is not known.
            cacheable = False
            if path.is_symlink() or not path.resolve().is_relative_to(Path(root).resolve()):
                cacheable = False
            else:
                data["configs"][str(path)] = sha(path.read_bytes())
    # A configured inline policy is fingerprinted without recording its contents.
    data["inline_config_sha256"] = sha(os.environ.get("GITLEAKS_CONFIG_TOML", "").encode())
    if os.environ.get("GITLEAKS_CONFIG_TOML"):
        cacheable = False
    return sha(json.dumps(data, sort_keys=True).encode()), cacheable


def scan_snapshots(root, directory, snapshots, base, scanner=None):
    """The caller still owns publication/CAS and must recheck the original bytes."""
    root, directory = Path(root), Path(directory)
    scanner_sha, cacheable = scanner_identity(root)
    folder = directory / "record-scans"
    run = folder / "runs" / uuid.uuid4().hex
    run.mkdir(parents=True)
    manifest_path = run / "manifest.json"
    files = [{"path": safe_name(name), "bytes": len(raw), "sha256": sha(raw),
              "git_blob": subprocess.check_output(["git", "-C", str(root), "hash-object", "--stdin"], input=raw).decode().strip()}
             for name, raw in sorted(snapshots.items())]
    manifest = {"schema": "precise-record-scan-v1", "root": str(root.resolve()), "base_commit": base,
                "scanner_sha256": scanner_sha, "state": "prepared", "files": files,
                "full_copy_bytes": 0, "scanned_leaves": 0, "reused_clean_leaves": 0}
    atomic(manifest_path, manifest)
    seen = set()
    for item in files:
        digest = item["sha256"]
        receipt = folder / "clean" / scanner_sha / (digest + ".json")
        cached = None
        if cacheable and receipt.is_file() and not receipt.is_symlink():
            try:
                cached = json.loads(receipt.read_text())
            except (OSError, ValueError):
                pass
        if (cacheable and digest in seen) or (cached and cached.get("state") == "clean" and cached.get("sha256") == digest
                              and cached.get("bytes") == item["bytes"] and cached.get("scanner_sha256") == scanner_sha):
            item["scan"] = "same_verified_content"
            manifest["reused_clean_leaves"] += 1
            continue
        raw = snapshots[item["path"]]
        if scanner:
            rc = scanner(raw)
        else:
            result = subprocess.run(["gitleaks", "stdin", "--no-banner", "--redact", "--log-level", "error",
                                     "--report-format", "json", "--report-path", str(run / (digest + ".redacted.json"))],
                                    cwd=root, input=raw, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            rc = result.returncode
        item.update(scan="clean" if rc == 0 else "failed", rc=rc)
        manifest["scanned_leaves"] += 1
        if rc:
            manifest.update(state="failed", failed_path=item["path"])
            atomic(manifest_path, manifest)
            raise ValueError("precise leaf scan failed; original manifest retained: " + str(manifest_path))
        seen.add(digest)
        if cacheable:
            atomic(receipt, {"state": "clean", "sha256": digest, "bytes": item["bytes"], "scanner_sha256": scanner_sha})
    manifest["state"] = "clean"
    if scanner_identity(root)[0] != scanner_sha:
        manifest["state"] = "policy_changed"
        atomic(manifest_path, manifest)
        raise ValueError("scanner policy changed; retain original manifest")
    atomic(manifest_path, manifest)
    return {"manifest": str(manifest_path), "manifest_sha256": sha(manifest_path.read_bytes()),
            "scanned_leaves": manifest["scanned_leaves"], "reused_clean_leaves": manifest["reused_clean_leaves"], "full_copy_bytes": 0}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--root", type=Path, required=True)
    p.add_argument("--state-dir", type=Path, required=True)
    p.add_argument("--ref", help="pin a committed source; absent means exact current working-tree leaves")
    p.add_argument("--path", nargs="+", required=True, help="explicit leaves only, no directory scan")
    args = p.parse_args()
    base, snapshots = capture(args.root, args.path, args.ref)
    receipt = scan_snapshots(args.root, args.state_dir, snapshots, base)
    print(json.dumps(receipt, ensure_ascii=False))


if __name__ == "__main__":
    main()
