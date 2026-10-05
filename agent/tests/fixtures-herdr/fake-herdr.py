#!/usr/bin/env python3
"""A fake `herdr` CLI for the ops tests (agent/tests/ops-herdr.test.ts): the subset ops/herdr-host.sh and
ops/codex/herdr.ts use, with the same JSON shapes as herdr 0.9.1. State in $FAKE_HERDR_DIR/state.json.

Panes run commands for real (`pane run` starts `bash -c <line>` in its own process group, output to the pane's log);
a pane is busy while that process lives. The fake codex agent (`agent start`) only records its argv; `agent prompt`
appends a turn to the session file $FAKE_HERDR_ROLLOUT unless $FAKE_HERDR_DIR/no-complete exists. Composer text and the
agent status can be set by writing $FAKE_HERDR_DIR/composer and $FAKE_HERDR_DIR/status.
"""
import fcntl
import json
import os
import signal
import subprocess
import sys
import time

D = os.environ["FAKE_HERDR_DIR"]
os.makedirs(D, exist_ok=True)
STATE = os.path.join(D, "state.json")
lock = open(os.path.join(D, "lock"), "w")
fcntl.flock(lock, fcntl.LOCK_EX)
try:
    s = json.load(open(STATE))
except (OSError, ValueError):
    s = {"n": 0, "workspaces": {}, "panes": {}, "agents": {}}
with open(os.path.join(D, "calls.log"), "a") as calls:
    calls.write(json.dumps(sys.argv[1:]) + "\n")


def save():
    json.dump(s, open(STATE + ".tmp", "w"))
    os.replace(STATE + ".tmp", STATE)


def out(kind, **result):
    save()
    print(json.dumps({"id": "cli:" + kind, "result": dict(result, type=kind)}))
    sys.exit(0)


def err(code, message=""):
    save()
    sys.stderr.write(json.dumps({"error": {"code": code, "message": message}}) + "\n")
    sys.exit(1)


def alive(pid):
    try:
        os.kill(pid, 0)
        return True
    except (OSError, TypeError):
        return False


def busy(p):
    return bool(p.get("pid")) and alive(p["pid"])


def pane_info(pid_):
    p = s["panes"][pid_]
    info = {"pane_id": pid_, "workspace_id": p["ws"], "tab_id": p["tab"], "cwd": p["cwd"], "agent_status": "unknown"}
    if p.get("label"):
        info["label"] = p["label"]
    return info


def new_pane(ws, cwd, label):
    s["n"] += 1
    pane = f"{ws}:p{s['n']}"
    s["panes"][pane] = {"ws": ws, "tab": f"{ws}:t{s['n']}", "cwd": cwd, "pid": None, "log": os.path.join(D, f"pane{s['n']}.log")}
    return pane


def opt(args, name, default=None):
    return args[args.index(name) + 1] if name in args else default


def agent_of(target):
    for name, a in s["agents"].items():
        if name == target or a["pane"] == target:
            if a["pane"] in s["panes"]:
                return name, a
    return None, None


def agent_json(name, a):
    status = open(os.path.join(D, "status")).read().strip() if os.path.exists(os.path.join(D, "status")) else a.get("status", "idle")
    return {"agent": "codex", "name": name, "pane_id": a["pane"], "agent_status": status}


args = sys.argv[1:]
group, cmd, rest = (args + ["", ""])[0], (args + ["", ""])[1], args[2:]

if group == "workspace" and cmd == "list":
    out("workspace_list", workspaces=[{"workspace_id": w, "label": v["label"]} for w, v in s["workspaces"].items()])
if group == "workspace" and cmd == "create":
    ws = f"w{len(s['workspaces']) + 1}"
    s["workspaces"][ws] = {"label": opt(rest, "--label", "")}
    root = new_pane(ws, opt(rest, "--cwd", "/"), None)
    out("workspace_created", workspace={"workspace_id": ws, "label": s["workspaces"][ws]["label"]}, root_pane=pane_info(root))
if group == "tab" and cmd == "create":
    ws = opt(rest, "--workspace")
    if ws not in s["workspaces"]:
        err("workspace_not_found")
    pane = new_pane(ws, opt(rest, "--cwd", "/"), None)
    out("tab_created", tab={"tab_id": s["panes"][pane]["tab"], "label": opt(rest, "--label")}, root_pane=pane_info(pane))
