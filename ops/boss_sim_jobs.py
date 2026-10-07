"""Roy-authorized B4/B5 dispatch. Called while the scheduler owns learn.lock."""
import collections
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "agent/tools/boss-sim"))
from trust import BOSS_KEYS

ID = re.compile(r"^[a-z][a-z0-9_]*$")
BOSS = re.compile(r"^[A-Z][A-Z0-9_]*$")
RETRY_SECONDS = 3600
MAX_ATTEMPTS = 3
RELEASE_VERSION = "S1.boss-sim-auto1"


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def rows(path):
    with open(path, encoding="utf8") as handle:
        return [json.loads(line) for line in handle if line.strip()]


def file_hash(path):
    value = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b""):
            value.update(chunk)
    return value.hexdigest()


def finite(value):
    import math
    return type(value) in (int, float) and math.isfinite(value)


def character_of(row):
    value = row.get("character")
    return value.lower() if isinstance(value, str) else None


def biases(block, overall):
    """Numbers, rather than free-text reasons, determine model bias."""
    if not isinstance(block, dict) or not finite(overall):
        return None
    if not all(finite(block.get(k)) for k in ("n", "brier", "mean_pred", "actual_win", "leak_ratio")) or block["n"] <= 0:
        return None
    return [name for name, failed in (("brier", block["brier"] > overall * 1.25 + 1e-12),
            ("gap", abs(block["mean_pred"] - block["actual_win"]) > .15 + 1e-12),
            ("leak", not .7 - 1e-12 <= block["leak_ratio"] <= 1.3 + 1e-12)) if failed]


def candidates(character, trust, runs, attempts, sources, turns, level, completed_b4=()):
    if not ID.fullmatch(character) or trust.get("character") != character or not isinstance(level, int):
        return []
    finished = {r["run_id"]: r for r in runs if character_of(r) == character and r.get("ended")}
    recent = sorted((r for r in finished.values() if r.get("ascension") == level), key=lambda r: r["ended"])[-20:]
    def cause(r):
        return tuple(sorted(r.get("death_fight") or [])) if r.get("victory") is False else ()
    counts = collections.Counter(cause(r) for r in recent if cause(r))
    top = {key for key, _ in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[:2]}
    logged = {r["key"] for r in turns if r.get("turns")}
    calibration = digest(trust)
    out = []
    for boss, entry in trust.get("bosses", {}).items():
        if not BOSS.fullmatch(boss) or boss not in trust.get("low_trust_b2", {}):
            continue
        bias = biases(entry.get("t1"), trust.get("overall", {}).get("t1", {}).get("brier"))
        if bias is None:
            continue
        # Names come from this character's calibration, not another character's knowledge.
        names = {boss, entry.get("name")}
        matches = lambda r: bool(names.intersection(r.get("enemies") or r.get("death_fight") or []))
        deaths = sorted(r["run_id"] for r in finished.values() if cause(r) and matches(r))
        last20 = sorted(r["run_id"] for r in recent if cause(r) and matches(r))
        source_keys = sorted({r["key"] for r in sources if r.get("character") == character and r.get("run_id") in finished
                              and r.get("key") in logged and not r.get("excluded")
                              and BOSS_KEYS.get(r.get("encounter")) == boss})
        fight_keys = sorted({f"{r['run_id']}:{r['floor']}:{r['attempt']}:{r['ended_at']}" for r in attempts
                             if r.get("run_id") in finished and r.get("fight_kind") == "boss"
                             and r.get("result") in ("won", "died") and matches(r)})
        b4 = bool(bias) and (len(deaths) >= 5 or len(last20) >= 3) and len(source_keys) >= 8
        b5 = (len(last20) >= 3 and any(cause(r) in top and matches(r) for r in recent)
              and (boss in completed_b4 or not bias and entry["t1"]["n"] < 10))
        for mode, due in (("b4", b4), ("b5", b5)):
            if due:
                evidence = {"character": character, "boss": boss, "mode": mode, "calibration": calibration,
                            "artifact": trust.get("refresh", {}).get("artifact"), "metrics": entry["t1"],
                            "overall": trust["overall"]["t1"]["brier"], "bias": bias, "ascension": level,
                            "split": trust.get("split"),
                            "death_runs": deaths, "recent_death_runs": last20, "logged_keys": source_keys,
                            "fight_keys": fight_keys, "calibrated_keys": trust.get("refresh", {}).get("keys", [])}
                evidence["key"] = digest(evidence)
                out.append(evidence)
    return sorted(out, key=lambda e: (e["mode"] != "b4", e["boss"] != "AEONGLASS", -len(e["death_runs"]), e["boss"]))


