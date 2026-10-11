#!/usr/bin/env python3
"""One-shot LLM handoff worker. Uses existing queues and launchers, never a second scheduler."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import time

from llm_handoff import Handoff, atomic_json, locked, stamp


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "ops/codex-ops"


def command(args, *, env=None, timeout=30):
    p = subprocess.run(args, cwd=ROOT, env=env, capture_output=True, text=True, timeout=timeout)
    if p.returncode:
        # Never expose a subprocess's possibly sensitive stderr in a durable state record.
        raise RuntimeError(f"{Path(args[0]).name} failed with exit {p.returncode}")
    return p.stdout


def process(pid):
    try:
        p = Path("/proc") / str(int(pid))
        stat = (p / "stat").read_text().rsplit(")", 1)[1].split()
        if stat[0] == "Z": return None
        argv = (p / "cmdline").read_bytes().replace(b"\0", b" ").decode(errors="replace")
        return {"pid": int(pid), "start_ticks": stat[19], "argv": argv}
    except (OSError, ValueError, TypeError): return None


def snapshot(state):
    active = []
    ops_identity = []
    complete = True
    try:
        batches = json.loads((RUNTIME / "learn.json").read_text())["batches"]
        for ident, batch in batches.items():
            p = process(batch.get("pid"))
            # A completed batch can still own its wrapper while external checks finish.
            if p and ident in p["argv"]:
                active.append({"kind": "learner", "id": ident, "pid": p["pid"], "start_ticks": p["start_ticks"]})
            elif batch.get("state") in ("starting", "running"):
                # A missing PID is not proof of a committed completion/checkpoint.
                active.append({"kind": "unsettled_batch", "id": ident, "pid": batch.get("pid")})
        agent = json.loads(command(["herdr", "agent", "get", "ops"]))["result"]["agent"]
        info = json.loads(command(["herdr", "pane", "process-info", "--pane", agent["pane_id"]]))["result"]["process_info"]
        ops_pids = {p["pid"] for p in info.get("foreground_processes", [])}
        ops_identity = [p for pid in ops_pids if (p := process(pid))]
        if not any(state["source"]["session"] in p["argv"] for p in ops_identity):
            complete = False
        for entry in Path("/proc").iterdir():
            if not entry.name.isdigit(): continue
            p = process(entry.name)
            if not p: continue
            argv = p["argv"]
            if "codex" in argv and p["pid"] not in ops_pids:
                try:
                    environment = (entry / "environ").read_bytes().split(b"\0")
                    home = next((v.split(b"=", 1)[1].decode() for v in environment if v.startswith(b"CODEX_HOME=")), "")
                    if home == state["source"]["learner_home"] or home == state["source"].get("brain_home"):
                        active.append({"kind": "old_account_engine", "pid": p["pid"], "start_ticks": p["start_ticks"]})
                except (OSError, UnicodeError):
                    pass
            if not any(x in argv for x in ("index.ts play", "ops/autoplay.sh", "ops/report.py", "ops/ops_assist.py worker")):
                continue
            try: cwd = (entry / "cwd").resolve()
            except OSError: complete = False; continue
            if cwd.is_relative_to(ROOT):
                active.append({"kind": "play_or_loop", "pid": p["pid"], "start_ticks": p["start_ticks"]})
        idle = agent.get("agent_status") in ("idle", "done")
    except (OSError, ValueError, KeyError, RuntimeError, subprocess.TimeoutExpired):
        complete = False
        idle = False
    handoff = ROOT / state["target"]["handoff"]
    checkpoint = handoff.read_text() if handoff.is_file() else ""
    ready = "ready_to_drain" in checkpoint and state["source"]["session"] in checkpoint
    return {"at": stamp(), "active_workers": active, "ops_idle": idle,
            "checkpoint_ready": ready, "inventory_complete": complete,
            "ops_identity": [{k: p[k] for k in ("pid", "start_ticks")} for p in ops_identity]}


def cron_home(text, home):
    begin = "# BEGIN agent-sts2 codex-ops"
    end = "# END agent-sts2 codex-ops"
    lines = text.splitlines(keepends=True)
    starts = [i for i, line in enumerate(lines) if line.startswith(begin)]
    ends = [i for i, line in enumerate(lines) if line.startswith(end)]
    if len(starts) != 1 or len(ends) != 1 or starts[0] >= ends[0]: raise ValueError("ambiguous scheduler cron block")
    a, b = starts[0], ends[0]
    block = [line for line in lines[a + 1:b] if not line.startswith("LEARNER_CODEX_HOME=")]
    return "".join(lines[:a + 1] + (["LEARNER_CODEX_HOME=" + home + "\n"] if home else []) + block + lines[b:])


class CodexAdapter:
    """Account-isolated Codex adapter; other providers must supply their own adapter explicitly."""
    def __init__(self, transaction):
        self.transaction = transaction

    def backup(self, state):
        home_file = RUNTIME / "codex-home"
        brain = RUNTIME / "brain-home"
        return {"selector": home_file.read_text() if home_file.exists() else None,
                "brain_selector": brain.read_text() if brain.exists() else None, "cron": command(["crontab", "-l"]),
                "session": (RUNTIME / "session-id").read_text(),
                "herdr_ops": (RUNTIME / "herdr-ops.json").read_text() if (RUNTIME / "herdr-ops.json").exists() else None}

    def activate(self, state):
        # The caller holds wake.lock; an idle TUI can leave without interrupting any transaction.
        command(["herdr", "agent", "prompt", "ops", "/quit"])
        for _ in range(30):
            old = state["snapshot"]["ops_identity"]
            if old and not any((p := process(x["pid"])) and p["start_ticks"] == x["start_ticks"] for x in old):
                break
            time.sleep(1)
        else: raise RuntimeError("old ops TUI did not exit; no account configuration changed")
        target = state["target"]
        (RUNTIME / "codex-home").write_text(target["learner_home"] + "\n")
        (RUNTIME / "brain-home").write_text(target["brain_home"] + "\n")
        updated = cron_home(state["receipts"]["backup"]["cron"], target["learner_home"])
        p = subprocess.run(["crontab", "-"], input=updated, text=True, capture_output=True)
        if p.returncode: raise RuntimeError("cron update failed")
        # Preserve identity files, without moving/copying any encrypted rollout or credential.
        archive = self.transaction.path.parent / "old-session"
        archive.mkdir(exist_ok=True)
        for name in ("session-id", "herdr-ops.json"):
            source = RUNTIME / name
            if source.exists(): os.replace(source, archive / name)
        return {"at": stamp(), "learner_home": target["learner_home"], "brain_home": target["brain_home"],
                "old_session": state["source"]["session"], "cross_account_resume": False}

    def rollback(self, state, backup):
        # No model is launched by activate(), so restoring the saved account settings is safe here.
        selector = RUNTIME / "codex-home"
        if backup["selector"] is None: selector.unlink(missing_ok=True)
        else: selector.write_text(backup["selector"])
        brain = RUNTIME / "brain-home"
        if backup["brain_selector"] is None: brain.unlink(missing_ok=True)
        else: brain.write_text(backup["brain_selector"])
        block = backup["cron"].split("# BEGIN agent-sts2 codex-ops", 1)[1].split("# END agent-sts2 codex-ops", 1)[0]
        old = next((line.split("=", 1)[1] for line in block.splitlines() if line.startswith("LEARNER_CODEX_HOME=")), None)
        restored = cron_home(command(["crontab", "-l"]), old)
        p = subprocess.run(["crontab", "-"], input=restored, text=True, capture_output=True)
        (RUNTIME / "session-id").write_text(backup["session"])
        if backup["herdr_ops"] is not None: (RUNTIME / "herdr-ops.json").write_text(backup["herdr_ops"])
        return {"configuration_restored": p.returncode == 0, "admission_still_held": True}

    def bootstrap(self, state):
        target = state["target"]
        message = (f"Roy授权的LLM drain换号接续：你是{target['account']}的新ops会话，不能跨账号resume旧会话。先读 "
                   + target["handoff"] + " 和 notes/core-cycle-main-push-request.json。旧账号在途任务已排空，原队列/租约/源码/失败历史保留。"
                   "当前是受控接管验证轮，LLM_DRAIN/PAUSE仍归切换事务；不要移除或派发，不要停止任何进程。"
                   "核对并保存原交接待办，明确已接管；当前轮只做接管，不把未完成学习或发布记完成。"
                   "控制器将在本轮成功后释放自己拥有的闸，再沿原队列恢复。")
        event = RUNTIME / "queue" / f"{time.time_ns()}-llm-handoff.md"
        event.write_text(message + "\n")
        env = {**os.environ, "LEARNER_CODEX_HOME": target["learner_home"], "CODEX_HOME": target["learner_home"],
               "PATH": str(Path.home() / ".local/node/bin") + ":" + os.environ.get("PATH", "")}
        out = self.transaction.path.parent / "bootstrap.log"
        with out.open("a") as handle:
            # Same scheduler implementation and broker, while this one-shot worker owns wake.lock.
            p = subprocess.Popen(["nice", "-n", "5", "node", "--import", str(ROOT / "agent/node_modules/tsx/dist/loader.mjs"),
                                  str(ROOT / "ops/codex/main.ts"), "wake"], cwd=ROOT, env=env, stdout=handle, stderr=subprocess.STDOUT)
            atomic_json(self.transaction.path.parent / "bootstrap-process.json", {"pid": p.pid, "at": stamp()})
            rc = p.wait()
        if rc: raise RuntimeError(f"new ops bootstrap failed: {rc}; admission remains held")
        session = (RUNTIME / "session-id").read_text().strip()
        if not re.fullmatch(r"[a-f0-9-]{36}", session) or session == state["source"]["session"]:
            raise RuntimeError("new session identity not proven")
        rollouts = list((Path(target["learner_home"]) / "sessions").glob(f"**/*{session}.jsonl"))
        if len(rollouts) != 1: raise RuntimeError("new account rollout not uniquely located")
        return {"ok": True, "target_digest": state["target_digest"], "new_session": session,
                "bootstrap_exit": rc, "rollout": str(rollouts[0]), "runtime_play_and_learning": "awaiting normal dispatch"}


def validate_profile(profile):
    allowed = {"engine", "account", "model", "effort", "service_tier", "learner_home", "brain_home", "handoff"}
    if set(profile) != allowed: raise ValueError("unknown or missing profile field; credentials must never be embedded")
    if not isinstance(profile["account"], str) or not re.fullmatch(r"[a-z0-9_-]+", profile["account"]):
        raise ValueError("account must be a local profile label")
    if profile["engine"] != "codex": raise ValueError("no validated adapter for requested engine")
    # Existing launch policy remains authoritative; this adapter does not silently change its overrides.
    if (profile["model"], profile["effort"], profile["service_tier"]) != ("gpt-6-astra", "xhigh", "default"):
        raise ValueError("requested model policy needs its launcher adapter; no silent substitution")
    for name in ("learner_home", "brain_home"):
        path = Path(profile[name])
        if not re.fullmatch(r"/[A-Za-z0-9_./-]+", str(path)): raise ValueError("invalid login home path")
        if not path.is_absolute() or not (path / "auth.json").is_file(): raise ValueError("target login home unavailable")
        if any((path / f).exists() for f in ("AGENTS.md", "AGENTS.override.md")): raise ValueError("target contains global instructions")
    if not (ROOT / profile["handoff"]).resolve().is_relative_to(ROOT): raise ValueError("handoff is outside repository")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["prepare", "status", "run"])
    parser.add_argument("--id", required=True)
    parser.add_argument("--profile")
    parser.add_argument("--preflight")
    parser.add_argument("--max-wait", type=int, default=21600)
    args = parser.parse_args()
    transaction = Handoff(ROOT, args.id)
    if args.command == "status": print(json.dumps(transaction.read(), ensure_ascii=False, indent=2)); return
    with locked(RUNTIME / "llm-switch.lock"):
        if args.command == "prepare":
            profile = json.loads(Path(args.profile).read_text())
            validate_profile(profile)
            checks = json.loads(Path(args.preflight).read_text())
            if {r.get("role") for r in checks} != {"learner", "brain"} or not all(r.get("check", {}).get("ok") is True for r in checks) \
                    or not all(r.get("home") == profile[r["role"] + "_home"] for r in checks) \
                    or not next(r for r in checks if r["role"] == "learner").get("key_check", {}).get("ok"):
                raise ValueError("preflight is incomplete or belongs to another target")
            session = (RUNTIME / "session-id").read_text().strip()
            old_home = (RUNTIME / "codex-home").read_text().strip() if (RUNTIME / "codex-home").exists() else str(Path.home() / ".codex-sts2")
            old_brain = (RUNTIME / "brain-home").read_text().strip() if (RUNTIME / "brain-home").exists() else str(Path.home() / ".codex-brain")
            state = transaction.prepare({"session": session, "learner_home": old_home, "brain_home": old_brain}, profile,
                                        {"ok": True, "checks": checks, "at": stamp()})
            print(json.dumps(state, ensure_ascii=False)); return
        state = transaction.read()
        if state["phase"] == "complete": print("already complete"); return
        if state["phase"] not in ("prepared", "draining", "ready"):
            raise ValueError("partial activation requires receipt reconciliation; refusing a duplicate bootstrap")
        end = time.monotonic() + args.max_wait
        while True:
            try:
                transaction.begin()
                break
            except BlockingIOError:
                if time.monotonic() >= end: raise
                time.sleep(5)
        previous = None
        while time.monotonic() < end:
            snap = snapshot(state)
            current = transaction.observe(snap)
            summary = (current["phase"], tuple((x["kind"], x["pid"]) for x in snap["active_workers"]), snap["ops_idle"], snap["checkpoint_ready"])
            if summary != previous: print(json.dumps({"phase": current["phase"], "snapshot": snap}, ensure_ascii=False), flush=True); previous = summary
            if current["phase"] == "ready":
                try:
                    with locked(RUNTIME / "wake.lock"), locked(RUNTIME / "learn.lock"), locked(RUNTIME / "assist/assist.lock"):
                        fresh = snapshot(state)
                        adapter = CodexAdapter(transaction)
                        activated = transaction.activate(adapter, fresh)
                    try:
                        with locked(RUNTIME / "wake.lock"):
                            receipt = adapter.bootstrap(activated)
                    except Exception as error:
                        transaction.save(transaction.read(), error_type=type(error).__name__, reconciliation_required=True)
                        raise
                    transaction.verified(receipt)
                    completed_account = activated["target"]["account"]
                    event = RUNTIME / "queue" / f"{time.time_ns()}-llm-resumed.md"
                    event.write_text(f"{completed_account}接管验证已通过；切换事务释放自己拥有的闸后，请沿原队列处理全部交接待办，核对旧局结束/报告及autoplay是否需要通过原broker恢复；新学习和下一局均使用目标隔离home。不要重复领取旧活批，不关闭尚未完成量化父请求；验收后main/push授权保持。请回填真实新brain/learner账号消费回执。\n")
                    completed = transaction.release()
                    subprocess.Popen(["bash", str(ROOT / "ops/codex-ops.sh"), "drain"], cwd=ROOT, start_new_session=True,
                                     stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                     env={**os.environ, "LEARNER_CODEX_HOME": completed["target"]["learner_home"]})
                    print(json.dumps({"phase": "complete", "new_session": receipt["new_session"]}), flush=True)
                    return
                except BlockingIOError:
                    if transaction.read()["phase"] not in ("ready", "draining"):
                        raise
            time.sleep(5)
        transaction.save(transaction.read(), "draining", wait_expired=True)
        raise RuntimeError("drain wait ended; workers untouched, admission remains held; resume this request")


if __name__ == "__main__": main()
