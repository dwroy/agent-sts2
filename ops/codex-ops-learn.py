#!/usr/bin/env python3
"""The mechanical half of the codex ops session's learning loop (docs/codex-ops.md; ops prompt「学习闭环」).

Run by ops/codex-ops.sh at :13 and :43 (`tick`); everything here is deterministic, and the ops codex session is woken
(an event file in ops/codex-ops/queue/) only for what needs judgment:

  tick       1. victories: runs.jsonl rows of the character with "victory": true not yet in ops/win-notified
                -> a `victory` event each, and the id is appended to ops/win-notified;
             2. a new ascension: the character's latest run-config.jsonl row targets a higher ascension than the
                last one seen -> an `ascension-up` event (the per-level summary);
             3. post-mortems: finished runs of the character (in runs.jsonl) without a "## <id>" heading in
                notes/lessons.md, not dispatched yet -> one learner batch of up to 5 (learner/run.ts --engine codex
                --task postmortem), started in the background by ops/codex-ops-learner.sh; one batch at a time;
             4. 10 post-mortems not folded into the experience base (ops/experience-pending.py) -> one line in
                ops/inbox-dev.md for the dev session (once per set; no wake).
  dispatch --runs A,B   start a post-mortem batch now (the broker's `postmortem` action)
  finish --batch B --rc N   called by ops/codex-ops-learner.sh when the learner exits -> a `learner-done` event
  status     the batches and the runs' post-mortem state

State: ops/codex-ops/learn.json. --character (default silent); CODEX_OPS_DIR / CODEX_OPS_ROOT override the paths (tests).
"""
import argparse
import datetime as dt
import fcntl
import json
import os
import re
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import paths  # noqa: E402
from learner_checks import finish_write_batch  # noqa: E402
from learner_jobs import check_jobs, dispatch_write, pending  # noqa: E402

ROOT = os.environ.get("CODEX_OPS_ROOT") or paths.ROOT
SCRIPTS = os.path.dirname(os.path.abspath(__file__))  # this file's ops/ (the scripts)
OPS = os.path.join(ROOT, "ops")  # the project's ops/ (win-notified, inbox-dev.md, codex-ops/)
LOGS = os.environ.get("CODEX_OPS_LOGS") or os.path.join(ROOT, "logs")
DIR = os.environ.get("CODEX_OPS_DIR") or os.path.join(OPS, "codex-ops")
QUEUE = os.path.join(DIR, "queue")
STATE = os.path.join(DIR, "learn.json")
LESSONS = os.path.join(ROOT, "notes", "lessons.md")
WIN_NOTIFIED = os.path.join(OPS, "win-notified")
INBOX = os.path.join(OPS, "inbox-dev.md")
sys.path.insert(0, os.path.join(os.path.dirname(SCRIPTS), "knowledge", "builders"))
from characters import NAMES_ZH, character_key, run_character  # noqa: E402

BATCH_MAX = 5
RETRY_AFTER_S = 3600
MAX_ATTEMPTS = 3
RUN_ID = re.compile(r"^[0-9A-Z]{12}$")
EXIT_MEANING = {0: "完成", 1: "学习者失败（结果是 error，或额度 / 登录错误）", 2: "参数或任务说明有错", 3: "codex 不可用，或 key 隔离自检没过", 124: "超时"}


def now_local():
    return dt.datetime.now().strftime("%Y-%m-%d %H:%M")


def load_state():
    try:
        with open(STATE, encoding="utf8") as handle:
            state = json.load(handle)
    except (OSError, ValueError):
        state = {}
    state.setdefault("batches", {})
    state.setdefault("runs", {})
    state.setdefault("ascension", {})
    return state


def save_state(state):
    os.makedirs(DIR, exist_ok=True)
    tmp = STATE + ".tmp"
    with open(tmp, "w", encoding="utf8") as handle:
        json.dump(state, handle, ensure_ascii=False, indent=1)
    os.replace(tmp, STATE)


def enqueue(kind, text):
    """An event for the ops session (ops/codex/lib.ts readQueue: <epoch ns>-<kind>.md)."""
    os.makedirs(QUEUE, exist_ok=True)
    name = f"{time.time_ns()}-{kind}.md"
    tmp = os.path.join(QUEUE, "." + name)
    with open(tmp, "w", encoding="utf8") as handle:
        handle.write(text.strip() + "\n")
    os.replace(tmp, os.path.join(QUEUE, name))
    return name


def inbox(text):
    with open(INBOX, "a", encoding="utf8") as handle:
        handle.write(f"- {now_local()} [codex-ops 调度器] {text}\n")


def jsonl(path):
    if not os.path.exists(path):
        return
    with open(path, encoding="utf8") as handle:
        for line in handle:
            try:
                row = json.loads(line)
            except ValueError:
                continue
            if isinstance(row, dict):
                yield row


