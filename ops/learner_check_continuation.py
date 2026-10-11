"""Bounded, hash-pinned host supplements for the existing learner-recheck action.

The caller holds the batch check lock. This module owns the live lock and never
rewrites a completion, a full-check result, or Git history. See the fixed tests
for the manifest format; no manifest field is interpreted as a command.
"""
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time

BATCH = re.compile(r"[0-9]{8}-[0-9]{6}-(?:experience-update|fix-batch|strategy-proposal|s2-strategy-proposal)")
SHA = re.compile(r"[0-9a-f]{40}")
DIGEST = re.compile(r"[0-9a-f]{64}")
TEST = re.compile(r"tests/[a-z0-9][a-z0-9_-]*\.test\.ts")
ANSI = re.compile(r"\x1b\[[0-9;]*m")
# A passed file may be revisited only when its test or a mapped dependency changed.
DEPENDENCIES = {
    "tests/ops-codex.test.ts": ["ops/codex/lib.ts", "ops/codex-ops-actions.sh", "ops/codex-ops-do.sh", "ops/git-push-main.py"],
    "tests/brain-codex-session.test.ts": ["agent/src/brain/engines/codex-session.ts", "agent/src/core/config.ts"],
    "tests/quantitative.test.ts": ["agent/src/sim/quantitative-stats.ts", "agent/src/sim/quantitative-facts.ts",
                                   "agent/src/sim/quantitative-calibration.ts", "agent/tools/quantitative.ts"],
    "tests/strategy-implementation.test.ts": ["ops/strategy_implementation_jobs.py", "ops/strategy_research_jobs.py"],
}
SOURCE_PATHS = ["agent/src", "agent/tests", "agent/tools", "agent/package*.json", "agent/tsconfig*.json",
                "agent/vitest*", "ops/*.py", "ops/*.sh", "ops/tests", "ops/codex", "learner/*.py",
                "learner/*.ts", "learner/lib", "learner/tasks", "eval/*.py", "eval/*.ts", "knowledge/builders"]


def require(condition, message):
    if not condition:
        raise ValueError(message)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def read_fixed(path, parent, limit=32 * 1024 * 1024):
    path, parent = Path(path), Path(parent).resolve()
    require(path.resolve().is_relative_to(parent) and not path.is_symlink(), "path escapes its registered directory")
    require(path.is_file() and path.stat().st_size <= limit, "missing or oversized input")
    return path.read_bytes()


def git(live, *args):
    result = subprocess.run(["git", "-C", str(live), *args], capture_output=True, text=True, timeout=30)
    require(result.returncode == 0, "Git identity check failed")
    return result.stdout.strip()


def coverage(raw):
    """Preserve observed coverage even when a timeout omitted the summary."""
    text = ANSI.sub("", raw.decode("utf8", errors="replace"))
    passed, failed, skipped = set(), set(), set()
    for mark, name in re.findall(r"^\s*([✓✔❯×✗↓-])\s+(tests/[a-z0-9_-]+\.test\.ts)\s+\(", text, re.M):
        (passed if mark in "✓✔" else skipped if mark in "↓-" else failed).add(name)
    failed_tests = {}
    for name, title in re.findall(r"^\s*FAIL\s+(tests/[a-z0-9_-]+\.test\.ts)(?:\s+>\s+([^\n]+))?", text, re.M):
        failed.add(name)
        if title:
            failed_tests.setdefault(name, []).append(" ".join(title.strip().split(" > ")))
    summary = {}
    for label, body in re.findall(r"^\s*(Test Files|Tests)\s+([^\n]+)", text, re.M):
        summary["files" if label == "Test Files" else "tests"] = {status: int(count) for count, status in re.findall(r"(\d+) (passed|failed|skipped)", body)}
    return {"passed": sorted(passed - failed), "failed": sorted(failed), "skipped": sorted(skipped), "summary": summary,
            "failed_tests": {key: sorted(set(value)) for key, value in sorted(failed_tests.items())}}


