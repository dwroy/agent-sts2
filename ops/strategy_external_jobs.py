"""Four independent external study lanes on the original registered writer path."""
from contextlib import contextmanager
from contextvars import ContextVar
import copy
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

import strategy_backfill_jobs as shared
import external_learning_policy as policy
import publication_gate
import learner_registration
from strategy_research_jobs import atomic_json

QUEUE = "notes/strategy-external-silent.json"
REQUEST = "github-issue-51-external-boss-learning-20261023"
VERSIONS = {"v0.107", "v0.108", "v0.109", "v0.110", "v0.111"}
TOPICS = {"dual-boss", "act-boss", "card-picks", "map-resources", "encounter-rk", "knowledge"}
FORBIDDEN = re.compile(r"^(player(_?id|_?name)?|user(_?id|_?name)?|steam(_?id)?|ip(_?address)?|email|auth|token)$", re.I)


_validation = ContextVar("external_source_validation", default=None)


@contextmanager
def validation_window():
    if _validation.get() is not None:
        yield
        return
    token = _validation.set({})
    try:
        yield
    finally:
        _validation.reset(token)


def signatures(root, refs):
    return [(st.st_dev, st.st_ino, st.st_size, st.st_mtime_ns, st.st_ctime_ns)
            for ref in refs for st in [Path(root, ref["path"]).stat()]]


def source(root, plan):
    cache = _validation.get()
    key = (str(Path(root).resolve()), json.dumps(plan, sort_keys=True))
    if cache is not None and key in cache:
        binding, spec, refs, identity = cache[key]
        if signatures(root, refs) == identity:
            return copy.deepcopy(binding), spec
    binding, spec, refs = read_source(root, plan)
    if cache is not None:
        cache[key] = (copy.deepcopy(binding), spec, refs, signatures(root, refs))
    return binding, spec


def queue(root):
    value = json.loads(Path(root, QUEUE).read_bytes())
    if (not isinstance(value, dict) or value.get("schema") != 1 or value.get("request_id") != REQUEST or value.get("character") != "silent"
            or value.get("authorized_by") != "Roy" or type(value.get("enabled")) is not bool
            or not isinstance(value.get("plans"), list)):
        raise ValueError("invalid external source queue")
    if any(not isinstance(plan, dict) for plan in value["plans"]):
        raise ValueError("external plans must be objects")
    ids = [plan.get("plan_id") for plan in value["plans"]]
    if any(not isinstance(ident, str) or not shared.ID.fullmatch(ident) for ident in ids) or len(set(ids)) != len(ids):
        raise ValueError("invalid external source plan IDs")
    return value


def safe_aggregate(value):
    if isinstance(value, dict):
        if any(FORBIDDEN.fullmatch(key) for key in value):
            raise ValueError("external aggregate contains identifier fields")
        for key, item in value.items():
            if key in ("columns", "fields") and isinstance(item, list) and any(isinstance(column, str) and FORBIDDEN.fullmatch(column) for column in item):
                raise ValueError("external aggregate selects identifier columns")
            safe_aggregate(item)
    elif isinstance(value, list):
        for item in value:
            safe_aggregate(item)


