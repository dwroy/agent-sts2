"""Completion events and full post-merge checks, called by the scheduler outside the learner sandbox."""
import fcntl
import json
import os
import re
import subprocess
import importlib.util


def proposal_tools():
    spec = importlib.util.spec_from_file_location("check_proposals", os.path.join(os.path.dirname(__file__),"proposal_dispatch.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

FULL_CHECK_COMMAND = 'export PATH="$HOME/.local/node/bin:$PATH"; nice -n 19 npx tsc -p tsconfig.json --noEmit; a=$?; nice -n 19 npx vitest run --maxWorkers=2; b=$?; [ "$a" = 0 ] && [ "$b" = 0 ]'

# Compare executable sources and their validation inputs, not refreshed knowledge or ops records.
SOURCE_PATHS = ["agent/src", "agent/tools", "agent/tests", "agent/package*.json", "agent/tsconfig*.json",
                "agent/vitest*", "learner/*.ts", "learner/*.py", "learner/tasks", "ops/*.sh", "ops/*.py",
                "ops/codex", "eval/*.py", "eval/*.ts", "eval/cost-config.json", "knowledge/builders"]


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
        if isinstance(report, dict) and report.get("task") in ("experience-update", "fix-batch", "strategy-proposal", "postmortem", "ascension-audit"):
            return report
    # A report can be the leading JSON object followed by the launcher's summary.
    # Never search prose for braces: embedded examples are not completion reports.
    try:
        report, _ = json.JSONDecoder().raw_decode(text.lstrip())
    except ValueError:
        return {}
    if isinstance(report, dict) and report.get("task") in ("experience-update", "fix-batch", "strategy-proposal"):
        return report
    return {}


def verify_empty_fix(report, batch, root):
    """An empty fix report needs passing checks and Git evidence, not a fabricated merge."""
    tests = report.get("tests")
    base = report.get("base")
    worktree = os.path.join(root, ".worktrees", "codex-dev")
    if (report.get("task") != "fix-batch" or batch.get("task") != "fix-batch"
            or report.get("fixes") != [] or report.get("merged") is not None or report.get("commit")
            or not isinstance(tests, dict)
            or any(type(tests.get(key)) is not int or tests[key] != 0 for key in ("tsc", "vitest"))
            or type(tests.get("cases")) is not int or tests["cases"] <= 0
            or not isinstance(base, str) or not re.fullmatch(r"[0-9a-f]{40}", base)
            or batch.get("worktree") != worktree):
        return None

    def git(path, *args):
        return subprocess.run(["git", "-C", path, *args], capture_output=True, text=True, timeout=10)

    try:
        status = git(worktree, "status", "--porcelain", "--untracked-files=all")
        head = git(worktree, "rev-parse", "HEAD")
        live = git(os.path.join(root, ".worktrees", "live"), "rev-parse", "HEAD")
        if status.returncode or status.stdout.strip() or head.returncode or live.returncode:
            return None
        head, live = head.stdout.strip(), live.stdout.strip()
        if any(not re.fullmatch(r"[0-9a-f]{40}", commit) for commit in (head, live)):
            return None
        # Pin both heads: live can advance while a completion event is being processed.
        if (git(worktree, "merge-base", "--is-ancestor", base, head).returncode
                or git(worktree, "diff", "--quiet", base, head, "--").returncode
                or git(worktree, "diff", "--quiet", head, live, "--", *SOURCE_PATHS).returncode):
            return None
    except (OSError, subprocess.SubprocessError):
        return None
    return {"base": base, "head": head, "live": live}


def finish_write_batch(batch_id, batch, rc, root, out_dir, enqueue, inbox, *, run_checks=True):
    report = read_report(os.path.join(out_dir, batch_id + ".out"))
    merged = report.get("merged")
    live = os.path.join(root, ".worktrees", "live")
    verified = False
    if isinstance(merged, str) and re.fullmatch(r"[0-9a-f]{7,40}", merged):
        verified = subprocess.run(["git", "-C", live, "merge-base", "--is-ancestor", merged, "HEAD"],
                                  stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0
    task = batch["task"]
    proposals = proposal_tools()
    proposal_errors = proposals.links(report,batch,root,os.path.dirname(__file__))
    proposal_errors += proposals.experience_audit(report,batch,root,os.path.dirname(__file__))
    empty = verify_empty_fix(report, batch, root) if rc == 0 and not verified else None
    proposal_only = proposals.no_change(report,batch,root) if rc == 0 and not verified else None
    if not proposal_errors and rc == 0 and (verified or proposal_only):
        try: proposals.resolve(report,batch,root,os.path.dirname(__file__))
        except (OSError,ValueError,ImportError) as error: proposal_errors.append(str(error))
    batch.update(state="done" if rc == 0 and not proposal_errors and (verified or empty or proposal_only) else "failed", rc=rc, merged=merged if verified else None,
                 proposal_audit_errors=proposal_errors, report=report)
    if proposal_only: batch["no_change_proposals"] = proposal_only
    if proposal_errors:
        inbox("学习代码提案链未通过：" + "; ".join(proposal_errors) + "；原产出/合入事实保留，派学习者补链，不自动改游戏知识或回退。")
        batch["proposal_repair_needed"] = True
    if empty:
        batch["no_changes"] = empty
    enqueue({"experience-update": "experience-done", "strategy-proposal": "strategy-done"}.get(task, "fix-done"),
            f"{task} 批次 {batch_id} 结束：exit {rc}；已核实合入 live：{merged if verified else '无'}。"
            f"回报：{out_dir}/{batch_id}.out。"
            + (f"已核实无新增产出、自测通过，源码与 live {empty['live']} 一致；正常结案，无新增合并或完整补测。"
               if empty else "已核实无源码修改的提案处置；证据不足保留待新局，不冒造合入、版本或补测。" if proposal_only
               else "学习者自测后自行合入，无需另设审核；未合入时查回报，提交受阻由运维兜底。")
            + ("；提案链待补：" + "; ".join(proposal_errors) if proposal_errors else ""))
    if not verified:
        return
    if not run_checks:
        batch["checks_pending"] = True
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