def pid_birth(pid):
    try:
        return Path(f"/proc/{int(pid)}/stat").read_text().rsplit(")", 1)[1].split()[19]
    except (OSError, ValueError, IndexError, TypeError):
        return None


def live_lease(batch, alive):
    return alive(batch.get("pid")) and (not batch.get("pid_birth") or pid_birth(batch["pid"]) == batch["pid_birth"])


def terminal(state, batch_id, outcome, now, evidence=None):
    """Never rewrite a failed batch. Cooling records refer back to its immutable history."""
    batch = state["batches"][batch_id]
    e = evidence or batch["boss_sim"]
    state.setdefault("boss_sim_cooldown", {})[f"{e['character']}:{e['boss']}:{e['mode']}"] = {
        "batch": batch_id, "outcome": outcome, "at": now, "fight_keys": e["fight_keys"], "calibration": e["calibration"]}


def persist(state, directory):
    path = Path(directory) / "learn.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".boss.tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=1))
    tmp.replace(path)


def event(directory, message):
    queue = Path(directory) / "queue"
    queue.mkdir(parents=True, exist_ok=True)
    name = f"{time.time_ns()}-fix-done.md"
    temporary = queue / ("." + name)
    temporary.write_text(message + "\n", encoding="utf8")
    temporary.replace(queue / name)