def read_source(root, plan):
    manifest = json.loads(shared.artifact(root, plan["input_manifest"]))
    spec = shared.artifact(root, plan["work_spec"])
    if (manifest.get("request_id") != REQUEST or manifest.get("batch_plan_id") != plan["plan_id"]
            or manifest.get("source") != "external:sts2fun" or manifest.get("character") != "silent"
            or manifest.get("work_spec") != plan["work_spec"] or manifest.get("contains_player_identifiers") is not False):
        raise ValueError("external frozen manifest identity mismatch")
    if manifest.get("topic") not in TOPICS:
        raise ValueError("external batch requires an explicit bounded topic")
    provenance = manifest.get("provenance", {})
    if (not re.fullmatch(r"https://sts2[.]fun/[^\s]+", str(provenance.get("url")))
            or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(provenance.get("downloaded_at")))
            or not re.fullmatch(r"[0-9a-f]{64}", str(provenance.get("database_sha256")))
            or not isinstance(provenance.get("query_version"), str) or not provenance["query_version"].strip()):
        raise ValueError("external manifest requires public provenance and export identity")
    ids = manifest.get("unit_ids", [])
    if (not isinstance(ids, list) or not 1 <= len(ids) <= 6 or len(set(ids)) != len(ids)
            or any(not isinstance(ident, str) or not shared.ID.fullmatch(ident) for ident in ids)):
        raise ValueError("external batch requires bounded unique units")
    cohorts = manifest.get("cohorts", [])
    if not cohorts or not isinstance(cohorts, list):
        raise ValueError("external batch requires independent version cohorts")
    versions = []
    for cohort in cohorts:
        version = cohort.get("version")
        if (version not in VERSIONS or version in versions or type(cohort.get("sample_count")) is not int
                or cohort["sample_count"] <= 0 or type(cohort.get("sample_denominator")) is not int
                or cohort["sample_denominator"] < cohort["sample_count"] or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(cohort.get("collected_at")))
                or cohort.get("contains_player_identifiers") is not False):
            raise ValueError("invalid external cohort denominator/version/date")
        versions.append(version)
        for ref in cohort.get("aggregates", []):
            if not str(ref.get("path", "")).endswith(".json"):
                raise ValueError("external input must be a sanitized JSON aggregate")
            safe_aggregate(json.loads(shared.artifact(root, ref)))
        if not cohort.get("aggregates"):
            raise ValueError("external cohort has no frozen aggregate")
    for ref in manifest.get("contracts", []):
        shared.artifact(root, ref)
    if not manifest.get("contracts"):
        raise ValueError("external batch requires frozen publication contracts")
    return {"request_id": REQUEST, "plan_id": plan["plan_id"], "source": "external:sts2fun",
            "input_manifest": plan["input_manifest"], "work_spec": plan["work_spec"], "topic": manifest["topic"], "provenance": provenance,
            "entry_ids": ids, "all_entry_ids": ids, "dispatch_runs": [], "cohorts": cohorts}, spec, (
                [plan["input_manifest"], plan["work_spec"]] + manifest["contracts"]
                + [ref for cohort in cohorts for ref in cohort["aggregates"]])


def candidates(state, root, configured, excluded_lanes=()):
    for plan in configured["plans"]:
        try:
            generation = plan.get("retry_generation", 0)
            if type(generation) is not int or generation < 0:
                raise ValueError("invalid external retry generation")
            prior = [b for b in state["batches"].values() if b.get("external_source") == plan["plan_id"]]
            if prior and (len(prior) >= 3 or generation <= max(b["external_binding"]["retry_generation"] for b in prior)):
                continue
            if plan.get("lane") in excluded_lanes:
                continue
            binding, _ = source(root, plan)
            lane(plan, binding)
            yield plan, binding
        except (OSError, ValueError, KeyError, TypeError, AttributeError, IndexError, RecursionError) as error:
            state["strategy_external_error"] = {"at": time.time(), "reason": str(error), "plan": plan["plan_id"]}


def ready(state, root):
    """Unconsumed generations remain queued independently of the own-game lane."""
    try:
        configured = queue(root)
        if not configured["enabled"]:
            return False
        entries = state.get("strategy_external", {}).get("entries", {})
        return any(any(entries.get(ident, {}).get("status") != "processed" for ident in binding["entry_ids"])
                   for _, binding in candidates(state, root, configured))
    except FileNotFoundError:
        return False
    except (OSError, ValueError, KeyError, TypeError, AttributeError, IndexError, RecursionError) as error:
        state["strategy_external_error"] = {"at": time.time(), "reason": str(error)}
    return False


