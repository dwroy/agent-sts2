import hashlib
import json
from pathlib import Path

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
batch = json.loads((OUT / 'batch.json').read_text())
wanted = set(batch['runs'])
floors = {
    'DUZUBAJ3A8GP': {27}, '5PM6JAQG6FNQ': {38, 39},
    'CA5KE8GFJ9X2': {9, 13}, '8JRE1C4H4Z2W': {17, 33},
    'YF0LXT1QSTGG': {33, 48}, 'XP2SL33HT0D9': {29, 33},
}
runs = {}
for line in (ROOT / 'logs/runs.jsonl').open():
    row = json.loads(line)
    if row.get('run_id') in wanted:
        assert row['character'] == 'SILENT' and row['ascension'] == 10
        runs[row['run_id']] = row
assert set(runs) == wanted
(OUT / 'verified-runs.json').write_text(json.dumps(runs, ensure_ascii=False, indent=2) + '\n')

manifest = json.loads(Path('learner/runs/20261007-170245-strategy-proposal/evidence-manifest.json').read_text())
start = min(manifest[r]['first'] for r in wanted if r in manifest)
counts = {r: 0 for r in wanted}
digests = {r: hashlib.sha256() for r in wanted}
receipts = {r: {'first': None, 'last': None} for r in wanted}
frames = []

def powers(entity):
    return {p['power_id']: p.get('amount') for p in entity.get('powers', [])}

with (ROOT / 'logs/states.jsonl').open('rb') as source, (OUT / 'verified-states.jsonl').open('w') as target:
    source.seek(start)
    snapshot_end = source.seek(0, 2)
    source.seek(start)
    while source.tell() < snapshot_end:
        offset = source.tell()
        raw = source.readline()
        row = json.loads(raw)
        if row['ts'] > '2026-10-07T10:11:37.387Z':
            break
        state = row['state']
        run = state.get('run_id')
        if run not in wanted:
            continue
        assert (state.get('run') or {}).get('character_id') == 'SILENT'
        counts[run] += 1
        digests[run].update(raw)
        receipts[run]['first'] = receipts[run]['first'] if receipts[run]['first'] is not None else offset
        receipts[run]['last'] = offset
        floor = (state.get('run') or {}).get('floor')
        combat = state.get('combat') or {}
        if floor not in floors[run] or not combat:
            continue
        player = combat.get('player') or {}
        compact = {
            'run': run, 'offset': offset, 'sha256': hashlib.sha256(raw).hexdigest(),
            'ts': row['ts'], 'observed_ts': row.get('observed_ts'),
            'fingerprint': row['fingerprint'], 'floor': floor, 'turn': state.get('turn'),
            'screen': state['screen'], 'hp': player.get('current_hp'),
            'block': player.get('block'), 'energy': player.get('energy'),
            'played': player.get('cards_played_this_turn'), 'powers': powers(player),
            'hand': [{'index': c.get('index'), 'id': c.get('card_id'), 'upgraded': c.get('upgraded'),
                      'instance': c.get('instance_id'), 'text': c.get('resolved_rules_text')}
                     for c in combat.get('hand', [])],
            'enemies': [{'index': e.get('index'), 'id': e.get('enemy_id'), 'hp': e.get('current_hp'),
                         'max_hp': e.get('max_hp'), 'block': e.get('block'), 'alive': e.get('is_alive'),
                         'powers': powers(e), 'move': e.get('move_id'), 'intents': e.get('intents')}
                        for e in combat.get('enemies', [])],
        }
        frames.append(compact)
        target.write(json.dumps(compact, ensure_ascii=False) + '\n')
for run in wanted:
    receipts[run].update(frames=counts[run], sha256=digests[run].hexdigest())
    assert counts[run] > 0
    if run in manifest:
        assert counts[run] == manifest[run]['frames'], (run, counts[run])
        assert digests[run].hexdigest() == manifest[run]['sha256'], run
        receipts[run]['matches_original_manifest'] = True
(OUT / 'evidence-manifest.json').write_text(json.dumps(receipts, indent=2) + '\n')

decision_rows = []
with (ROOT / 'logs/decisions.jsonl').open('rb') as source:
    for number, raw in enumerate(source, 1):
        if not any(r.encode() in raw for r in wanted):
            continue
        row = json.loads(raw)
        if row.get('run_id') in wanted:
            decision_rows.append({'line': number, 'row': row})
(OUT / 'verified-decisions.json').write_text(json.dumps(decision_rows, ensure_ascii=False) + '\n')
print(json.dumps({'runs': sorted(wanted), 'frames': counts, 'selected_frames': len(frames),
                  'decisions': len(decision_rows)}, ensure_ascii=False))
