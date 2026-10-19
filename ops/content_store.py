#!/usr/bin/env python3
"""Immutable, byte-addressed storage for frozen evidence and offline simulation artifacts.

This does not decide whether a simulation can be reused. Existing input/model/seed
checks still own that decision. Task paths remain ordinary, read-only files.
"""
import argparse
import errno
import hashlib
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile
import time
import uuid

SHA = re.compile(r"[0-9a-f]{64}")
SECRET = re.compile(r"(^\.env($|\.)|api.?key|credentials|auth\.json|token|secret)", re.I)
# Exact producer streams from learner/extract_evidence.py; never accept arbitrary paths.
EVIDENCE_STREAMS = frozenset(("states", "decisions", "sl-attempts", "run-config", "run-plans",
                              "brain", "runs", "fight-plans", "v6-build", "jev-prompts"))


def digest(path):
    value = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(block)
    return value.hexdigest()


def regular(path):
    path = Path(path).absolute()
    if any(parent.is_symlink() for parent in (path, *path.parents)):
        raise ValueError("symlinked frozen input retained")
    if SECRET.search(path.name):
        raise ValueError("credential-named input retained")
    value = path.stat()
    if not stat.S_ISREG(value.st_mode):
        raise ValueError("nonregular frozen input retained")
    return value


def signature(value):
    return value.st_dev, value.st_ino, value.st_size, value.st_mtime_ns, value.st_ctime_ns


def default_directory(path):
    """All worktrees of this repository share objects, never mutable task state."""
    path = Path(path).absolute()
    for parent in (path, *path.parents):
        marker = parent / ".git"
        gitdir = marker
        if marker.is_file():
            line = marker.read_text().strip()
            if not line.startswith("gitdir: "):
                continue
            gitdir = (parent / line[len("gitdir: "):]).resolve()
        if gitdir.is_dir() and (gitdir / "HEAD").is_file():
            try:
                common = subprocess.check_output(["git", "-C", str(parent), "rev-parse",
                                                  "--path-format=absolute", "--git-common-dir"],
                                                 text=True, stderr=subprocess.DEVNULL).strip()
            except subprocess.CalledProcessError:
                continue
            if not isinstance(common, str) or not Path(common).is_absolute() or not (Path(common) / "objects").is_dir():
                raise ValueError("invalid repository object location")
            return Path(common).parent / "ops/codex-ops/objects/v1"
    # Non-Git fixed fixtures and explicit standalone extractions stay local.
    return path / ".objects/v1"