def reconcile(state, directory):
    shared.reconcile(state, directory, "external")
    for plan in state.get("strategy_external", {}).get("plans", {}).values():
        for attempt in plan.get("attempts", []):
            native = attempt.get("native", {})
            observed = native.get("service_tier")
            if observed not in ("ultrafast", "fast", "default"):
                continue
            try:
                path = Path(directory, "learner", attempt["batch"] + ".external-launch.json")
                launch = json.loads(path.read_bytes())
                batch = state["batches"][attempt["batch"]]
                if (launch.get("batch") != attempt["batch"] or launch.get("source") != batch["external_source"]
                        or launch.get("cwd") != batch["worktree"] or not isinstance(launch.get("external_tier"), dict)):
                    continue
                if launch["external_tier"].get("observed_service_tier") != observed:
                    launch["external_tier"]["observed_service_tier"] = observed
                    launch["native_tier_readback"] = native
                    atomic_json(path, launch)
            except (OSError, ValueError, KeyError, TypeError):
                pass  # The original native proof/progress stays authoritative.



def lane(plan, binding):
    value = plan.get("lane")
    if value is None:
        value = {"dual-boss": "A", "act-boss": "A", "card-picks": "B",
                 "encounter-rk": "C", "map-resources": "D"}.get(binding.get("topic"))
    if value not in ("A", "B", "C", "D"):
        raise ValueError("external knowledge plan requires lane A/B/C/D")
    return value


def active_external(state, alive, directory=None):
    """Unverified native owners still reserve worker capacity after wrapper exit."""
    directory = directory or os.environ.get("CODEX_OPS_DIR") or str(Path(__file__).resolve().parent / "codex-ops")
    return lane_owners(state, alive, directory)


def lane_owners(state, alive, directory):
    """Only original retirement proof releases a terminal owner's lane."""
    owners = []
    for bid, old in state["batches"].items():
        if not old.get("external_source"):
            continue
        if old.get("state") in ("done", "failed") and not alive(old.get("pid")):
            try:
                shared.retired(bid, old, directory)
                continue
            except (OSError, ValueError, KeyError, TypeError, AttributeError, IndexError, RuntimeError):
                pass  # A dead wrapper is not proof that its native session retired.
        owners.append(old)
    return owners


def occupied_lanes(state, configured, root, alive):
    occupied = set()
    plans = {p["plan_id"]: p for p in configured["plans"]}
    directory = os.environ.get("CODEX_OPS_DIR") or str(Path(root, "ops/codex-ops"))
    for old in lane_owners(state, alive, directory):
        value = old.get("external_lane")
        if value not in ("A", "B", "C", "D"):
            plan = plans.get(old["external_source"])
            if not plan:
                return set("ABCD")  # Unknown original owners never free a slot.
            value = lane(plan, source(root, plan)[0])
        occupied.add(value)
    return occupied


def next_stamp(state, stamp):
    current = datetime.strptime(stamp, "%Y%m%d-%H%M%S")
    while current.strftime("%Y%m%d-%H%M%S") + "-strategy-proposal" in state["batches"]:
        current += timedelta(seconds=1)
    return current.strftime("%Y%m%d-%H%M%S")


def dispatch_lanes(state, root, scripts, character, alive, stamp, writer):
    with validation_window():
        return _dispatch_lanes(state, root, scripts, character, alive, stamp, writer)


def _dispatch_lanes(state, root, scripts, character, alive, stamp, writer):
    results = []
    for _ in range(4):
        result = dispatch(state, root, scripts, character, alive, next_stamp(state, stamp), writer, {})
        if not result:
            break
        results.append(result)
    return results


