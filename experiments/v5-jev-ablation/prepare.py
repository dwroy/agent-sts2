#!/usr/bin/env python3
"""Freeze a Silent-only prompt pilot. No simulation, gameplay, labels of truth or API calls."""
import argparse
import copy
import gzip
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

SEED = "roy-v5-jev-20261014-r1"
MODEL = "jev-1.13.0"
ARMS = ("full", "full_unlabelled", "compact_unlabelled")
DIAGNOSTICS = {"bfb1edec-df35-41a9-a887-78c97d247d6f"}


def encoded(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read_source(root, source):
    with (root / source["path"]).open("rb") as f:
        f.seek(source["offset"])
        raw = f.read(source["length"])
    if sha(raw) != source["sha256"]:
        raise ValueError("source changed")
    return raw


def group(case):
    if case["category"] == "unique_best":
        return "agree" if case["matched"] else "override"
    return case["category"]


def select(cases, runs):
    """Predeclared balanced pilot; no fight contributes twice, at most two cases/run/stratum."""
    selected, used = [], set()
    for stratum in ("override", "no_declared_best", "tied_best", "agree"):
        pool = [c for c in cases if c["run"] in runs and group(c) == stratum]
        pool.sort(key=lambda c: sha(encoded([SEED, stratum, c["source"]["sha256"]])))
        per_run = Counter()
        picked = []
        for case in pool:
            fight = (case["run"], case["floor"])
            if fight in used or per_run[case["run"]] >= 2:
                continue
            picked.append(case)
            used.add(fight)
            per_run[case["run"]] += 1
            if len(picked) == 8:
                break
        if len(picked) != 8:
            raise ValueError(f"insufficient pilot stratum: {stratum}")
        selected.extend(picked)
    return selected


def parse_options(request):
    if set(request["questions"]) != {"plan"} or request["questions"]["plan"]["type"] != "choice":
        raise ValueError("pilot only supports one combat plan choice")
    result = {}
    for key, value in request["questions"]["plan"]["criteria"].items():
        parsed = json.loads(value)
        if not isinstance(parsed, dict):
            raise ValueError("non-object criterion")
        result[key] = parsed
    return result


def unlabel(request):
    out = copy.deepcopy(request)
    options = parse_options(out)
    for value in options.values():
        for key in ("rollout_best", "rollout_tied"):
            value.pop(key, None)
    out["questions"]["plan"]["criteria"] = {k: encoded(v).decode() for k, v in options.items()}
    reference = out["state"].get("simulation_reference", {}).get("rollout", {})
    for key in ("ranking", "best", "tied", "tied_total"):
        reference.pop(key, None)
    return out


def compact(request):
    """An explicit information-removal ablation, NOT a lossless production replacement."""
    out = unlabel(request)
    options = parse_options(out)
    for value in options.values():
        quantitative = value.get("quantitative_turn", {})
        realization = quantitative.get("realization", {})
        # Preserve computed results, payment/counts, unknowns, evidence and all limitations.
        # The detailed intermediate traces are the only information removed in this pilot.
        for key in ("established_before", "modeled_after_actions", "actions"):
            realization.pop(key, None)
        if value.get("damage_dealt") == value.get("dmg"):
            value.pop("dmg", None)
    out["questions"]["plan"]["criteria"] = {k: encoded(v).decode() for k, v in options.items()}
    return out


def request_variant(original, arm, order="original"):
    request = copy.deepcopy(original)
    request["model"] = MODEL
    if arm == "full_unlabelled":
        request = unlabel(request)
    elif arm == "compact_unlabelled":
        request = compact(request)
    elif arm != "full":
        raise ValueError("unknown arm")
    if order == "reversed":
        criteria = request["questions"]["plan"]["criteria"]
        request["questions"]["plan"]["criteria"] = dict(reversed(list(criteria.items())))
    elif order != "original":
        raise ValueError("unknown order")
    return request


def direct_choice(request):
    options = parse_options(request)
    best = [key for key, value in options.items() if value.get("rollout_best") is True]
    # Production uses explanatory strings for ties, not a boolean flag.
    ties = [key for key, value in options.items() if value.get("rollout_tied")]
    # A partial baseline must abstain instead of silently adding a new gameplay tie-break.
    return {"choice": best[0] if len(best) == 1 and not ties else None,
            "best": best, "ties": ties,
            "status": "unique_visible_model_rank" if len(best) == 1 and not ties else "abstain",
            "ground_truth": False}


def save_raw(out, name, raw, source):
    path = out / "originals" / (name + ".jsonl.gz")
    path.parent.mkdir(exist_ok=True)
    path.write_bytes(gzip.compress(raw, mtime=0))
    return {"path": str(path.relative_to(out)), "raw_sha256": sha(raw), "raw_bytes": len(raw),
            "gzip_sha256": sha(path.read_bytes()), "source": source}


def scan_prompts(root, selected):
    ids = {c["decision_id"] for c in selected}
    matches = {k: [] for k in ids}
    path = root / "logs/jev-prompts.jsonl"
    cut = path.stat().st_size
    needles = [i.encode() for i in ids]
    with path.open("rb") as f:
        while f.tell() < cut:
            offset = f.tell()
            raw = f.readline()
            if offset + len(raw) > cut:
                break
            if not any(n in raw for n in needles):
                continue
            row = json.loads(raw)
            if row.get("decision_id") in matches and row.get("answers", {}).get("plan"):
                matches[row["decision_id"]].append((row, raw, {"path": "logs/jev-prompts.jsonl",
                    "offset": offset, "length": len(raw), "sha256": sha(raw)}))
    return cut, matches


def prepare(root, out):
    if out.exists():
        raise ValueError("immutable pilot directory already exists")
    audit_path = root / "paper/materials/20261014-v5-jev-contribution/audit.json"
    index_path = audit_path.with_name("case-index.jsonl")
    audit = json.loads(audit_path.read_bytes())
    runs = {r["run"] for r in audit["per_run"] if r["completed"]}
    cases = [json.loads(line) for line in index_path.read_bytes().splitlines()]
    selected = select(cases, runs)
    for case in selected:
        raw = read_source(root, case["source"])
        decision = json.loads(raw)
        case["decision_id"] = decision["decision_id"]
        if case["decision_id"] in DIAGNOSTICS:
            raise ValueError("pre-examined diagnostic landed in pilot; amend spec before calls")
        case["decision_raw"] = raw
    cut, matches = scan_prompts(root, selected)
    out.mkdir(parents=True)
    manifest, requests = [], []
    for n, case in enumerate(selected):
        identifier = case["decision_id"]
        rows = matches[identifier]
        compatible = [r for r in rows if r[0]["answers"]["plan"]["choice"] == case["choice"]]
        if len(rows) != 1 or len(compatible) != 1:
            raise ValueError(f"ambiguous/missing actual prompt {identifier}; keep gap, do not replace case")
        row, raw, source = compatible[0]
        if row["run_id"] != case["run"] or row["floor"] != case["floor"] or row["turn"] != case["turn"]:
            raise ValueError("identity mismatch")
        request = row["request"]
        direct = direct_choice(request)
        if direct["best"] != case["best"] or direct["ties"] != case["ties"]:
            raise ValueError("wire/decision rank mismatch")
        originals = [save_raw(out, identifier + "-decision", case.pop("decision_raw"), case["source"]),
                     save_raw(out, identifier + "-prompt", raw, source)]
        entry = {"id": identifier, "stratum": group(case), "case": case, "originals": originals,
                 "historical_input_tokens": row.get("input_tokens"), "direct": direct,
                 "option_keys": list(parse_options(request)), "probe": n % 8 < 2,
                 "historical_guard": json.loads(read_source(root, case["source"])).get("selection_audit")}
        manifest.append(entry)
        variants = [("original", 0)]
        if entry["probe"]:
            variants += [("original", 1), ("reversed", 0)]
        for order, repeat in variants:
            for arm in ARMS:
                payload = request_variant(request, arm, order)
                requests.append({"id": f"{identifier}/{arm}/{order}/{repeat}", "case_id": identifier,
                    "arm": arm, "order": order, "repeat": repeat, "request": payload,
                    "request_sha256": sha(encoded(payload)), "request_bytes": len(encoded(payload))})
    # Interleave arms and probes using a fixed schedule; avoids one arm always benefiting from later load/cache.
    requests.sort(key=lambda r: sha(encoded([SEED, r["id"]])))
    for name, data in (("cases.json", manifest), ("manifest.json", {
        "schema": "silent-jev-prompt-pilot-v1", "seed": SEED, "model": MODEL,
        "historical_completed_runs": sorted(runs), "selected_runs": sorted({c["case"]["run"] for c in manifest}),
        "cases": len(manifest), "strata": dict(Counter(c["stratum"] for c in manifest)),
        "api_calls": len(requests), "probe_cases": sum(c["probe"] for c in manifest),
        "source_cut": {"jev_prompts_bytes": cut, "audit_sha256": sha(audit_path.read_bytes()),
                       "case_index_sha256": sha(index_path.read_bytes())},
        "protocol": {
            "scope": "Prompt behavior/cost pilot, not held-out gameplay efficacy or calibration",
            "selection": "8 per historical agree/override/tied/no-best stratum; SHA order; one per run/floor; <=2/run/stratum",
            "baseline": "Unique visible rank only; tied/missing ranks explicitly abstain; no new gameplay ranking",
            "fresh_calls": "All 3 API arms pinned to same model; historical latest answers are descriptive only",
            "compact": "Remove only intermediate realization traces and redundant equal dmg, retaining inputs/knowledge/limits",
            "order": "Reverse insertion order with option IDs stable; this does not test name/ID bias",
            "repeat": "Same-input repeats distinguish output variation from order-associated variation",
            "uncertainty": "Balanced diagnostic strata are not population weights; run/SL correlation remains",
            "truth": "No original simulator rank or Jev confidence is an outcome truth label",
            "gates": "No production change; original R3 learner must independently validate paired candidate outcomes first",
            "language": "English/Chinese narrow-question follow-up deferred; do not translate learned knowledge without fidelity check"
        }})):
        (out / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
    (out / "requests.jsonl").write_bytes(b"".join(encoded(r) + b"\n" for r in requests))
    print(json.dumps({"cases": len(manifest), "calls": len(requests), "runs": len({c['case']['run'] for c in manifest}),
                      "manifest_sha256": sha((out / 'manifest.json').read_bytes())}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    prepare(args.root, args.out)