def validate(batch_id, batch, root, out_dir, manifest_sha):
    require(BATCH.fullmatch(batch_id) and DIGEST.fullmatch(manifest_sha), "invalid batch or manifest SHA")
    require(batch.get("state") in ("done", "failed", "lost"), "original owner is still active")
    root, out_dir = Path(root).resolve(), Path(out_dir).resolve()
    raw = read_fixed(out_dir / f"{batch_id}.continuation-{manifest_sha}.json", out_dir, 1024 * 1024)
    require(digest(raw) == manifest_sha, "manifest SHA mismatch")
    manifest = json.loads(raw)
    require(set(manifest) == {"schema", "batch", "task", "worktree", "original", "live", "sources", "inputs", "selection", "receipts"}, "unknown manifest fields")
    require(manifest["schema"] == 1 and manifest["batch"] == batch_id and manifest["task"] == batch.get("task")
            and manifest["worktree"] == batch.get("worktree"), "original caller identity mismatch")
    owner = Path(manifest["worktree"])
    require(owner.resolve().parent == root / ".worktrees" and owner.is_dir(), "unregistered owner directory")
    original = manifest["original"]
    require(set(original) == {"merged", "tree", "log_sha256", "coverage"}, "invalid original receipt")
    require(all(isinstance(original[key], str) and SHA.fullmatch(original[key]) for key in ("merged", "tree")), "invalid original source/tree")
    history = [batch.get("checks", {})] + batch.get("fallback_checks", [])
    registered = [entry for entry in history if isinstance(entry, dict)
                  and entry.get("merged") == original["merged"] and entry.get("tree") == original["tree"]]
    require(registered and len({entry.get("log") for entry in registered}) == 1, "original full check is not registered")
    log = Path(registered[0]["log"])
    require(log.parent.resolve() == out_dir and log.name.startswith(batch_id + ".") and log.name.endswith(".checks.log"), "invalid original log path")
    log_raw = read_fixed(log, out_dir)
    require(digest(log_raw) == original["log_sha256"], "original log SHA mismatch")
    observed = coverage(log_raw)
    require(observed == original["coverage"] and (observed["passed"] or observed["failed"]), "original coverage mismatch or unreadable")
    live = root / ".worktrees/live"
    pin = manifest["live"]
    require(set(pin) == {"commit", "tree"} and all(isinstance(v, str) and SHA.fullmatch(v) for v in pin.values()), "invalid current source/tree")
    require(git(live, "rev-parse", "HEAD", "HEAD^{tree}").splitlines() == [pin["commit"], pin["tree"]], "stale live source/tree")
    require(git(live, "rev-parse", original["merged"] + "^{tree}") == original["tree"], "original tree mismatch")
    require(not git(live, "status", "--porcelain", "--untracked-files=all", "--", *SOURCE_PATHS), "live validation inputs are dirty")
    sources = manifest["sources"]
    require(isinstance(sources, list) and 1 <= len(sources) <= 32
            and all(isinstance(source, str) and SHA.fullmatch(source) for source in sources), "invalid source commits")
    required = {source for entry in registered for source in entry.get("commits", [])}
    require(required.issubset(sources), "missing original source identity")
    for source in sources:
        git(live, "merge-base", "--is-ancestor", source, pin["commit"])
    changed = set(git(live, "diff", "--name-only", original["merged"], pin["commit"], "--").splitlines())
    selection = manifest["selection"]
    require(isinstance(selection, list) and 1 <= len(selection) <= 16, "invalid selection count")
    seen = set()
    required_inputs = set()
    for item in selection:
        require(isinstance(item, dict) and set(item) == {"file", "tests", "reason"}, "unknown selection fields")
        name, tests, reason = item["file"], item["tests"], item["reason"]
        require(isinstance(name, str) and TEST.fullmatch(name) and name not in seen, "invalid or repeated test path")
        seen.add(name)
        require(isinstance(tests, list) and len(tests) <= 32 and all(isinstance(t, str) and 0 < len(t) <= 500
                and not any(ord(c) < 32 for c in t) for t in tests) and len(set(tests)) == len(tests), "invalid exact test names")
        git(live, "ls-files", "--error-unmatch", "agent/" + name)
        read_fixed(live / "agent" / name, live / "agent/tests", 2 * 1024 * 1024)
        affected = bool(changed.intersection(["agent/" + name, *DEPENDENCIES.get(name, [])]))
        required_inputs.add("agent/" + name)
        required_inputs.update(changed.intersection(DEPENDENCIES.get(name, [])))
        if reason == "failed":
            require(name in observed["failed"], "test did not fail in the original log")
            # Exact names avoid rerunning successful cases in a partially failed file.
            failures = observed["failed_tests"].get(name, [])
            require(not failures or (tests and set(tests).issubset(failures)), "failed selection includes previously passed tests")
        elif reason == "unrun":
            require(name not in observed["passed"] + observed["failed"] + observed["skipped"], "test was already run or intentionally skipped")
            listed = len(observed["passed"]) + len(observed["failed"]) + len(observed["skipped"])
            summary = observed["summary"].get("files")
            require((summary and sum(summary.values()) == listed)
                    or (not summary and registered[0].get("rc") == 124), "original log cannot prove the file was unrun")
        else:
            require(reason == "affected" and affected, "no changed test or mapped dependency")
    # An ancestor alone can contain a subsequently reverted fix. Require the
    # selected inputs to match the declared source snapshots byte for byte.
    inputs = manifest["inputs"]
    require(isinstance(inputs, list) and len(inputs) == len(required_inputs), "missing exact source snapshots")
    seen_inputs = set()
    for item in inputs:
        require(isinstance(item, dict) and set(item) == {"path", "source"} and item["path"] in required_inputs
                and item["path"] not in seen_inputs and item["source"] in sources, "invalid source snapshot")
        seen_inputs.add(item["path"])
        require(git(live, "rev-parse", "--verify", item["source"] + ":" + item["path"])
                == git(live, "rev-parse", "--verify", pin["commit"] + ":" + item["path"]), "registered source was changed or reverted")
    receipts = manifest["receipts"]
    require(isinstance(receipts, list) and len(receipts) <= 16, "invalid supplementary evidence")
    for receipt in receipts:
        require(isinstance(receipt, dict) and set(receipt) == {"path", "sha256"}, "invalid evidence receipt")
        path = Path(receipt["path"])
        require(not path.is_absolute() and ".." not in path.parts and str(path).startswith("paper/materials/")
                and path.suffix in (".json", ".md", ".log", ".txt"), "invalid evidence path")
        require(digest(read_fixed(root / path, root / "paper/materials")) == receipt["sha256"], "evidence SHA mismatch")
    return manifest, str(log)


