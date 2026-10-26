"""Account-bound admission from the existing subscription sampler; no model/read loop."""
import hashlib
import json
import math
import os
from datetime import datetime
from pathlib import Path
import shutil
import time


def selected_home(directory):
    explicit = os.environ.get("LEARNER_CODEX_HOME") or os.environ.get("CODEX_HOME")
    if explicit:
        return explicit
    selector = Path(directory, "codex-home")
    return selector.read_text().strip() if selector.exists() else str(Path.home() / ".codex")


def epoch(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def snapshot(root, directory, *, now=None):
    now = time.time() if now is None else now
    result = {"schema": "external-learning-policy-v1", "workers": 0, "service_tier": None,
              "weekly_used_percent": None, "sample_observed_at": None, "reason": "weekly_unknown"}
    try:
        sample = json.loads(Path(directory, "subscription-usage.json").read_bytes())
        digest = hashlib.sha256(selected_home(directory).encode()).hexdigest()
        observed = epoch(sample["sample_observed_at"])
        weekly = [w for w in sample["windows"] if w["kind"] == "weekly" and w["window_minutes"] == 10080]
        if (sample.get("schema_version") != 1 or sample.get("provider") != "codex"
                or sample.get("account_home_sha256") != digest or sample.get("freshness") != "fresh"
                or not 0 <= now - observed <= 600 or not weekly
                or any(type(w["used_percent"]) not in (int, float) or not math.isfinite(w["used_percent"])
                       or not 0 <= w["used_percent"] <= 100 or w.get("stale") is not False
                       or (w.get("resets_at") and epoch(w["resets_at"]) <= now) for w in weekly)):
            return result
        used = max(w["used_percent"] for w in weekly)
        result.update(weekly_used_percent=used, sample_observed_at=sample["sample_observed_at"],
                      account_home_sha256=digest, workers=0 if used >= 90 else 2 if used > 70 else 4,
                      service_tier="fast" if used > 70 else "ultrafast",
                      reason="switch_codex1" if used >= 90 else "weekly_over_70" if used > 70 else "weekly_within_70")
    except (OSError, ValueError, KeyError, TypeError, AttributeError, OverflowError):
        return result
    return result


def external_disk_allowed(root):
    try:
        return shutil.disk_usage(root).free > 80 * (1 << 30)
    except OSError:
        return False


def four_lane_mode(state, root, alive):
    import strategy_external_jobs
    directory = os.environ.get("CODEX_OPS_DIR") or str(Path(root, "ops/codex-ops"))
    return bool(strategy_external_jobs.lane_owners(state, alive, directory)) or strategy_external_jobs.ready(state, root)


def own_busy(state, alive, directory=None):
    """Keep one own-game compute lane; pending review is independently retained."""
    return own_status(state, alive, directory)["busy"]


def own_status(state, alive, directory=None):
    from own_learning_slot import snapshot as own_snapshot
    return own_snapshot(state, alive, directory)


def request_switch(state, directory, policy):
    """Original ops owns preflight, drain and activation; never rewrite selectors here."""
    if policy["reason"] != "switch_codex1":
        return
    identity = policy["account_home_sha256"]
    if state.get("external_switch_requested") == identity:
        return
    folder = Path(directory, "queue")
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / (str(time.time_ns()) + "-external-codex1-switch.md")
    path.write_text("#56 周用量达到90%，已拒绝新外部学习。请原ops沿已授权llm_switch事务预检codex1、排空、切换及验证；"
                    "保留原任务/租约/失败与其他角色会话，不跨账号resume。外部准入待新账号统一额度快照。\n")
    state["external_switch_requested"] = identity
