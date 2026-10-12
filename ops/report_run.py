#!/usr/bin/env python3
"""Recover a finished run through the existing report/refresh path, with a durable, idempotent receipt."""
from contextlib import redirect_stdout
from datetime import datetime
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import sys
import time
from urllib.request import urlopen

from llm_handoff import atomic_json, locked, stamp


def digest(path):
    with Path(path).open("rb") as handle:
        return hashlib.file_digest(handle, "sha256").hexdigest()


def mod_state():
    url = os.environ.get("CODEX_OPS_MOD_URL", "http://127.0.0.1:8080").rstrip("/") + "/state"
    with urlopen(url, timeout=15) as response:
        envelope = json.load(response)
    if envelope.get("ok") is not True or not isinstance(envelope.get("data"), dict):
        raise ValueError("mod state unavailable")
    return envelope["data"]


def active_processes(root):
    active = []
    for entry in Path("/proc").iterdir():
        if not entry.name.isdigit() or int(entry.name) == os.getpid(): continue
        try:
            argv = (entry / "cmdline").read_bytes().split(b"\0")
            paths = {Path(x.decode(errors="replace")).name for x in argv if x}
            relevant = bool(paths & {"autoplay.sh", "report.py", "report_run.py"}) or b"play" in argv and "index.ts" in paths
            if relevant and (entry / "cwd").resolve().is_relative_to(root): active.append(int(entry.name))
        except FileNotFoundError:
            continue
        except PermissionError:
            # Inaccessible unrelated processes are outside this user's project fleet.
            continue
    return active


def rows_for(path, run_id):
    if not path.exists(): return []
    rows = []
    with path.open() as handle:
        for line in handle:
            row = json.loads(line)
            if row.get("run_id") == run_id: rows.append(row)
    return rows


def terminal_result(state):
    """Animation and save-progress fields change after the recorded terminal frame."""
    result = state.get("game_over") or {}
    return result.get("is_victory"), result.get("floor"), result.get("character_id")


def freeze_jsonl(source, dest, run_id, kind):
    """Keep all exact matching bytes and their offsets; no full-history JSON allocation."""
    ranges = []
    values = []
    total = hashlib.sha256()
    selected = hashlib.sha256()
    offset = 0
    before = source.stat()
    with source.open("rb") as handle, dest.open("wb") as out:
        for line in handle:
            start = offset
            offset += len(line)
            total.update(line)
            if run_id.encode() not in line: continue
            row = json.loads(line)
            if kind == "decisions":
                match = row.get("mode") == "play" and json.loads(row.get("fingerprint", "{}" )).get("run") == run_id
            else:
                match = (row.get("state") or {}).get("run_id") == run_id
            if not match: continue
            out.write(line)
            selected.update(line)
            ranges.append([start, offset])
            if kind == "decisions":
                values.append({"ts": row["ts"], "screen": row.get("screen")})
            else:
                state = row["state"]
                values.append({"ts": row["ts"], "screen": state.get("screen"), "game_over": state.get("game_over"),
                               "character": (state.get("run") or {}).get("character_id")})
    after = source.stat()
    if (before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_ino, after.st_size, after.st_mtime_ns):
        raise ValueError("source log changed during report snapshot")
    return {"path": str(source), "bytes": offset, "sha256": total.hexdigest(), "selected_sha256": selected.hexdigest(),
            "selected_rows": len(ranges), "byte_ranges": ranges, "snapshot": str(dest)}, values


def consoles_for(root, run_id, first_ts, victory):
    earliest = datetime.fromisoformat(first_ts.replace("Z", "+00:00")).timestamp()
    found = []
    for path in sorted((root / "logs/console").glob("*.log")):
        if path.is_symlink() or path.stat().st_mtime < earliest: continue
        name = re.fullmatch(r"[0-9]{8}-[0-9]{6}-([0-9a-f]{7,40}(?:\+dirty)?)\.log", path.name)
        if not name: continue
        sha = hashlib.sha256()
        own = False
        ends = []
        with path.open("rb") as handle:
            for line in handle:
                sha.update(line)
                own = own or run_id.encode() in line
                end = re.search(rb"stopped: run [0-9]+ ended \((victory|defeat)\)", line)
                if end: ends.append(end[1].decode())
        if own:
            found.append({"path": str(path), "bytes": path.stat().st_size, "sha256": sha.hexdigest(),
                          "code": name[1], "endings": ends})
    expected = "victory" if victory else "defeat"
    terminal = [row for row in found if row["endings"] and row["endings"][-1] == expected]
    if not terminal: raise ValueError("no same-run terminal console with historical code identity")
    return found, terminal[-1]["code"]