def finished_runs(character):
    """runs.jsonl rows of the character, in file order (a finished run is one report.py appended)."""
    return [row for row in jsonl(os.path.join(LOGS, "runs.jsonl")) if row.get("run_id") and run_character(row) == character]


def postmortem_ids():
    if not os.path.exists(LESSONS):
        return set()
    text = re.sub(r"<!--.*?-->", "", open(LESSONS, encoding="utf8").read(), flags=re.S)
    return set(re.findall(r"^## ([0-9A-Z]{12})", text, re.M))


def alive(pid):
    try:
        os.kill(int(pid), 0)
        return True
    except (OSError, ValueError, TypeError):
        return False


def running_batch(state):
    """The batch in progress, if any; a batch whose process is gone (a crash, a restart) is marked failed."""
    for batch_id, batch in state["batches"].items():
        if batch.get("task", "postmortem") != "postmortem":
            continue
        if batch.get("state") != "running":
            continue
        if alive(batch.get("pid")):
            return batch_id
        batch["state"] = "lost"
        for run in batch["runs"]:
            info = state["runs"].setdefault(run, {"attempts": 1})
            info["retry_at"] = time.time()
    return None


def dispatch(state, runs, character, reason):
    batch_id = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    out_dir = os.path.join(DIR, "learner")
    os.makedirs(out_dir, exist_ok=True)
    proc = subprocess.Popen(
        ["bash", os.path.join(SCRIPTS, "codex-ops-learner.sh"), batch_id, ",".join(runs), character],
        cwd=ROOT, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True,
    )
    state["batches"][batch_id] = {"runs": runs, "pid": proc.pid, "started": now_local(), "state": "running", "reason": reason, "character": character}
    for run in runs:
        info = state["runs"].setdefault(run, {"attempts": 0})
        info["attempts"] = info.get("attempts", 0) + 1
        info["batch"] = batch_id
        info.pop("retry_at", None)
    return batch_id, proc.pid


def check_victories(character):
    notified = set()
    if os.path.exists(WIN_NOTIFIED):
        notified = {line.strip() for line in open(WIN_NOTIFIED, encoding="utf8") if line.strip()}
    events = []
    for row in finished_runs(character):
        run = row["run_id"]
        if row.get("victory") is True and run not in notified:
            notified.add(run)
            with open(WIN_NOTIFIED, "a", encoding="utf8") as handle:
                handle.write(run + "\n")
            events.append(enqueue("victory", (
                f"通关：{run}（{NAMES_ZH.get(character, character)}，A{row.get('ascension')}，第 {row.get('floor')} 层，结束于 {row.get('ended')}）。"
                f"调度器已把 run id 写进 ops/win-notified。按「汇报规则 1」查清第一次尝试赢还是 SL 后赢、用时、下一局打第几级，写进 ops/inbox-dev.md。"
            )))
    return events


def run_ascension(row):
    value = row.get("target_ascension")
    if not isinstance(value, int):
        value = row.get("ascension")
    return value if isinstance(value, int) else None


def check_ascension(state, character):
    latest = None
    for row in jsonl(os.path.join(LOGS, "run-config.jsonl")):
        if run_character(row) == character and run_ascension(row) is not None:
            latest = row
    if latest is None:
        return []
    level = run_ascension(latest)
    seen = state["ascension"].get(character)
    state["ascension"][character] = max(level, seen) if isinstance(seen, int) else level
    if not isinstance(seen, int) or level <= seen:
        return []
    return [enqueue("ascension-up", (
        f"进阶升级：{NAMES_ZH.get(character, character)}这一局 {latest.get('run_id')} 打 A{level}（上一级 A{seen}）。"
        f"按「每过一级」写 A{seen} 的小结（eval/metrics.py --character {character} --group-by ascension --md → notes/silent-climb-report.md 新一节），"
        f"五行以内的摘要写进 ops/inbox-dev.md。"
    ))]


def check_postmortems(state, character):
    if running_batch(state):
        return None
    have = postmortem_ids()
    now = time.time()
    todo = []
    for row in finished_runs(character):
        run = row["run_id"]
        if run in have or run in todo:
            continue
        info = state["runs"].get(run)
        if info:
            if info.get("attempts", 0) >= MAX_ATTEMPTS:
                continue
            if info.get("retry_at") is None or info["retry_at"] > now:
                continue
        todo.append(run)
    if not todo:
        return None
    return dispatch(state, todo[:BATCH_MAX], character, "tick")


