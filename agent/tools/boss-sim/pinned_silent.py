"""Extend Silent validation using exactly the published model and full-input seeds."""
import hashlib
import collections
import json
import os
from pathlib import Path
import re
import subprocess


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def read_rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def clean(value):
    if isinstance(value, dict):
        return {key: clean(item) for key, item in value.items() if key not in ("ms", "elapsedMs")}
    if isinstance(value, list):
        return [clean(item) for item in value]
    return value


def merge_replays(fights, historical, original, replayed, controls):
    """Reject changed inputs, foreign rows, duplicate results and unequal control replays."""
    if any(row.get("character") != "silent" for row in fights + original + replayed):
        raise ValueError("foreign/missing character in pinned Silent replay")
    if fights[:len(historical)] != historical:
        raise ValueError("historical input/order changed; original full-row seeds must stay fixed")
    wanted = set(controls) | {row["key"] for row in fights[len(historical):]}
    old = {(row["key"], row["start"]): row for row in original}
    new = {(row["key"], row["start"]): row for row in replayed}
    if len(old) != len(original) or set(old) != {(row["key"], start) for row in historical for start in ("t1", "pre")}:
        raise ValueError("incomplete/duplicate historical results")
    if len(new) != len(replayed) or set(new) != {(key, start) for key in wanted for start in ("t1", "pre")}:
        raise ValueError("incomplete/duplicate/foreign extension results")
    for key in controls:
        for start in ("t1", "pre"):
            if clean(old[key, start]) != clean(new[key, start]):
                raise ValueError("fixed-model control differs: " + key + ":" + start)
    combined = {key: row for key, row in old.items() if key[0] not in wanted}
    combined.update(new)
    return [combined[row["key"], start] for row in fights for start in ("t1", "pre")]


def restore_model(root, target, source, game_data):
    """Restore only manifest inputs, never a repository archive or another character's data."""
    base = source["simulator_base"]
    if not re.fullmatch(r"[0-9a-f]{40}", base):
        raise ValueError("pinned source needs an exact Git commit")
    allowed = ("agent/src/", "agent/tools/boss-sim/", "knowledge/common/", "knowledge/characters/silent/")
    verified = {}
    for name, expected in source["input_files"].items():
        path = Path(name)
        if path.is_absolute():
            if path.name != "game-data.json":
                raise ValueError("unsupported external model input")
            raw = game_data.read_bytes()
        else:
            if not name.startswith(allowed) or ".." in path.parts or path.suffix not in (".ts", ".py", ".json"):
                raise ValueError("unsupported pinned model path: " + name)
            raw = subprocess.check_output(["git", "show", base + ":" + name], cwd=root)
        if digest(raw) != expected:
            raise ValueError("pinned input hash differs: " + name)
        verified[name] = expected
        if not path.is_absolute():
            output = target / path
            output.parent.mkdir(parents=True, exist_ok=True)
            if output.exists() and output.read_bytes() != raw:
                raise ValueError("retain changed pinned input: " + name)
            output.write_bytes(raw)
    for name in ("agent/package.json", "agent/tsconfig.json"):
        raw = subprocess.check_output(["git", "show", base + ":" + name], cwd=root)
        output = target / name
        output.parent.mkdir(parents=True, exist_ok=True)
        if output.exists() and output.read_bytes() != raw:
            raise ValueError("retain changed pinned dependency input: " + name)
        output.write_bytes(raw)
    link = target / "agent/node_modules"
    if not link.exists():
        link.symlink_to(root / "agent/node_modules", target_is_directory=True)
    return verified