def save_receipt(path, receipt):
    temporary = path.with_name(path.name + ".partial")
    with temporary.open("w", encoding="utf8") as handle:
        json.dump(receipt, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        handle.flush()
        os.fsync(handle.fileno())
    os.replace(temporary, path)


def run(batch_id, batch, root, out_dir, manifest_sha, enqueue, inbox):
    """Run only selected fixed Vitest inputs; return a separate scoped receipt."""
    try:
        require(isinstance(batch_id, str) and BATCH.fullmatch(batch_id)
                and isinstance(manifest_sha, str) and DIGEST.fullmatch(manifest_sha), "invalid continuation request")
        with open(Path(root, "ops/live-merge.lock"), "a", encoding="utf8") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            manifest, original_log = validate(batch_id, batch, root, out_dir, manifest_sha)
            stem = Path(out_dir, f"{batch_id}.supplement-{manifest_sha}")
            receipt_path = stem.with_name(stem.name + ".json")
            history = batch.setdefault("check_supplements", [])
            if receipt_path.exists():
                previous = json.loads(read_fixed(receipt_path, out_dir, 4 * 1024 * 1024))
                require(previous.get("manifest_sha256") == manifest_sha and previous.get("state") == "completed", "continuation already claimed; preserve incomplete receipt")
                if previous not in history:
                    history.append(previous)
                return previous["rc"]
            for previous in history:
                if previous.get("live") != manifest["live"]:
                    continue
                for old in previous.get("selection", []):
                    if not any(result.get("name") == old["file"] and result.get("status") == "passed"
                               for result in previous.get("results", [])):
                        continue
                    for item in manifest["selection"]:
                        if item["file"] == old["file"]:
                            require(old["tests"] and item["tests"] and not set(old["tests"]).intersection(item["tests"]),
                                    "selection repeats a passed supplement on this tree")
            receipt = {"manifest_sha256": manifest_sha, "batch": batch_id, "state": "running", "environment": "host",
                       "scope": "selected tests only", "full_suite": False, "live": manifest["live"],
                       "original": manifest["original"], "original_log": original_log, "sources": manifest["sources"], "inputs": manifest["inputs"],
                       "selection": manifest["selection"], "evidence": manifest["receipts"], "results": []}
            # Exclusive creation leaves an interrupted owner's claim visible; it never starts a second runner.
            with receipt_path.open("x", encoding="utf8") as handle:
                json.dump(receipt, handle, ensure_ascii=False, indent=2)
            log_path = stem.with_name(stem.name + ".log")
            live = Path(root, ".worktrees/live")
            node = str(Path.home() / ".local/node/bin/node")
            commands = [("tsc", ["nice", "-n", "19", node, "node_modules/typescript/bin/tsc", "-p", "tsconfig.json", "--noEmit"], None)]
            for index, item in enumerate(manifest["selection"]):
                result_path = stem.with_name(stem.name + f".{index}.vitest.json")
                argv = ["nice", "-n", "19", node, "node_modules/vitest/vitest.mjs", "run", item["file"],
                        "--pool=forks", "--maxWorkers=1", "--reporter=default", "--reporter=json", "--outputFile=" + str(result_path)]
                if item["tests"]:
                    argv += ["--testNamePattern", "^(?:" + "|".join(re.escape(name) for name in item["tests"]) + ")$"]
                commands.append((item["file"], argv, result_path))
            with log_path.open("x", encoding="utf8") as log:
                deadline = time.monotonic() + 3600
                for name, argv, result_path in commands:
                    code, status = 1, "failed"
                    process_code, report_metadata = None, {}
                    try:
                        result = subprocess.run(argv, cwd=live / "agent", stdout=log, stderr=subprocess.STDOUT,
                                                timeout=max(0.001, deadline - time.monotonic()))
                        code = result.returncode
                        process_code = code
                        status = "passed" if code == 0 else "failed"
                        if result_path is not None:
                            result_raw = read_fixed(result_path, out_dir)
                            data = json.loads(result_raw)
                            report_metadata = {"report_sha256": digest(result_raw), "counts": {
                                key: data.get(key) for key in ("numTotalTests", "numPassedTests", "numFailedTests", "numPendingTests")}}
                            item = next(item for item in manifest["selection"] if item["file"] == name)
                            assertions = [a for entry in data.get("testResults", []) for a in entry.get("assertionResults", [])]
                            executed = {a.get("fullName") for a in assertions if a.get("status") in ("passed", "failed")}
                            require(data.get("numTotalTests", 0) > 0 and executed
                                    and (not item["tests"] or executed == set(item["tests"])), "selected tests did not execute")
                            if code and re.search(r"(?:listen|spawn)[^\n]{0,100}EPERM", json.dumps(data)):
                                status = "environment-limited"
                    except subprocess.TimeoutExpired:
                        code, status = 124, "timeout"
                        log.write("\nContinuation command timed out; original coverage retained.\n")
                    except (OSError, ValueError, TypeError) as error:
                        code, status = 2, "unverified"
                        log.write(f"\n{type(error).__name__}: {error}\n")
                    receipt["results"].append({"name": name, "rc": code, "process_rc": process_code, "status": status, **report_metadata,
                                               **({"report": str(result_path)} if result_path else {})})
                    # Retain completed segments even if the caller disappears before the next command.
                    save_receipt(receipt_path, receipt)
                    if status in ("timeout", "unverified", "environment-limited"):
                        break
            if (git(live, "rev-parse", "HEAD", "HEAD^{tree}").splitlines() != [manifest["live"]["commit"], manifest["live"]["tree"]]
                    or git(live, "status", "--porcelain", "--untracked-files=all", "--", *SOURCE_PATHS)):
                receipt["results"].append({"name": "source-verification", "rc": 2, "status": "source-drift"})
            receipt.update(state="completed", rc=next((r["rc"] for r in receipt["results"] if r["rc"]), 0),
                           log=str(log_path), log_sha256=digest(log_path.read_bytes()))
            save_receipt(receipt_path, receipt)
            history.append(receipt)
            message = (f"批次 {batch_id} 宿主定向补验 exit {receipt['rc']}；精确树 {manifest['live']['tree']}；"
                       f"仅覆盖所选测试，非完整套件通过；原失败/超时及覆盖保留，不自动回退。补充回执 {receipt_path}。")
            if receipt["rc"]:
                inbox(message)
            enqueue("learner-checks", message)
            return receipt["rc"]
    except (OSError, ValueError, TypeError, KeyError, AttributeError, subprocess.SubprocessError) as error:
        # Validation never falls back to an expensive full run.
        print(f"定向补验拒绝：{error}")
        return 2
