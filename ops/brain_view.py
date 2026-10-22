#!/usr/bin/env python3
"""Read-only brain log view. No game API, model, tool execution or controller IPC."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import time

from learner_jobs import hosting

LABEL = "brain-view"
RUN = re.compile(r"^[0-9A-Z]{12}$")
IDENTIFIER = re.compile(r"^[A-Za-z0-9_.:/-]{1,120}$")
MAX_LINE = 8 * 1024 * 1024
# Redact before truncation: a cutoff must never expose a credential fragment.
REDACTIONS = [
    (r"(?i)\b(?:https?|wss?)://\S+", "[地址已隐藏]"),
    (r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[邮箱已隐藏]"),
    (r"(?i)\b(?:bearer\s+\S+|(?:sk|ghp|gho|github_pat|xox[baprs])[-_][A-Za-z0-9_-]+)", "[凭据已隐藏]"),
    (r"(?i)[\"']?(?:[\w.-]*(?:key|token|secret|password|authorization|cookie)|(?:external[_ -]?)?player[_ -]?(?:id|name)|steam[_ -]?id)[\"']?\s*[:=]\s*(?:\"[^\"]*\"|'[^']*'|[^\s,;}]+)", "[敏感字段已隐藏]"),
    (r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b", "[凭据已隐藏]"),
    (r"\b[A-Za-z0-9_+/=-]{32,}\b", "[长标识已隐藏]"),
]


def safe_text(value, limit=240):
    if not isinstance(value, (str, int, float, bool)):
        return "?"
    text = str(value)
    for pattern, replacement in REDACTIONS:
        text = re.sub(pattern, replacement, text)
    # Strip terminal controls, including OSC/CSI introducers; no log may execute terminal commands.
    text = re.sub(r"[\x00-\x1f\x7f-\x9f]", " ", text)
    return text[:limit] + ("…" if len(text) > limit else "")


def number(value):
    return str(value) if type(value) in (int, float) and 0 <= value < 10**12 else "?"


def ident(value):
    return safe_text(value, 120) if isinstance(value, str) and IDENTIFIER.fullmatch(value) else "?"


def params(value):
    """Allowlisted game filters only; queries/SQL and arbitrary strings expose shape, never contents."""
    if not isinstance(value, dict):
        return "参数正文已隐藏"
    parts = []
    for key, item in list(value.items())[:12]:
        if not isinstance(key, str) or not re.fullmatch(r"[a-zA-Z_]{1,40}", key):
            continue
        if re.search(r"key|token|secret|auth|password|player|steam|user|cookie", key, re.I):
            continue
        if key in ("act", "ascension", "limit", "count", "offset") and type(item) is int:
            summary = number(item)
        elif key == "character" and item in ("silent", "ironclad", "regent", "defect", "necrobinder"):
            summary = item
        else:
            summary = f"{len(item)}项" if isinstance(item, (dict, list)) else f"文本/{len(item)}字" if isinstance(item, str) else "已隐藏"
        parts.append(f"{key}={summary}")
    return ", ".join(parts) or "无可展示参数"


def floor_of(row):
    payload = row.get("payload")
    if not isinstance(payload, dict):
        return "?"
    candidates = [payload, payload.get("state"), payload.get("run"), payload.get("context")]
    for value in list(candidates):
        if isinstance(value, dict):
            candidates.extend([value.get("run"), value.get("state"), value.get("facts")])
    for value in candidates:
        if isinstance(value, dict) and type(value.get("floor")) is int:
            return number(value["floor"])
    return "?"


def decision_value(value):
    if isinstance(value, (str, int, bool)):
        return safe_text(value, 160)
    if isinstance(value, list):
        items = []
        for item in value[:8]:
            if isinstance(item, (str, int, bool)):
                items.append(safe_text(item, 80))
            elif isinstance(item, dict):
                # Only game action/route fields; never arbitrary player or tool metadata.
                items.append({key: safe_text(item[key], 60) for key in
                    ("row", "col", "column", "node_id", "type", "card", "potion", "use", "action", "choice", "target")
                    if isinstance(item.get(key), (str, int, bool))})
        rendered = json.dumps(items, ensure_ascii=False)
        return safe_text(rendered, 220) + (f"（共{len(value)}项）" if len(value) > 8 else "")
    return None


def answer_summary(answer):
    if not isinstance(answer, dict):
        return "无有效答案"
    # Cover the actual pick, route, shop, run-plan and fight-plan contracts, without dumping nested data.
    choices = []
    for key in ("choice", "action", "index", "option", "card_id", "target", "path", "route", "plan",
                "pick", "upgrade", "remove", "buy", "skip", "discard", "drink", "archetype", "want", "avoid",
                "block_target", "elites", "rest", "boss_prep", "approach", "setup_cards", "focus_enemy", "potions", "key_turns"):
        if key in answer:
            rendered = decision_value(answer[key])
            if rendered is not None:
                choices.append(f"{key}={rendered}")
    reason = answer.get("reason", answer.get("why", answer.get("summary")))
    selection = safe_text(', '.join(choices), 900) if choices else '结构化答案（明细已折叠）'
    return f"{selection}\n  理由：{safe_text(reason, 360) if reason is not None else '日志未提供'}"


def render_brain(row):
    flags = []
    if row.get("error") or row.get("problems") or row.get("accepted") is False:
        flags.append("!!! 错误/未接受 " + ident(row.get("error_kind", "validation")))
    if row.get("error_kind") == "timeout":
        flags.append("!!! 超时")
    agent = row.get("agent") if isinstance(row.get("agent"), dict) else {}
    if row.get("fell_back_from") or agent.get("fallback"):
        flags.append("!!! 兜底 " + ident(agent.get("fallback") or row.get("fell_back_from")))
    lines = [f"\n{safe_text(row.get('ts', '?'), 40)} · F{floor_of(row)} · {ident(row.get('label'))} · 题 {ident(row.get('question_id'))}",
             f"  {ident(row.get('engine'))} / {ident(row.get('model'))} · 请求强度 {ident(row.get('requested_effort', row.get('effort')))}"]
    receipt = row.get("native_receipt")
    if isinstance(receipt, dict):
        # Actual receipt is shown only for fields explicitly reported by the harness.
        lines.append(f"  原生回执强度 {ident(receipt.get('effort', receipt.get('reasoning_effort')))}")
    lines.extend(flags)
    if row.get("question"):
        lines.append("  题面（截断）：" + safe_text(row["question"], 160))
    calls = row.get("tool_calls") if isinstance(row.get("tool_calls"), list) else []
    for call in calls[:100]:
        if not isinstance(call, dict):
            continue
        size = call.get("outputBytes")
        if type(size) is not int and isinstance(call.get("output"), str):
            size = len(call["output"].encode("utf8"))
        lines.append(f"  {'!!! 工具错误' if call.get('isError') else '工具'} {ident(call.get('name'))} ({params(call.get('input'))}) → {number(size)} B · {number(call.get('ms'))} ms")
    lines.append("  选择：" + answer_summary(row.get("answer")))
    total = row.get("latency_ms")
    if type(total) in (int, float) and type(row.get("primary_ms")) in (int, float):
        total += row["primary_ms"]
    lines.append(f"  总耗时 {number(total)} ms（本条尝试及已记录首选失败；重问见各条）")
    return "\n".join(lines)


class JsonlTail:
    """Bounded incremental reads, complete lines only; survive missing files, truncation and rotation."""
    def __init__(self, path, initial=4 * 1024 * 1024):
        self.path, self.initial = Path(path), initial
        self.identity = None
        self.offset = 0
        self.pending = b""
        self.discard = False
        self.anchor = b""

    def read(self):
        try:
            with self.path.open("rb") as stream:
                stat = os.fstat(stream.fileno())
                identity = (stat.st_dev, stat.st_ino)
                changed = False
                if identity == self.identity and self.anchor and stat.st_size >= self.offset:
                    stream.seek(self.offset - len(self.anchor))
                    changed = stream.read(len(self.anchor)) != self.anchor
                if identity != self.identity or stat.st_size < self.offset or changed:
                    self.identity, self.offset, self.pending = identity, max(0, stat.st_size - self.initial), b""
                    self.discard = self.offset > 0
                stream.seek(self.offset)
                data = stream.read(MAX_LINE)
                self.offset += len(data)
                stream.seek(max(0, self.offset - 64))
                self.anchor = stream.read(min(64, self.offset))
        except OSError:
            return []
        lines = (self.pending + data).split(b"\n")
        self.pending = lines.pop()
        if self.discard and lines:
            lines.pop(0)
            self.discard = False
        if len(self.pending) > MAX_LINE:
            self.pending = b""
            self.discard = True
        result = []
        for line in lines:
            if len(line) > MAX_LINE:
                continue
            try:
                row = json.loads(line)
                if isinstance(row, dict):
                    result.append(row)
            except (ValueError, UnicodeError, RecursionError):
                pass
        return result


class Viewer:
    def __init__(self, logs, title, emit=print):
        self.config = JsonlTail(Path(logs) / "run-config.jsonl")
        self.brain = JsonlTail(Path(logs) / "brain.jsonl")
        self.wait = JsonlTail(Path(logs) / "brain-wait.jsonl", initial=64 * 1024)
        self.run = None
        self.title = title
        self.emit = emit
        self.titled = ""
        self.announced = None
        self.has_config = False

    def poll(self):
        configs, brains, waits = self.config.read(), self.brain.read(), self.wait.read()
        if configs:
            run = configs[-1].get("run_id")
            if isinstance(run, str) and RUN.fullmatch(run):
                self.run = run
                self.has_config = True
        elif not self.has_config:
            for row in reversed(brains):
                run = row.get("run_id")
                if isinstance(run, str) and RUN.fullmatch(run):
                    self.run = run
                    break
        target = f"对局大脑 · {self.run or '等待开局'}"
        if self.titled != target:
            if self.title(target):
                self.titled = target
            if self.run and self.announced != self.run:
                self.emit(f"\n对局大脑 · {self.run}（只读；完成的尝试与工具调用随日志刷新，不展示推理）")
                self.announced = self.run
        for row in sorted([*(('brain', r) for r in brains), *(('wait', r) for r in waits)], key=lambda pair: str(pair[1].get("ts", ""))):
            kind, event = row
            if event.get("run_id") != self.run:
                continue
            if kind == "brain":
                self.emit(render_brain(event))
            elif event.get("state") != "heartbeat":
                self.emit(f"!!! 等待状态 {ident(event.get('state'))} · {ident(event.get('decision_type'))} · 题 {ident(event.get('question_id'))} · {safe_text(event.get('ts'), 40)}（错误原文已隐藏）")


def enabled(state):
    return hosting(str(state), "brain_view", "CODEX_OPS_BRAIN_VIEW", "herdr") == "herdr"


def command(args, env=None):
    try:
        return subprocess.run(args, env=env, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                              stderr=subprocess.DEVNULL, timeout=25).returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def ensure(root, logs, state):
    if not enabled(state):
        return
    state.mkdir(parents=True, exist_ok=True)
    with (state / "brain-view-host.lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        env = dict(os.environ, HERDR_HOST_STATE=str(state / "herdr.json"), HERDR_HOST_CWD=str(root))
        argv = ["bash", str(root / "ops/herdr-host.sh"), "run", LABEL,
                "--env", f"CODEX_OPS_BRAIN_VIEW={os.environ.get('CODEX_OPS_BRAIN_VIEW', '')}"]
        argv += ["--", "nice", "-n", "19", "python3", str(root / "ops/brain_view.py"),
                 "--root", str(root), "--logs", str(logs), "--state-dir", str(state), "watch"]
        # A busy recorded pane is retained by herdr-host; no stop, close or signal is ever sent here.
        command(argv, env)


def watch(root, logs, state, once=False):
    state.mkdir(parents=True, exist_ok=True)
    with (state / "brain-view.lock").open("w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        env = dict(os.environ, HERDR_HOST_STATE=str(state / "herdr.json"), HERDR_HOST_CWD=str(root))
        title = lambda text: command(["bash", str(root / "ops/herdr-host.sh"), "title", LABEL, text], env)
        view = Viewer(logs, title, lambda text: print(text, flush=True))
        print("对局大脑视图 · 等待日志；仅呈现已落盘事实。工具返回正文和完整题面不显示。", flush=True)
        while enabled(state):
            view.poll()
            if once:
                break
            time.sleep(1)
        print("对局大脑视图已停止；tab 保留，下一自然启动边界或原 stall tick 可恢复。", flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parent.parent)
    parser.add_argument("--logs", type=Path)
    parser.add_argument("--state-dir", type=Path)
    parser.add_argument("mode", choices=("ensure", "watch", "sample"))
    args = parser.parse_args()
    root = args.root.resolve()
    logs, state = args.logs or root / "logs", args.state_dir or root / "ops/codex-ops"
    if args.mode == "ensure":
        ensure(root, logs, state)
    elif args.mode == "sample":
        Viewer(logs, lambda _: True).poll()
    else:
        watch(root, logs, state)


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError, KeyboardInterrupt):
        # Never echo log contents or subprocess errors into the terminal.
        print("对局大脑视图停止（读取或终端故障）；对局进程独立运行。", flush=True)
        raise SystemExit(1)