def extend(root, scratch, dataset, fights, previous, game_data):
    """Reuse historical results after input/hash/control checks; replay only new validation fights."""
    if previous.get("character") != "silent" or any(row.get("character") != "silent" for row in fights):
        raise ValueError("pinned refresh is Silent-only")
    source = previous["source"]
    if source.get("samples") != 200 or source.get("seed") != 1:
        raise ValueError("unsupported published sampling contract")
    identity = previous["refresh"]["artifact"]
    if not re.fullmatch(r"[0-9a-f]{64}", identity):
        raise ValueError("invalid previous artifact identity")
    work = scratch / "pinned-extension"
    work.mkdir(exist_ok=True)
    relative = "experiments/boss-sim/silent/" + identity
    def archived(name):
        path = root / relative / name
        raw = path.read_bytes() if path.is_file() else subprocess.check_output(["git", "show", "HEAD:" + relative + "/" + name], cwd=root)
        if name != "completed.json" and digest(raw) != completed["files_sha256"].get(name):
            raise ValueError("previous artifact hash differs: " + name)
        output = work / name
        if output.exists() and output.read_bytes() != raw:
            raise ValueError("retain changed cached artifact: " + name)
        output.write_bytes(raw)
        return output
    completed = json.loads(archived("completed.json").read_text())
    if completed.get("artifact") != identity:
        raise ValueError("previous artifact identity differs")
    cached_source = json.loads(archived("provenance.json").read_text())
    for key in ("simulator_base", "model_sha256", "input_files", "samples", "seed"):
        if cached_source[key] != source[key]:
            raise ValueError("previous model provenance differs: " + key)
    historical = read_rows(archived("fights.jsonl"))
    original = read_rows(archived("results.jsonl"))
    historical_turns = read_rows(archived("turns.jsonl"))
    if fights[:len(historical)] != historical or read_rows(dataset / "turns.jsonl")[:len(historical)] != historical_turns:
        raise ValueError("historical openings/turns/order changed; do not reuse")
    added = fights[len(historical):]
    if set(previous["split"]["tune"]) & {row["key"] for row in added}:
        raise ValueError("new samples cannot enter tuning")
    target = work / "model"
    verified = restore_model(root, target, source, game_data)
    controls = [row["key"] for row in historical[:2]]
    keys = controls + [row["key"] for row in added]
    key_path = work / "replay-keys.json"
    key_path.write_text(json.dumps(keys) + "\n")
    expected = {(key, start) for key in keys for start in ("t1", "pre")}
    replayed = None
    index = 0
    while (work / f"replay-{index}").exists():
        candidate = [row for path in sorted((work / f"replay-{index}").glob("results-*.jsonl")) for row in read_rows(path)]
        if {(row["key"], row["start"]) for row in candidate} == expected:
            replayed = candidate
            break
        index += 1
    if replayed is None:
        output = work / f"replay-{index}"
        command = ["nice", "-n", "19", "node", "--import", "tsx", "tools/boss-sim/backtest.ts", "--character", "silent",
                   "--game-data", str(game_data), "--in", str(dataset / "fights.jsonl"), "--out-dir", str(output),
                   "--samples", "200", "--seed", "1", "--starts", "t1,pre", "--no-rollout", "--keys", str(key_path)]
        with (work / f"replay-{index}.log").open("w") as log:
            subprocess.run(command, cwd=target / "agent", env={**os.environ, "CHARACTER": "silent", "TMPDIR": str(work)},
                           stdout=log, stderr=subprocess.STDOUT, check=True)
        replayed = [row for path in sorted(output.glob("results-*.jsonl")) for row in read_rows(path)]
    # Recheck all source inputs after the replay, including the external game data.
    for name, expected_hash in verified.items():
        path = game_data if Path(name).is_absolute() else target / name
        if digest(path.read_bytes()) != expected_hash:
            raise ValueError("model changed during pinned replay: " + name)
    combined = merge_replays(fights, historical, original, replayed, controls)
    audit_command = ["nice", "-n", "19", "node", "--import", "tsx", "tools/boss-sim/audit-calibration-board.ts",
                     str(dataset / "fights.jsonl"), str(work / "opening-audit.json"),
                     str(work / "corrected-opening-keys.json"), str(work / "model-input-audit.json")]
    with (work / "opening-audit.log").open("w") as log:
        subprocess.run(audit_command, cwd=target / "agent", env={**os.environ, "CHARACTER": "silent", "TMPDIR": str(work)},
                       stdout=log, stderr=subprocess.STDOUT, check=True)
    opening = json.loads((work / "opening-audit.json").read_text())
    ascensions = {row["key"]: row["asc"] for row in fights}
    hp, op, damage = collections.Counter(), collections.Counter(), collections.Counter()
    missing, estimated = [], []
    for row in opening:
        if ascensions[row["key"]] == 10:
            for part in row["source"]:
                hp[str(part.get("hpAsc"))] += 1
                op[str(part.get("openingAsc"))] += 1
    for group in json.loads((work / "model-input-audit.json").read_text()):
        if group["asc"] == 10:
            for monster in group["monsters"]:
                for move in monster["moves"]:
                    value = move["damage"]
                    if value is None:
                        missing.append(monster["id"] + ":" + move["move"])
                    else:
                        damage[str(value.get("from"))] += 1
                        if value.get("estimated") or value.get("from") != 10:
                            estimated.append({"monster": monster["id"], "move": move["move"], "damage": value})
    output = work / "combined-results.jsonl"
    output.write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in combined))
    provenance = {key: source[key] for key in ("simulator_base", "model_sha256", "input_files", "samples", "seed")}
    provenance["result_reuse"] = {"previous_artifact": identity, "historical_fights": len(historical),
        "new_validation_fights": len(added), "control_replays": controls, "verified_model_inputs": len(verified),
        "historical_fights_and_turns_equal": True, "reused_fights": len(historical) - len(controls),
        "replayed_fights": len(keys), "control_results_identical_except_ms": True,
        "original_full_dataset_row_indices": True, "scope": "Pinned published model; current production model not revalidated."}
    provenance["admission_evaluation"] = {"version": "unrounded-original-thresholds", "files": {
        name: digest((Path(__file__).parent / name).read_bytes()) for name in ("calib.py", "trust.py", "silent_calibration.py")}}
    provenance["boss_input_scope"] = {"openings": len(opening), "A10_hp_asc_sources": dict(hp),
        "A10_opening_asc_sources": dict(op), "A10_damage_asc_sources": dict(damage),
        "A10_no_damage_records": missing, "A10_estimated_damage_definitions": estimated,
        "F49_actual_attempts": sum(row.get("floor") == 49 for row in fights)}
    path = work / "provenance-extension.json"
    path.write_text(json.dumps(provenance, ensure_ascii=False, indent=2) + "\n")
    return str(output), str(path)
