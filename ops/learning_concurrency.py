"""Learning-only admission under learn.lock; never consumes developer or heavy leases."""
import hashlib
import json
import math
import os
from pathlib import Path
import time

DEFAULTS = dict(own_slots=1, external_slots=4, total_limit=5)


def configuration(root):
    path = Path(root, ".agents/board.yaml")
    if not path.exists():
        return dict(DEFAULTS, configured=False, valid=True)
    try:
        try:
            import yaml
        except ImportError:
            data = json.loads(path.read_bytes())
        else:
            try:
                data = yaml.safe_load(path.read_bytes())
            except yaml.YAMLError as error:
                raise ValueError("invalid board YAML") from error
        if not isinstance(data, dict):
            raise ValueError("board must be a mapping")
        values = data.get("learning", {})
        if not isinstance(values, dict) or set(values) - set(DEFAULTS):
            raise ValueError("invalid learning section")
        selected = {**DEFAULTS, **values}
        if any(type(v) is not int or not (1 if k == "total_limit" else 0) <= v <= 10
               for k, v in selected.items()):
            raise ValueError("invalid learning limits")
        return dict(selected, configured="learning" in data, valid=True)
    except (OSError, ValueError, TypeError):
        return dict(own_slots=0, external_slots=0, total_limit=0, configured=True, valid=False)


def limits(root, directory, *, now=None):
    from external_learning_policy import selected_home, epoch
    now = time.time() if now is None else now
    config = configuration(root)
    try:
        digest = hashlib.sha256(selected_home(directory).encode()).hexdigest()
    except (OSError, ValueError):
        digest = None
    result = dict(config, account_home_sha256=digest, weekly_used_percent=None,
                  sample_observed_at=None, reason="weekly_unknown", downgraded=True)
    try:
        sample = json.loads(Path(directory, "subscription-usage.json").read_bytes())
        weekly = [w for w in sample["windows"] if w.get("bucket") == "codex/primary"
                  and w.get("kind") == "weekly" and w.get("window_minutes") == 10080]
        if (digest is None or type(sample.get("schema_version")) is not int or sample["schema_version"] != 1 or sample.get("provider") != "codex"
                or sample.get("account_home_sha256") != digest or sample.get("freshness") != "fresh"
                or not 0 <= now - epoch(sample["sample_observed_at"]) <= 600 or len(weekly) != 1):
            raise ValueError("unknown weekly window")
        window = weekly[0]
        used = window["used_percent"]
        if (type(used) not in (int, float) or not math.isfinite(used) or not 0 <= used <= 100
                or window.get("stale") is not False
                or (window.get("resets_at") and epoch(window["resets_at"]) <= now)):
            raise ValueError("invalid weekly usage")
        result.update(weekly_used_percent=used, sample_observed_at=sample["sample_observed_at"],
                      downgraded=used >= 70, reason="weekly_ge_70" if used >= 70 else "weekly_within_70")
    except (OSError, ValueError, KeyError, TypeError, AttributeError, OverflowError):
        pass
    result["effective_total"] = min(config["total_limit"], 4 if result["downgraded"] else 10)
    # Preserve the own reservation even when external starts before ordinary writers.
    result["external_limit"] = min(config["external_slots"],
                                   max(0, result["effective_total"] - config["own_slots"]))
    if not config["valid"]:
        result["reason"] = "invalid_learning_config"
    return result


def occupancy(state, alive, directory):
    from own_learning_slot import snapshot
    from strategy_external_jobs import lane_owners
    alive_owner = lambda pid: type(pid) is int and pid > 0 and alive(pid)
    own = snapshot(state, alive_owner, directory)
    # The original audit has both a batch and a request/file lease, but one owner.
    batch_ids = {b["batch"] for b in own["blockers"] if "batch" in b}
    audits = state.get("ascension_audits", {})
    audit_keys = {key for bid in batch_ids for row in [state["batches"][bid]]
                  for key in [row.get("audit_key")] if key in audits
                  and audits[key].get("batch") == bid and audits[key].get("pid") == row.get("pid")}
    blockers = [b for b in own["blockers"] if "batch" in b or b.get("request") not in audit_keys]
    external = lane_owners(state, alive_owner, directory)
    running = sum(b.get("state") == "running" and alive_owner(b.get("pid"))
                  for b in state["batches"].values())
    return dict(own=len(blockers), external=len(external), total=len(blockers) + len(external),
                running=running, own_status=own)