class Recovery:
    def __init__(self, root, state_reader=mod_state, inventory=active_processes):
        self.root = Path(root).resolve()
        self.runtime = self.root / "ops/codex-ops"
        self.state_reader = state_reader
        self.inventory = inventory

    def guard(self, run_id):
        if any((self.runtime / name).exists() for name in ("LLM_DRAIN", "PAUSE")):
            raise ValueError("report recovery deferred by admission hold")
        if self.inventory(self.root): raise ValueError("play/autoplay/report still active")
        state = self.state_reader()
        if state.get("run_id") != run_id or state.get("screen") != "GAME_OVER" \
                or not isinstance((state.get("game_over") or {}).get("is_victory"), bool):
            raise ValueError("mod does not prove this run ended")
        return state

    def render(self, attempt, run_id, code):
        spec = importlib.util.spec_from_file_location("recovery_original_report", self.root / "ops/report.py")
        report = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(report)
        report.ROOT = str(self.root)
        report.LIVE = str(self.root / ".worktrees/live")
        report.DEC = str(attempt / "decisions.jsonl")
        report.STATES = str(attempt / "states.jsonl")
        report.RUNS = str(self.root / "logs/runs.jsonl")
        original = sys.argv
        try:
            sys.argv = ["report.py", run_id]
            with (attempt / "report.md").open("w") as out, redirect_stdout(out):
                character = report.main(code=code)
        finally:
            sys.argv = original
        return report, character

    def run(self, run_id):
        if not re.fullmatch(r"[0-9A-Z]{12}", run_id): raise ValueError("expected one 12-character run id")
        with locked(self.runtime / "report-run.lock"):
            base = self.runtime / "report-runs" / run_id
            receipt_file = base / "receipt.json"
            rows = rows_for(self.root / "logs/runs.jsonl", run_id)
            if len(rows) > 1: raise ValueError("duplicate run index rows require reconciliation")
            if receipt_file.exists():
                prior = json.loads(receipt_file.read_text())
                if prior["status"] == "complete" and len(rows) == 1:
                    return {**prior, "reused": True}
                if rows: raise ValueError("partial report already indexed; reconcile its receipt before retrying")
            elif rows:
                return {"status": "already_indexed", "run_id": run_id, "reused": True, "existing_rows": 1}
            state = self.guard(run_id)
            attempt = base / str(time.time_ns())
            attempt.mkdir(parents=True)
            receipt = {"at": stamp(), "run_id": run_id, "status": "preparing", "attempt": str(attempt), "existing_rows": 0}
            def save():
                atomic_json(receipt_file, receipt)
                atomic_json(attempt / "receipt.json", receipt)
            save()
            try:
                dec, decisions = freeze_jsonl(self.root / "logs/decisions.jsonl", attempt / "decisions.jsonl", run_id, "decisions")
                frames, states = freeze_jsonl(self.root / "logs/states.jsonl", attempt / "states.jsonl", run_id, "states")
                end_times = {r["ts"] for r in decisions if r["screen"] == "GAME_OVER"}
                endings = [s for s in states if s["ts"] in end_times and s["screen"] == "GAME_OVER"]
                if not decisions or not endings or terminal_result(endings[-1]) != terminal_result(state):
                    raise ValueError("logs do not prove the same terminal result")
                characters = {s["character"] for s in states if s["character"]}
                if len(characters) != 1 or next(iter(characters)) != (state.get("run") or {}).get("character_id"):
                    raise ValueError("run character is ambiguous")
                consoles, code = consoles_for(self.root, run_id, decisions[0]["ts"], state["game_over"]["is_victory"])
                receipt.update(sources={"decisions": dec, "states": frames, "consoles": consoles}, code=code, status="reporting")
                save()
                # Recheck after streaming potentially large logs, before the first report side effect.
                if terminal_result(self.guard(run_id)) != terminal_result(state): raise ValueError("terminal mod result changed")
                report, character = self.render(attempt, run_id, code)
                indexed = rows_for(self.root / "logs/runs.jsonl", run_id)
                if len(indexed) != 1 or indexed[0].get("decisions") != len(decisions) or indexed[0].get("code") != code:
                    raise ValueError("report did not index the complete frozen run exactly once")
                dest = self.root / "notes" / ("run-recovered-" + run_id + ".md")
                with dest.open("x") as out: out.write((attempt / "report.md").read_text())
                receipt.update(status="refreshing", report=str(dest), report_sha256=digest(dest), report_exit=0, summary=indexed[0])
                save()
                os.environ["REFRESH_WAIT"] = "1"
                receipt["refresh"] = report.refresh_knowledge(character)
                save()
                if receipt["refresh"].get("exit") != 0: raise ValueError("required refresh did not finish successfully; retain indexed run")
                report.refresh_costs()
                report.boss_sim_check(character)
                receipt.update(status="complete", completed_at=stamp(), costs="background requested", boss_check="original dispatcher invoked")
                save()
                return receipt
            except Exception as error:
                receipt.update(status="failed", error_type=type(error).__name__, error=str(error))
                save()
                raise


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2: raise ValueError("usage: report_run.py <run-id>")
        result = Recovery(Path(__file__).resolve().parents[1]).run(sys.argv[1])
        print(json.dumps({k: v for k, v in result.items() if k in ("status", "run_id", "reused", "report", "summary", "refresh", "attempt", "completed_at")}, ensure_ascii=False))
    except Exception as error:
        print("report-run refused/failed: " + str(error), file=sys.stderr)
        sys.exit(1)
