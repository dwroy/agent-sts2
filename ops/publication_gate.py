"""Publication-only game admission and short, nonblocking publication transactions.

Lock order: learn -> game admission -> knowledge refresh -> live merge. Never
wait for a game or another lock while holding any of these locks.
"""
import argparse
from contextlib import contextmanager, ExitStack
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import uuid

MARKER = "PUBLICATION_ADMISSION.json"
GLOBAL = ("PAUSE", "ACCOUNT_DRAIN", "LLM_DRAIN")


def birth(pid):
    try:
        fields = Path(f"/proc/{int(pid)}/stat").read_text().rsplit(")", 1)[1].split()
        return fields[19] if fields[0] not in ("Z", "X") else None
    except (OSError, ValueError, IndexError, TypeError):
        return None


def directory(root, state_dir=None):
    return Path(state_dir or os.environ.get("CODEX_OPS_DIR") or Path(root, "ops/codex-ops"))


def present(path):
    # Dangling or malformed markers also hold admission.
    return os.path.lexists(path)


def global_hold(state_dir):
    return any(present(Path(state_dir, name)) for name in GLOBAL)


def read(root, state_dir=None):
    path = directory(root, state_dir) / MARKER
    if not present(path):
        return None
    try:
        if path.is_symlink():
            raise ValueError("symlink marker")
        value = json.loads(path.read_text())
        if (value.get("schema") != "publication-admission-v1" or value.get("root") != str(Path(root).resolve())
                or value.get("scope") != "next-game" or value.get("phase") not in ("waiting", "publishing")
                or not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,119}", str(value.get("owner")))
                or type(value.get("pid")) is not int or value["pid"] <= 0
                or not re.fullmatch(r"[0-9]+", str(value.get("pid_birth")))
                or not re.fullmatch(r"[0-9a-f]{32}", str(value.get("token")))
                or not re.fullmatch(r"[0-9a-f]{32}", str(value.get("fixed_method_transaction", value.get("token"))))
                or type(value.get("fixed_methods_required", False)) is not bool
                or value.get('fixed_method_contract') not in (None, 'fixed-method-publication-v1')):
            raise ValueError("invalid marker")
        value["owner_alive"] = birth(value["pid"]) == value["pid_birth"]
        return value
    except (OSError, ValueError, AttributeError, TypeError):
        return {"phase": "unknown", "owner_alive": False}


def candidates_only(root, state_dir=None):
    return read(root, state_dir) is not None


def learners_held(root, state_dir=None):
    dest = directory(root, state_dir)
    marker = read(root, dest)
    return global_hold(dest) or bool(marker and (marker["phase"] != "waiting" or not marker["owner_alive"]))


@contextmanager
def locks(paths):
    with ExitStack() as stack:
        for path in paths:
            Path(path).parent.mkdir(parents=True, exist_ok=True)
            handle = stack.enter_context(open(path, "a"))
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield


@contextmanager
def source_locks(root):
    # Schedulers/writers own learn; durably registered readers own their batch barrier.
    # The pair never waits, and no caller acquires learn while holding these locks.
    with locks([Path(root, "ops/knowledge-refresh.lock"), Path(root, "ops/live-merge.lock")]):
        yield


def save(path, value):
    temporary = path.with_name(path.name + "." + uuid.uuid4().hex)
    try:
        with temporary.open("x") as handle:
            json.dump(value, handle, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def owned(root, dest, owner, token, pid):
    value = read(root, dest)
    if (not value or value.get("owner") != owner or value.get("token") != token
            or value.get("pid") != pid or not value.get("owner_alive")):
        raise ValueError("publication ownership changed or owner unavailable")
    value.pop("owner_alive")
    return value


def begin(root, dest, owner, pid):
    if not re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,119}", owner) or birth(pid) is None:
        raise ValueError("invalid publication owner")
    with locks([dest / "learn.lock", dest / "game-admission.lock"]):
        if present(dest / MARKER):
            raise ValueError("publication marker already exists; preserve original owner")
        value = {"schema": "publication-admission-v1", "root": str(Path(root).resolve()),
                 "owner": owner, "pid": pid, "pid_birth": birth(pid), "token": uuid.uuid4().hex,
                 "scope": "next-game", "phase": "waiting", "fixed_method_contract": "fixed-method-publication-v1"}
        save(dest / MARKER, value)
        return value


