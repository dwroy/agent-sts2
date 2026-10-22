"""Gate batch finish and pane retirement on persisted native/session/output receipts."""
import hashlib
import json
import os
from pathlib import Path
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


def verify(path, output):
    receipt = json.loads(Path(path).read_text())
    result = receipt.get("result", {})
    if receipt.get("state") == "not-started" and result.get("code") == 3 and receipt.get("models_started") == 0:
        digest(output)
        return receipt
    artifacts = receipt.get("artifacts", {})
    if (receipt.get("state") != "session-ended" or not result.get("stopped") or not stopped(receipt)
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
    if result.get("code") == 0:
        # Native completion remains the authority even if a supervisor returns zero.
        meta = None
        complete = None
        current = None
        with open(result["rollout"]) as source:
            for line in source:
                row = json.loads(line)
                payload = row.get("payload", {})
                if row.get("type") == "session_meta":
                    meta = payload.get("id")
                if row.get("type") == "event_msg" and payload.get("type") == "task_started":
                    current = payload.get("turn_id")
                    complete = None
                if (row.get("type") == "event_msg" and payload.get("type") == "task_complete"
                        and payload.get("turn_id") == result.get("turn") == current):
                    complete = payload.get("last_agent_message")
                if row.get("type") == "event_msg" and payload.get("type") == "turn_aborted":
                    complete = None
        if meta != result.get("session") or not complete or complete != result.get("message"):
            raise ValueError("matching native task completion is missing")
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
    if any(info.get(k) != receipt["identity"].get(k) for k in ("pane_id", "label", "tab_id", "terminal_id")):
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
