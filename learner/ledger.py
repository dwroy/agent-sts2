#!/usr/bin/env python3
"""The learning ledger for the paper (paper/materials/learning/README.md; docs/learning-protocol.md §3-4, §8).

One append-only JSONL file, paper/materials/learning/ledger.jsonl. Two row kinds:
  {"op": "add", ...}     a new learned item / finding (the full schema, README "add 行")
  {"op": "update", ...}  later changes to one item: status, more evidence, where it went, the shipped version,
                         the later effect (README "update 行")
An item's current state is the fold of its add row and every update row after it, in file order. Nothing is ever
rewritten: corrections are update rows too.

  python3 learner/ledger.py add     < item.json     one JSON object (or one per line); prints the new ids
  python3 learner/ledger.py update  < change.json   one JSON object with "id" (or one per line)
  python3 learner/ledger.py find [--character C] [--kind K] [--status S] [--run RUN] [--asc N] [--text WORD] [--json]
  python3 learner/ledger.py show <id>                the folded item, as JSON
  python3 learner/ledger.py fold                     every folded item, as a JSON list
  python3 learner/ledger.py check                    validate the whole file (exit 1 on any problem)

add / update validate the rows before appending (exit 2 and nothing written on a bad row) and append under an flock on
the ledger file, so the learner, the ops session and the dev session can write at the same time. add fills "id"
(<character>-NNNN), "ts" and, when missing, "asc" (the ascension of first_run in logs/runs.jsonl). Evidence run ids
are checked against logs/runs.jsonl when it exists: the run must be there and be the item's character.

Paths: LEDGER_FILE (default <repo>/paper/materials/learning/ledger.jsonl), LEDGER_RUNS (default <repo>/logs/runs.jsonl;
"none" skips the run check), LEDGER_VERSIONS (default <repo>/eval/versions.json). Python 3 stdlib only.
"""
import argparse
import datetime as dt
import fcntl
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "knowledge", "builders"))
from characters import character_key, run_character  # noqa: E402

LEDGER = os.environ.get("LEDGER_FILE") or os.path.join(REPO, "paper", "materials", "learning", "ledger.jsonl")
RUNS = os.environ.get("LEDGER_RUNS") or os.path.join(REPO, "logs", "runs.jsonl")
VERSIONS = os.environ.get("LEDGER_VERSIONS") or os.path.join(REPO, "eval", "versions.json")

KINDS = ["mechanic", "card", "route", "fight", "potion", "bug-infra", "other"]
STATUSES = ["observed", "proposed", "accepted", "rejected", "shipped", "retired"]
PRIOR = ["yes", "partly", "no", "unknown"]
ROLES = ["support", "contradict", "repeat"]
WHERE_KEYS = ["lessons", "experience", "knowledge", "proposal", "changelog", "commits"]
RUN_ID = re.compile(r"^[0-9A-Z]{12}$")
ITEM_ID = re.compile(r"^[a-z]+-\d{4}$")
CLAIM_MAX = 800

ADD_REQUIRED = ["character", "kind", "claim", "evidence", "first_run", "prior", "status", "by"]
ADD_FIELDS = set(ADD_REQUIRED) | {"op", "id", "ts", "asc", "prior_note", "prior_runs", "where", "version", "note"}
UPDATE_FIELDS = {"op", "id", "ts", "by", "status", "evidence", "where", "version", "effect", "note", "claim"}
EFFECT_FIELDS = {"runs_after", "applied", "outcome", "repeats_after", "audited", "by"}


class LedgerError(Exception):
    pass


def now_local():
    return dt.datetime.now().astimezone().isoformat(timespec="seconds")


def read_rows(path=None):
    """(line number, row) for every row; a line that is not a JSON object is returned as (n, None)."""
    path = path or LEDGER
    if not os.path.exists(path):
        return []
    rows = []
    with open(path, encoding="utf8") as handle:
        for n, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except ValueError:
                row = None
            rows.append((n, row if isinstance(row, dict) else None))
    return rows


def load_runs(path=None):
    """{run id: runs.jsonl row}, or None when the run check is off or the file is missing."""
    path = path or RUNS
    if path == "none" or not os.path.exists(path):
        return None
    runs = {}
    with open(path, encoding="utf8") as handle:
        for line in handle:
            try:
                row = json.loads(line)
            except ValueError:
                continue
            if isinstance(row, dict) and row.get("run_id"):
                runs[row["run_id"]] = row
    return runs


def load_versions(path=None):
    path = path or VERSIONS
    try:
        with open(path, encoding="utf8") as handle:
            data = json.load(handle)
    except (OSError, ValueError):
        return None
    entries = data.get("versions", data) if isinstance(data, dict) else data
    return {e.get("name") for e in entries if isinstance(e, dict)} if isinstance(entries, list) else None


# ---------------------------------------------------------------- validation


