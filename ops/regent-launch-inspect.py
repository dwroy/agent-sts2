"""Bounded, read-only launch metadata for the registered Regent lane. Never launch a game."""
import base64
from datetime import datetime
import json
import os
from pathlib import Path
import re
import subprocess
import sys
from urllib.request import urlopen


REQUEST = "roy-20261013-isolated-character-climb"
ORIGINAL_PID = 34676
BASE_URL = "http://127.0.0.1:8080"
POWERSHELL = "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
GAME_EXE = r"C:\Program Files (x86)\Steam\steamapps\common\Slay the Spire 2\SlayTheSpire2.exe"
HEALTH_FIELDS = ("service", "mod_version", "game_version", "api_host", "api_port", "process_id", "instance_role", "status")

# No caller-supplied shell, path, PID or URL enters this command. Raw argv is never returned.
WINDOWS_QUERY = r'''
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
$ErrorActionPreference='Stop'
$rows=@()
Get-CimInstance Win32_Process -Filter "Name='SlayTheSpire2.exe' AND ProcessId=34676" | ForEach-Object {
  $p=$_
  $rows+=@{
    pid=$p.ProcessId; session_id=$p.SessionId; executable=$p.ExecutablePath
    creation_time=$(if ($p.CreationDate) {$p.CreationDate.ToUniversalTime().ToString('o')} else {$null})
    command_line_available=($null -ne $p.CommandLine)
    flag_names=@([regex]::Matches([string]$p.CommandLine,'(?<!\S)--[A-Za-z][A-Za-z0-9_-]*') | ForEach-Object {$_.Value})
  }
}
ConvertTo-Json -InputObject $rows -Depth 4 -Compress
'''


def lane_guard(root, env):
    root = Path(root).resolve()
    if (env.get("CHARACTER", "").lower() != "regent"
            or Path(env.get("CODEX_OPS_ROOT", "")).resolve() != root
            or Path(env.get("STS2_WORKSPACE", "")).resolve() != root
            or Path(env.get("STS2_LIVE", "")).resolve() != root):
        raise ValueError("inspection is confined to the registered Regent runtime root")
    marker = json.loads((root / "ops/codex-ops/bootstrap-owner.json").read_text())
    if marker.get("request_id") != REQUEST:
        raise ValueError("Regent bootstrap request identity is missing")


def process_metadata(rows):
    if not isinstance(rows, list):
        raise ValueError("Windows process inventory must be an array")
    result = []
    for row in rows:
        if not isinstance(row, dict) or row.get("pid") != ORIGINAL_PID or row.get("executable") != GAME_EXE:
            raise ValueError("Windows process identity differs from the registered original game")
        flags = row.get("flag_names") or []
        if not isinstance(flags, list) or any(not isinstance(v, str) or not re.fullmatch(r"--[A-Za-z][A-Za-z0-9_-]*", v) for v in flags):
            raise ValueError("Windows flag names must contain no argument values")
        result.append({**{key: scalar(row.get(key)) for key in
                         ("pid", "session_id", "executable", "creation_time", "command_line_available")},
                       "flag_names": flags})
    return result


def scalar(value):
    return value if isinstance(value, (str, int, float, bool)) else None


def health_metadata(envelope):
    data = envelope.get("data")
    if (envelope.get("ok") is not True or not isinstance(data, dict)
            or data.get("service") != "sts2-ai-agent" or data.get("process_id") != ORIGINAL_PID
            or data.get("api_port") != 8080):
        raise ValueError("original mod identity does not match the fixed process and endpoint")
    return {key: scalar(data.get(key)) for key in HEALTH_FIELDS}


def state_metadata(envelope):
    data = envelope.get("data")
    if envelope.get("ok") is not True or not isinstance(data, dict):
        raise ValueError("invalid state envelope")
    run = data.get("run") or {}
    session = data.get("session") or {}
    if not isinstance(run, dict) or not isinstance(session, dict):
        raise ValueError("state identity must be an object")
    return {"native_profile_id": scalar(data.get("native_profile_id")), "session_mode": scalar(session.get("mode")),
            "character_id": scalar(run.get("character_id")), "screen": scalar(data.get("screen"))}


def fetch_metadata(route):
    with urlopen(BASE_URL + route, timeout=5) as response:
        return json.load(response)


def inspect():
    result = {"at": datetime.now().astimezone().isoformat(), "request_id": REQUEST,
              "status": "read_only_probe", "new_instance_started": False,
              "independent_solo_launcher_verified": False, "raw_command_line_exported": False,
              "settings_credentials_or_game_binaries_read": False, "errors": []}
    try:
        encoded = base64.b64encode(WINDOWS_QUERY.encode("utf-16-le")).decode()
        child = subprocess.run([POWERSHELL, "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
                               capture_output=True, timeout=15)
        if child.returncode:
            raise ValueError("Windows metadata query failed")
        result["original_processes"] = process_metadata(json.loads(child.stdout.decode("utf-8-sig")))
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        result["errors"].append({"probe": "Windows", "type": type(error).__name__})
    try:
        result["original_health"] = health_metadata(fetch_metadata("/health"))
        result["original_state_identity"] = state_metadata(fetch_metadata("/state"))
    except (OSError, ValueError) as error:
        result["errors"].append({"probe": "mod identity", "type": type(error).__name__})
    return result


def main():
    if len(sys.argv) != 1:
        raise ValueError("regent-launch-inspect accepts no arguments")
    lane_guard(Path(__file__).resolve().parent.parent, os.environ)
    print(json.dumps(inspect(), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, ValueError) as error:
        print("Regent inspection refused: " + str(error), file=sys.stderr)
        sys.exit(2)
