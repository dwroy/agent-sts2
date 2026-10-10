"""Display a registered learner's logs beside ops without touching the learner."""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time


def main(batch):
    if not re.fullmatch(r"[0-9]{8}-[0-9]{6}(?:-(?:experience-update|fix-batch|strategy-proposal)|-s2-strategy-proposal)?", batch):
        raise ValueError("invalid learner batch")
    root = Path(os.environ.get("CODEX_OPS_ROOT", Path(__file__).resolve().parent.parent))
    state = Path(os.environ.get("CODEX_OPS_DIR", root / "ops/codex-ops"))
    record = json.loads((state / "learn.json").read_text())["batches"].get(batch)
    if not isinstance(record, dict):
        raise ValueError("learner batch is not registered")
    pid = record.get("pid")
    if record.get("state") != "running" or type(pid) is not int or pid <= 1:
        raise ValueError("learner batch is not currently running")
    # Bind the registered PID to this batch's actual wrapper before opening any tab.
    command = Path(f"/proc/{pid}/cmdline").read_bytes().rstrip(b"\0").split(b"\0")
    learner_label = "learner-" + batch
    if re.fullmatch(r"[0-9]{8}-[0-9]{6}", batch):
        learner_label += "-postmortem"
    wrapper = len(command) >= 3 and Path(os.fsdecode(command[0])).name == "bash"
    wrapper = wrapper and (
        (command[1].endswith(b"/ops/herdr-exec.sh") and command[2] == learner_label.encode())
        or (command[1].endswith(b"/ops/codex-ops-learner.sh") and command[2] == batch.encode())
    )
    if not wrapper:
        raise ValueError("registered learner PID does not identify this batch's live wrapper")
    os.kill(pid, 0)
    registry = json.loads((state / "herdr.json").read_text())
    ops_pane = registry.get("panes", {}).get("ops", {}).get("pane_id")
    if not ops_pane:
        raise ValueError("ops pane is not registered")
    herdr = os.environ.get("HERDR_BIN") or shutil.which("herdr") or str(Path.home() / ".local/bin/herdr")
    if not shutil.which(herdr):
        raise ValueError("herdr is unavailable")

    def info(pane):
        response = subprocess.run([herdr, "pane", "get", pane], capture_output=True, text=True, timeout=10, check=True)
        return json.loads(response.stdout)["result"]["pane"]

    ops = info(ops_pane)
    if ops.get("label") != "ops" or not ops.get("workspace_id"):
        raise ValueError("registered ops pane identity does not match")
    logs = [state / "learner" / (batch + suffix) for suffix in (".out", ".err")]
    for log in logs:
        if not log.is_file() or log.is_symlink():
            raise ValueError("registered learner log is missing or is a symlink")
    label = "learner-log-" + batch
    pidfile = state / "learner" / (label + ".pid")
    host = root / "ops/herdr-host.sh"
    env = dict(os.environ, HERDR_HOST_STATE=str(state / "herdr.json"), HERDR_HOST_CWD=str(root))
    existing = registry.get("panes", {}).get(label, {}).get("pane_id")
    if existing:
        try:
            view = info(existing)
        except subprocess.CalledProcessError:
            view = {}
        if view.get("label") == label:
            status = subprocess.run(["bash", str(host), "status", "--json"], capture_output=True, text=True, timeout=20, env=env, check=True)
            if any(row["label"] == label and row["busy"] for row in json.loads(status.stdout)):
                if view.get("workspace_id") != ops["workspace_id"]:
                    raise ValueError("existing viewer is busy in another workspace; refusing a duplicate")
                pane = existing
            else:
                pane = None
        else:
            pane = None
    else:
        pane = None
    launched = pane is None
    if launched:
        # GNU tail exits when the verified learner wrapper exits; herdr then closes its viewer.
        args = ["bash", str(host), "run", label, "--pidfile", str(pidfile), "--close-on-exit"]
        args += ["--", "tail", "-n", "80", f"--pid={pid}", "-F", "--", *map(str, logs)]
        result = subprocess.run(args, capture_output=True, text=True, timeout=30, env=env, check=True)
        parts = result.stdout.strip().split()
        if len(parts) != 2 or not parts[1].isdigit():
            raise ValueError("unexpected viewer launch receipt; inspect before retrying")
        pane = parts[0]
    view = info(pane)
    if view.get("label") != label or view.get("workspace_id") != ops["workspace_id"]:
        raise ValueError("viewer placement verification failed")
    for attempt in range(10):
        screen = subprocess.run([herdr, "pane", "read", pane, "--source", "recent-unwrapped", "--lines", "120"], capture_output=True, text=True, timeout=10, check=True)
        if f"==> {logs[1]} <==" in screen.stdout or (not launched and screen.stdout.strip()):
            break
        if attempt < 9:
            time.sleep(0.2)
    if not screen.stdout.strip() or (launched and f"==> {logs[1]} <==" not in screen.stdout):
        raise ValueError("viewer opened but log output is not yet verified; inspect the existing pane")
    receipt = {"batch": batch, "pane": pane, "tab": view.get("tab_id"), "workspace": view["workspace_id"], "ops_pane": ops_pane, "label": label, "logs": list(map(str, logs)), "screen": screen.stdout, "learner_restarted": False}
    print(json.dumps(receipt, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main(sys.argv[1] if len(sys.argv) == 2 else "")
    except (ValueError, OSError, subprocess.SubprocessError, KeyError) as error:
        print(f"learner-log-tab: {error}", file=sys.stderr)
        sys.exit(1)