def check_evidence(evidence, character, runs, problems, where="evidence"):
    if not isinstance(evidence, list) or not evidence:
        problems.append(f"{where}: a non-empty list of {{run, floor?, turn?, note?, role?}}")
        return
    for i, ev in enumerate(evidence):
        if not isinstance(ev, dict):
            problems.append(f"{where}[{i}]: an object")
            continue
        unknown = set(ev) - {"run", "floor", "turn", "note", "role"}
        if unknown:
            problems.append(f"{where}[{i}]: unknown fields {sorted(unknown)}")
        run = ev.get("run")
        if not isinstance(run, str) or not RUN_ID.match(run):
            problems.append(f"{where}[{i}].run: a 12-character run id")
        elif runs is not None:
            if run not in runs:
                problems.append(f"{where}[{i}].run: {run} is not in runs.jsonl")
            elif character and run_character(runs[run]) != character:
                problems.append(f"{where}[{i}].run: {run} is {run_character(runs[run])}'s run, not {character}'s")
        for key in ("floor", "turn"):
            if key in ev and ev[key] is not None and (not isinstance(ev[key], int) or ev[key] < 0):
                problems.append(f"{where}[{i}].{key}: a non-negative integer")
        if "role" in ev and ev["role"] not in ROLES:
            problems.append(f"{where}[{i}].role: one of {ROLES}")
        if "note" in ev and not isinstance(ev["note"], str):
            problems.append(f"{where}[{i}].note: a string")


def check_where(where, problems):
    if where is None:
        return
    if not isinstance(where, dict):
        problems.append("where: an object")
        return
    for key, value in where.items():
        if key not in WHERE_KEYS:
            problems.append(f"where.{key}: unknown (one of {WHERE_KEYS})")
        elif not isinstance(value, list) or not all(isinstance(v, str) and v for v in value):
            problems.append(f"where.{key}: a list of strings")


def validate_add(row, runs, versions, known_ids):
    problems = []
    unknown = set(row) - ADD_FIELDS
    if unknown:
        problems.append(f"unknown fields {sorted(unknown)}")
    for key in ADD_REQUIRED:
        if row.get(key) in (None, "", []):
            problems.append(f"{key}: required")
    character = character_key(row.get("character"))
    if row.get("character") is not None and row.get("character") != character:
        problems.append("character: the lower-case knowledge id (silent, ironclad, ...)")
    if row.get("kind") is not None and row.get("kind") not in KINDS:
        problems.append(f"kind: one of {KINDS}")
    claim = row.get("claim")
    if claim is not None and (not isinstance(claim, str) or len(claim) > CLAIM_MAX):
        problems.append(f"claim: a string of at most {CLAIM_MAX} characters")
    if "asc" in row and (not isinstance(row["asc"], int) or not 0 <= row["asc"] <= 20):
        problems.append("asc: an integer 0-20")
    if row.get("evidence") is not None:
        check_evidence(row.get("evidence"), character, runs, problems)
    first = row.get("first_run")
    if first is not None:
        if not isinstance(first, str) or not RUN_ID.match(first):
            problems.append("first_run: a 12-character run id")
        elif runs is not None and first not in runs:
            problems.append(f"first_run: {first} is not in runs.jsonl")
    if row.get("prior") is not None and row.get("prior") not in PRIOR:
        problems.append(f"prior: one of {PRIOR}")
    if "prior_runs" in row and (not isinstance(row["prior_runs"], list) or not all(isinstance(r, str) and RUN_ID.match(r) for r in row["prior_runs"])):
        problems.append("prior_runs: a list of run ids")
    if row.get("status") is not None and row.get("status") not in STATUSES:
        problems.append(f"status: one of {STATUSES}")
    if row.get("status") == "shipped" and not row.get("version"):
        problems.append("status shipped: needs version (eval/versions.json name)")
    if row.get("version") and versions is not None and row["version"] not in versions:
        problems.append(f"version: {row['version']} is not in eval/versions.json")
    check_where(row.get("where"), problems)
    if row.get("id") in known_ids:
        problems.append(f"id: {row.get('id')} already used")
    if "id" in row and not ITEM_ID.match(str(row.get("id"))):
        problems.append("id: <character>-NNNN")
    return problems


