"""Gate batch finish and pane retirement on persisted native/session/output receipts."""
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys


def digest(path):
    value = hashlib.sha256()
    with open(path, "rb") as source:
        for block in iter(lambda: source.read(256 * 1024), b""):
            value.update(block)
        os.fsync(source.fileno())
    return value.hexdigest()


def stopped(receipt):
    pid, original = receipt.get("pid"), receipt.get("birth")
    if type(pid) is not int or pid <= 1 or not original:
        return False
    try:
        fields = Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
        return fields[0] in ("Z", "X") or fields[19] != original
    except FileNotFoundError:
        return True
    except (OSError, IndexError):
        return False


def prompt_hash(text):
    return hashlib.sha256(text.replace("\r\n", "\n").rstrip().encode()).hexdigest()


def bootstrap_context(row, cwd):
    """Only the observed two-part Codex bootstrap item; task/user events are never context."""
    p = row.get("payload", {})
    parts = p.get("content")
    if (row.get("type") != "response_item" or p.get("type") != "message" or p.get("role") != "user"
            or not isinstance(parts, list) or len(parts) != 2
            or any(not isinstance(part, dict) or part.get("type") != "input_text"
                   or not isinstance(part.get("text"), str) for part in parts)):
        return False
    instructions, environment = (part["text"].replace("\r\n", "\n") for part in parts)
    match = re.match(r"^<environment_context>\n[ \t]*<cwd>([^<\n]+)</cwd>\n", environment)
    return (instructions.startswith(f"# AGENTS.md instructions for {cwd}\n\n<INSTRUCTIONS>\n")
            and instructions.endswith("\n</INSTRUCTIONS>") and instructions.count("</INSTRUCTIONS>") == 1
            and environment.startswith("<environment_context>\n") and environment.endswith("\n</environment_context>")
            and environment.count("<environment_context>") == 1 and environment.count("<cwd>") == 1
            and match is not None and match[1] == cwd)


def verify_native(receipt):
    """Reconstruct one-use native turn bindings from the journaled prompts, never a later human answer."""
    result = receipt["result"]
    bindings = receipt.get("bindings", [])
    submissions = receipt.get("submissions", [])
    if not receipt.get("submitted"):
        if result.get("code") == 0 or bindings:
            raise ValueError("unsubmitted batch cannot complete")
        return
    if not bindings or len(submissions) != len(bindings):
        raise ValueError("not every journaled prompt has native acceptance")
    expected = {item["marker"]: item["prompt_sha256"] for item in submissions}
    turns = {item["turn_id"]: item for item in bindings}
    if len(expected) != len(submissions) or len(turns) != len(bindings):
        raise ValueError("reused prompt marker or native turn")
    if any(expected.get(item["marker"]) != item["prompt_sha256"] for item in bindings):
        raise ValueError("native binding lacks a matching sent prompt")
    if [item["marker"] for item in bindings] != [item["marker"] for item in submissions]:
        raise ValueError("native continuation order differs from dispatch")
    meta, cwd, current, complete = None, None, None, None
    active = False
    accepted = False
    seen = []
    used = set()
    preludes = []
    pending_prelude = None
    context_seen = False
    with open(result["rollout"]) as source:
        for line in source:
            if not line.endswith("\n"):
                raise ValueError("native record is not durably complete")
            row = json.loads(line)
            payload = row.get("payload", {})
            if row.get("type") == "session_meta":
                meta, cwd = payload.get("id"), payload.get("cwd")
                if meta != result.get("session") or cwd != receipt.get("cwd"):
                    raise ValueError("native session identity changed")
            if row.get("type") == "event_msg" and payload.get("type") == "task_started":
                if pending_prelude:
                    raise ValueError("bootstrap context never received its matching turn_context")
                context_seen = False
                current = payload.get("turn_id")
                # An explicitly resumed session can have earlier history before this dispatch.
                active = active or current == bindings[0]["turn_id"]
                if active:
                    if current not in turns or current in seen:
                        raise ValueError("unbound or replayed native turn")
                    seen.append(current)
                complete, accepted = None, False
            if not active:
                continue
            # The active dispatch boundary was established above; older resume history stays outside it.
            if (not accepted
                    and row.get("type") == "response_item"
                    and (re.search(r"_call(?:_output)?$", str(payload.get("type"))) or payload.get("type") == "reasoning"
                         or (payload.get("type") == "message" and payload.get("role") == "assistant"))):
                raise ValueError("native activity precedes the dispatched prompt")
            if row.get("type") == "turn_context":
                if payload.get("turn_id") != current or payload.get("cwd") != cwd:
                    raise ValueError("native turn context identity changed")
                context_seen = True
                if pending_prelude:
                    preludes.append(pending_prelude)
                    pending_prelude = None
            user = None
            if row.get("type") == "event_msg" and payload.get("type") == "user_message":
                user = payload.get("message", "")
            if row.get("type") == "response_item" and payload.get("type") == "message" and payload.get("role") == "user":
                user = "\n".join(str(part.get("text", "")) for part in payload.get("content", []))
            if user is not None:
                if (meta and cwd and len(seen) == 1 and not accepted and not used and not preludes
                        and not pending_prelude and not context_seen and bootstrap_context(row, cwd)):
                    pending_prelude = {"turn_id": current, "cwd": cwd, "sha256": prompt_hash(user)}
                    continue
                if pending_prelude:
                    raise ValueError("dispatched prompt precedes bootstrap turn_context")
                binding = turns.get(current, {})
                marker = user.replace("\r\n", "\n").split("\n")[0]
                if marker != binding.get("marker") or prompt_hash(user) != binding.get("prompt_sha256"):
                    raise ValueError("native user input is not the dispatched prompt")
                if not accepted and marker in used:
                    raise ValueError("prompt marker was consumed by another turn")
                used.add(marker)
                accepted = True
            if row.get("type") == "event_msg" and payload.get("type") in ("task_complete", "turn_aborted"):
                if payload.get("turn_id") == current:
                    complete = payload.get("last_agent_message") if payload.get("type") == "task_complete" and accepted else None
    if (meta != result.get("session") or cwd != receipt.get("cwd") or not accepted
            or current != result.get("turn") or seen != [item["turn_id"] for item in bindings]
            or len(used) != len(submissions)):
        raise ValueError("final native turn is not bound to this dispatch")
    if pending_prelude or (preludes and receipt.get("native_context_version") != 1) or receipt.get("native_preludes", []) != preludes:
        raise ValueError("native bootstrap proof differs from the original dispatch")
    if result.get("code") == 0 and (not complete or complete != result.get("message")):
        raise ValueError("matching native task completion is missing")