def dispatch(state, root, scripts, character, alive, stamp, writer, normal):
    directory = Path(os.environ.get("CODEX_OPS_DIR") or Path(root, "ops/codex-ops"))
    if publication_gate.learners_held(root, directory):
        return None
    reconcile(state, directory)
    if character != "silent" or not re.fullmatch(r"[0-9]{8}-[0-9]{6}", stamp):
        return None
    selected = policy.snapshot(root, directory)
    state["external_learning_policy"] = selected
    policy.request_switch(state, directory, selected)
    if (not selected["workers"] or not policy.external_disk_allowed(root)
            or normal.get("disk_capacity_hold")):
        return None
    try:
        configured = queue(root)
        if not configured["enabled"]:
            return None
        occupied = occupied_lanes(state, configured, root, alive)
        if len(active_external(state, alive, directory)) >= selected["workers"]:
            return None
        last = {value: max((bid for bid, batch in state["batches"].items()
                           if batch.get("external_lane") == value), default="") for value in "ABCD"}
        # In the two-worker tier, untouched/oldest lanes get the next released slot.
        configured = {**configured, "plans": sorted(configured["plans"], key=lambda plan: last.get(plan.get("lane"), ""))}
        for plan, binding in candidates(state, root, configured, occupied):
            try:
                selected_lane = lane(plan, binding)
                if selected_lane in occupied:
                    continue
                ident = plan["plan_id"]; generation = plan.get("retry_generation", 0)
                if type(generation) is not int or generation < 0:
                    raise ValueError("invalid external retry generation")
                prior = [(bid, b) for bid, b in state["batches"].items() if b.get("external_source") == ident]
                if prior and (len(prior) >= 3 or generation <= max(b["external_binding"]["retry_generation"] for _, b in prior)):
                    continue
                if any(old.get("state") not in ("done", "failed") or alive(old.get("pid")) for _, old in prior):
                    continue
                for bid, old in prior:
                    shared.retired(bid, old, directory)
                entries = state.get("strategy_external", {}).get("entries", {})
                binding["entry_ids"] = [ident for ident in binding["entry_ids"] if entries.get(ident, {}).get("status") != "processed"]
                if not binding["entry_ids"] or any(entries.get(ident, {}).get("status") not in (None, "waiting", "failed", "lost") for ident in binding["entry_ids"]):
                    continue
                overlaps = [(bid, old) for bid, old in state["batches"].items()
                            if old.get("external_source") and old["external_source"] != ident
                            and set(old["external_binding"]["entry_ids"]) & set(binding["entry_ids"])]
                if any(old.get("state") not in ("done", "failed") or alive(old.get("pid")) for _, old in overlaps):
                    continue
                for bid, old in overlaps:
                    shared.retired(bid, old, directory)
                # The immutable source ref is captured under the same writer locks.
                # Caller already owns learn.lock; contention defers this natural tick.
                with publication_gate.source_locks(root):
                    frozen, _ = source(root, plan)
                    frozen["entry_ids"] = binding["entry_ids"]
                    if frozen != binding:
                        raise ValueError("external source changed during snapshot")
                    base = subprocess.check_output(["git", "-C", root, "rev-parse", "main"], text=True).strip()
                if not re.fullmatch(r"[0-9a-f]{40}", base):
                    raise ValueError("invalid external dispatch base")
                result = writer(state, root, scripts, "strategy-proposal", character, [],
                                "strategy-external:" + ident + ":" + str(generation), "external", alive, stamp, external_source=ident)
                if result:
                    state["batches"][result[0]].update(external_binding={**binding, "retry_generation": generation, "dispatch_base": base},
                                                     external_registered_at=time.time(), external_lane=selected_lane,
                                                     external_policy=selected,
                                                     candidate_mode=publication_gate.candidate_binding(base, state["batches"][result[0]]["worktree"]))
                    learner_registration.checkpoint(state)
                    return result
            except (OSError, ValueError, KeyError, TypeError, AttributeError, IndexError, RuntimeError, subprocess.SubprocessError) as error:
                state["strategy_external_error"] = {"at": time.time(), "reason": str(error), "plan": plan["plan_id"]}

    except (OSError, ValueError, KeyError, TypeError, AttributeError, IndexError, RuntimeError, subprocess.SubprocessError) as error:
        state["strategy_external_error"] = {"at": time.time(), "reason": str(error)}
    return None


def bound(root, directory, bid, character, tree, ident):
    if character != "silent" or not shared.BATCH.fullmatch(bid) or not shared.ID.fullmatch(ident):
        raise ValueError("invalid external host identity")
    batch = json.loads(Path(directory, "learn.json").read_bytes())["batches"][bid]
    expected = str(Path(root).resolve() / ".worktrees" / ("codex-strategy-silent-" + bid.removesuffix("-strategy-proposal")))
    if (tree != expected or batch.get("state") != "running" or any(batch.get(k) != v for k, v in {
            "task": "strategy-proposal", "character": character, "worktree": tree, "external_source": ident,
            "reason": "external", "runs": [], "key": "strategy-external:" + ident + ":" + str(batch.get("external_binding", {}).get("retry_generation", 0))}.items())
            or any(k in batch for k in ("research_request", "implementation_request", "learning_request", "proposal_ids", "proposal_repair", "backfill_source"))):
        raise ValueError("external registration mismatch")
    return batch