if group == "pane" and cmd in ("get", "rename", "close", "run", "read", "send-keys"):
    pane = rest[0]
    if pane not in s["panes"]:
        err("pane_not_found", pane)
    p = s["panes"][pane]
    if cmd == "get":
        out("pane_info", pane=pane_info(pane))
    if cmd == "rename":
        p["label"] = rest[1]
        out("pane_info", pane=pane_info(pane))
    if cmd == "close":
        if busy(p):
            os.killpg(p["pid"], signal.SIGHUP)
        del s["panes"][pane]
        out("ok")
    if cmd == "run":
        env = dict(os.environ, HERDR_ENV="1", HERDR_PANE_ID=pane)
        log = open(p["log"], "a")
        log.write("$ " + rest[1] + "\n")
        log.flush()
        proc = subprocess.Popen(["bash", "-c", rest[1]], cwd=p["cwd"], env=env, stdin=subprocess.DEVNULL, stdout=log, stderr=log, start_new_session=True)
        p["pid"] = proc.pid
        out("ok")
    if cmd == "read":
        if "--format" in rest and opt(rest, "--format") == "ansi":
            text = open(os.path.join(D, "composer")).read() if os.path.exists(os.path.join(D, "composer")) else ""
            screen = "\x1b[0m\x1b[1m› \x1b[0m" + (text if text else "\x1b[2mAsk Codex to do anything\x1b[0m")
            save()
            print("header\n\n" + screen + "\n\n  model line")
            sys.exit(0)
        save()
        print(open(p["log"]).read() if os.path.exists(p["log"]) else "")
        sys.exit(0)
    if cmd == "send-keys":
        if busy(p) and "ctrl+c" in rest[1:]:
            os.killpg(p["pid"], signal.SIGINT)
        out("ok")
if group == "pane" and cmd == "process-info":
    pane = opt(rest, "--pane")
    if pane not in s["panes"]:
        err("pane_not_found", pane)
    p = s["panes"][pane]
    shell = 1000
    fg = p["pid"] if busy(p) else shell
    procs = [{"pid": fg, "name": "bash" if fg == shell else "job"}]
    out("pane_process_info", process_info={"pane_id": pane, "shell_pid": shell, "foreground_process_group_id": fg, "foreground_processes": procs})
if group == "pane" and cmd == "list":
    ws = opt(rest, "--workspace")
    out("pane_list", panes=[pane_info(k) for k, v in s["panes"].items() if ws is None or v["ws"] == ws])

if group == "agent" and cmd == "get":
    name, a = agent_of(rest[0])
    if not a:
        err("agent_not_found", rest[0])
    out("agent_info", agent=agent_json(name, a))
if group == "agent" and cmd == "start":
    name, pane = rest[0], opt(rest, "--pane")
    if pane not in s["panes"]:
        err("pane_not_found", pane)
    if os.path.exists(os.path.join(D, "start-blocked")):
        err("agent_not_ready", "blocked at startup")
    argv = rest[rest.index("--") + 1:] if "--" in rest else []
    s["agents"][name] = {"pane": pane, "argv": argv, "status": "idle", "prompts": 0}
    out("agent_started", agent=agent_json(name, s["agents"][name]), argv=["codex"] + argv)
if group == "agent" and cmd == "send-keys":
    name, a = agent_of(rest[0])
    if not a:
        err("agent_not_found", rest[0])
    a.setdefault("keys", []).extend(rest[1:])
    if "ctrl+c" in rest[1:] and not os.path.exists(os.path.join(D, "composer")):
        del s["agents"][name]  # ctrl+c on an empty composer quits codex
    out("ok")
if group == "agent" and cmd == "prompt":
    name, a = agent_of(rest[0])
    if not a:
        err("agent_not_found", rest[0])
    if open(os.path.join(D, "status")).read().strip() == "blocked" if os.path.exists(os.path.join(D, "status")) else False:
        err("agent_blocked")
    a["prompts"] += 1
    text = rest[1]
    rollout = os.environ.get("FAKE_HERDR_ROLLOUT")
    if rollout:
        turn = f"turn-{a['prompts']}"
        rows = [
            {"type": "event_msg", "payload": {"type": "task_started", "turn_id": turn}},
            {"type": "response_item", "payload": {"type": "message", "role": "user", "content": [{"type": "input_text", "text": text}]}},
            {"type": "token_usage_record", "payload": {"turn_id": turn, "turn_token_usage": {"input_tokens": 1000, "cached_input_tokens": 800, "cache_write_input_tokens": 0, "output_tokens": 50, "reasoning_output_tokens": 10}}},
            {"type": "event_msg", "payload": {"type": "token_count", "info": {"last_token_usage": {"input_tokens": 1000}, "model_context_window": 258400}}},
        ]
        if not os.path.exists(os.path.join(D, "no-complete")):
            rows.append({"type": "event_msg", "payload": {"type": "task_complete", "turn_id": turn, "last_agent_message": f"handled {a['prompts']}"}})
        with open(rollout, "a") as f:
            for row in rows:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
    out("agent_prompted", agent=agent_json(name, a))

err("unknown_command", " ".join(args))