class Store:
    def __init__(self, directory):
        self.directory = Path(directory).absolute()
        if any(p.is_symlink() for p in (self.directory, *self.directory.parents)):
            raise ValueError("symlinked object store retained")

    def path(self, sha256):
        if not isinstance(sha256, str) or not SHA.fullmatch(sha256):
            raise ValueError("invalid content SHA256")
        return self.directory / "sha256" / sha256[:2] / sha256[2:]

    def verify(self, sha256, size=None):
        path = self.path(sha256)
        value = regular(path)
        if value.st_mode & 0o222 or (size is not None and value.st_size != size) or digest(path) != sha256:
            raise ValueError("immutable object changed; retain originals")
        return path

    def put(self, source):
        source = Path(source)
        before = regular(source)
        expected = digest(source)
        if signature(regular(source)) != signature(before):
            raise ValueError("frozen input changed during hashing")
        reference = {"schema": "frozen-content-v1", "sha256": expected, "bytes": before.st_size,
                     "store": str(self.directory), "object": str(self.path(expected).relative_to(self.directory))}
        if self.path(expected).exists():
            self.verify(expected, before.st_size)
            return reference
        incoming = self.directory / ".incoming"
        incoming.mkdir(parents=True, exist_ok=True)
        fd, name = tempfile.mkstemp(prefix="object-", dir=incoming)
        temporary = Path(name)
        try:
            value = hashlib.sha256()
            with os.fdopen(fd, "wb") as output, source.open("rb") as handle:
                if signature(os.fstat(handle.fileno())) != signature(before):
                    raise ValueError("frozen input changed before capture")
                for block in iter(lambda: handle.read(1024 * 1024), b""):
                    output.write(block)
                    value.update(block)
                output.flush()
                os.fsync(output.fileno())
                if signature(os.fstat(handle.fileno())) != signature(before) or signature(regular(source)) != signature(before):
                    raise ValueError("frozen input changed during capture")
                os.fchmod(output.fileno(), 0o444)
            sha256 = value.hexdigest()
            if sha256 != expected:
                raise ValueError("frozen input bytes changed during capture")
            target = self.path(sha256)
            target.parent.mkdir(parents=True, exist_ok=True)
            try:
                os.link(temporary, target)
            except FileExistsError:
                self.verify(sha256, before.st_size)
            self.verify(sha256, before.st_size)
            return reference
        finally:
            temporary.unlink(missing_ok=True)

    def materialize(self, reference, destination):
        """Atomically replace a task view; never truncate a shared inode."""
        source = self.verify(reference["sha256"], reference["bytes"])
        destination = Path(destination).absolute()
        if any(p.is_symlink() for p in (destination, *destination.parents)) or SECRET.search(destination.name):
            raise ValueError("unsafe frozen destination retained")
        if destination.exists() and os.path.samefile(source, destination):
            return
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_name("." + destination.name + ".object-" + uuid.uuid4().hex)
        try:
            # A cross-device destination is rejected, never silently expanded into another full copy.
            os.link(source, temporary)
            os.replace(temporary, destination)
        finally:
            temporary.unlink(missing_ok=True)

    def seal(self, source):
        """Seal an owner-finished file in place, preserving bytes and the consumer path."""
        source = Path(source)
        before = signature(regular(source))
        reference = self.put(source)
        if signature(regular(source)) != before:
            raise ValueError("frozen input changed before materialization")
        self.materialize(reference, source)
        return reference

    def publish_view(self, source, destination):
        """Sandbox mounts may forbid linking: retain exact bytes for the host finalizer."""
        source, destination = Path(source), Path(destination)
        before = regular(source)
        expected = digest(source)
        if signature(regular(source)) != signature(before):
            raise ValueError("frozen producer output changed")
        try:
            reference = self.put(source)
            self.materialize(reference, destination)
            return reference
        except OSError as error:
            if error.errno not in (errno.EACCES, errno.EPERM, errno.EROFS, errno.EXDEV):
                raise
            if signature(regular(source)) != signature(before) or digest(source) != expected:
                raise ValueError("frozen output changed before deferred capture")
            # No permission expansion and no symlink outside the task. The original
            # host launcher seals declared files only after its model child exits.
            source.chmod(0o444)
            if source.absolute() != destination.absolute():
                os.replace(source, destination)
            return {"schema": "frozen-content-v1", "sha256": expected, "bytes": before.st_size,
                    "store": str(self.directory), "object": str(self.path(expected).relative_to(self.directory)),
                    "pending_host_seal": True, "deferred_errno": error.errno}