def validate_update(row, runs, versions, items):
    problems = []
    unknown = set(row) - UPDATE_FIELDS
    if unknown:
        problems.append(f"unknown fields {sorted(unknown)}")
    item = items.get(row.get("id"))
    if item is None:
        problems.append(f"id: {row.get('id')} has no add row before it")
    if not row.get("by"):
        problems.append("by: required")
    if len(set(row) & (UPDATE_FIELDS - {"op", "id", "ts", "by"})) == 0:
        problems.append("nothing to update")
    if "status" in row and row["status"] not in STATUSES:
        problems.append(f"status: one of {STATUSES}")
    if "evidence" in row:
        check_evidence(row["evidence"], item["character"] if item else None, runs, problems)
    check_where(row.get("where"), problems)
    if row.get("status") == "shipped" and not (row.get("version") or (item or {}).get("version")):
        problems.append("status shipped: needs version (eval/versions.json name)")
    if row.get("status") == "rejected" and not row.get("note"):
        problems.append("status rejected: needs note (why)")
    if row.get("version") and versions is not None and row["version"] not in versions:
        problems.append(f"version: {row['version']} is not in eval/versions.json")
    if "claim" in row and (not isinstance(row["claim"], str) or not row["claim"] or len(row["claim"]) > CLAIM_MAX):
        problems.append(f"claim: a string of at most {CLAIM_MAX} characters")
    if "effect" in row:
        effect = row["effect"]
        if not isinstance(effect, dict) or set(effect) - EFFECT_FIELDS:
            problems.append(f"effect: an object with {sorted(EFFECT_FIELDS)}")
        else:
            if "runs_after" in effect and (not isinstance(effect["runs_after"], list) or not all(isinstance(r, str) and RUN_ID.match(r) for r in effect["runs_after"])):
                problems.append("effect.runs_after: a list of run ids")
            for key in ("applied", "repeats_after"):
                if key in effect and (not isinstance(effect[key], int) or effect[key] < 0):
                    problems.append(f"effect.{key}: a non-negative integer")
    return problems


# ---------------------------------------------------------------- fold


def apply(items, row):
    """Folds one valid row into items ({id: item})."""
    if row["op"] == "add":
        item = {k: v for k, v in row.items() if k != "op"}
        item["evidence"] = [{**e, "added": row.get("ts")} for e in row["evidence"]]
        item["where"] = {k: list(v) for k, v in (row.get("where") or {}).items()}
        item["history"] = [{"ts": row.get("ts"), "by": row.get("by"), "status": row.get("status")}]
        item.setdefault("version", None)
        item["effect"] = None
        item["notes"] = [row["note"]] if row.get("note") else []
        items[row["id"]] = item
        return
    item = items[row["id"]]
    if "evidence" in row:
        item["evidence"] = item["evidence"] + [{**e, "added": row.get("ts")} for e in row["evidence"]]
    for key, values in (row.get("where") or {}).items():
        have = item["where"].setdefault(key, [])
        have.extend(v for v in values if v not in have)
    for key in ("version", "claim"):
        if key in row:
            item[key] = row[key]
    if "effect" in row:
        item["effect"] = row["effect"]
    if row.get("note"):
        item["notes"].append(row["note"])
    if "status" in row:
        item["status"] = row["status"]
        if row["status"] == "shipped":
            item["shipped_at"] = row.get("ts")
    item["history"].append({"ts": row.get("ts"), "by": row.get("by"), **({"status": row["status"]} if "status" in row else {})})


def fold(rows=None):
    items = {}
    for _, row in rows if rows is not None else read_rows():
        if row and row.get("op") in ("add", "update") and (row["op"] == "add" or row.get("id") in items):
            apply(items, row)
    return items


def repeats(item, after_ship=False):
    """Evidence marked "repeat" (the same mistake came back in a later run); with after_ship, only the evidence logged
    after the item shipped (the learning did not transfer). "added" is the ts of the row that logged it."""
    reps = [e for e in item.get("evidence", []) if e.get("role") == "repeat"]
    if after_ship:
        shipped = item.get("shipped_at")
        reps = [e for e in reps if shipped and (e.get("added") or "") > shipped]
    return reps


def check_file(path=None, runs=None, versions=None):
    """Every problem in the ledger, as "line N: ..." strings."""
    problems = []
    items = {}
    for n, row in read_rows(path):
        if row is None:
            problems.append(f"line {n}: not a JSON object")
            continue
        if row.get("op") == "add":
            found = validate_add(row, runs, versions, set(items))
            for key in ("id", "ts"):
                if not row.get(key):
                    found.append(f"{key}: required")
        elif row.get("op") == "update":
            found = validate_update(row, runs, versions, items)
            if not row.get("ts"):
                found.append("ts: required")
        else:
            found = ["op: add or update"]
        problems.extend(f"line {n}: {p}" for p in found)
        if not found:
            apply(items, row)
    return problems


# ---------------------------------------------------------------- writing


def read_input(stream):
    text = stream.read().strip()
    if not text:
        raise LedgerError("no input: one JSON object on stdin (or one per line)")
    try:
        data = json.loads(text)
        return data if isinstance(data, list) else [data]
    except ValueError:
        pass
    rows = []
    for n, line in enumerate(text.splitlines(), 1):
        if line.strip():
            try:
                rows.append(json.loads(line))
            except ValueError as error:
                raise LedgerError(f"input line {n}: not JSON ({error})") from None
    return rows


