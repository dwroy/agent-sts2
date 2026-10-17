"""One-shot natural-run evidence snapshot; no game action, timer, model or credential reads."""
from pathlib import Path
from datetime import datetime
import hashlib
import json
import mmap
import os
import subprocess
import tarfile

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
CONFIG = HERE / "interface-host-completion-latest-startup.jsonl"
SOURCE = "bca06096b08b1e9bf0e11fda3e1f87fe4d83ec07"
HOME = ROOT / "ops/codex-ops/accounts/codex1/brain"


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def save(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def proc(pid):
    raw = Path(f"/proc/{pid}/stat").read_text()
    fields = raw[raw.rfind(")") + 2:].split()
    return {"pid": pid, "birth": int(fields[19]), "state": fields[0]}


def metadata(path):
    s = path.stat()
    return {"inode": s.st_ino, "size": s.st_size, "mtime_ns": s.st_mtime_ns, "ctime_ns": s.st_ctime_ns}


def main():
    config_raw = CONFIG.read_bytes()
    cfg = json.loads(config_raw)
    run = cfg["run_id"]
    assert run == "FD8NZAHU7SNY" and cfg["character"].lower() == "silent" and cfg["ascension"] == 10
    out = HERE / f"natural-{run}"
    out.mkdir(exist_ok=True)
    assert not (out / "startup-manifest.json").exists(), "never replace a historical startup snapshot"
    assert subprocess.run(["git", "-C", str(ROOT), "merge-base", "--is-ancestor", SOURCE, cfg["code"]["commit"]]).returncode == 0
    (out / "startup-config.jsonl").write_bytes(config_raw)
    started = datetime.fromisoformat(cfg["process"]["started"].replace("Z", "+00:00")).timestamp()
    before = proc(cfg["process"]["pid"])
    assert before["state"] != "Z"
    allowed = {b"BRAIN_ENGINE", b"BRAIN_CODEX_HOME", b"BRAIN_CODEX_MODEL", b"BRAIN_CODEX_EFFORT"}
    env = {}
    # Never serialize the process environment: select only the non-secret binding fields.
    for item in Path(f"/proc/{before['pid']}/environ").read_bytes().split(b"\0"):
        key, sep, value = item.partition(b"=")
        if sep and key in allowed:
            env[key.decode()] = value.decode()
    auth = HOME / "auth.json"
    link = auth.lstat()
    target = auth.resolve()
    st = target.stat()  # Metadata only; authentication contents are never opened.
    binding = {"path": str(auth), "target": str(target), "link_inode": link.st_ino,
               "link_mtime_ns": link.st_mtime_ns, "link_ctime_ns": link.st_ctime_ns,
               "target_inode": st.st_ino, "target_mtime_ns": st.st_mtime_ns, "target_ctime_ns": st.st_ctime_ns}
    old_path = ROOT / "paper/materials/20261015-v5-s-completion/post-on-events/account-2047994-start.json"
    old = json.loads(old_path.read_bytes())
    identity_path = ROOT / "paper/materials/20261015-silent-codex1-next-run/account-preflight.json"
    identity = json.loads(identity_path.read_bytes())
    after = proc(before["pid"])
    account_ok = (before["birth"] == after["birth"] and after["state"] != "Z"
                  and env.get("BRAIN_CODEX_HOME") == str(HOME)
                  and env.get("BRAIN_CODEX_MODEL") == "gpt-6.1-sol" and env.get("BRAIN_CODEX_EFFORT") == "xhigh"
                  and binding == old["auth_link"] and target == Path("/home/dw/.codex1/auth.json")
                  and identity["target_home"] == str(HOME)
                  and identity["target_account"]["identity_sha256"] == "68c5321817bf49b5a2e858b541b710066d179948bde150668e4e315cc438c4f8"
                  and binding["link_ctime_ns"] / 1e9 < started and binding["target_ctime_ns"] / 1e9 < started)
    proof = {"at": datetime.now().astimezone().isoformat(), "run_id": run, **before,
             "environment": env, "brain_home": str(HOME), "auth_link": binding,
             "credentials_not_read": True, "process_observed_alive": True,
             "same_verified_account_metadata_as_prior": binding == old["auth_link"],
             "account_binding_verified_now": account_ok,
             "prior_metadata": {"path": str(old_path.relative_to(ROOT)), "sha256": digest(old_path.read_bytes())},
             "identity": {"path": str(identity_path.relative_to(ROOT)), "sha256": digest(identity_path.read_bytes())},
             "full_native_per_call_and_terminal_admission": "pending; configuration is not native-call proof"}
    save(out / "controller-account-start.json", proof)

    rows = []
    window_start = datetime.fromisoformat("2026-10-16T09:28:12+08:00").timestamp()
    window_end = window_start + 761.44
    with tarfile.open(out / "startup-dirty-knowledge.tar.gz", "w:gz", compresslevel=1) as archive:
        for name in cfg["code"]["dirty_files"]:
            if not name.startswith(("knowledge/characters/silent/", "knowledge/common/")):
                continue
            relative = Path(name)
            assert not relative.is_absolute() and ".." not in relative.parts and relative.suffix == ".json"
            path = ROOT / ".worktrees/live" / name
            assert not path.is_symlink() and path.resolve().is_relative_to(ROOT / ".worktrees/live")
            first = metadata(path)
            raw = path.read_bytes()
            original = subprocess.check_output(["git", "-C", str(ROOT), "show", f"{cfg['code']['commit']}:{name}"])
            archive.add(path, arcname=name, recursive=False)
            last = metadata(path)
            rows.append({"path": name, **first, "sha256": digest(raw), "commit_sha256": digest(original),
                         "changed_from_checked_commit": raw != original, "unchanged_during_snapshot": first == last,
                         "observed_inode_predates_startup": max(first["mtime_ns"], first["ctime_ns"]) / 1e9 <= started,
                         "mtime_inside_host_vitest_window": window_start <= first["mtime_ns"] / 1e9 <= window_end})
    with tarfile.open(out / "startup-dirty-knowledge.tar.gz") as archive:
        for row in rows:
            assert digest(archive.extractfile(row["path"]).read()) == row["sha256"]
    save(out / "runtime-input-manifest.json", {"at": datetime.now().astimezone().isoformat(), "run_id": run,
         "files": rows, "archive_sha256": digest((out / "startup-dirty-knowledge.tar.gz").read_bytes()),
         "host_source_check": "canonical815582 rc0; six code leaves verified separately",
         "full_runtime_dirty_tree_checked_or_recalibrated": False,
         "host_input_immutability": "not inferred from source SHA; recorded data mtimes can overlap test window",
         "actual_test_read_times_or_fixed_fixture_consumers": "not inferred from filesystem mtime"})

    bounds = []
    for name in ["decisions.jsonl", "brain.jsonl", "codex-calls.jsonl", "run-config.jsonl", "runs.jsonl"]:
        path = ROOT / "logs" / name
        if not path.exists() or not path.stat().st_size:
            bounds.append({"path": f"logs/{name}", "exists": path.exists(), "lower_bound": 0})
            continue
        with path.open("rb") as handle, mmap.mmap(handle.fileno(), 0, access=mmap.ACCESS_READ) as mm:
            pos = mm.find(run.encode())
            lower = mm.rfind(b"\n", 0, pos) + 1 if pos >= 0 else mm.rfind(b"\n") + 1
            row = {"path": f"logs/{name}", "observed_bytes": len(mm), "lower_bound": lower,
                   "run_string_already_present": pos >= 0, "complete_run_window": False}
            if pos >= 0:
                end = mm.find(b"\n", pos)
                row["first_record_complete"] = end >= 0
                if end >= 0:
                    raw = mm[lower:end + 1]
                    entry = json.loads(raw)
                    row.update(first_record_bytes=len(raw), first_record_sha256=digest(raw),
                               first_record_run_id=entry.get("run_id"), first_record_ts=entry.get("ts"))
            bounds.append(row)
    save(out / "log-start-bounds.json", {"run_id": run, "files": bounds,
         "scope": "lower bounds for later complete-window audit, no game floor polling or terminal claim"})
    save(out / "startup-manifest.json", {"at": datetime.now().astimezone().isoformat(), "run_id": run,
         "startup_ts": cfg["ts"], "startup_code": cfg["code"], "source_commit": SOURCE,
         "configured_model": cfg["brain"]["engines"]["codex"], "account_binding_now_verified": account_ok,
         "source_config_sha256": digest(config_raw), "dirty_knowledge_files": len(rows),
         "script_sha256": digest(Path(__file__).read_bytes()), "native_complete_window": False,
         "natural_interface_consumer": False, "natural_gate": False, "no_timer_model_game_action": True})
    print(json.dumps({"run_id": run, "account_binding_now_verified": account_ok,
                      "dirty_knowledge_files": len(rows), "host_window_data_mtime_overlap": sum(r["mtime_inside_host_vitest_window"] for r in rows),
                      "all_observed_inodes_predate_startup": all(r["observed_inode_predates_startup"] for r in rows),
                      "natural_gate": False}))


if __name__ == "__main__":
    main()