def admit_game(root, dest, pid):
    # This reservation closes the check/start race, including run.sh setup before exec.
    with locks([dest / "game-admission.lock"]):
        if global_hold(dest) or present(dest / MARKER):
            raise ValueError("game admission held")
        started = birth(pid)
        if started is None:
            raise ValueError("game admission owner unavailable")
        (dest / "game-admissions").mkdir(parents=True, exist_ok=True)
        save(dest / "game-admissions" / f"{pid}.json", {"pid": pid, "pid_birth": started})


def active_games(root, dest):
    for path in (dest / "game-admissions").glob("*.json"):
        value = json.loads(path.read_text())
        if birth(value["pid"]) == value["pid_birth"]:
            return True
    return legacy_games(root)


def legacy_games(root, proc=Path("/proc")):
    # Older controllers have no reservation. Unknown ownership remains a hold.
    live = Path(os.environ.get("STS2_LIVE") or Path(root, ".worktrees/live"))
    for path in proc.glob("[0-9]*/cmdline"):
        try:
            argv = path.read_bytes().decode().split("\0")
            if "play" in argv and any("index.ts" in arg or "index.js" in arg for arg in argv):
                try:
                    cwd = (path.parent / "cwd").resolve(strict=True)
                except OSError:
                    return True
                if cwd in ((live / "agent").resolve(), Path(root, "agent").resolve()):
                    return True
        except (OSError, UnicodeError):
            continue
    return False


def release(root, dest, owner, token, pid):
    with locks([dest / "learn.lock", dest / "game-admission.lock"]):
        value = owned(root, dest, owner, token, pid)
        from fixed_method_admission import verify_release
        if value.get('fixed_method_contract'):
            with source_locks(root):
                verify_release(root, dest, value)
                (dest / MARKER).unlink()
        else:
            (dest / MARKER).unlink()  # Existing legacy transactions retain their original release contract.


def recover(root, dest, owner, digest, pid):
    with locks([dest / "learn.lock", dest / "game-admission.lock"]):
        path = dest / MARKER
        if hashlib.sha256(path.read_bytes()).hexdigest() != digest:
            raise ValueError("publication marker replaced")
        value = read(root, dest)
        if not value or value.get("owner") != owner or value.get("owner_alive") or value.get("phase") == "unknown" or birth(pid) is None:
            raise ValueError("original owner not proven retired")
        value.pop("owner_alive")
        value.update(pid=pid, pid_birth=birth(pid), token=uuid.uuid4().hex)
        save(path, value)
        return value


@contextmanager
def writing(root, dest, owner, token, pid, method_ticket=None, resume_methods=False):
    # Acquire everything without waiting, then release learn.lock before actual I/O.
    with ExitStack() as stack:
        with locks([dest / "learn.lock", dest / "game-admission.lock"]):
            value = owned(root, dest, owner, token, pid)
            if global_hold(dest) or active_games(root, dest):
                raise ValueError("publication awaits the original natural terminal boundary")
            stack.enter_context(source_locks(root))
            from learning_runtime import capture
            from fixed_method_admission import producers, start, finish
            chosen = capture(root, dest)
            if chosen.get('enabled') and producers(chosen):
                if not value.get('fixed_method_contract'):
                    raise ValueError('legacy publication retained; finish original transaction before a new method-aware publication')
                stack.enter_context(locks([Path(chosen['directory']) / 'data-publication.lock']))
            value.setdefault('fixed_method_transaction', value['token'])
            saved = start(root, dest, value, method_ticket, resume_methods)
            value['fixed_methods_required'] = value.get('fixed_methods_required', False) or saved is not None
            value["phase"] = "publishing"
            save(dest / MARKER, value)
        yield value
        finish(root, dest, value, saved)
        # Success/failure both retain the marker until explicit verified release.


def candidate_binding(base, tree):
    return {"schema": "candidate-only-v1", "merge": "no", "dispatch_base": base, "worktree": str(tree)}


