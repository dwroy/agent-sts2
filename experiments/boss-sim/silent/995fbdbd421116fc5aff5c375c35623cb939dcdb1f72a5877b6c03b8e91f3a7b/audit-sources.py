"""Verify frozen Silent metadata and log bytes without changing the original logs."""
import collections
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
def rows(path):
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
def write(name, value):
    (HERE / name).write_text(json.dumps(value, ensure_ascii=False, indent=1) + '\n')

dataset = HERE / 'dataset'
fights = rows(dataset / 'fights.jsonl')
sources = rows(dataset / 'sources.jsonl')
runs = {r['run_id']: r for r in rows(dataset / 'runs-snapshot.jsonl')}
sl = rows(dataset / 'sl-snapshot.jsonl')
events = {(r['run_id'], r['floor'], r['attempt'], r['ended_at']): r for r in sl}
new = {r['key'] for r in json.loads((HERE / 'new-fights.json').read_text())}
by_key = {r['key']: r for r in fights}
verified, missing, outcomes = [], [], []
with open('/home/dw/Projects/agent-sts2/logs/states.jsonl', 'rb') as handle:
    for row in sources:
        run = runs[row['run_id']]
        assert run['character'] == 'SILENT' and run['ended'] and 0 <= run['ascension'] <= 10
        if not row.get('source', {}).get('t1_sha256'):
            assert row.get('excluded')
            missing.append({'key': row.get('key'), 'reason': row['excluded']})
            continue
        src = row['source']
        handle.seek(src['t1_off'])
        raw = handle.read(src['t1_len'])
        assert hashlib.sha256(raw).hexdigest() == src['t1_sha256']
        record = json.loads(raw)
        state = record['state']
        assert state['run_id'] == row['run_id']
        assert state['run']['character_id'] == 'SILENT'
        assert state['run']['ascension'] == row['asc'] == run['ascension']
        assert state['run']['floor'] == row['floor']
        if row.get('key') in by_key:
            assert state == by_key[row['key']]['t1']['state']
        verified.append({'key': row['key'], 'off': src['t1_off'], 'length': src['t1_len'],
                         'sha256': src['t1_sha256'], 'role': 'SILENT'})
        if row.get('key') in new:
            event = events[row['run_id'], row['floor'], row['attempt'], row['sl']['ended_at']]
            assert event['result'] == row['outcome'] in ('won', 'died')
            # The extractor retains the minimum observed/event end HP. An event
            # can follow settlement; its HP need not equal the last combat frame.
            assert row['end_hp'] == 0 if row['outcome'] == 'died' else 0 <= row['end_hp'] <= event['end_hp']
            handle.seek(src['last_off'])
            terminal_raw = handle.readline()
            terminal = json.loads(terminal_raw)['state']
            hp = terminal.get('run', {}).get('current_hp')
            assert hp == src['last_logged_hp']
            outcomes.append({'key': row['key'], 'result': event['result'], 'reported_end_hp': event['end_hp'],
                             'extracted_end_hp': row['end_hp'],
                             'logged_last_hp': hp, 'last_off': src['last_off'],
                             'terminal_zero_hp_frame_present': hp == 0,
                             'outcome_source': 'SL actual won/died event; final combat frame can precede settlement',
                             'last_sha256': hashlib.sha256(terminal_raw).hexdigest()})
assert len(outcomes) == len(new)
write('opening-source-integrity.json', {'verified': verified, 'excluded_missing_openings': missing})
write('new-outcome-integrity.json', outcomes)
write('source-audit-summary.json', {'finished_runs': sum(r.get('character') == 'SILENT' and bool(r.get('ended')) for r in runs.values()),
      'sources': len(sources), 'verified_openings': len(verified), 'excluded_missing_openings': len(missing),
      'new_actual_outcomes': len(outcomes), 'new_outcome_counts': dict(collections.Counter(r['result'] for r in outcomes)),
      'raw_logs_unchanged': True, 'scope': 'Exact opening bytes and new actual end events; historical dirty runtime trees remain unknown.'})
print(json.dumps({'verified_openings': len(verified), 'new_actual_outcomes': len(outcomes)}))