def prepare(root, directory, bid, character, tree, ident):
    if publication_gate.learners_held(root, directory):
        raise ValueError("external startup admission held")
    # A registered wrapper owns its batch barrier, not the parent's long learn transaction.
    # These read-only frozen inputs still serialize with writers in refresh -> live order.
    with publication_gate.source_locks(root):
        return prepare_snapshot(root, directory, bid, character, tree, ident)


def prepare_snapshot(root, directory, bid, character, tree, ident):
    batch = bound(root, directory, bid, character, tree, ident)
    configured = queue(root)
    plan = next(p for p in configured["plans"] if p["plan_id"] == ident)
    binding, spec = source(root, plan)
    binding["retry_generation"] = plan.get("retry_generation", 0)
    selected = batch["external_binding"]["entry_ids"]
    binding["entry_ids"] = [ident for ident in binding["entry_ids"] if ident in selected]
    if (not selected or binding["entry_ids"] != selected or not configured["enabled"] or batch["state"] != "running"
            or any(batch["external_binding"].get(k) != v for k, v in binding.items())):
        raise ValueError("external frozen binding changed")
    base = batch["external_binding"]["dispatch_base"]
    if not re.fullmatch(r"[0-9a-f]{40}", base):
        raise ValueError("invalid external base")
    return batch, spec


def task_file(root, directory, bid, character, tree, ident):
    batch, spec = prepare(root, directory, bid, character, tree, ident)
    if subprocess.check_output(["git", "-C", tree, "rev-parse", "HEAD"], text=True).strip() != batch["external_binding"]["dispatch_base"]:
        raise ValueError("external tree differs from dispatch base")
    template = Path(tree, "learner/tasks/strategy-external.md").read_text()
    topic = batch["external_binding"]["topic"]
    if topic in ("dual-boss", "act-boss"):
        template += "\n" + Path(tree, "learner/tasks/strategy-external-" + topic + ".md").read_text()
    appendix = "\n\n本批冻结身份（路径相对 project_root）：\n" + json.dumps({"batch": bid, "worktree": tree, **batch["external_binding"]}, ensure_ascii=False, indent=2) + "\n" + spec.decode()
    if "{{" in appendix or "}}" in appendix:
        raise ValueError("external text contains template delimiters")
    path = Path(directory, "learner", bid + ".external-input", "strategy-proposal.md")
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = (template + appendix).encode()
    if path.exists() and path.read_bytes() != raw:
        raise ValueError("external task input already differs")
    path.write_bytes(raw)
    return str(path)


report_proof = shared.report_proof

if __name__ == "__main__":
    try:
        action, *args = sys.argv[1:]
        if action == "ready":
            print(prepare(*args)[0]["external_binding"]["dispatch_base"])
        elif action == "tier":
            batch = prepare(*args)[0]
            selected = batch["external_policy"]
            latest = policy.snapshot(args[0], args[1])
            if any(selected.get(key) != latest.get(key) for key in ("account_home_sha256", "service_tier", "workers")) or not latest["workers"]:
                raise ValueError("external quota tier changed; retain registration")
            print(selected["service_tier"])
        elif action == "prepare":
            print(task_file(*args))
        elif action == "registered":
            bound(*args)
        elif action == "not-started":
            bound(*args)
            root, directory, bid, character, tree, ident = args
            atomic_json(Path(directory, "learner", bid + ".external-not-started.json"),
                        {"batch": bid, "source": ident, "worktree": tree, "models_started": 0})
        else:
            raise ValueError("unknown external action")
    except (OSError, ValueError, KeyError, TypeError, AttributeError, IndexError, RuntimeError, StopIteration, subprocess.SubprocessError) as error:
        sys.stderr.write(str(error) + "\n")
        raise SystemExit(1)
