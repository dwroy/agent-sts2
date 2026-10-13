"""Check a pinned local game before ops reads or mutates it."""
import json
import os
import sys
from urllib.parse import urlsplit
from urllib.request import urlopen


def validate_health(health, url, expected_pid):
    port = urlsplit(url).port or (443 if urlsplit(url).scheme == "https" else 80)
    if (health.get("service") != "sts2-ai-agent" or health.get("process_id") != expected_pid
            or health.get("api_port") != port):
        raise ValueError("instance process or API port does not match the pinned endpoint")


def validate_profile(state, expected_profile):
    actual = state.get("native_profile_id")
    if expected_profile is not None and (actual is None or str(actual) != expected_profile):
        raise ValueError("native save profile does not match the pinned instance")


def fetch_data(url):
    with urlopen(url, timeout=5) as response:
        value = json.load(response)
    if value.get("ok") is not True or not isinstance(value.get("data"), dict):
        raise ValueError("instance returned an invalid mod envelope")
    return value["data"]


def main():
    raw_pid = os.environ.get("STS2_EXPECTED_PROCESS_ID")
    profile = os.environ.get("STS2_EXPECTED_NATIVE_PROFILE_ID")
    if raw_pid is None:
        if profile is not None:
            raise ValueError("profile binding requires an expected process ID")
        return 0
    pid = int(raw_pid)
    if not 1 <= pid <= 2147483647:
        raise ValueError("expected process ID is invalid")
    url = (sys.argv[1] if len(sys.argv) == 2 else os.environ.get("STS2_BASE_URL", "")).rstrip("/")
    if not url:
        raise ValueError("pinned instance requires an explicit mod URL")
    health = fetch_data(url + "/health")
    validate_health(health, url, pid)
    if profile is not None:
        validate_profile(fetch_data(url + "/state"), profile)
    print(json.dumps({"status": "instance_verified", "process_id": pid, "base_url": url,
                      "native_profile_id": profile}))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError) as error:
        print("instance admission refused: " + str(error), file=sys.stderr)
        sys.exit(78)
