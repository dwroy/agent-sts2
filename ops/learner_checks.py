"""Completion events and full post-merge checks, called by the scheduler outside the learner sandbox."""
import fcntl
import json
import os
import re
import subprocess

FULL_CHECK_COMMAND = 'export PATH="$HOME/.local/node/bin:$PATH"; nice -n 19 npx tsc -p tsconfig.json --noEmit; a=$?; nice -n 19 npx vitest run --maxWorkers=2; b=$?; [ "$a" = 0 ] && [ "$b" = 0 ]'


def read_report(path):
    try:
        text = open(path, encoding="utf8").read()
    except OSError:
        return {}
    for block in reversed(re.findall(r"```json\s*([\s\S]*?)```", text)):
        try:
            report = json.loads(block)
        except ValueError:
            continue
        if isinstance(report, dict) and report.get("task") in ("experience-update", "fix-batch", "strategy-proposal"):
            return report
    return {}


def finish_write_batch(batch_id, batch, rc, root, out_dir, enqueue, inbox):
    report = read_report(os.path.join(out_dir, batch_id + ".out"))
    merged = report.get("merged")
    live = os.path.join(root, ".worktrees", "live")
    verified = False
    if isinstance(merged, str) and re.fullmatch(r"[0-9a-f]{7,40}", merged):
        verified = subprocess.run(["git", "-C", live, "merge-base", "--is-ancestor", merged, "HEAD"],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    task = batch["task"]
    batch.update(state="done" if rc == 0 and verified else "failed", rc=rc, merged=merged if verified else None)
    enqueue({"experience-update": "experience-done", "strategy-proposal": "strategy-done"}.get(task, "fix-done"),
            f"{task} 批次 {batch_id} 结束：exit {rc}；已核实合入 live：{merged if verified else '无'}。"
            f"回报：{out_dir}/{batch_id}.out。学习者自测后自行合入，无需另设审核；未合入时查回报，提交受阻由运维兜底。")
    if not verified:
        return
    # Pin the checked tree under the same lock as live merges and knowledge refresh commits.
    # No rollback here: ops decides whether to roll back or dispatch a fix on failure.
    log = os.path.join(out_dir, batch_id + ".checks.log")
    command = FULL_CHECK_COMMAND
    with open(log, "w", encoding="utf8") as handle:
        try:
            checks = subprocess.run(["flock", os.path.join(root, "ops", "live-merge.lock"), "bash", "-c", command],
                                    cwd=os.path.join(live, "agent"), stdout=handle, stderr=subprocess.STDOUT, timeout=3600)
            code = checks.returncode
        except (OSError, subprocess.TimeoutExpired) as error:
            handle.write(f"{type(error).__name__}: {error}\n")
            code = 124 if isinstance(error, subprocess.TimeoutExpired) else 1
    batch["checks"] = {"rc": code, "log": log, "merged": merged}
    message = f"批次 {batch_id} 合入 {merged} 后，沙箱外完整 tsc + vitest exit {code}；日志 {log}。"
    if code:
        message += "运维会话决定回滚还是派修复，不自动回滚。"
        inbox(message)
    enqueue("learner-checks", message)


def recheck_write_batch(batch_id, batch, root, out_dir, enqueue, inbox):
    """Verify fallback merges and check their pinned live tree without rewriting the original completion."""
    report = read_report(os.path.join(out_dir, batch_id + ".out"))
    if report.get("task") != batch.get("task"):
        return 2
    # Every reported source must be present; a merged=null report alone proves nothing.
    commits = [report["commit"]] if report.get("commit") else []
    fixes = report.get("fixes", [])
    if not isinstance(fixes, list) or any(not isinstance(fix, dict) or not fix.get("commit") for fix in fixes):
        return 2
    commits.extend(fix["commit"] for fix in fixes)
    if report.get("merged"):
        commits.append(report["merged"])
    if not commits or any(not isinstance(commit, str) or not re.fullmatch(r"[0-9a-f]{7,40}", commit) for commit in commits):
        return 2
    live = os.path.join(root, ".worktrees", "live")
    with open(os.path.join(root, "ops", "live-merge.lock"), "a", encoding="utf8") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        for commit in set(commits):
            if subprocess.run(["git", "-C", live, "merge-base", "--is-ancestor", commit, "HEAD"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode:
                return 2
        pinned = subprocess.run(["git", "-C", live, "rev-parse", "HEAD", "HEAD^{tree}"], capture_output=True, text=True)
        lines = pinned.stdout.splitlines()
        if pinned.returncode or len(lines) != 2 or any(not re.fullmatch(r"[0-9a-f]{40}", line) for line in lines):
            return 2
        merged, tree = lines
        history = batch.setdefault("fallback_checks", [])
        previous = next((check for check in history if check["tree"] == tree), None)
        if previous:
            return previous["rc"]
        original = batch.get("checks")
        if original and original.get("merged") == merged:
            return original["rc"]
        log = os.path.join(out_dir, batch_id + f".fallback-{tree}.checks.log")
        with open(log, "w", encoding="utf8") as handle:
            try:
                # The Python caller owns the live lock through verification, execution and result recording.
                result = subprocess.run(["bash", "-c", FULL_CHECK_COMMAND], cwd=os.path.join(live, "agent"),
                                        stdout=handle, stderr=subprocess.STDOUT, timeout=3600)
                code = result.returncode
            except (OSError, subprocess.TimeoutExpired) as error:
                handle.write(f"{type(error).__name__}: {error}\n")
                code = 124 if isinstance(error, subprocess.TimeoutExpired) else 1
        history.append({"rc": code, "log": log, "merged": merged, "tree": tree, "commits": commits})
        message = f"批次 {batch_id} 已核实兜底合入 live {merged}，树 {tree}；沙箱外完整 tsc + vitest exit {code}；日志 {log}。"
        if code:
            message += "运维会话决定回滚还是派修复，不自动回滚。"
            inbox(message)
        enqueue("learner-checks", message)
        return code