def append(op, rows, path=None):
    """Validates the rows and appends them under the ledger's lock; returns the ids. Nothing is written when one is bad."""
    path = path or LEDGER
    os.makedirs(os.path.dirname(path), exist_ok=True)
    runs = load_runs()
    versions = load_versions()
    with open(path, "a+", encoding="utf8") as handle:
        fcntl.flock(handle, fcntl.LOCK_EX)
        items = fold(read_rows(path))
        out = []
        problems = []
        for i, raw in enumerate(rows):
            if not isinstance(raw, dict):
                problems.append(f"row {i + 1}: a JSON object")
                continue
            row = dict(raw)
            row["op"] = op
            row["ts"] = now_local()
            if op == "add":
                if row.get("id"):
                    problems.append(f"row {i + 1}: id is filled by the ledger, leave it out")
                    continue
                character = character_key(row.get("character")) or "x"
                used = [int(k.rsplit("-", 1)[1]) for k in items if k.startswith(character + "-")]
                row["id"] = f"{character}-{(max(used) + 1 if used else 1):04d}"
                if "asc" not in row and runs is not None and isinstance(row.get("first_run"), str) and row["first_run"] in runs:
                    asc = runs[row["first_run"]].get("ascension")
                    if isinstance(asc, int):
                        row["asc"] = asc
                row.setdefault("where", {})
                found = validate_add(row, runs, versions, set(items))
                if "asc" not in row:
                    found.append("asc: required (first_run is not in runs.jsonl)")
            else:
                found = validate_update(row, runs, versions, items)
            if found:
                problems.extend(f"row {i + 1}: {p}" for p in found)
                continue
            ordered = {"op": row.pop("op"), "id": row.pop("id"), "ts": row.pop("ts"), **row}
            apply(items, ordered)
            out.append(ordered)
        if problems:
            raise LedgerError("\n".join(problems))
        handle.seek(0, os.SEEK_END)
        for row in out:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")
        handle.flush()
        fcntl.flock(handle, fcntl.LOCK_UN)
    return [row["id"] for row in out]


# ---------------------------------------------------------------- reading


def matches(item, args):
    if args.character and item.get("character") != character_key(args.character):
        return False
    if args.kind and item.get("kind") != args.kind:
        return False
    if args.status and item.get("status") not in args.status.split(","):
        return False
    if args.asc is not None and item.get("asc") != args.asc:
        return False
    if args.run and args.run not in {e.get("run") for e in item.get("evidence", [])} | {item.get("first_run")} | set(item["where"].get("lessons", [])):
        return False
    if args.text and args.text.lower() not in json.dumps(item, ensure_ascii=False).lower():
        return False
    return True


def one_line(item):
    runs = sorted({e.get("run") for e in item.get("evidence", [])})
    reps = len(repeats(item))
    late = len(repeats(item, after_ship=True))
    version = f" {item['version']}" if item.get("version") else ""
    return (f"{item['id']} [{item.get('status')}{version}] A{item.get('asc')} {item.get('kind')} prior={item.get('prior')}"
            f" runs={len(runs)}{f' repeats={reps}' if reps else ''}{f' (after shipping {late})' if late else ''}: {item.get('claim')}")


def main():
    parser = argparse.ArgumentParser(description="The learning ledger (paper/materials/learning/README.md)")
    parser.add_argument("command", choices=["add", "update", "find", "show", "fold", "check"])
    parser.add_argument("id", nargs="?")
    parser.add_argument("--character")
    parser.add_argument("--kind", choices=KINDS)
    parser.add_argument("--status", help="one status or several, comma-separated")
    parser.add_argument("--run")
    parser.add_argument("--asc", type=int)
    parser.add_argument("--text")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    try:
        if args.command in ("add", "update"):
            ids = append(args.command, read_input(sys.stdin))
            print(" ".join(ids))
            return 0
    except LedgerError as error:
        print(f"ledger: nothing written\n{error}", file=sys.stderr)
        return 2
    if args.command == "check":
        problems = check_file(runs=load_runs(), versions=load_versions())
        for p in problems:
            print(p)
        items = fold()
        print(f"{LEDGER}: {len(items)} item(s), {len(problems)} problem(s)")
        return 1 if problems else 0
    items = fold()
    if args.command == "show":
        if args.id not in items:
            print(f"no item {args.id}", file=sys.stderr)
            return 1
        print(json.dumps(items[args.id], ensure_ascii=False, indent=1))
        return 0
    if args.command == "fold":
        print(json.dumps(list(items.values()), ensure_ascii=False, indent=1))
        return 0
    found = [item for item in items.values() if matches(item, args)]
    if args.json:
        print(json.dumps(found, ensure_ascii=False, indent=1))
    else:
        for item in found:
            print(one_line(item))
        print(f"({len(found)} item(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
