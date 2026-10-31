import collections
import hashlib
import json
from pathlib import Path

import duckdb

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).resolve().parent
SCOPE = json.loads(Path('paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json').read_bytes())
TARGETS = {'ROOM_FULL_OF_CHEESE', 'SLIPPERY_BRIDGE', 'BRAIN_LEECH', 'SUNKEN_STATUE', 'THIS_OR_THAT', 'THE_LANTERN_KEY'}
META = {r['run_id']: r for r in SCOPE['runs']}
con = duckdb.connect(':memory:')
con.execute('set threads=2')
con.execute('create table allowed(run_id varchar)')
con.executemany('insert into allowed values (?)', [(r,) for r in META])
refs = []
for ref in SCOPE['verified_read_only_shards']:
    p = ROOT / ref['path']
    raw = p.read_bytes()
    assert len(raw) == ref['bytes'] and hashlib.sha256(raw).hexdigest() == ref['sha256']
    refs.append(dict(ref, verified=True, nlink_observed=p.stat().st_nlink))
paths = [str(ROOT/r['path']) for r in refs if r['table'] == 'frames']
cur = con.execute('select p.* from read_parquet(?) p semi join allowed a using(run_id) where off+len<=? order by run_id,off', [paths, SCOPE['raw_stream_cutoffs']['states']['max_bytes']])
columns = [d[0] for d in cur.description]
frames = collections.defaultdict(list)
for row in cur.fetchall():
    f = dict(zip(columns, row))
    f['ts'] = str(f['ts'])
    frames[f['run_id']].append(f)
decisions = json.loads((OUT/'decisions-event-index.json').read_bytes())
handles = {s: (ROOT/SCOPE['raw_stream_cutoffs'][s]['path']).open('rb') for s in ('states', 'decisions')}
raw_out = (OUT/'bounded-own-rows.jsonl').open('wb')
cache = {}
source_refs = []

def read(stream, row):
    key = (stream, row['off'])
    if key in cache:
        return cache[key]
    assert row['off'] >= 0 and row['off'] + row['len'] <= SCOPE['raw_stream_cutoffs'][stream]['max_bytes']
    f = handles[stream]
    f.seek(row['off'])
    raw = f.read(row['len'])
    assert len(raw) == row['len'] and raw.endswith(b'\n')
    obj = json.loads(raw)
    archive_offset = raw_out.tell()
    raw_out.write(raw)
    ref = {'stream': stream, 'source_path': SCOPE['raw_stream_cutoffs'][stream]['path'],
           'offset': row['off'], 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
           'cutoff': SCOPE['raw_stream_cutoffs'][stream]['max_bytes'], 'archive_offset': archive_offset}
    if stream == 'states':
        assert obj['state']['run_id'] == row['run_id']
    else:
        assert json.loads(obj['fingerprint'])['run'] == row['run_id']
    source_refs.append(ref)
    cache[key] = (obj, ref)
    return obj, ref

def snapshot(row):
    obj, ref = read('states', row)
    st = obj['state']
    return {'ref': ref, 'screen': row['screen'], 'act': row['act'], 'floor': row['floor'],
            'hp': row['hp'], 'max_hp': row['max_hp'], 'gold': row['gold'],
            'deck': row['deck'], 'relics': row['relics'], 'potions': row['potions'],
            'event': st.get('event'), 'selection': st.get('selection'), 'reward': st.get('reward')}

windows = []
excluded = []
for d in decisions:
    if d['action'] != 'choose_event_option' or d['label'] == 'event/leave':
        continue
    fs = frames[d['run_id']]
    before = [f for f in fs if f['ts'] <= d['ts']]
    if not before:
        continue
    pre = before[-1]
    if pre['event_id'] not in TARGETS or pre['floor'] != d['floor']:
        continue
    b = snapshot(pre)
    ev = b['event']
    if ev['is_finished']:
        continue
    dec, dref = read('decisions', d)
    chosen = dec.get('chosen', {})
    option = next((o for o in ev['options'] if o['index'] == chosen.get('option_index')), None)
    if not option or option.get('is_proceed'):
        excluded.append({'decision': dref, 'reason': 'missing option or proceed'})
        continue
    following = [f for f in fs if f['ts'] > d['ts']]
    immediate = snapshot(following[0]) if following else None
    finish = None
    for f in following:
        if f['floor'] != pre['floor']:
            break
        if f['event_id'] == pre['event_id']:
            sn = snapshot(f)
            if sn['event'] and sn['event']['is_finished']:
                finish = sn
                break
    meta = META[d['run_id']]
    windows.append({'event_id': pre['event_id'], 'run_id': d['run_id'], 'floor': d['floor'],
                    'act': pre['act'], 'ascension': meta['ascension'], 'attempt_scope': meta['attempt_scope'],
                    'game_version': 'unknown', 'final_victory': meta['victory'],
                    'decision': {'ref': dref, 'label': d['label'], 'chosen': chosen,
                                 'expect': dec.get('expect'), 'result': dec.get('result')},
                    'selected_option': option, 'before': b, 'immediate_after': immediate,
                    'event_finished': finish})
raw_out.close()
for f in handles.values():
    f.close()
(OUT/'own-event-windows.json').write_text(json.dumps({'windows': windows, 'excluded': excluded}, ensure_ascii=False, indent=2, default=str)+'\n')
(OUT/'bounded-own-source-refs.json').write_text(json.dumps(source_refs, indent=2)+'\n')
(OUT/'own-shard-verification.json').write_text(json.dumps(refs, indent=2)+'\n')
print('windows', len(windows), 'independent_runs', len({w['run_id'] for w in windows}), 'raw_rows', len(source_refs))
for ev in sorted(TARGETS):
    ws = [w for w in windows if w['event_id'] == ev]
    print(ev, 'windows', len(ws), 'runs', len({w['run_id'] for w in ws}))
    for key in sorted({w['selected_option']['text_key'] for w in ws}):
        rows = [w for w in ws if w['selected_option']['text_key'] == key]
        deltas = collections.Counter((w['immediate_after']['hp']-w['before']['hp'], w['immediate_after']['gold']-w['before']['gold']) for w in rows if w['immediate_after'])
        print(key, len(rows), 'runs', len({w['run_id'] for w in rows}), 'deltas', deltas)