def check_pending(state, character):
    try:
        # CODEX_OPS_PENDING_CMD: a shell command in its place (tests).
        command = os.environ.get("CODEX_OPS_PENDING_CMD")
        argv = ["bash", "-c", command] if command else [sys.executable, os.path.join(SCRIPTS, "experience-pending.py"), "--character", character]
        out = subprocess.run(argv, cwd=ROOT, capture_output=True, text=True, timeout=120).stdout.split("\n")
        count = int(out[0])
    except (subprocess.SubprocessError, ValueError, IndexError, OSError):
        return False
    ids = [run for run in (out[1].split(",") if len(out) > 1 else []) if run]
    key = ",".join(ids[:10])
    if count < 1 or state.get("pending_notified", {}).get(character) == key:
        return False
    state.setdefault("pending_notified", {})[character] = key
    inbox(f"{NAMES_ZH.get(character, character)}未并入经验库的复盘满 {count} 局（最早 10 局：{key}）。调度器按每局一更自动派 experience-update，工作树忙时并入下一批。")
    return True


def cmd_tick(args):
    state = load_state()
    character = args.character
    report = {"victory": check_victories(character), "ascension": check_ascension(state, character)}
    batch = check_postmortems(state, character)
    report["dispatched"] = batch
    report["pending_notified"] = check_pending(state, character)
    report["write_jobs"] = check_jobs(state, ROOT, SCRIPTS, character, alive, dt.datetime.now().strftime("%Y%m%d-%H%M%S"))
    save_state(state)
    print(json.dumps(report, ensure_ascii=False))


def cmd_dispatch(args):
    runs = [run for run in args.runs.split(",") if run]
    if not runs or len(runs) > BATCH_MAX or not all(RUN_ID.match(run) for run in runs):
        print(f"runs 要 1–{BATCH_MAX} 个 12 位局号，逗号分隔")
        return 2
    state = load_state()
    busy = running_batch(state)
    if busy:
        save_state(state)
        print(f"已有复盘批次在跑：{busy} {state['batches'][busy]['runs']}（PID {state['batches'][busy]['pid']}），跑完再派")
        return 1
    known = {row["run_id"] for row in finished_runs(args.character)}
    unknown = [run for run in runs if run not in known]
    if unknown:
        print(f"这些局不在 runs.jsonl 里（或不是这个角色的）：{','.join(unknown)}")
        return 1
    batch_id, pid = dispatch(state, runs, args.character, "ops")
    save_state(state)
    print(f"复盘批次 {batch_id} 已在后台启动（PID {pid}）：{','.join(runs)}；跑完调度器会发 learner-done 事件")
    return 0


def ledger_lines(runs):
    """The learning ledger's items per run of the batch (paper/materials/learning/README.md): the learner adds or
    updates one per lesson; the ops session checks every run has some and the file validates."""
    path = os.environ.get("LEDGER_FILE") or os.path.join(ROOT, "paper", "materials", "learning", "ledger.jsonl")
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("ledger", os.path.join(os.path.dirname(SCRIPTS), "learner", "ledger.py"))
        ledger = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(ledger)
        items = list(ledger.fold(ledger.read_rows(path)).values())
    except Exception as error:  # the event still goes out; the session reads the reason
        return [f"学习账本读不了（{type(error).__name__}: {error}）。"]
    per = {}
    for run in runs:
        per[run] = [item["id"] for item in items
                    if run in {e.get("run") for e in item.get("evidence", [])} | set(item.get("where", {}).get("lessons", []))]
    missing = [run for run, ids in per.items() if not ids]
    return [
        "学习账本（paper/materials/learning/ledger.jsonl）：" + "；".join(f"{run} {','.join(ids) or '无'}" for run, ids in per.items())
        + f"。没有条目的局：{','.join(missing) or '无'}。"
    ]