def projection(state, root, alive, directory=None):
    directory = directory or os.environ.get("CODEX_OPS_DIR") or str(Path(root, "ops/codex-ops"))
    return dict(limits(root, directory), occupied=occupancy(state, alive, directory))


def allowed(state, root, alive, *, external=False, directory=None):
    selected = projection(state, root, alive, directory)
    occupied = selected["occupied"]
    if occupied["total"] >= selected["effective_total"]:
        return False
    if external:
        return occupied["external"] < selected["external_limit"]
    # Without a learning section, retain the no-external legacy ordinary pipeline.
    from external_learning_policy import four_lane_mode
    limited = selected["configured"] or four_lane_mode(state, root, alive)
    return not limited or occupied["own"] < selected["own_slots"]


def report(state, root, directory, alive, *, now=None):
    """Called by the original tick under learn.lock, including candidate-only ticks."""
    now = time.time() if now is None else now
    previous = state.get("learning_concurrency_report", {})
    watermark = Path(directory, "learning-concurrency-report.json")
    try:
        saved = json.loads(watermark.read_bytes())
        if (isinstance(saved, dict) and type(saved.get("at")) in (int, float) and math.isfinite(saved["at"])
                and isinstance(saved.get("id"), str) and len(saved["id"]) == 20
                and all(c in "0123456789abcdef" for c in saved["id"])
                and saved["at"] >= previous.get("at", float("-inf"))):
            previous = saved
    except (OSError, ValueError, TypeError):
        pass
    def remember(record):
        # Drain tick keeps learn.json byte-identical; only report metadata is persisted here.
        temporary = watermark.with_suffix(".tmp")
        with temporary.open("w") as handle:
            json.dump(record, handle)
            handle.flush()
            os.fsync(handle.fileno())
        temporary.replace(watermark)
        state["learning_concurrency_report"] = record
    since = previous.get("at")
    if type(since) in (int, float) and 0 <= now - since < 7200:
        return None
    # The previous committed report identifies a retry even after append/save failure.
    ident = hashlib.sha256(json.dumps(previous, sort_keys=True).encode()).hexdigest()[:20]
    marker = "[learning-concurrency:" + ident + "]"
    path = Path(directory, "inbox-claude.md")
    try:
        if path.exists():
            for line in path.read_text().splitlines():
                if line.startswith(marker + " "):
                    at = float(line.split(" at=", 1)[1].split(" ", 1)[0])
                    remember(dict(at=at, id=ident))
                    return None
        selected = projection(state, root, alive, directory)
        used = selected["weekly_used_percent"]
        quota = "未知" if used is None else f"{used:g}%"
        owners = selected["occupied"]
        line = (f"{marker} at={now} 学习codex3 在跑={owners['running']}/{selected['effective_total']}；"
                f"占位={owners['total']}（own={owners['own']},ext={owners['external']}）；"
                f"配置own={selected['own_slots']}/ext={selected['external_slots']}/total={selected['total_limit']}；"
                f"周已用={quota}；降档={'是' if selected['downgraded'] else '否'}；"
                f"原因={selected['reason']}；sample={selected['sample_observed_at']}\n")
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a") as handle:
            handle.write(line)
            handle.flush()
            os.fsync(handle.fileno())
        remember(dict(at=now, id=ident))
        return selected
    except (OSError, ValueError, UnicodeError):
        # A failed report does not mutate tasks or consume the next report interval.
        return None