def dispatch_candidates(state, evidence, root, scripts, alive, stamp, start, now=None):
    now = time.time() if now is None else now
    batches = state.setdefault("batches", {})
    directory = os.environ.get("CODEX_OPS_DIR") or os.path.join(root, "ops/codex-ops")
    own = [(bid, b) for bid, b in batches.items() if b.get("boss_sim")]
    for bid, batch in own:
        if batch.get("state") == "running":
            if not batch.get("pid"):
                try:
                    batch["pid"] = int(Path(directory, "learner", "learner-" + bid + ".pid").read_text().strip())
                    batch["pid_birth"] = pid_birth(batch["pid"])
                except (OSError, ValueError):
                    pass
            if live_lease(batch, alive):
                return None  # An expired but living lease still owns the tree; never overlap.
            batch.update(state="lost", retry_at=now + RETRY_SECONDS, finished_epoch=now)
            event(directory, f"B4/B5 {bid} 租约丢失；PID={batch.get('pid')}；证据={batch['key']}；保留lost，1小时后有界重试。")
    for e in evidence:
        scope = f"{e['character']}:{e['boss']}:{e['mode']}"
        cool = state.get("boss_sim_cooldown", {}).get(scope)
        if cool:
            if cool.get("snapshot_missing"):
                continue
            new = set(e["fight_keys"]) - set(cool["fight_keys"])
            if (len(new) < 10 or e["calibration"] == cool["calibration"]
                    or not new <= set(e["calibrated_keys"])):
                continue
        history = [(bid, b) for bid, b in own if b["boss_sim"]["character"] == e["character"]
                   and b["boss_sim"]["boss"] == e["boss"] and b["boss_sim"]["mode"] == e["mode"]
                   and (not cool or b.get("started_epoch", 0) > cool["at"])]
        if history:
            if any(b.get("state") in ("done", "rejected") for _, b in history):
                continue
            if max(b.get("retry_at", 0) for _, b in history) > now:
                continue
            if len(history) >= MAX_ATTEMPTS:
                terminal(state, history[-1][0], "retry-exhausted", now, e)
                event(directory, f"B4/B5 {scope} 已耗尽3次重试；原批次/失败保留，进入10场新战斗且新校准冷却。")
                continue
            e = history[0][1]["boss_sim"]  # Changed evidence cannot reset failure retries.
        bid = stamp + "-fix-batch"
        if bid in batches:
            continue
        worktree = os.path.join(root, ".worktrees", f"boss-sim-{e['character']}-{e['boss'].lower()}-{stamp}")
        branch = os.path.basename(worktree)
        directory = os.environ.get("CODEX_OPS_DIR") or os.path.join(root, "ops/codex-ops")
        path = os.path.join(directory, "learner", bid + ".boss-evidence.json")
        batch = {"task": "fix-batch", "learner_task": "boss-sim-batch", "character": e["character"], "runs": [],
                 "key": e["key"], "state": "running", "reason": "boss-sim", "worktree": worktree,
                 "boss_sim": e, "evidence_path": path, "started_epoch": now, "lease_until": now + 4 * 3600 + 300}
        batches[bid] = batch
        try:
            base = subprocess.run(["git", "-C", root, "rev-parse", "live"], capture_output=True, text=True, check=True).stdout.strip()
            if not re.fullmatch(r"[0-9a-f]{40}", base):
                raise ValueError("invalid dispatch baseline")
            e = dict(e, dispatch_base=base)
            batch.update(base=base, boss_sim=e)
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "x", encoding="utf8") as handle:
                json.dump(e, handle, ensure_ascii=False, indent=1)
            persist(state, directory)  # Reserve before any process can start, even across scheduler restarts.
            subprocess.run(["git", "-C", root, "worktree", "add", "-b", branch, worktree, base], check=True,
                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            # Runtime links are outside the tracked tree and never include credentials.
            for name in ("logs", "data"):
                os.symlink(os.path.join(root, name), os.path.join(worktree, name))
            os.symlink(os.path.join(root, "agent/node_modules"), os.path.join(worktree, "agent/node_modules"))
            pid, pane = start(["bash", os.path.join(scripts, "codex-ops-learner.sh"), bid, "", e["character"],
                               "fix-batch", worktree, "boss-sim-batch", path], root, scripts, directory, "learner-" + bid)
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            batch.update(state="failed", retry_at=now + RETRY_SECONDS, failure=str(error), rc=1)
            persist(state, directory)
            event(directory, f"B4/B5 {bid} 启动失败；证据={e['key']}；原因={error}；工作树/回报保留，有界重试。")
            return None
        batch.update(pid=pid, pid_birth=pid_birth(pid))
        if pane:
            batch["pane"] = pane
        persist(state, directory)
        return bid, pid
    return None


def check(state, root, scripts, character, alive, stamp, start):
    if not ID.fullmatch(character) or character != "silent":
        return None  # First rollout is Silent only; other characters are opt-in.
    try:
        live = Path(root) / ".worktrees/live"
        versions = json.loads((live / "eval/versions.json").read_text())["versions"]
        releases = [v for v in versions if v.get("name") == RELEASE_VERSION]
        if len(releases) != 1 or not isinstance(releases[0].get("commit"), str) or not re.fullmatch(r"[0-9a-f]{40}", releases[0]["commit"]):
            return None  # A code merge under test is not yet a published dispatcher.
        if subprocess.run(["git", "-C", str(live), "merge-base", "--is-ancestor", releases[0]["commit"], "HEAD"],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode:
            return None
        trust = json.loads((live / f"knowledge/characters/{character}/boss-trust.json").read_text())
        artifact = trust["refresh"]["artifact"]
        if not re.fullmatch(r"[0-9a-f]{64}", artifact):
            return None
        archive = live / f"experiments/boss-sim/{character}" / artifact
        sealed = json.loads((archive / "completed.json").read_text())
        if sealed.get("artifact") != artifact or any(file_hash(archive / name) != sealed.get("files_sha256", {}).get(name)
                    for name in ("boss-trust.json", "sources.jsonl", "turns.jsonl", "fights.jsonl", "results.jsonl", "split.json")):
            raise ValueError("calibration evidence archive changed or incomplete")
        if (file_hash(archive / "sources.jsonl") != trust["source"].get("sources_sha256")
                or file_hash(archive / "fights.jsonl") != trust["source"].get("dataset_sha256")):
            raise ValueError("calibration source fingerprint mismatch")
        sources, turns = rows(archive / "sources.jsonl"), rows(archive / "turns.jsonl")
        if digest(json.loads((archive / "boss-trust.json").read_text())) != digest(trust):
            return None
        runs, attempts = rows(Path(root) / "logs/runs.jsonl"), rows(Path(root) / "logs/sl-attempts.jsonl")
        configs = rows(Path(root) / "logs/run-config.jsonl")
        level = next(r.get("target_ascension", r.get("ascension")) for r in reversed(configs)
                     if character_of(r) == character)
        done = {b["boss_sim"]["boss"] for b in state["batches"].values() if b.get("boss_sim")
                and b["boss_sim"]["character"] == character and b.get("state") in ("done", "rejected")}
        evidence = candidates(character, trust, runs, attempts, sources, turns, level, done)
        state.setdefault("boss_sim_observed", {})[character] = {"at": time.time(), "calibration": digest(trust),
                                                               "eligible": evidence}
        return dispatch_candidates(state, evidence, root, scripts, alive, stamp, start)
    except (OSError, ValueError, KeyError, StopIteration, TypeError, subprocess.SubprocessError) as error:
        state.setdefault("boss_sim_errors", []).append({"at": time.time(), "error": str(error)})
        return None


def load_gate(root, worktree, gate_path, evidence):
    import importlib.util
    spec = importlib.util.spec_from_file_location("boss_acceptance", Path(__file__).resolve().parents[1] / "agent/tools/boss-sim/acceptance.py")
    gate = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gate)
    gate_path = safe_artifact(root, worktree, gate_path)
    receipt = json.loads(gate_path.read_text())
    inputs = receipt["inputs"]
    snapshots = []
    for name in ("before", "after"):
        raw = safe_artifact(root, worktree, inputs[name]["path"]).read_bytes()
        if hashlib.sha256(raw).hexdigest() != inputs[name]["sha256"]:
            raise ValueError("acceptance input changed")
        snapshots.append(json.loads(raw))
    isolation = receipt["isolation"]
    gate.verify_dispatch(evidence, snapshots[0], receipt["character"], receipt["boss"], receipt["mode"], isolation["base"])
    fresh = gate.isolate(worktree, isolation["base"], isolation["head"], Path(gate_path).parent / "scheduler-isolation")
    result = gate.evaluate(*snapshots, receipt["character"], receipt["boss"], receipt["mode"], fresh)
    if result["accepted"] != receipt["accepted"]:
        raise ValueError("acceptance replay disagrees")
    result["published_validation"] = digest({k: snapshots[1][k] for k in ("character", "criteria", "split", "source", "bosses", "overall")})
    return receipt, result


def safe_artifact(root, worktree, value):
    path = Path(value).resolve()
    roots = (Path(root, "learner/runs").resolve(), Path(worktree).resolve())
    if path.suffix != ".json" or not any(path.is_relative_to(scope) for scope in roots):
        raise ValueError("acceptance artifact outside batch scope")
    return path


def verify_publication(root, report, evidence, replay):
    live = Path(root) / ".worktrees/live"
    trust = json.loads((live / f"knowledge/characters/{evidence['character']}/boss-trust.json").read_text())
    if digest({k: trust[k] for k in ("character", "criteria", "split", "source", "bosses", "overall")}) != replay["published_validation"]:
        raise ValueError("published character calibration differs from accepted replay")
    artifact = trust["refresh"]["artifact"]
    if not re.fullmatch(r"[0-9a-f]{64}", artifact):
        raise ValueError("missing calibration archive")
    archive = live / f"experiments/boss-sim/{evidence['character']}" / artifact
    if digest(json.loads((archive / "boss-trust.json").read_text())) != digest(trust):
        raise ValueError("published calibration archive mismatch")
    versions = json.loads((live / "eval/versions.json").read_text())["versions"]
    matches = [v for v in versions if v.get("name") == report.get("version") and report.get("version")]
    if len(matches) != 1 or matches[0].get("commit") != report.get("merged"):
        raise ValueError("accepted release lacks its unique eval version")


def ledger_rejection(root, ids, evidence):
    if not isinstance(ids, list) or not ids:
        return False
    result = subprocess.run(["python3", os.path.join(root, "learner/ledger.py"), "fold"], capture_output=True, text=True, check=True)
    items = {r["id"]: r for r in json.loads(result.stdout)}
    return all(i in items and items[i].get("character") == evidence["character"]
               and items[i].get("kind") in ("fight", "mechanic") and items[i].get("status") == "rejected"
               and any(e.get("run") in {k.split(":")[0] for k in evidence["logged_keys"]} and e.get("turn") is not None
                       for e in items[i].get("evidence", [])) for i in ids)


def completion_evidence(root, evidence):
    e = dict(evidence)
    try:
        trust = json.loads((Path(root) / f".worktrees/live/knowledge/characters/{e['character']}/boss-trust.json").read_text())
        names = {e["boss"], trust["bosses"][e["boss"]]["name"]}
        runs = {r["run_id"] for r in rows(Path(root) / "logs/runs.jsonl") if character_of(r) == e["character"] and r.get("ended")}
        e["fight_keys"] = sorted({f"{r['run_id']}:{r['floor']}:{r['attempt']}:{r['ended_at']}" for r in rows(Path(root) / "logs/sl-attempts.jsonl")
                                  if r.get("run_id") in runs and r.get("fight_kind") == "boss" and r.get("result") in ("won", "died")
                                  and names.intersection(r.get("enemies") or [])})
        e["calibration"] = digest(trust)
    except (OSError, ValueError, KeyError):
        # Missing end snapshot prevents future retriggers until explicitly recovered.
        e["fight_keys"] = []
        e["calibration"] = None
        e["snapshot_missing"] = True
    return e


def finish(state, bid, rc, root, directory, enqueue):
    from learner_checks import read_report
    batch = state["batches"][bid]
    if batch.get("state") == "lost":
        if "late_completion" not in batch:
            batch["late_completion"] = {"rc": rc, "at": time.time(), "report": f"{directory}/learner/{bid}.out"}
            enqueue("fix-done", f"B4/B5 {bid} 租约丢失后迟到完成 exit={rc}；保留原lost/失败，不冒认上线；"
                    f"PID={batch.get('pid')}，证据={batch['key']}，回报={batch['late_completion']['report']}，交运维核对实际结果。")
        return
    evidence = batch["boss_sim"]
    report = read_report(os.path.join(directory, "learner", bid + ".out"))
    result = report.get("boss_sim", {})
    batch.update(rc=rc, finished_epoch=time.time(), state="failed")
    try:
        if rc or report.get("task") != "fix-batch" or result.get("evidence_key") != evidence["key"]:
            raise ValueError("failed learner or mismatched evidence")
        gate, replay = load_gate(root, batch["worktree"], result["acceptance"], evidence)
        if any(gate.get(k) != evidence[k] for k in ("character", "boss", "mode")):
            raise ValueError("foreign acceptance receipt")
        if gate.get("isolation", {}).get("base") != batch.get("base") or not batch.get("base"):
            raise ValueError("acceptance baseline differs from reserved dispatch source")
        merged = report.get("merged")
        if replay["accepted"]:
            if result.get("outcome") != "accepted" or not isinstance(merged, str) or not re.fullmatch(r"[0-9a-f]{40}", merged):
                raise ValueError("accepted candidate lacks release")
            for commit in (merged, gate["isolation"]["head"]):
                subprocess.run(["git", "-C", os.path.join(root, ".worktrees/live"), "merge-base", "--is-ancestor", commit, "HEAD"], check=True)
            verify_publication(root, report, evidence, replay)
            batch.update(state="done", merged=merged, checks_pending=True)
        else:
            if (result.get("outcome") != "rejected" or merged is not None
                    or not ledger_rejection(root, result.get("ledger_ids"), evidence)):
                raise ValueError("rejection lacks ledger evidence or claims release")
            batch.update(state="rejected", merged=None, rejection=replay["reasons"])
        end = completion_evidence(root, evidence)
        terminal(state, bid, batch["state"], batch["finished_epoch"], end)
        if end.get("snapshot_missing"):
            state["boss_sim_cooldown"][f"{evidence['character']}:{evidence['boss']}:{evidence['mode']}"]["snapshot_missing"] = True
        batch["acceptance"] = replay
    except (OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
        batch.update(failure=str(error), retry_at=time.time() + RETRY_SECONDS)
    enqueue("fix-done", f"B4/B5批次 {bid}：{evidence['character']}/{evidence['boss']}/{evidence['mode']}，"
            f"PID {batch.get('pid')}，evidence={evidence['key']}，state={batch['state']}，exit={rc}；"
            f"merged={batch.get('merged')}；原因={batch.get('failure', batch.get('rejection'))}；"
            f"回报 {directory}/learner/{bid}.out；原失败历史保留，自动冷却/有界重试。")
