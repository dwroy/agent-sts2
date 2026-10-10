"""Push one explicitly requested main commit through the host's Windows SSH."""
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "git@github.com:dwroy/agent-sts2.git"
SSH = "/mnt/c/Windows/System32/OpenSSH/ssh.exe"


def push_main(root, expected, run=subprocess.run):
    if not re.fullmatch(r"[0-9a-f]{40}", expected):
        raise ValueError("git-push-main requires a full commit SHA")
    env = dict(os.environ, GIT_SSH_COMMAND=f"{shlex.quote(SSH)} -o BatchMode=yes -o ConnectTimeout=20")

    def git(*args):
        result = run(["git", "-C", str(root), *args], env=env, capture_output=True, text=True, timeout=240)
        if result.returncode:
            raise RuntimeError(f"git {args[0]} failed (exit {result.returncode}): {result.stderr.strip()}")
        return result.stdout.strip()

    if git("rev-parse", "refs/heads/main") != expected:
        raise ValueError("main moved; inspect the new commit before pushing")
    urls = git("remote", "get-url", "--push", "--all", "origin").splitlines()
    if urls != [ORIGIN]:
        raise ValueError("origin is not the approved project SSH destination")
    # An explicit source SHA prevents a concurrent local update from changing the push.
    git("push", "--porcelain", "origin", f"{expected}:refs/heads/main")
    remote = git("ls-remote", "--exit-code", "origin", "refs/heads/main").split()
    if remote != [expected, "refs/heads/main"]:
        raise RuntimeError("remote main verification did not match the requested commit")
    return {"commit": expected, "remote": "origin", "ref": "refs/heads/main", "verified": True}


if __name__ == "__main__":
    import json
    try:
        if len(sys.argv) != 2:
            raise ValueError("usage: git-push-main.py <main-commit-sha>")
        print(json.dumps(push_main(ROOT, sys.argv[1]), sort_keys=True))
    except (ValueError, RuntimeError, OSError, subprocess.SubprocessError) as error:
        print(json.dumps({"verified": False, "error": str(error)}, sort_keys=True))
        sys.exit(1)
