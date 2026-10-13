"""Load only nonsecret, durable game bindings for one workspace."""
import json
from pathlib import Path
import shlex
import sys
from urllib.parse import urlsplit


def binding_env(value):
    if not isinstance(value, dict):
        raise ValueError("instance binding must be an object")
    pid = value.get("process_id")
    url = value.get("base_url")
    if type(pid) is not int or not 1 <= pid <= 2147483647 or not isinstance(url, str):
        raise ValueError("instance binding requires a positive PID and explicit URL")
    parsed = urlsplit(url)
    if (parsed.scheme != "http" or parsed.hostname != "127.0.0.1" or parsed.username
            or parsed.password or parsed.path not in ("", "/") or parsed.query or parsed.fragment
            or parsed.port is None):
        raise ValueError("instance URL must be a fixed local HTTP port")
    result = {"STS2_BASE_URL": url.rstrip("/"), "CODEX_OPS_MOD_URL": url.rstrip("/"),
              "STS2_EXPECTED_PROCESS_ID": str(pid)}
    profile = value.get("native_profile_id")
    if type(profile) not in (str, int) or not str(profile).isalnum():
        raise ValueError("instance binding requires a native profile identifier")
    result["STS2_EXPECTED_NATIVE_PROFILE_ID"] = str(profile)
    return result


def main():
    if len(sys.argv) != 2:
        raise ValueError("requires the fixed workspace binding file")
    value = json.loads(Path(sys.argv[1]).read_text())
    for key, value in binding_env(value).items():
        print("export " + key + "=" + shlex.quote(value))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError):
        print("invalid workspace instance binding; admission refused", file=sys.stderr)
        sys.exit(78)
