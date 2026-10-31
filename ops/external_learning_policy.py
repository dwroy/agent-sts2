"""Account-bound admission from the existing subscription sampler; no model/read loop."""
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
    from learning_concurrency import limits
    selected = limits(root, directory, now=now)
    return dict(schema="external-learning-policy-v1", workers=selected["external_limit"],
                admission="learning-concurrency-v1",
                service_tier="default", weekly_used_percent=selected["weekly_used_percent"],
                sample_observed_at=selected["sample_observed_at"], reason=selected["reason"],
                account_home_sha256=selected["account_home_sha256"])


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
    from learning_concurrency import allowed
    directory = directory or os.environ.get("CODEX_OPS_DIR") or str(Path(__file__).resolve().parent / "codex-ops")
    return not allowed(state, Path(directory).parent.parent, alive, directory=directory)


def own_status(state, alive, directory=None):
    from own_learning_slot import snapshot as own_snapshot
    return own_snapshot(state, alive, directory)


def request_switch(state, directory, policy):
    """Retained call interface; learning quota no longer requests account switches."""
    return None