def finalize(scratch, store_directory):
    """Consume producer declarations, not arbitrary files or a recursive payload copy."""
    scratch = Path(scratch).absolute()
    if any(p.is_symlink() for p in (scratch, *scratch.parents)):
        raise ValueError("symlinked scratch retained")
    store = Store(store_directory)
    declarations = []
    for parent, dirs, files in os.walk(scratch, followlinks=False):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules", ".objects") and not (Path(parent) / d).is_symlink()]
        for name in files:
            if name == "evidence-manifest.json" or name.endswith(".content.json"):
                declarations.append(Path(parent) / name)
    files_done = []
    for manifest in sorted(declarations):
        regular(manifest)
        value = json.loads(manifest.read_text())
        pending = []
        if manifest.name == "evidence-manifest.json" and isinstance(value, list):
            for row in value:
                if not isinstance(row, dict) or not isinstance(row.get("content"), dict):
                    continue
                stream = row.get("stream", "")
                if not isinstance(stream, str) or stream not in EVIDENCE_STREAMS or row["content"].get("sha256") != row.get("output_sha256"):
                    raise ValueError("invalid frozen evidence declaration")
                pending.append((manifest.parent / (stream + ".evidence.jsonl"), row, "content"))
        elif isinstance(value, dict) and value.get("schema") == "frozen-simulation-artifacts-v1":
            base = manifest.with_name(manifest.name[:-len(".content.json")])
            for name, reference in value.get("files", {}).items():
                p = Path(name)
                if p.is_absolute() or ".." in p.parts or p.suffix not in (".json", ".jsonl"):
                    raise ValueError("invalid frozen simulation declaration")
                pending.append((base / p, value["files"], name))
        else:
            continue
        for path, container, key in pending:
            if not path.absolute().is_relative_to(scratch):
                raise ValueError("declared file outside original scratch")
            reference = container[key]
            regular(path)
            if (not isinstance(reference, dict) or reference.get("schema") != "frozen-content-v1" or path.stat().st_size != reference.get("bytes")
                    or digest(path) != reference.get("sha256")):
                raise ValueError("declared frozen bytes changed; retain originals")
            sealed = store.seal(path)
            files_done.append({"path": str(path), "sha256": sealed["sha256"], "bytes": sealed["bytes"], "content": sealed})
        # Producer declarations are historical input bytes, possibly themselves sealed
        # in a completed scientific archive. Only the separate host receipt states completion.
    return {"schema": "frozen-host-finalization-v1", "status": "sealed", "scratch": str(scratch),
            "files": files_done, "models_started": 0, "permissions_changed": False}


def write_receipt(path, result):
    path = Path(path).absolute()
    if any(p.is_symlink() for p in path.parents):
        raise ValueError("symlinked receipt parent retained")
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".storage-receipt-", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as handle:
            json.dump(result, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        # Replace a model-created alias at this reserved host receipt name, never its target.
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--store", type=Path)
    parser.add_argument("--file", type=Path, nargs="+",
                        help="explicit, owner-finished files only; no recursive or active-cache scan")
    parser.add_argument("--finalize", type=Path, help="original launcher's scratch, after its model child has closed")
    parser.add_argument("--receipt", type=Path)
    parser.add_argument("--queue-dir", type=Path, help="original ops queue; failure only, never an ordinary success wake")
    args = parser.parse_args()
    if args.finalize:
        if not args.store:
            parser.error("host finalization requires its trusted caller's explicit --store")
        try:
            result = finalize(args.finalize, args.store)
            code = 0
        except (OSError, ValueError, TypeError) as error:
            result = {"schema": "frozen-host-finalization-v1", "status": "retained", "scratch": str(args.finalize),
                      "error": str(error), "models_started": 0, "permissions_changed": False}
            code = 1
        if args.receipt:
            write_receipt(args.receipt, result)
        if code and args.queue_dir:
            args.queue_dir.mkdir(parents=True, exist_ok=True)
            name = f"{time.time_ns()}-frozen-storage-attention.md"
            temporary = args.queue_dir / ("." + name)
            temporary.write_text(f"冻结文件归并未完成，原字节和模型结果保留，不重跑模型。原件 {args.receipt}；scratch {args.finalize}。\n")
            os.replace(temporary, args.queue_dir / name)
        print(json.dumps(result, ensure_ascii=False))
        return code
    if not args.store or not args.file:
        parser.error("--store and --file are required for explicit owner-finished files")
    store = Store(args.store)
    records = [{"path": str(path), "content": store.seal(path)} for path in args.file]
    print(json.dumps({"schema": "frozen-content-manifest-v1", "files": records}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
