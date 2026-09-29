#!/usr/bin/env python3
"""Which event options lead to another choice page (src/knowledge/event-pages.json).

The route block rides on an event's last question only (M2, notes/v4-dev-brief.md item 2.5): a page whose every
option is known to open another choice page of the same event is not the last one. This reads, from the log database
(docs/logdb.md; point reads of states.jsonl by offset, never a full scan), every logged event choice: the option's
text_key (EVENT.pages.PAGE.options.OPTION) and whether the next different page of that event on the same floor was
another choice page ("continues") or its end / no further page ("ends").

Usage (worktree root): .cache/logdb-venv/bin/python tools/build-event-pages.py [--out src/knowledge/event-pages.json]
"""
import argparse
import datetime
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
QUERY = os.path.join(HERE, "logdb", "query.py")


def query(sql):
    out = subprocess.run([sys.executable, QUERY, "--no-sync", "--json", "--max-rows", "100000", sql], capture_output=True, text=True, check=True).stdout
    data = json.loads(out)
    if "error" in data:
        raise SystemExit(f"query failed: {data['error']}")
    return [dict(zip(data["columns"], row)) for row in data["rows"]]


def raw_state(handle, off, length):
    handle.seek(off)
    return json.loads(handle.read(length))


def page_of(event):
    return "|".join(str(option.get("text_key", "")) for option in event.get("options", []))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", default=os.path.join(ROOT, "src", "knowledge", "event-pages.json"))
    parser.add_argument("--logs", default=os.path.join(ROOT, "logs"))
    args = parser.parse_args()
    choices = query(
        "SELECT d.run_id, d.floor, d.ts, d.option_index, s.off, s.len FROM decisions d JOIN state_index s ON s.run_id = d.run_id AND s.ts = d.ts "
        "WHERE d.label LIKE 'event/%' AND d.action = 'choose_event_option' AND d.run_id IS NOT NULL ORDER BY d.ts"
    )
    frames = query("SELECT run_id, floor, ts, off, len FROM state_index WHERE screen = 'EVENT' AND run_id IS NOT NULL ORDER BY ts")
    by_floor = {}
    for frame in frames:
        by_floor.setdefault((frame["run_id"], frame["floor"]), []).append(frame)
    counts = {}
    with open(os.path.join(args.logs, "states.jsonl"), "rb") as handle:
        for choice in choices:
            state = raw_state(handle, choice["off"], choice["len"]).get("state", {})
            event = state.get("event") or {}
            if event.get("is_finished"):
                continue
            option = next((entry for entry in event.get("options", []) if entry.get("index") == choice["option_index"]), None)
            if not option or option.get("is_proceed"):
                continue
            key = option.get("text_key") or ""
            event_id = event.get("event_id") or ""
            if not key or not event_id:
                continue
            page = page_of(event)
            outcome = "ends"
            for frame in by_floor.get((choice["run_id"], choice["floor"]), []):
                if frame["ts"] <= choice["ts"]:
                    continue
                later = raw_state(handle, frame["off"], frame["len"]).get("state", {}).get("event") or {}
                if later.get("event_id") != event_id or page_of(later) == page:
                    continue
                outcome = "ends" if later.get("is_finished") else "continues"
                break
            entry = counts.setdefault(event_id, {}).setdefault(key, {"continues": 0, "ends": 0})
            entry[outcome] += 1
    about = (
        "Event options (text_key) -> [continues, ends]: whether the next page of the same event on the same floor was another choice page (continues) "
        "or its end / none (ends). Built by tools/build-event-pages.py from logged event choices (docs/logdb.md). The route block rides on an event "
        "question unless every option on its page continues."
    )
    data = {
        "generated": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "choices": sum(entry["continues"] + entry["ends"] for event in counts.values() for entry in event.values()),
    }
    events = sorted(counts.items())
    lines = ["{", f' "_about": {json.dumps(about)},', f' "generated": {json.dumps(data["generated"])},', f' "choices": {data["choices"]},', ' "events": {']
    for at, (event, options) in enumerate(events):
        inner = ", ".join(f'{json.dumps(key, ensure_ascii=False)}: [{entry["continues"]}, {entry["ends"]}]' for key, entry in sorted(options.items()))
        lines.append(f"  {json.dumps(event)}: {{{inner}}}{',' if at < len(events) - 1 else ''}")
    lines += [" }", "}"]
    with open(args.out, "w", encoding="utf-8") as out:
        out.write("\n".join(lines) + "\n")
    multi = {event: [key for key, entry in options.items() if entry["continues"] > entry["ends"]] for event, options in counts.items()}
    multi = {event: keys for event, keys in multi.items() if keys}
    print(f"{data['choices']} choices, {len(counts)} events, {len(multi)} with options that continue: {json.dumps(multi, ensure_ascii=False)[:1500]}")


if __name__ == "__main__":
    main()
