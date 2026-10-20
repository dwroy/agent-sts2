"""Append-only report selectors; original rows and line numbers remain authoritative."""
import hashlib
import json
import fcntl
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'eval'))
from jsonl_cache import JsonlCache


def legacy_run(row):
    try:
        return json.loads(row['fingerprint']).get('run') or None
    except Exception:
        return None


def header(path, row, ref):
    if path.name == 'states.jsonl':
        return dict(ref=ref, run=(row.get('state') or {}).get('run_id'), ts=row.get('ts'))
    if path.name == 'decisions.jsonl':
        return dict(ref=ref, run=legacy_run(row), mode=row.get('mode'),
                    ts=row.get('ts'), screen=row.get('screen'))
    return dict(ref=ref, run=row.get('run_id'), label=row.get('label'))


def selected_rows(path, choose, directory=None, raw_filter=None):
    path = Path(path)
    revision = hashlib.sha256(b''.join(p.read_bytes() for p in (
        Path(__file__), Path(__file__).with_name('report.py'),
        Path(__file__).resolve().parents[1] / 'eval/jsonl_cache.py'))).hexdigest()
    cache = JsonlCache(directory or path.resolve().parents[1] / 'ops/report-log-cache', revision, header)
    try:
        rows, _bad = cache.rows(path, path.stat().st_size)
        refs = choose(rows)
        with path.open('rb') as source:
            for ref in refs:
                source.seek(ref['offset'])
                raw = source.read(ref['bytes'])
                if hashlib.sha256(raw).hexdigest() != ref['sha256']:
                    raise ValueError('report original row changed after selection')
                if raw_filter and not raw_filter(raw.decode('utf8')):
                    continue
                yield ref['line'], json.loads(raw)
    finally:
        cache.close()


def decisions(path, run_id=None):
    """Keep the old last-run and first-following-GAME_OVER selection verbatim."""
    if not Path(path).is_file():
        return run_id, [], []
    chosen_run = run_id
    own_end = False

    def choose(rows):
        nonlocal chosen_run, own_end
        rows = [row for row in rows if row.get('mode') == 'play']
        if chosen_run is None:
            chosen_run = next((row['run'] for row in reversed(rows) if row['run']), None)
        if not chosen_run:
            return []
        recs = [row for row in rows if row['run'] == chosen_run]
        own_end = any(row['screen'] == 'GAME_OVER' for row in recs)
        last_ts = recs[-1]['ts'] if recs else ''
        tail = [] if own_end else [row for row in rows if row['ts'] > last_ts and row['screen'] == 'GAME_OVER'][:1]
        return [row['ref'] for row in recs + tail]

    selected = [row for _line, row in selected_rows(path, choose)]
    recs = [row for row in selected if legacy_run(row) == chosen_run]
    return chosen_run, recs, ([] if own_end else selected[len(recs):])


def last_run(path):
    """Autoplay used the last truthy fingerprint run across every mode."""
    result = None
    def choose(rows):
        nonlocal result
        result = next((row['run'] for row in reversed(rows) if row['run']), None)
        return []
    list(selected_rows(path, choose))
    return result


def plans(path, run_id):
    return selected_rows(path, lambda rows: [row['ref'] for row in rows
                                           if row['run'] == run_id and row['label'] == 'run-plan'])


def scan_states(path, run_id, wanted):
    states = {}
    with open(path, encoding='utf8') as source:
        for line in source:
            if line[7:31] not in wanted and run_id not in line:
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            state = row.get('state') or {}
            if row.get('ts') in wanted or state.get('run_id') == run_id:
                states[row['ts']] = state
    return states


def states(path, run_id, wanted):
    """Use a completed background index; a cold/busy index never delays reporting."""
    path = Path(path)
    directory = path.resolve().parents[1] / 'ops/report-state-cache'
    if not (directory / 'facts.sqlite').is_file():
        return scan_states(path, run_id, wanted)
    with (directory / 'worker.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return scan_states(path, run_id, wanted)
        def choose(rows):
            return [row['ref'] for row in rows if row['run'] == run_id or row['ts'] in wanted]
        result = {}
        for _line, row in selected_rows(path, choose, directory,
                                       lambda line: line[7:31] in wanted or run_id in line):
            state = row.get('state') or {}
            # The original text prefilter is narrower than parsed JSON on unusual
            # encodings. Check it on the original bytes to preserve that behavior.
            # Selected rows have already passed their original byte SHA check.
            if row.get('ts') in wanted or state.get('run_id') == run_id:
                result[row['ts']] = state
        return result


def warm_states(path):
    path = Path(path)
    directory = path.resolve().parents[1] / 'ops/report-state-cache'
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / 'worker.lock').open('a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        list(selected_rows(path, lambda rows: [], directory))


if __name__ == '__main__':
    if len(sys.argv) != 3 or sys.argv[1] not in ('--warm-states', '--last-run'):
        raise SystemExit('usage: report_log_cache.py --warm-states STATES_JSONL | --last-run DECISIONS_JSONL')
    if sys.argv[1] == '--warm-states':
        warm_states(sys.argv[2])
    else:
        print(last_run(sys.argv[2]) or '')
