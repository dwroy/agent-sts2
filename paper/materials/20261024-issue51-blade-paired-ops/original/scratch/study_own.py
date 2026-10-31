"""Read only the eleven verified shards and bounded rows for the frozen 506."""
import bisect
import collections
import hashlib
import json
from pathlib import Path

import duckdb

ROOT = Path('/home/dw/Projects/agent-sts2')
OUT = Path(__file__).parent
SCOPE = json.loads((ROOT / 'paper/materials/20261024-issue51-own-fallback-ops/own-506-scope.json').read_text())
ALLOWED = {r['run_id']: r for r in SCOPE['runs']}
DB = duckdb.connect(':memory:')
DB.execute('SET threads=2')
DB.execute('CREATE TABLE allowed(run_id VARCHAR)')
DB.executemany('INSERT INTO allowed VALUES (?)', [(r,) for r in ALLOWED])
for table, stream in [('frames', 'states'), ('decisions', 'decisions'), ('sl_attempts', 'sl-attempts')]:
    files = [str(ROOT / d['path']) for d in SCOPE['verified_read_only_shards'] if d['table'] == table]
    for d in (d for d in SCOPE['verified_read_only_shards'] if d['table'] == table):
        raw = (ROOT / d['path']).read_bytes()
        assert len(raw) == d['bytes'] and hashlib.sha256(raw).hexdigest() == d['sha256']
    limit = SCOPE['raw_stream_cutoffs'][stream]['max_bytes']
    DB.execute('CREATE VIEW ' + table + ' AS SELECT p.* FROM read_parquet(' + repr(files)
               + ') p INNER JOIN allowed a USING(run_id) WHERE p.off+p.len<=' + str(limit))


def rows(query, params=None):
    q = DB.execute(query, params or [])
    cols = [c[0] for c in q.description]
    return [dict(zip(cols, r)) for r in q.fetchall()]


audit = []
cache = {}
(OUT / 'own-raw').mkdir(exist_ok=True)


def seek(stream, offset, length, run):
    key = (stream, offset, length)
    if key in cache:
        return cache[key]
    assert run in ALLOWED and 0 <= offset and 0 < length <= 2 * 1024 * 1024
    cut = SCOPE['raw_stream_cutoffs'][stream]
    assert offset + length <= cut['max_bytes']
    with (ROOT / cut['path']).open('rb') as handle:
        handle.seek(offset)
        raw = handle.read(length)
    assert len(raw) == length and raw.endswith(b'\n')
    value = json.loads(raw)
    assert value.get('run_id', value.get('state', {}).get('run_id')) == run
    name = f'{stream}-{offset}-{length}.jsonl'
    (OUT / 'own-raw' / name).write_bytes(raw)
    audit.append({'stream': stream, 'path': cut['path'], 'offset': offset, 'bytes': length,
                  'sha256': hashlib.sha256(raw).hexdigest(), 'cutoff': cut['max_bytes'],
                  'run_id': run, 'copy': str(OUT / 'own-raw' / name)})
    cache[key] = value
    return value


c6 = [r for r in ALLOWED if ALLOWED[r]['cluster'] == 6]
strata = collections.defaultdict(list)
for run in c6:
    d = ALLOWED[run]
    strata[(d['ascension'], d['attempt_scope'])].append(d)
stratum_rows = [{'ascension': k[0], 'attempt_scope': k[1], 'game_version': 'unknown',
                 'n': len(v), 'wins': sum(r['victory'] for r in v),
                 'runs': [r['run_id'] for r in v]} for k, v in strata.items()]

# The first read performed while inspecting the raw contracts is also retained exactly.
seek('states', 9129018792, 40043, '9R916WW0V65N')
seek('decisions', 748149659, 9564, '9R916WW0V65N')

cards = ['FAN_OF_KNIVES', 'ACCURACY', 'BLADE_DANCE', 'CLOAK_AND_DAGGER',
         'PHANTOM_BLADES', 'INFINITE_BLADES', 'BACKFLIP', 'AFTERIMAGE', 'KNIFE_TRAP', 'SHIV']
actions = rows("SELECT off,len,ts,observed_ts,run_id,floor,turn,card_id,result FROM decisions "
               "WHERE action='play_card' AND run_id IN ? AND card_id IN ? ORDER BY run_id,off", [c6, cards])
metadata = {}
for run in c6:
    metadata[run] = rows('SELECT off,len,ts,floor,turn,cards_played FROM frames WHERE run_id=? ORDER BY ts,off', [run])
observed = []
for d in actions:
    if d['card_id'] == 'SHIV' and not (d['floor'] == 48 and d['turn'] in [6, 12]):
        continue
    fs = metadata[d['run_id']]
    times = [f['ts'] for f in fs]
    ix = bisect.bisect_right(times, d['ts']) - 1
    jx = bisect.bisect_right(times, d['ts'])
    if ix < 0 or jx >= len(fs):
        continue
    a, b = fs[ix], fs[jx]
    # Restrict raw inspection to the two completely read games and rare c6 cards.
    if d['run_id'] not in ['9R916WW0V65N', '9ZERN492CSHX']:
        continue
    before = seek('states', a['off'], a['len'], d['run_id'])['state']
    after = seek('states', b['off'], b['len'], d['run_id'])['state']
    decision = seek('decisions', d['off'], d['len'], d['run_id'])
    def view(s):
        c = s.get('combat') or {}
        return {'turn': s.get('turn'), 'player': c.get('player'),
                'hand': c.get('hand'), 'enemies': c.get('enemies'),
                'readiness': c.get('action_readiness')}
    observed.append({'run_id': d['run_id'], 'floor': d['floor'], 'turn': d['turn'],
                     'card_id': d['card_id'], 'decision_offset': d['off'],
                     'before_offset': a['off'], 'after_offset': b['off'],
                     'result': d['result'], 'chosen': decision.get('chosen'),
                     'expect': decision.get('expect'), 'questions': decision.get('questions'),
                     'before': view(before), 'after': view(after)})

# Reward options are real original choices, never reconstructed from card names.
rewards = []
for d in rows("SELECT off,len,run_id,floor FROM decisions WHERE label='reward/card' "
              "AND run_id='9R916WW0V65N' AND floor IN (5,20,28,33,35,36,45) ORDER BY off"):
    raw = seek('decisions', d['off'], d['len'], d['run_id'])
    rewards.append({'run_id': d['run_id'], 'floor': d['floor'], 'off': d['off'],
                    'questions': raw['questions'], 'chosen': raw['chosen'], 'expect': raw.get('expect'),
                    'result': raw.get('result')})

sl = rows('SELECT run_id,floor,sl_kind,attempt,result,reload_ok,ts,off,len FROM sl_attempts '
          'WHERE run_id IN ? ORDER BY run_id,off', [['9R916WW0V65N', '9ZERN492CSHX']])

def save(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2, default=str) + '\n')

save('own-c6-strata.json', stratum_rows)
save('own-action-observations.json', observed)
save('own-reward-original-options.json', rewards)
save('own-sl-strata.json', sl)
save('raw-seek-audit.json', audit)
print(json.dumps({'strata': stratum_rows, 'observed_actions': len(observed),
                  'raw_rows': len(audit), 'reward_questions': len(rewards),
                  'sl_rows': len(sl)}, ensure_ascii=False))