@contextmanager
def overlay_writing(root, dest):
    with ExitStack() as stack:
        with locks([dest / "learn.lock"]):
            if global_hold(dest) or candidates_only(root, dest):
                raise ValueError("overlay refresh admission held")
            stack.enter_context(source_locks(root))
        yield


def check_learner(root, dest, batch_id, tree, merge):
    if learners_held(root, dest):
        raise ValueError("global or publication write admission held")
    if not candidates_only(root, dest) and not (dest / "learn.json").exists():
        return None
    state = json.loads((dest / "learn.json").read_text())
    batch = state["batches"][batch_id]
    binding = batch.get("candidate_mode")
    if binding is None and not candidates_only(root, dest):
        return None  # Legacy noncandidate work retains its existing policy.
    base = batch.get("external_binding", {}).get("dispatch_base")
    expected = Path(root, ".worktrees", "codex-strategy-silent-" + batch_id.removesuffix("-strategy-proposal"))
    if (not re.fullmatch(r"[0-9]{8}-[0-9]{6}-strategy-proposal", batch_id)
            or not batch.get("external_source") or batch.get("state") != "running"
            or batch.get("task") != "strategy-proposal" or batch.get("character") != "silent"
            or batch.get("reason") != "external" or batch.get("runs") != []
            or not re.fullmatch(r"[0-9a-f]{40}", str(base)) or merge != "no"
            or binding != candidate_binding(base, tree) or Path(tree).resolve() != expected.resolve()
            or Path(batch.get("worktree", "")).resolve() != Path(tree).resolve()):
        raise ValueError("candidate startup binding mismatch")
    if subprocess.check_output(["git", "-C", str(tree), "rev-parse", "HEAD"], text=True).strip() != base:
        raise ValueError("candidate source snapshot changed")
    return binding


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--state-dir", type=Path)
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("begin", "release", "write", "recover"):
        command = sub.add_parser(name)
        command.add_argument("--owner", required=True)
        command.add_argument("--pid", type=int, default=os.getppid())
        if name in ("release", "write"):
            command.add_argument("--token", required=True)
        if name == "recover":
            command.add_argument("--expected-sha256", required=True)
        if name == "write":
            command.add_argument("--fixed-method-admission", type=Path)
            command.add_argument("--resume-fixed-methods", action="store_true")
            command.add_argument("argv", nargs=argparse.REMAINDER)
    sub.add_parser("check-game")
    command = sub.add_parser("admit-game")
    command.add_argument("--pid", type=int, default=os.getppid())
    command = sub.add_parser("check-learner")
    command.add_argument("--batch", required=True)
    command.add_argument("--cwd", required=True)
    command.add_argument("--merge", required=True)
    args = parser.parse_args()
    root, dest = args.root.resolve(), directory(args.root, args.state_dir)
    try:
        if args.command == "begin":
            result = begin(root, dest, args.owner, args.pid)
        elif args.command == "release":
            result = release(root, dest, args.owner, args.token, args.pid)
        elif args.command == "recover":
            result = recover(root, dest, args.owner, args.expected_sha256, args.pid)
        elif args.command == "write":
            argv = args.argv[1:] if args.argv[:1] == ["--"] else args.argv
            if not argv and not args.resume_fixed_methods:
                raise ValueError("publication write requires a command")
            if args.resume_fixed_methods and argv:
                raise ValueError("installed-only recovery must not replay a deployment command")
            with writing(root, dest, args.owner, args.token, args.pid, args.fixed_method_admission, args.resume_fixed_methods):
                if argv:
                    code = subprocess.run(argv, close_fds=True).returncode
                    if code:
                        raise ValueError("deployment command failed; retain original publication and inspect before recovery")
            return 0
        elif args.command == "admit-game":
            # save() needs the reservation directory before its atomic replacement.
            (dest / "game-admissions").mkdir(parents=True, exist_ok=True)
            result = admit_game(root, dest, args.pid)
        elif args.command == "check-game":
            if global_hold(dest) or present(dest / MARKER):
                raise ValueError("game admission held")
            result = None
        else:
            result = check_learner(root, dest, args.batch, args.cwd, args.merge)
        print(json.dumps({"status": "ok", "binding": result}))
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        print(json.dumps({"status": "held", "reason": str(error)}))
        return 75


if __name__ == "__main__":
    sys.exit(main())