def verify(path, output):
    receipt = json.loads(Path(path).read_text())
    if "agent_name" in receipt or "agent_name_version" in receipt:
        binding = json.dumps([receipt["label"], receipt["pane"], os.path.abspath(receipt["cwd"])],
                             ensure_ascii=False, separators=(",", ":"))
        expected = "learner-" + hashlib.sha256(binding.encode()).hexdigest()[:24]
        if receipt.get("agent_name_version") != 1 or receipt.get("agent_name") != expected:
            raise ValueError("native agent name is not bound to the original pane/label/cwd")
    result = receipt.get("result", {})
    if receipt.get("state") == "not-started" and result.get("code") == 3 and receipt.get("models_started") == 0:
        digest(output)
        return receipt
    artifacts = receipt.get("artifacts", {})
    if (receipt.get("state") != "session-ended" or receipt.get("retirement_authorized") is not True
            or not result.get("stopped") or not stopped(receipt)
            or not artifacts.get("summary") or digest(artifacts["log"]) != artifacts.get("sha256")):
        raise ValueError("native session retirement or original learner log is unverified")
    last = None
    with open(artifacts["log"]) as source:
        for line in source:
            row = json.loads(line)
            if row.get("type") == "learner_summary":
                last = row
    if (not last or last.get("exit_code") != result.get("code")
            or last.get("summary", {}).get("sessionId") != result.get("session")):
        raise ValueError("matching learner summary is missing")
    verify_native(receipt)
    if not Path(output).is_file() or Path(output).stat().st_size == 0:
        raise ValueError("original batch output is missing")
    receipt["output"] = {"path": str(output), "sha256": digest(output)}
    artifacts["out_pending_wrapper_flush"] = False
    Path(path).write_text(json.dumps(receipt) + "\n")
    with open(path) as source:
        os.fsync(source.fileno())
    return receipt


def close(root, state, batch, path, output):
    receipt = verify(path, output)
    value = json.loads(Path(state).read_text())["batches"][batch]
    if (value.get("state") not in ("done", "failed", "rejected")
            or value.get("rc") != receipt["result"].get("code") or value.get("rc") == 75):
        raise ValueError("batch has not reached a verified original finish transaction")
    herdr = os.environ.get("HERDR_BIN", "herdr")
    pane = receipt["pane"]
    info = json.loads(subprocess.check_output([herdr, "pane", "get", pane]))["result"]["pane"]
    if any(info.get(k) != receipt["identity"].get(k) for k in ("pane_id", "label", "tab_id", "terminal_id", "workspace_id")):
        raise ValueError("pane identity changed; retain it")
    process = json.loads(subprocess.check_output([herdr, "pane", "process-info", "--pane", pane]))["result"]["process_info"]
    if process["shell_pid"] != process["foreground_process_group_id"]:
        raise ValueError("pane is active; retain it")
    subprocess.run(["bash", str(Path(root) / "ops/herdr-host.sh"), "close", receipt["label"],
                    "--pane", pane, "--require-idle"], check=True)


def main(argv):
    try:
        if argv[0] == "verify" and len(argv) == 3:
            verify(*argv[1:])
        elif argv[0] == "close" and len(argv) == 6:
            close(*argv[1:])
        else:
            return 2
        return 0
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError):
        sys.stderr.write("learner TUI receipt/retirement gate deferred; preserve original batch and pane\n")
        return 75


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
