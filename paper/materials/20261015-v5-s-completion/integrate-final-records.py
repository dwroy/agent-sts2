"""Integrate only this goal's records, preserving working bytes and all concurrent records."""
from datetime import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[3]
BASE = Path(__file__).resolve().parent
OUT = BASE / "on-RQCHNN0W72KF"


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def run(argv, *, env=None, data=None):
    result = subprocess.run(argv, cwd=ROOT, env=env, input=data, capture_output=True)
    assert result.returncode == 0, (argv, result.returncode, result.stderr.decode(errors="replace"))
    return result.stdout


def main():
    assert run(["git", "branch", "--show-current"]).strip() == b"main"
    run(["git", "diff", "--cached", "--quiet"])
    parent = run(["git", "rev-parse", "HEAD"]).decode().strip()
    root_index = ROOT / ".git/index"
    original_index = root_index.read_bytes()
    stage = Path(tempfile.mkdtemp(prefix="v5-s-final-records-", dir="/tmp"))
    entries = {}
    for path in BASE.rglob("*"):
        if path.is_file() and "__pycache__" not in path.parts:
            assert not path.is_symlink()
            entries[str(path.relative_to(ROOT))] = path.read_bytes()
    plan = ROOT / "docs/v5-s-decision-plan.md"
    entries[str(plan.relative_to(ROOT))] = plan.read_bytes()
    appends = json.loads((OUT / "completion-record-appends.json").read_bytes())["appends"]
    working = {}
    for name, text in appends.items():
        working[name] = sha((ROOT / name).read_bytes())
        assert (ROOT / name).read_text().count(text) == 1
        committed = run(["git", "show", parent + ":" + name])
        assert text.encode() not in committed
        entries[name] = committed + text.encode()
    for name, raw in entries.items():
        path = stage / "files" / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(raw)
    scan = subprocess.run(["gitleaks", "dir", str(stage / "files"), "--redact", "--no-banner",
                           "--report-format", "json", "--report-path", str(stage / "gitleaks.json")],
                          capture_output=True)
    (stage / "gitleaks.log").write_bytes(scan.stdout + scan.stderr)
    assert scan.returncode == 0, "redacted secret scan failed; original report retained in staging directory"
    source_manifest = {name: sha(raw) for name, raw in entries.items()}
    (stage / "sources.json").write_text(json.dumps(source_manifest, indent=2) + "\n")
    env = {**os.environ, "GIT_INDEX_FILE": str(stage / "index")}
    run(["git", "read-tree", parent], env=env)
    index_rows = []
    for name, raw in entries.items():
        blob = run(["git", "hash-object", "-w", "--stdin"], data=raw).strip()
        old = run(["git", "ls-tree", parent, "--", name])
        mode = old.split(b" ", 1)[0] if old else b"100644"
        index_rows.append(mode + b" " + blob + b"\t" + name.encode() + b"\0")
    run(["git", "update-index", "-z", "--index-info"], env=env, data=b"".join(index_rows))
    tree = run(["git", "write-tree"], env=env).decode().strip()
    changed = run(["git", "diff-tree", "--no-commit-id", "--name-only", "-r", parent, tree]).decode().splitlines()
    assert changed and all(name in entries for name in changed)
    assert not any(name.startswith(("agent/", "learner/", "eval/", "knowledge/")) for name in changed)
    message = stage / "message.txt"
    message.write_text("docs: complete V5-S natural on-run acceptance and evaluation\n\n"
                       "Record two natural shadow gates, separate R359/R360 publication, and the complete RQ on-run account/consumer/timing audit. Preserve failures and wider-parent boundaries.\n\n"
                       "Co-Authored-By: Codex gpt-6.1-sol <noreply@openai.com>\n")
    run(["/home/dw/.git-hooks/prepare-commit-msg", str(message), "message"], env=env)
    assert b"Agent:" in message.read_bytes()
    commit = run(["git", "commit-tree", tree, "-p", parent, "-F", str(message)], env=env).decode().strip()
    # The original index lock excludes concurrent index writers. CAS excludes ref races.
    lock = ROOT / ".git/index.lock"
    descriptor = os.open(lock, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o666)
    published = False
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write((stage / "index").read_bytes())
            handle.flush()
            os.fsync(handle.fileno())
        assert root_index.read_bytes() == original_index
        assert run(["git", "rev-parse", "HEAD"]).decode().strip() == parent
        for name, expected in source_manifest.items():
            if name not in appends:
                assert sha((ROOT / name).read_bytes()) == expected, name
        assert all(sha((ROOT / name).read_bytes()) == expected for name, expected in working.items())
        run(["git", "update-ref", "-m", "V5-S scoped final record integration", "refs/heads/main", commit, parent])
        published = True
        os.replace(lock, root_index)
    finally:
        if not published:
            lock.unlink(missing_ok=True)
    run(["git", "diff", "--cached", "--quiet"])
    assert all(sha((ROOT / name).read_bytes()) == expected for name, expected in working.items())
    assert all(sha((ROOT / name).read_bytes()) == expected for name, expected in source_manifest.items() if name not in appends)
    receipt = {"at": datetime.now().astimezone().isoformat(), "parent": parent, "commit": commit, "tree": tree,
               "changed_paths": changed, "files": len(changed), "stage": str(stage),
               "gitleaks_rc": 0, "original_index_clean": True, "final_index_clean": True,
               "shared_working_file_bytes_preserved": working, "working_files_not_rewritten": True,
               "parallel_dirty_not_committed": True, "no_reset_abort_checkout_or_add_all": True,
               "no_production_code_or_live_change": True, "pushed": False,
               "message": message.read_text(), "input_manifest_sha256": sha((stage / "sources.json").read_bytes())}
    with (OUT / "main-records-integration.json").open("x") as handle:
        handle.write(json.dumps(receipt, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: receipt[k] for k in ["commit", "tree", "files", "gitleaks_rc", "final_index_clean", "pushed"]}))


if __name__ == "__main__":
    main()