def cmd_finish(args):
    state = load_state()
    batch = state["batches"].get(args.batch)
    if batch is None:
        print(f"unknown batch {args.batch}")
        return 1
    if batch.get("task", "postmortem") != "postmortem":
        if batch.get("state") in ("done", "failed") and "rc" in batch:
            return 0
        batch["finished"] = now_local()
        finish_write_batch(args.batch, batch, args.rc, ROOT, os.path.join(DIR, "learner"), enqueue, inbox)
        if batch["state"] == "failed":
            batch["retry_at"] = time.time() + RETRY_AFTER_S
        save_state(state)
        return 0
    have = postmortem_ids()
    done = [run for run in batch["runs"] if run in have]
    missing = [run for run in batch["runs"] if run not in have]
    batch.update({"state": "done" if args.rc == 0 and not missing else "failed", "rc": args.rc, "finished": now_local(), "done": done, "missing": missing})
    retry_note = []
    for run in missing:
        info = state["runs"].setdefault(run, {"attempts": 1})
        if info.get("attempts", 0) < MAX_ATTEMPTS:
            info["retry_at"] = time.time() + RETRY_AFTER_S
            retry_note.append(run)
    save_state(state)
    out = os.path.join(DIR, "learner", f"{args.batch}.out")
    err = os.path.join(DIR, "learner", f"{args.batch}.err")
    log_path = ""
    try:
        match = re.search(r"日志 (\S+\.jsonl)", open(err, encoding="utf8").read())
        log_path = match.group(1) if match else ""
    except OSError:
        pass
    lines = [
        f"复盘批次 {args.batch}（{','.join(batch['runs'])}）结束：exit {args.rc}（{EXIT_MEANING.get(args.rc, '其他')}）。",
        f"已有复盘：{','.join(done) or '无'}；还没有：{','.join(missing) or '无'}"
        + (f"（{','.join(retry_note)} 调度器 1 小时后重派，每局最多 {MAX_ATTEMPTS} 次）" if retry_note else "")
        + "。",
        f"学习者的回报（最后有 json 块）：{out}；stderr：{err}" + (f"；完整事件流：{log_path}" if log_path else "") + "。",
        *ledger_lines(done),
        "按「学习闭环」处理回报：新的纯 bug 里阻塞性的按「卡死」的修法，其他追加到 notes/fix-queue-v4.md；打法或机制上的发现不用你处理。"
        "然后 python3 ops/paper_dataset.py --no-raw，decision-log 记一行，提交主目录仓库（只 add 自己改的文件，加上 notes/lessons.md 和 paper/materials/learning/ledger.jsonl）。",
    ]
    if args.rc == 3:
        lines.append("exit 3：引擎检查或 key 隔离自检没过。写进 ops/inbox-dev.md 报给开发会话，不要绕过。")
    elif args.rc != 0:
        lines.append("如果 stderr 或回报里是额度或登录错误：decision-log 记一行，复盘往后顺延，对局照常。")
    enqueue("learner-done", "\n".join(lines))
    check_jobs(state, ROOT, SCRIPTS, batch.get("character", args.character), alive, dt.datetime.now().strftime("%Y%m%d-%H%M%S"))
    save_state(state)
    print("\n".join(lines))
    return 0


def cmd_write(args):
    state = load_state()
    runs = [run for run in args.runs.split(",") if run] if args.runs else pending(ROOT, SCRIPTS, args.character)
    if args.task in ("experience-update", "strategy-proposal"):
        known = {row["run_id"] for row in finished_runs(args.character)}
        if not runs or len(runs) > 10 or not all(RUN_ID.fullmatch(run) and run in known for run in runs):
            print("学习批次需要 1–10 个本角色已结束的局号")
            return 2
    result = dispatch_write(state, ROOT, SCRIPTS, args.task, args.character, runs if args.task != "fix-batch" else [],
                            ",".join(runs), "ops", alive, dt.datetime.now().strftime("%Y%m%d-%H%M%S"))
    save_state(state)
    print(json.dumps({"dispatched": result}, ensure_ascii=False))
    return 0 if result else 1


def cmd_request_merge(args):
    if args.branch not in ("codex-dev", "exp-silent"):
        return 2
    enqueue("manual", f"学习者合入兜底请求：{args.branch}。仅在学习者提交或合入受阻时，按任务 live 流程合入；无须另设审核。")
    print("已发送合入兜底事件；运维会话执行 live 流程。")
    return 0


def cmd_status(args):
    state = load_state()
    busy = running_batch(state)
    for batch_id, batch in sorted(state["batches"].items())[-8:]:
        print(f"{batch_id} {batch.get('state')} rc={batch.get('rc')} pid={batch.get('pid')} runs={','.join(batch['runs'])} missing={','.join(batch.get('missing', []))}")
    have = postmortem_ids()
    waiting = [row["run_id"] for row in finished_runs(args.character) if row["run_id"] not in have]
    print(f"running batch: {busy or 'none'}; finished {args.character} runs without a post-mortem: {','.join(waiting) or 'none'}")
    print(f"ascension seen: {state['ascension']}")
    save_state(state)
    return 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["tick", "dispatch", "finish", "status", "write", "request-merge"])
    parser.add_argument("--task", choices=["experience-update", "fix-batch", "strategy-proposal"], default="fix-batch")
    parser.add_argument("--branch", default="")
    parser.add_argument("--character", default="silent")
    parser.add_argument("--runs", default="")
    parser.add_argument("--batch", default="")
    parser.add_argument("--rc", type=int, default=1)
    args = parser.parse_args()
    args.character = character_key(args.character) or "silent"
    handler = {"tick": cmd_tick, "dispatch": cmd_dispatch, "finish": cmd_finish, "status": cmd_status,
               "write": cmd_write, "request-merge": cmd_request_merge}[args.command]
    os.makedirs(DIR, exist_ok=True)
    with open(os.path.join(DIR, "learn.lock"), "a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        return handler(args) or 0


if __name__ == "__main__":
    sys.exit(main())
