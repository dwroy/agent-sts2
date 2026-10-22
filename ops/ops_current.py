#!/usr/bin/env python3
"""Project-local, read-only projections maintained by the original scheduler, never a second watcher."""
import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess


def stamp():
    return subprocess.check_output(["date", "-Is"], text=True).strip()


def atomic(path, raw):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + f".{os.getpid()}.tmp")
    tmp.write_bytes(raw)
    os.replace(tmp, path)


def save(path, value):
    atomic(path, (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode())


def git(root, *args, **kw):
    return subprocess.check_output(["git", "-C", str(root), *args], **kw).decode().strip()


def bounded_checklist(text, current, receipt, receipt_sha):
    """Fall back to a mandatory, hash-bound read list, never partial authority or evidence."""
    if len(text.encode()) <= 12288:
        return text
    lines = ["# 运维当前清单（调度器生成；索引模式）",
             f"生成：{current['at']}；原件索引：{receipt} SHA256 {receipt_sha}",
             f"main {current['main']}",
             f"live {current['live']}；登记 release 见 current.json.release（不代表检查绿或实际采用）。",
             "动态事实超出短清单预算，已完整保存在上述 SHA 的 current.json；没有截断授权、失败、任务或事件。",
             "处理前必须核 SHA 并逐项读取以下字段及其原件；本清单不代表已经读过授权，不可沿用旧清单：",
             "- restoration_context：完整 summary、authorization 路径/SHA、takeover_receipt、external_tasks；先核授权原文与失败回执，缺失或冲突时停止并保留待办。",
             "- identity、home_selector、execution：原账号、pane/session、执行模式；不以默认配置推定实际生效。",
             f"- active_batches：在途 {len(current['active_batches'])}；完整 owner/线程/PID/租约/路径，不重复派发或按旧 PID 操作。",
             f"- open_requests：开放父要求 {len(current['open_requests'])}；不因本轮结束关闭。",
             f"- pending_notices：未确认 {len(current['pending_notices'])}；按本事件 notice id 核原件，不代其他角色 ACK，不把排队当送达。",
             f"- queued_events：队列 {len(current['queued_events'])}；只处理本轮已提交事件，按路径及 sources 的字节数/SHA 核全文，不以 preview 代完整事件。",
             f"- not_marked_completed_transactions：未标 completed {len(current['not_marked_completed_transactions'])}；保留未知/失败与原件引用，不推定活进程或成功。",
             f"- historical_lost：历史 {len(current['historical_lost'])}；不自行关闭；human_pace、transactions、recent_directives、inbox_tail、sources、missing：按事件定位未完成事务及指令的 offset/bytes/SHA，缺项不冒当前。",
             "首次另读 AGENTS/README/最新 STATE/学习协议；历史 handoff/decision-log 只沿事务定位，摘要冲突查原件。",
             "模型 gpt-6.1-sol；普通 ops/学习下次自然启动 high，专项有理由 xhigh，大脑 xhigh；实际档位须原生回执。不热切在途会话。",
             "只处理原事件，不新增轮询/模型/局/计时器；STOP、恢复开局及角色授权必须按 restoration_context 原文核实，regent 保持暂停。",
             "不读凭据/.env/游戏二进制，不改共享配置/账号/ops prompt，不推送。",
             "H0/0332 等科学边界、精确宿主树、发布/兼容与 retention 沿原报告核实；索引不代验收、shipped、覆盖率或消费。",
             "严格普通无源码成功仍须原调度器账本检查、唯一 dataset、受控记录提交及 ordinary-close 回执；异常/异议/缺证/人工决定正常唤醒。",
             "普通记录300–500字并附原件路径；不复制报告，通关/升级照旧。\n主管唤醒：需主管裁决/拍板、P0阻断超过20分钟无人能推进，或对局已停且按常备授权无法恢复时，向主检出 ops/codex-ops/inbox-claude.md 追加一行“HH:MM [ops] #N 一句话”；细节写 issue，后续ops会话照做。"]
    return "\n".join(lines) + "\n"


def generate(root, directory):
    root, directory = Path(root).resolve(), Path(directory).resolve()
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / "current.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        sources, missing = {}, []

        def read(path, default=None):
            path = Path(path)
            try:
                raw = path.read_bytes()
                sources[str(path)] = {"bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}
                return raw
            except FileNotFoundError:
                missing.append(str(path))
                return default

        def obj(path, default):
            raw = read(path)
            return json.loads(raw) if raw is not None else default

        state = obj(directory / "learn.json", {})
        live = root / ".worktrees/live"
        main_head = git(root, "rev-parse", "HEAD")
        live_head = git(live, "rev-parse", "HEAD")
        raw_versions = subprocess.check_output(["git", "-C", str(live), "show", f"{live_head}:eval/versions.json"])
        sources[f"git:{live_head}:eval/versions.json"] = {"bytes": len(raw_versions), "sha256": hashlib.sha256(raw_versions).hexdigest()}
        versions = json.loads(raw_versions)
        rows = versions if isinstance(versions, list) else versions.get("versions", [])
        release = next((row for row in reversed(rows) if row.get("release_id")), {})
        identity = obj(directory / "herdr-ops.json", {})
        home = (read(directory / "codex-home", "未设置".encode()) or b"").decode().strip()
        execution = (read(directory / "execution-mode", b"sandbox") or b"").decode().strip()
        context = obj(root / "notes/ops-current-context.json", {})
        if context:
            def context_artifact(name):
                path = (root / name).resolve()
                if not path.is_relative_to(root) or path.suffix not in (".json", ".md"):
                    raise ValueError("ops current context artifact outside project records")
                return read(path)

            authorization = context["authorization"]
            authorization_raw = context_artifact(authorization["path"])
            if authorization_raw is None or hashlib.sha256(authorization_raw).hexdigest() != authorization["sha256"]:
                raise ValueError("ops current authorization SHA mismatch; retain original checklist")
            context_artifact(context["takeover_receipt"])
            for task in context.get("external_tasks", []):
                if task.get("receipt"):
                    context_artifact(task["receipt"])
        active = {k: {name: v.get(name) for name in ("task", "learner_task", "character", "state", "pid", "worktree", "feature_request", "research_request", "resume_thread", "checks_pending") if v.get(name) is not None}
                  for k, v in state.get("batches", {}).items()
                  if v.get("state") in ("running", "pending", "blocked", "awaiting_delivery") or v.get("checks_pending")}
        lost = {k: v for k, v in state.get("batches", {}).items() if v.get("state") == "lost"}
        requests = {k: {name: v.get(name) for name in ("state", "revision", "owner", "batch", "checkpoint", "next") if v.get(name) is not None}
                    for k, v in state.get("learning_requests", {}).items() if v.get("state") != "completed"}
        notices = []
        for path in sorted((directory / "learning-notices").glob("*.json")):
            notice = obj(path, {})
            pending = [stage for stage in ("ops_forwarded", "watcher_received", "roy_notified") if not notice.get(stage)]
            if pending:
                notices.append({"id": notice.get("id"), "kind": notice.get("kind"), "request": notice.get("request_id"), "pending": pending, "path": str(path)})
        queue = []
        for path in sorted((directory / "queue").glob("*-*.md")):
            # Match readQueue exactly; abandoned dot-prefixed atomic temporaries are not events.
            if not re.fullmatch(r"[0-9]+-[a-z][a-z0-9-]*\.md", path.name):
                continue
            raw = read(path, b"")
            queue.append({"path": str(path), "preview": raw.decode()[:220]})
        transactions = {}
        unfinished = []
        for name in ("pending-integrations", "pending-deliveries", "pending-records", "pending-continuations", "publications"):
            transactions[name] = [str(p) for p in sorted((directory / name).glob("*.json"))]
            for source in transactions[name]:
                try:
                    value = obj(source, {})
                    if isinstance(value, dict) and value.get("completed") is not True:
                        unfinished.append({"path": source, "mtime": Path(source).stat().st_mtime,
                                           **{key: value.get(key) for key in ("phase", "state", "completed", "source", "live", "host_checks_requested", "next")}})
                except (OSError, ValueError):
                    unfinished.append({"path": source, "mtime": 0, "state": "unreadable; inspect original"})
        unfinished.sort(key=lambda row: row["mtime"], reverse=True)
        checkpoint_path = root / "paper/materials/20261017-human-pace-control/checkpoint.json"
        checkpoint = obj(checkpoint_path, {})
        human_pace = {key: checkpoint.get(key) for key in ("request", "owner_session", "original_owner", "phase", "state", "next")}
        # The original inbox is an instruction source; retain offsets instead of copying reports.
        inbox = root / "ops/inbox-dev.md"
        with inbox.open("rb") as handle:
            handle.seek(0, 2)
            size = handle.tell()
            offset = max(0, size - 8192)
            handle.seek(offset)
            tail = handle.read()
        sources[str(inbox)] = {"offset": offset, "bytes": len(tail), "sha256": hashlib.sha256(tail).hexdigest()}
        directives = []
        position = offset
        for line in tail.splitlines(keepends=True):
            if re.match(rb"- [0-9]{4}-[0-9]{2}-[0-9]{2} ", line):
                directives.append({"path": str(inbox), "offset": position, "bytes": len(line),
                                   "sha256": hashlib.sha256(line).hexdigest(), "preview": line.decode(errors="replace").strip()[:220]})
            position += len(line)
        current = {"schema": "ops-current-v1", "at": stamp(), "main": main_head, "live": live_head,
                   "release": release.get("release_id"), "release_record": release,
                   "identity": identity, "home_selector": home, "execution": execution,
                   "restoration_context": context,
                   "active_batches": active, "open_requests": requests, "pending_notices": notices,
                   "historical_lost": lost, "not_marked_completed_transactions": unfinished,
                   "human_pace": human_pace, "recent_directives": directives[-2:],
                   "queued_events": queue, "transactions": transactions, "sources": sources, "missing": missing,
                   "inbox_tail": {"path": str(inbox), "offset": offset, "bytes": len(tail)}}
        receipt = directory / "current.json"
        save(receipt, current)
        receipt_sha = hashlib.sha256(receipt.read_bytes()).hexdigest()
        lines = ["# 运维当前清单（调度器生成）", f"生成：{current['at']}；原件索引：{receipt} SHA256 {receipt_sha}",
                 ("当前授权：" + context["summary"] + "；原件 " + context["authorization"]["path"]
                  if context else "授权：Roy 2026-10-18 16:13；只处理原事件，不轮询、不新增模型/局/计时器，regent 保持暂停。"),
                 "模型 gpt-6.1-sol；普通 ops/学习下次自然启动 high，专项可有理由 xhigh，大脑保持 xhigh。实际生效须原生回执，不能从默认值推定。",
                 f"账号选择：{home}；原 ops：{identity.get('pane', '未知')} / {identity.get('session', '未知')}；执行模式：{execution}；辅助/学习者沙箱保持。",
                 "不读凭据/.env/游戏二进制，不改共享配置/账号；不推送。", f"main {main_head}", f"live {live_head}；登记 release {current['release']}（登记值不代表新树检查绿或实际采用）。",
                 "首次另读 AGENTS/README/最新 STATE/学习协议；此后每次读本清单及事件原件。历史 handoff/decision-log 只沿事务定位，原件冲突保留并核查。",
                 f"在途批次 {len(active)}（完整 owner/租约与路径见 current.json）："]
        for key, row in list(active.items())[-8:]:
            lines.append(f"- {key} {row.get('state')} {row.get('task')} PID={row.get('pid')}；{row.get('worktree', '')}")
        if context.get("external_tasks"):
            lines.append("外部原owner任务（不以learn.json缺项判退出，不重复派；实际状态沿原件核）：")
            for task in context["external_tasks"][:6]:
                lines.append(f"- {task['id']}；thread={task['thread']}；{task['worktree']}；{task.get('receipt', context['takeover_receipt'])}")
        lines.append(f"历史 lost {len(lost)} 项另存索引，不能视为活进程，不按旧PID操作或自行关闭。")
        lines.append(f"开放父要求 {len(requests)}：" + ", ".join(requests)[:650] + "；不因本轮结束关闭。")
        if checkpoint:
            lines.append(f"human-pace 原owner={str(human_pace['original_owner'])[:120]}，接续={str(human_pace['owner_session'])[:120]}；原件 {checkpoint_path}。不据阶段状态关闭宽父。")
        lines.append(f"未确认通知 {len(notices)}；不得代其他角色 ACK。前8项：")
        for row in notices[:8]:
            lines.append(f"- {row['id']} {row['kind']} {','.join(row['pending'])}；{row['path']}")
        lines.append(f"队列 {len(queue)}，只按本轮已提交事件处理；前4项：")
        for row in queue[:4]:
            lines.append(f"- {row['path']}：{row['preview'][:160]}")
        lines.append(f"原事务未标 completed 共{len(unfinished)}（含未知，非活进程数），最近4项：")
        for row in unfinished[:4]:
            lines.append(f"- {row['path']}；phase={str(row.get('phase') or row.get('state') or '未知')[:100]}")
        lines.append("最新指令短引用（完整行按offset核）：")
        for row in directives[-2:]:
            lines.append(f"- offset={row['offset']}：{row['preview']}")
        lines.extend(["原事务文件索引数（含历史）：" + "；".join(f"{key}={len(value)}" for key, value in transactions.items()) + "；完整路径见 current.json，不从文件存在推定未完成/运行。",
                      f"新指令原件：ops/inbox-dev.md 当前尾段 offset={offset}, bytes={len(tail)}；本轮新授权必须由事件引用，漏项查此段，勿整份重读。",
                      "current.json 仅按本事件 batch/request/notice id 用程序筛字段，不全文读；动态源变化后核新清单，不用旧值冒当前。",
                      "H0/0332等科学边界、精确宿主树、未完成发布/兼容及 retention 仅沿原报告和事务回执；清单不代验收、shipped、覆盖率或消费。",
                      "严格普通无源码成功由调度器完成账本检查、唯一 dataset 与受控记录提交，回执 ops/codex-ops/ordinary-close/；异常、异议、缺证、人工决定正常唤醒。",
                      "普通记录300–500字内并附原件路径；不复制报告，通关/升级照旧。\n主管唤醒：需主管裁决/拍板、P0阻断超过20分钟无人能推进，或对局已停且按常备授权无法恢复时，向主检出 ops/codex-ops/inbox-claude.md 追加一行“HH:MM [ops] #N 一句话”；细节写 issue，后续ops会话照做。"])
        text = bounded_checklist("\n".join(lines) + "\n", current, receipt, receipt_sha)
        if len(text.encode()) > 12288:
            raise ValueError("ops-current exceeds 12KB; retain previous checklist and inspect current.json")
        if git(root, "rev-parse", "HEAD") != main_head or git(live, "rev-parse", "HEAD") != live_head:
            raise ValueError("main/live advanced during checklist generation; retain original event")
        atomic(root / "notes/ops-current.md", text.encode())
        return current


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root"); parser.add_argument("directory")
    args = parser.parse_args()
    generate(args.root, args.directory)
